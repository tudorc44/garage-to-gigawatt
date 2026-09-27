// The prologue's event cards (Alpha 0.3 §2.10; events_prologue.json). Built in P3; until then the
// engine's hooks do nothing.
import type { MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import type { GameState } from '../state.ts'

/** Plans this quarter's cards as the live quarter starts. */
export function schedulePrologueEvents(state: GameState): void {
  void state
}

/** After a week is played: the first due card pauses the quarter. */
export function checkPrologueEvents(state: GameState, w: MarketWeek): void {
  void state
  void w
}

/** Answers the card on screen. */
export function resolvePrologueInterrupt(
  state: GameState,
  choice: string,
): Message | undefined {
  void state
  void choice
  return { key: 'error.bad_choice' }
}
