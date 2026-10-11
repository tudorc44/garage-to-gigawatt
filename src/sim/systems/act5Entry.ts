// The Act IV → V boundary (M49; doc 43 §3.1–3.2, with §0.2 and §0.9 items 11 and 14). It runs on the state Act IV ended
// with (2035Q4's chapter report) and produces the state Act V starts from (the Plan phase of 2036Q1).
//
// Carries unchanged (doc 43 §3.1): money and ownership (cash, the treasury, the founder stake, raises, the Finances
// ledger); sites with serials, power contracts, projects, hosting, energy assets, Texas enrolment, special sites;
// every venture stake, offtake and prepayment with its hidden draws (they keep running); every loan and facility, the
// rating, the covenant and an open breach, the standby facility in its window; nuclear PPAs, political capital,
// Anger, Heat, staff; the orbital business (`act4Orbit`, which keeps running: inAct4Rules); the seed, act3Seed,
// act4Seed, the Act III scenario and the Act IV future (kept for the market seam, the presets and the finale: nothing
// in Act V play reads them), act2Entry…act4Entry, act3End, act4End, the log and the reports.
// Boundary rules (doc 43 §3.2): Heat, Anger, the covenant and political capital carry; open renewals resolve by their
// defaults and blend-and-extend offers lapse; open orbital tenant offers lapse (their default). The Moon goes offstage:
// `act4Moon` becomes one lunar holding at its 2035Q4 value (§9.2, §0.9 item 14). Dropped into act4End (stored at
// 2035Q4): the Act IV move log, wildcards and Signals reads; the last Read the market. Act IV's future doesn't continue:
// Act V draws its own (toAct5 in state.ts, V-D5).
import { BALANCE, CONTENT, actFirstQuarter, act5Row, type VFutureId } from '../../content/index.ts'
import { emptyQuarterStats, type Act5Entry, type GameState } from '../state.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { buildAct4Entry } from './act4Entry.ts'
import { scenarioOf } from './market.ts'
import { openRenewals, resolveRenewals } from './renewals.ts'
import { poweredKw, usedKw } from './sites.ts'

/** Free energized MW (doc 43 §0.6 item 2): energized and used by no lease, project, hosting client or own machine. */
export function freeEnergizedMw(state: GameState, quarter = state.quarter): number {
  return state.sites.reduce((mw, s) => mw + Math.max(0, poweredKw(s, quarter) - usedKw(state, s.id)), 0) / 1000
}

/** The powered-land price per MW this quarter (doc 43 §0.2: `powered_value_usd_mw`), Act V only; 0 otherwise. */
export function poweredValueUsdMw(state: GameState, quarter = state.quarter): number {
  return act5Row(quarter, scenarioOf(state))?.powered_value_usd_mw ?? 0
}

/** Act V's powered term in the valuation (doc 43 §0.2): free energized MW × the powered value; 0 outside Act V. */
export function poweredUsd(state: GameState): number {
  return freeEnergizedMw(state) * poweredValueUsdMw(state)
}

/** The lunar holding's value now (doc 43 §9.2, §0.9 item 14): its 2035Q4 value × `lunar_value_index`; 0 once sold. */
export function lunarHoldingUsd(state: GameState): number {
  const h = state.lunarHolding
  if (!h || h.soldQuarter !== undefined) return 0
  return h.value2035Usd * (act5Row(state.quarter, scenarioOf(state))?.lunar_value_index ?? 1)
}

/**
 * The company as Act V finds it: measured at the end of 2035Q4 like Act IV's entry, plus free energized MW × the
 * powered value at 2036Q1 (doc 43 §0.2: the multiple's base includes the powered term, so idle MW show no fake growth on
 * day one; the 2036Q1 price is the common baseline in every future, so it reveals nothing).
 */
