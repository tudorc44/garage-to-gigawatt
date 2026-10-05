// The Act IV preset companies (M32.4, A4-13), in every build. A preset is a real company: its recipe's bot plays its seed
// from 2017 through Act II, then through Act III on its scenario, to the 2030Q4 chapter (presets_act4.json). The bots
// load only when a preset starts, in their own lazy chunk (as Act III's presets, act3PresetStart.ts).
import { PRESETS_IV, type Act4PresetId } from '../content/presetsAct4.ts'
import type { GameState } from '../sim/state.ts'

export type { Act4PresetId }

/** A preset company at the end of Act III (its 2030Q4 chapter phase). */
export async function presetAct4Company(id: Act4PresetId): Promise<GameState> {
  const p = PRESETS_IV.find((x) => x.id === id)!
  const [{ BOTS }, { playGame, playFrom }, { toAct3 }] = await Promise.all([
    import('../../tools/bots.ts'),
    import('../sim/replay.ts'),
    import('../sim/state.ts'),
  ])
  const act2End = playGame(p.seed, BOTS[p.bot], { through: 2 }).state
  return playFrom(toAct3(act2End, { scenario: p.act3_scenario }), BOTS[p.bot], { through: 3 }).state
}
