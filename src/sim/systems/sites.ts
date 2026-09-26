// Sites: the ladder (garage → small unit → warehouse → own site → Texas), capacity,
// power prices, scouting offers and hidden flaws.
import { BALANCE, CONTENT, type SiteTier } from '../../content/index.ts'
import { pick, randomInt, random } from '../rng.ts'
import type { GameState, Site, SiteOffer } from '../state.ts'
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

/** $/kWh at this site in this quarter. */
export function powerPriceUsdKwh(site: Site, quarter: number): number {
  const tier = getTier(site.tier)!
  const year = CONTENT.quarters[quarter].slice(0, 4)
  const base =
    tier.power_path?.[year] ??
    tier.power_options![BALANCE.sites.defaultPowerOption]
  const rateHike = flawEffect(site, 'power_price_mult_after_4q')
  const hiked = rateHike !== undefined && quarter >= site.readyQuarter + 4
  return base * site.powerPriceMult * (hiked ? rateHike : 1)
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
