// Quarter boundaries: the end-of-quarter report and bankruptcy check, and the move
// to the next quarter's Plan phase.
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  actLastQuarter,
  type MarketWeek,
} from '../../content/index.ts'
import { finishUpgrades } from './construction.ts'
import {
  emptyQuarterStats,
  logEntry,
  roundCents,
  type Coin,
  type GameState,
  type QuarterReport,
} from '../state.ts'
import { rollAuction } from './auctions.ts'
import { startQuarterEvents } from './events.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { removeMachines } from './machines.ts'
import { coinPrice, marketWeek } from './market.ts'
import { collateralValueUsd } from './cryptoLoan.ts'
import { startQuarterContracts } from './contracts.ts'
import { debtUsd } from './loans.ts'
import { endQuarterHeat, hottestSite, startQuarterHeat } from './heat.ts'
import { hashrate } from './mining.ts'
import { treasuryValueUsd } from './treasury.ts'
import { renewHosting } from './hosting.ts'
import { serviceFacilities } from './facilities.ts'
import { rescueBeforeGameOver } from './rescue.ts'
import { ratingInputs } from './rating.ts'
import { mwByUse } from './mwUse.ts'
import { endQuarterGpuWaves } from './gpuWave.ts'
import {
  backlogUsd,
  constructionValueUsd,
  endQuarterProjects,
  pivotActive,
  startQuarterProjects,
  weightedBacklogUsd,
} from './projects.ts'
import { aiEbitdaUsd, ebitdaUsd, valuationUsd } from './valuation.ts'
import { depreciationAudit, lasting } from './eventEffects.ts'

/**
 * Runs after week 13. If cash is below zero: sell treasury coins, then machines
 * (oldest batch first, one unit at a time) until cash is back to zero or above.
 * Still negative → game over. Otherwise the quarter report is shown.
 */
export function endQuarter(state: GameState): void {
  const w = marketWeek(state.quarter, BALANCE.weeksPerQuarter - 1)
  state.quarterStats.lateDamagesUsd += endQuarterProjects(state)
  endQuarterGpuWaves(state)
  // Project debt service is due now; unpaid, it's missed (and may foreclose) instead of forcing sales.
  const service = serviceFacilities(state)
  state.quarterStats.interestUsd += service.interestUsd
  state.quarterStats.principalUsd += service.principalUsd
  const forcedSale = state.cash < 0 ? forceSales(state, w) : null
  // Act II's last resorts before a game over: a project sale, then emergency equity (M7.0, A8).
  rescueBeforeGameOver(state)
  state.cash = roundCents(state.cash)
  // Aggressive depreciation's Q4 audit (card ec18): a restatement shows in this quarter's report.
  if (act2Quarter(state.quarter)) depreciationAudit(state)
  const report = buildReport(state, w, forcedSale)
  if (act2Quarter(state.quarter)) {
    const previous = state.creditRating
    const inputs = ratingInputs(state, report)
    state.creditRating = inputs.rating
    report.creditRating = state.creditRating
    report.ratingWhy = {
      debtToEbitda: inputs.debtToEbitda,
      band: inputs.band,
      quality: inputs.quality,
      shortRunway: inputs.shortRunway,
      eventNotches: inputs.eventNotches,
    }
    if (previous !== null && previous !== state.creditRating)
      logEntry(state, 'log.rating_changed', {
        from: previous,
        to: state.creditRating,
      })
  }
  state.reports.push(report)
  if (forcedSale) logEntry(state, 'log.forced_sale', { ...forcedSale })
  state.phase = state.cash < 0 ? 'gameover' : 'report'
  if (state.phase === 'gameover') logEntry(state, 'log.game_over')
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
  // Act II cards: a depreciation policy scales reported EBITDA; the pivot's PR push the operating value.
  const ebitda =
    ebitdaUsd(st) * (lasting(state, state.events.ebitdaMult)?.mult ?? 1)
  const evMult = lasting(state, state.events.valuationMult)?.mult
  const treasuryUsd = treasuryValueUsd(state, w)
  const constructionUsd = constructionValueUsd(state)
  const weightedBacklog = weightedBacklogUsd(state)
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
    treasuryValueUsd: treasuryUsd,
    cash: state.cash,
    ebitdaUsd: ebitda,
    marginByTier: { ...st.marginByTier },
    valuationUsd: valuationUsd(
      state.quarter,
      ebitda,
      state.cash,
      // Pledged coins are still yours: they count, and the loan counts as debt.
      treasuryUsd + collateralValueUsd(state, w),
      debtUsd(state),
      {
        aiEbitdaUsd: aiEbitdaUsd(st),
        aiFloorEbitdaUsd: st.aiFloorEbitdaUsd,
        pivot: pivotActive(state),
        constructionUsd,
        weightedBacklogUsd: weightedBacklog,
        evMult,
      },
    ),
    ...(evMult !== undefined ? { evMult } : {}),
    priceAlerts: st.priceAlerts,
    marginCalls: st.marginCalls,
    founderStake: state.founderStake,
    startCash: st.startCash,
    startTreasuryUsd: st.startTreasuryUsd,
    soldUsd: st.soldUsd,
    treasurySoldUsd: st.treasurySoldUsd,
    gridCreditsUsd: st.gridCreditsUsd,
    hostingFeesUsd: st.hostingFeesUsd,
    reservationUsd: st.reservationUsd,
    aiRevenueUsd: st.aiRevenueUsd,
    aiCostUsd: st.aiCostUsd,
    ...(st.aiFloorEbitdaUsd !== undefined
      ? { aiFloorEbitdaUsd: st.aiFloorEbitdaUsd }
      : {}),
    lateDamagesUsd: st.lateDamagesUsd,
    constructionUsd,
    backlogUsd: backlogUsd(state),
    weightedBacklogUsd: weightedBacklog,
    rateHikeUsd: st.rateHikeUsd,
    stormChargeUsd: st.stormChargeUsd,
    salariesUsd: st.salariesUsd,
    interestUsd: st.interestUsd,
    principalUsd: st.principalUsd,
    debtUsd: debtUsd(state),
    heat: hottestSite(state).value,
    heatTier: hottestSite(state).site.tier,
    ...(state.act === 2
      ? { mwByUseKw: mwByUse(state, state.quarter) }
      : {}),
    forcedSale,
  }
}

/**
 * From the report to the next Plan phase. At the end of an act: after 2022Q3 comes the Merge
 * decision (Act I); after 2026Q4 the chapter report (Act II, the end of the game). The Act II
 * intro calls this too (act 2, still 2022Q3) to start 2022Q4.
 */
export function startNextQuarter(state: GameState): void {
  if (state.quarter === actLastQuarter(state.act)) {
    state.phase = state.act === 1 ? 'merge' : 'chapter'
    return
  }
  state.quarter++
  state.week = 0
  state.phase = 'plan'
  renewHosting(state)
  state.bandwidth = bandwidthForQuarter(state) // unused Bandwidth is lost
  state.interruptsThisQuarter = 0
  state.curtailment = null
  endQuarterHeat(state)
  state.quarterStats = emptyQuarterStats()
  startQuarterHeat(state)
  finishUpgrades(state)
  for (const site of state.sites) {
    if (site.readyQuarter === state.quarter && state.quarter > 0) {
      logEntry(state, 'log.site_ready', { tier: site.tier })
    }
  }
  startQuarterContracts(state)
  startQuarterProjects(state)
  startQuarterEvents(state)
  rollAuction(state)
}
