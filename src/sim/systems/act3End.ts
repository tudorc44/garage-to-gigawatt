// The Act III scenario reveal (M11.3, doc 27 §2 / D14): built once, when the last quarter is done or the
// game ends early. This is the ONLY place in src/ allowed to read the hidden views (signalsHidden.ts,
// rivalsHidden.ts, readingScore.ts), because at the end of the act the scenario is no longer a secret. A
// test whitelists exactly this file.
import { BALANCE, actFirstQuarter } from '../../content/index.ts'
import { act3CardEngineId } from '../../content/act3Cards.ts'
import { rivalFates } from '../../content/rivalsHidden.ts'
import { signalsHidden } from '../../content/signalsHidden.ts'
import { CONTENT } from '../../content/index.ts'
import type { Act3End, GameState } from '../state.ts'
import { computeReading, markMoves } from './readingScore.ts'

/** The career title (DT): Act II's valuation bands on the last valuation; "bust" after a game over. */
function careerTitleId(state: GameState, gameOver: boolean): string {
  if (gameOver) return 'bust'
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  return BALANCE.act2Chapter.titleBands.find((b) => valuationUsd >= b.min)!.id
}

/** The reading title (M14.1 bands), or null with no score. */
function readingTitleId(score: number | null): string | null {
  if (score === null) return null
  return BALANCE.act3.readingTitles.find((b) => score >= b.min)!.id
}

/**
 * The reveal record for a finished Act III game (the chapter phase, or a game over: `gameOver`). Call only
 * on a state that has a scenario. The reading score counts quarters up to this one (15 at a normal end;
 * the game-over quarter otherwise, DT). Numbers only: the text is worked out when the report opens.
 */
export function buildAct3End(state: GameState, gameOver = false): Act3End {
  const id = state.scenarioId!
  const h = signalsHidden(id)
  const first = actFirstQuarter(3)
  const lastQ = state.quarter - first
  const reading = computeReading(state.act3Moves ?? [], id, lastQ)
  return {
    scenarioId: id,
    scenarioName: h.scenario_name,
    triggerQuarter: h.trigger.quarter,
    triggerQ: CONTENT.quarters.indexOf(h.trigger.quarter) - first,
    decoy: { indicator: h.decoy.indicator, quarters: [...h.decoy.quarters] },
    signalReads: (state.act3SignalReads ?? []).map((r) => ({ ...r })),
    rivalFates: rivalFates(id).map(({ rival, name, fate }) => ({
      rival,
      name,
      fate,
    })),
    reading: {
      score: reading.score,
      base: reading.base,
      penalty: reading.penalty,
      perQuarter: reading.perQuarter,
    },
    careerTitleId: careerTitleId(state, gameOver),
    readingTitleId: readingTitleId(reading.score),
  }
}

/** The wording line for a reading score (DT thresholds: high ≥ 70, mid 40–69, low ≤ 39), or null. */
function wordingOf(score: number | null): 'high' | 'mid' | 'low' | null {
  if (score === null) return null
  const w = BALANCE.act3.readingWording
  return score >= w.high ? 'high' : score >= w.mid ? 'mid' : 'low'
}

/**
 * The chapter report's figures (M13.3, M14.4; A3-11, doc 27 D14): the founder net worth at the end vs at
 * the Act III entry (the growth multiple), the valuation both times, survival, the career and reading
 * titles and the reading score. A game over gets the reveal too (built at the game over; built here when
 * missing).
 */
export function act3Outcome(state: GameState) {
  const survived = state.phase === 'chapter'
  const end = state.act3End ?? buildAct3End(state, !survived)
  const entry = state.act3Entry!
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  const netWorthUsd = Math.max(0, state.founderStake * valuationUsd)
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
    /** The quarter the game ended in (2030Q4, or the game-over quarter). */
    endQuarter: CONTENT.quarters[state.quarter],
    title: end.careerTitleId,
    readingTitle: end.readingTitleId,
    wording: wordingOf(end.reading.score),
  }
}

/**
 * What the chapter report's reveal shows beyond the stored record (M13.3, M14.4; A3-11), worked out when it
 * is shown: the trigger card (its engine id, for its title in en.json), the decoy's reason and tell, which
 * rivals' fates wait for the D15 review (doc 27 §15: withheld even in test builds), and each logged move
 * with its quarter, its timing against the trigger and its mark. Call only at the end of Act III.
 */
export function act3RevealDetails(state: GameState) {
  const id = state.scenarioId!
  const h = signalsHidden(id)
  const first = actFirstQuarter(3)
  const triggerQ = CONTENT.quarters.indexOf(h.trigger.quarter) - first
  return {
    triggerCard: act3CardEngineId(h.trigger.card_id),
    decoyReason: h.decoy.reason,
    decoyTell: h.decoy.tell,
    withheldRivals: rivalFates(id)
      .filter((f) => f.d15Review)
      .map((f) => f.rival),
    moves: markMoves(state.act3Moves ?? [], id).map((m) => ({
      ...m,
      quarter: CONTENT.quarters[first + m.q],
      /** Quarters from the trigger: negative = before, 0 = in it, positive = after. */
      fromTrigger: m.q - triggerQ,
    })),
  }
}
