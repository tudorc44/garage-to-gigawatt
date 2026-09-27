// The balance reviews' additions (design thread, 27 Sep 2026): phased Texas and its construction
// loans, the transformer upgrade and the 2020Q4–2022Q1 GPU shortage cap.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { advance } from '../../src/sim/advance.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { mineWeek } from '../../src/sim/systems/mining.ts'
import { buyPrice, getModel, marketWeek } from '../../src/sim/systems/market.ts'
import { startNextQuarter } from '../../src/sim/systems/quarter.ts'
import { capacityKw, poweredKw } from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action): string | undefined {
  const r = applyAction(s, a)
  return r.ok ? undefined : r.error.key
}

const PHASE_Q = CONTENT.siteTiers.find((t) => t.id === 'texas_site')!.phases!
  .build_quarters

/** Series A closed, cash, and a $40M Texas offer, in `label`. */
function texasReady(label: string, raised = ['series_a']): GameState {
  return {
    ...newGame(1),
    quarter: q(label),
    cash: 20_000_000,
    bandwidth: 3,
    raisesDone: raised,
    siteOffers: [
      {
        id: 'offer-tx',
        tier: 'texas_site',
        rentUsdQ: 0,
        capexUsd: 40_000_000,
        powerPriceMult: 1,
        flaw: null,
      },
    ],
  }
}
const phaseOne = (financed: boolean, contractType?: 'fixed' | 'index') =>
  ({
    type: 'BUILD_SITE',
    offerId: 'offer-tx',
    financed,
    contractType,
  }) as Action
const texas = (s: GameState) => s.sites.find((x) => x.tier === 'texas_site')!

describe('phased Texas (sites.json › texas_site.phases)', () => {
  it("phase 1 = 20% of the cost, 20 MW, and signs the site's own contract as a renewal", () => {
    const s = ok(texasReady('2020Q3'), phaseOne(false, 'index'))
    expect(s.cash).toBe(20_000_000 - 8_000_000)
    const t = texas(s)
    expect(t.phases).toEqual([q('2020Q3') + PHASE_Q])
    expect(t.readyQuarter).toBe(q('2020Q3') + PHASE_Q)
    expect(capacityKw(t)).toBe(20_000)
    expect(t.contract?.type).toBe('index')
    // Its term ends now: negotiated (or taken at the opening) like any renewal this Plan phase.
    expect(t.contract?.endQuarter).toBe(q('2020Q3'))
  })

  it('phase 1 needs 2020Q3+ and Series A', () => {
    expect(err(texasReady('2020Q2'), phaseOne(false))).toBe('error.phase_early')
    expect(err(texasReady('2020Q3', ['seed']), phaseOne(false))).toBe(
      'error.phase_needs_round',
    )
  })

  it('later phases can start any time, up to 5; each adds 20 MW when it is powered', () => {
    let s = ok({ ...texasReady('2020Q3'), cash: 60_000_000 }, phaseOne(false))
    const id = texas(s).id
    s = ok(s, { type: 'BUILD_PHASE', siteId: id })
    s = ok(s, { type: 'BUILD_PHASE', siteId: id })
    expect(texas(s).phases).toHaveLength(3)
    expect(capacityKw(texas(s))).toBe(60_000)
    expect(poweredKw(texas(s), q('2020Q3'))).toBe(0)
    expect(poweredKw(texas(s), q('2020Q3') + PHASE_Q)).toBe(60_000)
    s = { ...s, bandwidth: 3 }
    s = ok(s, { type: 'BUILD_PHASE', siteId: id })
    s = ok(s, { type: 'BUILD_PHASE', siteId: id })
    expect(err(s, { type: 'BUILD_PHASE', siteId: id })).toBe(
      'error.all_phases_built',
    )
  })

  it('machines beyond the powered phases wait (only delivered machines share the power)', () => {
    let s = ok(texasReady('2020Q3'), phaseOne(false))
    s = ok(s, { type: 'BUILD_PHASE', siteId: texas(s).id })
    const t = texas(s)
    // Phase 1 powered, phase 2 not yet: 40 MW of S9s placed, 20 MW powered.
    const later: GameState = {
      ...s,
      quarter: t.phases![0],
      sites: s.sites.map((x) =>
        x.id === t.id ? { ...x, phases: [t.phases![0], t.phases![0] + 1] } : x,
      ),
      machines: [
        {
          id: 'lot-s9',
          model: 's9',
          siteId: t.id,
          condition: 'used',
          count: Math.floor(40_000 / getModel('s9')!.power_kw),
          failed: 0,
          earnsFromQuarter: 0,
        },
      ],
    }
    const w = marketWeek(later.quarter, 0)
    const half = mineWeek(later, w)[0]
    const full = mineWeek(
      {
        ...later,
        sites: later.sites.map((x) =>
          x.id === t.id ? { ...x, phases: [t.phases![0], t.phases![0]] } : x,
        ),
      },
      w,
    )[0]
    expect(half.working / full.working).toBeCloseTo(0.5, 3)
  })
})

