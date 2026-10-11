// The end of Act V (M49, the walking skeleton; M51 the reveal and the reading score; doc 43 §15). The record the chapter
// report reads: the founder's net worth and the growth multiple against act5Entry, and, at the end of the act, when the
// future is no longer a secret, the reveal: the future's name, its trigger and decoy (the hidden view of its signals
// file), your reads, and the reading score with each move's mark. This is the one place in src/ (besides the score's
// own system) that reads Act V's hidden files. The record holds numbers and ids only (the future's and the decoy's
// names are the files' own); the chapter report takes its words from en.json. The titles and the founder's exit come
// with the exit milestone.
import { BALANCE, CONTENT, actFirstQuarter } from '../../content/index.ts'
import { signalsHiddenV } from '../../content/signalsHiddenV.ts'
import type { Act5End, GameState } from '../state.ts'
import { computeReadingV, markMovesV } from './readingScoreV.ts'
import { exitChoiceOf, exitNetWorthUsd, exitReveal } from './act5Exit.ts'
import { rivalFatesV } from '../../content/rivalsHiddenV.ts'
import { RIVALS_V } from '../../content/rivalsVContent.ts'
import { megawattMix } from './megawattMix.ts'
import { ventureValueUsd } from './ventures.ts'
import { activeRivals } from './rivals.ts'
import { scenarioOf } from './market.ts'

/** The career title: Act II's valuation bands on the last valuation; "bust" after a game over (as Acts III-IV). */
function careerTitleId(state: GameState, gameOver: boolean): string {
  if (gameOver) return 'bust'
  const valuationUsd = state.reports.at(-1)?.valuationUsd ?? 0
  return BALANCE.act2Chapter.titleBands.find((b) => valuationUsd >= b.min)!.id
}

/** Each venture's fate (doc 43 §15.1): its stage, first power, and your stake's value now. */
function ventureFates(state: GameState) {
  return (state.ventures ?? []).map((v) => ({
    type: v.type as string,
    fate: v.stage === 'operating' ? 'built' : v.stage === 'cancelled' ? 'cancelled' : v.stage === 'folded' ? 'folded' : 'slipped',
    firstPower: v.stage === 'operating' ? (CONTENT.quarters[v.codQuarter] ?? null) : null,
    stake: v.stake,
    valueUsd: ventureValueUsd(state, v),
  }))
}

/** The reading title (Act III's bands), or null with no score. */
function readingTitleId(score: number | null): string | null {
  if (score === null) return null
  return BALANCE.act3.readingTitles.find((b) => score >= b.min)!.id
}

export function buildAct5End(state: GameState, gameOver = false): Act5End {
  const valuation = state.reports.at(-1)?.valuationUsd ?? state.cash
  // M57.1 (doc 43 §15.2): net worth after the exit (sold at the bid, or held at the outlook factor)
  const founderNetWorthUsd = exitNetWorthUsd(state, gameOver)
  const entry = state.act5Entry?.founderNetWorthUsd
  const reveal = exitReveal(state)
  const base: Act5End = {
    endQuarter: CONTENT.quarters[state.quarter],
    gameOver,
    founderNetWorthUsd,
    growthMultiple: entry && entry > 0 ? founderNetWorthUsd / entry : null,
    preExitNetWorthUsd: Math.max(0, state.founderStake * valuation),
    exitChoice: gameOver ? null : exitChoiceOf(state),
    outlookFactor: reveal.outlookFactor,
    bidFactor: reveal.bidFactor,
  }
  const future = state.vFutureId
  if (!future) return base
  const first = actFirstQuarter(5)
  const qOf = (label: string) => CONTENT.quarters.indexOf(label) - first
  const h = signalsHiddenV(future)
  const moves = state.act5Moves ?? []
  const reading = computeReadingV(moves, future, state.act5Exposure ?? [], state.quarter - first)
  return {
    ...base,
    vFutureId: future,
    futureName: h.future_name,
    triggerQuarter: h.trigger.quarter,
    triggerTitle: h.trigger.title,
    triggerQ: qOf(h.trigger.quarter),
    decoy: {
      indicator: h.decoy.indicator,
      name: h.decoy.name,
      quarters: [...h.decoy.quarters],
      fromQ: qOf(h.decoy.quarters[0]),
      toQ: qOf(h.decoy.quarters.at(-1)!),
    },
    signalReads: (state.act5SignalReads ?? []).map((r) => ({ quarter: r.quarter, indicator: r.indicator })),
    reading: { score: reading.score, base: reading.base, penalty: reading.penalty, perQuarter: reading.perQuarter },
    moves: markMovesV(moves, future).map((m) => ({ q: m.q, kind: m.kind, sign: m.sign, mark: m.mark })),
    readingTitleId: readingTitleId(reading.score),
    // M57.2 (doc 43 §15.1): the career and megawatt titles, the ventures' fates, the rivals' fates (the hidden file's)
    careerTitleId: careerTitleId(state, gameOver),
    megawatts: megawattMix(state),
    ventureFates: ventureFates(state),
    // (a rival absent from this career, Orrery outside F1/F3, has no fate to tell)
    rivalFates: rivalFatesV(future)
      .filter((f) => {
        const r = RIVALS_V.find((x) => x.id === f.rival)
        return !r?.presentIfAct4Future || r.presentIfAct4Future.includes(state.futureId as never)
      })
      .map((f) => {
        const live = activeRivals(state.quarter, scenarioOf(state)).find((r) => r.id === f.rival)
        return { rival: f.rival, fate: f.fate, valueUsd: live?.valueUsd ?? null, failed: !live }
      }),
  }
}

/** The wording line for a reading score (Act III's thresholds), or null. */
function wordingOf(score: number | null): 'high' | 'mid' | 'low' | null {
  if (score === null) return null
  const w = BALANCE.act3.readingWording
  return score >= w.high ? 'high' : score >= w.mid ? 'mid' : 'low'
}

/**
 * The chapter report's record and wording (the record rebuilt when it is missing or was built before M51). The record
 * exists only once the act is over, so nothing here runs during play.
 */
export function act5Outcome(state: GameState) {
  const stored = state.act5End
  const end = stored?.reading ? stored : buildAct5End(state, state.phase === 'gameover')
  return { end, wording: wordingOf(end.reading?.score ?? null) }
}
