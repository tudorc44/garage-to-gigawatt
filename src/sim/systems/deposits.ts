// M79.1 (doc 62 v1.0 §1): the security deposit of a self-funded Texas phase 1. Held cash (not spendable, counted in the company's
// value), returned at the end of the fourth quarter the site has been energized, or applied to the bill when cash runs out (the
// clock then starts again). Nothing here runs, and no state is written, in a game that never self-funds Texas.
import { BALANCE } from '../../content/index.ts'
import { book, roundCash } from '../ledger.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { scenarioOf } from './market.ts'
import { getTier, normalPriceUsdKwh } from './sites.ts'
import { siteParams } from './siteSerials.ts'

/** The tier's self-funding rules (sites.json › phases.self_fund), if it has them. */
export const selfFundRules = (tier: string) => getTier(tier)?.phases?.self_fund

/**
 * The deposit for phase 1 at the contract price chosen: `deposit_quarters` of the power bill of the phase's kW running all
 * hours, at the site's normal price for that contract type.
 */
export function texasDepositUsd(
  state: GameState,
  tier: string,
  powerPriceMult: number,
  contractType: 'fixed' | 'index',
): number {
  const rules = getTier(tier)!.phases!
  const f = rules.self_fund!
  const probe: Site = { id: 'probe', tier, readyQuarter: 0, rentUsdQ: 0, powerPriceMult, flaw: null }
  const price = normalPriceUsdKwh(probe, state.quarter, contractType, scenarioOf(state))
  return Math.round(f.deposit_quarters * rules.kw * 24 * 7 * BALANCE.weeksPerQuarter * price)
}

/** Cash held as deposits across your sites. */
export const depositsHeldUsd = (state: GameState): number => state.sites.reduce((n, s) => n + (s.deposit?.usd ?? 0), 0)

/** The quarter (end of it) a deposit comes back: the last of the `return_after_quarters` the site has been energized. */
export const depositReturnQuarter = (tier: string, readyQuarter: number): number =>
  readyQuarter + selfFundRules(tier)!.return_after_quarters - 1

/** Returns a site's deposit to cash (a site left behind, or the clean four quarters done). */
export function releaseDeposit(state: GameState, site: Site): void {
  const d = site.deposit
  if (!d) return
  book(state, 'prepayments', d.usd, { site: site.id })
  roundCash(state)
  logEntry(state, 'log.deposit_returned', { ...siteParams(site), amountUsd: d.usd })
  delete site.deposit
}

/** At a quarter's end: deposits whose site has run its clean quarters come back. */
export function endQuarterDeposits(state: GameState): void {
  for (const site of state.sites)
    if (site.deposit && state.quarter >= site.deposit.returnQuarter) releaseDeposit(state, site)
}

/** After each week's bills: if cash ran out, deposits are applied to the shortfall (and each one's clock starts again). */
export function applyDepositShortfall(state: GameState, weekNo: number): void {
  if (state.cash >= 0) return
  for (const site of state.sites) {
    const d = site.deposit
    if (!d || state.cash >= 0) continue
    const use = Math.min(d.usd, roundCents(-state.cash))
    book(state, 'prepayments', use, { site: site.id })
    roundCash(state)
    d.usd = roundCents(d.usd - use)
    // (the clean quarters start again from now, never sooner than they would have)
    d.returnQuarter = Math.max(d.returnQuarter, state.quarter + selfFundRules(site.tier)!.return_after_quarters)
    logEntry(state, 'log.deposit_applied', { ...siteParams(site), amountUsd: use }, weekNo)
    if (d.usd <= 0) delete site.deposit
  }
}
