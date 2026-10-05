// The Act III → IV boundary (M27.4; doc 33 §3.1–3.2, IV-D19). It runs on the state Act III ended with (2030Q4's chapter
// report) and produces the state Act IV starts from (the Plan phase of 2031Q1).
//
// Carries unchanged (doc 33 §3.1): cash, the treasury, the founder stake and raises; sites, machines, hosting and projects
// with their tenants, terms, density tiers, downtime and lender cures; every loan and facility, the credit rating, the
// standby facility (while its window lasts) and an open covenant breach (with its cure deadline); nuclear PPAs, political
// capital, the Anger adjustment and the Government bookkeeping, the Community Deal, Heat per site, staff, the lasting
// effects that run past 2030Q4 and any card payout scheduled after it; the seed, act3Seed, the preset flag, the Act III
// scenario id and Scenario Mode flag (kept for the market seam and the finale: nothing in Act IV play reads the
// scenario), act2Entry (null by now), act3Entry, act3End (the Act III reveal, read-only), the log and the reports.
// Boundary rules (doc 33 §3.2): Heat and Anger carry; open Act III renewals resolve by their defaults (resolveRenewals:
// an undecided renewal signs at the offer) and open blend-and-extend offers lapse (their default is to ignore them).
// Dropped: the Act III wildcards and the export rule, the Signals read log and the move log (both kept inside act3End),
// the last Read the market, the lasting effects that ran out by 2030Q4, and every per-quarter planning and interrupt
// field. Act III's scenario does not continue: Act IV draws its own future (toAct4 in state.ts).
import { BALANCE, CONTENT, actFirstQuarter, type FutureId } from '../../content/index.ts'
import { emptyQuarterStats, type Act4Entry, type GameState } from '../state.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { debtUsd } from './loans.ts'
import { mwByUse } from './mwUse.ts'
import { openRenewals, resolveRenewals } from './renewals.ts'
import { poweredKw } from './sites.ts'

/**
 * The company as Act IV finds it: measured at the end of 2030Q4, before anything is flipped, so Act III's own rules
 * apply. The growth multiple, the frontier title and the campaign finale use it later. It holds nothing about the future.
 */
export function buildAct4Entry(state: GameState): Act4Entry {
  const last = state.reports.at(-1)
  const valuationUsd = last?.valuationUsd ?? state.cash
  const use = mwByUse(state, state.quarter)
  return {
    quarter: CONTENT.quarters[actFirstQuarter(4)],
    valuationUsd,
    founderNetWorthUsd: Math.max(0, state.founderStake * valuationUsd),
    cashUsd: state.cash,
    debtUsd: debtUsd(state),
    energizedMw: state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000,
    contractedMw: (use.hosting + use.aiShell + use.aiCloud) / 1000,
    creditRating: state.creditRating,
  }
}

/**
 * Enters Act IV on `future`. Returns a new state; the one passed in is not changed. Call it on a state at the end of
 * Act III (it needs the Act III scenario id: the market seam glides from that scenario's 2030Q4 values).
 */
export function enterAct4(state: GameState, future: FutureId): GameState {
  if (!state.scenarioId)
    throw new Error('enterAct4: the state has no Act III scenario (Act IV continues an Act III game)')
  const entry = buildAct4Entry(state)
  const s = structuredClone(state)
  const first = actFirstQuarter(4)

  // Open Act III renewals resolve by their defaults (doc 33 §3.2), still under Act III's rules and market.
  resolveRenewals(s)
  // Open blend-and-extend offers lapse (ignoring one is its default).
  if (s.act3BlendOffers) s.act3BlendOffers = []

  s.act = 4
  s.quarter = first
  s.week = 0
  s.phase = 'plan'
  s.futureId = future
  s.act4Entry = entry
  s.act4SignalReads = []

  // Dropped: Act III-only state (doc 33 §3.2). The Signals reads and the move log live on inside act3End.
  delete s.act3Wildcards
  delete s.act3WildcardOpen
  delete s.act3ExportRule
  delete s.act3SignalReads
  delete s.act3Moves
  s.marketRead = null

  // Dropped: lasting effects that have run out by 2030Q4 (the same rule as the Act II → III boundary).
  const e = s.events
  const over = <T extends { until: number }>(x: T | null | undefined) => (x && x.until >= first ? x : null)
  e.creditNotch = over(e.creditNotch)
  e.valuationMult = over(e.valuationMult)
  e.ebitdaMult = over(e.ebitdaMult)
  e.ipoBandwidth = over(e.ipoBandwidth)
  if (e.regionMoratorium !== undefined) e.regionMoratorium = over(e.regionMoratorium)
  if (e.auditPenalty !== undefined) e.auditPenalty = over(e.auditPenalty)
  e.moratoriumWaiver = Object.fromEntries(
    Object.entries(e.moratoriumWaiver).filter(([, until]) => until >= first),
  )
  e.modifiers = e.modifiers.filter((m) => m.to >= first * BALANCE.weeksPerQuarter)
  if (e.extraOffers && e.extraOffers.quarter < first) e.extraOffers = null
  if (e.gpuLockQuarter !== null && e.gpuLockQuarter < first) e.gpuLockQuarter = null
  if (e.marginStress && e.marginStress.quarter < first) e.marginStress = null
  if (e.runHotQuarter !== null && e.runHotQuarter < first) e.runHotQuarter = null

  // Dropped: the per-quarter planning and interrupt fields, so 2031Q1 starts clean.
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
  // 2031Q1's Plan phase: contracts ending now open their renewals, priced off Act IV's indices (doc 33 §3.2).
  s.act3Renewals = []
  openRenewals(s)

  return s
}
