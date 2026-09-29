// Grid curtailment (scope §2.7, review A8): in a summer heat wave the Texas grid asks
// miners to switch off for a week and pays them for it. The alert comes at the end of a
// week; if you agree, the Texas machines sit out the next week and the credit is paid then.
// The rolls use their own stream (substream), so they don't change the rest of the game.
import {
  CONTENT,
  isActIIQuarter,
  type MarketWeek,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream, uniform } from '../rng.ts'
import {
  logEntry,
  type CurtailOffer,
  type GameState,
  type Project,
  type Site,
} from '../state.ts'
import { addGrievance } from './heat.ts'
import { getModel, marketWeek, quarterWeeks, scenarioOf } from './market.ts'
import type { LotWeek } from './mining.ts'
import { mineWeek } from './mining.ts'
import { annualContractUsd } from './projects.ts'
import { directCurtailment } from './regions.ts'
import { getTier, poweredKw, regionOf } from './sites.ts'

/** The 1-based week after which the grid asks this quarter, or null if it doesn't. */
export function curtailmentAlertWeek(state: GameState): number | null {
  const rules = CONTENT.curtailment
  const label = CONTENT.quarters[state.quarter]
  if (!label.endsWith(`Q${rules.quarterOfYear}`)) return null
  const r = substream(state.seed, `curtailment:${state.quarter}`)
  if (uniform(r, 0, 1) >= rules.chancePerQuarter) return null
  return randomInt(r, ...rules.alertAfterWeek)
}

/**
 * A site the grid can curtail: the curtailment tier (Texas); in Act II, any site in ERCOT (the
 * lifeline's and scouted Texas sites too; mine).
 */
export function isGridSite(state: GameState, site: Site): boolean {
  if (site.tier === CONTENT.curtailment.siteTier) return true
  return isActIIQuarter(state.quarter) && regionOf(site) === 'ercot'
}

/** True for a machine batch on a site the grid can curtail. */
function onGridSite(state: GameState, lotId: string): boolean {
  const lot = state.machines.find((l) => l.id === lotId)
  const site = lot && state.sites.find((s) => s.id === lot.siteId)
  return !!site && isGridSite(state, site)
}

/** Live AI projects at the sites the grid can curtail (Act II). */
export function curtailedProjects(state: GameState): Project[] {
  return state.projects.filter((p) => {
    const site = state.sites.find((s) => s.id === p.siteId)
    return p.stage === 'live' && !!site && isGridSite(state, site)
  })
}

/**
 * "Curtailment rights": the contract type's curtail_credit_mult (sites.json power_options;
 * index 1.5, fixed 1). A site without a contract gets 1.
 */
export function curtailCreditMult(site: Site): number {
  const type = site.contract?.type
  return type
    ? (getTier(site.tier)!.power_options?.[type].curtail_credit_mult ?? 1)
    : 1
}

/**
 * What curtailing the Texas machines in market week `w` would forgo and pay: per site,
 * max(credit per MW × MW, forgone_revenue_mult × forgone revenue) × curtailment rights.
 */
export function curtailOffer(state: GameState, w: MarketWeek): CurtailOffer {
  const rules = CONTENT.curtailment
  // What the machines would earn at normal prices (the storm doesn't shrink the credit).
  const lots = mineWeek(state, w, { ignoreStorm: true }).filter(
    (l) => l.running && onGridSite(state, l.lotId),
  )
  let mw = 0
  let forgoneUsd = 0
  let creditUsd = 0
  for (const site of state.sites) {
    if (!isGridSite(state, site)) continue
    let siteKw = 0
    let siteForgone = 0
    for (const l of lots) {
      const lot = state.machines.find((x) => x.id === l.lotId)!
      if (lot.siteId !== site.id) continue
      siteKw += l.working * getModel(lot.model)!.power_kw
      siteForgone += l.revenueUsd
    }
    mw += siteKw / 1000
    forgoneUsd += siteForgone
    creditUsd +=
      Math.max(
        rules.creditUsdPerMw * (siteKw / 1000),
        rules.forgoneRevenueMult * siteForgone,
      ) * curtailCreditMult(site)
  }
  // Act II: AI halls there go dark too, and owe their tenants an SLA credit (a share of a month's
  // charge); SB6 lets ERCOT curtail sites of 75 MW and up directly from 2026Q1.
  const ai = curtailedProjects(state)
  if (ai.length === 0 && !isActIIQuarter(state.quarter))
    return { mw, forgoneUsd, creditUsd }
  const slaUsd = ai.reduce(
    (sum, p) =>
      sum + monthlyChargeUsd(p) * CONTENT.projects.slaPenaltyShareMonth,
    0,
  )
  const sb6 = directCurtailment('ercot', state.quarter)
  const forced =
    !!sb6 &&
    state.sites.some(
      (s) =>
        isGridSite(state, s) &&
        regionOf(s) === 'ercot' &&
        // Per site, on its energized MW (owner, 28 Sep 2026).
        poweredKw(s, state.quarter) >= sb6.minKw,
    )
  return {
    mw,
    forgoneUsd,
    creditUsd,
    aiMw: ai.reduce((kw, p) => kw + p.kw, 0) / 1000,
    slaUsd,
    ...(forced ? { forced } : {}),
  }
}

