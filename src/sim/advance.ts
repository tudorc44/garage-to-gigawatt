// advance(state) plays one week of the live quarter and returns the new state.
// Systems run in a fixed order: failures → mining → treasury → price alert.
// After week 13 the quarter ends (report, or game over).
import { BALANCE } from '../content/index.ts'
import { logEntry, roundCents, type GameState } from './state.ts'
import { checkPriceAlert } from './systems/interrupts.ts'
import { marketWeek, previousMarketWeek } from './systems/market.ts'
import { mineWeek, rollFailures } from './systems/mining.ts'
import { endQuarter } from './systems/quarter.ts'
import { payLoanWeek } from './systems/loans.ts'
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
  const weekNo = s.week + 1

  const failures = rollFailures(s)
  const lots = mineWeek(s, w)
  const money = settleWeek(s, lots, w)
  const loan = payLoanWeek(s)
  s.cash = roundCents(s.cash)

  const st = s.quarterStats
  st.revenueUsd += money.revenueUsd
  st.powerCostUsd += money.powerCostUsd
  st.rentUsd += money.rentUsd
  st.soldUsd += money.soldUsd
  st.interestUsd += loan.interestUsd
  st.principalUsd += loan.principalUsd
  st.failures += failures
  for (const coin of ['BTC', 'ETH'] as const) {
    st.coinsMined[coin] += money.coinsMined[coin]
    st.powerByCoin[coin] += money.powerByCoin[coin]
  }
  const batchesOff = lots.filter((l) => !l.running).length

  // Log lines for the quarter's notes.
  if (failures > 0) logEntry(s, 'log.failures', { count: failures }, weekNo)
  if (batchesOff > 0 && !st.weeks.some((x) => x.batchesOff > 0)) {
    logEntry(s, 'log.switched_off', {}, weekNo)
  }
  const prev = previousMarketWeek(s.quarter, s.week)
  if (w.eth_rev_usd_mh_day === 0 && prev && prev.eth_rev_usd_mh_day > 0) {
    logEntry(s, 'log.eth_mining_ends', {}, weekNo)
  }

  checkPriceAlert(s, w)
  st.weeks.push({
    week: weekNo,
    date: w.week,
    btcUsd: w.btc_usd,
    ethUsd: w.eth_usd,
    revenueUsd: money.revenueUsd,
    powerCostUsd: money.powerCostUsd,
    rentUsd: money.rentUsd,
    failures,
    batchesOff,
    coinsMined: money.coinsMined,
    priceAlert: s.interrupt !== null,
    cash: s.cash,
  })

  s.week++
  if (s.week === BALANCE.weeksPerQuarter && !s.interrupt) endQuarter(s)
  return s
}
