// The distressed lifeline (Act II entry, scope 0.2 §2.10; doc 18 §2.2; event card ec03). A company
// below the floor at the act boundary (under 20 MW energized and under $5M cash) is offered a
// bankrupt miner's 20 MW site for $6.5M, bought with a bridge loan at 14% for 8 quarters, sized so
// its cash also reaches $5M. The card's default is to take it; the player can pass. The bridge
// pays interest every week and its principal at the end of its last quarter.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { recalcHeat } from './heat.ts'
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
    tenorQuarters: L().tenorQuarters,
    cashAfterUsd: state.cash + loanUsd - L().priceUsd,
  }
}

/**
 * Takes the lifeline (as Act II begins): the site, energized from the first Act II quarter, and the
 * bridge loan, due at the end of its 8th quarter.
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
  state.sites.push(site)
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
    quarter: CONTENT.quarters[state.bridgeLoan.dueQuarter] ?? '—',
  })
}

/** One week of the bridge: interest on the balance; in the last week of its due quarter, the principal. */
export function payBridgeWeek(state: GameState): {
  interestUsd: number
  principalUsd: number
} {
  const loan = state.bridgeLoan
  if (!loan) return { interestUsd: 0, principalUsd: 0 }
  const interestUsd = roundCents(
    (loan.balanceUsd * loan.apr) / (4 * BALANCE.weeksPerQuarter),
  )
  const due =
    state.quarter >= loan.dueQuarter &&
    state.week === BALANCE.weeksPerQuarter - 1
  const principalUsd = due ? loan.balanceUsd : 0
  state.cash -= interestUsd + principalUsd
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
