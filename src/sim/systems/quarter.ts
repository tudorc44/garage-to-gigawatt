// Quarter boundaries: the end-of-quarter report and bankruptcy check, and the move
// to the next quarter's Plan phase.
import {
  BALANCE,
  CONTENT,
  isAct2RulesQuarter,
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
import { inAct2Rules, inAct3Rules, inActIII, inActIV } from '../state.ts'
import { buildAct4End } from './act4End.ts'
import { fireWildcardsIv } from './wildcardsIv.ts'
import { startQuarterOrbitOffers } from './orbit.ts'
import { endQuarterLaunches, startQuarterOrbitBuilds } from './orbitLaunch.ts'
import { rollAuction } from './auctions.ts'
import { startQuarterEvents } from './events.ts'
import { bandwidthForQuarter } from './bandwidth.ts'
import { buildAct3End } from './act3End.ts'
import {
  completeRelets,
  openRenewals,
  openTenantReopeners,
  repriceRolling,
  resolveRenewals,
} from './renewals.ts'
import { payAct3Payouts } from './cardContracts.ts'
import { settlePpas } from './nuclear.ts'
import { endQuarterPolitics } from './politics.ts'
import { openNextWildcard } from './wildcards.ts'
import { openBlendOffers } from './blendExtend.ts'
import { removeMachines } from './machines.ts'
import { coinPrice, marketWeek, scenarioOf } from './market.ts'
import { collateralValueUsd } from './cryptoLoan.ts'
import { startQuarterContracts } from './contracts.ts'
import { debtUsd } from './loans.ts'
import { endQuarterHeat, hottestSite, startQuarterHeat } from './heat.ts'
import { hashrate } from './mining.ts'
import { treasuryValueUsd } from './treasury.ts'
import { renewHosting } from './hosting.ts'
import { serviceFacilities, settleLenderCures } from './facilities.ts'
import {
  autoDrawStandby,
  expireStandby,
  settleStandbyFee,
} from './corporateDebt.ts'
import { rescueBeforeGameOver } from './rescue.ts'
import { covenantSweep, testCovenant } from './covenant.ts'
import { openCommunityDeal } from './communityDeal.ts'
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
  const w = marketWeek(
    state.quarter,
    BALANCE.weeksPerQuarter - 1,
    scenarioOf(state),
  )
  // Act III (M18.11): open lender cures are cured or, at their deadline, foreclose (before this quarter's walks).
  if (inAct3Rules(state)) settleLenderCures(state)
  state.quarterStats.lateDamagesUsd += endQuarterProjects(state)
  // Act III (M17.2): the nuclear PPAs' take-or-pay for the quarter.
  settlePpas(state)
  // Act III (M12.2): the renewals opened this quarter are settled (the new terms start next quarter).
  resolveRenewals(state)
  // Act III (M12.3): card cash due at this quarter's end (a recovery, a share of the revenue).
  payAct3Payouts(state)
  endQuarterGpuWaves(state)
  // Act IV (M29.3): orbital launches due this quarter slip, fly or fail.
  endQuarterLaunches(state)
  // Project debt service is due now; unpaid, it's missed (and may foreclose) instead of forcing sales.
  const service = serviceFacilities(state)
  state.quarterStats.interestUsd += service.interestUsd
  state.quarterStats.principalUsd += service.principalUsd
  // Act III (M18.2): the standby's commitment fee; then, short of cash, the standby is drawn before any forced sale.
  if (inAct3Rules(state)) {
    state.quarterStats.interestUsd += settleStandbyFee(state)
    autoDrawStandby(state)
  }
  const forcedSale = state.cash < 0 ? forceSales(state, w) : null
  // Act II's last resorts before a game over: a project sale, then emergency equity (M7.0, A8).
  rescueBeforeGameOver(state)
  // Act III (M18.13): an open covenant breach sweeps half the quarter's operating cash flow into debt.
  covenantSweep(state)
  state.cash = roundCents(state.cash)
  // Aggressive depreciation's Q4 audit (card ec18): a restatement shows in this quarter's report.
  if (isAct2RulesQuarter(state.quarter)) depreciationAudit(state)
  // Act III (M17.3): lobbying lands, the Director's gain, the decay.
  endQuarterPolitics(state)
  const report = buildReport(state, w, forcedSale)
  if (inAct3Rules(state) && state.politicalCapital !== undefined)
    report.politicalCapital = state.politicalCapital
  // The credit rating is reviewed each quarter in Act III too (M11.4c: YES, same formula).
  if (isAct2RulesQuarter(state.quarter)) {
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
  // Act III (M18.13): the leverage covenant test; debt the lenders call short of cash goes to the rescue.
  if (inAct3Rules(state)) {
    testCovenant(state, report)
    if (state.cash < 0) {
      rescueBeforeGameOver(state)
      state.cash = roundCents(state.cash)
      report.cash = state.cash
    }
  }
  // Act III (M18.2): the standby lapses after its last quarter (its draws stay until their bullets).
  if (inAct3Rules(state)) expireStandby(state)
  if (forcedSale) logEntry(state, 'log.forced_sale', { ...forcedSale })
  state.phase = state.cash < 0 ? 'gameover' : 'report'
  if (state.phase === 'gameover') {
    logEntry(state, 'log.game_over')
    // Act III (M14.4): a game over still gets the reveal, its reading counted up to this quarter.
    if (inActIII(state) && state.scenarioId)
      state.act3End = buildAct3End(state, true)
    // Act IV (M27.5): a game over gets its end record too (the reveal fills it in M32).
    if (inActIV(state)) state.act4End = buildAct4End(state, true)
  }
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
        scenario: scenarioOf(state),
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
    ...(inAct2Rules(state) ? { mwByUseKw: mwByUse(state, state.quarter) } : {}),
    forcedSale,
  }
}

