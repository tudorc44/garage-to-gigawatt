/// <reference types="vite/client" />
// The Act III preview gate (M13.1; the design thread's M13 answer 1). Act III is a test build feature:
// on in `npm run dev` (mode development) and the staging build (mode staging), off in `npm run build`
// (mode production: the GitHub Pages deploy). Vite replaces import.meta.env.MODE with a constant at
// build time, so in production `ACT3_PREVIEW` is `false` and every `if (ACT3_PREVIEW)` branch, with the
// preview code only it imports, is dropped from the bundle (a test builds the game and checks).
import type { Message } from '../i18n/t.ts'
import type { ScenarioId } from '../content/index.ts'
import type { GameState } from '../sim/state.ts'

export const ACT3_PREVIEW: boolean = import.meta.env.MODE !== 'production'

type Loaded = { ok: true; state: GameState } | { ok: false; error: Message }

/**
 * The save guard: outside a test build, a save from Act III (act 3) can't be loaded (a test build made
 * it). `preview` is the gate; tests pass it explicitly.
 */
export function guardTestBuildSave(
  r: Loaded,
  preview: boolean = ACT3_PREVIEW,
): Loaded {
  if (r.ok && r.state.act === 3 && !preview)
    return { ok: false, error: { key: 'error.save_test_build' } }
  return r
}

const SCENARIOS: readonly ScenarioId[] = ['s0', 's1', 's2', 's3']

/**
 * The tester's forced scenario, from the page address (`?scenario=s0|s1|s2|s3`): only in a test build;
 * null otherwise (the scenario is drawn, the real rule).
 */
export function forcedScenario(
  search: string,
  preview: boolean = ACT3_PREVIEW,
): ScenarioId | null {
  if (!preview) return null
  const v = new URLSearchParams(search).get('scenario')
  return v && (SCENARIOS as readonly string[]).includes(v)
    ? (v as ScenarioId)
    : null
}
