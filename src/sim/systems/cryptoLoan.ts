// The crypto-backed loan (capital.json loans.game_crypto_loan): pledge coins from the
// treasury and borrow up to ltv_max of their value. Interest is paid weekly; the loan
// itself is repaid whenever you like (no fixed term). One at a time.
// LTV (loan-to-value) = what you owe ÷ what the pledged coins are worth now.
import {
  BALANCE,
  CONTENT,
  isActIIQuarter,
  type MarketWeek,
} from '../../content/index.ts'
import { debtFrozen } from './eventEffects.ts'
import { marginWarningAlert } from './hires.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type Coin, type GameState } from '../state.ts'
import { removeMachines, saleValueUsd } from './machines.ts'
import { coinPrice, marketWeek } from './market.ts'
import { cryptoLoanCapUsd } from './liquidity.ts'

/**
 * Whether lenders offer crypto-backed loans in a quarter: Act I's window (capital.json), and in Act
 * II again from 2023Q3 (scope 0.2 §2.7: unavailable 2022Q4–2023Q2 after FTX), on Act I's terms.
 */
export function cryptoLoanOffered(quarter: number): boolean {
  const q = CONTENT.quarters[quarter]
  const [from, to] = CONTENT.cryptoLoan.available
  if (isActIIQuarter(quarter)) return q >= BALANCE.act2CryptoLoansFrom
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
  // Act I's liquidity brake (P5.0, P1): at most 4 weeks of the year's sell cap, for every game.
  return Math.floor(
    Math.min(
      CONTENT.cryptoLoan.ltvMax * state.treasury[coin] * price,
      cryptoLoanCapUsd(state.quarter),
    ),
  )
}

