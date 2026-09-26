// advance(state) plays one week of the live quarter and returns the new state.
// Systems run in a fixed order: failures → mining → treasury → price alert.
// After week 13 the quarter ends (report, or game over).
import { BALANCE } from '../content/index.ts'
import { roundCents, type GameState } from './state.ts'
import { checkPriceAlert } from './systems/interrupts.ts'
import { marketWeek } from './systems/market.ts'
import { mineWeek, rollFailures } from './systems/mining.ts'
import { endQuarter } from './systems/quarter.ts'
import { settleWeek } from './systems/treasury.ts'

export function advance(state: GameState): GameState {
  if (state.phase !== 'live') {
    throw new Error(`advance() needs the live phase, not "${state.phase}"`)
  }
  if (state.interrupt) {
    throw new Error('advance() is paused until the interrupt is resolved')
  }
  const s = structuredClone(state)
  const w = marketWeek(s.quarter, s.week)

  const failures = rollFailures(s)
  const lots = mineWeek(s, w)
  const money = settleWeek(s, lots, w)
  s.cash = roundCents(s.cash)

  const st = s.quarterStats
  st.revenueUsd += money.revenueUsd
  st.powerCostUsd += money.powerCostUsd
  st.rentUsd += money.rentUsd
  st.failures += failures
  for (const coin of ['BTC', 'ETH'] as const) {
    st.coinsMined[coin] += money.coinsMined[coin]
    st.powerByCoin[coin] += money.powerByCoin[coin]
  }
  s.lastWeek = {
    week: s.week + 1,
    date: w.week,
    btcUsd: w.btc_usd,
    ethUsd: w.eth_usd,
    revenueUsd: money.revenueUsd,
    powerCostUsd: money.powerCostUsd,
    rentUsd: money.rentUsd,
    failures,
    batchesOff: lots.filter((l) => !l.running).length,
    cash: s.cash,
  }

  checkPriceAlert(s, w)
  s.week++
  if (s.week === BALANCE.weeksPerQuarter && !s.interrupt) endQuarter(s)
  return s
}
