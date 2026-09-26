// Rivals (scope §2.9): 4 real companies with scripted growth curves, not AI.
// Their end-of-quarter numbers come from rivals.json; the league table ranks
// everyone by value (market cap for rivals, the company valuation for you).
import { CONTENT, type Rival } from '../../content/index.ts'
import type { GameState } from '../state.ts'

/** A rival's end-of-quarter numbers. Missing values are null (not mining yet, or private). */
export interface RivalSnapshot {
  id: string
  hashrateEhs: number | null
  mw: number | null
  /** Market cap in dollars, or null while there's no public value. */
  valueUsd: number | null
  btcHeld: number | null
}

export function getRival(id: string): Rival | undefined {
  return CONTENT.rivals.find((r) => r.id === id)
}

/** The rival's numbers at the end of a quarter, or null if it isn't in the game yet. */
export function rivalSnapshot(
  rival: Rival,
  quarter: number,
): RivalSnapshot | null {
  const q = CONTENT.quarters[quarter]
  const value = (series: Record<string, number>) => series[q] ?? null
  const snap = {
    id: rival.id,
    hashrateEhs: value(rival.hashrate_ehs),
    mw: value(rival.mw),
    valueUsd:
      rival.mcap_musd[q] === undefined ? null : rival.mcap_musd[q] * 1e6,
    btcHeld: value(rival.btc_held),
  }
  return snap.hashrateEhs === null && snap.mw === null && snap.valueUsd === null
    ? null
    : snap
}

/** Rivals that exist in this quarter (have any numbers yet). */
export function activeRivals(quarter: number): RivalSnapshot[] {
  return CONTENT.rivals
    .map((r) => rivalSnapshot(r, quarter))
    .filter((r): r is RivalSnapshot => r !== null)
}

export interface LeagueRow {
  /** Rival id, or "you". */
  id: string
  valueUsd: number | null
  /** 1 = the most valuable. null for rivals with no public value yet (they sit at the bottom). */
  rank: number | null
  rival: RivalSnapshot | null
}

/**
 * The league table after a finished quarter (index into state.reports): you and every
 * rival already in the game, sorted by value. Rivals with no public value go last.
 */
export function leagueTable(
  state: GameState,
  reportIndex: number,
): LeagueRow[] {
  const report = state.reports[reportIndex]
  const quarter = CONTENT.quarters.indexOf(report.quarter)
  const rows: LeagueRow[] = [
    { id: 'you', valueUsd: report.valuationUsd, rank: null, rival: null },
    ...activeRivals(quarter).map((r) => ({
      id: r.id,
      valueUsd: r.valueUsd,
      rank: null,
      rival: r,
    })),
  ]
  const valued = rows
    .filter((r) => r.valueUsd !== null)
    .sort((a, b) => b.valueUsd! - a.valueUsd!)
  valued.forEach((r, i) => (r.rank = i + 1))
  return [...valued, ...rows.filter((r) => r.valueUsd === null)]
}

/** Your league rank after a finished quarter, and how many companies have a value. */
export function yourRank(
  state: GameState,
  reportIndex: number,
): { rank: number; of: number } {
  const rows = leagueTable(state, reportIndex)
  return {
    rank: rows.find((r) => r.id === 'you')!.rank!,
    of: rows.filter((r) => r.rank !== null).length,
  }
}

/** Rivals not in the game yet at this quarter, with the quarter each one joins. */
export function upcomingRivals(
  quarter: number,
): { id: string; quarter: string }[] {
  return CONTENT.rivals
    .filter((r) => rivalSnapshot(r, quarter) === null)
    .map((r) => {
      const first = CONTENT.quarters.findIndex(
        (_, q) => q > quarter && rivalSnapshot(r, q) !== null,
      )
      return { id: r.id, quarter: CONTENT.quarters[first] }
    })
    .filter((r) => r.quarter !== undefined)
}
