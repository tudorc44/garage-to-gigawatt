// M66.4 (doc 43 §0.23 item 4): when the mining tiles show. UI helpers only: they read state, they change none.
import { actLastQuarter } from '../content/index.ts'
import type { GameState } from '../sim/state.ts'

/** Ethereum mining ended with the Merge, in Act I's last quarter (2022Q3 [A]): after it no screen offers an ETH mining view. */
export const ethMiningOver = (quarter: number): boolean => quarter > actLastQuarter(1)

/** Whether the company still owns any mining machines. */
export const hasMiners = (state: Pick<GameState, 'machines'>): boolean => state.machines.some((m) => m.count > 0)

/** Act V's Live screen drops the mining tiles for a company with no machines (doc 43 §0.23 item 4). */
export const showsMiningTiles = (state: Pick<GameState, 'act' | 'machines'>): boolean => state.act !== 5 || hasMiners(state)