export function buildAct5Entry(state: GameState, vfuture: VFutureId): Act5Entry {
  const base = buildAct4Entry(state)
  const first = actFirstQuarter(5)
  const key = state.scenarioId && state.futureId ? (`${state.scenarioId}.${state.futureId}.${vfuture}` as const) : null
  const poweredMw = act5Row(first, key)?.powered_value_usd_mw ?? 0
  const freeMw = freeEnergizedMw(state)
  const poweredValueUsd = freeMw * poweredMw
  const valuationUsd = base.valuationUsd + poweredValueUsd
  return {
    ...base,
    quarter: CONTENT.quarters[first],
    valuationUsd,
    founderNetWorthUsd: Math.max(0, state.founderStake * valuationUsd),
    freeMw,
    poweredValueUsd,
  }
}

/**
 * Enters Act V on `vfuture`. Returns a new state; the one passed in is not changed. Call it on a state at the end of
 * Act IV (it needs the Act III scenario and the Act IV future: the market seam glides from that market's 2035Q4).
 */
export function enterAct5(state: GameState, vfuture: VFutureId): GameState {
  if (!state.scenarioId || !state.futureId)
    throw new Error('enterAct5: the state has no Act IV market (Act V continues an Act IV game)')
  const entry = buildAct5Entry(state, vfuture)
  const s = structuredClone(state)
  const first = actFirstQuarter(5)

  // Open renewals resolve by their defaults, still under Act IV's rules and market (doc 43 §3.2).
  resolveRenewals(s)
  if (s.act3BlendOffers) s.act3BlendOffers = []

  s.act = 5
  s.quarter = first
  s.week = 0
  s.phase = 'plan'
  s.vFutureId = vfuture
  s.act5Entry = entry

  // The Moon goes offstage (V-D4): one holding at its 2035Q4 value; claims, prospects and pilots stop being playable.
  if (s.act4Moon) {
    s.lunarHolding = { value2035Usd: state.reports.at(-1)?.lunarUsd ?? 0 }
    delete s.act4Moon
  }
  // Open orbital tenant offers lapse (their default); the blocks keep running.
  for (const b of s.act4Orbit?.blocks ?? []) b.offers = []

  // Dropped: Act IV-only state (doc 43 §3.2), kept inside act4End.
  delete s.act4Moves
  delete s.act4Wildcards
  delete s.act4SignalReads
  s.marketRead = null

  // Dropped: lasting effects that have run out by 2035Q4 (the rule of the earlier boundaries).
  const e = s.events
  const over = <T extends { until: number }>(x: T | null | undefined) => (x && x.until >= first ? x : null)
  e.creditNotch = over(e.creditNotch)
  e.valuationMult = over(e.valuationMult)
  e.ebitdaMult = over(e.ebitdaMult)
  e.ipoBandwidth = over(e.ipoBandwidth)
  if (e.regionMoratorium !== undefined) e.regionMoratorium = over(e.regionMoratorium)
  if (e.auditPenalty !== undefined) e.auditPenalty = over(e.auditPenalty)
  e.moratoriumWaiver = Object.fromEntries(Object.entries(e.moratoriumWaiver).filter(([, until]) => until >= first))
  e.modifiers = e.modifiers.filter((m) => m.to >= first * BALANCE.weeksPerQuarter)
  if (e.extraOffers && e.extraOffers.quarter < first) e.extraOffers = null
  if (e.gpuLockQuarter !== null && e.gpuLockQuarter < first) e.gpuLockQuarter = null
  if (e.marginStress && e.marginStress.quarter < first) e.marginStress = null
  if (e.runHotQuarter !== null && e.runHotQuarter < first) e.runHotQuarter = null

  // Dropped: the per-quarter planning and interrupt fields, so 2036Q1 starts clean.
  e.queue = []
  e.deferred = null
  e.plan = null
  s.projectEvents = []
  s.spotShock = null
  s.failureWaves = []
  s.complaint = null
  s.curtailment = null
  s.auction = null
  s.siteOffers = []
  s.negotiation = null
  if (s.dealNegotiation !== undefined) s.dealNegotiation = null
  s.pitch = null
  s.interrupt = null
  s.interruptsThisQuarter = 0
  s.quarterStats = emptyQuarterStats()
  s.bandwidth = bandwidthForQuarter(s)
  // 2036Q1's Plan phase: contracts ending now open their renewals, priced off Act V's indices.
  s.act3Renewals = []
  openRenewals(s)
  return s
}
