// Energy assets at a site (M35, doc 38 §4): rooftop solar, small wind and a home battery in the early eras (badges,
// resilience and hedges, never cost cutters: E-D1); from Act II a utility battery (BESS), behind-the-meter solar and
// wind; from Act IV iron-air storage. Prices by year: market_energy.csv; rules: energy.json. Every roll uses its own
// substream ("energy:…"), so a game without an energy asset plays exactly as before.
import { CONTENT, actFirstQuarter, type PowerRegion } from '../../content/index.ts'
import {
  ENERGY,
  energyYear,
  itcPct,
  OWNED_KINDS,
  SITE_ASSET_KINDS,
  type EnergyKind,
  type OwnedKind,
  type SiteAssetKind,
} from '../../content/energyContent.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, substream, uniform } from '../rng.ts'
import { logEntry, roundCents, type EnergyAsset, type GameState, type Site } from '../state.ts'
import { assetsOf, isWorking } from './energyAssets.ts'
import { addGrievance } from './heat.ts'
import { scenarioOf } from './market.ts'
import { drawOverrun } from './overrun.ts'
import { nominalKw, poweredKw, powerPriceUsdKwh, regionOf, usedKw } from './sites.ts'
import { siteParams } from './siteSerials.ts'
import { siteLoadKw as prologueSiteLoadKw, sitePowerUsdKwh as prologueSitePrice } from '../prologue/setup.ts'
import { endQuarterTexas } from './texasPower.ts'

/** Hours in a quarter (91 days). */
export const HOURS_Q = 24 * 91
const label = (q: number) => CONTENT.quarters[q]
const yearOf = (q: number) => Number(label(q).slice(0, 4))
/** A yearly chance as a quarterly one. */
const perQuarter = (pYear: number) => 1 - (1 - pYear) ** 0.25

export const isOwnedKind = (k: string): k is OwnedKind => (OWNED_KINDS as readonly string[]).includes(k)
export const isSiteAssetKind = (k: string): k is SiteAssetKind => (SITE_ASSET_KINDS as readonly string[]).includes(k)
export const ENERGY_KINDS: readonly EnergyKind[] = [...OWNED_KINDS, ...SITE_ASSET_KINDS]

/**
 * The price of one unit this quarter, or null when it isn't on sale: $ per kW for solar and wind (rooftop solar net of
 * the tax credit), $ per kW for a utility battery or iron-air (× its hours, × the region's multiplier), $ per block for
 * a home battery.
 */
export function unitPriceUsd(state: GameState, site: Site, kind: EnergyKind, hours?: number): number | null {
  const row = energyYear(yearOf(state.quarter))
  switch (kind) {
    case 'rooftop_solar':
      return row.res_solar_usd_w === null ? null : row.res_solar_usd_w * 1000 * (1 - itcPct(label(state.quarter)) / 100)
    case 'small_wind':
      return row.small_wind_usd_kw
    case 'home_battery':
      return row.home_battery_usd_kwh === null ? null : row.home_battery_usd_kwh * ENERGY.owned.home_battery.block_kwh
    case 'bess': {
      const p = row.bess_usd_kwh_us
      const mult = ENERGY.site_assets.bess.region_mult[regionOf(site) ?? ''] ?? 1
      return p === null ? null : p * (hours ?? 4) * mult
    }
    case 'btm_solar':
      return row.utility_solar_usd_kw
    case 'btm_wind':
      return row.utility_wind_usd_kw
    case 'iron_air':
      return row.iron_air_usd_kwh === null ? null : row.iron_air_usd_kwh * ENERGY.site_assets.iron_air.hours
  }
}

/** A utility-scale site: an own site, a Texas site or an Act II scouted site (not a special site). */
export function isUtilityScale(site: Site): boolean {
  if (site.special) return false
  return site.tier === 'own_site' || site.tier === 'texas_site' || site.category !== undefined
}

/** Rural land for behind-the-meter solar and wind (doc 38 §4.9). */
const isRural = (site: Site) => !site.special && (ENERGY.site_assets.btm_solar.rural_tiers.includes(site.tier) || site.category !== undefined)

