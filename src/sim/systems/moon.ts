// Act IV's lunar programme, claims and disputes (M30.2; doc 33 §9.1, §12). Claiming a polar site (1 Bandwidth, a fee,
// political capital) files your intent; it holds only once you land hardware within 6 quarters (missions: M30.3).
// Rivals and the blocs claim on scripted schedules (lunar_claims_iv.json, per future); first to land holds. An overlapping
// claim raises a dispute: spend political capital to hold, align with the claimant's bloc, share the site, or withdraw;
// unanswered, the first to land wins it.
import { BALANCE, CONTENT, act4Row } from '../../content/index.ts'
import {
  LUNAR_SITE_IDS,
  MOON,
  lunarSite,
  type LunarClaimantId,
  type LunarSiteId,
  type ResourceCategory,
} from '../../content/moonContent.ts'
import type { Message, MessageKey } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { chance, randomInt, substream } from '../rng.ts'
import { act4SeedOf, inActIV, logEntry, type Act4Moon, type GameState, type LunarClaim } from '../state.ts'
import { prospectReport } from './lunarGeology.ts'
import { scenarioOf } from './market.ts'
import { addPc, politicalCapital } from './pcState.ts'
import { staffNumber } from './hires.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)

/** The act's lunar record, created on first use. */
export function moonOf(state: GameState): Act4Moon {
  state.act4Moon ??= {
    claims: [],
    missions: [],
    disputes: [],
    offtakes: [],
    offers: [],
    megawattQuarter: null,
    alignedBloc: null,
    freezeUntil: null,
    planned: [],
    nextId: 1,
  }
  return state.act4Moon
}

/** Your live claim on a site (claimed or held), if any. */
export const claimOf = (state: GameState, site: LunarSiteId): LunarClaim | undefined =>
  state.act4Moon?.claims.find((c) => c.site === site && (c.status === 'claimed' || c.status === 'held'))

/** The scripted claims made by now (this future's), each with whether it has landed. */
export function otherClaims(state: GameState, quarter = state.quarter) {
  if (!state.futureId) return []
  return MOON.claims[state.futureId]
    .filter((c) => Q(c.claim) <= quarter)
    .map((c) => ({ ...c, landed: Q(c.lands) <= quarter }))
}

/** The bloc behind a claimant (a dispute with it can be settled by aligning with that bloc), or null. */
export function blocOf(claimant: LunarClaimantId): 'accords' | 'station' | null {
  if (claimant === 'accords_bloc') return 'accords'
  if (claimant === 'station_bloc' || claimant === 'jade_arc') return 'station'
  return null
}

/**
 * Who holds a site now from the scripted claims: the claimant, unless you landed first, a dispute you won took it off
 * the map, or it was shared. Undefined when no one else claims it.
 */
export function rivalOn(state: GameState, site: LunarSiteId) {
  const c = otherClaims(state).find((x) => x.site === site)
  if (!c) return undefined
  const yours = claimOf(state, site)
  // you landed before their claim landed: first to land holds, theirs is void (unless you agreed to share)
  if (yours?.landedQuarter !== null && yours?.landedQuarter !== undefined && yours.landedQuarter <= Q(c.lands) && !yours.sharedWith)
    return undefined
  if (state.act4Moon?.claims.some((x) => x.site === site && x.beatenClaimant === c.claimant)) return undefined
  return c
}

// ---------- claiming (1 Bandwidth, the fee, political capital) ----------

