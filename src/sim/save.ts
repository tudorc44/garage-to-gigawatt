// Loading saves (scope §2.13, Alpha 0.2 §2.15). A save is the plain GameState as JSON, so saving
// needs nothing here. Loading brings an older save up to the current format in two ways:
//  1. Version steps: each change of format has a migration from version n to n + 1, run in turn.
//  2. Small additions within a version: fields added since the save was made get their
//     starting values, as in a new game.
import { actFirstQuarter, actLastQuarter } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { emptyEventState } from './systems/eventEffects.ts'
import { assignCarriedTiers } from './systems/density.ts'
import { startPolitics } from './systems/politics.ts'
import { drawWildcards } from './systems/wildcards.ts'
import {
  emptyQuarterStats,
  newGame,
  type GameState,
  type Phase,
} from './state.ts'
import { isActII, isActIII } from './state.ts'

const PHASES: Phase[] = [
  'plan',
  'live',
  'report',
  'merge',
  'chapter',
  'intro',
  'gameover',
]

/** The save format this build writes (GameState.version). */
export const SAVE_VERSION = 4

type SaveData = Record<string, unknown>

/** One step per format change: MIGRATIONS[n] turns a version-n save into a version-(n + 1) save. */
const MIGRATIONS: Record<number, (data: SaveData) => SaveData> = {
  // 1 → 2 (the Act II build): a save records the act being played. Version 1 had only
  // Act I (the game ended at the Merge), so every version-1 save is an Act I save. Its
  // last phase, "ended" (after the Merge choice), is now "chapter": the Act I chapter
  // report, from where the game carries on into Act II.
  1: (data) => ({
    ...data,
    version: 2,
    act: 1,
    phase: data.phase === 'ended' ? 'chapter' : data.phase,
  }),
  // 2 → 3 (the prologue, Alpha 0.3): a save can now be in act 0 (quarters −32 … −1) and carry the
  // prologue's state. Nothing in a version-2 save changes: it was Act I or Act II.
  2: (data) => ({ ...data, version: 3 }),
  // 3 → 4 (the Act III walking skeleton, M10): a save can now be in act 3 (the M10 stub quarters;
  // unreachable from play — a test/sim harness only). Nothing in a version-3 save changes: it was
  // act 0, 1 or 2 as before.
  3: (data) => ({ ...data, version: 4 }),
}

type Loaded = { ok: true; state: GameState } | { ok: false; error: Message }

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/**
 * Act I runs to 2022Q3 (the Merge); Act II starts at the act boundary. An Act II save can
 * still be at 2022Q3 (the act boundary screens come after the Merge, before 2022Q4).
 */
function actFitsQuarter(act: unknown, quarter: number): boolean {
  const boundary = actLastQuarter(1)
  // The prologue: 2009Q1–2016Q4; its chapter report hands over at 2016Q4 (still −1).
  if (act === 0) return quarter >= actFirstQuarter(0) && quarter < 0
  if (act === 1) return quarter <= boundary && quarter >= 0
  if (isActII(act)) return quarter >= boundary
  // Act III (M11.3): 2027Q1–2030Q4, plus Act II's last quarter for a boundary save.
  if (isActIII(act))
    return quarter >= actLastQuarter(2) && quarter <= actLastQuarter(3)
  return false
}

/** Checks a parsed save and brings it up to the current format. Doesn't trust it blindly. */
export function restoreSave(raw: unknown): Loaded {
  const bad: Loaded = { ok: false, error: { key: 'error.save_invalid' } }
  if (!isObject(raw)) return bad
  const from = raw.version
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1)
    return bad
  // A save from a newer build than this one: we can't know its format.
  if (from > SAVE_VERSION)
    return { ok: false, error: { key: 'error.save_version' } }
  let data: SaveData = raw
  for (let v = from; v < SAVE_VERSION; v++) data = MIGRATIONS[v](data)
  if (
    typeof data.seed !== 'number' ||
    typeof data.quarter !== 'number' ||
    typeof data.cash !== 'number' ||
    !PHASES.includes(data.phase as Phase) ||
    !Array.isArray(data.sites) ||
    !Array.isArray(data.machines) ||
    !Array.isArray(data.reports) ||
    !Array.isArray(data.log) ||
    !actFitsQuarter(data.act, data.quarter) ||
    // A prologue game carries its own state (Alpha 0.3).
    (data.act === 0 && !isObject(data.prologue))
  )
    return bad
  const fresh = newGame(data.seed)
  const state = { ...fresh, ...structuredClone(data) } as GameState
  // Nested records that gained fields: the quarter's running totals and each report.
  state.quarterStats = {
    ...emptyQuarterStats(),
    ...(isObject(data.quarterStats) ? structuredClone(data.quarterStats) : {}),
  }
  state.events = {
    ...emptyEventState(),
    ...(isObject(data.events) ? structuredClone(data.events) : {}),
  }
  state.reports = state.reports.map((r) => ({
    ...r,
    salariesUsd: r.salariesUsd ?? 0,
    hostingFeesUsd: r.hostingFeesUsd ?? 0,
    reservationUsd: r.reservationUsd ?? 0,
    marginByTier: r.marginByTier ?? {},
  }))
  // Saves from before phased Texas had one construction loan (or none).
  const old = (
    data as { constructionLoan?: GameState['constructionLoans'][number] | null }
  ).constructionLoan
  if (!Array.isArray(data.constructionLoans))
    state.constructionLoans = old ? [structuredClone(old)] : []
  delete (state as { constructionLoan?: unknown }).constructionLoan
  // M10's stub marker: it only ever existed in test-made saves, and the stub is gone (M11.3).
  delete (state as { act3Stub?: unknown }).act3Stub
  // M14.2: an Act III save from before the move log starts it empty (older test-build saves).
  if (state.act === 3 && !Array.isArray(state.act3Moves)) state.act3Moves = []
  // M16.2: an Act III save from before the density tiers gives its halls the tiers they'd have at entry.
  if (state.act === 3) assignCarriedTiers(state)
  // M17.3: an Act III save from before political capital starts the meter at 40.
  if (state.act === 3 && state.politicalCapital === undefined) startPolitics(state)
  // M17.4: and draws its wildcards (one whose quarter has passed never comes).
  if (state.act === 3 && state.act3Wildcards === undefined) {
    drawWildcards(state)
    state.act3WildcardOpen = null
  }
  return { ok: true, state }
}