/** What can be built of a kind at a site now. size: kW (owned solar and wind), blocks (home battery), MW (the rest). */
export interface EnergyChoice {
  kind: EnergyKind
  sizes: number[]
  hours?: number[]
  /** Why it can't be built now (the first reason), or undefined. */
  blocked?: Message
}

/** Room left: kW of roof or turbine, battery blocks, or MW of land or connection. */
export function roomLeft(site: Site, kind: EnergyKind): number {
  const sum = (kinds: EnergyKind[], f: (a: EnergyAsset) => number) =>
    (site.energy ?? []).filter((a) => kinds.includes(a.kind)).reduce((n, a) => n + f(a), 0)
  switch (kind) {
    case 'rooftop_solar':
      return (ENERGY.owned.rooftop_solar.roof_kw[site.tier] ?? 0) - sum(['rooftop_solar'], (a) => a.kw)
    case 'small_wind':
      return (ENERGY.owned.small_wind.limit_kw[site.tier] ?? 0) - sum(['small_wind'], (a) => a.kw)
    case 'home_battery':
      return (ENERGY.owned.home_battery.max_blocks[site.tier] ?? 0) - sum(['home_battery'], (a) => a.blocks ?? 0)
    case 'bess':
    case 'iron_air':
      return nominalKw(site) / 1000 - sum([kind], (a) => a.kw / 1000)
    case 'btm_solar':
    case 'btm_wind': {
      const land = nominalKw(site) / 1000 * ENERGY.site_assets[kind].land_mw_per_site_mw
      return land - sum(['btm_solar', 'btm_wind'], (a) => a.kw / 1000)
    }
  }
}

/** Why a kind can't be built at this site in this quarter (before size and cash), or undefined. */
function kindBlocker(state: GameState, site: Site, kind: EnergyKind): Message | undefined {
  const q = label(state.quarter)
  if (isOwnedKind(kind)) {
    const r = ENERGY.owned[kind]
    if (q < r.from || q > r.until) return { key: 'error.energy_not_offered' }
    if (roomLeft(site, kind) <= 0 && assetsOf(site, kind).length === 0) return { key: 'error.energy_not_here' }
  } else {
    const r = ENERGY.site_assets[kind]
    if (q < r.from) return { key: 'error.energy_not_offered' }
    if (!isUtilityScale(site)) return { key: 'error.energy_not_here' }
    if ((kind === 'btm_solar' || kind === 'btm_wind') && !isRural(site)) return { key: 'error.energy_not_here' }
  }
  if (site.special === 'flare') return { key: 'error.energy_not_here' }
  if (unitPriceUsd(state, site, kind) === null) return { key: 'error.energy_not_offered' }
  if (roomLeft(site, kind) <= 0) return { key: 'error.energy_no_room' }
}

/** The battery hours on offer (8 from Act IV). */
export function bessHours(state: GameState): number[] {
  const b = ENERGY.site_assets.bess
  return state.act >= 4 ? b.hours_act4 : b.hours
}

/** The kinds a site can see, with their sizes (only those that fit) and any reason they're blocked. */
export function energyChoices(state: GameState, site: Site): EnergyChoice[] {
  const out: EnergyChoice[] = []
  for (const kind of ENERGY_KINDS) {
    const blocked = kindBlocker(state, site, kind)
    // A kind that's never on offer here isn't listed at all (only "no room" and "not now" are).
    if (blocked?.key === 'error.energy_not_here') continue
    if (blocked?.key === 'error.energy_not_offered' && assetsOf(site, kind).length === 0) continue
    const room = roomLeft(site, kind)
    const all = isOwnedKind(kind)
      ? kind === 'home_battery'
        ? [1, 2, 4, 10]
        : ENERGY.owned[kind].sizes_kw
      : ENERGY.site_assets[kind].sizes_mw
    const sizes = all.filter((n) => n <= room + 1e-9)
    out.push({
      kind,
      sizes: sizes.length > 0 ? sizes : room > 0 ? [Math.floor(room)].filter((n) => n > 0) : [],
      ...(kind === 'bess' ? { hours: bessHours(state) } : {}),
      ...(blocked ? { blocked } : {}),
    })
  }
  return out
}

