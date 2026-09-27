// Company valuation (content review A5): run-rate EBITDA (this quarter × 4) × the
// era's EV/EBITDA multiple, plus cash and treasury, minus debt (loans still owed).
// Act II (scope 0.2 §2.8): the sum of the parts, projects under construction and the backlog.
import {
  BALANCE,
  CONTENT,
  act1ValueQuarter,
  act2Quarter,
} from '../../content/index.ts'
import type { QuarterReport } from '../state.ts'
import { aiMultipleDelta } from './eventEffects.ts'

/**
 * The era's EV/EBITDA multiple for a quarter index: Act I's from capital.json, then Act II's
 * mining multiple from capital_act2.json (doc 18 §8; mining and hosting units use it).
 */
export function eraMultiple(quarter: number): number {
  const act2 = act2Quarter(quarter)
  if (act2) return act2.multiple.mining
  return CONTENT.eraMultiple[act1ValueQuarter(quarter)]
}

/**
 * Act II's AI-infrastructure multiple (doc 18 §8), for AI shell and AI cloud units, with the
 * timeline's shocks (DeepSeek: −3 in 2025Q1–Q2). 0 in Act I.
 */
export function aiInfraMultiple(quarter: number): number {
  const base = act2Quarter(quarter)?.multiple.aiInfra
  return base === undefined ? 0 : Math.max(0, base + aiMultipleDelta(quarter))
}

/**
 * EBITDA for a quarter: mining revenue plus grid credits and hosting fees, minus power, rent and
 * salaries (loan interest isn't in it).
 */
export function ebitdaUsd(q: {
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  gridCreditsUsd?: number
  hostingFeesUsd?: number
  aiRevenueUsd?: number
  aiCostUsd?: number
  lateDamagesUsd?: number
  salariesUsd?: number
}): number {
  return (
    q.revenueUsd +
    (q.gridCreditsUsd ?? 0) +
    (q.hostingFeesUsd ?? 0) +
    (q.aiRevenueUsd ?? 0) -
    (q.aiCostUsd ?? 0) -
    (q.lateDamagesUsd ?? 0) -
    q.powerCostUsd -
    q.rentUsd -
    (q.salariesUsd ?? 0)
  )
}

/**
 * The AI units' enterprise value: run-rate EBITDA × the AI multiple, except the part earned under
 * long A/AA or backstopped contracts (`floorUsd`), valued at no less than the contracted floor
 * (18×, owner 28 Sep 2026). A loss-making AI business adds nothing.
 */
export function aiEnterpriseUsd(
  quarter: number,
  aiEbitdaUsd: number,
  floorUsd = 0,
): number {
  const ai = Math.max(0, aiEbitdaUsd)
  const floored = Math.min(ai, Math.max(0, floorUsd))
  const m = aiInfraMultiple(quarter)
  const floorM = Math.max(m, BALANCE.finance.contractedAiMultipleFloor.multiple)
  return floored * 4 * floorM + (ai - floored) * 4 * m
}

/** Act II's extra valuation parts (scope 0.2 §2.8). All optional: Act I has none. */
export interface ValuationParts {
  /** The quarter's EBITDA from AI shell and AI cloud units (part of the total EBITDA). */
  aiEbitdaUsd?: number
  /** Its part under long A/AA or backstopped contracts (the 18× floor). */
  aiFloorEbitdaUsd?: number
  /** The pivot premium on the mining multiple (from the first AI deal). */
  pivot?: boolean
  /** Projects under construction, at the capex spent so far. */
  constructionUsd?: number
  /** The credit-weighted backlog. */
  weightedBacklogUsd?: number
  /** A card's premium on the operating value (the pivot premium's PR push, M5.8). */
  evMult?: number
}

/**
 * Sum of the parts: each unit's run-rate EBITDA × its multiple (mining and hosting at the era's
 * mining multiple, +2 with the pivot premium; AI at the AI-infrastructure multiple), plus cash,
 * treasury, projects under construction and the weighted backlog, minus debt. A loss-making part
 * adds no operating value (it isn't negative).
 */
export function valuationUsd(
  quarter: number,
  quarterEbitdaUsd: number,
  cashUsd: number,
  treasuryUsd: number,
  debtUsd = 0,
  parts: ValuationParts = {},
): number {
  const ai = parts.aiEbitdaUsd ?? 0
  const mining =
    eraMultiple(quarter) + (parts.pivot ? BALANCE.projects.pivotPremium : 0)
  const enterprise =
    (Math.max(0, (quarterEbitdaUsd - ai) * 4) * mining +
      aiEnterpriseUsd(quarter, ai, parts.aiFloorEbitdaUsd)) *
    (parts.evMult ?? 1)
  return (
    enterprise +
    cashUsd +
    treasuryUsd +
    (parts.constructionUsd ?? 0) +
    (parts.weightedBacklogUsd ?? 0) -
    debtUsd
  )
}

/**
 * A quarter report's valuation, part by part: mining (and hosting) and AI operations, projects
 * under construction, the weighted backlog, and what's left over, cash and treasury (pledged coins
 * included). `firstAiDealQuarter` decides the pivot premium.
 */
export function valuationSplit(
  r: QuarterReport,
  firstAiDealQuarter: number | null,
) {
  const q = CONTENT.quarters.indexOf(r.quarter)
  const ai = aiEbitdaUsd(r)
  const pivot = firstAiDealQuarter !== null && q >= firstAiDealQuarter
  const miningMultiple =
    eraMultiple(q) + (pivot ? BALANCE.projects.pivotPremium : 0)
  const evMult = r.evMult ?? 1
  const miningEvUsd =
    Math.max(0, (r.ebitdaUsd - ai) * 4) * miningMultiple * evMult
  const aiEvUsd = aiEnterpriseUsd(q, ai, r.aiFloorEbitdaUsd) * evMult
  // The multiple the AI EBITDA earns overall (the era's, lifted by any contracted floor).
  const aiMultiple = ai > 0 ? aiEvUsd / evMult / (ai * 4) : aiInfraMultiple(q)
  const constructionUsd = r.constructionUsd ?? 0
  const weightedBacklogUsd = r.weightedBacklogUsd ?? 0
  return {
    miningMultiple,
    aiMultiple,
    aiEbitdaUsd: ai,
    miningEvUsd,
    aiEvUsd,
    constructionUsd,
    weightedBacklogUsd,
    treasuryUsd:
      r.valuationUsd -
      miningEvUsd -
      aiEvUsd -
      constructionUsd -
      weightedBacklogUsd -
      r.cash +
      r.debtUsd,
  }
}

/** The AI units' EBITDA for a quarter: their revenue less their running costs and late damages. */
export function aiEbitdaUsd(q: {
  aiRevenueUsd?: number
  aiCostUsd?: number
  lateDamagesUsd?: number
}): number {
  return (q.aiRevenueUsd ?? 0) - (q.aiCostUsd ?? 0) - (q.lateDamagesUsd ?? 0)
}
