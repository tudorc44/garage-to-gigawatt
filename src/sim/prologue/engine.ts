// The prologue's week and quarter (Alpha 0.3, Act 0). One week: coin moves land, machines may break,
// every machine mines (solo: a Poisson draw of blocks; in a pool: the expected share less the fee;
// ETH is always pooled), the coins land in your wallet or on the exchange, the sell queue sells up
// to the week's cap, and the income, rent and power are paid. After 13 weeks the quarter ends: the
// household's patience, the report, and either the next quarter (a Plan phase in a decision
// quarter, else auto-play) or, after 2016Q4, the prologue's chapter report and the handover.
import {
  BALANCE,
  CONTENT,
  actLastQuarter,
  type MarketWeek,
} from '../../content/index.ts'
import { binomial, substream } from '../rng.ts'
import { logEntry, roundCents, type Coin, type GameState } from '../state.ts'
import { removeMachines } from '../systems/machines.ts'
import { getModel, marketWeek } from '../systems/market.ts'
import { checkPrologueEvents, schedulePrologueEvents } from './events.ts'
import {
  P,
  emptyPrologueQuarter,
  householdTier,
  isDecisionQuarter,
  netWorthUsd,
  poisson,
  poolFee,
  prologueBandwidth,
  rentUsdQ,
  sellCapUsdWeek,
  siteLoadKw,
  sitePowerUsdKwh,
} from './setup.ts'
import type { PrologueState } from './types.ts'

const COINS: Coin[] = ['BTC', 'ETH']
const WEEKS = () => BALANCE.weeksPerQuarter
export const absWeek = (s: GameState) => s.quarter * WEEKS() + s.week

/** The price of a coin this week. */
const price = (w: MarketWeek, coin: Coin) =>
  coin === 'BTC' ? w.btc_usd : w.eth_usd

/** Coins in your wallet (the treasury less what sits on the exchange). */
export function walletCoins(s: GameState, coin: Coin): number {
  return Math.max(0, s.treasury[coin] - s.prologue!.onExchange[coin])
}

/** A household site whose load the household made you cut back this quarter (a card, or patience at 0). */
function cutBack(s: GameState): boolean {
  const p = s.prologue!
  return p.cutLoadUntil !== null && s.quarter <= p.cutLoadUntil
}

/**
 * One prologue week (called by advance() in act 0, on a copy of the state). Returns nothing: it
 * moves the copy on by a week and ends the quarter after the 13th.
 */
