/// <reference types="vite/client" />
// The test-build gate (M13.1; narrowed in M20.2, the Act III public release). Act III itself is in every
// build since M20.2. What stays test-build only: the ?scenario= forcing (and its top-bar tag) and the M13
// quick-start companies ("Act III preview (test build)"). `ACT3_PREVIEW` is on in `npm run dev` (mode
// development) and the staging build (mode staging), off in `npm run build` (mode production: GitHub Pages).
// Vite replaces import.meta.env.MODE with a constant at build time; the app writes the check inline where
// the bundler must drop code (the quick starts, the forcing), and a test builds the game and checks.
import type { Message } from '../i18n/t.ts'
import type { FutureId, ScenarioId } from '../content/index.ts'
import type { GameState } from '../sim/state.ts'

export const ACT3_PREVIEW: boolean = import.meta.env.MODE !== 'production'

/** Marks the scenario-forcing code; the production build must not contain it (tests/ui/act3Gate.test.ts). */
export const FORCING_MARKER = 'g2g-scenario-forcing'

type Loaded = { ok: true; state: GameState } | { ok: false; error: Message }

/**
 * The save guard (M13.1; M20.2): outside a test build, an Act III save loads (normal play, presets, Scenario
 * Mode) unless a test build made it: a forced scenario or a quick-start company. `preview` is the gate; tests
 * pass it explicitly.
 */
export function guardTestBuildSave(
  r: Loaded,
  preview: boolean = ACT3_PREVIEW,
): Loaded {
  if (
    r.ok &&
    !preview &&
    r.state.act === 3 &&
    (r.state.scenarioForced || r.state.act3QuickStart)
  )
    return { ok: false, error: { key: 'error.save_test_build' } }
  // M27.6: an Act IV save made by a test build (a forced future, an Act IV quick start, or carrying a forced Act III
  // scenario or quick start from before) loads only in a test build.
  if (
    r.ok &&
    !preview &&
    r.state.act === 4 &&
    (r.state.futureForced ||
      r.state.act4QuickStart ||
      r.state.scenarioForced ||
      r.state.act3QuickStart)
  )
    return { ok: false, error: { key: 'error.save_test_build' } }
  return r
}

const FUTURES: readonly FutureId[] = ['f1', 'f2', 'f3', 'f4']

/**
 * The tester's forced Act IV future (`?future=f1|f2|f3|f4`, M27.6): only in a test build; null otherwise (the future is
 * drawn). The app calls it behind an inline mode check, so production drops it.
 */
export function forcedFuture(
  search: string,
  preview: boolean = ACT3_PREVIEW,
): FutureId | null {
  if (!preview) return null
  const v = new URLSearchParams(search).get('future')
  if (v === FORCING_MARKER) return null
  return v && (FUTURES as readonly string[]).includes(v) ? (v as FutureId) : null
}

const SCENARIOS: readonly ScenarioId[] = ['s0', 's1', 's2', 's3']

/**
 * The tester's forced scenario, from the page address (`?scenario=s0|s1|s2|s3`): only in a test build;
 * null otherwise (the scenario is drawn, the real rule). The app calls it behind an inline mode check, so
 * production drops it.
 */
export function forcedScenario(
  search: string,
  preview: boolean = ACT3_PREVIEW,
): ScenarioId | null {
  if (!preview) return null
  const v = new URLSearchParams(search).get('scenario')
  if (v === FORCING_MARKER) return null
  return v && (SCENARIOS as readonly string[]).includes(v)
    ? (v as ScenarioId)
    : null
}
