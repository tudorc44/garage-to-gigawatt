// The distressed lifeline (Act II entry, scope 0.2 §2.10; doc 18 §2.2; event card ec03). A company
// below the floor at the act boundary (under 20 MW energized and under $5M cash) is offered a
// bankrupt miner's 20 MW site for $6.5M, bought with a bridge loan at 14% for 12 quarters, sized so
// its cash also reaches $5M. The card's default is to take it; the player can pass. The bridge
// pays interest every week; interest only for its first 4 quarters (owner, M7.0 answer A5), then
// equal principal at the end of each remaining quarter.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { logQuarterLabel } from '../state.ts'
import { recalcHeat } from './heat.ts'
import { addSite } from './siteSerials.ts'
import { getTier, poweredKw } from './sites.ts'

const L = () => CONTENT.lifeline

/** Energized kW across the company's sites now. */
export function energizedKwNow(state: GameState): number {
  return state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0)
}

/**
 * Below the floor: under 20 MW energized and under $5M cash (owner, 28 Sep 2026: both; a cash-short
 * company at 20 MW or more uses the normal capital tools).
 */
export function belowFloor(state: GameState): boolean {
  return (
    energizedKwNow(state) < BALANCE.lifeline.floorKw &&
    state.cash < L().cashFloorUsd
  )
}

/** At the act boundary (after the head start): a company below the floor is offered the lifeline. */
export function offerLifeline(state: GameState): void {
  if (!state.act2Entry || !belowFloor(state)) return
  state.act2Entry.lifeline = 'offered'
  logEntry(state, 'log.lifeline_offered', {
    siteKw: L().siteKw,
    priceUsd: L().priceUsd,
  })
}

/** The lifeline's terms now: the site's price and the bridge that pays for it and tops cash up. */
export function lifelineTerms(state: GameState) {
  const loanUsd = L().priceUsd + Math.max(0, L().cashFloorUsd - state.cash)
  return {
    siteKw: L().siteKw,
    priceUsd: L().priceUsd,
    loanUsd,
    apr: L().apr,
    tenorQuarters: BALANCE.lifeline.bridgeTenorQuarters,
    cashAfterUsd: state.cash + loanUsd - L().priceUsd,
  }
}

/**
 * Takes the lifeline (as Act II begins): the site, energized from the first Act II quarter, and the
 * bridge loan, paid off by the end of its 12th quarter.
 */
export function takeLifeline(state: GameState): void {
  const terms = lifelineTerms(state)
  const tier = getTier(BALANCE.lifeline.siteTier)!
  const first = CONTENT.acts[1].firstQuarter
  const site: Site = {
    id: `site-${state.nextId++}`,
    tier: tier.id,
    readyQuarter: first,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    region: BALANCE.lifeline.region,
  }
  addSite(state, site)
  recalcHeat(state, site)
  state.cash += terms.loanUsd - terms.priceUsd
  state.bridgeLoan = {
    amountUsd: terms.loanUsd,
    balanceUsd: terms.loanUsd,
    apr: terms.apr,
    takenQuarter: first,
    dueQuarter: first + terms.tenorQuarters - 1,
  }
  state.act2Entry!.lifeline = 'taken'
  logEntry(state, 'log.lifeline_taken', {
    siteKw: terms.siteKw,
    priceUsd: terms.priceUsd,
    loanUsd: terms.loanUsd,
    aprPct: terms.apr,
    quarter: logQuarterLabel(state, state.bridgeLoan.dueQuarter),
  })
}

/**
 * One week of the bridge: interest on the balance; in the last week of each quarter after the
 * interest-only ones, an equal slice of the principal (all of what's left in its last quarter).
 */
