// Shared helpers for the Act II project tests.
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'

/** An Act II company with an empty 20 MW own site, in the Plan phase of `label`. */
export function act2Company(label: string, seed = 1): GameState {
  const s: GameState = {
    ...newGame(seed),
    act: 2,
    quarter: CONTENT.quarters.indexOf(label),
    cash: 500_000_000,
    bandwidth: 6,
    nextId: 3, // site-2 below
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

/** Ends the Plan phase; with `quiet`, no project alerts are planned (for the other tests). */
export function endPlan(s: GameState, quiet = true): GameState {
  s = ok(s, { type: 'END_PLAN' })
  if (quiet) s.projectEvents = []
  return s
}

/** Plays the live quarter (default answers to alerts) and starts the next Plan phase. */
export function playQuarter(s: GameState, quiet = true): GameState {
  s = endPlan(s, quiet)
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return ok(s, { type: 'NEXT_QUARTER' })
}

/** A 1 MW pilot opened and funded in `label`, ready to start. */
export function pilotReady(label = '2023Q3', seed = 1): GameState {
  const s = ok(act2Company(label, seed), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 1000,
    kind: 'pilot',
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

/** A 5 MW shell with its first offer signed and funded, ready to start. */
export function shellReady(label = '2023Q3'): GameState {
  let s = ok(act2Company(label), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: s.projects[0].offers[0].id,
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}
