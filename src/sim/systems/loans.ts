// Loans. The equipment loan (capital.json loans.equipment): borrow up to a share (LTV) of
// what your machines would sell for, one loan at a time, repaid over the era's term in
// equal weekly slices of principal plus interest on what's still owed. In Act II its terms
// come from the credit rating (balance.ts › finance.equipmentLoan).
import { BALANCE, CONTENT, isAct2RulesQuarter } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  logEntry,
  roundCents,
  type EquipmentLoan,
  type GameState,
} from '../state.ts'
import { loansLocked } from './cryptoLoan.ts'
import { debtFrozen } from './eventEffects.ts'
import { ratingRank, sofr } from './finance.ts'
import { spreadCut } from './hires.ts'
import { saleValueUsd } from './machines.ts'
import { payBridgeWeek } from './lifeline.ts'
import { scenarioOf } from './market.ts'
import { gpuResidualUsd } from './projects.ts'
import { ratingInputs } from './rating.ts'

/** An equipment loan offer: LTV and yearly rate (fractions), the term, and in Act II the rating it's priced on. */
export interface LoanTerms {
  ltv: number
  apr: number
  tenorQuarters: number
  rating?: string
}

/** Act I: the era's terms that quarter (capital.json), or undefined if lenders aren't offering any. */
function eraTerms(quarter: number): LoanTerms | undefined {
  const q = CONTENT.quarters[quarter]
  const year = Number(q.slice(0, 4))
  const terms = CONTENT.equipmentLoans.find(
    (e) => e.fromYear <= year && year <= e.toYear,
  )
  if (!terms || (terms.availableUntil && q > terms.availableUntil)) return
  return terms
}

/**
 * The rating an Act II loan is priced on: the last quarter end's. Before the first Act II quarter
 * end it's the one the last report would give (mine, reversible), CCC− with no report at all.
 */
export function loanRating(state: GameState): string {
  if (state.creditRating !== null) return state.creditRating
  const report = state.reports.at(-1)
  return report
    ? ratingInputs(state, report).rating
    : CONTENT.finance.rating.min
}

/** The Act II equipment loan's band for a rating (owner decision on the M4 questions). */
export function ratingLoanBand(rating: string) {
  const bands = BALANCE.finance.equipmentLoan.bands
  return (
    bands.find((b) => ratingRank(rating) >= ratingRank(b.from)) ?? bands.at(-1)!
  )
}

/**
 * The equipment loan terms now, or undefined if lenders aren't offering any. Act I: the era's
 * (capital.json). Act II: always offered (scope 0.2 §2.7), at SOFR + the rating band's spread, up to
 * its LTV, for 8 quarters.
 */
export function equipmentTerms(state: GameState): LoanTerms | undefined {
  if (!isAct2RulesQuarter(state.quarter)) return eraTerms(state.quarter)
  const rating = loanRating(state)
  const band = ratingLoanBand(rating)
  return {
    ltv: band.ltv,
    // The Capital Markets Lead cuts the spread (M5.7); a card can widen it (DDTL widening, M5.8).
    apr:
      sofr(state.quarter, scenarioOf(state)) +
      Math.max(0, band.spread - spreadCut(state)) +
      state.events.spreadAddBps / 10_000,
    tenorQuarters: BALANCE.finance.equipmentLoan.tenorQuarters,
    rating,
  }
}

/**
 * The loan's collateral: what every machine you own would sell for today, plus in Act II the
 * delivered GPUs of live clouds and pilots at their resale value (scope 0.2 §2.7: "now also
 * secured on GPUs"), except GPUs already pledged to a DDTL (mine, reversible).
 */
export function collateralUsd(state: GameState): number {
  const machines = state.machines.reduce(
    (sum, lot) =>
      sum + saleValueUsd(lot, lot.count, state.quarter, scenarioOf(state)),
    0,
  )
  const pledged = new Set(
    (state.facilities ?? [])
      .filter((f) => f.kind === 'ddtl')
      .map((f) => f.projectId),
  )
  const gpus = (state.projects ?? [])
    .filter((p) => !pledged.has(p.id))
    .reduce((sum, p) => sum + gpuResidualUsd(p, state.quarter), 0)
  return machines + gpus
}

/** The most you can borrow now: LTV × collateral, in whole dollars. 0 if no terms. */
export function maxEquipmentLoanUsd(state: GameState): number {
  const terms = equipmentTerms(state)
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
  if (debtFrozen(state)) return { key: 'error.debt_frozen' }
  const terms = equipmentTerms(state)
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
  const terms = equipmentTerms(state)!
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

/** One week's loan payments (equipment and construction): interest plus a slice of principal. */
export function payLoanWeek(state: GameState): {
  interestUsd: number
  principalUsd: number
} {
  const total = { interestUsd: 0, principalUsd: 0 }
  const add = (x: { interestUsd: number; principalUsd: number }) => {
    total.interestUsd += x.interestUsd
    total.principalUsd += x.principalUsd
  }
  if (state.equipmentLoan) {
    const x = payOneWeek(state, state.equipmentLoan)
    add(x)
    if (x.paidOff) {
      state.equipmentLoan = null
      logEntry(state, 'log.loan_paid_off', {}, state.week + 1)
    }
  }
  for (const loan of [...state.constructionLoans]) {
    const x = payOneWeek(state, loan)
    add(x)
    if (x.paidOff) {
      state.constructionLoans = state.constructionLoans.filter(
        (l) => l !== loan,
      )
      logEntry(state, 'log.construction_loan_paid_off', {}, state.week + 1)
    }
  }
  add(payBridgeWeek(state))
  return total
}

function payOneWeek(
  state: GameState,
  loan: EquipmentLoan,
): { interestUsd: number; principalUsd: number; paidOff: boolean } {
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
  return { interestUsd, principalUsd, paidOff: loan.balanceUsd <= 0 }
}

/** Everything still owed on loans (equipment, construction, bridge, crypto-backed and Act II project debt). */
export function debtUsd(state: GameState): number {
  return (
    (state.equipmentLoan?.balanceUsd ?? 0) +
    state.constructionLoans.reduce((sum, l) => sum + l.balanceUsd, 0) +
    (state.bridgeLoan?.balanceUsd ?? 0) +
    (state.cryptoLoan?.balanceUsd ?? 0) +
    (state.facilities ?? []).reduce((sum, f) => sum + f.balanceUsd, 0)
  )
}
