// Rivals (scope §2.9): 4 real companies with scripted growth curves, not AI.
// Their end-of-quarter numbers come from rivals.json; the league table ranks
// everyone by value (market cap for rivals, the company valuation for you).
import {
  CONTENT,
  act1ValueQuarter,
  isAct2RulesQuarter,
  isActIIQuarter,
  type Rival,
  type RivalAct2,
} from '../../content/index.ts'
import type { GameState } from '../state.ts'

/** A rival's end-of-quarter numbers. Missing values are null (not mining yet, or private). */
export interface RivalSnapshot {
  id: string
  hashrateEhs: number | null
  mw: number | null
  /** Market cap in dollars, or null while there's no public value. */
  valueUsd: number | null
  btcHeld: number | null
  /** Act II: MW contracted to AI tenants and MW mining (the league's scale column). */
  aiMw?: number | null
  miningMw?: number | null
}

export function getRival(id: string): Rival | undefined {
  return CONTENT.rivals.find((r) => r.id === id)
}

/**
 * The rival's numbers at the end of a quarter, or null if it isn't in the game yet.
 * rivals.json ends in 2022Q3: from 2022Q4 on, each rival's 2022Q3 numbers hold.
 */
export function rivalSnapshot(
  rival: Rival,
  quarter: number,
): RivalSnapshot | null {
  const q = act1ValueQuarter(quarter)
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

/**
 * An Act II rival's numbers at the end of a quarter (rivals_act2.json, M6.2). The data ends in
 * 2026Q3; later quarters hold its last numbers.
 */
export function act2RivalSnapshot(
  rival: RivalAct2,
  quarter: number,
): RivalSnapshot {
  const label = CONTENT.quarters[quarter] ?? ''
  const at = (series: Record<string, number>) => {
    const keys = Object.keys(series)
      .filter((k) => k <= label)
      .sort()
    const key = keys.at(-1)
    return key === undefined ? null : series[key]
  }
  const mcap = at(rival.mcap_usd_m)
  return {
    id: rival.id,
    hashrateEhs: at(rival.hashrate_ehs),
    mw: at(rival.mw_energized),
    valueUsd: mcap === null ? null : mcap * 1e6,
    btcHeld: null,
    aiMw: at(rival.mw_ai_contracted),
    miningMw: at(rival.mw_mining),
  }
}

/**
 * Rivals that exist in this quarter (have any numbers yet). Act II has its own five (scope 0.2
 * §2.11: Core Scientific, IREN, Hut 8, Cipher, CoreWeave), from 2022Q4.
 */
export function activeRivals(quarter: number): RivalSnapshot[] {
  // Act III (M11.4c): no rivals until M11.5 loads rivals_act3.json; the league hides.
  if (isAct2RulesQuarter(quarter) && !isActIIQuarter(quarter)) return []
  if (isActIIQuarter(quarter))
    return CONTENT.act2Rivals.map((r) => act2RivalSnapshot(r, quarter))
  return CONTENT.rivals
    .map((r) => rivalSnapshot(r, quarter))
    .filter((r): r is RivalSnapshot => r !== null)
}

/** The Act II rivals' key moves in a quarter (the quarter report shows them; texts in en.json). */
export function rivalMoves(quarter: number): { rival: string; key: string }[] {
  if (!isActIIQuarter(quarter)) return []
  const label = CONTENT.quarters[quarter]
  return CONTENT.act2Rivals
    .filter((r) => r.moves.includes(label))
    .map((r) => ({ rival: r.id, key: `rival_move.${r.id}.${label}` }))
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
