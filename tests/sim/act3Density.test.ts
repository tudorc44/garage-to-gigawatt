// M16.2: hall density tiers. A project is a hall with a tier (low / mid / top): carried halls get theirs at
// the Act III boundary, new Act III halls are mid (or their GPU's tier, or top when ticked), a GPU fits a hall
// of its tier or denser, and from 2027Q3 a shell's new lease, re-let and renewal offer are × its tier's
// multiple (low 0.85, mid 1.00, top 1.10), after the Band.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import {
  carriedTier,
  fits,
  newHallTier,
  shellTierRentMult,
} from '../../src/sim/systems/density.ts'
import {
  plannedBuildQuarters,
  projectCapex,
} from '../../src/sim/systems/projects.ts'
import { completeRelets, renewalOffer } from '../../src/sim/systems/renewals.ts'
import { enterAct3 } from '../../src/sim/systems/act3Entry.ts'
import { act2Company, ok } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const D = BALANCE.act3.density

/** An Act III company (an empty 20 MW site, $500M) on `id` in the Plan phase of `label`. */
function act3Co(id: ScenarioId = 's0', label = '2027Q1'): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: id })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  return s
}

/** A bare project for the rule tests. */
function project(o: Partial<Project>): Project {
  return {
    id: 'project-1',
    n: 1,
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
    gpu: null,
    openedQuarter: q('2024Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: 0,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: q('2024Q2'),
    readyQuarter: q('2024Q4'),
    soldQuarter: null,
    ...o,
  }
}

describe('the tier at the Act III boundary (DT, one case per rule)', () => {
  it('a live cloud or pilot takes its GPU’s tier: H100 / H200 low, B200 mid', () => {
    expect(carriedTier(project({ kind: 'cloud', gpu: 'h100' }))).toBe('low')
    expect(carriedTier(project({ kind: 'cloud', gpu: 'h200' }))).toBe('low')
    expect(carriedTier(project({ kind: 'pilot', gpu: 'h100' }))).toBe('low')
    expect(carriedTier(project({ kind: 'cloud', gpu: 'b200' }))).toBe('mid')
  })

  it('a live shell: mid if its build started in 2025Q1 or later, else low', () => {
    expect(carriedTier(project({ startQuarter: q('2024Q4') }))).toBe('low')
    expect(carriedTier(project({ startQuarter: q('2025Q1') }))).toBe('mid')
    expect(carriedTier(project({ startQuarter: q('2026Q3') }))).toBe('mid')
  })

  it('a proposed or building project is mid (whatever its GPU); a gone one gets none', () => {
    expect(carriedTier(project({ stage: 'proposed', kind: 'cloud', gpu: 'h100' }))).toBe('mid')
    expect(carriedTier(project({ stage: 'building', startQuarter: q('2023Q1') }))).toBe('mid')
    expect(carriedTier(project({ stage: 'sold' }))).toBeUndefined()
    expect(carriedTier(project({ stage: 'ended', kind: 'cloud', gpu: 'h100' }))).toBeUndefined()
  })

  it('enterAct3 gives every carried hall its tier; Act II projects have none', () => {
    const s = act2Company('2026Q4')
    s.projects = [
      project({ id: 'project-1', n: 1, startQuarter: q('2024Q1') }),
      project({ id: 'project-2', n: 2, kind: 'cloud', gpu: 'b200' }),
      project({ id: 'project-3', n: 3, stage: 'building' }),
    ]
    expect(s.projects.every((p) => p.tier === undefined)).toBe(true)
    const t = enterAct3(s, 's0')
    expect(t.projects.map((p) => p.tier)).toEqual(['low', 'mid', 'mid'])
  })
})

describe('the fit rule: a GPU fits a hall of its tier or denser', () => {
  it('low halls take H100 / H200 only; mid adds Blackwell and Rubin; top adds Rubin Ultra', () => {
    const gens = ['h100', 'h200', 'b200', 'rubin_nvl144', 'rubin_ultra']
    const fitting = (tier: 'low' | 'mid' | 'top') =>
      gens.filter((g) => fits(g, tier))
    expect(fitting('low')).toEqual(['h100', 'h200'])
    expect(fitting('mid')).toEqual(['h100', 'h200', 'b200', 'rubin_nvl144'])
    expect(fitting('top')).toEqual(gens)
  })
})

describe('new Act III halls', () => {
  it('mid by default, the GPU’s tier if denser, top when ticked; never low', () => {
    expect(newHallTier(null, false)).toBe('mid')
    expect(newHallTier('h100', false)).toBe('mid')
    expect(newHallTier('rubin_ultra', false)).toBe('top')
    expect(newHallTier(null, true)).toBe('top')
    const s = ok(act3Co(), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'cloud',
      gpu: 'h100',
    })
    expect(s.projects[0].tier).toBe('mid')
  })

  it('"Build to top tier" (from 2027Q3): + 0.6 × the quarter’s mid→top $/MW × MW, and one more build quarter', () => {
    const before = act3Co('s0', '2027Q2')
    const tick = {
      type: 'PROJECT_OPEN' as const,
      siteId: 'site-2',
      kw: 10_000,
      kind: 'shell' as const,
      topTier: true,
    }
    const r = (s: GameState, a: Action = tick) => applyAction(s, a)
    const early = r(before)
    expect(early.ok).toBe(false)
    if (!early.ok) expect(early.error.key).toBe('error.top_tier_closed')
    const s = act3Co('s0', '2027Q3')
    const top = ok(s, tick)
    const mid = ok(s, { ...tick, topTier: undefined })
    const pt = top.projects[0]
    const pm = mid.projects[0]
    expect(pt.tier).toBe('top')
    expect(pm.tier).toBe('mid')
    const perMw = Number(
      CONTENT.act3Scenarios.s0.quarterly[2].capex_retrofit_density_mid_to_top_usd_mw,
    )
    const ct = projectCapex(top, pt)
    expect(ct.densityUsd).toBeCloseTo(0.6 * perMw * 10, 2)
    expect(ct.totalUsd - projectCapex(mid, pm).totalUsd).toBeCloseTo(
      ct.densityUsd,
      2,
    )
    expect(plannedBuildQuarters(top, pt)).toBe(
      plannedBuildQuarters(mid, pm) + D.topNewBuildExtraQuarters,
    )
    // a pilot can't be ticked
    const pilot = r(s, { ...tick, kind: 'pilot', kw: 1000 })
    expect(pilot.ok).toBe(false)
    if (!pilot.ok) expect(pilot.error.key).toBe('error.top_tier_closed')
  })

  it('outside Act III nothing has a tier and the capex has no density part', () => {
    const s = ok(act2Company('2026Q1'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    expect(s.projects[0].tier).toBeUndefined()
    expect(projectCapex(s, s.projects[0]).densityUsd).toBe(0)
  })
})

describe('shell rent by tier (DT: × after the Band, from 2027Q3; signed rents unchanged)', () => {
  /** A live 5 MW shell lease of the first hyperscaler card at `label`, in a hall of `tier`. */
  function leased(label: string, tier: 'low' | 'mid' | 'top', id: ScenarioId = 's0') {
    const s = act3Co(id, label)
    const card = CONTENT.projects.tenantCards.find(
      (c) => c.type === 'hyperscaler',
    )!
    const p = project({
      tier,
      tenant: {
        card: card.id,
        signedQuarter: q('2026Q1'),
        readyByQuarter: q('2026Q1'),
        lateQuarters: 0,
        walkRolled: true,
        prepaymentLeftUsd: 0,
        servedQuarters: 0,
        termQuarters: 40,
      },
    })
    s.projects = [p]
    return { s, p, card }
  }

  it('the multiple: 1 before 2027Q3; 0.85 / 1.00 / 1.10 from 2027Q3; 1 for a cloud', () => {
    for (const tier of ['low', 'mid', 'top'] as const) {
      expect(shellTierRentMult(leased('2027Q2', tier).s, { kind: 'shell', tier })).toBe(1)
      expect(shellTierRentMult(leased('2027Q3', tier).s, { kind: 'shell', tier })).toBe(
        D.shellTierRentMult[tier],
      )
    }
    expect(shellTierRentMult(leased('2028Q1', 'low').s, { kind: 'cloud', tier: 'low' })).toBe(1)
  })

  it('a renewal offer: before 2027Q3 the same in every tier; from 2027Q3 × the tier multiple', () => {
    const offer = (label: string, tier: 'low' | 'mid' | 'top') => {
      const { s, p } = leased(label, tier)
      return renewalOffer(s, p)!.mult
    }
    expect(offer('2027Q2', 'low')).toBe(offer('2027Q2', 'mid'))
    expect(offer('2028Q1', 'low') / offer('2028Q1', 'mid')).toBeCloseTo(0.85, 10)
    expect(offer('2028Q1', 'top') / offer('2028Q1', 'mid')).toBeCloseTo(1.1, 10)
  })

  it('a re-let: the lapsed rent × the RFP midpoint × the tier multiple (from 2027Q3)', () => {
    const relet = (label: string, tier: 'low' | 'mid' | 'top') => {
      const { s, p, card } = leased(label, tier)
      p.tenant = null
      p.pendingRelet = { card: card.id, lapsedRentUsd: 10_000_000 }
      completeRelets(s)
      return p.tenant!.priceMult! * card.priceUsdMwYr * (p.kw / 1000)
    }
    expect(relet('2027Q2', 'low')).toBeCloseTo(relet('2027Q2', 'mid'), 4)
    expect(relet('2028Q2', 'low') / relet('2028Q2', 'mid')).toBeCloseTo(0.85, 10)
    expect(relet('2028Q2', 'top') / relet('2028Q2', 'mid')).toBeCloseTo(1.1, 10)
  })

  it('a new lease: signed at the offer × the new-lease index × the tier multiple (from 2027Q3)', () => {
    const sign = (label: string, tier: 'low' | 'mid' | 'top') => {
      let s = ok(act3Co('s0', label), {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 5000,
        kind: 'shell',
      })
      s.projects[0].tier = tier
      if (s.projects[0].offers.length === 0) throw new Error('no offers')
      s = ok(s, {
        type: 'PROJECT_SIGN_TENANT',
        projectId: 'project-1',
        offerId: s.projects[0].offers[0].id,
      })
      return s.projects[0].tenant!.priceMult ?? 1
    }
    expect(sign('2027Q2', 'low')).toBe(sign('2027Q2', 'mid'))
    expect(sign('2027Q3', 'low') / sign('2027Q3', 'mid')).toBeCloseTo(0.85, 10)
    expect(sign('2027Q3', 'top') / sign('2027Q3', 'mid')).toBeCloseTo(1.1, 10)
  })

  it('rents already signed don’t change when 2027Q3 comes', () => {
    const { s, p } = leased('2027Q2', 'low')
    const before = structuredClone(p.tenant)
    s.quarter = q('2027Q3')
    expect(p.tenant).toEqual(before)
  })
})
