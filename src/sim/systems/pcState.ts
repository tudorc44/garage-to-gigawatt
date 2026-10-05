// Political capital's state helpers (Act III, M17.3): the meter, its low state, and the company-wide Anger
// adjustment. Kept free of other systems so Anger and the grid queue can read them without an import loop.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inAct3Rules, logQuarterLabel, type GameState } from '../state.ts'

const PC = BALANCE.act3.politicalCapital

/** Political capital now (0 outside Act III). */
export function politicalCapital(state: GameState): number {
  return inAct3Rules(state) ? (state.politicalCapital ?? 0) : 0
}

/** Below the threshold (15): the moratorium comes at Anger 40 in your regions, and grid queues take +1 quarter. */
export function lowCapital(state: GameState): boolean {
  return (
    inAct3Rules(state) &&
    state.politicalCapital !== undefined &&
    state.politicalCapital < CONTENT.politicalCapital.lowThreshold
  )
}

/** Moves political capital, kept within 0–100. */
export function addPc(state: GameState, delta: number): void {
  state.politicalCapital = Math.max(
    0,
    Math.min(100, (state.politicalCapital ?? 0) + delta),
  )
}

/**
 * The water moratorium's hold (M17.8 F) on starting this project or opening a project at this site, or undefined:
 * the reason, with the first quarter it lifts.
 */
export function waterPauseBlocker(
  state: GameState,
  on: { projectId?: string; siteId?: string },
): Message | undefined {
  const pause = state.act3Gov?.pause
  if (!pause?.kind || pause.untilQuarter === undefined) return undefined
  if (state.quarter > pause.untilQuarter) return undefined
  const quarter = logQuarterLabel(state, pause.untilQuarter + 1, '')
  if (pause.kind === 'start' && on.projectId && pause.projectId === on.projectId)
    return { key: 'error.water_pause_start', params: { quarter } }
  if (pause.kind === 'site' && on.siteId && pause.siteId === on.siteId)
    return { key: 'error.water_pause_site', params: { quarter } }
  return undefined
}

/** Moves the company-wide Anger adjustment, kept within −20…+20 (DT). */
export function adjustAnger(state: GameState, delta: number): void {
  state.angerAdj = Math.max(
    PC.angerAdj.min,
    Math.min(PC.angerAdj.max, (state.angerAdj ?? 0) + delta),
  )
}
