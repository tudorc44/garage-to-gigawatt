// Bandwidth: the founder's attention. Refilled each quarter; unused points are lost.
import { BALANCE } from '../../content/index.ts'
import type { GameState } from '../state.ts'
import { isReady } from './sites.ts'

/** Bandwidth for the quarter: 3, +1 once the 20 MW own site is energized, capped at 6. */
export function bandwidthForQuarter(state: GameState): number {
  const b = BALANCE.bandwidth
  const bonus = state.sites.some(
    (s) => s.tier === b.bonusSiteTier && isReady(s, state.quarter),
  )
    ? 1
    : 0
  return Math.min(b.perQuarter + bonus, b.max)
}
