// Lasting effects of event cards, as the other systems read them: multipliers on hashrate,
// failures and rent for a span of weeks, and the next Plan phase's price changes and locks.
// Kept apart from the event engine (events.ts) so mining, rent and buying can read them
// without importing the whole engine.
import { BALANCE, CONTENT, type Machine } from '../../content/index.ts'
import { chance, substream } from '../rng.ts'
import { logEntry, type Condition, type GameState } from '../state.ts'
import { buyPrice, scenarioOf } from './market.ts'
import { exportGpuMult } from './exportRule.ts'

export interface ScheduledEvent {
  /** events.json card id. */
  id: string
  /** Week number (1–13): the card comes after this week is played. */
  week: number
  /** Random cards count toward the 3-interrupt cap; scripted ones don't. */
  random: boolean
  siteId?: string
}

/**
 * A multiplier on one thing at some sites (null = every site), for absolute weeks from…to. Act II
 * adds 'spot' (the neocloud price spot clusters earn) and 'utilisation' (AI clouds' revenue).
 */
export interface Modifier {
  kind: 'hashrate' | 'failure' | 'rent' | 'spot' | 'utilisation'
  siteIds: string[] | null
  mult: number
  /** Absolute weeks (quarter × 13 + week index), both included. */
  from: number
  to: number
}

export interface EventState {
  /** Cards due this quarter, in the order they come. */
  queue: ScheduledEvent[]
  /** A random card that couldn't fire (cap full) and comes in week 1 of next quarter. */
  deferred: ScheduledEvent | null
  /** Cards (random, and per-site keys like "utility_rate_hike:site-3") already played. */
  fired: string[]
  /** Story flags: cloud_insight, security. */
  flags: string[]
  /** Quarters in which a random card could have come (for the sim's statistics). */
  eligibleQuarters: number
  modifiers: Modifier[]
  /** Next Plan phase's machine prices (btc_peak, covid, china_ban, scam) and nudges. */
  plan: {
    quarter: number
    priceMult: number
    usedDiscount: number
    openBuy: boolean
    guaranteedAuction: boolean
    /** Act II: GPU purchase prices × this in that Plan phase (DeepSeek's "buy the dip"). */
    gpuPriceMult?: number
  } | null
  /** Act II cards' lasting effects (M5.8), each until (and including) a quarter index. */
  creditNotch: { notches: number; until: number } | null
  valuationMult: { mult: number; until: number } | null
  ebitdaMult: { mult: number; until: number } | null
  /** Added to the spread of new equipment loans and DDTLs, in bps, from then on. */
  spreadAddBps: number
  /** AI-lab tenants' rent (and GPU contracts) × this, from then on. */
  aiLabRevenueMult: number
  /** Extra tenant offers per project drawn in this quarter's Plan phase (a bid RFP). */
  extraOffers: { quarter: number; n: number } | null
  /** No new GPU rigs can be bought in this quarter's Plan phase. */
  gpuLockQuarter: number | null
  /** Added to next quarter's Bandwidth (negative). */
  bandwidthNext: number
  /** The IPO / SPAC roadshow's Bandwidth cost until a quarter (spac_mania). */
  ipoBandwidth: { bw: number; until: number } | null
  /** Tighter margin-call levels for a quarter (luna "ride it out"). */
  marginStress: {
    quarter: number
    callLtv: number
    liquidationLtv: number
  } | null
  /** Tax payment plan: this much at the start of each of the next quarters. */
  taxPlan: { amountUsd: number; quartersLeft: number } | null
  /** The quarter "Run hot" was chosen (failure waves twice as likely). */
  runHotQuarter: number | null
  /** Moratorium lifted at a site until (and including) this quarter index. */
  moratoriumWaiver: Record<string, number>
  /** Act II card ec21: no new projects at your sites in this region until (and including) a quarter. */
  regionMoratorium?: { region: string; until: number } | null
  /** An audit found aggressive depreciation (M6.0k): rating notch and cheaper equity until a quarter. */
  auditPenalty?: { until: number } | null
  /** Act III card tenant_slots (M12.3): extra shell tenant offers in every draw from `from` to `until`. */
  extraShellOffers?: { from: number; until: number; n: number }
}

export function emptyEventState(): EventState {
  return {
    queue: [],
    deferred: null,
    fired: [],
    flags: [],
    eligibleQuarters: 0,
    modifiers: [],
    plan: null,
    gpuLockQuarter: null,
    bandwidthNext: 0,
    ipoBandwidth: null,
    marginStress: null,
    taxPlan: null,
    runHotQuarter: null,
    moratoriumWaiver: {},
    creditNotch: null,
    valuationMult: null,
    ebitdaMult: null,
    spreadAddBps: 0,
    aiLabRevenueMult: 1,
    extraOffers: null,
  }
}

/** A lasting Act II card effect's value this quarter (its neutral value when it has run out). */
export function lasting<T extends { until: number }>(
  state: GameState,
  x: T | null,
): T | null {
  return x && state.quarter <= x.until ? x : null
}

/** The scripted Act II timeline's market effects in force in `quarter` (events_act2.json). */
export function marketEffectsAt(quarter: number) {
  const label = CONTENT.quarters[quarter] ?? ''
  return CONTENT.events.marketEffects.filter((m) => {
    const from = CONTENT.quarters.indexOf(m.from)
    return label >= m.from && quarter < from + m.quarters
  })
}

