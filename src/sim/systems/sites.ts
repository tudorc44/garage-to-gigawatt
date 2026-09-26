// Sites: the ladder (garage → small unit → warehouse → own site → Texas), capacity,
// power prices, scouting offers and hidden flaws.
import { BALANCE, CONTENT, type SiteTier } from '../../content/index.ts'
import { pick, randomInt, random } from '../rng.ts'
import {
  roundCents,
  type ContractType,
  type GameState,
  type Site,
  type SiteOffer,
} from '../state.ts'
import { saleValueUsd } from './machines.ts'
import { getModel } from './market.ts'

export function getTier(id: string): SiteTier | undefined {
  return CONTENT.siteTiers.find((t) => t.id === id)
}

/** Position on the ladder: garage = 0 … texas_site = 4. */
export function tierIndex(id: string): number {
  return CONTENT.siteTiers.findIndex((t) => t.id === id)
}

export function isReady(site: Site, quarter: number): boolean {
  return quarter >= site.readyQuarter
}

/** A number from the site's flaw (sites.json flaws.effect), or undefined if it has none. */
export function flawEffect(site: Site, key: string): number | undefined {
  return site.flaw ? CONTENT.flaws[site.flaw]?.effect[key] : undefined
}

export function capacityKw(site: Site): number {
  return (
    getTier(site.tier)!.capacity_kw * (flawEffect(site, 'capacity_mult') ?? 1)
  )
}

/** kW taken by every machine placed at the site, including broken and undelivered ones. */
export function usedKw(state: GameState, siteId: string): number {
  return state.machines
    .filter((lot) => lot.siteId === siteId)
    .reduce((kw, lot) => kw + lot.count * getModel(lot.model)!.power_kw, 0)
}

/**
 * The site's normal price per kWh this quarter, before contracts and surcharges: the tier's
 * price path for the year (or, for Texas, the contract type's price) × the scouting multiplier.
 */
export function normalPriceUsdKwh(
  site: Site,
  quarter: number,
  type: ContractType = BALANCE.sites.defaultPowerOption,
): number {
  const tier = getTier(site.tier)!
  const year = CONTENT.quarters[quarter].slice(0, 4)
  const base = tier.power_path?.[year] ?? tier.power_options![type].price
  return base * site.powerPriceMult
}

/**
 * $/kWh at this site in this quarter: the contract's price if it has one (index: × this
 * quarter's move), otherwise the normal price; then the rate_class flaw and the Heat 50 rate
 * hike on top.
 */
export function powerPriceUsdKwh(site: Site, quarter: number): number {
  const c = site.contract
  const base = c
    ? c.price * (c.indexMult ?? 1)
    : normalPriceUsdKwh(site, quarter)
  const rateHike = flawEffect(site, 'power_price_mult_after_4q')
  const hiked = rateHike !== undefined && quarter >= site.readyQuarter + 4
  return base * (hiked ? rateHike : 1) * (site.surcharge ?? 1)
}

/** Share of the week the site actually has power (outage flaw). */
export function uptime(site: Site): number {
  return flawEffect(site, 'uptime') ?? 1
}

/** Hashrate multiplier for the site this quarter (cooling flaw bites in Q3, summer). */
export function hashrateMult(site: Site, quarter: number): number {
  const summer = CONTENT.quarters[quarter].endsWith('Q3')
  return summer ? (flawEffect(site, 'summer_hashrate_mult') ?? 1) : 1
}

/** Up-front cost of building a tier with standard terms: capex (or capex per MW) plus land. */
export function baseCapexUsd(tier: SiteTier): number {
  const capex =
    tier.capex_usd ?? (tier.capex_per_mw_usd ?? 0) * (tier.capacity_kw / 1000)
  return capex + (tier.land_usd ?? 0)
}

/** The biggest tier the player owns or is building. */
export function topTierIndex(state: GameState): number {
  return Math.max(...state.sites.map((s) => tierIndex(s.tier)))
}

/** Rolls 2–3 offers for a tier. Terms vary ±offerSpread; each hides one flaw. */
export function rollOffers(state: GameState, tier: SiteTier): SiteOffer[] {
  const { min, max } = BALANCE.sites.scoutOffers
  const spread = BALANCE.sites.offerSpread
  const vary = () => 1 + spread * (2 * random(state) - 1)
  const count = randomInt(state, min, max)
  return Array.from({ length: count }, () => ({
    id: `offer-${state.nextId++}`,
    tier: tier.id,
    rentUsdQ: Math.round(tier.rent_usd_q * vary()),
    capexUsd: Math.round(baseCapexUsd(tier) * vary()),
    powerPriceMult: Math.round(vary() * 1000) / 1000,
    flaw:
      tier.possible_flaws.length > 0 ? pick(state, tier.possible_flaws) : null,
  }))
}

/** Penalty for breaking the site's lease: leaseBreakMonths of its rent (a quarter is 3 months). */
export function leaseBreakUsd(site: Site): number {
  return roundCents((site.rentUsdQ * BALANCE.sites.leaseBreakMonths) / 3)
}

/** What leaving a site means: machines there are sold at the used price, then the penalty is paid. */
export function leavingTerms(state: GameState, site: Site) {
  const lots = state.machines.filter((l) => l.siteId === site.id)
  return {
    penaltyUsd: leaseBreakUsd(site),
    units: lots.reduce((n, l) => n + l.count, 0),
    machinesUsd: lots.reduce(
      (sum, l) => sum + saleValueUsd(l, l.count, state.quarter),
      0,
    ),
  }
}