function moonPlanBlocker(state: GameState): Message | undefined {
  if (!inActIV(state)) return { key: 'error.moon_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
}

export function claimSiteBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = moonPlanBlocker(state)
  if (blocked) return blocked
  if (!LUNAR_SITE_IDS.includes(site)) return { key: 'error.moon_bad_site' }
  if (claimOf(state, site)) return { key: 'error.moon_claimed' }
  if (state.act4Moon?.claims.some((c) => c.site === site && (c.status === 'lost' || c.status === 'sold')))
    return { key: 'error.moon_lost_site' }
  const rival = rivalOn(state, site)
  if (rival?.landed) return { key: 'error.moon_held', params: { claimant: rival.claimant } }
  const c = MOON.claim
  if (state.bandwidth < c.bandwidth) return { key: 'error.no_bandwidth', params: { needed: c.bandwidth, have: state.bandwidth } }
  if (state.cash < c.fee_usd) return { key: 'error.no_cash', params: { costUsd: c.fee_usd, cashUsd: state.cash } }
  if (politicalCapital(state) < c.pc) return { key: 'error.pc_short', params: { needed: c.pc, have: politicalCapital(state) } }
}

/** Files a claim: it holds once you land by `landBy`; a rival already claiming the site raises a dispute now. */
export function claimSite(state: GameState, site: LunarSiteId): void {
  const c = MOON.claim
  state.bandwidth -= c.bandwidth
  book(state, 'lunar_capex', -c.fee_usd)
  addPc(state, -c.pc)
  const moon = moonOf(state)
  moon.claims = moon.claims.filter((x) => !(x.site === site && x.status === 'withdrawn'))
  moon.claims.push({
    site,
    claimedQuarter: state.quarter,
    landBy: state.quarter + c.land_within_quarters,
    status: 'claimed',
    landedQuarter: null,
    reports: [],
    solar: null,
    reactor: null,
    pilot: null,
    production: null,
  })
  logEntry(state, 'log.moon.claimed', { lunarSite: site, quarter: CONTENT.quarters[state.quarter + c.land_within_quarters] ?? '—' })
  const rival = rivalOn(state, site)
  if (rival) openDispute(state, site, rival.claimant)
}

function openDispute(state: GameState, site: LunarSiteId, claimant: LunarClaimantId): void {
  const moon = moonOf(state)
  if (moon.disputes.some((d) => d.site === site)) return
  moon.disputes.push({ site, claimant, raisedQuarter: state.quarter })
  logEntry(state, 'log.moon.dispute', { lunarSite: site, claimant })
}

// ---------- disputes (Plan phase) ----------

export const DISPUTE_CHOICES = ['hold', 'align', 'share', 'withdraw'] as const
export type DisputeChoice = (typeof DISPUTE_CHOICES)[number]

export function resolveDisputeBlocker(state: GameState, site: LunarSiteId, choice: DisputeChoice): Message | undefined {
  const blocked = moonPlanBlocker(state)
  if (blocked) return blocked
  const d = state.act4Moon?.disputes.find((x) => x.site === site)
  if (!d || !DISPUTE_CHOICES.includes(choice)) return { key: 'error.moon_no_dispute' }
  if (choice === 'hold' && politicalCapital(state) < MOON.dispute.pc_to_hold)
    return { key: 'error.pc_short', params: { needed: MOON.dispute.pc_to_hold, have: politicalCapital(state) } }
  if (choice === 'align') {
    const bloc = blocOf(d.claimant)
    if (!bloc) return { key: 'error.moon_no_bloc' }
    const aligned = state.act4Moon!.alignedBloc
    if (aligned && aligned !== bloc) return { key: 'error.moon_other_bloc' }
  }
}

/**
 * Settles a dispute. Hold: political capital, the claimant gives way. Align: with the claimant's bloc (its strings come
 * in M31), which gives way. Share: you both hold; you keep half the resource. Withdraw: your claim goes.
 */
export function resolveDispute(state: GameState, site: LunarSiteId, choice: DisputeChoice): void {
  const moon = moonOf(state)
  const d = moon.disputes.find((x) => x.site === site)!
  moon.disputes = moon.disputes.filter((x) => x !== d)
  const claim = claimOf(state, site)!
  if (choice === 'hold') {
    addPc(state, -MOON.dispute.pc_to_hold)
    claim.beatenClaimant = d.claimant
  } else if (choice === 'align') {
    moon.alignedBloc = blocOf(d.claimant)
    claim.beatenClaimant = d.claimant
  } else if (choice === 'share') {
    claim.sharedWith = d.claimant
  } else {
    claim.status = 'withdrawn'
  }
  logEntry(state, DISPUTE_LOG[choice], { lunarSite: site, claimant: d.claimant })
}
const DISPUTE_LOG: Record<DisputeChoice, MessageKey> = {
  hold: 'log.moon.dispute_hold',
  align: 'log.moon.dispute_align',
  share: 'log.moon.dispute_share',
  withdraw: 'log.moon.dispute_withdraw',
}

