// Sites: the ladder (garage → small unit → warehouse → own site → Texas), capacity,
// power prices, scouting offers and hidden flaws.
import {
  BALANCE,
  CONTENT,
  act1ValueQuarter,
  act2Quarter,
  type PowerRegion,
  type SiteTier,
} from '../../content/index.ts'
import { pick, randomInt, random } from '../rng.ts'
import {
  projectGone,
  roundCents,
  type ContractType,
  type GameState,
  type Site,
  type SiteOffer,
} from '../state.ts'
import { extraScoutOffers } from './hires.ts'
import { regionPowerAdderUsdKwh } from './regions.ts'
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

/** Capacity to place machines in: a phased site counts every phase started (built or building). */
export function capacityKw(site: Site): number {
  const tier = getTier(site.tier)!
  const base = site.phases
    ? tier.phases!.kw * site.phases.length
    : tier.capacity_kw
  return base * (flawEffect(site, 'capacity_mult') ?? 1) - (site.soldKw ?? 0)
}

/** Capacity energized in `quarter`: a phased site counts its finished phases only. */
export function poweredKw(site: Site, quarter: number): number {
  if (!site.phases) return isReady(site, quarter) ? capacityKw(site) : 0
  const done = site.phases.filter((q) => q <= quarter).length
  return Math.max(
    0,
    getTier(site.tier)!.phases!.kw *
      done *
      (flawEffect(site, 'capacity_mult') ?? 1) -
      (site.soldKw ?? 0),
  )
}

/** kW taken by every machine placed at the site, including broken and undelivered ones. */
export function machinesKw(state: GameState, siteId: string): number {
  return state.machines
    .filter((lot) => lot.siteId === siteId)
    .reduce((kw, lot) => kw + lot.count * getModel(lot.model)!.power_kw, 0)
}

/** kW of hosting at the site: live and being converted (both are taken). */
export function hostingKw(state: GameState, siteId: string): number {
  return state.hosting
    .filter((h) => h.siteId === siteId)
    .reduce((kw, h) => kw + h.kw, 0)
}

/** kW of projects at the site (Act II): taken from opening until sold. */
export function projectsKw(state: GameState, siteId: string): number {
  return state.projects
    .filter((p) => p.siteId === siteId && !projectGone(p))
    .reduce((kw, p) => kw + p.kw, 0)
}

/** kW taken at the site: your machines (placed anywhere in their life), hosting and projects. */
export function usedKw(state: GameState, siteId: string): number {
  return (
    machinesKw(state, siteId) +
    hostingKw(state, siteId) +
    projectsKw(state, siteId)
  )
}

/** The site's Act II region (owner decision B3): its own tag, else its tier's; the garage has none. */
export function regionOf(site: Site): PowerRegion | undefined {
  return (site.region ?? BALANCE.act2Regions.byTier[site.tier]) as
    PowerRegion | undefined
}

/**
 * The small-load premium over the region (owner decision B3): for the tiers that pay it, the
 * tier's 2022 power price minus the region's first Act II price, held constant. 0 otherwise.
 */
export function smallLoadPremiumUsdKwh(site: Site): number {
  const region = regionOf(site)
  const tier = getTier(site.tier)!
  if (!region || !BALANCE.act2Regions.premiumTiers.includes(tier.id)) return 0
  const first = CONTENT.act2Market[0]
  const year = first.quarter.slice(0, 4)
  return (tier.power_path?.[year] ?? 0) - first.powerUsdKwh[region]
}

/**
 * The site's normal price per kWh this quarter, before contracts and surcharges, × the scouting
 * multiplier. Act I: the tier's price path for the year (Texas: the contract type's price).
 * Act II: the region's series (+ the small-load premium); Texas's index option keeps its Act I
 * discount to fixed. The garage has no region and keeps its 2022 household price.
 */
export function normalPriceUsdKwh(
  site: Site,
  quarter: number,
  type: ContractType = BALANCE.sites.defaultPowerOption,
): number {
  const tier = getTier(site.tier)!
  const act2 = act2Quarter(quarter)
  const region = regionOf(site)
  if (act2 && region) {
    const regional = act2.powerUsdKwh[region] + smallLoadPremiumUsdKwh(site)
    const options = tier.power_options
    const typeMult = options ? options[type].price / options.fixed.price : 1
    return regional * typeMult * site.powerPriceMult
  }
  // 2022Q4+ without a region (the garage): the 2022 price holds (Act I's paths end there).
  const year = act1ValueQuarter(quarter).slice(0, 4)
  const base = tier.power_path?.[year] ?? tier.power_options![type].price
  return base * site.powerPriceMult
}

/**
 * $/kWh at this site in this quarter: the contract's price if it has one (index: × this
 * quarter's move), otherwise the normal price; then the rate_class flaw's hike (set by its
 * event card, until the next renewal) and the Heat 50 rate hike on top; then any regional
 * policy's per-kWh charge (Act II: Virginia's large-load tax), contract or not.
 */
export function powerPriceUsdKwh(site: Site, quarter: number): number {
  const c = site.contract
  const base = c
    ? c.price * (c.indexMult ?? 1)
    : normalPriceUsdKwh(site, quarter)
  return (
    base * (site.rateMult ?? 1) * (site.surcharge ?? 1) +
    regionPowerAdderUsdKwh(regionOf(site), quarter)
  )
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

/** Rolls 2–3 offers for a tier (+1 with the BD Lead). Terms vary ±offerSpread; each hides one flaw. */
export function rollOffers(state: GameState, tier: SiteTier): SiteOffer[] {
  const { min, max } = BALANCE.sites.scoutOffers
  const spread = BALANCE.sites.offerSpread
  const vary = () => 1 + spread * (2 * random(state) - 1)
  const count = randomInt(state, min, max) + extraScoutOffers(state)
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