export function payBridgeWeek(state: GameState): {
  interestUsd: number
  principalUsd: number
} {
  const loan = state.bridgeLoan
  if (!loan) return { interestUsd: 0, principalUsd: 0 }
  const interestUsd = roundCents(
    (loan.balanceUsd * loan.apr) / (4 * BALANCE.weeksPerQuarter),
  )
  const lastWeek = state.week === BALANCE.weeksPerQuarter - 1
  const amortizing =
    state.quarter >= loan.takenQuarter + BALANCE.lifeline.bridgeInterestOnlyQuarters
  const slices =
    loan.dueQuarter - loan.takenQuarter + 1 -
    BALANCE.lifeline.bridgeInterestOnlyQuarters
  const principalUsd = !lastWeek
    ? 0
    : state.quarter >= loan.dueQuarter
      ? loan.balanceUsd
      : amortizing
        ? Math.min(loan.balanceUsd, roundCents(loan.amountUsd / slices))
        : 0
  state.cash -= interestUsd + principalUsd
  loan.balanceUsd = roundCents(loan.balanceUsd - principalUsd)
  const due = loan.balanceUsd <= 0.005
  if (due) {
    state.bridgeLoan = null
    logEntry(
      state,
      'log.bridge_repaid',
      { amountUsd: principalUsd },
      state.week + 1,
    )
  }
  return { interestUsd, principalUsd }
}

/** What the bridge costs in one quarter: its weekly interest, and the principal slice paid in the quarter's last week. */
export interface BridgeQuarter {
  quarter: number
  interestUsd: number
  principalUsd: number
  totalUsd: number
  /** Interest only, equal repayments, or the last quarter (everything left). */
  phase: 'interest_only' | 'amortising' | 'final'
}

/**
 * The bridge's payments as the player should see them (M8.7f, read-only): this quarter's and next
 * quarter's, whether each is interest-only or amortising, and the quarters left. It works out the
 * same sums payBridgeWeek pays (a test plays the weeks and compares), without touching the state.
 * null without a bridge.
 */
export function bridgeSchedule(state: GameState) {
  const loan = state.bridgeLoan
  if (!loan) return null
  const weeks = BALANCE.weeksPerQuarter
  const interestOnly = BALANCE.lifeline.bridgeInterestOnlyQuarters
  const slices = loan.dueQuarter - loan.takenQuarter + 1 - interestOnly
  const inQuarter = (quarter: number, balanceUsd: number): BridgeQuarter => {
    const interestUsd =
      weeks * roundCents((balanceUsd * loan.apr) / (4 * weeks))
    const last = quarter >= loan.dueQuarter
    const amortising = quarter >= loan.takenQuarter + interestOnly
    const principalUsd = last
      ? balanceUsd
      : amortising
        ? Math.min(balanceUsd, roundCents(loan.amountUsd / slices))
        : 0
    return {
      quarter,
      interestUsd,
      principalUsd,
      totalUsd: interestUsd + principalUsd,
      phase: last ? 'final' : amortising ? 'amortising' : 'interest_only',
    }
  }
  const now = inQuarter(state.quarter, loan.balanceUsd)
  const next =
    state.quarter < loan.dueQuarter
      ? inQuarter(
          state.quarter + 1,
          roundCents(loan.balanceUsd - now.principalUsd),
        )
      : null
  return {
    balanceUsd: loan.balanceUsd,
    apr: loan.apr,
    dueQuarter: loan.dueQuarter,
    /** Including this one. */
    quartersLeft: loan.dueQuarter - state.quarter + 1,
    /** Interest-only quarters still to come after this one (0 once amortising). */
    interestOnlyAfterThis: Math.max(
      0,
      loan.takenQuarter + interestOnly - state.quarter - 1,
    ),
    now,
    next,
  }
}

/** Pays the bridge off early, in the Plan phase (no penalty). */
export function repayBridgeLoan(state: GameState): Message | undefined {
  const loan = state.bridgeLoan
  if (!loan) return { key: 'error.no_loan' }
  if (loan.balanceUsd > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: loan.balanceUsd, cashUsd: state.cash },
    }
  state.cash -= loan.balanceUsd
  logEntry(state, 'log.bridge_repaid', { amountUsd: loan.balanceUsd })
  state.bridgeLoan = null
  return undefined
}
