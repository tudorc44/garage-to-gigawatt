// The Act III scenario reveal (M11.3, doc 27 §2 / D14): built once, when the last quarter is done. This
// is the ONLY place in src/ allowed to read the hidden signals view (signalsHidden.ts), because at
// the end of the act the scenario is no longer a secret. A test whitelists exactly this file.
import { BALANCE } from '../../content/index.ts'
import { act3CardEngineId } from '../../content/act3Cards.ts'
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

/**
 * The chapter report's figures (M13.3; A3-11, doc 27 D14 and the wireframe README's conflict 1): the
 * founder net worth at the end vs at the Act III entry (the growth multiple), the valuation both times,
 * survival, and the title (Act II's bands on the end valuation for now; mine, reversible). A game over
 * gets the reveal too, built when shown.
 */
export function act3Outcome(state: GameState) {
  const end = state.act3End ?? buildAct3End(state)
  const entry = state.act3Entry!
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  const netWorthUsd = Math.max(0, state.founderStake * valuationUsd)
  const survived = state.phase === 'chapter'
  const title = survived
    ? BALANCE.act2Chapter.titleBands.find((b) => valuationUsd >= b.min)!.id
    : 'bust'
  return {
    end,
    details: act3RevealDetails(state),
    netWorthUsd,
    entryNetWorthUsd: entry.founderNetWorthUsd,
    growth:
      entry.founderNetWorthUsd > 0
        ? netWorthUsd / entry.founderNetWorthUsd
        : null,
    valuationUsd,
    entryValuationUsd: entry.valuationUsd,
    survived,
    title,
  }
}

/**
 * What the chapter report's reveal shows beyond the stored record (M13.3; A3-11), worked out when it is
 * shown, so the stored record (and the goldens) don't change: the trigger card (its engine id, for its
 * title in en.json), the decoy's reason and tell, and which rivals' fates wait for the D15 review
 * (doc 27 §15: withheld even in test builds). Call only at the end of Act III (the reveal).
 */
export function act3RevealDetails(state: GameState) {
  const id = state.scenarioId!
  const h = signalsHidden(id)
  return {
    triggerCard: act3CardEngineId(h.trigger.card_id),
    decoyReason: h.decoy.reason,
    decoyTell: h.decoy.tell,
    withheldRivals: rivalFates(id)
      .filter((f) => f.d15Review)
      .map((f) => f.rival),
  }
}
