// M66.4 (doc 43 §0.23 item 4): when the mining tiles show. UI helpers only: they read state, they change none.
import { actLastQuarter } from '../content/index.ts'
import type { GameState } from '../sim/state.ts'

/** Ethereum mining ended with the Merge, in Act I's last quarter (2022Q3 [A]): after it no screen offers an ETH mining view. */
export const ethMiningOver = (quarter: number): boolean => quarter > actLastQuarter(1)

/**
 * Whether the quarter report's header shows the ETH price (M67.5, doc 43 §0.24 item 5): to a company that holds ETH in its
 * treasury, or mined some this quarter (an Act I-II ETH miner keeps its price); for any other company it is noise.
 */
export const holdsEth = (state: Pick<GameState, 'treasury'>, report: { coinsMined: { ETH: number } }): boolean =>
  state.treasury.ETH > 0 || report.coinsMined.ETH > 0

/** Whether the company still owns any mining machines. */
export const hasMiners = (state: Pick<GameState, 'machines'>): boolean => state.machines.some((m) => m.count > 0)

/** Act V's Live screen drops the mining tiles for a company with no machines (doc 43 §0.23 item 4). */
export const showsMiningTiles = (state: Pick<GameState, 'act' | 'machines'>): boolean => state.act !== 5 || hasMiners(state)
