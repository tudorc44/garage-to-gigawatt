// The Act V reading score (M51; doc 43 §6.7 with §0.2 and §0.11 erratum 1, V-D21). HIDDEN: the ideal stance per quarter
// gives the future away, so this file (the only reader of src/content/reading_score_v.json) is imported only by
// systems/act5End.ts (the end-of-act reveal), tests/ and tools/ (grep-tested). Acts III-IV's rules, on scarcity
// exposure: per quarter the player's stance is the sign of the sum of that quarter's move signs; against the future's
// ideal a match scores 1, both calm 0.7 (1 inside the decoy window), one calm 0.5, opposite 0; weighted; base =
// round(100 × Σ w·v / Σ w); a penalty of 10 per move inside the decoy window with the decoy's wrong sign, at most 30.
// Carried rules: a build's own hedges and debt count 0 in its quarter (M40.1); a raise takes the sign of the next scored
// move at any distance, 0 if none follows (M41.1, as M48 corrected the file); a quiet quarter with low exposure counts
// as a match (the file's `low_exposure_quiet`, as Act IV's M36.11).
import { z } from 'zod'
import raw from '../../content/reading_score_v.json' with { type: 'json' }
import type { VFutureId } from '../../content/index.ts'
import { ACT5_MOVE_KINDS, type Act5Move, type Act5MoveKind } from '../state.ts'

const stance = z.union([z.literal(-1), z.literal(0), z.literal(1)])
const futureSchema = z.object({
  ideal: z.array(stance).length(20),
  weight: z.array(z.number().nonnegative()).length(20),
  decoy: z.object({ indicator: z.string(), quarters: z.array(z.string()).min(1), wrong_stance: stance }),
  /** M60.4 (doc 43 §0.16 item 5): from `from_q` only these kinds are scored; the others count 0 (V2's flexibility). */
  scored_kinds: z.object({ from_q: z.number().int(), kinds: z.array(z.string()).min(1) }).optional(),
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
      low_exposure_quiet: z.object({ value: z.number(), threshold_share: z.number() }),
    }),
    moves: z.array(z.object({ id: z.string(), sign: stance.nullable() })),
    futures: z.object({ v1: futureSchema, v2: futureSchema, v3: futureSchema, v4: futureSchema }),
  })
  .parse(raw)
const S = FILE.scoring

/** The last Act V quarter index (2040Q4). */
export const LAST_Q_V = 19

/** The file's row for a kind (the log's `equity_raise` is the file's `equity_raise_unfollowed`). */
const rowId = (k: Act5MoveKind) => (k === 'equity_raise' ? 'equity_raise_unfollowed' : k)

/** Each kind's sign from the file (a kind without a row throws at load: a test also checks the two lists match). */
export const ACT5_MOVE_SIGN = Object.fromEntries(
  ACT5_MOVE_KINDS.map((k) => {
    const row = FILE.moves.find((m) => m.id === rowId(k))
    if (!row || row.sign === null) throw new Error(`reading_score_v.json: no signed row for the move ${k}`)
    return [k, row.sign]
  }),
) as Record<Act5MoveKind, -1 | 0 | 1>

const decoyQuarters = (id: VFutureId) => FILE.futures[id].decoy.quarters.map((l) => FILE._meta.quarters.indexOf(l))
const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0)

/**
 * A build's own hedges and debt (M40.1 carried, doc 43 §6.7): in a quarter where a firm asset or a follow-on unit is
 * committed, contracting the plant's output and drawing plant debt count 0 (the log carries no plant ids, so "that
 * build's own" is read as "that quarter's", as Act IV: mine, reversible).
 */
const BUILD_HEDGES: ReadonlySet<Act5MoveKind> = new Set(['contract_plant_output', 'arrange_plant_debt'])
const isBuild = (k: Act5MoveKind) => k === 'commit_follow_on_unit' || k === 'commit_new_firm_asset'

/** Each move's sign in a future: scoredSignsV, then the future's `scored_kinds` (other kinds count 0 from its quarter). */
function futureSignsV(moves: readonly Pick<Act5Move, 'q' | 'kind'>[], future: VFutureId): (-1 | 0 | 1)[] {
  const signs = scoredSignsV(moves)
  const only = FILE.futures[future].scored_kinds
  if (!only) return signs
  return signs.map((s, i) => (moves[i].q >= only.from_q && !only.kinds.includes(moves[i].kind) ? 0 : s))
}

