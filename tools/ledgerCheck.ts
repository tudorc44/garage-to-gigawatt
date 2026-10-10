// M37.1 (doc 39): the sims' self-check on the ledger. Every run a harness finishes must reconcile: each quarter's start
// cash + its labelled lines + rounding = its end cash (the "untagged" bucket 0). A run that doesn't stops the sim.
import { unreconciled } from '../src/sim/ledger.ts'
import type { GameState } from '../src/sim/state.ts'

/** Throws if any quarter of the run has cash the ledger didn't label. Returns the state, for chaining. */
export function checkedLedger(state: GameState, label: string): GameState {
  const bad = unreconciled(state)
  if (bad.length > 0)
    throw new Error(`ledger self-check (${label}): untagged cash in quarter ${bad[0].q}: ${bad[0].untaggedUsd}`)
  return state
}
