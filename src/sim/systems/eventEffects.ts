// Lasting effects of event cards, as the other systems read them: multipliers on hashrate,
// failures and rent for a span of weeks, and the next Plan phase's price changes and locks.
// Kept apart from the event engine (events.ts) so mining, rent and buying can read them
// without importing the whole engine.
import { BALANCE, type Machine } from '../../content/index.ts'
import type { Condition, GameState } from '../state.ts'
import { buyPrice } from './market.ts'

export interface ScheduledEvent {
  /** events.json card id. */
  id: string
  /** Week number (1–13): the card comes after this week is played. */
  week: number
  /** Random cards count toward the 3-interrupt cap; scripted ones don't. */
  random: boolean
  siteId?: string
}

/** A multiplier on one thing at some sites (null = every site), for absolute weeks from…to. */
export interface Modifier {
  kind: 'hashrate' | 'failure' | 'rent'
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
  } | null
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
  }
}

/** The absolute week being played (or about to be): quarter × 13 + week index. */
export function absWeek(state: GameState): number {
  return state.quarter * BALANCE.weeksPerQuarter + state.week
}

/** Product of the active multipliers of a kind at a site this week (1 with none). */
export function modifierMult(
  state: GameState,
  kind: Modifier['kind'],
  siteId: string,
): number {
  const now = absWeek(state)
  let m = 1
  for (const x of state.events.modifiers) {
    if (x.kind !== kind || now < x.from || now > x.to) continue
    if (x.siteIds && !x.siteIds.includes(siteId)) continue
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
  const base = buyPrice(model, state.quarter, condition)
  return base === undefined
    ? undefined
    : base * purchasePriceMult(state, condition)
}