/** A live AI project's monthly charge: a twelfth of its year's rent or GPU-hours. */
function monthlyChargeUsd(p: Project): number {
  if (p.tenant) return annualContractUsd(p) / 12
  // A cluster on spot has no tenant to owe (mine: no SLA on spot).
  return 0
}

/**
 * After a week is played: if this is the week the grid asks, and Texas machines would
 * be mining next week, pause for the curtailment alert. Counts toward the 3 per quarter.
 */
export function checkCurtailment(state: GameState): void {
  if (state.interrupt) return
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) return
  if (curtailmentAlertWeek(state) !== state.week + 1) return
  const next = state.week + 1
  if (next >= quarterWeeks(state.quarter, scenarioOf(state))!.length) return
  const offer = curtailOffer(
    state,
    marketWeek(state.quarter, next, scenarioOf(state)),
  )
  if (offer.mw <= 0 && (offer.aiMw ?? 0) <= 0) return
  state.interrupt = {
    id: 'curtailment',
    week: state.week,
    coin: 'BTC',
    changePct: 0,
    curtail: offer,
  }
  state.interruptsThisQuarter++
}

/** Curtail (the Texas machines sit out next week, for the credit) or keep mining. */
export function resolveCurtailment(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  const offer = active.curtail!
  if (choiceId === 'curtail') {
    state.curtailment = {
      week: active.week + 1,
      creditUsd: offer.creditUsd,
      ...(offer.slaUsd ? { slaUsd: offer.slaUsd } : {}),
    }
    logEntry(
      state,
      'log.curtail_agreed',
      { creditUsd: offer.creditUsd, week: active.week + 2 },
      active.week + 1,
    )
  } else if (choiceId === 'mine' && !offer.forced) {
    for (const site of state.sites) {
      if (isGridSite(state, site))
        addGrievance(state, site.id, CONTENT.heat.keepMining)
    }
    logEntry(
      state,
      'log.curtail_declined',
      { creditUsd: offer.creditUsd },
      active.week + 1,
    )
  } else return { key: 'error.bad_choice' }
  state.interrupt = null
}

/**
 * The agreed curtailment week: Texas batches mine nothing and use no power, and the credit is
 * paid; in Act II the AI halls there go dark too and their tenants' SLA credit is paid. Returns
 * the batches to settle, the credit, the SLA credit and the sites whose AI halls are off (0 and
 * none in other weeks).
 */
export function applyCurtailment(
  state: GameState,
  lots: LotWeek[],
): { lots: LotWeek[]; creditUsd: number; slaUsd: number; siteIds: string[] } {
  const c = state.curtailment
  if (!c || c.week !== state.week)
    return { lots, creditUsd: 0, slaUsd: 0, siteIds: [] }
  state.curtailment = null
  state.cash += c.creditUsd - (c.slaUsd ?? 0)
  const siteIds = state.sites
    .filter((s) => isGridSite(state, s))
    .map((s) => s.id)
  return {
    slaUsd: c.slaUsd ?? 0,
    siteIds,
    lots: lots.map((l) =>
      onGridSite(state, l.lotId)
        ? {
            ...l,
            running: false,
            revenueUsd: 0,
            powerCostUsd: 0,
            coinsMined: 0,
          }
        : l,
    ),
    creditUsd: c.creditUsd,
  }
}

// ---------- Winter Storm Uri (shocks.json) ----------

/** The market shock (Uri) in force for market week `weekIndex` of this quarter, if any. */
export function shockAt(state: GameState, weekIndex: number) {
  return CONTENT.shocks.find(
    (sh) =>
      sh.quarter === state.quarter &&
      weekIndex >= sh.week &&
      weekIndex < sh.week + sh.weeks,
  )
}

/**
 * The week before a shock: if Texas machines would mine during it, the grid asks you to
 * curtail (same offer and credits as a curtailment). It is always asked and doesn't count
 * toward the 3 interrupts per quarter.
 */
export function checkUri(state: GameState): void {
  if (state.interrupt) return
  const next = state.week + 1
  const shock = shockAt(state, next)
  if (!shock || shock.week !== next) return
  const offer = curtailOffer(
    state,
    marketWeek(state.quarter, next, scenarioOf(state)),
  )
  offer.stormUsd = stormChargeUsd(state, next)
  if (offer.mw <= 0 && offer.stormUsd <= 0) return
  state.interrupt = {
    id: 'uri',
    week: state.week,
    coin: 'BTC',
    changePct: 0,
    curtail: offer,
  }
}

/**
 * Uri's storm charge for market week `weekIndex`: every index-contract site pays the storm
 * price on its firm load (the full power draw of its delivered machines, broken ones
 * included) for the whole week. 0 outside the storm.
 */
export function stormChargeUsd(state: GameState, weekIndex: number): number {
  const shock = shockAt(state, weekIndex)
  if (!shock) return 0
  let usd = 0
  for (const site of state.sites) {
    if (site.contract?.type !== 'index') continue
    const kw = state.machines
      .filter(
        (lot) =>
          lot.siteId === site.id && state.quarter >= lot.earnsFromQuarter - 1,
      )
      .reduce((sum, lot) => {
        const units = shock.firmLoadIncludesBroken
          ? lot.count
          : lot.count - lot.failed
        return sum + units * getModel(lot.model)!.power_kw
      }, 0)
    usd += kw * 24 * 7 * shock.stormPriceUsdKwh
  }
  return usd
}