/**
 * From the report to the next Plan phase. At the end of an act: after 2022Q3 comes the Merge
 * decision (Act I); after 2026Q4 the chapter report (Act II); after 2030Q4 the Act III chapter
 * report, the end of the game (M11.3: Act III runs its 16 quarters, and only the game-over rules
 * above can end it early). The Act II intro calls this too (act 2, still 2022Q3) to start 2022Q4.
 */
export function startNextQuarter(state: GameState): void {
  if (state.quarter === actLastQuarter(state.act)) {
    if (inActIII(state) && state.scenarioId) {
      // The end of Act III (doc 27 §2, D14): the chapter report, with the scenario reveal stored now.
      state.act3End = buildAct3End(state)
      state.phase = 'chapter'
      return
    }
    if (inActIV(state)) {
      // The end of Act IV (doc 33 §15): the chapter report, with the end record stored now (M27.5: a stub; M32 adds
      // the reveal, the reading score and the titles). The campaign finale follows it.
      state.act4End = buildAct4End(state)
      state.phase = 'chapter'
      return
    }
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
  // Act III (M12.2): re-let RFPs whose empty quarters are over sign first; then contracts due open.
  completeRelets(state)
  repriceRolling(state)
  startQuarterProjects(state)
  openRenewals(state)
  // (M12.3) then the tenants' reopeners, when the market is 10% or more below their leases.
  openTenantReopeners(state)
  // (M12.4) and the blend-and-extend offers of the leases in their anniversary quarter.
  openBlendOffers(state)
  startQuarterEvents(state)
  rollAuction(state)
  // Act III (M17.4): a wildcard due this quarter comes in the Plan phase (if it has a target).
  openNextWildcard(state)
  // Act IV (M28.5): a wildcard due this quarter fires now.
  fireWildcardsIv(state)
  // Act IV (M29.2): open orbital blocks without a tenant get this quarter's offers.
  startQuarterOrbitOffers(state)
  startQuarterOrbitBuilds(state)
  // M19: the Community Relations Manager's yearly Community Deal, when due and a site qualifies.
  openCommunityDeal(state)
}
