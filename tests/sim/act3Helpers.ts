// Shared helper for the Act III tests. This state is unreachable from play: a test/sim harness
// constructs it directly, exactly the way act2Helpers.ts's act2Company does for Act II (an Act II
// company flipped to 2027Q1). No head start and no carried-over Heat/Anger/rating/etc.: those are
// Act III rules no milestone has wired yet.
import { toAct3, type GameState } from '../../src/sim/state.ts'
import type { ScenarioId } from '../../src/content/index.ts'
import { act2Company } from './act2Helpers.ts'

/**
 * An Act III company on scenario `id`, at the start of 2027Q1: an Act II company (20 MW own site) with a
 * working fleet of 500 S21s, so the scenario's own market decides what it earns. The scenario is forced
 * (toAct3's test-only option), not drawn.
 */
export function act3ScenarioCompany(id: ScenarioId, seed = 1): GameState {
  const s = toAct3(act2Company('2026Q4', seed), { scenario: id })
  s.machines.push({
    id: 'lot-test',
    model: 's21',
    siteId: 'site-2',
    condition: 'new',
    count: 500,
    failed: 0,
    earnsFromQuarter: 0,
  })
  return s
}

/** An Act III state with no scenario: not a state the game makes (toAct3 always sets one); for guard tests. */
export function act3WithoutScenario(seed = 1): GameState {
  const s = toAct3(act2Company('2026Q4', seed))
  delete s.scenarioId
  return s
}