describe('construction loans (capital.json › loans.construction)', () => {
  it('finance 60% of a phase at 11% over 8 quarters; one loan per phase', () => {
    let s = ok(texasReady('2020Q3'), phaseOne(true))
    expect(s.cash).toBe(20_000_000 - 3_200_000)
    expect(s.constructionLoans).toHaveLength(1)
    expect(s.constructionLoans[0]).toMatchObject({
      amountUsd: 4_800_000,
      apr: 0.11,
      weeksLeft: 8 * 13,
    })
    s = ok(s, { type: 'BUILD_PHASE', siteId: texas(s).id, financed: true })
    expect(s.constructionLoans).toHaveLength(2)
    expect(debtUsd(s)).toBe(9_600_000)
  })

  it("need 2020Q3+, Series A and the site's own contract; cover only 60%", () => {
    expect(err(texasReady('2020Q2'), phaseOne(true))).toBe('error.phase_early')
    expect(
      err({ ...texasReady('2020Q3'), cash: 3_000_000 }, phaseOne(true)),
    ).toBe('error.no_cash')
    // A later phase of a site that somehow lost its contract can't be financed.
    const s = ok(texasReady('2020Q3'), phaseOne(false))
    const noContract: GameState = {
      ...s,
      sites: s.sites.map((x) =>
        x.tier === 'texas_site' ? { ...x, contract: undefined } : x,
      ),
    }
    expect(
      err(noContract, {
        type: 'BUILD_PHASE',
        siteId: texas(s).id,
        financed: true,
      }),
    ).toBe('error.construction_loan_contract')
  })

  it('are paid weekly (principal + interest) and can all be repaid early', () => {
    let s = ok(texasReady('2020Q3'), phaseOne(true))
    s = ok(s, { type: 'BUILD_PHASE', siteId: texas(s).id, financed: true })
    s = ok(s, { type: 'END_PLAN' })
    const before = debtUsd(s)
    s = advance(s)
    expect(debtUsd(s)).toBeCloseTo(before - before / 104, 0)
    const repaid = ok(
      { ...s, phase: 'plan', cash: 30_000_000 },
      { type: 'REPAY_CONSTRUCTION_LOAN' },
    )
    expect(repaid.constructionLoans).toEqual([])
  })
})

describe('transformer upgrade (sites.json › undersized_transformer)', () => {
  function flawed(): GameState {
    const s: GameState = {
      ...newGame(1),
      quarter: q('2019Q1'),
      cash: 500_000,
      bandwidth: 3,
    }
    s.sites = [
      ...s.sites,
      {
        id: 'site-w',
        tier: 'warehouse',
        readyQuarter: 0,
        rentUsdQ: 30_000,
        powerPriceMult: 1,
        flaw: 'undersized_transformer',
      },
    ]
    return s
  }

  it('costs $150K and 1 Bandwidth, and clears the flaw when next quarter starts', () => {
    const s = ok(flawed(), { type: 'UPGRADE_TRANSFORMER', siteId: 'site-w' })
    expect(s.cash).toBe(350_000)
    expect(s.bandwidth).toBe(2)
    const site = () => s.sites.find((x) => x.id === 'site-w')!
    expect(capacityKw(site())).toBeCloseTo(600)
    expect(err(s, { type: 'UPGRADE_TRANSFORMER', siteId: 'site-w' })).toBe(
      'error.upgrade_underway',
    )
    s.phase = 'report'
    startNextQuarter(s)
    expect(site().flaw).toBeNull()
    expect(capacityKw(site())).toBe(1000)
  })

  it('is only for sites whose flaw has an upgrade', () => {
    expect(
      err(newGame(1), { type: 'UPGRADE_TRANSFORMER', siteId: 'site-1' }),
    ).toBe('error.nothing_to_upgrade')
  })
})

describe('GPU shortage cap (machines.json › gpu_cap)', () => {
  /** A warehouse with room, lots of cash, in `label`. */
  function withRoom(label: string): GameState {
    const s: GameState = {
      ...newGame(1),
      quarter: q(label),
      cash: 10_000_000,
    }
    s.sites = [
      ...s.sites,
      {
        id: 'site-w',
        tier: 'warehouse',
        readyQuarter: 0,
        rentUsdQ: 0,
        powerPriceMult: 1,
        flaw: null,
      },
    ]
    return s
  }
  const buy = (count: number, condition: 'new' | 'used'): Action => ({
    type: 'BUY_MACHINES',
    model: 'gpu_gen2',
    condition,
    count,
    siteId: 'site-w',
  })
  const kw = CONTENT.machines.find((m) => m.id === 'gpu_gen2')!.power_kw
  const capUnits = Math.floor(250 / kw)

  it('caps GPU rigs, new and used together, at 250 kW a quarter, 2020Q4–2022Q1', () => {
    const s = ok(withRoom('2021Q2'), buy(capUnits, 'new'))
    expect(err(s, buy(1, 'used'))).toBe('error.gpu_cap')
    expect(err(withRoom('2021Q2'), buy(capUnits + 1, 'used'))).toBe(
      'error.gpu_cap',
    )
  })

  it('makes used rigs cost at least the new price in the shortage', () => {
    const gpu = getModel('gpu_gen2')!
    for (const label of ['2021Q1', '2021Q2', '2021Q3']) {
      expect(buyPrice(gpu, q(label), 'used')).toBeGreaterThanOrEqual(
        buyPrice(gpu, q(label), 'new')!,
      )
    }
  })

  it('leaves quarters outside the shortage alone', () => {
    expect(err(withRoom('2022Q2'), buy(capUnits * 2, 'new'))).toBeUndefined()
    expect(err(withRoom('2022Q2'), buy(capUnits * 2, 'used'))).toBeUndefined()
  })
})