/** Why this loan can't be taken now, or undefined if it can. Checks, doesn't change anything. */
export function cryptoBorrowBlocker(
  state: GameState,
  coin: Coin,
  amountUsd: number,
): Message | undefined {
  if (state.cryptoLoan) return { key: 'error.crypto_loan_exists' }
  const locked = loansLocked(state)
  if (locked) return locked
  if (!cryptoLoanOffered(state.quarter)) {
    const [from, to] = CONTENT.cryptoLoan.available
    return { key: 'error.crypto_loan_window', params: { from, to } }
  }
  if (debtFrozen(state)) return { key: 'error.debt_frozen' }
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

// ---------- margin calls and liquidation ----------

/** Dollars to pay down so the loan is back to ltv_max against the pledged coins' value now. */
function loanGapUsd(state: GameState, w: MarketWeek): number {
  const loan = state.cryptoLoan!
  return Math.max(
    0,
    loan.balanceUsd - CONTENT.cryptoLoan.ltvMax * collateralValueUsd(state, w),
  )
}

/** More coins to pledge so the loan is back to ltv_max. */
function coinsToPost(state: GameState, w: MarketWeek): number {
  const loan = state.cryptoLoan!
  const price = coinPrice(w, loan.coin)
  return Math.max(
    0,
    loan.balanceUsd / CONTENT.cryptoLoan.ltvMax / price - loan.collateral,
  )
}

/** What each margin-call answer would do now; null = not possible. For the card and for rules. */
export function marginCallOptions(state: GameState) {
  const active = state.interrupt
  const loan = state.cryptoLoan
  if (!active || active.id !== 'margin_call' || !loan) return null
  const w = marketWeek(state.quarter, active.week)
  const gapUsd = loanGapUsd(state, w)
  const coins = coinsToPost(state, w)
  const machinesUsd = state.machines.reduce(
    (sum, lot) => sum + saleValueUsd(lot, lot.count, state.quarter),
    0,
  )
  return {
    gapUsd,
    post: state.treasury[loan.coin] >= coins ? { coins } : null,
    payCash: state.cash >= gapUsd ? { usd: gapUsd } : null,
    sellMachines: machinesUsd >= gapUsd ? { usd: gapUsd } : null,
    default: {
      coins: loan.collateral,
      valueUsd: collateralValueUsd(state, w),
      balanceUsd: loan.balanceUsd,
    },
  }
}

/** Choice ids a margin call offers right now (only the ones that can be paid for). */
export function marginCallChoices(state: GameState): string[] {
  const o = marginCallOptions(state)
  if (!o) return []
  return [
    o.post && 'post',
    o.payCash && 'pay_cash',
    o.sellMachines && 'sell_machines',
    'default',
  ].filter((c): c is string => !!c)
}

/**
 * Weekly check after money moves: at liquidation_ltv the lender sells the pledged coins
 * to repay the loan; at margin_call_ltv it pauses the quarter with a margin call. A
 * warning is logged the week LTV first reaches the warning level.
 */
export function checkMarginCall(
  state: GameState,
  w: MarketWeek,
  prev: MarketWeek | undefined,
): void {
  const loan = state.cryptoLoan
  if (!loan || state.interrupt) return
  const terms = marginLevels(state)
  const now = ltv(state, w)
  const weekNo = state.week + 1
  if (now >= terms.liquidationLtv) {
    liquidate(state, w)
    return
  }
  if (now >= terms.marginCallLtv) {
    const change = prev
      ? coinPrice(w, loan.coin) / coinPrice(prev, loan.coin) - 1
      : 0
    state.interrupt = {
      id: 'margin_call',
      week: state.week,
      coin: loan.coin,
      changePct: change,
      ltv: now,
    }
    state.quarterStats.marginCalls++
    return
  }
  const before = prev
    ? loan.balanceUsd / (loan.collateral * coinPrice(prev, loan.coin))
    : 0
  if (
    now >= BALANCE.cryptoLoan.warningLtv &&
    before < BALANCE.cryptoLoan.warningLtv
  ) {
    logEntry(state, 'log.ltv_warning', { coin: loan.coin, ltvPct: now }, weekNo)
    if (marginWarningAlert(state)) {
      // Trader on staff: pause the quarter (not counted toward the 3 interrupts).
      state.interrupt = {
        id: 'margin_warning',
        week: state.week,
        coin: loan.coin,
        changePct: prev
          ? coinPrice(w, loan.coin) / coinPrice(prev, loan.coin) - 1
          : 0,
        ltv: now,
      }
    }
  }
}

/**
 * Margin-call and liquidation LTVs now: the loan's terms, or tighter ones for the rest of a
 * quarter after an event card (luna "ride it out").
 */
export function marginLevels(state: GameState): {
  marginCallLtv: number
  liquidationLtv: number
} {
  const stress = state.events.marginStress
  if (stress && stress.quarter === state.quarter)
    return {
      marginCallLtv: stress.callLtv,
      liquidationLtv: stress.liquidationLtv,
    }
  return CONTENT.cryptoLoan
}

/** The lender sells enough pledged coins to repay the loan; the rest come back. A shortfall comes out of cash. */
function liquidate(state: GameState, w: MarketWeek): void {
  const loan = state.cryptoLoan!
  const price = coinPrice(w, loan.coin)
  const sold = Math.min(loan.collateral, loan.balanceUsd / price)
  const shortfallUsd = Math.max(0, loan.balanceUsd - sold * price)
  state.treasury[loan.coin] += loan.collateral - sold
  state.cash -= shortfallUsd
  logEntry(
    state,
    'log.liquidated',
    {
      coin: loan.coin,
      sold: `${sold.toFixed(4)} ${loan.coin}`,
      valueUsd: sold * price,
      returned: `${(loan.collateral - sold).toFixed(4)} ${loan.coin}`,
    },
    state.week + 1,
  )
  state.cryptoLoan = null
}

/** Quarters without any loan after defaulting (interrupts.json margin_call › default › loans_locked_quarters). */
export function defaultLockQuarters(): number {
  const choice = CONTENT.interrupts.byId.margin_call?.choices?.find(
    (c) => c.id === 'default',
  )
  return Number(choice?.effects?.loans_locked_quarters ?? 0)
}

/** Why no loan can be taken now (after a default), or undefined. */
export function loansLocked(state: GameState): Message | undefined {
  if (
    state.loansLockedUntil !== null &&
    state.quarter < state.loansLockedUntil
  ) {
    return {
      key: 'error.loans_locked',
      params: { quarter: CONTENT.quarters[state.loansLockedUntil] ?? '—' },
    }
  }
}

/** Applies the player's answer to a margin call. */
export function resolveMarginCall(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  const o = marginCallOptions(state)
  if (!o || !marginCallChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const loan = state.cryptoLoan!
  const w = marketWeek(state.quarter, active.week)
  const weekNo = active.week + 1
  switch (choiceId) {
    case 'post':
      state.treasury[loan.coin] -= o.post!.coins
      loan.collateral += o.post!.coins
      logEntry(
        state,
        'log.margin_posted',
        { posted: `${o.post!.coins.toFixed(4)} ${loan.coin}` },
        weekNo,
      )
      break
    case 'pay_cash':
      state.cash -= o.gapUsd
      loan.balanceUsd = roundCents(loan.balanceUsd - o.gapUsd)
      logEntry(state, 'log.margin_paid', { valueUsd: o.gapUsd }, weekNo)
      break
    case 'sell_machines': {
      // Oldest batch first, one unit at a time, until the gap is covered.
      let raisedUsd = 0
      let units = 0
      while (raisedUsd < o.gapUsd && state.machines.length > 0) {
        raisedUsd += removeMachines(state, state.machines[0], 1)
        units++
      }
      const repaidUsd = Math.min(raisedUsd, loan.balanceUsd)
      loan.balanceUsd = roundCents(loan.balanceUsd - repaidUsd)
      state.cash += raisedUsd - repaidUsd
      logEntry(
        state,
        'log.margin_sold_machines',
        { units, valueUsd: raisedUsd },
        weekNo,
      )
      break
    }
    case 'default':
      logEntry(
        state,
        'log.margin_default',
        {
          seized: `${loan.collateral.toFixed(4)} ${loan.coin}`,
          valueUsd: collateralValueUsd(state, w),
          balanceUsd: loan.balanceUsd,
          quarters: defaultLockQuarters(),
        },
        weekNo,
      )
      state.cryptoLoan = null
      state.loansLockedUntil = state.quarter + defaultLockQuarters()
      break
  }
  if (state.cryptoLoan && state.cryptoLoan.balanceUsd <= 0)
    state.cryptoLoan = null
  state.interrupt = null
}
