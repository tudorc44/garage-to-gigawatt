// Loans. The equipment loan (capital.json loans.equipment): borrow up to a share (LTV) of
// what your machines would sell for, one loan at a time, repaid over the era's term in
// equal weekly slices of principal plus interest on what's still owed.
import {
  BALANCE,
  CONTENT,
  type EquipmentLoanTerms,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState } from '../state.ts'
import { loansLocked } from './cryptoLoan.ts'
import { saleValueUsd } from './machines.ts'

/** This quarter's equipment loan terms, or undefined if lenders aren't offering any. */
export function equipmentTerms(
  quarter: number,
): EquipmentLoanTerms | undefined {
  const q = CONTENT.quarters[quarter]
  const year = Number(q.slice(0, 4))
  const terms = CONTENT.equipmentLoans.find(
    (e) => e.fromYear <= year && year <= e.toYear,
  )
  if (!terms || (terms.availableUntil && q > terms.availableUntil)) return
  return terms
}

/** What every machine you own would sell for today (the loan's collateral). */
export function collateralUsd(state: GameState): number {
  return state.machines.reduce(
    (sum, lot) => sum + saleValueUsd(lot, lot.count, state.quarter),
    0,
  )
}

/** The most you can borrow now: LTV × collateral, in whole dollars. 0 if no terms. */
export function maxEquipmentLoanUsd(state: GameState): number {
  const terms = equipmentTerms(state.quarter)
  return terms ? Math.floor(terms.ltv * collateralUsd(state)) : 0
}

/** Why this loan can't be taken now, or undefined if it can. Checks, doesn't change anything. */
export function borrowBlocker(
  state: GameState,
  amountUsd: number,
): Message | undefined {
  if (state.equipmentLoan) return { key: 'error.loan_exists' }
  const locked = loansLocked(state)
  if (locked) return locked
  const terms = equipmentTerms(state.quarter)
  if (!terms) return { key: 'error.loan_not_offered' }
  if (!Number.isInteger(amountUsd) || amountUsd < 1)
    return { key: 'error.bad_amount' }
  const maxUsd = maxEquipmentLoanUsd(state)
  if (maxUsd < 1) return { key: 'error.loan_no_collateral' }
  if (amountUsd > maxUsd) {
    return {
      key: 'error.loan_too_big',
      params: { maxUsd, ltvPct: terms.ltv },
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

/** Takes the loan: cash in, Bandwidth spent. Call borrowBlocker first. */
export function takeEquipmentLoan(state: GameState, amountUsd: number): void {
  const terms = equipmentTerms(state.quarter)!
  state.bandwidth -= BALANCE.bandwidth.loan
  state.cash += amountUsd
  state.equipmentLoan = {
    amountUsd,
    balanceUsd: amountUsd,
    apr: terms.apr,
    weeklyPrincipalUsd: roundCents(
      amountUsd / (terms.tenorQuarters * BALANCE.weeksPerQuarter),
    ),
    weeksLeft: terms.tenorQuarters * BALANCE.weeksPerQuarter,
    takenQuarter: state.quarter,
  }
  logEntry(state, 'log.loan_taken', {
    amountUsd,
    aprPct: terms.apr,
    quarters: terms.tenorQuarters,
  })
}

/** Pays the whole balance early (no penalty). */
export function repayEquipmentLoan(state: GameState): Message | undefined {
  const loan = state.equipmentLoan
  if (!loan) return { key: 'error.no_loan' }
  if (loan.balanceUsd > state.cash) {
    return {
      key: 'error.no_cash',
      params: { costUsd: loan.balanceUsd, cashUsd: state.cash },
    }
  }
  state.cash -= loan.balanceUsd
  logEntry(state, 'log.loan_repaid', { amountUsd: loan.balanceUsd })
  state.equipmentLoan = null
}

/** One week's loan payment: interest on what's owed plus a slice of principal. */
export function payLoanWeek(state: GameState): {
  interestUsd: number
  principalUsd: number
} {
  const loan = state.equipmentLoan
  if (!loan) return { interestUsd: 0, principalUsd: 0 }
  const interestUsd = roundCents(
    (loan.balanceUsd * loan.apr) / (4 * BALANCE.weeksPerQuarter),
  )
  const principalUsd =
    loan.weeksLeft <= 1
      ? loan.balanceUsd
      : Math.min(loan.weeklyPrincipalUsd, loan.balanceUsd)
  loan.balanceUsd = roundCents(loan.balanceUsd - principalUsd)
  loan.weeksLeft--
  state.cash -= interestUsd + principalUsd
  if (loan.balanceUsd <= 0) {
    state.equipmentLoan = null
    logEntry(state, 'log.loan_paid_off', {}, state.week + 1)
  }
  return { interestUsd, principalUsd }
}

/** Everything still owed on loans (equipment and crypto-backed). */
export function debtUsd(state: GameState): number {
  return (
    (state.equipmentLoan?.balanceUsd ?? 0) + (state.cryptoLoan?.balanceUsd ?? 0)
  )
}
