// Replays: a game is fully described by its seed plus the list of steps taken
// (player actions and weekly ADVANCE ticks). Replaying the same log from the same
// seed must always give the same state: that's what makes bug reports reproducible
// and powers the golden-replay test and, later, the sim-runner bots.
import { CONTENT } from '../content/index.ts'
import { applyAction, type Action } from './actions.ts'
import { advance } from './advance.ts'
import { newGame, type GameState } from './state.ts'
import { defaultChoice } from './systems/interrupts.ts'

export type Step = Action | { type: 'ADVANCE' }

export function applyStep(state: GameState, step: Step): GameState {
  if (step.type === 'ADVANCE') return advance(state)
  const r = applyAction(state, step)
  if (!r.ok) {
    throw new Error(`Replay step ${step.type} failed: ${r.error.key}`)
  }
  return r.state
}

/** Rebuilds a game from its seed and step log. */
export function replay(seed: number, log: Step[]): GameState {
  return log.reduce(applyStep, newGame(seed))
}

export interface Strategy {
  /** Actions to take in a Plan phase (END_PLAN is added automatically). */
  plan(state: GameState): Action[]
  /** Answer to an interrupt; undefined (or no answer function) = the default choice. */
  answer?(state: GameState): string | undefined
  /** The Merge decision; undefined (or no function) = merge.json bot_default. */
  merge?(state: GameState): string | undefined
}

/** Plays a whole game with a strategy, recording every step. Stops at the end or game over. */
export function playGame(
  seed: number,
  strategy: Strategy,
): { state: GameState; log: Step[] } {
  let state = newGame(seed)
  const log: Step[] = []
  const step = (s: Step) => {
    state = applyStep(state, s)
    log.push(s)
  }
  while (state.phase !== 'ended' && state.phase !== 'gameover') {
    if (state.phase === 'plan') {
      for (const a of strategy.plan(state)) step(a)
      step({ type: 'END_PLAN' })
    } else if (state.phase === 'merge') {
      const choice = strategy.merge?.(state) ?? CONTENT.merge.botDefault
      step({ type: 'MERGE_CHOOSE', choice })
    } else if (state.phase === 'live') {
      if (state.interrupt) {
        const choice = strategy.answer?.(state) ?? defaultChoice(state)
        step({ type: 'RESOLVE_INTERRUPT', choice })
      } else step({ type: 'ADVANCE' })
    } else {
      step({ type: 'NEXT_QUARTER' })
    }
  }
  return { state, log }
}
