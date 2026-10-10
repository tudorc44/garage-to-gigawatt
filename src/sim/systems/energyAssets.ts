// The small reads of a site's energy assets that the core site rules need (M35, doc 38 §4): firm power from storage,
// a home battery's ride-through, the battery MW, a special site's price and a flare pad's output. A leaf module (no
// system imports), so sites.ts and mining.ts can use it without an import loop.
import { CONTENT } from '../../content/index.ts'
import { ENERGY, type EnergyKind } from '../../content/energyContent.ts'
import type { EnergyAsset, GameState, Site } from '../state.ts'

const label = (q: number) => CONTENT.quarters[q]

/** No hosting or AI project at a flare pad (doc 38 §4.6: remote, poor connectivity). */
export const miningOnly = (site: Site | undefined) => !!site?.special && !!ENERGY.specialKinds[site.special].mining_only

/** The site's assets of one kind (built or building). */
export const assetsOf = (site: Site, kind?: EnergyKind): EnergyAsset[] =>
  (site.energy ?? []).filter((a) => kind === undefined || a.kind === kind)

/** Built and working this quarter. */
export const isWorking = (a: EnergyAsset, quarter: number) => a.readyQuarter <= quarter && !a.broken

/**
 * kW of firm power the site's renewables give with storage (E-D8, doc 38 §4.9): iron-air makes 90% of the renewable
 * MW it covers firm, a 4-hour-plus utility battery 30%; renewables alone add none. Working assets only, unless `all`
 * (capacity to plan on counts what's being built, as a grid upgrade's does).
 */
export function firmKw(site: Site, quarter: number, all = false): number {
  if (!site.energy) return 0
  const live = (a: EnergyAsset) => all || isWorking(a, quarter)
  const kw = (kinds: EnergyKind[], f: (a: EnergyAsset) => boolean = () => true) =>
    site.energy!.filter((a) => kinds.includes(a.kind) && live(a) && f(a)).reduce((n, a) => n + a.kw, 0)
  const renewables = kw(['btm_solar', 'btm_wind'])
  if (renewables <= 0) return 0
  const ironAir = Math.min(renewables, kw(['iron_air']))
  const bess = Math.min(renewables - ironAir, kw(['bess'], (a) => (a.hours ?? 0) >= 4))
  return ironAir * ENERGY.site_assets.iron_air.firm_share + bess * ENERGY.site_assets.bess.firm_share
}

/** MW of utility battery working at the site (4CP without losing output; the AI exclusion's exit). */
export function bessMw(site: Site, quarter: number): number {
  return assetsOf(site, 'bess').filter((a) => isWorking(a, quarter)).reduce((n, a) => n + a.kw, 0) / 1000
}

/**
 * 4CP (doc 38 §4.7): the share of Q3's output a site keeps; a utility battery covering the site's power avoids the
 * loss (§4.8 (1)). 1 without 4CP or outside Q3.
 */
export function fourCpOutputMult(site: Site, quarter: number): number {
  if (!site.dr?.fourCp || !label(quarter).endsWith('Q3')) return 1
  const tier = CONTENT.siteTiers.find((t) => t.id === site.tier)
  const mw = (site.kw ?? tier?.capacity_kw ?? 1000) / 1000
  const cover = Math.min(1, bessMw(site, quarter) / mw)
  return 1 - ENERGY.texas.four_cp.q3_output_loss * (1 - cover)
}

/** A home battery's ride-through (doc 38 §4.3): the share of the site's working machines kept running in outages. */
export function rideThroughShare(state: GameState, site: Site): number {
  const blocks = assetsOf(site, 'home_battery')
    .filter((a) => isWorking(a, state.quarter))
    .reduce((n, a) => n + (a.blocks ?? 0), 0)
  if (blocks <= 0) return 0
  const units = state.machines.filter((l) => l.siteId === site.id).reduce((n, l) => n + l.count - l.failed, 0)
  return units > 0 ? Math.min(1, (blocks * ENERGY.owned.home_battery.machines_per_block) / units) : 0
}

/**
 * A special site's normal price, $/kWh, before the scouting multiplier (doc 38 §4.4-4.6): a hydro or Iceland
 * allocation's price for the year (its last year after the path ends), less its free-air cooling, × any crypto tariff;
 * a flare pad's running cost (less the 2021 tax break).
 */
export function specialPriceUsdKwh(site: Site, quarter: number): number {
  const k = ENERGY.specialKinds[site.special!]
  const q = label(quarter)
  if (site.special === 'flare') {
    const t = ENERGY.special_sites.flare.tax_break
    return ((k.running_usd_mwh ?? 0) / 1000) * (q >= t.from ? t.running_mult : 1)
  }
  // M39.3 (doc 41): an Iceland site keeps the price it signed at
  if (site.lockedUsdKwh !== undefined) return site.lockedUsdKwh * (k.cooling_mult ?? 1)
  const path = k.power_usd_kwh ?? {}
  const years = Object.keys(path).sort()
  const year = q.slice(0, 4) > years[years.length - 1] ? years[years.length - 1] : q.slice(0, 4) < years[0] ? years[0] : q.slice(0, 4)
  return path[year] * (k.cooling_mult ?? 1) * tariffRampMult(site, quarter)
}

/** M39.2 (doc 41): a PUD site's crypto tariff this quarter: 1 before it, then a straight line to its full multiple. */
export function tariffRampMult(site: Site, quarter: number): number {
  const r = site.tariffRamp
  if (!r || quarter < r.from) return 1
  return 1 + (r.mult - 1) * Math.min(1, (quarter - r.from + 1) / r.quarters)
}

/**
 * M39.2-M39.3 (doc 41): a special site's share of its output lost to its grid: a Québec site taken from 2019Q4 (300
 * hours a year of curtailment); an Iceland site in the 2021Q4 dry winter (a week). 1 for any other site.
 */
export function specialOutputMult(site: Site, quarter: number): number {
  if (!site.special) return 1
  const k = ENERGY.specialKinds[site.special]
  let mult = 1
  const c = k.curtail
  if (c && site.acquiredQuarter != null && label(site.acquiredQuarter) >= c.from) mult *= 1 - c.output_loss
  const dry = k.dry_winter
  if (dry && label(quarter) === dry.quarter && site.acquiredQuarter != null && site.acquiredQuarter < quarter)
    mult *= (13 - dry.weeks) / 13
  return mult
}

/**
 * A flare pad's output share this quarter (doc 38 §4.6): 85% for its well's first 4 quarters, then 8% less each
 * quarter; nothing while it relocates; a genset failure costs a week. 1 for any other site.
 */
export function flareOutput(site: Site, quarter: number): number {
  const f = site.flare
  if (!f) return 1
  if (f.relocatingUntil !== undefined && quarter < f.relocatingUntil) return 0
  const r = ENERGY.special_sites.flare
  const k = Math.max(0, quarter - f.wellQuarter)
  const decline = k < r.cf_first_quarters ? 1 : (1 - r.decline_per_quarter) ** (k - r.cf_first_quarters + 1)
  const failed = f.offlineQuarter === quarter ? (13 - r.genset_fail_weeks) / 13 : 1
  return r.cf * decline * failed
}
