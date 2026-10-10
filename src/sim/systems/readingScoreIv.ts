// The Act IV reading score (M32.1; doc 33 §6.7, IV-D10). HIDDEN: the ideal stance per quarter gives the future away, so
// this file (the only reader of src/content/reading_score_iv.json) is imported only by systems/act4End.ts (the
// end-of-act reveal), tests/ and tools/ (grep-tested). Act III's rules (readingScore.ts), on orbital exposure: per
// quarter the player's stance is the sign of the sum of that quarter's move signs; against the future's ideal a match
// scores 1, both calm 0.7 (1 inside the decoy window), one calm 0.5, opposite 0; weighted; base = round(100 × Σ w·v / Σ
// w); a penalty of 10 per move inside the decoy window with the decoy's wrong sign, at most 30.
import { z } from 'zod'
import raw from '../../content/reading_score_iv.json' with { type: 'json' }
import type { FutureId } from '../../content/index.ts'
import type { Act4Move, Act4MoveKind } from '../state.ts'
import { ACT4_MOVE_SIGN } from './act4Moves.ts'

const stance = z.union([z.literal(-1), z.literal(0), z.literal(1)])
const futureSchema = z.object({
  /** M36.11 (F2): a quarter with no orbital move while holding no orbital exposure scores this (a match). */
  quiet_no_exposure: z.number().optional(),
  ideal: z.array(stance).length(20),
  weight: z.array(z.number().nonnegative()).length(20),
  decoy: z.object({ indicator: z.string(), quarters: z.array(z.string()).min(1), wrong_stance: stance }),
})
const FILE = z
  .object({
    _meta: z.object({ quarters: z.array(z.string()).length(20) }),
    scoring: z.object({
      match: z.number(),
      calm_and_quiet: z.number(),
      one_neutral: z.number(),
      opposite: z.number(),
      decoy_penalty_per_move: z.number(),
      decoy_penalty_cap: z.number(),
      calm_in_decoy_window: z.number(),
    }),
    futures: z.object({ f1: futureSchema, f2: futureSchema, f3: futureSchema, f4: futureSchema }),
  })
  .parse(raw)
const S = FILE.scoring

/** The last Act IV quarter index (2035Q4). */
export const LAST_Q_IV = 19

const decoyQuarters = (id: FutureId) => FILE.futures[id].decoy.quarters.map((l) => FILE._meta.quarters.indexOf(l))
const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0)

/** A build's own hedges and debt (M40.1): 0 in a quarter where a block's capital is arranged. */
const BUILD_HEDGES: ReadonlySet<Act4MoveKind> = new Set(['orbit_presale', 'orbit_insure', 'orbit_debt'])
const isBuild = (k: Act4MoveKind) => k === 'orbit_commit' || k === 'orbit_debt'

/**
 * Each move's scored sign (M40.1, design thread answer 1 after M39), in log order:
 * (a) in a quarter where a build's capital is arranged (a commit or an orbital debt draw), the presale, insurance and
 *     debt draw count 0 and are never decoy moves (the log carries no block ids, so "that build's own" is read as "that
 *     quarter's": mine, reversible);
 * (b) M41.1 (design thread, answers to the M40 report): an equity raise takes the sign of the next scored move after it
 *     in the log (at any distance, within Act IV; moves at 0 and other raises skipped): +1 or −1; with none before the
 *     act ends it counts 0 (so never a decoy move).
 * Every other move keeps its ACT4_MOVE_SIGN. The score is computed after the act, so the lookahead is fine.
 */
export function scoredSignsIv(moves: readonly Pick<Act4Move, 'q' | 'kind'>[]): (-1 | 0 | 1)[] {
  const buildQ = new Set(moves.filter((m) => isBuild(m.kind)).map((m) => m.q))
  const signs = moves.map((m) => (buildQ.has(m.q) && BUILD_HEDGES.has(m.kind) ? 0 : ACT4_MOVE_SIGN[m.kind]))
  // From the end: each raise takes the sign of the next non-raise move scored ±1 (the log is in play order).
  let next: -1 | 0 | 1 = 0
  for (let i = moves.length - 1; i >= 0; i--) {
    if (moves[i].kind === 'equity_raise') signs[i] = next
    else if (signs[i] !== 0) next = signs[i]
  }
  return signs
}

