// The Act IV move log (M32.1; doc 33 §6.7, IV-D10). Each player action that changes the company's orbital exposure adds
// one entry { q, kind } (q: the Act IV quarter, 0–19): +1 adds exposure (committing a block's capital, drawing orbital
// debt, a launch booking, buying a failed rival's blocks), −1 reduces it (insurance, selling a block, a take-or-pay
// presale, cancelling a booking or a block, an equity raise). Ground and lunar moves are logged at 0 for the reveal's
// timeline (the money already judges them). NOT hidden: it knows nothing about the future; the reading score
// (readingScoreIv.ts, hidden) reads the log at the end of the act.
import { actFirstQuarter } from '../../content/index.ts'
import type { Action } from '../actions.ts'
import { inActIV, type Act4MoveKind, type GameState } from '../state.ts'

export const ACT4_MOVE_SIGN: Record<Act4MoveKind, -1 | 0 | 1> = {
  orbit_commit: 1,
  orbit_debt: 1,
  launch_booking: 1,
  orbit_buy: 1,
  orbit_insure: -1,
  orbit_sale: -1,
  orbit_presale: -1,
  launch_cancel: -1,
  equity_raise: -1,
  ground_move: 0,
  lunar_move: 0,
}

/** The ground actions logged for the timeline (big moves the money already judges). */
const GROUND: ReadonlySet<Action['type']> = new Set([
  'PROJECT_START',
  'PROJECT_SELL',
  'BUILD_SITE',
  'BUILD_PHASE',
  'RETROFIT',
  'REFIT_GPUS',
  'BUY_DISTRESSED_FLEET',
])
const LUNAR: ReadonlySet<Action['type']> = new Set([
  'CLAIM_LUNAR_SITE',
  'SEND_LUNAR_MISSION',
  'BUILD_LUNAR_SOLAR',
  'LEASE_LUNAR_REACTOR',
  'DECIDE_LUNAR_PILOT',
  'DECIDE_LUNAR_PRODUCTION',
  'SIGN_LUNAR_OFFTAKE',
])

/** The kind an applied action counts as in Act IV, or null (not a move). */
export function act4MoveKind(a: Action): Act4MoveKind | null {
  switch (a.type) {
    case 'ARRANGE_ORBITAL_CAPITAL':
      return a.capital === 'export_credit' || a.capital === 'project_debt' ? 'orbit_debt' : 'orbit_commit'
    case 'BOOK_ORBITAL_LAUNCH':
      return 'launch_booking'
    case 'BUY_ORRERY_BLOCKS':
      return 'orbit_buy'
    case 'BUY_ORBITAL_INSURANCE':
      return 'orbit_insure'
    case 'SELL_ORBITAL_BLOCK':
      return 'orbit_sale'
    case 'SIGN_ORBITAL_TENANT':
      return a.offer === 'spot' ? null : 'orbit_presale'
    case 'CANCEL_ORBITAL_LAUNCH':
    case 'CANCEL_ORBITAL_BLOCK':
      return 'launch_cancel'
    case 'RAISE_EQUITY':
      return 'equity_raise'
    default:
      return GROUND.has(a.type) ? 'ground_move' : LUNAR.has(a.type) ? 'lunar_move' : null
  }
}

/** After an action succeeded in Act IV: logs it if it's a move. */
export function recordAct4Move(next: GameState, a: Action): void {
  if (!inActIV(next) || next.phase !== 'plan') return
  const kind = act4MoveKind(a)
  if (!kind) return
  ;(next.act4Moves ??= []).push({ q: next.quarter - actFirstQuarter(4), kind })
}
