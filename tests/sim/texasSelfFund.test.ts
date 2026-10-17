// M79.3 (doc 62 v1.0 §1): Texas phase 1 without Series A: the phase's full cost plus a security deposit (2 quarters of the 20 MW power
// bill at the contract's price) in cash. The deposit is held, counted in the company's value, returned after 4 clean quarters, applied
// to a cash shortfall, and returned if you leave. The construction loan still needs Series A; later phases are unchanged.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { applyDepositShortfall, depositsHeldUsd, texasDepositUsd } from '../../src/sim/systems/deposits.ts'
import { playQuarter } from './act2Helpers.ts'

const q = (l: string) => quarterIndex(l)!
const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? undefined : r.error.key
}

/** An Act I Plan phase in `label`, a $40M Texas offer, no Series A (unless `raised`). */
function texas(label: string, cash = 20_000_000, raised: string[] = ['seed']): GameState {
  return {
    ...newGame(1),
    quarter: q(label),
    phase: 'plan',
    cash,
    bandwidth: 4,
    raisesDone: raised,
    siteOffers: [{ id: 'offer-tx', tier: 'texas_site', rentUsdQ: 0, capexUsd: 40_000_000, powerPriceMult: 1, flaw: null }],
  }
}
const build = (financed = false, contractType: 'fixed' | 'index' = 'fixed') => ({ type: 'BUILD_SITE', offerId: 'offer-tx', financed, contractType }) as Action
const site = (s: GameState) => s.sites.find((x) => x.tier === 'texas_site')!

describe('the deposit', () => {
  it('is 2 quarters of the 20 MW power bill at the contract price: fixed $3,057,600, and different for the index contract', () => {
    const s = texas('2020Q3')
    expect(texasDepositUsd(s, 'texas_site', 1, 'fixed')).toBe(3_057_600)
    expect(texasDepositUsd(s, 'texas_site', 1, 'index')).not.toBe(texasDepositUsd(s, 'texas_site', 1, 'fixed'))
    expect(texasDepositUsd(s, 'texas_site', 1.1, 'fixed')).toBeCloseTo(3_057_600 * 1.1, 0)
  })

  it('numbers live in sites.json with a grade', () => {
    const f = CONTENT.siteTiers.find((t) => t.id === 'texas_site')!.phases!.self_fund!
    expect(f).toMatchObject({ deposit_quarters: 2, return_after_quarters: 4, grade: 'D' })
  })
})

describe('both paths into phase 1', () => {
  it('Series A closed: as before, no deposit', () => {
    const s = ok(texas('2020Q3', 20_000_000, ['series_a']), build())
    expect(s.cash).toBe(12_000_000)
    expect(site(s).deposit).toBeUndefined()
    expect(depositsHeldUsd(s)).toBe(0)
  })

  it('self-funded: full cost and the deposit leave cash; the deposit is held on the site', () => {
    const s = ok(texas('2020Q3'), build())
    expect(s.cash).toBe(20_000_000 - 8_000_000 - 3_057_600)
    expect(site(s).deposit).toMatchObject({ usd: 3_057_600 })
    expect(depositsHeldUsd(s)).toBe(3_057_600)
    expect(s.log.some((e) => e.key === 'log.deposit_posted')).toBe(true)
  })

  it('self-funded needs the cost plus the deposit, and says so with the amount', () => {
    const r = applyAction(texas('2020Q3', 10_000_000), build())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toEqual({ key: 'error.phase_needs_round_or_deposit', params: { amountUsd: 3_057_600 } })
    expect(err(texas('2020Q3', 11_057_599), build())).toBe('error.phase_needs_round_or_deposit')
    expect(err(texas('2020Q3', 11_057_600), build())).toBeUndefined()
  })

  it('the construction loan still needs Series A', () => {
    expect(err(texas('2020Q3'), build(true))).toBe('error.construction_loan_round')
  })

  it('later phases are unchanged: any time after phase 1, paid in cash, no further deposit', () => {
    let s = ok(texas('2020Q3', 60_000_000), build())
    const held = depositsHeldUsd(s)
    const cash = s.cash
    s = ok(s, { type: 'BUILD_PHASE', siteId: site(s).id })
    expect(cash - s.cash).toBe(8_000_000)
    expect(depositsHeldUsd(s)).toBe(held)
  })

  it('too early is still too early', () => {
    expect(err(texas('2020Q2'), build())).toBe('error.phase_early')
  })
})

describe('the deposit over time', () => {
  it('counts in the quarter report\'s value while held', () => {
    let s = ok(texas('2020Q3'), build())
    s = playQuarter(s)
    const held = s.reports.at(-1)!
    expect(held.cash).toBeLessThan(20_000_000 - 8_000_000)
    // value = cash + held deposit (+ nothing else here): the held deposit is in it
    expect(held.valuationUsd).toBeGreaterThan(held.cash + 3_000_000)
  })

  it('comes back at the end of the fourth energized quarter, once', () => {
    let s = ok(texas('2020Q3'), build())
    const back = site(s).deposit!.returnQuarter
    expect(back).toBe(site(s).readyQuarter + 3)
    while (s.quarter < back) s = playQuarter(s)
    expect(site(s).deposit).toBeDefined() // not yet: it comes back as the quarter ends
    const before = s.cash
    s = playQuarter(s)
    expect(site(s).deposit).toBeUndefined()
    expect(s.log.filter((e) => e.key === 'log.deposit_returned')).toHaveLength(1)
    expect(s.cash).toBeGreaterThan(before + 2_900_000 - 200_000) // the deposit, less the quarter's own costs
  })

  it('is applied to a cash shortfall, and its clock starts again', () => {
    let s = ok(texas('2020Q3'), build())
    s = { ...s, cash: -1_000 }
    const first = site(s).deposit!.returnQuarter
    applyDepositShortfall(s, 3)
    expect(s.cash).toBe(0)
    expect(site(s).deposit!.usd).toBe(3_057_600 - 1_000)
    expect(site(s).deposit!.returnQuarter).toBe(Math.max(first, s.quarter + 4))
    expect(s.log.some((e) => e.key === 'log.deposit_applied')).toBe(true)
    // no shortfall, no change
    const same = structuredClone(s)
    applyDepositShortfall(same, 4)
    expect(same).toEqual(s)
  })

  it('a deposit larger than the shortfall is used only as far as needed; a smaller one is used up and gone', () => {
    const s = ok(texas('2020Q3'), build())
    s.cash = -5_000_000
    applyDepositShortfall(s, 1)
    expect(site(s).deposit).toBeUndefined()
    expect(s.cash).toBe(-5_000_000 + 3_057_600)
  })

  it('leaving the site returns the deposit with the lease', () => {
    let s = ok(texas('2020Q3', 30_000_000), build())
    const cash = s.cash
    s = ok(s, { type: 'LEAVE_SITE', siteId: site(s).id })
    expect(s.cash).toBeGreaterThan(cash + 2_000_000)
    expect(s.sites.some((x) => x.tier === 'texas_site')).toBe(false)
  })
})
