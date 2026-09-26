// Power contract negotiation (interrupts.json › negotiation, design thread 26 Sep 2026).
// A renewal is due; instead of taking the opening offer (normal price × opening_mult) you pay
// Bandwidth to bargain. The utility has a hidden limit, the lowest price it will sign:
//   normal price × U(limit_range) × long_term_limit_mult (8-quarter term) × (1 − hire_shift).
// Each round you counter with a price:
//   at or above the limit → signed at your price;
//   within lowball_margin below it → the utility comes back halfway between its offer and limit;
//   further below (a lowball) → walkaway_chance that it walks away, else it comes back halfway.
// After `rounds` counters without a deal: take its last offer or walk away. Walking away
// (either side) leaves the opening offer for the short term. Bandwidth is spent either way.
// The rolls use their own stream, so negotiating doesn't change the rest of the game.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { substream, uniform } from '../rng.ts'
import {
  logEntry,
  type ContractType,
  type GameState,
  type Site,
} from '../state.ts'
import {
  contractTypes,
  openingOfferUsdKwh,
  renewalDue,
  signContract,
} from './contracts.ts'
import { normalPriceUsdKwh } from './sites.ts'

export interface PowerNegotiation {
  siteId: string
  contractType: ContractType
  /** Quarters the deal will run (the long term makes the utility harder to move). */
  term: number
  openingUsdKwh: number
  /** The utility's current offer. */
  offerUsdKwh: number
  /** Hidden: the lowest price the utility will sign. The UI must never show it. */
  limitUsdKwh: number
  /** Counters made so far. */
  round: number
  /** Rounds are used up: only accepting the last offer or walking away is left. */
  final: boolean
  /** Each counter and what the utility did. */
  history: { counterUsdKwh: number; reply: 'counter' | 'deal' | 'walked' }[]
  /** Position of this negotiation's own random stream. */
  rng: number
}

/**
 * Hook for hires (not built yet): the Ex-Utility Exec shifts the limit hire_shift in the
 * player's favour. Returns 0 until hires exist.
 */
export function hireShift(): number {
  return 0
}

/** Why a negotiation can't start now, or undefined. Checks only. */
export function startBlocker(
  state: GameState,
  siteId: string,
  type: ContractType,
  term: number,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (state.negotiation) return { key: 'error.negotiation_open' }
  if (state.pitch) return { key: 'error.pitch_open' }
  if (!renewalDue(state, site))
    return { key: 'error.no_renewal', params: { tier: site.tier } }
  if (!contractTypes(site).includes(type)) return { key: 'error.bad_choice' }
  if (!(CONTENT.negotiation.terms as readonly number[]).includes(term))
    return { key: 'error.bad_choice' }
  const bw = CONTENT.negotiation.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
}

/** Starts bargaining: Bandwidth spent, opening offer on the table, hidden limit drawn. */
export function startNegotiation(
  state: GameState,
  siteId: string,
  type: ContractType,
  term: number,
): void {
  const rules = CONTENT.negotiation
  const site = state.sites.find((s) => s.id === siteId)!
  const r = substream(state.seed, `negotiation:${state.quarter}:${siteId}`)
  const normal = normalPriceUsdKwh(site, state.quarter, type)
  const long = term === rules.terms[1] ? rules.longTermLimitMult : 1
  const limit =
    normal * uniform(r, ...rules.limitRange) * long * (1 - hireShift())
  const opening = openingOfferUsdKwh(site, state.quarter, type)
  state.bandwidth -= rules.bandwidth
  state.negotiation = {
    siteId,
    contractType: type,
    term,
    openingUsdKwh: opening,
    offerUsdKwh: opening,
    limitUsdKwh: limit,
    round: 0,
    final: false,
    history: [],
    rng: r.rng,
  }
  logEntry(state, 'log.negotiation_started', {
    tier: site.tier,
    contract: type,
    term,
  })
}

function siteOf(state: GameState): Site {
  return state.sites.find((s) => s.id === state.negotiation!.siteId)!
}

