// Company-level debt in Act III (M18.1, M18.2; doc 27 step 7, F-7): facilities secured on the company, not a project.
// - The corporate facility: a card draws it (s0_c2 $10M "as insurance", s0_c4 $20M at −25 bp). Rate = SOFR + the
//   equipment loan's spread for the company's rating + any debt_spread_add + the card's own spread; interest at each
//   quarter end; the principal a bullet 12 quarters after the draw (a facility open at 2030Q4 is carried as debt).
// - The standby liquidity facility (F-7, the S1 hedge; offered in every scenario, so it reveals nothing): arranged in
//   Capital for 1 BW at BB− or better with no payment late; sized at 20% of the valuation (≤ $500M); 1% upfront and
//   0.50% a year on the undrawn part; SOFR + 350 bp locked at arranging; drawable from the next quarter for 8
//   quarters, even while lenders are frozen; each draw a bullet 8 quarters on. Before the quarter-end liquidity path
//   forces a sale or emergency equity, the engine draws it, up to the shortfall.
// Both are `Facility` rows (kinds 'corporate' and 'standby', no project): they count in debt, net debt and valuation
// like other debt, and their interest and bullets go through the quarter-end cash check like other obligations.
import { BALANCE, actFirstQuarter, actLastQuarter } from '../../content/index.ts'
import { book, bookSplit } from '../ledger.ts'
import type { Message } from '../../i18n/t.ts'
import {
  covenantBreached,
  inAct3Rules,
  inActIV,
  logEntry,
  type Facility,
  type GameState,
} from '../state.ts'
import { ratingRank, sofr } from './finance.ts'
import { loanRating, ratingLoanBand } from './loans.ts'
import { scenarioOf } from './market.ts'

const CORP = BALANCE.act3.corporate
const SB = BALANCE.act3.standby

/** A facility secured on the company (corporate or a standby draw), not on a project. */
export function isCompanyFacility(f: Facility): boolean {
  return f.kind === 'corporate' || f.kind === 'standby'
}

function nextFacilityId(state: GameState): string {
  const n = state.facilities.reduce(
    (m, f) => Math.max(m, Number(f.id.split('-')[1]) || 0),
    0,
  )
  return `facility-${n + 1}`
}

/** A corporate facility's yearly rate now, with the card's own spread (basis points). */
export function corporateApr(state: GameState, spreadBps = 0): number {
  return (
    sofr(state.quarter, scenarioOf(state)) +
    ratingLoanBand(loanRating(state)).spread +
    state.events.spreadAddBps / 10_000 +
    spreadBps / 10_000
  )
}

/** A card's corporate facility: its amount into cash now, interest each quarter, a bullet in 12 quarters. */
export function drawCorporate(
  state: GameState,
  amountUsd: number,
  spreadBps: number,
  weekNo?: number,
): void {
  // M18.13: no new debt under a covenant breach; the card's facility isn't offered
  if (covenantBreached(state)) {
    logEntry(state, 'log.covenant_no_debt', {}, weekNo)
    return
  }
  const apr = corporateApr(state, spreadBps)
  const due = state.quarter + CORP.bulletQuarters
  state.facilities.push({
    id: nextFacilityId(state),
    kind: 'corporate',
    projectId: '',
    amountUsd,
    balanceUsd: amountUsd,
    apr,
    tenorQuarters: CORP.bulletQuarters,
    drawnQuarter: state.quarter,
    dueQuarter: due,
    missedQuarters: 0,
    rating: loanRating(state),
  })
  book(state, 'debt_drawn', amountUsd)
  logEntry(
    state,
    'log.corporate_drawn',
    { amountUsd, aprPct: apr, quarter: quarterLabel(state, due) },
    weekNo,
  )
}

/** "2030Q1", or past the act's end "2030Q4+" (a facility carried beyond the act; M27.5: Act IV's end is 2035Q4). */
function quarterLabel(state: GameState, q: number): string {
  const last = inActIV(state) ? actLastQuarter(4) : actFirstQuarter(3) + 15
  return q <= last ? stateQuarterLabel(q) : `${stateQuarterLabel(last)}+`
}
function stateQuarterLabel(q: number): string {
  const n = q - actFirstQuarter(3)
  return `${2027 + Math.floor(n / 4)}Q${(n % 4) + 1}`
}