/** The capex of a build: size in kW, blocks or MW as energyChoices. Null if not on sale. */
export function buildCostUsd(state: GameState, site: Site, kind: EnergyKind, size: number, hours?: number): number | null {
  const unit = unitPriceUsd(state, site, kind, hours)
  if (unit === null) return null
  if (kind === 'home_battery') return roundCents(unit * size)
  return roundCents(unit * (isOwnedKind(kind) ? size : size * 1000))
}

/** Quarters to build. */
export function buildQuarters(kind: EnergyKind): number {
  return isOwnedKind(kind) ? ENERGY.owned[kind].build_quarters : ENERGY.site_assets[kind].build_quarters
}

export interface EnergyBuild {
  siteId: string
  kind: EnergyKind
  size: number
  hours?: number
}

/** Why this build can't happen now, or undefined. */
export function buildEnergyBlocker(state: GameState, b: EnergyBuild): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const site = state.sites.find((s) => s.id === b.siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (!ENERGY_KINDS.includes(b.kind)) return { key: 'error.bad_choice' }
  const blocked = kindBlocker(state, site, b.kind)
  if (blocked) return blocked
  if (!(b.size > 0) || b.size > roomLeft(site, b.kind) + 1e-9) return { key: 'error.energy_no_room' }
  if (b.kind === 'bess' && !bessHours(state).includes(b.hours ?? 4)) return { key: 'error.bad_choice' }
  const cost = buildCostUsd(state, site, b.kind, b.size, b.hours)!
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

/**
 * Builds an energy asset: pays the quoted capex now; a class's overrun is drawn now (hidden) and settled when it's
 * ready; small wind draws its real capacity factor; iron-air may slip 4 quarters (doc 38 §4.2, §4.8, §5.7).
 */
export function buildEnergy(state: GameState, b: EnergyBuild): void {
  const site = state.sites.find((s) => s.id === b.siteId)!
  const cost = buildCostUsd(state, site, b.kind, b.size, b.hours)!
  const id = `en-${state.nextId++}`
  const r = substream(state.seed, `energy:build:${id}`)
  const asset: EnergyAsset = {
    id,
    kind: b.kind,
    kw: b.kind === 'home_battery'
      ? (b.size * ENERGY.owned.home_battery.block_kwh) / ENERGY.owned.home_battery.ride_through_hours
      : isOwnedKind(b.kind) ? b.size : b.size * 1000,
    capexUsd: cost,
    builtQuarter: state.quarter,
    readyQuarter: state.quarter + buildQuarters(b.kind),
  }
  if (b.kind === 'home_battery') asset.blocks = b.size
  if (b.kind === 'bess') asset.hours = b.hours ?? 4
  if (b.kind === 'small_wind') asset.cf = roundCents(uniform(r, ...ENERGY.owned.small_wind.cf_realised) * 100) / 100
  const cls = b.kind === 'small_wind' ? ENERGY.owned.small_wind.overrun_class : isOwnedKind(b.kind) ? null : ENERGY.site_assets[b.kind].overrun_class
  if (cls) {
    const m = drawOverrun(r, cls)
    if (m !== 1) asset.overrunUsd = roundCents((m - 1) * cost)
  }
  if (b.kind === 'iron_air' && chance(r, ENERGY.site_assets.iron_air.slip_chance))
    asset.readyQuarter += ENERGY.site_assets.iron_air.slip_quarters
  state.cash = roundCents(state.cash - cost)
  ;(site.energy ??= []).push(asset)
  logEntry(state, 'log.energy.built', { ...siteParams(site), energyKind: b.kind, costUsd: cost })
  // The prologue's tape note (doc 38 §4.1): the year the roof pays for itself at a household's retail price (the
  // garage's), whoever pays the bill.
  if (b.kind === 'rooftop_solar' && state.act === 0) {
    const garage = CONTENT.siteTiers.find((t) => t.id === 'garage')
    const retail = garage?.power_path?.[label(actFirstQuarter(1)).slice(0, 4)] ?? 0
    const saving = asset.kw * capacityFactor(site, asset) * HOURS_Q * 4 * retail - runningUsdYr(asset)
    if (saving > 0)
      logEntry(state, 'log.energy.solar_tape', { year: String(yearOf(state.quarter) + Math.ceil(cost / saving)) })
  }
}

/** Repair a broken small wind turbine: 10% of its capex (doc 38 §4.2). */
export function repairEnergyBlocker(state: GameState, siteId: string, assetId: string): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const a = state.sites.find((s) => s.id === siteId)?.energy?.find((x) => x.id === assetId)
  if (!a?.broken) return { key: 'error.bad_choice' }
  const cost = repairCostUsd(a)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

export const repairCostUsd = (a: EnergyAsset) => roundCents(a.capexUsd * ENERGY.owned.small_wind.repair_share_of_capex)

export function repairEnergy(state: GameState, siteId: string, assetId: string): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const a = site.energy!.find((x) => x.id === assetId)!
  const cost = repairCostUsd(a)
  state.cash = roundCents(state.cash - cost)
  delete a.broken
  logEntry(state, 'log.energy.repaired', { ...siteParams(site), costUsd: cost })
}

