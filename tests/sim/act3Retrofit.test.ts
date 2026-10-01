// M16.3: RETROFIT (a live hall one tier up) and REFIT_GPUS (a live cloud's or pilot's GPUs swapped for a
// generation that fits its tier), with the downtime rule: w weeks from the start of this quarter, quarter k
// earns clamp(1 − (w − 13k)/13, 0, 1), and the change applies from the first quarter after the last one touched.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { downtimeShare } from '../../src/sim/systems/density.ts'
import {
  gpuPriceUsd,
  gpuResidualUsd,
  settleProjectsWeek,
  startQuarterProjects,
} from '../../src/sim/systems/projects.ts'
import { refitPlan } from '../../src/sim/systems/retrofit.ts'
import { renewalOffer } from '../../src/sim/systems/renewals.ts'
import { act2Company, ok } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const hyperscaler = CONTENT.projects.tenantCards.find(
  (c) => c.type === 'hyperscaler',
)!

/** An Act III company on `id` at `label` (Plan phase) with one live 10 MW hall made by `o`. */
function withHall(
  o: Partial<Project>,
  id: ScenarioId = 's0',
  label = '2027Q1',
): { s: GameState; p: Project } {
  const s = toAct3(act2Company('2026Q4'), { scenario: id })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  const p: Project = {
    id: 'project-1',
    n: 1,
    siteId: 'site-2',
    kw: 10_000,
    kind: 'shell',
    gpu: null,
    openedQuarter: q('2024Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: 100_000_000,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: q('2024Q2'),
    readyQuarter: q('2024Q4'),
    soldQuarter: null,
    tier: 'low',
    ...o,
  }
  s.projects = [p]
  return { s, p }
}

const lease = (sq = q('2026Q1')): NonNullable<Project['tenant']> => ({
  card: hyperscaler.id,
  signedQuarter: sq,
  readyByQuarter: sq,
  lateQuarters: 0,
  walkRolled: true,
  prepaymentLeftUsd: 0,
  servedQuarters: 2,
  termQuarters: 40,
})

const cloud = (gpu: string, tier: 'low' | 'mid' | 'top' = 'mid'): Partial<Project> => ({
  kind: 'cloud',
  gpu,
  tier,
  spot: true,
  gpuCount: 7500,
  gpuCapexUsd: 7500 * 28_000,
})

function fails(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error(`${a.type} applied`)
  return r.error.key
}

/** One week's revenue from the projects. */
const weekRevenue = (s: GameState) =>
  settleProjectsWeek(structuredClone(s)).revenueUsd

describe('RETROFIT: costs, the move log, the new tier', () => {
  it('low → mid: $1.5M × MW now, 1 BW, 10 weeks; logged as retrofit', () => {
    const { s } = withHall({ tenant: lease() })
    const t = ok(s, { type: 'RETROFIT', projectId: 'project-1' })
    expect(s.cash - t.cash).toBe(15_000_000)
    expect(s.bandwidth - t.bandwidth).toBe(BALANCE.act3.density.retrofitBw)
    expect(t.projects[0].downtime).toEqual({
      kind: 'retrofit',
      fromQuarter: q('2027Q1'),
      weeks: 10,
      toTier: 'mid',
    })
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['retrofit'])
  })

  it('mid → top: the quarter’s mid→top $/MW × MW, 26 weeks', () => {
    const { s } = withHall({ tier: 'mid', tenant: lease() }, 's2', '2028Q1')
    const perMw =
      CONTENT.act3Scenarios.s2.quarterly[4].capex_retrofit_density_mid_to_top_usd_mw!
    const t = ok(s, { type: 'RETROFIT', projectId: 'project-1' })
    expect(s.cash - t.cash).toBe(Math.round(perMw * 10))
    expect(t.projects[0].downtime!.weeks).toBe(26)
    expect(t.projects[0].downtime!.toTier).toBe('top')
  })

  it('the block reasons: building, not live, another downtime, a GPU contract, no higher tier, no Bandwidth, short of cash, outside Act III', () => {
    const r = { type: 'RETROFIT' as const, projectId: 'project-1' }
    expect(fails(withHall({ stage: 'building' }).s, r)).toBe('error.retrofit_building')
    expect(fails(withHall({ stage: 'proposed' }).s, r)).toBe('error.retrofit_building')
    expect(fails(withHall({ stage: 'ended' }).s, r)).toBe('error.hall_not_live')
    const busy = withHall({})
    busy.p.downtime = { kind: 'retrofit', fromQuarter: q('2027Q1'), weeks: 10, toTier: 'mid' }
    expect(fails(busy.s, r)).toBe('error.downtime_running')
    const contracted = withHall({
      ...cloud('h100', 'low'),
      tenant: {
        ...lease(q('2026Q2')),
        gpu: { gpus: 7500, priceUsdHr: 2, termQuarters: 12 },
      },
    })
    const blocked = applyAction(contracted.s, r)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.error.key).toBe('error.gpu_contract_until')
      expect(blocked.error.params!.quarter).toMatch(/^\d{4}Q[1-4]$/)
    }
    expect(fails(withHall({ tier: 'top' }).s, r)).toBe('error.no_higher_tier')
    const tired = withHall({})
    tired.s.bandwidth = 0
    expect(fails(tired.s, r)).toBe('error.no_bandwidth')
    const poor = withHall({})
    poor.s.cash = 14_999_999
    expect(fails(poor.s, r)).toBe('error.no_cash')
    const act2 = act2Company('2026Q1')
    expect(fails(act2, r)).toBe('error.act3_only')
  })
})

