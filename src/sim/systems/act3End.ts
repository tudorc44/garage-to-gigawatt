// The Act III scenario reveal (M11.3, doc 27 §2 / D14): built once, when the last quarter is done or the
// game ends early. This is the ONLY place in src/ allowed to read the hidden views (signalsHidden.ts,
// rivalsHidden.ts, readingScore.ts), because at the end of the act the scenario is no longer a secret. A
// test whitelists exactly this file. The record holds numbers and ids only (M15.3): the chapter report
// reads everything it shows from it, and its text from en.json (act3.reveal.<scenario>.*, event.<id>.title).
import { BALANCE, CONTENT, actFirstQuarter } from '../../content/index.ts'
import { act3CardEngineId } from '../../content/act3Cards.ts'
import { rivalFates } from '../../content/rivalsHidden.ts'
import { signalsHidden } from '../../content/signalsHidden.ts'
import type { Act3End, GameState } from '../state.ts'
import { MOVE_SIGN } from './act3Moves.ts'
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
 * the game-over quarter otherwise, DT).
 */
export function buildAct3End(state: GameState, gameOver = false): Act3End {
  const id = state.scenarioId!
  const h = signalsHidden(id)
  const first = actFirstQuarter(3)
  const lastQ = state.quarter - first
  const qOf = (label: string) => CONTENT.quarters.indexOf(label) - first
  const moves = state.act3Moves ?? []
  const reading = computeReading(moves, id, lastQ)
  const triggerQ = qOf(h.trigger.quarter)
  return {
    scenarioId: id,
    scenarioName: h.scenario_name,
    triggerQuarter: h.trigger.quarter,
    triggerQ,
    trigger: { q: triggerQ, cardId: act3CardEngineId(h.trigger.card_id) },
    decoy: {
      indicator: h.decoy.indicator,
      quarters: [...h.decoy.quarters],
      fromQ: qOf(h.decoy.quarters[0]),
      toQ: qOf(h.decoy.quarters.at(-1)!),
    },
    signalReads: (state.act3SignalReads ?? []).map((r) => ({ ...r })),
    rivalFates: rivalFates(id).map(({ rival, name, fate, withheld }) => ({
      rival,
      name,
      fate,
      withheld,
    })),
    reading: {
      score: reading.score,
      base: reading.base,
      penalty: reading.penalty,
      perQuarter: reading.perQuarter,
    },
    moves: markMoves(moves, id).map((m) => ({
      q: m.q,
      kind: m.kind,
      sign: MOVE_SIGN[m.kind],
      mark: m.mark,
    })),
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
 * The chapter report's figures (M13.3, M14.4, M15.4; A3-11, doc 27 D14): the reveal record, the founder net
 * worth at the end vs at the Act III entry (the growth multiple), the valuation both times, survival, the
 * end quarter, the titles and the wording. A game over gets the reveal too (built at the game over; built
 * here when missing).
 */
export function act3Outcome(state: GameState) {
  const survived = state.phase === 'chapter'
  const end = state.act3End ?? buildAct3End(state, !survived)
  const entry = state.act3Entry!
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  const netWorthUsd = Math.max(0, state.founderStake * valuationUsd)
  return {
    end,
    netWorthUsd,
    entryNetWorthUsd: entry.founderNetWorthUsd,
    growth:
      entry.founderNetWorthUsd > 0
        ? netWorthUsd / entry.founderNetWorthUsd
        : null,
    valuationUsd,
    entryValuationUsd: entry.valuationUsd,
    survived,
    /** The quarter the game ended in (2030Q4, or the game-over quarter), and its Act III index. */
    endQuarter: CONTENT.quarters[state.quarter],
    endQ: state.quarter - actFirstQuarter(3),
    title: end.careerTitleId,
    readingTitle: end.readingTitleId,
    wording: wordingOf(end.reading.score),
  }
}