/** Your share of a site's resource (a shared site: half). */
export const resourceShare = (claim: LunarClaim): number => (claim.sharedWith ? MOON.dispute.share_resource_share : 1)

// ---------- prospect missions (M30.3; doc 33 §9.2) ----------

/** What a mission costs now: its payload at the market's Earth-to-surface delivery price, plus the rover and drill. */
export function missionCostUsd(state: GameState): number {
  return MOON.mission.payload_kg * act4Row(state.quarter, scenarioOf(state)).lunar_delivery_usd_kg + MOON.mission.rover_drill_usd
}

/** Landing success this quarter (the market's rate). */
export const landingChance = (state: GameState, quarter = state.quarter): number =>
  // (M31.4: the Lunar Programme Director adds 10 points)
  Math.min(1, (act4Row(quarter, scenarioOf(state)).landing_success_pct + staffNumber(state, 'landing_bonus_pts', 0)) / 100)

export function sendMissionBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = moonPlanBlocker(state)
  if (blocked) return blocked
  if (!claimOf(state, site)) return { key: 'error.moon_no_claim' }
  if (state.act4Moon!.missions.some((m) => m.site === site && m.status === 'en_route')) return { key: 'error.moon_mission_en_route' }
  const m = MOON.mission
  if (state.bandwidth < m.bandwidth) return { key: 'error.no_bandwidth', params: { needed: m.bandwidth, have: state.bandwidth } }
  const costUsd = missionOwnCostUsd(state)
  if (state.cash < costUsd) return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
}

/** What your next mission costs you: its price less any agency task order you accepted (M31.3). */
export const missionOwnCostUsd = (state: GameState): number =>
  Math.max(0, missionCostUsd(state) - (state.act4Moon?.missionCreditUsd ?? 0))

/** Commissions a lander, rover and drill for a claimed site: paid now, arriving 3-5 quarters later (seeded). */
export function sendMission(state: GameState, site: LunarSiteId): void {
  const moon = moonOf(state)
  const id = `lm${moon.nextId++}`
  const costUsd = missionCostUsd(state)
  const [lo, hi] = MOON.mission.lead_quarters
  const lead = randomInt(substream(act4SeedOf(state), `act4_lunar_mission:${id}`), lo, hi)
  state.bandwidth -= MOON.mission.bandwidth
  // (M31.3) an accepted agency task order pays its part
  const credit = Math.min(costUsd, moon.missionCreditUsd ?? 0)
  if (credit > 0) moon.missionCreditUsd = (moon.missionCreditUsd ?? 0) - credit
  book(state, 'lunar_capex', -(costUsd - credit))
  moon.missions.push({
    id,
    site,
    launchedQuarter: state.quarter,
    arrivalQuarter: state.quarter + lead,
    costUsd,
    status: 'en_route',
    aborts: 0,
  })
  logEntry(state, 'log.moon.mission', { lunarSite: site, costUsd, quarter: CONTENT.quarters[state.quarter + lead] ?? '—' })
}

/** The category a site's resource is reported in (doc 33 §9.2): inferred, indicated, measured. */
export function resourceCategory(claim: LunarClaim): ResourceCategory {
  if (claim.reports.some((r) => r.step === 'pilot')) return 'measured'
  return claim.reports.length > 0 ? 'indicated' : 'inferred'
}

/** Your current estimate of a site's resource (t): the latest report, or the orbital figure before any landing. */
export function estimateT(claim: LunarClaim): number {
  return claim.reports.at(-1)?.estimateT ?? MOON.inferred_t_per_site
}

