// Power contracts (design thread, 26 Sep 2026): every site except the garage buys power on a
// contract with a term. The first one starts when the site is powered, at its normal price.
// When the term ends, the next Plan phase has a renewal: negotiate it (see negotiation.ts),
// or do nothing and the utility's opening offer (normal price × opening_mult) applies.
// Texas can choose a fixed or an index contract; index prices move every quarter.
import { BALANCE, CONTENT, type MarketKey } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { substream, uniform } from '../rng.ts'
import {
  logEntry,
  type ContractType,
  type GameState,
  type Site,
} from '../state.ts'
import { logQuarterLabel } from '../state.ts'
import { scenarioOf } from './market.ts'
import { getTier, isReady, normalPriceUsdKwh } from './sites.ts'
import { siteParams } from './siteSerials.ts'

/** Sites that buy power on contracts: every tier except the garage (household power). */
export function hasContracts(site: Site): boolean {
  return site.tier !== BALANCE.startSite
}

/** Contract types this site can choose: fixed and index where the tier has power_options. */
export function contractTypes(site: Site): ContractType[] {
  return getTier(site.tier)!.power_options ? ['fixed', 'index'] : ['fixed']
}

/** The utility's opening offer for a renewal: the normal price now × opening_mult. */
export function openingOfferUsdKwh(
  site: Site,
  quarter: number,
  type: ContractType,
  scenario?: MarketKey | null,
): number {
  return (
    normalPriceUsdKwh(site, quarter, type, scenario) *
    CONTENT.negotiation.openingMult
  )
}

/** A contract's term has run out: it must be renewed this Plan phase. */
export function renewalDue(state: GameState, site: Site): boolean {
  return !!site.contract && state.quarter >= site.contract.endQuarter
}

/** This quarter's random move of an index price (own stream per site and quarter). */
function indexRoll(state: GameState, site: Site): number {
  const range = getTier(site.tier)!.power_options?.index.quarterly_range
  if (!range) return 1
  const r = substream(state.seed, `index:${state.quarter}:${site.id}`)
  return uniform(r, range[0], range[1])
}

/** Signs a contract at `price` for `term` quarters from this quarter. */
export function signContract(
  state: GameState,
  site: Site,
  type: ContractType,
  price: number,
  term: number,
): void {
  delete site.rateMult // a renewal ends the rate_class hike
  site.contract = {
    type,
    price,
    startQuarter: state.quarter,
    endQuarter: state.quarter + term,
  }
  if (type === 'index') site.contract.indexMult = indexRoll(state, site)
  logEntry(state, 'log.contract_signed', {
    ...siteParams(site),
    contract: type,
    price: `${(price * 100).toFixed(2)}¢`,
    quarter: logQuarterLabel(state, state.quarter + term),
  })
}

/**
 * At the start of a quarter: a site powered this quarter gets its first contract (normal
 * price, the short term), and index contracts roll this quarter's price.
 */
export function startQuarterContracts(state: GameState): void {
  for (const site of state.sites) {
    if (!hasContracts(site) || !isReady(site, state.quarter)) continue
    if (!site.contract) {
      const type = BALANCE.sites.defaultPowerOption
      signContract(
        state,
        site,
        type,
        normalPriceUsdKwh(site, state.quarter, type, scenarioOf(state)),
        CONTENT.negotiation.terms[0],
      )
    } else if (site.contract.type === 'index' && !renewalDue(state, site)) {
      site.contract.indexMult = indexRoll(state, site)
    }
  }
}

/** Why the opening offer can't be accepted for this site now, or undefined. */
export function acceptBlocker(
  state: GameState,
  siteId: string,
  type: ContractType,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (!renewalDue(state, site))
    return { key: 'error.no_renewal', params: { ...siteParams(site) } }
  if (!contractTypes(site).includes(type)) return { key: 'error.bad_choice' }
}

/** Accept the utility's opening offer: the short term, at normal price × opening_mult. */
export function acceptOpening(
  state: GameState,
  site: Site,
  type: ContractType,
): void {
  signContract(
    state,
    site,
    type,
    openingOfferUsdKwh(site, state.quarter, type, scenarioOf(state)),
    CONTENT.negotiation.terms[0],
  )
}

/** At the end of the Plan phase: renewals nobody negotiated take the opening offer, same type. */
export function autoRenew(state: GameState): void {
  for (const site of state.sites) {
    if (renewalDue(state, site)) acceptOpening(state, site, site.contract!.type)
  }
}