/**
 * At the end of a Q4 (Act II): while aggressive depreciation's EBITDA boost runs (card ec18), an
 * audit comes with its chance. A hit restates the numbers (the boost ends now) and costs a rating
 * notch and 10% on equity prices for 2 quarters (owner, 28 Sep 2026). Its own random stream.
 */
export function depreciationAudit(state: GameState): void {
  const boost = lasting(state, state.events.ebitdaMult)
  if (!boost || boost.mult <= 1) return
  if (!(CONTENT.quarters[state.quarter] ?? '').endsWith('Q4')) return
  const a = BALANCE.act2Events.audit
  const r = substream(state.seed, `depreciation_audit:${state.quarter}`)
  if (!chance(r, a.chance)) return
  state.events.ebitdaMult = null
  state.events.auditPenalty = { until: state.quarter + a.quarters - 1 }
  logEntry(state, 'log.depreciation_audit', { quarters: a.quarters })
}

/** Equity is priced this much lower after an audit found aggressive depreciation (1 otherwise). */
export function auditEquityMult(state: GameState): number {
  return lasting(state, state.events.auditPenalty ?? null)
    ? BALANCE.act2Events.audit.equityMult
    : 1
}

/** Credit-rating notches from the timeline and from cards now (negative = down). */
export function eventRatingNotches(state: GameState): number {
  return (
    (lasting(state, state.events.creditNotch)?.notches ?? 0) +
    (lasting(state, state.events.auditPenalty ?? null)
      ? BALANCE.act2Events.audit.notches
      : 0) +
    marketEffectsAt(state.quarter).reduce(
      (n, m) => n + (m.credit_notch ?? 0),
      0,
    )
  )
}

/** The AI-infrastructure multiple's change from the timeline in `quarter` (DeepSeek: −3). */
export function aiMultipleDelta(quarter: number): number {
  return marketEffectsAt(quarter).reduce(
    (n, m) => n + (m.ai_multiple_delta ?? 0),
    0,
  )
}

/** The AI demand index's change from the timeline in `quarter` (DeepSeek: −10). */
export function aiDemandDelta(quarter: number): number {
  return marketEffectsAt(quarter).reduce(
    (n, m) => n + (m.ai_demand_delta ?? 0),
    0,
  )
}

/** Whether lenders write no new debt this quarter (the SVB freeze). */
export function debtFrozen(state: GameState): boolean {
  return marketEffectsAt(state.quarter).some((m) => m.no_new_debt)
}

/** This Plan phase's GPU price multiplier (DeepSeek's "buy the dip"), 1 normally. */
export function gpuPriceMultNow(state: GameState, quarter: number): number {
  const p = state.events.plan
  // Act III (M17.4): × 1.05 while the export rule is on (unless you pre-bought).
  return (
    (p && p.quarter === state.quarter && quarter === state.quarter
      ? (p.gpuPriceMult ?? 1)
      : 1) * exportGpuMult(state, quarter)
  )
}

/** The absolute week being played (or about to be): quarter × 13 + week index. */
export function absWeek(state: GameState): number {
  return state.quarter * BALANCE.weeksPerQuarter + state.week
}

/** Product of the active multipliers of a kind at a site this week (1 with none). */
export function modifierMult(
  state: GameState,
  kind: Modifier['kind'],
  siteId: string | null,
): number {
  const now = absWeek(state)
  let m = 1
  for (const x of state.events.modifiers) {
    if (x.kind !== kind || now < x.from || now > x.to) continue
    if (x.siteIds && (siteId === null || !x.siteIds.includes(siteId))) continue
    m *= x.mult
  }
  return m
}

/** This Plan phase's price multiplier for buying machines (event cards), 1 normally. */
export function purchasePriceMult(
  state: GameState,
  condition: Condition,
): number {
  const p = state.events.plan
  if (!p || p.quarter !== state.quarter) return 1
  return p.priceMult * (condition === 'used' ? 1 - p.usedDiscount : 1)
}

/** gpu_shortage "wait": no new GPU rigs in this Plan phase. */
export function newGpusLocked(state: GameState): boolean {
  return state.events.gpuLockQuarter === state.quarter
}

export function hasFlag(state: GameState, flag: string): boolean {
  return state.events.flags.includes(flag)
}

/** The moratorium at a site is lifted this quarter (a won lawsuit). */
export function moratoriumWaived(state: GameState, siteId: string): boolean {
  const until = state.events.moratoriumWaiver[siteId]
  return until !== undefined && state.quarter <= until
}

/**
 * What one unit costs to buy in this Plan phase, after event-card price changes; undefined if
 * it can't be bought (not out yet, or new GPU rigs sold out after gpu_shortage "wait").
 */
export function buyPriceNow(
  state: GameState,
  model: Machine,
  condition: Condition,
): number | undefined {
  if (model.coin === 'ETH' && condition === 'new' && newGpusLocked(state))
    return undefined
  const base = buyPrice(model, state.quarter, condition, scenarioOf(state))
  return base === undefined
    ? undefined
    : base * purchasePriceMult(state, condition)
}