/** Adds a prospect report (an estimate, never the truth: lunarGeology.ts). */
export function addReport(state: GameState, claim: LunarClaim, step: 'first' | 'second' | 'pilot'): void {
  const r = prospectReport(
    act4SeedOf(state),
    state.lunarGrade ?? 'patchy',
    claim.site,
    lunarSite(claim.site).ice_access,
    step,
    claim.reports.length,
  )
  claim.reports.push({ quarter: state.quarter, step, ...r })
  logEntry(state, 'log.moon.report', { lunarSite: claim.site, estimateT: Math.round(r.estimateT) })
}

/** A mission's landing: success secures the claim and brings a prospect report; failure loses the mission. */
function land(state: GameState, missionId: string, week: number | null): void {
  const m = state.act4Moon!.missions.find((x) => x.id === missionId)!
  const claim = claimOf(state, m.site)
  if (!claim) {
    m.status = 'lost'
    logEntry(state, 'log.moon.mission_no_claim', { lunarSite: m.site }, week)
    return
  }
  const r = substream(act4SeedOf(state), `act4_lunar_landing:${m.id}:${m.aborts}`)
  if (!chance(r, landingChance(state))) {
    m.status = 'lost'
    logEntry(state, 'log.moon.landing_failed', { lunarSite: m.site, costUsd: m.costUsd }, week)
    return
  }
  m.status = 'landed'
  if (claim.landedQuarter === null) claim.landedQuarter = state.quarter
  claim.status = 'held'
  logEntry(state, 'log.moon.landed', { lunarSite: m.site }, week)
  addReport(state, claim, claim.reports.length === 0 ? 'first' : 'second')
}

// ---------- the lunar alerts (doc 33 §14.2), planned at the end of the Plan phase ----------

export const LUNAR_ALERTS = {
  lunar_landing: ['commit', 'abort'],
  lunar_dust: ['repair', 'accept'],
} as const
export type LunarAlertId = keyof typeof LUNAR_ALERTS
export const isLunarAlert = (id: string): id is LunarAlertId => id in LUNAR_ALERTS

/** Plans this quarter's lunar alerts: a landing for each mission arriving now (M30.4 adds dust faults). */
export function planLunarLandings(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  moon.planned = moon.planned.filter((p) => p.kind !== 'lunar_landing')
  for (const m of moon.missions.filter((x) => x.status === 'en_route' && x.arrivalQuarter === state.quarter)) {
    const r = substream(act4SeedOf(state), `act4_lunar_window:${m.id}:${m.aborts}`)
    moon.planned.push({ week: randomInt(r, 1, BALANCE.weeksPerQuarter - 2), kind: 'lunar_landing', missionId: m.id })
  }
  moon.planned.sort((a, b) => a.week - b.week)
}

/** In the live quarter: a lunar alert due this week pauses the quarter (or, past the alert limit, takes its default). */
export function checkLunarAlerts(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || moon.planned.length === 0 || state.interrupt) return
  const due = moon.planned.find((p) => p.week <= state.week)
  if (!due) return
  moon.planned.splice(moon.planned.indexOf(due), 1)
  state.interrupt = {
    id: due.kind,
    week: state.week,
    coin: 'BTC',
    changePct: 0,
    ...(due.missionId ? { lunarMissionId: due.missionId } : {}),
    ...(due.site ? { lunarSite: due.site } : {}),
  }
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) {
    resolveLunarAlert(state, LUNAR_ALERTS[due.kind][0])
    return
  }
  state.interruptsThisQuarter++
}

export const lunarAlertChoices = (state: GameState): string[] =>
  state.interrupt && isLunarAlert(state.interrupt.id) ? [...LUNAR_ALERTS[state.interrupt.id]] : []

export const lunarAlertDefault = (state: GameState): string => LUNAR_ALERTS[state.interrupt!.id as LunarAlertId][0]

