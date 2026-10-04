// The Act III preset companies (M18.3, A3-12), in every build since M20.2 (the Act III public release). A preset
// is a real Act II company: its recipe's bot plays its seed from 2017 to 2026Q4 (presets_act3.json). The bots
// load only when a preset starts, in their own lazy chunk.
import { CONTENT } from '../content/index.ts'
import type { GameState } from '../sim/state.ts'

export type PresetId = 'good' | 'great' | 'lifeline'

/** A preset company at the end of Act II (the 2026Q4 chapter phase). */
export async function presetAct3Company(id: PresetId): Promise<GameState> {
  const p = CONTENT.act3Presets.find((x) => x.id === id)!
  const [{ BOTS }, { playGame }] = await Promise.all([
    import('../../tools/bots.ts'),
    import('../sim/replay.ts'),
  ])
  return playGame(p.seed, BOTS[p.bot], { through: 2 }).state
}
