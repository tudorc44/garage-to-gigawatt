// Company valuation (content review A5): run-rate EBITDA (this quarter × 4) × the
// era's EV/EBITDA multiple, plus cash and treasury, minus debt (loans still owed).
// Act II (scope 0.2 §2.8): the sum of the parts, projects under construction and the backlog.
import {
  BALANCE,
  CONTENT,
  act1ValueQuarter,
  quarterInputs,
  type MarketKey,
} from '../../content/index.ts'
import type { QuarterReport } from '../state.ts'
import { aiMultipleDelta } from './eventEffects.ts'

/**
 * The era's EV/EBITDA multiple for a quarter index: Act I's from capital.json, then Act II's
 * mining multiple from capital_act2.json (doc 18 §8; mining and hosting units use it).
 */
export function eraMultiple(
  quarter: number,
  scenario?: MarketKey | null,
): number {
  // Act II, and Act III on its scenario's rebased column (M11.4c).
  const inputs = quarterInputs(quarter, scenario)
  if (inputs) return inputs.multiple.mining
  return CONTENT.eraMultiple[act1ValueQuarter(quarter)]
}

/**
 * Act II's AI-infrastructure multiple (doc 18 §8), for AI shell and AI cloud units, with the
 * timeline's shocks (DeepSeek: −3 in 2025Q1–Q2). 0 in Act I.
 */
export function aiInfraMultiple(
  quarter: number,
  scenario?: MarketKey | null,
): number {
  const base = quarterInputs(quarter, scenario)?.multiple.aiInfra
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
  orbitRevenueUsd?: number
  orbitCostUsd?: number
}): number {
  const ebitda =
    q.revenueUsd +
    (q.gridCreditsUsd ?? 0) +
    (q.hostingFeesUsd ?? 0) +
    (q.aiRevenueUsd ?? 0) -
    (q.aiCostUsd ?? 0) -
    (q.lateDamagesUsd ?? 0) -
    q.powerCostUsd -
    q.rentUsd -
    (q.salariesUsd ?? 0)
  // Act IV (M29): the orbital blocks (absent before Act IV, so earlier acts' sums are untouched).
  return q.orbitRevenueUsd === undefined && q.orbitCostUsd === undefined ? ebitda : ebitda + orbitEbitdaUsd(q)
}

/** Act IV: the orbital unit's EBITDA for a quarter (doc 33 §11.3). */
export function orbitEbitdaUsd(q: { orbitRevenueUsd?: number; orbitCostUsd?: number }): number {
  return (q.orbitRevenueUsd ?? 0) - (q.orbitCostUsd ?? 0)
}

/**
 * The AI units' enterprise value: run-rate EBITDA × the AI multiple, except the part earned under
 * long A/AA or backstopped contracts (`floorUsd`), valued at no less than the contracted floor
 * (15×: owner, M7.0 answer A2; was 18×). A loss-making AI business adds nothing.
 */
export function aiEnterpriseUsd(
  quarter: number,
  aiEbitdaUsd: number,
  floorUsd = 0,
  scenario?: MarketKey | null,
): number {
  const ai = Math.max(0, aiEbitdaUsd)
  const floored = Math.min(ai, Math.max(0, floorUsd))
  const m = aiInfraMultiple(quarter, scenario)
  const floorM = Math.max(m, BALANCE.finance.contractedAiMultipleFloor.multiple)
  return floored * 4 * floorM + (ai - floored) * 4 * m
}

/** Act II's extra valuation parts (scope 0.2 §2.8). All optional: Act I has none. */
export interface ValuationParts {
  /** The quarter's EBITDA from AI shell and AI cloud units (part of the total EBITDA). */
  aiEbitdaUsd?: number
  /** Its part under long A/AA or backstopped contracts (the contracted multiple floor). */
  aiFloorEbitdaUsd?: number
  /** The pivot premium on the mining multiple (from the first AI deal). */
  pivot?: boolean
  /** Projects under construction, at the capex spent so far. */
  constructionUsd?: number
  /** The credit-weighted backlog. */
  weightedBacklogUsd?: number
  /** A card's premium on the operating value (the pivot premium's PR push, M5.8). */
  evMult?: number
  /** Act III: the scenario whose multiples apply (M11.4c). Absent in Acts I and II. */
  scenario?: MarketKey | null
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
    eraMultiple(quarter, parts.scenario) +
    (parts.pivot ? BALANCE.projects.pivotPremium : 0)
  const enterprise =
    (Math.max(0, (quarterEbitdaUsd - ai) * 4) * mining +
      aiEnterpriseUsd(quarter, ai, parts.aiFloorEbitdaUsd, parts.scenario)) *
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
  scenario?: MarketKey | null,
) {
  const q = CONTENT.quarters.indexOf(r.quarter)
  const ai = aiEbitdaUsd(r)
  const pivot = firstAiDealQuarter !== null && q >= firstAiDealQuarter
  const miningMultiple =
    eraMultiple(q, scenario) + (pivot ? BALANCE.projects.pivotPremium : 0)
  const evMult = r.evMult ?? 1
  const miningEvUsd =
    Math.max(0, (r.ebitdaUsd - ai) * 4) * miningMultiple * evMult
  const aiEvUsd = aiEnterpriseUsd(q, ai, r.aiFloorEbitdaUsd, scenario) * evMult
  // The multiple the AI EBITDA earns overall (the era's, lifted by any contracted floor).
  const aiMultiple =
    ai > 0 ? aiEvUsd / evMult / (ai * 4) : aiInfraMultiple(q, scenario)
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
