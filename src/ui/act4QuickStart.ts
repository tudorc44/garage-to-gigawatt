// The Act IV preview's quick-start companies (M27.6; doc 33 §3.4's three presets as working stand-ins). Test builds
// only: imported by screens/Act4Preview.tsx, which the app loads behind an inline mode check, so neither file is in the
// production build (tests/ui/act3Gate.test.ts builds and checks). Each is a sim bot playing a fixed seed from 2017
// through Act II and Act III (on a fixed Act III scenario) to the 2030Q4 chapter report; the app then enters Act IV.
// The recipes are designed (mine, reversible): M32 replaces them with doc 33's sim-made presets and "Start at Act IV".
import type { ScenarioId } from '../content/index.ts'
import type { MessageKey } from '../i18n/t.ts'
import type { GameState } from '../sim/state.ts'

/** Marks the Act IV preview's entry points; the production build must not contain it. */
export const ACT4_PREVIEW_MARKER = 'g2g-act4-preview-entry'

export type Act4QuickStartId = 'fortress' | 'neocloud' | 'ridge'

export const ACT4_QUICK_STARTS: {
  id: Act4QuickStartId
  bot: string
  seed: number
  /** The Act III scenario its company plays (fixed: a quick start is a test-build company). */
  act3Scenario: ScenarioId
  key: MessageKey
  note: MessageKey
}[] = [
  // Ground Fortress: a leased-shell landlord with energized ground MW and a good rating.
  { id: 'fortress', bot: 'texas-shell', seed: 3, act3Scenario: 's0', key: 'ui.act4.quick.fortress', note: 'ui.act4.quick.fortress_note' },
  // Orbit-Ready Neocloud: a company that signs AI tenants and raises to build.
  { id: 'neocloud', bot: 'sign-then-raise', seed: 1, act3Scenario: 's3', key: 'ui.act4.quick.neocloud', note: 'ui.act4.quick.neocloud_note' },
  // Last Ridge: a small survivor (the lifeline company).
  { id: 'ridge', bot: 'lifeline-shell', seed: 19, act3Scenario: 's0', key: 'ui.act4.quick.ridge', note: 'ui.act4.quick.ridge_note' },
]

/** A quick-start company at the end of Act III (its 2030Q4 chapter phase). The bots are loaded only here. */
export async function act4QuickStartCompany(id: Act4QuickStartId): Promise<GameState> {
  const q = ACT4_QUICK_STARTS.find((x) => x.id === id)!
  const [{ BOTS }, { playGame, playFrom }, { toAct3 }] = await Promise.all([
    import('../../tools/bots.ts'),
    import('../sim/replay.ts'),
    import('../sim/state.ts'),
  ])
  const act2End = playGame(q.seed, BOTS[q.bot], { through: 2 }).state
  const act3 = toAct3(act2End, { scenario: q.act3Scenario, forced: true, quickStart: true })
  return playFrom(act3, BOTS[q.bot], { through: 3 }).state
}