/** Signs at `price` for the chosen term and closes the negotiation. */
function deal(state: GameState, price: number): void {
  const n = state.negotiation!
  const site = siteOf(state)
  logEntry(state, 'log.negotiation_deal', {
    tier: site.tier,
    price: `${(price * 100).toFixed(2)}¢`,
    opening: `${(n.openingUsdKwh * 100).toFixed(2)}¢`,
    term: n.term,
  })
  signContract(state, site, n.contractType, price, n.term)
  state.negotiation = null
}

/** Nobody signed: the opening offer applies for the short term. */
function walkAway(state: GameState, by: 'you' | 'utility'): void {
  const n = state.negotiation!
  const site = siteOf(state)
  logEntry(
    state,
    by === 'you' ? 'log.negotiation_you_walked' : 'log.negotiation_they_walked',
    { tier: site.tier, opening: `${(n.openingUsdKwh * 100).toFixed(2)}¢` },
  )
  signContract(
    state,
    site,
    n.contractType,
    n.openingUsdKwh,
    CONTENT.negotiation.terms[0],
  )
  state.negotiation = null
}

/** One round: your counter-offer. */
export function counter(
  state: GameState,
  priceUsdKwh: number,
): Message | undefined {
  const n = state.negotiation
  if (!n) return { key: 'error.no_negotiation' }
  if (n.final) return { key: 'error.negotiation_final' }
  if (!(priceUsdKwh > 0)) return { key: 'error.bad_amount' }
  const rules = CONTENT.negotiation
  n.round++
  // Asking for more than they offer is just taking their offer.
  if (priceUsdKwh >= n.offerUsdKwh) {
    n.history.push({ counterUsdKwh: priceUsdKwh, reply: 'deal' })
    deal(state, n.offerUsdKwh)
    return
  }
  if (priceUsdKwh >= n.limitUsdKwh) {
    n.history.push({ counterUsdKwh: priceUsdKwh, reply: 'deal' })
    deal(state, priceUsdKwh)
    return
  }
  const lowball = priceUsdKwh < n.limitUsdKwh * (1 - rules.lowballMargin)
  if (lowball) {
    const r = { rng: n.rng }
    const walks = uniform(r, 0, 1) < rules.walkawayChance
    n.rng = r.rng
    if (walks) {
      n.history.push({ counterUsdKwh: priceUsdKwh, reply: 'walked' })
      walkAway(state, 'utility')
      return
    }
  }
  n.offerUsdKwh = (n.offerUsdKwh + n.limitUsdKwh) / 2
  n.history.push({ counterUsdKwh: priceUsdKwh, reply: 'counter' })
  if (n.round >= rules.rounds) n.final = true
}

/** Take the utility's current offer. */
export function acceptOffer(state: GameState): Message | undefined {
  if (!state.negotiation) return { key: 'error.no_negotiation' }
  deal(state, state.negotiation.offerUsdKwh)
}

/** Walk away: the opening offer applies for the short term. */
export function walkOut(state: GameState): Message | undefined {
  if (!state.negotiation) return { key: 'error.no_negotiation' }
  walkAway(state, 'you')
}

/**
 * Walk-away risk of a counter, from the public rules only (never the hidden limit): the limit
 * lies between the lowest and highest it could be, so a counter is "none" if it can't be a
 * lowball, "high" if it must be one, and "possible" in between.
 */
export function counterRisk(
  state: GameState,
  priceUsdKwh: number,
): 'none' | 'possible' | 'high' {
  const n = state.negotiation
  if (!n) return 'none'
  const rules = CONTENT.negotiation
  const site = siteOf(state)
  const normal = normalPriceUsdKwh(site, state.quarter, n.contractType)
  const long = n.term === rules.terms[1] ? rules.longTermLimitMult : 1
  const shift = 1 - hireShift()
  const edge = (m: number) =>
    normal * m * long * shift * (1 - rules.lowballMargin)
  if (priceUsdKwh >= edge(rules.limitRange[1])) return 'none'
  if (priceUsdKwh < edge(rules.limitRange[0])) return 'high'
  return 'possible'
}