// ---------- What it does ----------

/** The capacity factor a solar or wind asset runs at here (small wind: its realised one; on the card the pitch). */
export function capacityFactor(site: Site, a: EnergyAsset): number {
  const region = regionOf(site) ?? ''
  switch (a.kind) {
    case 'rooftop_solar':
      return ENERGY.owned.rooftop_solar.cf_by_region[region] ?? ENERGY.owned.rooftop_solar.cf
    case 'small_wind':
      return a.cf ?? ENERGY.owned.small_wind.cf_pitched
    case 'btm_solar':
    case 'btm_wind':
      return ENERGY.site_assets[a.kind].cf_by_region[region] ?? 0
    default:
      return 0
  }
}

/** True once a small wind turbine's first quarter report is out: its real capacity factor shows from then. */
export const windRevealed = (state: GameState, a: EnergyAsset) => state.quarter > a.readyQuarter

/** The power price at the site this quarter, $/kWh (the prologue's household price is 0 while you live at home). */
export function sitePriceUsdKwh(state: GameState, site: Site): number {
  return state.act === 0 ? prologueSitePrice(state, site) : powerPriceUsdKwh(site, state.quarter, scenarioOf(state))
}

/** The site's load over a quarter, kWh: its placed machines, hosting and projects, up to its energized power. */
export function siteLoadKwhQ(state: GameState, site: Site): number {
  if (state.act === 0) return prologueSiteLoadKw(state, site.id) * HOURS_Q
  return Math.min(usedKw(state, site.id), poweredKw(site, state.quarter)) * HOURS_Q
}

/** Upkeep a year, $: per kW for solar, wind, a utility battery and iron-air (none for a home battery). */
export function runningUsdYr(a: EnergyAsset): number {
  switch (a.kind) {
    case 'rooftop_solar':
    case 'small_wind':
      return ENERGY.owned[a.kind].running_usd_kw_yr * a.kw
    case 'bess':
    case 'btm_solar':
    case 'btm_wind':
      return ENERGY.site_assets[a.kind].running_usd_kw_yr * a.kw
    default:
      return 0
  }
}

const isGenerator = (k: EnergyKind) => k === 'rooftop_solar' || k === 'small_wind' || k === 'btm_solar' || k === 'btm_wind'

/**
 * A quarter's bill offset at a site, $ (doc 38 §4.1, §4.9): the generators' kWh × the site's price, capped. Owned
 * generation with net metering (to 2022Q3) offsets up to the whole bill; without it, daytime load only, surplus
 * wasted. Behind-the-meter solar and wind are self-consumption only: up to the site's load.
 */
export function billOffsetUsd(state: GameState, site: Site, opts: { pitched?: boolean } = {}): number {
  const gens = assetsOf(site).filter((a) => isGenerator(a.kind) && isWorking(a, state.quarter))
  if (gens.length === 0) return 0
  const kwh = (a: EnergyAsset) =>
    a.kw * (opts.pitched && a.kind === 'small_wind' ? ENERGY.owned.small_wind.cf_pitched : capacityFactor(site, a)) * HOURS_Q
  const owned = gens.filter((a) => isOwnedKind(a.kind)).reduce((n, a) => n + kwh(a), 0)
  const btm = gens.filter((a) => !isOwnedKind(a.kind)).reduce((n, a) => n + kwh(a), 0)
  const load = siteLoadKwhQ(state, site)
  const net = label(state.quarter) < ENERGY.net_metering_until
  const ownedCap = net ? load : load * ENERGY.daylight_share
  const used = Math.min(owned, ownedCap) + Math.min(btm, Math.max(0, load - Math.min(owned, ownedCap)))
  return used * sitePriceUsdKwh(state, site)
}