export function prologueWeek(s: GameState): void {
  const p = s.prologue!
  const w = marketWeek(s.quarter, s.week)
  const weekNo = s.week + 1
  const now = absWeek(s)

  // 1. Coin moves that land this week.
  for (const m of p.moves.filter((x) => x.arrives <= now)) {
    if (m.to === 'exchange') p.onExchange[m.coin] += m.amount
    else p.onExchange[m.coin] = Math.max(0, p.onExchange[m.coin] - m.amount)
  }
  p.moves = p.moves.filter((x) => x.arrives > now)

  // 2. Failures (as Act I: annual rate ÷ 52, × 1.5 used). Main stream, like Act I.
  for (const lot of s.machines) {
    if (s.quarter < lot.earnsFromQuarter) continue
    const model = getModel(lot.model)!
    const pFail =
      (model.annual_failure_rate / 52) * (lot.condition === 'used' ? 1.5 : 1)
    lot.failed += binomial(s, lot.count - lot.failed, pFail)
  }

  // 3. Mining. Each batch runs unless it costs more in power than it earns (at a price; with no
  //    price yet, free household power still runs).
  const netTh = w.btc_hashrate_EHs * 1e6
  const perBlock = w.btc_block_subsidy / Math.max(0.01, 1 - w.btc_fee_share)
  let myTh = 0
  let powerUsd = 0
  let ethCoins = 0
  const hours = 24 * 7
  for (const lot of s.machines) {
    if (s.quarter < lot.earnsFromQuarter) continue
    const site = s.sites.find((x) => x.id === lot.siteId)
    if (!site || s.quarter < site.readyQuarter) continue
    const model = getModel(lot.model)!
    let working = lot.count - lot.failed
    // The household made you cut back: household sites run only up to their threshold.
    const home = householdTier(site.tier)
    if (home && cutBack(s)) {
      const load = siteLoadKw(s, site.id)
      if (load > home.household_threshold_kw)
        working *= home.household_threshold_kw / load
    }
    if (working <= 0) continue
    const kwh = working * model.power_kw * hours
    const cost = kwh * sitePowerUsdKwh(s, site)
    if (model.coin === 'ETH') {
      const coins =
        w.eth_usd > 0
          ? (working * model.hashrate * w.eth_rev_usd_mh_day * 7) / w.eth_usd
          : 0
      if (cost > 0 && coins * w.eth_usd < cost) continue
      ethCoins += coins
    } else {
      const th = working * model.hashrate
      const expected = (th / (th + netTh)) * P().blocks_per_week * perBlock
      if (cost > 0 && expected * w.btc_usd < cost) continue
      myTh += th
    }
    powerUsd += cost
  }
  // BTC: solo is a lottery over the week's blocks; a pool pays the expected share less its fee.
  const lambda = (myTh / (myTh + netTh || 1)) * P().blocks_per_week
  let btcCoins = 0
  let blocks = 0
  if (p.pool) btcCoins = lambda * perBlock * (1 - poolFee(s.quarter))
  else if (myTh > 0) {
    const r = substream(s.seed, `solo:${s.quarter}:${s.week}`)
    blocks = poisson(r, lambda)
    btcCoins = blocks * perBlock
  }

  // 4. The coins land: in your wallet, or on the exchange (where the sell share is queued).
  for (const coin of COINS) {
    const coins = coin === 'BTC' ? btcCoins : ethCoins
    if (coins <= 0) continue
    s.treasury[coin] += coins
    p.mined[coin] += coins
    p.quarter.coinsMined[coin] += coins
    if (p.minedTo === 'exchange') {
      p.onExchange[coin] += coins
      p.sellQueue[coin] += coins * (1 - s.hodlPct[coin])
    }
  }
  p.blocksFound += blocks
  p.quarter.blocksFound += blocks

  // 5. Selling: up to the week's cap, from the exchange, each sale pushing the price down.
  const soldUsd = sellWeek(s, w)

  // 6. Income while at home; rent once you've moved out; power.
  const incomeUsd = p.livingAtHome ? P().start.income_usd_q / WEEKS() : 0
  const rentUsd = p.livingAtHome ? 0 : rentUsdQ(s.quarter) / WEEKS()
  s.cash = roundCents(s.cash + incomeUsd - rentUsd - powerUsd)
  p.quarter.incomeUsd += incomeUsd
  p.quarter.rentUsd += rentUsd
  p.quarter.powerCostUsd += powerUsd
  p.quarter.soldUsd += soldUsd
  if (blocks > 0)
    logEntry(s, 'log.p0_blocks', { n: blocks, coins: btcCoins }, weekNo)

  checkPrologueEvents(s, w)
  s.week++
  if (s.week === WEEKS() && !s.interrupt) prologueEndQuarter(s)
}

/**
 * The week's sales (scope §2.8): the queue sells from the exchange up to the week's cap; the
 * realised price = market × (1 − impact × sale ÷ cap); what doesn't sell waits for next week.
 * Nothing sells without a price, or while the exchange has halted trading.
 */
export function sellWeek(s: GameState, w: MarketWeek): number {
  const p = s.prologue!
  if (p.noSellingUntil !== null && absWeek(s) <= p.noSellingUntil) return 0
  let capLeft = sellCapUsdWeek(s.quarter)
  let total = 0
  for (const coin of COINS) {
    const px = price(w, coin)
    const queued = Math.min(p.sellQueue[coin], p.onExchange[coin])
    if (px <= 0 || queued <= 0 || capLeft <= 0) continue
    const coins = Math.min(queued, capLeft / px)
    const saleUsd = coins * px
    const impact =
      P().sell_caps_usd_week.impact * (saleUsd / sellCapUsdWeek(s.quarter))
    const got = saleUsd * (1 - impact)
    capLeft -= saleUsd
    total += got
    s.cash += got
    s.treasury[coin] -= coins
    p.onExchange[coin] -= coins
    p.sellQueue[coin] -= coins
  }
  return total
}

/**
 * The quarter's end (scope §2.3): household patience drops 15 while a household site runs above its
 * threshold; the report; a cash shortfall sells coins on the exchange, then machines; still short
 * is game over. Then the report phase.
 */
