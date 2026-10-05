// Test helpers for Act IV (M27.4). An Act III company (tests/sim/act3Helpers.ts) played through all 16 Act III quarters
// with an empty plan, to its chapter report (2030Q4), then across the boundary on a chosen future.
import type { FutureId, ScenarioId } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct4, type GameState } from '../../src/sim/state.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const cache = new Map<string, GameState>()

/** The Act III company at its 2030Q4 chapter report (cached per scenario and seed; returns a copy). */
export function act3Finished(scenario: ScenarioId, seed = 1): GameState {
  const key = `${scenario}:${seed}`
  if (!cache.has(key)) {
    const run = playFrom(act3ScenarioCompany(scenario, seed), { plan: () => [] }, { through: 3 })
    cache.set(key, run.state)
  }
  return structuredClone(cache.get(key)!)
}

/** An Act IV company in 2031Q1's Plan phase: the Act III company above, entered on `future`. */
export function act4Company(scenario: ScenarioId, future: FutureId, seed = 1): GameState {
  return toAct4(act3Finished(scenario, seed), { future })
}
