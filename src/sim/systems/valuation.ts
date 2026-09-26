// Company valuation (content review A5): run-rate EBITDA (this quarter × 4) × the
// era's EV/EBITDA multiple, plus cash and treasury, minus debt (loans still owed).
import { CONTENT } from '../../content/index.ts'

/** EBITDA for a quarter: mining revenue minus power and rent (no salaries yet; loan interest isn't in it). */
export function ebitdaUsd(q: {
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
}): number {
  return q.revenueUsd - q.powerCostUsd - q.rentUsd
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
  const multiple = CONTENT.eraMultiple[CONTENT.quarters[quarter]]
  const enterprise = Math.max(0, quarterEbitdaUsd * 4) * multiple
  return enterprise + cashUsd + treasuryUsd - debtUsd
}
