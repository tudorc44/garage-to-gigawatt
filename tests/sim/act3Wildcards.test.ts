// M17.4: wildcards (doc 27 D10): 2 of 4 drawn at the boundary on their own stream, each in a quarter of its
// window; a drawn one comes in its quarter's Plan phase if it has a target, else it's skipped; the default (the
// first choice) applies at END_PLAN; each one's effects.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex, type ScenarioId } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import {
  toAct3,
  type GameState,
  type Project,
  type WildcardId,
} from '../../src/sim/state.ts'
import { gpuPriceMultNow } from '../../src/sim/systems/eventEffects.ts'
import { exportAiLabMult } from '../../src/sim/systems/exportRule.ts'
import { siteHeatValue } from '../../src/sim/systems/heat.ts'
import { refitPlan } from '../../src/sim/systems/retrofit.ts'
import { openNextWildcard } from '../../src/sim/systems/wildcards.ts'
import { act2Company } from './act2Helpers.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** An Act III company at `label` with `id` due now (and opened, if it has a target). */
function due(id: WildcardId, label = '2028Q2', projects: Partial<Project>[] = [], sc: ScenarioId = 's0') {
  const s = toAct3(act2Company('2026Q4'), { scenario: sc })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.projects = projects.map((o, i) => ({
    id: `project-${i + 1}`,
    n: i + 1,
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
    gpu: null,
    tier: 'mid',
    openedQuarter: q('2027Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: 50_000_000,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: q('2027Q1'),
    readyQuarter: q('2027Q3'),
    soldQuarter: null,
    ...o,
  }))
  s.act3Wildcards = [{ id, quarter: s.quarter, status: 'pending' }]
  s.act3WildcardOpen = null
  openNextWildcard(s)
  return s
}
const choose = (s: GameState, choice: 'c1' | 'c2') =>
  ok(s, { type: 'WILDCARD_CHOOSE', choice })

describe('the draw', () => {
  it('2 of the 4, each in a quarter of its window; the same every time for a seed', () => {
    const draw = (seed: number) =>
      toAct3(act2Company('2026Q4', seed), { scenario: 's0' }).act3Wildcards!
    for (let seed = 1; seed <= 20; seed++) {
      const d = draw(seed)
      expect(d).toHaveLength(2)
      expect(new Set(d.map((w) => w.id)).size).toBe(2)
      for (const w of d) {
        const win = CONTENT.wildcards.find((x) => x.id === w.id)!.window
        expect(w.quarter).toBeGreaterThanOrEqual(quarterIndex(win[0])!)
        expect(w.quarter).toBeLessThanOrEqual(quarterIndex(win[1])!)
        expect(w.status).toBe('pending')
      }
      expect(draw(seed)).toEqual(d)
    }
    const all = new Set(Array.from({ length: 20 }, (_, i) => draw(i + 1).map((w) => w.id).join()))
    expect(all.size).toBeGreaterThan(3)
  })

  it('moves no other random draw: a company the wildcards don’t touch plays the same game without them', () => {
    const start = act3ScenarioCompany('s1', 1)
    const none = structuredClone(start)
    none.act3Wildcards = []
    const a = playFrom(start, { plan: () => [] }, { through: 3 }).state
    const b = playFrom(none, { plan: () => [] }, { through: 3 }).state
    expect(a.act3Wildcards!.map((w) => w.status)).toEqual(['skipped', 'fired'])
    expect(b.reports).toEqual(a.reports)
    expect(b.cash).toBe(a.cash)
  })

  it('upcoming wildcards are never on screen: only the one due now opens', () => {
    const s = due('wc_export_control')
    s.act3Wildcards!.push({ id: 'wc_grid_event', quarter: s.quarter + 3, status: 'pending' })
    expect(s.act3WildcardOpen).toEqual({ id: 'wc_export_control' })
  })
})

describe('the default and the skip', () => {
  it('unanswered at END_PLAN: the first choice applies', () => {
    const s = due('wc_grid_event')
    const cash = s.cash
    const t = ok(s, { type: 'END_PLAN' })
    expect(t.act3WildcardOpen).toBeNull()
    expect(t.act3Wildcards![0]).toMatchObject({ status: 'fired', choice: 'c1' })
    expect(cash - t.cash).toBe(800_000)
  })

  it('no target when it comes: it doesn’t fire (no replacement)', () => {
    const s = due('wc_water_moratorium')
    expect(s.act3WildcardOpen).toBeNull()
    expect(s.act3Wildcards![0].status).toBe('skipped')
    const t = due('wc_ai_lab_breakup')
    expect(t.act3Wildcards![0].status).toBe('skipped')
  })
})

describe('each wildcard', () => {
  it('grid emergency: power × (1 + 0.6 × 3/13) this quarter; curtail −$800K, or backup −$300K and Heat at the largest site', () => {
    const s = due('wc_grid_event')
    const t = choose(s, 'c1')
    expect(t.sites.find((x) => x.id === 'site-2')!.eventPowerMult).toEqual({
      mult: 1 + 0.6 * (3 / 13),
      from: s.quarter,
      until: s.quarter,
    })
    const u = choose(due('wc_grid_event'), 'c2')
    expect(s.cash - u.cash).toBe(300_000)
    expect(siteHeatValue(u, 'site-2')).toBeGreaterThan(siteHeatValue(s, 'site-2'))
  })

  it('export rule, absorbed: 3 quarters of GPUs × 1.05, the newest generation +3 weeks, AI-lab leases × 0.97', () => {
    const s = choose(due('wc_export_control', '2027Q3', [{ kind: 'cloud', gpu: 'h100', gpuCapexUsd: 1e8 }]), 'c1')
    expect(s.act3ExportRule).toEqual({ from: q('2027Q3'), until: q('2028Q1'), exempt: false })
    expect(gpuPriceMultNow(s, s.quarter)).toBe(1.05)
    expect(exportAiLabMult(s)).toBe(0.97)
    const base = due('wc_export_control', '2027Q3', [{ kind: 'cloud', gpu: 'h100', gpuCapexUsd: 1e8 }])
    expect(refitPlan(s, s.projects[0], 'rubin_ultra')!.weeks).toBe(
      refitPlan(base, base.projects[0], 'rubin_ultra')!.weeks + 3,
    )
    expect(refitPlan(s, s.projects[0], 'h200')!.weeks).toBe(
      refitPlan(base, base.projects[0], 'h200')!.weeks,
    )
    s.quarter = q('2028Q2')
    expect(gpuPriceMultNow(s, s.quarter)).toBe(1)
  })

  it('export rule, pre-bought: 5% of your building GPU capex now; spared the × 1.05 and +3 weeks; logs gpu_buy', () => {
    const s = due('wc_export_control', '2027Q3', [
      { stage: 'building', kind: 'cloud', gpu: 'b200', gpuCapexUsd: 40_000_000, readyQuarter: q('2028Q1') },
      { kind: 'cloud', gpu: 'h100', gpuCapexUsd: 99_000_000 },
    ])
    const t = choose(s, 'c2')
    expect(s.cash - t.cash).toBe(2_000_000)
    expect(t.act3ExportRule!.exempt).toBe(true)
    expect(gpuPriceMultNow(t, t.quarter)).toBe(1)
    expect(exportAiLabMult(t)).toBe(0.97)
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['gpu_buy'])
  })

  it('water moratorium: the latest build waits 2 quarters and Anger +6; or 30 PC (greyed when short)', () => {
    const builds = [
      { stage: 'building' as const, readyQuarter: q('2028Q4') },
      { stage: 'building' as const, readyQuarter: q('2029Q1') },
    ]
    const t = choose(due('wc_water_moratorium', '2028Q2', builds), 'c1')
    expect(t.projects.map((p) => CONTENT.quarters[p.readyQuarter!])).toEqual(['2028Q4', '2029Q3'])
    expect(t.angerAdj).toBe(6)
    expect(t.act3Gov!.pause).toEqual({ projectId: 'project-2', quarters: 2 })
    const u = choose(due('wc_water_moratorium', '2028Q2', builds), 'c2')
    expect(u.politicalCapital).toBe(10)
    expect(u.projects[1].readyQuarter).toBe(q('2029Q1'))
    const poor = due('wc_water_moratorium', '2028Q2', builds)
    poor.politicalCapital = 20
    const r = applyAction(poor, { type: 'WILDCARD_CHOOSE', choice: 'c2' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.key).toBe('error.pc_short')
  })

  it('AI lab restructure: the largest AI-lab lease × 0.85 and a year shorter (at least 4 quarters left); or −$400K and one fewer shell offer for 4 quarters', () => {
    const lab = CONTENT.projects.tenantCards.find((c) => c.type === 'ai_lab')!
    const lease = (left: number): NonNullable<Project['tenant']> => ({
      card: lab.id,
      signedQuarter: q('2027Q1'),
      readyByQuarter: q('2027Q1'),
      lateQuarters: 0,
      walkRolled: true,
      prepaymentLeftUsd: 0,
      servedQuarters: 4,
      priceMult: 1,
      termQuarters: 4 + left,
    })
    const t = choose(due('wc_ai_lab_breakup', '2028Q2', [{ tenant: lease(20) }]), 'c1')
    expect(t.projects[0].tenant!.priceMult).toBeCloseTo(0.85, 10)
    expect(t.projects[0].tenant!.termQuarters).toBe(4 + 16)
    const short = choose(due('wc_ai_lab_breakup', '2028Q2', [{ tenant: lease(6) }]), 'c1')
    expect(short.projects[0].tenant!.termQuarters).toBe(4 + 4)
    const s = due('wc_ai_lab_breakup', '2028Q2', [{ tenant: lease(20) }])
    const u = choose(s, 'c2')
    expect(s.cash - u.cash).toBe(400_000)
    expect(u.events.extraShellOffers).toEqual({ from: s.quarter + 1, until: s.quarter + 4, n: -1 })
    expect(u.projects[0].tenant!.priceMult).toBe(1)
  })
})
