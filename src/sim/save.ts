// Loading saves (scope §2.13, Alpha 0.2 §2.15). A save is the plain GameState as JSON, so saving
// needs nothing here. Loading brings an older save up to the current format in two ways:
//  1. Version steps: each change of format has a migration from version n to n + 1, run in turn.
//  2. Small additions within a version: fields added since the save was made get their
//     starting values, as in a new game.
import { actLastQuarter } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { emptyEventState } from './systems/eventEffects.ts'
import {
  emptyQuarterStats,
  newGame,
  type GameState,
  type Phase,
} from './state.ts'

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
export const SAVE_VERSION = 2

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
  if (act === 1) return quarter <= boundary
  if (act === 2) return quarter >= boundary
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
    !actFitsQuarter(data.act, data.quarter)
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
    marginByTier: r.marginByTier ?? {},
  }))
  // Saves from before phased Texas had one construction loan (or none).
  const old = (
    data as { constructionLoan?: GameState['constructionLoans'][number] | null }
  ).constructionLoan
  if (!Array.isArray(data.constructionLoans))
    state.constructionLoans = old ? [structuredClone(old)] : []
  delete (state as { constructionLoan?: unknown }).constructionLoan
  return { ok: true, state }
}
