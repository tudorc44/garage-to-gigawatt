import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { maxCryptoLoanUsd } from '../../src/sim/systems/cryptoLoan.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'

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
/** 2018Q1 with 100 ETH in the treasury and $10,000 cash. */
function holdingEth(label = '2018Q1'): GameState {
  return {
    ...newGame(1),
    quarter: q(label),
    treasury: { BTC: 0, ETH: 100 },
  }
}
const borrow = (amountUsd: number, coin: 'BTC' | 'ETH' = 'ETH'): Action => ({
  type: 'TAKE_CRYPTO_LOAN',
  coin,
  amountUsd,
})

describe('crypto-backed loan (capital.json game_crypto_loan)', () => {
  it('lends up to 50% of the coins’ value at the Plan-screen price', () => {
    const price = marketWeek(q('2018Q1'), 0).eth_usd
    expect(maxCryptoLoanUsd(holdingEth(), 'ETH')).toBe(
      Math.floor(0.5 * 100 * price),
    )
    expect(maxCryptoLoanUsd(holdingEth(), 'BTC')).toBe(0)
  })

  it('pledges just enough coins for 50% LTV; cash in, 1 Bandwidth, logged', () => {
    const price = marketWeek(q('2018Q1'), 0).eth_usd
    const s = ok(holdingEth(), borrow(10_000))
    const pledged = 10_000 / 0.5 / price
    expect(s.cryptoLoan).toMatchObject({ coin: 'ETH', balanceUsd: 10_000 })
    expect(s.cryptoLoan!.collateral).toBeCloseTo(pledged)
    expect(s.treasury.ETH).toBeCloseTo(100 - pledged)
    expect(s.cash).toBe(20_000)
    expect(s.bandwidth).toBe(2)
    const entry = s.log.at(-1)!
    expect(t(entry.key, entry.params)).toMatch(
      /^Borrowed \$10\.0K against [\d.]+ ETH at 9% a year\.$/,
    )
  })

  it('refuses: outside 2018Q1–2022Q2, too much, a second loan, no coins, no Bandwidth', () => {
    expect(err(holdingEth('2017Q4'), borrow(100))).toBe(
      'error.crypto_loan_window',
    )
    expect(err(holdingEth('2022Q3'), borrow(100))).toBe(
      'error.crypto_loan_window',
    )
    const max = maxCryptoLoanUsd(holdingEth(), 'ETH')
    expect(err(holdingEth(), borrow(max + 1))).toBe('error.crypto_loan_too_big')
    expect(err(ok(holdingEth(), borrow(100)), borrow(100))).toBe(
      'error.crypto_loan_exists',
    )
    expect(err(holdingEth(), borrow(100, 'BTC'))).toBe('error.nothing_to_sell')
    expect(err({ ...holdingEth(), bandwidth: 0 }, borrow(100))).toBe(
      'error.no_bandwidth',
    )
  })

  it('charges 9% a year weekly; the loan is debt and the pledged coins still count in the valuation', () => {
    const play = (s: GameState) => {
      s = ok(s, { type: 'END_PLAN' })
      while (s.phase === 'live') {
        s = s.interrupt
          ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
          : advance(s)
      }
      return s
    }
    // 2020Q4: ETH rose all quarter, so no margin call gets in the way.
    const s = play(ok(holdingEth('2020Q4'), borrow(10_000)))
    const r = s.reports.at(-1)!
    expect(r.interestUsd).toBeCloseTo((10_000 * 0.09) / 4, 0)
    expect(r.principalUsd).toBe(0)
    expect(r.debtUsd).toBe(10_000)
    expect(s.cryptoLoan!.balanceUsd).toBe(10_000)
    // Same quarter without the loan: the only difference is the interest paid.
    const noLoan = play(holdingEth('2020Q4')).reports.at(-1)!
    expect(r.valuationUsd - noLoan.valuationUsd).toBeCloseTo(-r.interestUsd, 0)
  })

  it('repaying returns the pledged coins; needs the cash', () => {
    const s = ok(ok(holdingEth(), borrow(10_000)), {
      type: 'REPAY_CRYPTO_LOAN',
    })
    expect(s.treasury.ETH).toBeCloseTo(100)
    expect(s.cash).toBe(10_000)
    expect(s.cryptoLoan).toBeNull()
    const broke = { ...ok(holdingEth(), borrow(10_000)), cash: 100 }
    expect(err(broke, { type: 'REPAY_CRYPTO_LOAN' })).toBe('error.no_cash')
  })
})
