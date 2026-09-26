// Community Heat (scope §2.2, review A3, heat.json): how annoyed a site's neighbours,
// council and utility are, 0–100 per site.
//   Heat = base + load + grievance + era, clamped to 0–100.
// base: the tier's heat_base, a noise_ordinance flaw's heat_base, and noise mitigation.
// load: heat_load_max × running MW ÷ site capacity (garage: heat_per_unit_garage per
//   running unit). Only machines that actually mined this week count.
// grievance: ignored complaints and "keep mining" in a curtailment add to it, outreach
//   takes it down (to at most grievance_min, i.e. goodwill); it fades toward 0 each quarter.
// era: extra pressure on big sites from era_pressure.from.
// A hostile_council flaw multiplies every increase (load, grievance, era).
import { CONTENT } from '../../content/index.ts'
import type { GameState, Site } from '../state.ts'
import { getModel } from './market.ts'
import type { LotWeek } from './mining.ts'
import { capacityKw, flawEffect, getTier } from './sites.ts'

export interface SiteHeat {
  /** Heat now (0–100), recalculated every week and after anything that changes it. */
  value: number
  /** The load part, from the last week played. */
  load: number
  /** Grievances (positive) or goodwill (negative, down to grievance_min). */
  grievance: number
  /** Noise mitigation (or the complaint's sound walls) done: base Heat lowered for good. */
  mitigated: boolean
}

export function newSiteHeat(): SiteHeat {
  return { value: 0, load: 0, grievance: 0, mitigated: false }
}

/** The site's Heat record, created on first use. */
export function heatOf(state: GameState, siteId: string): SiteHeat {
  state.siteHeat[siteId] ??= newSiteHeat()
  return state.siteHeat[siteId]
}

/** Heat now at a site, reading only (0 for a site without a record yet). */
export function siteHeatValue(state: GameState, siteId: string): number {
  return state.siteHeat[siteId]?.value ?? 0
}

/** hostile_council: every Heat increase at this site is multiplied by this. */
export function growthMult(site: Site): number {
  return flawEffect(site, 'heat_growth_mult') ?? 1
}

/** Base Heat: tier, noise_ordinance flaw and noise mitigation. */
export function baseHeat(state: GameState, site: Site): number {
  return (
    getTier(site.tier)!.heat_base +
    (flawEffect(site, 'heat_base') ?? 0) +
    (heatOf(state, site.id).mitigated ? CONTENT.heat.mitigation.heatBase : 0)
  )
}

/** Era pressure: from era.from, at sites of at least era.minMw. */
export function eraHeat(state: GameState, site: Site): number {
  const { from, minMw, value } = CONTENT.heat.era
  const on =
    CONTENT.quarters[state.quarter] >= from && capacityKw(site) >= minMw * 1000
  return on ? value * growthMult(site) : 0
}

/** The load part for this week's running batches. */
export function loadHeat(
  state: GameState,
  site: Site,
  lots: LotWeek[],
): number {
  const tier = getTier(site.tier)!
  let perUnit = 0
  let runningKw = 0
  for (const l of lots) {
    if (!l.running) continue
    const lot = state.machines.find((x) => x.id === l.lotId)
    if (!lot || lot.siteId !== site.id) continue
    const model = getModel(lot.model)!
    perUnit += l.working * model.heat_per_unit_garage
    runningKw += l.working * model.power_kw
  }
  const raw =
    tier.id === 'garage'
      ? perUnit
      : tier.heat_load_max * Math.min(1, runningKw / capacityKw(site))
  return raw * growthMult(site)
}

/** Recalculates one site's Heat from its parts. */
export function recalcHeat(state: GameState, site: Site): void {
  const h = heatOf(state, site.id)
  const total =
    baseHeat(state, site) + h.load + h.grievance + eraHeat(state, site)
  h.value = Math.min(100, Math.max(0, total))
}

/** After a week is mined: new load from what actually ran, then Heat. */
export function updateHeatWeek(state: GameState, lots: LotWeek[]): void {
  for (const site of state.sites) {
    heatOf(state, site.id).load = loadHeat(state, site, lots)
    recalcHeat(state, site)
  }
}

/** Adds a grievance (or, if negative, goodwill). Increases grow with a hostile council. */
export function addGrievance(
  state: GameState,
  siteId: string,
  amount: number,
): void {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return
  const h = heatOf(state, siteId)
  const change = amount > 0 ? amount * growthMult(site) : amount
  h.grievance = Math.max(CONTENT.heat.grievanceMin, h.grievance + change)
  recalcHeat(state, site)
}

/** At the start of a quarter: grievance and goodwill fade toward 0; era pressure may start. */
export function startQuarterHeat(state: GameState): void {
  const decay = CONTENT.heat.grievanceDecay
  for (const site of state.sites) {
    const h = heatOf(state, site.id)
    h.grievance =
      h.grievance > 0
        ? Math.max(0, h.grievance - decay)
        : Math.min(0, h.grievance + decay)
    recalcHeat(state, site)
  }
}

/** The site with the highest Heat (the first one on a tie), and its Heat. */
export function hottestSite(state: GameState): { site: Site; value: number } {
  let best = {
    site: state.sites[0],
    value: siteHeatValue(state, state.sites[0].id),
  }
  for (const site of state.sites.slice(1)) {
    const value = siteHeatValue(state, site.id)
    if (value > best.value) best = { site, value }
  }
  return best
}