describe('the downtime rule', () => {
  it('10 weeks (low → mid): this quarter earns 3/13; mid from next quarter, full earnings', () => {
    const { s } = withHall({ tenant: lease() })
    const full = weekRevenue(s)
    const t = ok(s, { type: 'RETROFIT', projectId: 'project-1' })
    expect(weekRevenue(t)).toBeCloseTo((full * 3) / 13, 6)
    t.quarter++
    startQuarterProjects(t)
    expect(t.projects[0].tier).toBe('mid')
    expect(t.projects[0].downtime).toBeUndefined()
    expect(weekRevenue(t)).toBeCloseTo(full, 6)
  })

  it('26 weeks (mid → top): this quarter and the next earn 0; top from the one after', () => {
    const { s } = withHall({ tier: 'mid', tenant: lease() }, 's0', '2027Q3')
    const t = ok(s, { type: 'RETROFIT', projectId: 'project-1' })
    expect(weekRevenue(t)).toBe(0)
    t.quarter++
    startQuarterProjects(t)
    expect(t.projects[0].tier).toBe('mid')
    expect(weekRevenue(t)).toBe(0)
    t.quarter++
    startQuarterProjects(t)
    expect(t.projects[0].tier).toBe('top')
    expect(weekRevenue(t)).toBeGreaterThan(0)
  })

  it('the share, by formula: 10 w → 3/13, 1; 26 w → 0, 0, 1; 18 w → 0, 8/13, 1; 13 w → 0, 1', () => {
    const at = (weeks: number, k: number) =>
      downtimeShare(
        { downtime: { kind: 'refit', fromQuarter: 40, weeks } } as Project,
        40 + k,
      )
    const close = (got: number[], want: number[]) =>
      want.forEach((w, i) => expect(got[i]).toBeCloseTo(w, 12))
    close([at(10, 0), at(10, 1)], [3 / 13, 1])
    close([at(26, 0), at(26, 1), at(26, 2)], [0, 0, 1])
    close([at(18, 0), at(18, 1), at(18, 2)], [0, 8 / 13, 1])
    close([at(13, 0), at(13, 1)], [0, 1])
  })

  it('a leased shell: the tenant stays and pays no rent for the downtime; its term is unchanged; the new tier’s multiple applies at its next renewal', () => {
    const { s } = withHall({ tenant: lease() }, 's0', '2027Q3')
    const before = structuredClone(s.projects[0].tenant)
    const t = ok(s, { type: 'RETROFIT', projectId: 'project-1' })
    expect(t.projects[0].tenant).toEqual(before)
    expect(weekRevenue(t)).toBeCloseTo((weekRevenue(s) * 3) / 13, 6)
    // once done the hall is mid: its next renewal offer is × 1.00 instead of × 0.85
    t.quarter++
    startQuarterProjects(t)
    expect(t.projects[0].tier).toBe('mid')
    const asMid = renewalOffer(t, t.projects[0])!.mult
    const asLow = renewalOffer(t, { ...t.projects[0], tier: 'low' })!.mult
    expect(asLow / asMid).toBeCloseTo(BALANCE.act3.density.shellTierRentMult.low, 10)
  })
})

