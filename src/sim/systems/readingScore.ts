// The Act III reading score (M14.3; doc 27 D14 and §5 "score for reading"). HIDDEN: the ideal stance per
// quarter gives the scenario away, so this file (the only reader of src/content/reading_score.json) is
// imported only by systems/act3End.ts (the end-of-act reveal), tests/ and tools/ (grep-tested). Pure:
// it works on the move log and a scenario id, nothing else.
//
// Per quarter: the player's stance = the sign of the sum of that quarter's move signs (0 for no move or a
// tie). Against the scenario's ideal: a match (≠ 0) scores 1.0; both 0 scores 0.7, or 1.0 inside the
// decoy window (you held your nerve); exactly one of them 0 scores 0.5; opposite signs 0. Weighted by the
// quarter's weight (weight 0 doesn't count). base = round(100 × Σ w·value / Σ w); penalty = 10 per move
// inside the decoy window whose sign is the decoy's wrong stance, at most 30; score = clamp(base − penalty).
import raw from '../../content/reading_score.json' with { type: 'json' }
import type { ScenarioId } from '../../content/index.ts'
import type { Act3Move, Act3MoveKind } from '../state.ts'
import { MOVE_SIGN } from './act3Moves.ts'

type ScenarioReading = {
  ideal: number[]
  weight: number[]
  decoy: { quarters: string[]; wrong_stance: number }
}

const FILE = raw as unknown as {
  _meta: { quarters: string[] }
  scoring: {
    match: number
    calm_and_quiet: number
    one_neutral: number
    opposite: number
    decoy_penalty_per_move: number
    decoy_penalty_cap: number
    calm_in_decoy_window: number
  }
  scenarios: Record<ScenarioId, ScenarioReading>
}
const S = FILE.scoring

/** The last Act III quarter index (2030Q4). */
export const LAST_Q = FILE._meta.quarters.length - 1

/** The decoy window as Act III quarter indices. */
function decoyQuarters(id: ScenarioId): number[] {
  return FILE.scenarios[id].decoy.quarters.map((label) =>
    FILE._meta.quarters.indexOf(label),
  )
}

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0)

export interface QuarterReading {
  q: number
  stance: number
  ideal: number
  weight: number
  value: number
}

export interface Reading {
  /** 0–100, or null when no counted quarter has weight (shown as "—"). */
  score: number | null
  base: number
  penalty: number
  perQuarter: QuarterReading[]
}

/**
 * The reading score of a move log on a scenario, counting quarters 0..lastQ (15 at a normal end; the
 * game-over quarter otherwise, DT).
 */
export function computeReading(
  moves: readonly Pick<Act3Move, 'q' | 'kind'>[],
  scenarioId: ScenarioId,
  lastQ: number = LAST_Q,
): Reading {
  const sc = FILE.scenarios[scenarioId]
  const decoy = decoyQuarters(scenarioId)
  const perQuarter: QuarterReading[] = []
  let sumW = 0
  let sumWV = 0
  for (let q = 0; q <= Math.min(lastQ, LAST_Q); q++) {
    const weight = sc.weight[q]
    if (weight === 0) continue
    const stance = sign(
      moves.filter((m) => m.q === q).reduce((s, m) => s + MOVE_SIGN[m.kind], 0),
    )
    const ideal = sc.ideal[q]
    const value =
      stance !== 0 && stance === ideal
        ? S.match
        : stance === 0 && ideal === 0
          ? decoy.includes(q)
            ? S.calm_in_decoy_window
            : S.calm_and_quiet
          : stance === 0 || ideal === 0
            ? S.one_neutral
            : S.opposite
    perQuarter.push({ q, stance, ideal, weight, value })
    sumW += weight
    sumWV += weight * value
  }
  const decoyMoves = moves.filter(
    (m) =>
      m.q <= lastQ &&
      decoy.includes(m.q) &&
      MOVE_SIGN[m.kind] === sc.decoy.wrong_stance,
  ).length
  const penalty = Math.min(
    S.decoy_penalty_cap,
    S.decoy_penalty_per_move * decoyMoves,
  )
  if (sumW === 0) return { score: null, base: 0, penalty, perQuarter }
  const base = Math.round((100 * sumWV) / sumW)
  return {
    score: Math.min(100, Math.max(0, base - penalty)),
    base,
    penalty,
    perQuarter,
  }
}

/**
 * The reveal's mark for each move (M14.4): ✓ its sign matches its quarter's ideal; ✗ the opposite sign, or a
 * decoy-sign move inside the decoy window ("reacted to the decoy"); – an ideal of 0 or a weight of 0.
 */
export function markMoves(
  moves: readonly Pick<Act3Move, 'q' | 'kind'>[],
  scenarioId: ScenarioId,
): { q: number; kind: Act3MoveKind; mark: 'match' | 'opposite' | 'decoy' | 'neutral' }[] {
  const sc = FILE.scenarios[scenarioId]
  const decoy = decoyQuarters(scenarioId)
  return moves.map((m) => {
    const s = MOVE_SIGN[m.kind]
    const mark =
      decoy.includes(m.q) && s === sc.decoy.wrong_stance
        ? 'decoy'
        : sc.weight[m.q] === 0 || sc.ideal[m.q] === 0
          ? 'neutral'
          : s === sc.ideal[m.q]
            ? 'match'
            : 'opposite'
    return { q: m.q, kind: m.kind, mark }
  })
}

/** Oracle logs for tools/ and tests (M14.5): no moves, and one move matching each non-zero ideal quarter. */
export function oracleLogs(scenarioId: ScenarioId): {
  passive: Act3Move[]
  perfect: Act3Move[]
  opposite: Act3Move[]
} {
  const ideal = FILE.scenarios[scenarioId].ideal
  const kindOf = (s: number): Act3MoveKind =>
    s > 0 ? 'project_commit' : 'sale_voluntary'
  const nonZero = ideal.flatMap((v, q) => (v === 0 ? [] : [{ q, v }]))
  return {
    passive: [],
    perfect: nonZero.map(({ q, v }) => ({ q, kind: kindOf(v) })),
    opposite: nonZero.map(({ q, v }) => ({ q, kind: kindOf(-v) })),
  }
}