/** This quarter's interest and (when due) bullet on a company facility. */
export function companyServiceDue(
  f: Facility,
  quarter: number,
): { interestUsd: number; principalUsd: number } {
  return {
    interestUsd: (f.balanceUsd * f.apr) / 4,
    principalUsd:
      f.dueQuarter !== undefined && quarter >= f.dueQuarter ? f.balanceUsd : 0,
  }
}

/**
 * At quarter end: each company facility's interest (and a bullet that's due) comes out of cash, even below zero: the
 * quarter-end liquidity path (the standby, forced sales, the rescue, game over) deals with a shortfall.
 */
export function serviceCompanyFacility(
  state: GameState,
  f: Facility,
): { interestUsd: number; principalUsd: number } {
  const due = companyServiceDue(f, state.quarter)
  bookSplit(state, -(due.interestUsd + due.principalUsd), [
    ['interest', -due.interestUsd],
    ['debt_repaid', -due.principalUsd],
  ])
  f.balanceUsd -= due.principalUsd
  if (due.principalUsd > 0) {
    state.facilities = state.facilities.filter((x) => x !== f)
    logEntry(state, 'log.corporate_due', { amountUsd: due.principalUsd })
  }
  return due
}

/** Why this company facility can't be repaid now, or undefined. */
export function companyRepayBlocker(
  state: GameState,
  facilityId: string,
): Message | undefined {
  const f = state.facilities.find((x) => x.id === facilityId)
  if (!f || !isCompanyFacility(f)) return { key: 'error.unknown_facility' }
  if (state.cash < f.balanceUsd)
    return { key: 'error.no_cash', params: { costUsd: f.balanceUsd, cashUsd: state.cash } }
  return undefined
}

/** Repays a company facility early from cash (0 Bandwidth). */
export function repayCompanyFacility(state: GameState, facilityId: string): void {
  const f = state.facilities.find((x) => x.id === facilityId)!
  book(state, 'debt_repaid', -f.balanceUsd)
  state.facilities = state.facilities.filter((x) => x !== f)
  logEntry(state, 'log.corporate_repaid', { amountUsd: f.balanceUsd, debt: f.kind })
}

// ---------- the standby liquidity facility ----------

/** The standby's terms if arranged now: its size and upfront fee. */
export function standbyTerms(state: GameState): { sizeUsd: number; feeUsd: number } {
  const valuation = Math.max(0, state.reports.at(-1)?.valuationUsd ?? 0)
  const sizeUsd = Math.round(Math.min(SB.capUsd, SB.valuationShare * valuation))
  return { sizeUsd, feeUsd: Math.round(sizeUsd * SB.upfrontFee) }
}

/** The standby that holds now (arranged, not expired), or undefined. */
export function activeStandby(
  state: GameState,
  quarter = state.quarter,
): NonNullable<GameState['act3Standby']> | undefined {
  const s = state.act3Standby
  return s && quarter <= s.untilQuarter ? s : undefined
}

/** What's drawn on the standby now (its draws not yet repaid). */
export function standbyDrawnUsd(state: GameState): number {
  return state.facilities
    .filter((f) => f.kind === 'standby')
    .reduce((a, f) => a + f.balanceUsd, 0)
}

/** What can still be drawn now (0 without a standby, or in its arranging quarter). */
export function standbyUndrawnUsd(state: GameState): number {
  const s = activeStandby(state)
  if (!s || state.quarter <= s.arrangedQuarter) return 0
  return Math.max(0, s.sizeUsd - standbyDrawnUsd(state))
}

