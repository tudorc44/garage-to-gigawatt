// The Act III scenario reveal (M11.3, doc 27 §2 / D14): built once, when the last quarter is done. This
// is the ONLY place in src/ allowed to read the hidden signals view (signalsHidden.ts), because at
// the end of the act the scenario is no longer a secret. A test whitelists exactly this file.
import { rivalFates } from '../../content/rivalsHidden.ts'
import { signalsHidden } from '../../content/signalsHidden.ts'
import type { Act3End, GameState } from '../state.ts'

/** The reveal record for a finished Act III game. Call only on a state that has a scenario. */
export function buildAct3End(state: GameState): Act3End {
  const id = state.scenarioId!
  const h = signalsHidden(id)
  return {
    scenarioId: id,
    scenarioName: h.scenario_name,
    triggerQuarter: h.trigger.quarter,
    decoy: { indicator: h.decoy.indicator, quarters: [...h.decoy.quarters] },
    signalReads: (state.act3SignalReads ?? []).map((r) => ({ ...r })),
    rivalFates: rivalFates(id).map(({ rival, name, fate }) => ({
      rival,
      name,
      fate,
    })),
  }
}