describe('REFIT_GPUS', () => {
  it('cost: new GPUs (GPUs per MW × MW × the unit price) less the old ones’ sale value; logged as gpu_buy', () => {
    const { s, p } = withHall(cloud('h100'), 's0', '2027Q2')
    const price = gpuPriceUsd('rubin_nvl144', s.quarter, 's0')!
    const sale = Math.round(gpuResidualUsd(p, s.quarter))
    const t = ok(s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'rubin_nvl144' })
    const n = t.projects[0]
    expect(n.gpu).toBe('rubin_nvl144')
    expect(n.gpuCount).toBe(9000)
    expect(s.cash - t.cash).toBe(Math.round(9000 * price) - sale)
    expect(n.gpuCapexUsd).toBe(Math.round(9000 * price))
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['gpu_buy'])
  })

  it('an 18-week lead (Rubin, newest in s1 2027Q1): this quarter earns 0, the next 8/13, then full', () => {
    const { s } = withHall(cloud('h100'), 's1', '2027Q1')
    expect(refitPlan(s, s.projects[0], 'rubin_nvl144')!.weeks).toBe(18)
    const t = ok(s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'rubin_nvl144' })
    expect(t.projects[0].downtime).toEqual({
      kind: 'refit',
      fromQuarter: q('2027Q1'),
      weeks: 18,
    })
    expect(weekRevenue(t)).toBe(0)
    t.quarter++
    startQuarterProjects(t)
    const partial = weekRevenue(t)
    const whole = weekRevenue({
      ...t,
      projects: [{ ...t.projects[0], downtime: undefined }],
    })
    expect(partial).toBeCloseTo((whole * 8) / 13, 6)
    t.quarter++
    startQuarterProjects(t)
    expect(t.projects[0].downtime).toBeUndefined()
  })

  it('only generations that fit the hall’s tier; not a shell, not its own GPUs, not under a GPU contract, needs the cash', () => {
    const lowHall = withHall(cloud('h100', 'low'), 's0', '2027Q3')
    expect(
      fails(lowHall.s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'b200' }),
    ).toBe('error.gpu_too_dense')
    ok(lowHall.s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'h200' })
    const midHall = withHall(cloud('h100', 'mid'), 's0', '2027Q3')
    expect(
      fails(midHall.s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'rubin_ultra' }),
    ).toBe('error.gpu_too_dense')
    expect(
      fails(midHall.s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'h100' }),
    ).toBe('error.refit_same_gpu')
    expect(
      fails(withHall({}).s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'h100' }),
    ).toBe('error.refit_shell')
    const poor = withHall(cloud('h100'), 's0', '2027Q3')
    poor.s.cash = 0
    expect(
      fails(poor.s, { type: 'REFIT_GPUS', projectId: 'project-1', gpu: 'rubin_nvl144' }),
    ).toBe('error.no_cash')
  })
})