export function prologueEndQuarter(s: GameState): void {
  const p = s.prologue!
  const w = marketWeek(s.quarter, WEEKS() - 1)
  if (p.livingAtHome) {
    const over = s.sites.some((site) => {
      const home = householdTier(site.tier)
      return (
        home &&
        !cutBack(s) &&
        siteLoadKw(s, site.id) > home.household_threshold_kw
      )
    })
    if (over)
      p.patience = Math.max(
        0,
        p.patience - P().household.drain_per_quarter.value,
      )
    // At 0 the household steps in: its card waits in next quarter's Plan phase (move out now, or
    // cut the load to the threshold for that quarter: the default).
    if (p.patience <= 0 && s.quarter < actLastQuarter(0)) {
      p.householdCard = true
      p.stopNext = true
    }
  }
  if (s.cash < 0) forcedSale(s, w)
  const first = marketWeek(s.quarter, 0)
  p.reports.push({
    quarter: CONTENT.quarters[s.quarter],
    auto: !isDecisionQuarter(s.quarter) && !p.flags.includes('planned_now'),
    coinsMined: { ...p.quarter.coinsMined },
    blocksFound: p.quarter.blocksFound,
    btcUsd: w.btc_usd,
    ethUsd: w.eth_usd,
    difficultyChangePct:
      first.btc_difficulty_T > 0
        ? w.btc_difficulty_T / first.btc_difficulty_T - 1
        : 0,
    cash: s.cash,
    treasury: { ...s.treasury },
    onExchange: { ...p.onExchange },
    powerCostUsd: p.quarter.powerCostUsd,
    incomeUsd: p.quarter.incomeUsd,
    rentUsd: p.quarter.rentUsd,
    soldUsd: p.quarter.soldUsd,
    netWorthUsd: netWorthUsd(s, w),
    patience: p.livingAtHome ? p.patience : null,
  })
  p.flags = p.flags.filter((f) => f !== 'planned_now')
  s.phase = s.cash < 0 ? 'gameover' : 'report'
  if (s.phase === 'gameover') logEntry(s, 'log.game_over')
}

/** Cash below zero at quarter end: coins on the exchange sell at the week's price, then machines. */
function forcedSale(s: GameState, w: MarketWeek): void {
  const p = s.prologue!
  for (const coin of COINS) {
    const px = price(w, coin)
    if (s.cash >= 0 || px <= 0) continue
    const coins = Math.min(p.onExchange[coin], -s.cash / px)
    s.cash += coins * px
    s.treasury[coin] -= coins
    p.onExchange[coin] -= coins
  }
  for (const lot of [...s.machines]) {
    if (s.cash >= 0) break
    s.cash += removeMachines(s, lot, lot.count)
  }
  s.cash = roundCents(s.cash)
  logEntry(s, 'log.p0_forced_sale')
}

/** Starts the live quarter (after a Plan phase, or straight away when it auto-plays). */
export function beginPrologueLive(s: GameState): void {
  s.phase = 'live'
  s.week = 0
  s.interrupt = null
  s.interruptsThisQuarter = 0
  s.prologue!.quarter = emptyPrologueQuarter()
  schedulePrologueEvents(s)
}

/**
 * From the report on. After 2016Q4 comes the prologue's chapter report; otherwise the next quarter:
 * a Plan phase in a decision quarter (or after "Stop here"), else it auto-plays.
 */
export function prologueNextQuarter(s: GameState, stopHere = false): void {
  const p = s.prologue!
  if (s.quarter >= actLastQuarter(0)) {
    s.phase = 'chapter'
    return
  }
  s.quarter++
  s.week = 0
  s.bandwidth = Math.max(0, prologueBandwidth(s) + s.events.bandwidthNext)
  s.events.bandwidthNext = 0
  if (p.usedOffer && p.usedOffer.quarter < s.quarter) p.usedOffer = null
  if (isDecisionQuarter(s.quarter) || stopHere || p.stopNext) {
    p.stopNext = false
    if (!isDecisionQuarter(s.quarter)) p.flags.push('planned_now')
    s.phase = 'plan'
    p.quarter = emptyPrologueQuarter()
  } else beginPrologueLive(s)
}

/** Your net worth at the prologue's end (the handover's start wealth). */
export function prologueNetWorth(s: GameState): number {
  return netWorthUsd(s, marketWeek(actLastQuarter(0), WEEKS() - 1))
}

export type { PrologueState }
