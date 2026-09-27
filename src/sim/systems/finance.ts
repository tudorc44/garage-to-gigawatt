// Act II capital (scope 0.2 §2.2, §2.7; doc 18 §7): the rates lenders charge each quarter, and
// how tenant ratings read. Pure lookups on content (lenders.json via CONTENT.finance, the market's
// SOFR, balance.ts › finance); the instruments themselves live in facilities.ts.
import { BALANCE, CONTENT, act2Quarter } from '../../content/index.ts'

const F = () => CONTENT.finance

/** The quarter's position in Act II (0 = 2022Q4), clamped to the act. */
function act2Index(quarter: number): number {
  const i = quarter - CONTENT.acts[1].firstQuarter
  return Math.min(Math.max(0, i), CONTENT.act2Market.length - 1)
}

/** SOFR that quarter, as a fraction (the market file). */
export function sofr(quarter: number): number {
  return (act2Quarter(quarter)?.sofrPct ?? 0) / 100
}

/** Project debt's yearly rate if signed in `quarter` (lenders.json path: 10.5% → 8.5% → 7.0% → 7.5%). */
export function projectDebtRate(quarter: number): number {
  return F().projectDebt.rateByQuarter[act2Index(quarter)]
}

/** Where a rating sits on the scale (higher is better); -1 if it isn't a rating. */
export function ratingRank(rating: string): number {
  const scale = BALANCE.finance.ratingScale as readonly string[]
  // Tenant cards carry notes ("BB (backstopped to A)", "B+ (rising)", "A/AA"): read the first grade.
  const grade = rating.split(/[\s/(]/)[0]
  if (grade === 'AA' || grade === 'AAA') return scale.length - 1
  return scale.indexOf(grade)
}

/** Investment grade: BBB− or better. */
export function isInvestmentGrade(rating: string): boolean {
  return ratingRank(rating) >= ratingRank('BBB-')
}

/**
 * The GPU-backed DDTL's spread over SOFR in bps if signed in `quarter`: the market file's
 * `ddtl_spread_bps` to 2025Q4 (the first value before it exists); from 2026 split by the tenant's
 * credit (doc 18 §7.1).
 */
export function ddtlSpreadBps(
  quarter: number,
  investmentGrade: boolean,
): number {
  const split = BALANCE.finance.ddtl.spread2026Bps
  const label = CONTENT.quarters[quarter]
  if (label >= '2026Q1')
    return investmentGrade
      ? split.ig
      : (split.other[label] ?? split.other['2026Q4'])
  const own = CONTENT.act2Market[act2Index(quarter)].ddtlSpreadBps
  return (
    own ??
    CONTENT.act2Market.find((m) => m.ddtlSpreadBps !== null)!.ddtlSpreadBps!
  )
}

/** The DDTL's yearly rate: SOFR + the spread. */
export function ddtlRate(quarter: number, investmentGrade: boolean): number {
  return sofr(quarter) + ddtlSpreadBps(quarter, investmentGrade) / 10_000
}
