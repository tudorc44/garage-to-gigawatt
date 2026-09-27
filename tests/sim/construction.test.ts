// The balance review's additions (design thread, 27 Sep 2026): the Texas construction loan,
// the transformer upgrade and the 2020Q4–2022Q1 GPU shortage cap.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import { advance } from '../../src/sim/advance.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { startNextQuarter } from '../../src/sim/systems/quarter.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'

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

/** A 20 MW own site under contract, and a $40M Texas offer, in `label`. */
function texasReady(label: string, raised = ['series_a']): GameState {
  const s: GameState = {
    ...newGame(1),
    quarter: q(label),
    cash: 20_000_000,
    bandwidth: 3,
    raisesDone: raised,
  }
  s.sites = [
    ...s.sites,
    {
      id: 'site-own',
      tier: 'own_site',
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
      contract: {
        type: 'fixed',
        price: 0.04,
        startQuarter: 0,
        endQuarter: q(label) + 4,
      },
    },
  ]
  s.siteOffers = [
    {
      id: 'offer-tx',
      tier: 'texas_site',
      rentUsdQ: 0,
      capexUsd: 40_000_000,
      powerPriceMult: 1,
      flaw: null,
    },
  ]
  return s
}
const financed: Action = {
  type: 'BUILD_SITE',
  offerId: 'offer-tx',
  financed: true,
}

describe('Texas construction loan (capital.json › loans.construction)', () => {
  it('finances 60% of the build: you pay 40% now, the rest is debt at 11% over 8 quarters', () => {
    const s = ok(texasReady('2020Q3'), financed)
    expect(s.cash).toBe(20_000_000 - 16_000_000)
    expect(s.constructionLoan).toMatchObject({
      amountUsd: 24_000_000,
      balanceUsd: 24_000_000,
      apr: 0.11,
      weeksLeft: 8 * 13,
    })
    expect(debtUsd(s)).toBe(24_000_000)
    expect(s.sites.some((x) => x.tier === 'texas_site')).toBe(true)
  })

  it('needs 2020Q3+, Series A, a signed power contract, and only one at a time', () => {
    expect(err(texasReady('2020Q2'), financed)).toBe(
      'error.construction_loan_early',
    )
    expect(err(texasReady('2020Q3', ['seed']), financed)).toBe(
      'error.construction_loan_round',
    )
    const noContract = texasReady('2020Q3')
    noContract.sites = noContract.sites.map((x): Site => ({
      ...x,
      contract: undefined,
    }))
    expect(err(noContract, financed)).toBe('error.construction_loan_contract')
    const twice = texasReady('2020Q3')
    twice.constructionLoan = { ...ok(twice, financed).constructionLoan! }
    expect(err(twice, financed)).toBe('error.construction_loan_exists')
  })

  it('only covers the cash it leaves you short of: 40% must be in the bank', () => {
    expect(err({ ...texasReady('2020Q3'), cash: 15_000_000 }, financed)).toBe(
      'error.no_cash',
    )
  })

  it('is paid weekly (principal + interest) and can be repaid early', () => {
    let s = ok(texasReady('2020Q3'), financed)
    s = ok(s, { type: 'END_PLAN' })
    const before = s.constructionLoan!.balanceUsd
    s = advance(s)
    expect(s.constructionLoan!.balanceUsd).toBeCloseTo(before - before / 104, 0)
    const repaid = ok(
      { ...s, phase: 'plan', cash: 30_000_000 },
      { type: 'REPAY_CONSTRUCTION_LOAN' },
    )
    expect(repaid.constructionLoan).toBeNull()
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

describe('GPU shortage cap (machines.json › new_gpu_cap)', () => {
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

  it('caps new GPU rigs at 250 kW a quarter across all buys, 2020Q4–2022Q1', () => {
    const s = ok(withRoom('2021Q2'), buy(capUnits, 'new'))
    expect(err(s, buy(1, 'new'))).toBe('error.gpu_cap')
    expect(err(withRoom('2021Q2'), buy(capUnits + 1, 'new'))).toBe(
      'error.gpu_cap',
    )
  })

  it('leaves used rigs and quarters outside the shortage alone', () => {
    const used = ok(withRoom('2021Q2'), buy(capUnits * 2, 'used'))
    expect(used.machines.some((l) => l.condition === 'used')).toBe(true)
    expect(err(withRoom('2022Q2'), buy(capUnits * 2, 'new'))).toBeUndefined()
  })
})
