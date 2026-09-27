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
  /** The lifeline card, when it's offered; undefined (or no function) = take it (the card's default). */
  lifeline?(state: GameState): 'take' | 'pass' | undefined
}

/** Which act a played game stops after: 1 = at the Act I chapter report (after the Merge). */
export interface PlayOptions {
  through?: 1 | 2
}

/** Whether a played game stops here: game over, or the chapter report of the last act played. */
function finished(state: GameState, through: 1 | 2): boolean {
  if (state.phase === 'gameover') return true
  return state.phase === 'chapter' && state.act >= through
}

/**
 * Plays a whole game with a strategy, recording every step. Stops at game over or at the
 * chapter report of the act chosen in `options.through` (default: Act I, after the Merge).
 */
export function playGame(
  seed: number,
  strategy: Strategy,
  options: PlayOptions = {},
): { state: GameState; log: Step[] } {
  return playFrom(newGame(seed), strategy, options)
}

/** Plays on from any state (a loaded save, say) the same way as playGame. */
export function playFrom(
  start: GameState,
  strategy: Strategy,
  { through = 1 }: PlayOptions = {},
): { state: GameState; log: Step[] } {
  let state = start
  const log: Step[] = []
  const step = (s: Step) => {
    state = applyStep(state, s)
    log.push(s)
  }
  while (!finished(state, through)) {
    if (state.phase === 'plan') {
      for (const a of strategy.plan(state)) step(a)
      step({ type: 'END_PLAN' })
    } else if (state.phase === 'merge') {
      const choice = strategy.merge?.(state) ?? CONTENT.merge.botDefault
      step({ type: 'MERGE_CHOOSE', choice })
    } else if (state.phase === 'chapter') {
      step({ type: 'CONTINUE_TO_ACT_2' })
    } else if (state.phase === 'intro') {
      const lifeline =
        state.act2Entry?.lifeline === 'offered'
          ? strategy.lifeline?.(state)
          : undefined
      step(
        lifeline ? { type: 'START_ACT_2', lifeline } : { type: 'START_ACT_2' },
      )
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
