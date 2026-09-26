// The crypto-backed loan (capital.json loans.game_crypto_loan): pledge coins from the
// treasury and borrow up to ltv_max of their value. Interest is paid weekly; the loan
// itself is repaid whenever you like (no fixed term). One at a time.
// LTV (loan-to-value) = what you owe ÷ what the pledged coins are worth now.
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type Coin, type GameState } from '../state.ts'
import { coinPrice, marketWeek } from './market.ts'

export function cryptoLoanOffered(quarter: number): boolean {
  const q = CONTENT.quarters[quarter]
  const [from, to] = CONTENT.cryptoLoan.available
  return q >= from && q <= to
}

/** Pledged coins' value at this week's price (0 without a loan). */
export function collateralValueUsd(state: GameState, w: MarketWeek): number {
  const loan = state.cryptoLoan
  return loan ? loan.collateral * coinPrice(w, loan.coin) : 0
}

/** Loan-to-value now (0 without a loan). */
export function ltv(state: GameState, w: MarketWeek): number {
  const loan = state.cryptoLoan
  if (!loan) return 0
  const value = collateralValueUsd(state, w)
  return value > 0 ? loan.balanceUsd / value : Infinity
}

/** The most you can borrow against `coin` now: ltv_max × the treasury's coins at the Plan-screen price. */
export function maxCryptoLoanUsd(state: GameState, coin: Coin): number {
  if (!cryptoLoanOffered(state.quarter)) return 0
  const price = coinPrice(marketWeek(state.quarter, 0), coin)
  return Math.floor(CONTENT.cryptoLoan.ltvMax * state.treasury[coin] * price)
}

/** Why this loan can't be taken now, or undefined if it can. Checks, doesn't change anything. */
export function cryptoBorrowBlocker(
  state: GameState,
  coin: Coin,
  amountUsd: number,
): Message | undefined {
  if (state.cryptoLoan) return { key: 'error.crypto_loan_exists' }
  if (!cryptoLoanOffered(state.quarter)) {
    const [from, to] = CONTENT.cryptoLoan.available
    return { key: 'error.crypto_loan_window', params: { from, to } }
  }
  if (coin !== 'BTC' && coin !== 'ETH') return { key: 'error.bad_choice' }
  if (!Number.isInteger(amountUsd) || amountUsd < 1)
    return { key: 'error.bad_amount' }
  if (state.treasury[coin] <= 0)
    return { key: 'error.nothing_to_sell', params: { coin } }
  const maxUsd = maxCryptoLoanUsd(state, coin)
  if (amountUsd > maxUsd) {
    return {
      key: 'error.crypto_loan_too_big',
      params: { maxUsd, ltvPct: CONTENT.cryptoLoan.ltvMax, coin },
    }
  }
  const bw = BALANCE.bandwidth.loan
  if (state.bandwidth < bw) {
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  }
}

/** Coins that must be pledged to borrow `amountUsd` at exactly ltv_max. */
export function collateralNeeded(
  state: GameState,
  coin: Coin,
  amountUsd: number,
): number {
  const price = coinPrice(marketWeek(state.quarter, 0), coin)
  return amountUsd / CONTENT.cryptoLoan.ltvMax / price
}

/** Takes the loan: pledges just enough coins for ltv_max, cash in, Bandwidth spent. Call the blocker first. */
export function takeCryptoLoan(
  state: GameState,
  coin: Coin,
  amountUsd: number,
): void {
  // Never pledge more than the treasury holds (rounding at the maximum).
  const collateral = Math.min(
    state.treasury[coin],
    collateralNeeded(state, coin, amountUsd),
  )
  state.treasury[coin] -= collateral
  state.bandwidth -= BALANCE.bandwidth.loan
  state.cash += amountUsd
  state.cryptoLoan = {
    coin,
    collateral,
    balanceUsd: amountUsd,
    apr: CONTENT.cryptoLoan.apr,
    takenQuarter: state.quarter,
  }
  logEntry(state, 'log.crypto_loan_taken', {
    amountUsd,
    pledged: `${collateral.toFixed(4)} ${coin}`,
    aprPct: CONTENT.cryptoLoan.apr,
  })
}

/** Repays the whole loan and gets the pledged coins back. */
export function repayCryptoLoan(state: GameState): Message | undefined {
  const loan = state.cryptoLoan
  if (!loan) return { key: 'error.no_loan' }
  if (loan.balanceUsd > state.cash) {
    return {
      key: 'error.no_cash',
      params: { costUsd: loan.balanceUsd, cashUsd: state.cash },
    }
  }
  state.cash -= loan.balanceUsd
  state.treasury[loan.coin] += loan.collateral
  logEntry(state, 'log.crypto_loan_repaid', {
    amountUsd: loan.balanceUsd,
    returned: `${loan.collateral.toFixed(4)} ${loan.coin}`,
  })
  state.cryptoLoan = null
}

/** One week's interest, paid in cash. */
export function payCryptoInterestWeek(state: GameState): number {
  const loan = state.cryptoLoan
  if (!loan) return 0
  const interestUsd = roundCents(
    (loan.balanceUsd * loan.apr) / (4 * BALANCE.weeksPerQuarter),
  )
  state.cash -= interestUsd
  return interestUsd
}
