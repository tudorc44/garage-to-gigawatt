// advance(state) plays one week of the live quarter and returns the new state.
// Systems run in a fixed order: failures → mining (a curtailed week idles Texas) →
// treasury → Heat → loans → margin call → curtailment alert → neighbour complaint → price alert.
// After week 13 the quarter ends (report, or game over).
import { BALANCE } from '../content/index.ts'
import { logEntry, roundCents, type GameState } from './state.ts'
import { checkPriceAlert } from './systems/interrupts.ts'
import { marketWeek, previousMarketWeek } from './systems/market.ts'
import { mineWeek, rollFailures } from './systems/mining.ts'
import { endQuarter } from './systems/quarter.ts'
import { checkMarginCall, payCryptoInterestWeek } from './systems/cryptoLoan.ts'
import { applyCurtailment, checkCurtailment } from './systems/curtailment.ts'
import { checkComplaint, rateHikeUsd, updateHeatWeek } from './systems/heat.ts'
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
  const curtailed = applyCurtailment(s, mineWeek(s, w))
  const lots = curtailed.lots
  const money = settleWeek(s, lots, w)
  updateHeatWeek(s, lots)
  const loan = payLoanWeek(s)
  const cryptoInterestUsd = payCryptoInterestWeek(s)
  s.cash = roundCents(s.cash)

  const st = s.quarterStats
  st.revenueUsd += money.revenueUsd
  st.powerCostUsd += money.powerCostUsd
  st.rentUsd += money.rentUsd
  st.soldUsd += money.soldUsd
  st.gridCreditsUsd += curtailed.creditUsd
  st.rateHikeUsd += rateHikeUsd(s, lots)
  st.interestUsd += loan.interestUsd + cryptoInterestUsd
  st.principalUsd += loan.principalUsd
  st.failures += failures
  for (const coin of ['BTC', 'ETH'] as const) {
    st.coinsMined[coin] += money.coinsMined[coin]
    st.powerByCoin[coin] += money.powerByCoin[coin]
  }
  const batchesOff =
    curtailed.creditUsd > 0 ? 0 : lots.filter((l) => !l.running).length

  // Log lines for the quarter's notes.
  if (failures > 0) logEntry(s, 'log.failures', { count: failures }, weekNo)
  if (curtailed.creditUsd > 0) {
    logEntry(s, 'log.curtailed', { creditUsd: curtailed.creditUsd }, weekNo)
  }
  if (batchesOff > 0 && !st.weeks.some((x) => x.batchesOff > 0)) {
    logEntry(s, 'log.switched_off', {}, weekNo)
  }
  const prev = previousMarketWeek(s.quarter, s.week)
  if (w.eth_rev_usd_mh_day === 0 && prev && prev.eth_rev_usd_mh_day > 0) {
    logEntry(s, 'log.eth_mining_ends', {}, weekNo)
  }

  checkMarginCall(s, w, prev)
  checkCurtailment(s)
  checkComplaint(s)
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