/** Orbital exposure held after quarter q, read from the log: blocks committed or bought, less blocks sold. */
function exposureAfter(moves: readonly Pick<Act4Move, 'q' | 'kind'>[], q: number): number {
  return moves
    .filter((m) => m.q <= q)
    .reduce((n, m) => n + (m.kind === 'orbit_commit' || m.kind === 'orbit_buy' ? 1 : m.kind === 'orbit_sale' ? -1 : 0), 0)
}

export interface ReadingIv {
  score: number | null
  base: number
  penalty: number
  perQuarter: { q: number; stance: number; ideal: number; weight: number; value: number }[]
}

/** The reading score of a move log on a future, counting quarters 0..lastQ (19 at a normal end). */
export function computeReadingIv(
  moves: readonly Pick<Act4Move, 'q' | 'kind'>[],
  future: FutureId,
  lastQ: number = LAST_Q_IV,
): ReadingIv {
  const f = FILE.futures[future]
  const decoy = decoyQuarters(future)
  const signs = scoredSignsIv(moves)
  const perQuarter: ReadingIv['perQuarter'] = []
  let sumW = 0
  let sumWV = 0
  for (let q = 0; q <= Math.min(lastQ, LAST_Q_IV); q++) {
    const weight = f.weight[q]
    if (weight === 0) continue
    const st = sign(moves.reduce((s, m, i) => (m.q === q ? s + signs[i] : s), 0))
    const ideal = f.ideal[q]
    // M36.11 (F2): no orbital move this quarter and no orbital exposure held counts as a match.
    const quietOut =
      f.quiet_no_exposure !== undefined &&
      !moves.some((m, i) => m.q === q && signs[i] !== 0) &&
      exposureAfter(moves, q) <= 0
    const value = quietOut
      ? f.quiet_no_exposure!
      : st !== 0 && st === ideal
        ? S.match
        : st === 0 && ideal === 0
          ? decoy.includes(q)
            ? S.calm_in_decoy_window
            : S.calm_and_quiet
          : st === 0 || ideal === 0
            ? S.one_neutral
            : S.opposite
    perQuarter.push({ q, stance: st, ideal, weight, value })
    sumW += weight
    sumWV += weight * value
  }
  const decoyMoves = moves.filter(
    (m, i) => m.q <= lastQ && decoy.includes(m.q) && signs[i] !== 0 && signs[i] === f.decoy.wrong_stance,
  ).length
  const penalty = Math.min(S.decoy_penalty_cap, S.decoy_penalty_per_move * decoyMoves)
  if (sumW === 0) return { score: null, base: 0, penalty, perQuarter }
  const base = Math.round((100 * sumWV) / sumW)
  return { score: Math.min(100, Math.max(0, base - penalty)), base, penalty, perQuarter }
}

/** The reveal's mark for each move: match, opposite, decoy (a wrong-sign move in the decoy window), or neutral. */
export function markMovesIv(
  moves: readonly Pick<Act4Move, 'q' | 'kind'>[],
  future: FutureId,
): { q: number; kind: Act4MoveKind; sign: -1 | 0 | 1; mark: 'match' | 'opposite' | 'decoy' | 'neutral' }[] {
  const f = FILE.futures[future]
  const decoy = decoyQuarters(future)
  const signs = scoredSignsIv(moves)
  return moves.map((m, i) => {
    const s = signs[i]
    const mark =
      decoy.includes(m.q) && s !== 0 && s === f.decoy.wrong_stance
        ? 'decoy'
        : s === 0 || f.weight[m.q] === 0 || f.ideal[m.q] === 0
          ? 'neutral'
          : s === f.ideal[m.q]
            ? 'match'
            : 'opposite'
    return { q: m.q, kind: m.kind, sign: s, mark }
  })
}

/** Oracle logs for tools/ and tests: no moves, and one move matching (or opposing) each non-zero ideal quarter. */
export function oracleLogsIv(future: FutureId): { passive: Act4Move[]; perfect: Act4Move[]; opposite: Act4Move[] } {
  const ideal = FILE.futures[future].ideal
  const kindOf = (s: number): Act4MoveKind => (s > 0 ? 'orbit_commit' : 'orbit_insure')
  const nonZero = ideal.flatMap((v, q) => (v === 0 ? [] : [{ q, v }]))
  return {
    passive: [],
    perfect: nonZero.map(({ q, v }) => ({ q, kind: kindOf(v) })),
    opposite: nonZero.map(({ q, v }) => ({ q, kind: kindOf(-v) })),
  }
}

/** A future's ideal stance per quarter (for the sim's perfect-reader and over-reactor bots, tools/ only). */
export const idealStancesIv = (future: FutureId): readonly number[] => FILE.futures[future].ideal
