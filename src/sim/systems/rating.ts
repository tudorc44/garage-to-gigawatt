// The credit rating (Act II, scope 0.2 §2.2 [P4]; doc 18 §7.2; lenders.json credit_rating_mapping):
// one corporate rating, CCC− to BBB, recalculated at each quarter end from debt/EBITDA × backlog
// quality, one notch lower when the cash runway is under 4 quarters. A rating never forecloses by
// itself. "A" exists only on secured project debt (facilities.ts).
import {
  BALANCE,
  CONTENT,
  type BacklogQuality,
  type LeverageBand,
} from '../../content/index.ts'
import type { GameState, QuarterReport } from '../state.ts'
import { eventRatingNotches } from './eventEffects.ts'
import { isInvestmentGrade } from './finance.ts'
import { debtUsd } from './loans.ts'
import { remainingContractUsd, tenantCard } from './projects.ts'

/** Share of the remaining contracted backlog above which it counts as strong / at least mixed (mine). */
const STRONG_SHARE = 2 / 3
const MIXED_SHARE = 1 / 3

/** Debt ÷ run-rate EBITDA, as the matrix's band. No EBITDA: > 6× with debt, < 2× without. */
export function leverageBand(debt: number, yearlyEbitda: number): LeverageBand {
  if (debt <= 0) return 'lt2'
  if (yearlyEbitda <= 0) return 'gt6'
  const x = debt / yearlyEbitda
  return x < 2 ? 'lt2' : x < 4 ? 'from2to4' : x < 6 ? 'from4to6' : 'gt6'
}

/**
 * Backlog quality: the share of the remaining contracted revenue owed by investment-grade tenants
 * (or backstopped ones, M4.6). No backlog is weak (doc 18 §7.2: "mostly unrated" tenants).
 */
export function backlogQuality(state: GameState): {
  quality: BacklogQuality
  strongShare: number
} {
  let total = 0
  let strong = 0
  for (const p of state.projects) {
    const usd = remainingContractUsd(p)
    if (usd <= 0) continue
    total += usd
    if (p.backstop || isInvestmentGrade(tenantCard(p.tenant!.card)!.rating))
      strong += usd
  }
  const strongShare = total > 0 ? strong / total : 0
  return {
    quality:
      strongShare >= STRONG_SHARE
        ? 'strong'
        : strongShare >= MIXED_SHARE
          ? 'mixed'
          : 'weak',
    strongShare,
  }
}

/** Moves a rating `notches` up (+) or down (−) the scale, within the corporate range. */
export function notch(rating: string, notches: number): string {
  const scale = BALANCE.finance.ratingScale as readonly string[]
  const r = CONTENT.finance.rating
  const i = scale.indexOf(rating) + notches
  const lo = scale.indexOf(r.min)
  const hi = scale.indexOf(r.max)
  return scale[Math.min(hi, Math.max(lo, i))]
}

/** The rating and its three inputs, from a quarter's report and the state at its end. */
export function ratingInputs(state: GameState, report: QuarterReport) {
  const r = CONTENT.finance.rating
  const debt = debtUsd(state)
  const yearlyEbitda = report.ebitdaUsd * 4
  const band = leverageBand(debt, yearlyEbitda)
  const { quality, strongShare } = backlogQuality(state)
  // Runway: quarters the cash lasts at this quarter's burn (EBITDA less debt service), if burning.
  const flow = report.ebitdaUsd - report.interestUsd - report.principalUsd
  const runwayQuarters = flow < 0 ? state.cash / -flow : null
  const shortRunway =
    runwayQuarters !== null && runwayQuarters < r.runwayQuarters
  const base = r.matrix[band][quality]
  // The timeline and cards can move it too (FTX: −1 for 2 quarters; SVB "ride it out": −1).
  const eventNotches = eventRatingNotches(state)
  return {
    debtUsd: debt,
    debtToEbitda: yearlyEbitda > 0 ? debt / yearlyEbitda : null,
    band,
    quality,
    strongShare,
    runwayQuarters,
    shortRunway,
    base,
    eventNotches,
    rating: notch(base, (shortRunway ? r.runwayNotches : 0) + eventNotches),
  }
}
