// Act IV's lunar programme, claims and disputes (M30.2; doc 33 §9.1, §12). Claiming a polar site (1 Bandwidth, a fee,
// political capital) files your intent; it holds only once you land hardware within 6 quarters (missions: M30.3).
// Rivals and the blocs claim on scripted schedules (lunar_claims_iv.json, per future); first to land holds. An overlapping
// claim raises a dispute: spend political capital to hold, align with the claimant's bloc, share the site, or withdraw;
// unanswered, the first to land wins it.
import { CONTENT } from '../../content/index.ts'
import {
  LUNAR_SITE_IDS,
  MOON,
  type LunarClaimantId,
  type LunarSiteId,
} from '../../content/moonContent.ts'
import type { Message, MessageKey } from '../../i18n/t.ts'
import { inActIV, logEntry, type Act4Moon, type GameState, type LunarClaim } from '../state.ts'
import { addPc, politicalCapital } from './pcState.ts'

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
  if (state.act4Moon?.claims.some((c) => c.site === site && c.status === 'lost')) return { key: 'error.moon_lost_site' }
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
  state.cash -= c.fee_usd
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
