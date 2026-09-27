// Company valuation (content review A5): run-rate EBITDA (this quarter × 4) × the
// era's EV/EBITDA multiple, plus cash and treasury, minus debt (loans still owed).
import { CONTENT, act1ValueQuarter, act2Quarter } from '../../content/index.ts'

/**
 * The era's EV/EBITDA multiple for a quarter index: Act I's from capital.json, then Act II's
 * mining multiple from capital_act2.json (doc 18 §8; mining and hosting units use it).
 */
export function eraMultiple(quarter: number): number {
  const act2 = act2Quarter(quarter)
  if (act2) return act2.multiple.mining
  return CONTENT.eraMultiple[act1ValueQuarter(quarter)]
}

/** Act II's AI-infrastructure multiple (doc 18 §8), for AI shell and AI cloud units. 0 in Act I. */
export function aiInfraMultiple(quarter: number): number {
  return act2Quarter(quarter)?.multiple.aiInfra ?? 0
}

/** EBITDA for a quarter: mining revenue plus grid credits, minus power, rent and salaries (loan interest isn't in it). */
export function ebitdaUsd(q: {
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  gridCreditsUsd?: number
  salariesUsd?: number
}): number {
  return (
    q.revenueUsd +
    (q.gridCreditsUsd ?? 0) -
    q.powerCostUsd -
    q.rentUsd -
    (q.salariesUsd ?? 0)
  )
}

/**
 * A loss-making quarter adds no operating value (it isn't negative). Cash and
 * treasury still count.
 */
export function valuationUsd(
  quarter: number,
  quarterEbitdaUsd: number,
  cashUsd: number,
  treasuryUsd: number,
  debtUsd = 0,
): number {
  const multiple = eraMultiple(quarter)
  const enterprise = Math.max(0, quarterEbitdaUsd * 4) * multiple
  return enterprise + cashUsd + treasuryUsd - debtUsd
}
