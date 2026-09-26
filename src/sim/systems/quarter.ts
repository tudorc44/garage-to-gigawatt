// Quarter boundaries: the end-of-quarter report and bankruptcy check, and the move
// to the next quarter's Plan phase.
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import {
  emptyQuarterStats,
  roundCents,
  type Coin,
  type GameState,
  type QuarterReport,
} from '../state.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { removeMachines } from './machines.ts'
import { coinPrice, marketWeek } from './market.ts'
import { hashrate } from './mining.ts'
import { treasuryValueUsd } from './treasury.ts'

/**
 * Runs after week 13. If cash is below zero: sell treasury coins, then machines
 * (oldest batch first, one unit at a time) until cash is back to zero or above.
 * Still negative → game over. Otherwise the quarter report is shown.
 */
export function endQuarter(state: GameState): void {
  const w = marketWeek(state.quarter, BALANCE.weeksPerQuarter - 1)
  const forcedSale = state.cash < 0 ? forceSales(state, w) : null
  state.cash = roundCents(state.cash)
  state.reports.push(buildReport(state, w, forcedSale))
  state.phase = state.cash < 0 ? 'gameover' : 'report'
}

function forceSales(
  state: GameState,
  w: MarketWeek,
): NonNullable<QuarterReport['forcedSale']> {
  let treasuryUsd = 0
  for (const coin of ['BTC', 'ETH'] as const) {
    if (state.cash >= 0) break
    const price = coinPrice(w, coin)
    const coins = Math.min(state.treasury[coin], -state.cash / price)
    state.treasury[coin] -= coins
    state.cash += coins * price
    treasuryUsd += coins * price
  }
  let machinesUsd = 0
  let units = 0
  while (state.cash < 0 && state.machines.length > 0) {
    const usd = removeMachines(state, state.machines[0], 1)
    state.cash += usd
    machinesUsd += usd
    units++
  }
  return { treasuryUsd, machinesUsd, units }
}

function buildReport(
  state: GameState,
  w: MarketWeek,
  forcedSale: QuarterReport['forcedSale'],
): QuarterReport {
  const st = state.quarterStats
  const perCoin = (c: Coin) =>
    st.coinsMined[c] > 0 ? st.powerByCoin[c] / st.coinsMined[c] : null
  return {
    quarter: CONTENT.quarters[state.quarter],
    hashrate: hashrate(state),
    revenueUsd: st.revenueUsd,
    powerCostUsd: st.powerCostUsd,
    rentUsd: st.rentUsd,
    coinsMined: { ...st.coinsMined },
    costPerCoinUsd: { BTC: perCoin('BTC'), ETH: perCoin('ETH') },
    failures: st.failures,
    brokenUnits: state.machines.reduce((n, l) => n + l.failed, 0),
    treasury: { ...state.treasury },
    treasuryValueUsd: treasuryValueUsd(state, w),
    cash: state.cash,
    forcedSale,
  }
}

/** From the report to the next Plan phase, or to the end of Act I after 2022Q3. */
export function startNextQuarter(state: GameState): void {
  if (state.quarter === CONTENT.quarters.length - 1) {
    state.phase = 'ended'
    return
  }
  state.quarter++
  state.week = 0
  state.phase = 'plan'
  state.bandwidth = bandwidthForQuarter(state) // unused Bandwidth is lost
  state.interruptsThisQuarter = 0
  state.quarterStats = emptyQuarterStats()
  state.lastWeek = null
}
