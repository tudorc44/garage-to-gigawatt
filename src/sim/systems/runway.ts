// The cash runway (Act II, M9.0; owner's design thread answer, 28 Sep 2026): how many quarters the cash
// lasts. It looks one quarter ahead, but ONLY at contractual amounts: last quarter's EBITDA (what the
// company actually earned, no forecast) less the debt payments that are already fixed for the coming
// quarter:
//   - the equipment loan and the construction loans (their weekly schedule),
//   - the lifeline bridge (including its step from interest only to amortising),
//   - project debt and GPU-backed DDTLs of projects that are live by then (interest plus the equal
//     principal slice, including the principal added by interest capitalised during construction).
// It does NOT count things that may or may not happen (take-or-pay damages, delays, distress) and makes
// no revenue forecast. The rating rule is unchanged (a runway under `runwayQuarters` lowers the rating a
// notch, rating.ts): only this figure changed, from "last quarter's payments" to "the coming quarter's".
// "The coming quarter" is the quarter after the report's: at a quarter's end that is next quarter, in the
// next Plan phase (payments not yet made) it is the quarter just started; either way the loans' schedule is
// simulated from today's balances.
import { BALANCE, CONTENT } from '../../content/index.ts'
import {
  roundCents,
  type EquipmentLoan,
  type Facility,
  type GameState,
  type QuarterReport,
} from '../state.ts'
import { companyServiceDue, isCompanyFacility } from './corporateDebt.ts'
import { bridgeSchedule } from './lifeline.ts'
import { getProject } from './projects.ts'

export type ObligationKind =
  | 'equipment_loan'
  | 'construction_loan'
  | 'bridge'
  | 'project_debt'
  | 'ddtl'
  // Act III (M18.1, M18.2): company facilities
  | 'corporate'
  | 'standby'

/** One fixed payment in the coming quarter. */
export interface Obligation {
  kind: ObligationKind
  usd: number
  /** The project number, for project debt and DDTLs. */
  projectN?: number
  /** The bridge only: whether the coming payment is interest only or amortising. */
  phase?: 'interest_only' | 'amortising' | 'final'
}

/** A quarter of an equipment or construction loan's weekly payments, worked out like payOneWeek without paying. */
function loanQuarterUsd(loan: EquipmentLoan): number {
  const weeks = BALANCE.weeksPerQuarter
  let balance = loan.balanceUsd
  let left = loan.weeksLeft
  let total = 0
  for (let w = 0; w < weeks && balance > 0.005; w++) {
    const interest = roundCents((balance * loan.apr) / (4 * weeks))
    const principal =
      left <= 1 ? balance : Math.min(loan.weeklyPrincipalUsd, balance)
    total += interest + principal
    balance = roundCents(balance - principal)
    left--
  }
  return total
}

/** A facility's cash payment in `quarter`: nothing while its project is still building (interest is capitalised), else interest plus a slice. */
function facilityQuarterUsd(
  state: GameState,
  f: Facility,
  quarter: number,
): number {
  // (M18.1: a company facility: its interest, and the bullet in its due quarter)
  if (isCompanyFacility(f)) {
    const due = companyServiceDue(f, quarter)
    return due.interestUsd + due.principalUsd
  }
  const p = getProject(state, f.projectId)
  const live =
    p?.stage === 'live' ||
    (p?.stage === 'building' &&
      p.readyQuarter !== null &&
      p.readyQuarter <= quarter)
  if (!live) return 0
  return (
    (f.balanceUsd * f.apr) / 4 +
    Math.min(f.balanceUsd, f.amountUsd / f.tenorQuarters)
  )
}

/** The quarter the runway looks at: the one after the report's. */
export function runwayQuarter(report: QuarterReport): number {
  return CONTENT.quarters.indexOf(report.quarter) + 1
}

/** The fixed payments of the coming quarter, item by item. */
export function scheduledObligations(
  state: GameState,
  report: QuarterReport,
): { quarter: number; items: Obligation[]; totalUsd: number } {
  const quarter = runwayQuarter(report)
  const items: Obligation[] = []
  if (state.equipmentLoan)
    items.push({
      kind: 'equipment_loan',
      usd: loanQuarterUsd(state.equipmentLoan),
    })
  for (const loan of state.constructionLoans)
    items.push({ kind: 'construction_loan', usd: loanQuarterUsd(loan) })
  const bridge = bridgeSchedule(state)
  if (bridge) {
    // The schedule is relative to the game's quarter: at a quarter's end the coming payment is `next`,
    // in the next Plan phase it is `now`.
    const coming = quarter <= state.quarter ? bridge.now : bridge.next
    if (coming)
      items.push({ kind: 'bridge', usd: coming.totalUsd, phase: coming.phase })
  }
  for (const f of state.facilities) {
    const usd = facilityQuarterUsd(state, f, quarter)
    if (usd > 0)
      items.push({
        kind: f.kind,
        usd,
        projectN: getProject(state, f.projectId)?.n,
      })
  }
  return {
    quarter,
    items,
    totalUsd: items.reduce((sum, i) => sum + i.usd, 0),
  }
}

/**
 * The runway: cash ÷ the burn, where the burn is the scheduled payments of the coming quarter less
 * last quarter's EBITDA. null when that isn't a burn (EBITDA covers the payments).
 */
export function runway(state: GameState, report: QuarterReport) {
  const scheduled = scheduledObligations(state, report)
  const flowUsd = report.ebitdaUsd - scheduled.totalUsd
  return {
    quarters: flowUsd < 0 ? state.cash / -flowUsd : null,
    flowUsd,
    ebitdaUsd: report.ebitdaUsd,
    scheduledUsd: scheduled.totalUsd,
    items: scheduled.items,
    quarter: scheduled.quarter,
  }
}