/** Why the standby can't be arranged now, or undefined. */
export function standbyArrangeBlocker(state: GameState): Message | undefined {
  if (!inAct3Rules(state) || state.quarter < actFirstQuarter(3))
    return { key: 'error.act3_only' }
  if (activeStandby(state)) return { key: 'error.standby_held' }
  const rating = loanRating(state)
  if (ratingRank(rating) < ratingRank(SB.minRating))
    return { key: 'error.standby_rating', params: { rating: SB.minRating } }
  if (state.facilities.some((f) => f.missedQuarters > 0))
    return { key: 'error.standby_late' }
  if (state.bandwidth < SB.bandwidth)
    return { key: 'error.no_bandwidth', params: { needed: SB.bandwidth, have: state.bandwidth } }
  const { sizeUsd, feeUsd } = standbyTerms(state)
  if (sizeUsd <= 0) return { key: 'error.standby_rating', params: { rating: SB.minRating } }
  if (state.cash < feeUsd)
    return { key: 'error.no_cash', params: { costUsd: feeUsd, cashUsd: state.cash } }
  return undefined
}

/** Arranges the standby (assumes the blocker passed): the fee now, drawable from next quarter for 8 quarters. */
export function arrangeStandby(state: GameState): void {
  const { sizeUsd, feeUsd } = standbyTerms(state)
  state.bandwidth -= SB.bandwidth
  book(state, 'finance_fees', -feeUsd)
  state.act3Standby = {
    arrangedQuarter: state.quarter,
    sizeUsd,
    spreadBps: SB.spreadBps,
    untilQuarter: state.quarter + SB.availableQuarters,
  }
  logEntry(state, 'log.standby_arranged', {
    sizeUsd,
    feeUsd,
    quarter: stateQuarterLabel(state.quarter + SB.availableQuarters),
  })
}

/** Why `amountUsd` can't be drawn now, or undefined. */
export function standbyDrawBlocker(
  state: GameState,
  amountUsd: number,
): Message | undefined {
  const s = activeStandby(state)
  if (!s) return { key: 'error.standby_none' }
  if (state.quarter <= s.arrangedQuarter) return { key: 'error.standby_next_quarter' }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return { key: 'error.bad_amount' }
  const undrawn = standbyUndrawnUsd(state)
  if (amountUsd > undrawn + 0.5)
    return { key: 'error.standby_too_much', params: { amountUsd: undrawn } }
  return undefined
}

/** Draws on the standby (assumes the blocker passed): cash in, a bullet 8 quarters on at SOFR + the locked spread. */
export function drawStandby(state: GameState, amountUsd: number, auto = false): void {
  const s = activeStandby(state)!
  const apr = sofr(state.quarter, scenarioOf(state)) + s.spreadBps / 10_000
  state.facilities.push({
    id: nextFacilityId(state),
    kind: 'standby',
    projectId: '',
    amountUsd,
    balanceUsd: amountUsd,
    apr,
    tenorQuarters: SB.drawBulletQuarters,
    drawnQuarter: state.quarter,
    dueQuarter: state.quarter + SB.drawBulletQuarters,
    missedQuarters: 0,
    rating: loanRating(state),
  })
  book(state, 'debt_drawn', amountUsd)
  logEntry(state, auto ? 'log.standby_auto_drawn' : 'log.standby_drawn', { amountUsd })
}

/**
 * At quarter end, before the cash check: the commitment fee on the undrawn part; then, if the cash is short, the
 * standby is drawn up to the shortfall (before any forced sale or emergency equity); at the end of its last quarter it
 * expires (its draws stay until their bullets).
 */
export function settleStandbyFee(state: GameState): number {
  const s = activeStandby(state)
  if (!s) return 0
  const undrawn =
    state.quarter < s.arrangedQuarter ? 0 : Math.max(0, s.sizeUsd - standbyDrawnUsd(state))
  const feeUsd = (undrawn * SB.commitmentFeeYr) / 4
  book(state, 'finance_fees', -feeUsd)
  return feeUsd
}

export function autoDrawStandby(state: GameState): void {
  if (state.cash >= 0) return
  const amountUsd = Math.min(standbyUndrawnUsd(state), -state.cash)
  if (amountUsd > 0) drawStandby(state, amountUsd, true)
}

export function expireStandby(state: GameState): void {
  const s = state.act3Standby
  if (s && state.quarter >= s.untilQuarter) {
    delete state.act3Standby
    logEntry(state, 'log.standby_expired')
  }
}