/** Landing: commit (the roll) or abort and retry next quarter's window. Dust: in moonOps.ts (M30.4). */
export function resolveLunarAlert(state: GameState, choice: string): Message | undefined {
  const active = state.interrupt!
  if (!lunarAlertChoices(state).includes(choice)) return { key: 'error.bad_choice' }
  const week = active.week + 1
  if (active.id === 'lunar_landing') {
    const m = state.act4Moon!.missions.find((x) => x.id === active.lunarMissionId)!
    if (choice === 'commit') land(state, m.id, week)
    else {
      m.arrivalQuarter += MOON.mission.abort_delay_quarters
      m.aborts++
      book(state, 'lunar_opex', -MOON.mission.abort_cost_usd)
      logEntry(state, 'log.moon.aborted', { lunarSite: m.site, costUsd: MOON.mission.abort_cost_usd }, week)
    }
  } else resolveDustFault(state, active.lunarSite as LunarSiteId, choice, week)
  state.interrupt = null
}

/** Safety net at a quarter's end: a mission due now whose landing alert never fired lands (the default). */
export function endQuarterMissions(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  for (const m of moon.missions.filter((x) => x.status === 'en_route' && x.arrivalQuarter === state.quarter))
    land(state, m.id, null)
  moon.planned = []
}

/** A dust fault on a running pilot (M30.4): repair it (cash) or accept lower availability. */
function resolveDustFault(state: GameState, site: LunarSiteId, choice: string, week: number): void {
  const pilot = claimOf(state, site)?.pilot
  if (!pilot) return
  const a = MOON.alerts
  if (choice === 'repair') {
    book(state, 'repairs', -a.dust_repair_usd, { biz: 'moon' })
    ;(state.quarterStats.moonCostUsd ??= 0)
    state.quarterStats.moonCostUsd += a.dust_repair_usd
    logEntry(state, 'log.moon.dust_repaired', { lunarSite: site, costUsd: a.dust_repair_usd }, week)
  } else {
    pilot.availability *= 1 - a.dust_accept_loss_share
    logEntry(state, 'log.moon.dust_accepted', { lunarSite: site, lossPct: a.dust_accept_loss_share }, week)
  }
}

// ---------- the start of a quarter: scripted claims arrive, landing clocks run out ----------

/**
 * At the start of an Act IV quarter: a scripted claim on one of your sites raises a dispute (unless you've landed
 * there first); a rival landing on a site you still dispute without having landed takes it; a claim past its landing
 * deadline lapses.
 */
export function startQuarterMoonClaims(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  for (const c of otherClaims(state)) {
    const yours = claimOf(state, c.site)
    if (!yours) continue
    if (yours.beatenClaimant === c.claimant || yours.sharedWith === c.claimant) continue
    const dispute = moon.disputes.find((d) => d.site === c.site)
    if (yours.landedQuarter !== null && yours.landedQuarter <= Q(c.lands)) {
      // you landed first: first to land holds
      if (dispute) {
        moon.disputes = moon.disputes.filter((d) => d !== dispute)
        yours.beatenClaimant = c.claimant
        logEntry(state, 'log.moon.dispute_landed_first', { lunarSite: c.site, claimant: c.claimant })
      }
      continue
    }
    if (c.landed) {
      // they landed first on a site still in dispute
      yours.status = 'lost'
      moon.disputes = moon.disputes.filter((d) => d.site !== c.site)
      logEntry(state, 'log.moon.lost_to', { lunarSite: c.site, claimant: c.claimant })
      continue
    }
    if (!dispute && Q(c.claim) === state.quarter) openDispute(state, c.site, c.claimant)
  }
  for (const claim of moon.claims) {
    if (claim.status === 'claimed' && claim.landedQuarter === null && state.quarter > claim.landBy) {
      claim.status = 'lost'
      moon.disputes = moon.disputes.filter((d) => d.site !== claim.site)
      logEntry(state, 'log.moon.lapsed', { lunarSite: claim.site })
    }
  }
}
