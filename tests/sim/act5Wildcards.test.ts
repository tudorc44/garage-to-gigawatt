// M56.2 (doc 43 §6.6, V-D11; wildcards_v.json): Act V's wildcards. 2 of 5 drawn at the boundary on their own stream,
// each in its window; each fires once in its quarter with a news line, and its effect runs for its quarters.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, actFirstQuarter, quarterIndex } from '../../src/content/index.ts'
import raw from '../../src/content/wildcards_v.json' with { type: 'json' }
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { modifierMult } from '../../src/sim/systems/eventEffects.ts'
import {
  dryYearMult,
  fireWildcardsV,
  moratoriumBlocker,
  qDayTreasuryMult,
  transformerDelayQuarters,
  type WildcardIdV,
} from '../../src/sim/systems/wildcardsV.ts'
import { regionOf } from '../../src/sim/systems/sites.ts'
import { act4Company } from './act4Helpers.ts'

let end4: GameState | null = null
function act5(seed = 1): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return toAct5(structuredClone(end4), { vfuture: 'v1', act5Seed: seed })
}
/** An Act V state with just `id` drawn, firing now. */
function firing(id: WildcardIdV): GameState {
  const s = act5()
  s.quarter = actFirstQuarter(5) + 4
  s.act5Wildcards = [{ id, quarter: s.quarter, fired: false }]
  fireWildcardsV(s)
  return s
}

describe('Act V wildcards (M56.2)', () => {
  it('2 of the 5 drawn at the boundary, each inside its window; deterministic per seed, varied across seeds', () => {
    const ids = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      const w = act5(seed).act5Wildcards!
      expect(w).toHaveLength(2)
      expect(new Set(w.map((x) => x.id)).size).toBe(2)
      for (const d of w) {
        const c = raw.wildcards.find((x) => x.id === d.id)!
        expect(d.quarter).toBeGreaterThanOrEqual(quarterIndex(c.window[0])!)
        expect(d.quarter).toBeLessThanOrEqual(quarterIndex(c.window[1])!)
        ids.add(d.id)
      }
    }
    expect(ids.size).toBe(5)
    expect(act5(7).act5Wildcards).toEqual(act5(7).act5Wildcards)
  })

  it('Q-Day: mining revenue and the treasury mark ×0.6 for 2 quarters', () => {
    const s = firing('q_day_scare')
    expect(s.act5Wildcards![0].fired).toBe(true)
    expect(modifierMult(s, 'hashrate', null)).toBeCloseTo(0.6, 10)
    expect(qDayTreasuryMult(s)).toBe(0.6)
    s.quarter += 2
    expect(qDayTreasuryMult(s)).toBe(1)
    expect(s.log.at(-1)).toBeDefined()
  })

  it('the fusion headline: the multiples ×1.1 for 2 quarters, then ×0.95 for 2', () => {
    const s = firing('fusion_net_electric')
    expect(s.events.valuationMult).toEqual({ mult: 1.1, until: s.quarter + 1 })
    s.quarter += 2
    fireWildcardsV(s)
    expect(s.events.valuationMult).toEqual({ mult: 0.95, until: s.quarter + 1 })
  })

  it('the dry year: pumped storage ×0.75 in its region (nordics or arizona) for 4 quarters', () => {
    const s = firing('dry_year')
    const d = s.act5Wildcards![0]
    expect(['nordics', 'arizona']).toContain(d.region)
    expect(dryYearMult(s, d.region!)).toBe(0.75)
    expect(dryYearMult(s, d.region === 'nordics' ? 'arizona' : 'nordics')).toBe(1)
    s.quarter += 4
    expect(dryYearMult(s, d.region!)).toBe(1)
  })

  it('the moratorium: a region with your sites pauses grid connections of 50 MW or more for 2-8 quarters', () => {
    const s = firing('large_load_moratorium')
    const d = s.act5Wildcards![0]
    expect(d.quarters).toBeGreaterThanOrEqual(2)
    expect(d.quarters).toBeLessThanOrEqual(8)
    const site = s.sites.find((x) => regionOf(x) === d.region)!
    expect(moratoriumBlocker(s, site, 50_000)).toBeDefined()
    expect(moratoriumBlocker(s, site, 49_000)).toBeUndefined()
  })

  it('the transformer shortage: a grid request started while it lasts waits 2 more quarters, sometimes 4', () => {
    const s = firing('transformer_shortage')
    const delays = Array.from({ length: 200 }, (_, i) => transformerDelayQuarters(s, `p${i}`))
    expect(new Set(delays)).toEqual(new Set([2, 4]))
    const long = delays.filter((x) => x === 4).length / delays.length
    expect(Math.abs(long - 0.4)).toBeLessThan(0.1)
    s.quarter += 4
    expect(transformerDelayQuarters(s, 'p1')).toBe(0)
  })

  it('nothing before Act V (the draws exist only from the boundary)', () => {
    const s4 = act4Company('s0', 'f1')
    expect(s4.act5Wildcards).toBeUndefined()
    expect(transformerDelayQuarters(s4, 'p1')).toBe(0)
    expect(CONTENT.quarters[actFirstQuarter(5)]).toBe('2036Q1')
  })
})
