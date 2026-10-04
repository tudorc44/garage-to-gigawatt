// M21.2 (DT): a site's Heat breakdown. Its parts (in order, each non-zero) add up to the Heat before the 0–100 clamp,
// in every act; the shown value is that sum clamped; the thresholds line comes at Heat 30 or more.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { playGame } from '../../src/sim/replay.ts'
import { heatBreakdownView } from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import {
  heatBeforeDeal,
  heatOf,
  heatParts,
  recalcHeat,
} from '../../src/sim/systems/heat.ts'
import { BOTS } from '../../tools/bots.ts'
import { act2Company } from './act2Helpers.ts'

const ORDER = [
  'tier',
  'flaw',
  'mitigation',
  'load',
  'grievance',
  'goodwill',
  'era',
  'region',
  'anger',
  'national',
  'gas',
  'relations',
  'deal',
]

/** Every site: the parts sum to the pre-clamp Heat; the value is that sum clamped; the parts come in order. */
function check(s: GameState, label: string): number {
  for (const site of s.sites) {
    recalcHeat(s, site)
    const { parts, raw } = heatParts(s, site)
    const pre = heatBeforeDeal(s, site) + (heatOf(s, site.id).dealOffset ?? 0)
    expect(raw, `${label} ${site.id}`).toBeCloseTo(pre, 9)
    expect(heatOf(s, site.id).value).toBeCloseTo(Math.min(100, Math.max(0, pre)), 9)
    const idx = parts.map((p) => ORDER.indexOf(p.id))
    expect(idx, `${label} order`).toEqual([...idx].sort((a, b) => a - b))
    expect(parts.every((p) => p.pts !== 0)).toBe(true)
  }
  return s.sites.length
}

describe('the Heat breakdown (M21.2)', () => {
  it('Act I: a played company’s sites, plus the hire, a deal, goodwill and a flawed site', () => {
    const end1 = playGame(1, BOTS['raise-climb']).state
    const s = structuredClone(end1)
    s.phase = 'plan'
    expect(check(s, 'act1')).toBeGreaterThan(1)
    // her −5, a deal's offset and goodwill on the biggest site
    s.staff.community_relations = s.quarter
    const big = s.sites.at(-1)!
    heatOf(s, big.id).dealOffset = -12
    heatOf(s, big.id).grievance = -10
    big.flaw = 'noise_ordinance'
    check(s, 'act1 with hire and deal')
    const ids = heatParts(s, big).parts.map((p) => p.id)
    expect(ids).toEqual(expect.arrayContaining(['relations', 'deal', 'goodwill']))
  })

  it('Act II (regions, Anger, national policy) and Act III', () => {
    const a2 = act2Company('2026Q4')
    expect(check(a2, 'act2')).toBeGreaterThan(0)
    const ids = a2.sites.flatMap((x) => heatParts(a2, x).parts.map((p) => p.id))
    expect(ids).toContain('national') // 2026Q1: +10 everywhere
    const a3 = toAct3(act2Company('2026Q4'), { scenario: 's1' })
    a3.quarter = CONTENT.quarters.indexOf('2028Q2')
    expect(check(a3, 'act3')).toBeGreaterThan(0)
  })

  it('the clamp is named; the thresholds line comes from Heat 30', () => {
    const s = act2Company('2026Q4')
    const site = s.sites.find((x) => x.tier !== 'garage')!
    heatOf(s, site.id).grievance = 200
    recalcHeat(s, site)
    expect(heatBreakdownView(s, site.id)!.clamped).toBe('high')
    expect(heatBreakdownView(s, site.id)!.thresholds).toEqual({
      complaint: 30,
      hike: 50,
      moratorium: 70,
      shutdown: 90,
    })
    heatOf(s, site.id).grievance = -10
    heatOf(s, site.id).dealOffset = -200
    recalcHeat(s, site)
    expect(heatBreakdownView(s, site.id)!.clamped).toBe('low')
    expect(heatBreakdownView(s, site.id)!.value).toBe(0)
    expect(heatBreakdownView(s, site.id)!.thresholds).toBeNull()
  })

  it('reading it changes nothing (a selector)', () => {
    const s = act2Company('2026Q4')
    const before = JSON.stringify(s)
    for (const x of s.sites) heatBreakdownView(s, x.id)
    expect(JSON.stringify(s)).toBe(before)
    expect(applyAction(s, { type: 'END_PLAN' }).ok).toBeDefined()
  })
})
