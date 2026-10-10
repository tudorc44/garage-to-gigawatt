// The yearly Community Deal (M19.2, design thread 4 Oct 2026; designed numbers in heat.json › community_deal). While
// the Community Relations Manager is on staff, a Plan-phase offer comes once every 4 quarters, first in the quarter
// after hiring her. It targets the site with the highest Heat that is 30 or more (tie: the larger site; never the
// garage); with none, the offer waits for the first later quarter where one qualifies, and the 4-quarter clock
// restarts from then. Signing (1 Bandwidth, $100K × the site's MW, between $100K and $20M) sets the site's Heat to 12
// now through a goodwill offset that moves 5 toward 0 at each quarter end (heat.ts); a new deal on the same site
// replaces what's left. "Not this year" is the default: an offer left at END_PLAN lapses. Letting her go stops the
// offers, but an offset already paid for stays. Signing isn't one of the player's big moves (Act III move log).
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { logEntry, type GameState, type Site } from '../state.ts'
import { heatBeforeDeal, heatOf, recalcHeat, siteHeatValue } from './heat.ts'
import { bringsCommunityDeal } from './hires.ts'
import { capacityKw } from './sites.ts'
import { siteParams } from './siteSerials.ts'

const D = () => CONTENT.heat.communityDeal

/** A deal's price at a site: $100K × its MW, between $100K and $20M. */
export function communityDealCostUsd(site: Site): number {
  const mw = capacityKw(site) / 1000
  return Math.min(D().maxUsd, Math.max(D().minUsd, D().perMwUsd * mw))
}

/** The site a deal would target now: the highest Heat at 30 or more (tie: the larger); never the garage. */
export function communityDealTarget(state: GameState): Site | undefined {
  return state.sites
    .filter(
      (s) => s.tier !== 'garage' && siteHeatValue(state, s.id) >= D().minHeat,
    )
    .sort(
      (a, b) =>
        siteHeatValue(state, b.id) - siteHeatValue(state, a.id) ||
        capacityKw(b) - capacityKw(a),
    )[0]
}

/** At the start of a Plan phase: the offer, when one is due and a site qualifies (else it waits). */
export function openCommunityDeal(state: GameState): void {
  const d = state.communityDeal
  if (!d) return
  delete d.offer
  if (!bringsCommunityDeal(state) || state.quarter < d.nextQuarter) return
  const site = communityDealTarget(state)
  if (!site) return
  d.offer = { siteId: site.id, costUsd: communityDealCostUsd(site) }
  d.nextQuarter = state.quarter + D().everyQuarters
}

/** Why the deal on offer can't be signed now, or undefined. Checks only. */
export function communityDealBlocker(state: GameState): Message | undefined {
  const offer = state.communityDeal?.offer
  if (!offer) return { key: 'error.no_community_deal' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const bw = D().bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  if (state.cash < offer.costUsd)
    return {
      key: 'error.no_cash',
      params: { costUsd: offer.costUsd, cashUsd: state.cash },
    }
}

/** Signs the deal on offer (assumes the blocker passed): pay, 1 Bandwidth, Heat to 12 now. */
export function signCommunityDeal(state: GameState): void {
  const d = state.communityDeal!
  const offer = d.offer!
  const site = state.sites.find((s) => s.id === offer.siteId)!
  book(state, 'community', -offer.costUsd, { site: offer.siteId })
  state.bandwidth -= D().bandwidth
  const h = heatOf(state, site.id)
  // a new deal replaces any offset left; never raises Heat
  h.dealOffset = Math.min(0, D().targetHeat - heatBeforeDeal(state, site))
  if (h.dealOffset === 0) delete h.dealOffset
  recalcHeat(state, site)
  delete d.offer
  logEntry(state, 'log.community_deal_signed', {
    ...siteParams(site),
    costUsd: offer.costUsd,
    heat: Math.round(h.value),
    fade: D().fadePerQuarter,
  })
}

/** "Not this year" (the default): the offer goes; the next comes in 4 quarters. */
export function declineCommunityDeal(state: GameState): void {
  if (state.communityDeal) delete state.communityDeal.offer
}
