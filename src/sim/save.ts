// Loading saves (scope §2.13). A save is the plain GameState as JSON, so saving needs nothing
// here; loading checks the data and fills in fields added to the game after the save was made
// (their starting values, as in a new game), so older saves keep loading.
import type { Message } from '../i18n/t.ts'
import { emptyEventState } from './systems/eventEffects.ts'
import {
  emptyQuarterStats,
  newGame,
  type GameState,
  type Phase,
} from './state.ts'

const PHASES: Phase[] = ['plan', 'live', 'report', 'merge', 'gameover', 'ended']

type Loaded = { ok: true; state: GameState } | { ok: false; error: Message }

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** Checks a parsed save and brings it up to the current format. Doesn't trust it blindly. */
export function restoreSave(data: unknown): Loaded {
  const bad: Loaded = { ok: false, error: { key: 'error.save_invalid' } }
  if (!isObject(data)) return bad
  if (data.version !== 1)
    return { ok: false, error: { key: 'error.save_version' } }
  if (
    typeof data.seed !== 'number' ||
    typeof data.quarter !== 'number' ||
    typeof data.cash !== 'number' ||
    !PHASES.includes(data.phase as Phase) ||
    !Array.isArray(data.sites) ||
    !Array.isArray(data.machines) ||
    !Array.isArray(data.reports) ||
    !Array.isArray(data.log)
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
