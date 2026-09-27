// Shared helpers for the Act II project tests.
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

/** An Act II company with an empty 20 MW own site, in the Plan phase of `label`. */
export function act2Company(label: string, seed = 1): GameState {
  const s: GameState = {
    ...newGame(seed),
    act: 2,
    quarter: CONTENT.quarters.indexOf(label),
    cash: 500_000_000,
    bandwidth: 6,
  }
  s.sites.push({
    id: 'site-2',
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  return s
}

export function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}
