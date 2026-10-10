// Sites: the ladder (garage → small unit → warehouse → own site → Texas), capacity,
// power prices, scouting offers and hidden flaws.
import {
  BALANCE,
  CONTENT,
  act1ValueQuarter,
  act2Quarter,
  actFirstQuarter,
  actLastQuarter,
  isAct4MarketKey,
  quarterInputs,
  type MarketKey,
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
import {
  firmKw,
  flareOutput,
  fourCpOutputMult,
  fourCpPriceMult,
  specialPriceUsdKwh,
} from './energyAssets.ts'
import { extraScoutOffers } from './hires.ts'
import { regionPowerAdderUsdKwh } from './regions.ts'
import { saleValueUsd } from './machines.ts'
import { getModel, scenarioOf } from './market.ts'

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

/**
 * A number from the site's flaw, or undefined if it has none: sites.json's flaws, or for an Act II
 * scouted site sites_act2.json's.
 */
export function flawEffect(site: Site, key: string): number | undefined {
  if (!site.flaw) return undefined
  const flaws = site.category ? CONTENT.act2Sites.flaws : CONTENT.flaws
  return flaws[site.flaw]?.effect[key]
}

/** The site's size before flaws: its own (Act II scouted sites), else its tier's. */
export function nominalKw(site: Site): number {
  const tier = getTier(site.tier)!
  if (site.phases) return tier.phases!.kw * site.phases.length
  return site.kw ?? tier.capacity_kw
}

/** kW of power added for projects (grid upgrades, on-site gas): all of it, or energized by `quarter`. */
export function powerAddsKw(site: Site, quarter?: number): number {
  return (site.powerAdds ?? [])
    .filter(
      (a) =>
        quarter === undefined ||
        (a.readyQuarter !== null && a.readyQuarter <= quarter),
    )
    .reduce((kw, a) => kw + a.kw, 0)
}

/**
 * Capacity to place machines and projects in: a phased site counts every phase started (built or
 * building), and power added for projects counts from their opening.
 */
export function capacityKw(site: Site): number {
  const kw =
    nominalKw(site) * (flawEffect(site, 'capacity_mult') ?? 1) -
    (site.soldKw ?? 0) +
    powerAddsKw(site)
  // M35 (doc 38 §4.9): firm power from renewables with storage, being built or built (none without energy assets);
  // M36: a venture's delivered firm power (set at its first power, so energized at once).
  return (site.energy ? kw + firmKw(site, 0, true) : kw) + (site.ventureKw ?? 0)
}

/**
 * Capacity energized in `quarter`: a phased site counts its finished phases only; power added for a
 * project counts once it's energized.
 */
export function poweredKw(site: Site, quarter: number): number {
  // M35: firm power from storage counts once its assets work (none without energy assets).
  const firmPending = site.energy ? firmKw(site, quarter, true) - firmKw(site, quarter) : 0
  const pending = powerAddsKw(site) - powerAddsKw(site, quarter) + firmPending
  if (!site.phases)
    return isReady(site, quarter) ? capacityKw(site) - pending : 0
  const done = site.phases.filter((q) => q <= quarter).length
  return Math.max(
    0,
    getTier(site.tier)!.phases!.kw *
      done *
      (flawEffect(site, 'capacity_mult') ?? 1) -
      (site.soldKw ?? 0) +
      powerAddsKw(site, quarter) +
      (site.energy ? firmKw(site, quarter) : 0) +
      (site.ventureKw ?? 0),
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
  scenario?: MarketKey | null,
): number {
  const tier = getTier(site.tier)!
  // M35.3 (doc 38 §4.4-4.6): a hydro or Iceland allocation, or a flare pad, has its own price in every act.
  if (site.special) return specialPriceUsdKwh(site, quarter) * site.powerPriceMult
  // Act II's series, or Act III's scenario column (M11.4c).
  // (Without a scenario, an Act II game looking a quarter ahead across the boundary reads as before.)
  const act2 = scenario
    ? quarterInputs(quarter, scenario)
    : act2Quarter(quarter)
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
export function powerPriceUsdKwh(
  site: Site,
  quarter: number,
  scenario?: MarketKey | null,
): number {
  const c = site.contract
  const base = c
    ? c.price * (c.indexMult ?? 1)
    : normalPriceUsdKwh(site, quarter, undefined, scenario)
  const e = site.eventPowerMult
  const eventMult = e && quarter >= e.from && quarter <= e.until ? e.mult : 1
  // M35.4: the year after a 4CP summer, 10% less (1 without 4CP).
  const fourCp = site.dr ? fourCpPriceMult(site, quarter) : 1
  return (
    base * (site.rateMult ?? 1) * (site.surcharge ?? 1) * eventMult * fourCp +
    regionPowerAdderUsdKwh(regionOf(site), quarter) +
    capacityChargeUsdKwh(site, quarter, scenario)
  )
}

/**
 * The PJM capacity charge (Act III, M17.8, DT), $/kWh: at sites in PJM and Ohio, the scenario's capacity price
 * change since 2027Q1 ($/MW-day ÷ 24 h ÷ 1,000); negative when capacity falls below 2027Q1. The change, not the
 * level, so Act II's capacity-shock policy adder (which stays) isn't counted twice. 0 elsewhere and outside Act III.
 */
export function capacityChargeUsdKwh(
  site: Site,
  quarter: number,
  scenario?: MarketKey | null,
): number {
  return regionCapacityChargeUsdKwh(regionOf(site), quarter, scenario)
}

/** The PJM capacity charge in a region (see capacityChargeUsdKwh), $/kWh. */
export function regionCapacityChargeUsdKwh(
  region: PowerRegion | undefined,
  quarter: number,
  scenario?: MarketKey | null,
): number {
  if (!scenario || (region !== 'pjm' && region !== 'ohio')) return 0
  const first = actFirstQuarter(3)
  // (M27.5: and through Act IV with an Act IV key, still measured from Act III's first quarter)
  const last = isAct4MarketKey(scenario) ? actLastQuarter(4) : actLastQuarter(3)
  if (quarter < first || quarter > last) return 0
  const now = quarterInputs(quarter, scenario)?.pjmCapacityUsdMwDay
  const base = quarterInputs(first, scenario)?.pjmCapacityUsdMwDay
  if (now === undefined || base === undefined) return 0
  return (now - base) / 24 / 1000
}

/**
 * Share of the week the site actually has power (outage flaw). M35.3: a flare pad's output (its well's decline, a
 * relocation, a genset failure) when the quarter is given.
 */
export function uptime(site: Site, quarter?: number): number {
  const up = flawEffect(site, 'uptime') ?? 1
  return site.flare && quarter !== undefined ? up * flareOutput(site, quarter) : up
}

/** Hashrate multiplier for the site this quarter (cooling flaws bite in Q3, summer; Act II: water limits). */
export function hashrateMult(site: Site, quarter: number): number {
  const summer = CONTENT.quarters[quarter].endsWith('Q3')
  const mult = summer
    ? (flawEffect(site, 'summer_hashrate_mult') ??
        flawEffect(site, 'summer_derate') ??
        1)
    : 1
  // M35.4: 4CP gives up 1.5% of Q3's output (none without it).
  return site.dr ? mult * fourCpOutputMult(site, quarter) : mult
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
      (sum, l) =>
        sum + saleValueUsd(l, l.count, state.quarter, scenarioOf(state)),
      0,
    ),
  }
}