/**
 * Years for an asset to pay back its capex from the bill offset at today's price and load, or null if it never does
 * (the card's honesty line, doc 38 §4.1). Small wind uses its pitched capacity factor until it's revealed.
 */
export function paybackYears(state: GameState, site: Site, a: EnergyAsset): number | null {
  if (!isGenerator(a.kind)) return null
  const cf = a.kind === 'small_wind' && !windRevealed(state, a) ? ENERGY.owned.small_wind.cf_pitched : capacityFactor(site, a)
  const load = siteLoadKwhQ(state, site) * 4
  const genYr = a.kw * cf * HOURS_Q * 4
  const net = label(state.quarter) < ENERGY.net_metering_until
  const cap = isOwnedKind(a.kind) && !net ? load * ENERGY.daylight_share : isOwnedKind(a.kind) ? Infinity : load
  // The card's quote before any load: as if the site's load took it all (net metering), else nothing to offset.
  const kwh = Math.min(genYr, load > 0 ? cap : isOwnedKind(a.kind) && net ? Infinity : 0)
  const saving = kwh * sitePriceUsdKwh(state, site) - runningUsdYr(a)
  return saving > 0 ? a.capexUsd / saving : null
}

/** Effective $/MWh of a generator on the card (doc 38 §4.1): (capex × CRF + upkeep) ÷ MWh a year. */
export function effectiveUsdMwh(site: Site, a: EnergyAsset): number | null {
  if (!isGenerator(a.kind)) return null
  const { rate, years } = ENERGY.crf
  const crf = (rate * (1 + rate) ** years) / ((1 + rate) ** years - 1)
  const cf = a.kind === 'small_wind' ? ENERGY.owned.small_wind.cf_pitched : capacityFactor(site, a)
  const mwh = (a.kw * cf * 8760) / 1000
  return mwh > 0 ? (a.capexUsd * crf + runningUsdYr(a)) / mwh : null
}

/** The battery's PJM capacity payment for a quarter, $ (doc 38 §4.8 (4)): price × derate × MW × 91 days, faded. */
export function capacityPaymentUsd(state: GameState, site: Site, a: EnergyAsset, pjmUsdMwDay: number | undefined): number {
  const b = ENERGY.site_assets.bess
  const region = regionOf(site) as PowerRegion | undefined
  if (a.kind !== 'bess' || !isWorking(a, state.quarter) || pjmUsdMwDay === undefined) return 0
  if (!region || !b.capacity_regions.includes(region) || label(state.quarter) < b.capacity_from) return 0
  const years = Math.max(0, (state.quarter - a.readyQuarter) / 4)
  const fade = (1 - b.fade_per_year) ** years
  return (a.kw / 1000) * pjmUsdMwDay * 91 * (b.capacity_derate[String(a.hours ?? 4)] ?? 0) * fade
}

// ---------- The quarter's end ----------

export interface EnergyQuarter {
  revenueUsd: number
  costUsd: number
}

/**
 * At a quarter's end, for every site with an energy asset: an asset finished this quarter settles its overrun and
 * any Heat it brings; working generators offset the bill; upkeep is paid; batteries earn capacity payments; the
 * yearly chances (a wind breakdown or noise complaint, a battery fire) are rolled; then Texas's credits
 * (texasPower.ts). Cash moves here; the caller books the totals.
 */
