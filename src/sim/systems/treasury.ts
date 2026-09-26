// Treasury: mined coins are split by the HODL %: the held share goes into the
// treasury, the rest is sold at this week's price. Power and rent are paid weekly.
import { BALANCE, type MarketWeek } from '../../content/index.ts'
import type { Coin, GameState } from '../state.ts'
import { coinPrice } from './market.ts'
import type { LotWeek } from './mining.ts'

const COINS: Coin[] = ['BTC', 'ETH']

export interface WeekMoney {
  revenueUsd: number
  /** Dollars received for the coins sold this week. */
  soldUsd: number
  powerCostUsd: number
  rentUsd: number
  coinsMined: Record<Coin, number>
  /** Power cost split by the coin each fleet mines (for cost per coin). */
  powerByCoin: Record<Coin, number>
}

/** Rent for every site you hold (including ones still being built), spread over 13 weeks. */
export function weeklyRentUsd(state: GameState): number {
  return state.sites.reduce(
    (sum, s) => sum + s.rentUsdQ / BALANCE.weeksPerQuarter,
    0,
  )
}

/** Books one week of mining: sells or holds the coins, pays power and rent. */
export function settleWeek(
  state: GameState,
  lots: LotWeek[],
  w: MarketWeek,
): WeekMoney {
  const coinsMined: Record<Coin, number> = { BTC: 0, ETH: 0 }
  const powerByCoin: Record<Coin, number> = { BTC: 0, ETH: 0 }
  let revenueUsd = 0
  for (const lot of lots) {
    coinsMined[lot.coin] += lot.coinsMined
    powerByCoin[lot.coin] += lot.powerCostUsd
    revenueUsd += lot.revenueUsd
  }
  let soldUsd = 0
  for (const coin of COINS) {
    const held = coinsMined[coin] * state.hodlPct[coin]
    state.treasury[coin] += held
    soldUsd += (coinsMined[coin] - held) * coinPrice(w, coin)
  }
  const powerCostUsd = powerByCoin.BTC + powerByCoin.ETH
  const rentUsd = weeklyRentUsd(state)
  state.cash += soldUsd - powerCostUsd - rentUsd
  return { revenueUsd, soldUsd, powerCostUsd, rentUsd, coinsMined, powerByCoin }
}

/** Sells a share (0–1) of every coin in the treasury at this week's price. Returns dollars raised. */
export function sellTreasury(
  state: GameState,
  share: number,
  w: MarketWeek,
): number {
  let usd = 0
  for (const coin of COINS) {
    const coins = state.treasury[coin] * share
    state.treasury[coin] -= coins
    usd += coins * coinPrice(w, coin)
  }
  state.cash += usd
  return usd
}

export function treasuryValueUsd(state: GameState, w: MarketWeek): number {
  return COINS.reduce((sum, c) => sum + state.treasury[c] * coinPrice(w, c), 0)
}
