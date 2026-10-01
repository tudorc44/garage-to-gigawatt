// The Act III preview's quick-start companies (M13.1; the design thread's M13 answer 2b). Test builds
// only: imported by screens/Act3Preview.tsx, which the app loads behind ACT3_PREVIEW, so neither file
// (nor the bots they load) is in the production build (tests/ui/act3Gate.test.ts builds and checks).
import { CONTENT } from '../content/index.ts'
import type { MessageKey } from '../i18n/t.ts'
import type { GameState } from '../sim/state.ts'

/** Marks the preview's entry points; the production build must not contain it. */
export const PREVIEW_MARKER = 'g2g-act3-preview-entry'

export type QuickStartId = 'growth' | 'gpu' | 'shell'

/** "Shell landlord": texas-shell seed 3, the lowest seed with a shell lease ending inside Act III (mine, reversible). */
export const QUICK_STARTS: {
  id: QuickStartId
  bot: string
  seed: number
  key: MessageKey
  note: MessageKey
}[] = [
  {
    id: 'growth',
    bot: 'sign-then-raise',
    seed: 1,
    key: 'ui.act3.quick.growth',
    note: 'ui.act3.quick.growth_note',
  },
  {
    id: 'gpu',
    bot: 'overleveraged',
    seed: 1,
    key: 'ui.act3.quick.gpu',
    note: 'ui.act3.quick.gpu_note',
  },
  {
    id: 'shell',
    bot: 'texas-shell',
    seed: 3,
    key: 'ui.act3.quick.shell',
    note: 'ui.act3.quick.shell_note',
  },
]

/**
 * A preset company at the end of Act II (M18.3, A3-12): its recipe's bot plays its seed from 2017 to 2026Q4. The
 * recipes are presets_act3.json's; the bots load only here.
 */
export async function presetAct3Company(
  id: 'good' | 'great' | 'lifeline',
): Promise<GameState> {
  const p = CONTENT.act3Presets.find((x) => x.id === id)!
  const [{ BOTS }, { playGame }] = await Promise.all([
    import('../../tools/bots.ts'),
    import('../sim/replay.ts'),
  ])
  return playGame(p.seed, BOTS[p.bot], { through: 2 }).state
}

/**
 * A quick-start company at the end of Act II (the 2026Q4 chapter phase): the sim bot plays its seed from
 * 2017. The bots live in tools/ and are loaded only here.
 */
export async function quickStartCompany(id: QuickStartId): Promise<GameState> {
  const q = QUICK_STARTS.find((x) => x.id === id)!
  const [{ BOTS }, { playGame }] = await Promise.all([
    import('../../tools/bots.ts'),
    import('../sim/replay.ts'),
  ])
  return playGame(q.seed, BOTS[q.bot], { through: 2 }).state
}
