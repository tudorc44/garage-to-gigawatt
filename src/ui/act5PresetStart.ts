// The Act V preset companies (M49, doc 43 §3.4), in every build. A preset is a real company: its recipe plays its Act IV
// preset's line through Act IV on its future (presets_act5.json, tools/act5/presetRun.ts), then crosses into Act V. The
// bots load only when a preset starts, in their own lazy chunk (as Act IV's presets, act4PresetStart.ts).
import { PRESETS_V, type Act5PresetId } from '../content/presetsAct5.ts'
import type { VentureType } from '../content/energyContent.ts'
import type { GameState } from '../sim/state.ts'

export type { Act5PresetId }

/** A preset company at the end of Act IV (its 2035Q4 chapter phase), carrying its Act IV future. */
export async function presetAct5Company(id: Act5PresetId): Promise<GameState> {
  const p = PRESETS_V.find((x) => x.id === id)!
  const { playAct5Recipe } = await import('../../tools/act5/presetRun.ts')
  return playAct5Recipe({
    act4_preset: p.act4_preset,
    act4_future: p.act4_future,
    act4_seed: p.act4_seed,
    joins: p.joins === 'btm' ? 'btm' : (p.joins as VentureType[]),
  })
}