export function endQuarterEnergy(state: GameState, pjmUsdMwDay?: number): EnergyQuarter {
  let revenueUsd = 0
  let costUsd = 0
  for (const site of state.sites) {
    if (!site.energy?.length) continue
    const r = substream(state.seed, `energy:q${state.quarter}:${site.id}`)
    for (const a of [...site.energy]) {
      if (a.readyQuarter === state.quarter) {
        // An overrun is capex, not EBITDA: paid from cash, added to the asset's cost.
        if (a.overrunUsd) {
          state.cash -= a.overrunUsd
          a.capexUsd = roundCents(a.capexUsd + a.overrunUsd)
          logEntry(state, a.overrunUsd > 0 ? 'log.energy.overrun' : 'log.energy.underrun', {
            ...siteParams(site),
            energyKind: a.kind,
            costUsd: Math.abs(a.overrunUsd),
          })
          delete a.overrunUsd
        }
        const heat = heatOnce(site, a)
        if (heat !== 0) addGrievance(state, site.id, heat)
        logEntry(state, 'log.energy.ready', { ...siteParams(site), energyKind: a.kind })
      }
      if (a.readyQuarter > state.quarter) continue
      costUsd += runningUsdYr(a) / 4
      if (a.kind === 'bess') revenueUsd += capacityPaymentUsd(state, site, a, pjmUsdMwDay)
      rollAssetChances(state, site, a, r, (usd) => (costUsd += usd))
    }
    revenueUsd += billOffsetUsd(state, site)
  }
  const texas = endQuarterTexas(state)
  revenueUsd += texas.revenueUsd
  state.cash = roundCents(state.cash + revenueUsd - costUsd)
  return { revenueUsd, costUsd }
}

/** The Heat an asset brings when it's finished (doc 38 §4.1, §4.9). */
function heatOnce(site: Site, a: EnergyAsset): number {
  if (a.kind === 'rooftop_solar') {
    const h = ENERGY.owned.rooftop_solar.heat_once
    return h.tiers.includes(site.tier) ? h.delta : 0
  }
  if (a.kind === 'btm_solar' || a.kind === 'btm_wind') return ENERGY.site_assets[a.kind].heat_once
  return 0
}

/** The yearly chances, rolled per quarter: a wind breakdown or complaint, a battery fire. */
function rollAssetChances(
  state: GameState,
  site: Site,
  a: EnergyAsset,
  r: ReturnType<typeof substream>,
  cost: (usd: number) => void,
): void {
  const where = { ...siteParams(site) }
  if (a.kind === 'small_wind') {
    const w = ENERGY.owned.small_wind
    if (!a.broken && chance(r, perQuarter(w.breakdown_per_year))) {
      a.broken = true
      logEntry(state, 'log.energy.wind_broken', { ...where, costUsd: repairCostUsd(a) })
    }
    if (chance(r, perQuarter(w.noise_per_year))) {
      addGrievance(state, site.id, w.noise_heat)
      logEntry(state, 'log.energy.wind_noise', where)
    }
  } else if (a.kind === 'btm_wind') {
    const w = ENERGY.site_assets.btm_wind
    if (chance(r, perQuarter(w.complaint_per_year))) {
      addGrievance(state, site.id, w.complaint_heat)
      logEntry(state, 'log.energy.wind_noise', where)
    }
  } else if (a.kind === 'home_battery') {
    const b = ENERGY.owned.home_battery
    if (chance(r, perQuarter(b.fire_per_year))) {
      site.energy = site.energy!.filter((x) => x.id !== a.id)
      cost(b.fire_damage_usd)
      logEntry(state, 'log.energy.battery_fire', { ...where, costUsd: b.fire_damage_usd })
    }
  } else if (a.kind === 'bess') {
    const b = ENERGY.site_assets.bess
    if (chance(r, perQuarter(b.fire_per_year))) {
      const usd = roundCents(a.capexUsd * b.fire_repair_share)
      cost(usd)
      addGrievance(state, site.id, b.fire_heat)
      logEntry(state, 'log.energy.bess_fire', { ...where, costUsd: usd })
    }
  }
}

/** Books a quarter's energy totals into the quarter's stats (only when there was any, so other quarters are untouched). */
export function bookEnergy(state: GameState, q: EnergyQuarter): void {
  if (q.revenueUsd === 0 && q.costUsd === 0 && !state.sites.some((s) => s.energy?.length || s.dr)) return
  const st = state.quarterStats
  st.energyRevenueUsd = (st.energyRevenueUsd ?? 0) + q.revenueUsd
  st.energyCostUsd = (st.energyCostUsd ?? 0) + q.costUsd
}