/** Whether a kind is scored in this future's quarter (tools: the perfect reader's V2 flexibility). */
export function scoredKindsAtV(future: VFutureId, q: number): readonly string[] | null {
  const only = FILE.futures[future].scored_kinds
  return only && q >= only.from_q ? only.kinds : null
}

/** Each move's scored sign, in log order (the build-quarter rule, then the raise rule from the end of the log). */
export function scoredSignsV(moves: readonly Pick<Act5Move, 'q' | 'kind'>[]): (-1 | 0 | 1)[] {
  const buildQ = new Set(moves.filter((m) => isBuild(m.kind)).map((m) => m.q))
  const signs = moves.map((m) => (buildQ.has(m.q) && BUILD_HEDGES.has(m.kind) ? 0 : ACT5_MOVE_SIGN[m.kind]))
  let next: -1 | 0 | 1 = 0
  for (let i = moves.length - 1; i >= 0; i--) {
    if (moves[i].kind === 'equity_raise') signs[i] = next
    else if (signs[i] !== 0) next = signs[i]
  }
  return signs
}

export interface ReadingV {
  score: number | null
  base: number
  penalty: number
  perQuarter: { q: number; stance: number; ideal: number; weight: number; value: number }[]
}

/**
 * The reading score of a move log on a future, counting quarters 0..lastQ (19 at a normal end). `exposure[q]` is the
 * quarter's exposure share (state.act5Exposure); a quarter without one never counts as low.
 */
export function computeReadingV(
  moves: readonly Pick<Act5Move, 'q' | 'kind'>[],
  future: VFutureId,
  exposure: readonly (number | undefined)[] = [],
  lastQ: number = LAST_Q_V,
): ReadingV {
  const f = FILE.futures[future]
  const decoy = decoyQuarters(future)
  const signs = futureSignsV(moves, future)
  const perQuarter: ReadingV['perQuarter'] = []
  let sumW = 0
  let sumWV = 0
  for (let q = 0; q <= Math.min(lastQ, LAST_Q_V); q++) {
    const weight = f.weight[q]
    if (weight === 0) continue
    const st = sign(moves.reduce((s, m, i) => (m.q === q ? s + signs[i] : s), 0))
    const ideal = f.ideal[q]
    const x = exposure[q]
    const quietLow =
      x !== undefined && x < S.low_exposure_quiet.threshold_share && !moves.some((m, i) => m.q === q && signs[i] !== 0)
    const value = quietLow
      ? S.low_exposure_quiet.value
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
export function markMovesV(
  moves: readonly Pick<Act5Move, 'q' | 'kind'>[],
  future: VFutureId,
): { q: number; kind: Act5MoveKind; sign: -1 | 0 | 1; mark: 'match' | 'opposite' | 'decoy' | 'neutral' }[] {
  const f = FILE.futures[future]
  const decoy = decoyQuarters(future)
  const signs = futureSignsV(moves, future)
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
export function oracleLogsV(future: VFutureId): { passive: Act5Move[]; perfect: Act5Move[]; opposite: Act5Move[] } {
  const ideal = FILE.futures[future].ideal
  const only = FILE.futures[future].scored_kinds
  // (M60.4: where only flexibility is scored, the perfect log enrols; its opposite has no +1 flexibility move, so it
  // stays a plant purchase, which counts 0 there)
  const kindOf = (s: number, q = 0): Act5MoveKind =>
    s < 0 && only && q >= only.from_q ? (only.kinds[0] as Act5MoveKind) : s > 0 ? 'buy_plant_stake' : 'sell_plant_stake_to_fund'
  const nonZero = ideal.flatMap((v, q) => (v === 0 ? [] : [{ q, v }]))
  return {
    passive: [],
    perfect: nonZero.map(({ q, v }) => ({ q, kind: kindOf(v, q) })),
    opposite: nonZero.map(({ q, v }) => ({ q, kind: kindOf(-v, q) })),
  }
}

/** A future's ideal stance per quarter (for the sim's perfect-reader and over-reactor bots, tools/ only). */
export const idealStancesV = (future: VFutureId): readonly number[] => FILE.futures[future].ideal

/** The file's move rows (tests: every row but the founder's exit and Read the market is a logged kind). */
export const moveRowIdsV = (): string[] => FILE.moves.map((m) => m.id)
