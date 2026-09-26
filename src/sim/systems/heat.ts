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
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream, uniform } from '../rng.ts'
import { logEntry, type GameState, type Site } from '../state.ts'
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
  /** Quarter of the last "talk to the neighbours" here (once per site per quarter), or null. */
  outreachQuarter: number | null
}

export function newSiteHeat(): SiteHeat {
  return {
    value: 0,
    load: 0,
    grievance: 0,
    mitigated: false,
    outreachQuarter: null,
  }
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

// ---------- outreach and noise mitigation (Plan phase) ----------

/** A money rule from heat.json for a site: per_mw × usable MW, kept between min and max. */
function costFor(
  site: Site,
  rule: { perMwUsd: number; minUsd: number; maxUsd: number },
): number {
  const mw = capacityKw(site) / 1000
  return Math.min(rule.maxUsd, Math.max(rule.minUsd, rule.perMwUsd * mw))
}

export function outreachCostUsd(site: Site): number {
  return costFor(site, CONTENT.heat.outreach)
}

export function mitigationCostUsd(site: Site): number {
  return costFor(site, CONTENT.heat.mitigation)
}

/** Why outreach at this site can't happen now, or undefined. Checks only. */
export function outreachBlocker(
  state: GameState,
  siteId: string,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (heatOf(state, siteId).outreachQuarter === state.quarter)
    return { key: 'error.outreach_done', params: { tier: site.tier } }
  const bw = CONTENT.heat.outreach.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  const costUsd = outreachCostUsd(site)
  if (costUsd > state.cash)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
}

/** Talk to the neighbours: pay, spend Bandwidth, grievance down (goodwill at most −10). */
export function doOutreach(state: GameState, siteId: string): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const costUsd = outreachCostUsd(site)
  state.bandwidth -= CONTENT.heat.outreach.bandwidth
  state.cash -= costUsd
  heatOf(state, siteId).outreachQuarter = state.quarter
  addGrievance(state, siteId, CONTENT.heat.outreach.grievance)
  logEntry(state, 'log.outreach', {
    tier: site.tier,
    costUsd,
    heat: Math.round(siteHeatValue(state, siteId)),
  })
}

/** Why noise mitigation can't be built here now, or undefined. Checks only. */
export function mitigationBlocker(
  state: GameState,
  siteId: string,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (CONTENT.heat.mitigation.once && heatOf(state, siteId).mitigated)
    return { key: 'error.mitigation_done', params: { tier: site.tier } }
  const bw = CONTENT.heat.mitigation.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  const costUsd = mitigationCostUsd(site)
  if (costUsd > state.cash)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
}

/** Noise mitigation (or the complaint's sound walls): base Heat down for good, once per site. */
export function doMitigation(
  state: GameState,
  siteId: string,
  week: number | null = null,
): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const costUsd = mitigationCostUsd(site)
  state.bandwidth -= CONTENT.heat.mitigation.bandwidth
  state.cash -= costUsd
  heatOf(state, siteId).mitigated = true
  recalcHeat(state, site)
  logEntry(
    state,
    'log.mitigated',
    {
      tier: site.tier,
      costUsd,
      heat: Math.round(siteHeatValue(state, siteId)),
    },
    week,
  )
}

// ---------- neighbour complaints (interrupts.json neighbour_complaint) ----------

/**
 * At the start of the live quarter: a complaint carried over from last quarter keeps its
 * site; otherwise roll once for the hottest site at or above complaint_at, with chance
 * (Heat − complaint_chance_offset)%. Either way it comes after a random week. At most one
 * per quarter. The rolls use their own stream, so they don't change the rest of the game.
 */
export function scheduleComplaint(state: GameState): void {
  const r = substream(state.seed, `complaint:${state.quarter}`)
  const week = randomInt(r, 1, BALANCE.weeksPerQuarter)
  const carried = state.complaint
  if (carried && state.sites.some((s) => s.id === carried.siteId)) {
    state.complaint = { siteId: carried.siteId, week }
    return
  }
  state.complaint = null
  const { site, value } = hottestSite(state)
  const rules = CONTENT.heat
  if (value < rules.complaintAt) return
  if (uniform(r, 0, 1) >= (value - rules.complaintChanceOffset) / 100) return
  state.complaint = { siteId: site.id, week }
}

/**
 * After a week is played: if the scheduled complaint is due, pause for it. If another
 * interrupt is showing, it tries again next week; if this quarter's interrupts are used
 * up, it waits for next quarter (it is never answered for you).
 */
export function checkComplaint(state: GameState): void {
  const c = state.complaint
  if (!c || state.interrupt || state.week + 1 < c.week) return
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) return
  const site = state.sites.find((s) => s.id === c.siteId)
  state.complaint = null
  if (!site) return
  state.interrupt = {
    id: 'neighbour_complaint',
    week: state.week,
    coin: 'BTC',
    changePct: 0,
    siteId: site.id,
  }
  state.interruptsThisQuarter++
}

function complaintEffect(choiceId: string, key: string): number {
  const choice = CONTENT.interrupts.byId.neighbour_complaint?.choices?.find(
    (c) => c.id === choiceId,
  )
  return Number(choice?.effects?.[key] ?? 0)
}

/** What paying the neighbours costs (interrupts.json: pay › cash). */
export function complaintPayUsd(): number {
  return -complaintEffect('pay', 'cash')
}

/** Grievance change from paying (interrupts.json: pay › grievance). */
export function complaintPayGrievance(): number {
  return complaintEffect('pay', 'grievance')
}

/** Answers a complaint can take now: pay and sound walls only if affordable (walls once per site). */
export function complaintChoices(state: GameState): string[] {
  const siteId = state.interrupt?.siteId
  if (!siteId) return []
  const site = state.sites.find((s) => s.id === siteId)
  const out: string[] = []
  if (state.cash >= complaintPayUsd()) out.push('pay')
  if (
    site &&
    !heatOf(state, siteId).mitigated &&
    state.cash >= mitigationCostUsd(site)
  )
    out.push('mitigate')
  out.push('ignore')
  return out
}

/** Pay (grievance −10), build sound walls (= noise mitigation) or ignore (grievance +10). */
export function resolveComplaint(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  if (!complaintChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const siteId = active.siteId!
  const site = state.sites.find((s) => s.id === siteId)!
  const week = active.week + 1
  if (choiceId === 'pay') {
    const costUsd = complaintPayUsd()
    state.cash -= costUsd
    addGrievance(state, siteId, complaintPayGrievance())
    logEntry(state, 'log.complaint_paid', { tier: site.tier, costUsd }, week)
  } else if (choiceId === 'mitigate') {
    doMitigation(state, siteId, week)
  } else {
    addGrievance(state, siteId, CONTENT.heat.ignoreComplaint)
    logEntry(
      state,
      'log.complaint_ignored',
      { tier: site.tier, heat: Math.round(siteHeatValue(state, siteId)) },
      week,
    )
  }
  state.interrupt = null
}
