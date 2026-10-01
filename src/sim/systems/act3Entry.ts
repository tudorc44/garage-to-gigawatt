// The Act II → III boundary (M11.4b; doc 27 §3 and D17). Replaces M11.3's bare flip. It runs on the state
// Act II ended with (2026Q4) and produces the state Act III starts from (the Plan phase of 2027Q1).
// It is used by toAct3() in tests and the sim only: Act III stays unreachable from play. The business
// systems are still off in Act III (M11.4c opens the gates), so what is carried is data, kept as it is.
//
// Carries unchanged: cash, treasury, founder stake, sites, machines (the mining fleet and GPU
// inventory, parked GPUs included), hosting MW and contracts, open projects with their tenants,
// contracts and slots, every facility (project debt, DDTLs, the equipment loan, an outstanding bridge
// loan), the JV partner and backstops (stored on the projects), the credit rating (no review at the
// boundary), staff and salaries, Heat per site (no reset, unlike Act I → II), AI-lab distress flags
// (on the projects), the seed, the log and the reports. Anger is worked out from energized MW, not
// stored, so it needs nothing.
// Dropped: the head-start record and flags, the lifeline flags, the Act II lasting effects that
// expire by 2026Q4 (longer ones carry), and every per-quarter planning and interrupt field.
import {
  BALANCE,
  CONTENT,
  actFirstQuarter,
  type ScenarioId,
} from '../../content/index.ts'
import { emptyQuarterStats, type Act3Entry, type GameState } from '../state.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { debtUsd } from './loans.ts'
import { mwByUse } from './mwUse.ts'
import { openRenewals } from './renewals.ts'
import { poweredKw } from './sites.ts'

/**
 * The company as Act III finds it (doc 27 D17): measured at the end of 2026Q4, before anything is
 * flipped, so Act II's own rules apply. The growth multiple and the reading score use it later. It
 * holds nothing about the scenario.
 */
export function buildAct3Entry(state: GameState): Act3Entry {
  const last = state.reports.at(-1)
  const valuationUsd = last?.valuationUsd ?? state.cash
  const use = mwByUse(state, state.quarter)
  return {
    quarter: CONTENT.quarters[actFirstQuarter(3)],
    valuationUsd,
    founderNetWorthUsd: Math.max(0, state.founderStake * valuationUsd),
    cashUsd: state.cash,
    debtUsd: debtUsd(state),
    energizedMw:
      state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000,
    contractedMw: (use.hosting + use.aiShell + use.aiCloud) / 1000,
    creditRating: state.creditRating,
  }
}

/**
 * Enters Act III on `scenario`. Returns a new state; the one passed in is not changed. Call it on a
 * state at the end of Act II (or any test company): it does not check the act.
 */
export function enterAct3(state: GameState, scenario: ScenarioId): GameState {
  const entry = buildAct3Entry(state)
  const s = structuredClone(state)
  const first = actFirstQuarter(3)

  s.act = 3
  s.quarter = first
  s.week = 0
  s.phase = 'plan'
  s.scenarioId = scenario
  s.act3SignalReads = []
  s.act3Entry = entry

  // Dropped: the head-start record and flags, and the lifeline's flags (both live in act2Entry). The
  // legacy-cloud flag on GPU rigs is a head-start flag: the rigs stay as ordinary inventory.
  s.act2Entry = null
  for (const lot of s.machines) delete lot.legacyCloud

  // Dropped: Act II lasting effects that have run out by 2026Q4. Effects with a later end, and the
  // permanent ones (spread add-on, AI-lab revenue multiplier, the tax plan), carry.
  const e = s.events
  const over = <T extends { until: number }>(x: T | null | undefined) =>
    x && x.until >= first ? x : null
  e.creditNotch = over(e.creditNotch)
  e.valuationMult = over(e.valuationMult)
  e.ebitdaMult = over(e.ebitdaMult)
  e.ipoBandwidth = over(e.ipoBandwidth)
  // (Optional fields stay absent when they were absent.)
  if (e.regionMoratorium !== undefined)
    e.regionMoratorium = over(e.regionMoratorium)
  if (e.auditPenalty !== undefined) e.auditPenalty = over(e.auditPenalty)
  e.moratoriumWaiver = Object.fromEntries(
    Object.entries(e.moratoriumWaiver).filter(([, until]) => until >= first),
  )
  e.modifiers = e.modifiers.filter(
    (m) => m.to >= first * BALANCE.weeksPerQuarter,
  )
  if (e.extraOffers && e.extraOffers.quarter < first) e.extraOffers = null
  if (e.gpuLockQuarter !== null && e.gpuLockQuarter < first)
    e.gpuLockQuarter = null
  if (e.marginStress && e.marginStress.quarter < first) e.marginStress = null
  if (e.runHotQuarter !== null && e.runHotQuarter < first)
    e.runHotQuarter = null

  // Dropped: the per-quarter planning and interrupt fields, so 2027Q1 starts clean.
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
  s.marketRead = null
  s.interrupt = null
  s.interruptsThisQuarter = 0
  s.quarterStats = emptyQuarterStats()
  s.bandwidth = bandwidthForQuarter(s)
  // 2027Q1's Plan phase: contracts ending now, and holdovers, open their renewals (M12.2).
  s.act3Renewals = []
  openRenewals(s)
  // The move log the reading score reads at the end (M14.2).
  s.act3Moves = []

  return s
}
