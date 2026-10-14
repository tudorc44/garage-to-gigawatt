// M68.1 (doc 43 §0.25 item 4): the news band at the foot of the Plan screen in Acts III-V. Lives apart from selectors.ts
// because the Act III leak guard keeps the selectors from reading a card's scenario field; this file reads only whether
// a card is shared by every scenario or future, never which one it belongs to.
import { CONTENT } from '../content/index.ts'
import { signalsPanelV } from './selectors.ts'
import type { GameState } from './state.ts'

/**
 * Act V: this quarter's first Signals headline. Acts III-IV: the title of this quarter's first card shared by every
 * scenario or future (a scenario-bound card stays hidden until it plays), or nothing. Never text from an earlier act.
 * Null in Acts I-II (the content pack's own headlines) and when the quarter has none.
 */
export function planNewsLine(state: GameState): { headline: string } | { titleKey: string } | null {
  if (state.act === 5) {
    const h = signalsPanelV(state)?.headlines[0]
    return h ? { headline: h } : null
  }
  if (state.act !== 3 && state.act !== 4) return null
  const card = CONTENT.events.cards.find(
    (c) =>
      c.act === state.act &&
      c.quarterIndex === state.quarter &&
      (state.act === 3 ? c.scenario === 'all' : c.future === 'all'),
  )
  return card ? { titleKey: `event.${card.id}.title` } : null
}
