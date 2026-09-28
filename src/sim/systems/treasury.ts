// Treasury: mined coins are split by the HODL %: the held share goes into the
// treasury, the rest is sold at this week's price. Power and rent are paid weekly.
import { BALANCE, type MarketWeek } from '../../content/index.ts'
import { modifierMult } from './eventEffects.ts'
import { brakeApplies, sellFromTreasury, sellQueued } from './liquidity.ts'
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
    (sum, s) =>
      sum +
      (s.rentUsdQ / BALANCE.weeksPerQuarter) *
        modifierMult(state, 'rent', s.id),
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
  if (brakeApplies(state)) {
    // A prologue start (P5.0, P1): coins waiting from earlier weeks sell first, then the sell share
    // of this week's coins, all under the weekly cap; the rest waits in the treasury.
    soldUsd += sellQueued(state, {
      BTC: coinPrice(w, 'BTC'),
      ETH: coinPrice(w, 'ETH'),
    })
    for (const coin of COINS) {
      state.treasury[coin] += coinsMined[coin]
      const toSell = coinsMined[coin] * (1 - state.hodlPct[coin])
      soldUsd += sellFromTreasury(state, coin, toSell, coinPrice(w, coin))
    }
  } else
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

/**
 * Sells a share (0–1) of one coin in the treasury, or of both if `only` is left out,
 * at this week's price. Returns dollars raised.
 */
export function sellTreasury(
  state: GameState,
  share: number,
  w: MarketWeek,
  only?: Coin,
): number {
  let usd = 0
  for (const coin of only ? [only] : COINS) {
    const coins = state.treasury[coin] * share
    // A prologue start sells under Act I's weekly cap; the rest waits (P5.0, P1).
    if (brakeApplies(state)) {
      usd += sellFromTreasury(state, coin, coins, coinPrice(w, coin))
      continue
    }
    state.treasury[coin] -= coins
    usd += coins * coinPrice(w, coin)
  }
  state.cash += usd
  return usd
}

export function treasuryValueUsd(state: GameState, w: MarketWeek): number {
  return COINS.reduce((sum, c) => sum + state.treasury[c] * coinPrice(w, c), 0)
}
