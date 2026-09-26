import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  collateralUsd,
  equipmentTerms,
  maxEquipmentLoanUsd,
} from '../../src/sim/systems/loans.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function ok(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
/** Plays the live quarter to its report, holding through any alerts. */
function playQuarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live') {
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      : advance(s)
  }
  return s
}
/** A game in `label` with 5 used GPU rigs in the garage (worth $12,500 in 2018Q1) and $50,000 cash. */
function withRigs(label = '2018Q1'): GameState {
  const s = { ...newGame(1), quarter: q(label), cash: 100_000 }
  const bought = ok(s, {
    type: 'BUY_MACHINES',
    model: 'gpu_gen1',
    condition: 'used',
    count: 5,
    siteId: 'site-1',
  })
  return { ...bought, cash: 50_000 }
}
const borrow = (amountUsd: number): Action => ({ type: 'TAKE_LOAN', amountUsd })

describe('equipment loan terms (capital.json)', () => {
  it('change by era and stop after 2022Q2', () => {
    expect(equipmentTerms(q('2017Q1'))).toMatchObject({
      ltv: 0.5,
      apr: 0.15,
      tenorQuarters: 8,
    })
    expect(equipmentTerms(q('2020Q3'))).toMatchObject({ ltv: 0.7, apr: 0.11 })
    expect(equipmentTerms(q('2022Q2'))).toMatchObject({ ltv: 0.5, apr: 0.14 })
    expect(equipmentTerms(q('2022Q3'))).toBeUndefined()
  })

  it('lends up to LTV × what your machines would sell for', () => {
    const s = withRigs()
    expect(collateralUsd(s)).toBeGreaterThan(0)
    expect(maxEquipmentLoanUsd(s)).toBe(Math.floor(0.5 * collateralUsd(s)))
    expect(maxEquipmentLoanUsd(newGame(1))).toBe(0)
  })
})

describe('taking and repaying an equipment loan', () => {
  it('adds the cash, costs 1 Bandwidth, and is logged', () => {
    const s = ok(withRigs(), borrow(1_000))
    expect(s.cash).toBe(51_000)
    expect(s.bandwidth).toBe(2)
    expect(s.equipmentLoan).toMatchObject({
      amountUsd: 1_000,
      balanceUsd: 1_000,
      apr: 0.15,
    })
    const entry = s.log.at(-1)!
    expect(t(entry.key, entry.params)).toBe(
      'Borrowed $1,000 against your machines at 15% a year, repaid over 8 quarters.',
    )
  })

  it('refuses: no machines, too much, a second loan, bad amounts, no Bandwidth, after 2022Q2', () => {
    const s = withRigs()
    const max = maxEquipmentLoanUsd(s)
    expect(err(newGame(1), borrow(100))).toBe('error.loan_no_collateral')
    expect(err(s, borrow(max + 1))).toBe('error.loan_too_big')
    expect(err(ok(s, borrow(100)), borrow(100))).toBe('error.loan_exists')
    expect(err(s, borrow(0))).toBe('error.bad_amount')
    expect(err(s, borrow(10.5))).toBe('error.bad_amount')
    expect(err({ ...s, bandwidth: 0 }, borrow(100))).toBe('error.no_bandwidth')
    expect(err({ ...s, quarter: q('2022Q3') }, borrow(100))).toBe(
      'error.loan_not_offered',
    )
  })

  it('is paid weekly: 1/8 of the principal a quarter, plus interest on what is owed', () => {
    const start = ok(withRigs(), borrow(4_000))
    const s = playQuarter(start)
    const r = s.reports.at(-1)!
    expect(r.principalUsd).toBeCloseTo(500, 0)
    // 15% a year on a balance falling from $4,000 to $3,500: a little under $150.
    expect(r.interestUsd).toBeGreaterThan(135)
    expect(r.interestUsd).toBeLessThan(150)
    expect(r.debtUsd).toBeCloseTo(3_500, 0)
    expect(s.equipmentLoan!.balanceUsd).toBeCloseTo(3_500, 0)
  })

  it('counts as debt in the valuation', () => {
    const noLoan = playQuarter(withRigs()).reports.at(-1)!
    const withLoan = playQuarter(ok(withRigs(), borrow(4_000))).reports.at(-1)!
    // Same game, but the loan's cash is offset by the debt, minus the interest paid.
    expect(withLoan.valuationUsd - noLoan.valuationUsd).toBeCloseTo(
      -withLoan.interestUsd,
      0,
    )
  })

  it('is paid off after 8 quarters, and then it is gone', () => {
    let s = ok(withRigs('2018Q1'), borrow(4_000))
    for (let i = 0; i < 8; i++) {
      s = playQuarter(s)
      if (i < 7) s = ok(s, { type: 'NEXT_QUARTER' })
    }
    expect(s.equipmentLoan).toBeNull()
    expect(s.log.some((e) => e.key === 'log.loan_paid_off')).toBe(true)
    expect(s.reports.at(-1)!.debtUsd).toBe(0)
  })

  it('can be repaid early in full, with no penalty and no Bandwidth', () => {
    const s = ok(ok(withRigs(), borrow(4_000)), { type: 'REPAY_LOAN' })
    expect(s.cash).toBe(50_000)
    expect(s.equipmentLoan).toBeNull()
    expect(s.bandwidth).toBe(2)
    expect(err(s, { type: 'REPAY_LOAN' })).toBe('error.no_loan')
    const broke = { ...ok(withRigs(), borrow(4_000)), cash: 100 }
    expect(err(broke, { type: 'REPAY_LOAN' })).toBe('error.no_cash')
  })
})
