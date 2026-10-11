// The Act V move log (M51; doc 43 §6.7 with §0.2, V-D21). Each player action that changes the company's scarcity
// exposure (a bet that firm ground power stays scarce and dear) adds one entry { q, kind } (q: the Act V quarter, 0–19).
// The log holds kinds only: the signs are in reading_score_v.json (hidden; the same in every future, but the file is
// read only by readingScoreV.ts), applied at the end of the act. Act V's own actions (plants, the queue, lease offers,
// orbit replacement) log themselves as their milestones land; M51 logs the carried actions that already mean a move.
// Also the exposure line the low-exposure rule reads (`act5Exposure`). NOT hidden: nothing here knows the future.
import { actFirstQuarter } from '../../content/index.ts'
import type { Action } from '../actions.ts'
import { inActV, type Act5MoveKind, type GameState, type QuarterReport } from '../state.ts'
import { scenarioOf } from './market.ts'
import { aiInfraMultiple } from './valuation.ts'

/**
 * The kind a carried action counts as in Act V, or null (not a move). Mine, reversible (M51): selling a built project
 * is selling leases' value (doc 43 §0.2's "sell a site", −1); a grid request at a site is `request_grid_mw` (0, §14.1);
 * an equity raise follows the M41 rule.
 */
export function act5MoveKind(a: Action): Act5MoveKind | null {
  switch (a.type) {
    case 'RAISE_EQUITY':
      return 'equity_raise'
    case 'PROJECT_SELL':
      return 'sell_site_free_mw'
    case 'PROJECT_OPEN':
      return a.power === 'grid' ? 'request_grid_mw' : null
    // M52 (doc 43 §14.1): the plant actions
    case 'ARRANGE_PLANT_DEBT':
      return 'arrange_plant_debt'
    case 'SELL_PLANT_STAKE':
      return 'sell_plant_stake_to_fund'
    case 'CONTRACT_PLANT_OUTPUT':
      return 'contract_plant_output'
    default:
      return null
  }
}

/** Logs one move now (for Act V's own systems, which know their move's kind). */
export function logAct5Move(state: GameState, kind: Act5MoveKind): void {
  if (!inActV(state)) return
  ;(state.act5Moves ??= []).push({ q: state.quarter - actFirstQuarter(5), kind })
}

/** After an action succeeded in Act V's Plan phase: logs it if it's a move. */
export function recordAct5Move(next: GameState, a: Action): void {
  if (!inActV(next) || next.phase !== 'plan') return
  const kind = act5MoveKind(a)
  if (kind) logAct5Move(next, kind)
}

/**
 * The quarter's scarcity exposure as a share of act5Entry's valuation (reading_score_v.json `low_exposure_quiet`, mine
 * as in M43.0c-e's gate): the ground AI book's EBITDA × 4 × the AI multiple, free MW at the powered price and the
 * venture stakes, from the quarter's report.
 */
export function exposureShare(state: GameState, r: QuarterReport): number {
  const base = state.act5Entry?.valuationUsd ?? 0
  if (base <= 0) return 0
  const leases = Math.max(0, r.aiRevenueUsd - r.aiCostUsd) * 4 * aiInfraMultiple(state.quarter, scenarioOf(state))
  return (leases + (r.poweredUsd ?? 0) + Math.max(0, r.venturesUsd ?? 0)) / base
}

/** At each Act V quarter's end, after its report: records the exposure share. */
export function recordAct5Exposure(state: GameState, r: QuarterReport): void {
  if (!inActV(state)) return
  ;(state.act5Exposure ??= [])[state.quarter - actFirstQuarter(5)] = exposureShare(state, r)
}
