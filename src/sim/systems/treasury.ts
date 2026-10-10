// Treasury: mined coins are split by the HODL %: the held share goes into the
// treasury, the rest is sold at this week's price. Power and rent are paid weekly.
import { BALANCE, type MarketWeek } from '../../content/index.ts'
import { modifierMult } from './eventEffects.ts'
import { brakeApplies, sellFromTreasury, sellQueued } from './liquidity.ts'
import type { Coin, GameState } from '../state.ts'
import { coinPrice } from './market.ts'
import type { LotWeek } from './mining.ts'
import { accrue, book, bookSplit, siteBusiness, type Category, type LedgerRef } from '../ledger.ts'

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

/** Each site's rent for a week, in site order (M37.1: the ledger books it per site). */
function weeklyRentBySite(state: GameState): [string, number][] {
  return state.sites.map((s) => [
    s.id,
    (s.rentUsdQ / BALANCE.weeksPerQuarter) * modifierMult(state, 'rent', s.id),
  ])
}

/** Rent for every site you hold (including ones still being built), spread over 13 weeks. */
export function weeklyRentUsd(state: GameState): number {
  return weeklyRentBySite(state).reduce((sum, [, usd]) => sum + usd, 0)
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
  const rents = weeklyRentBySite(state)
  const rentUsd = rents.reduce((sum, [, usd]) => sum + usd, 0)
  // M37.1: mined coins are revenue at this week's value (no cash until sold); power by the lot's site, rent by site.
  const parts: [Category, number, LedgerRef?][] = [['coins_sold', soldUsd]]
  for (const lot of lots) {
    const site = state.machines.find((m) => m.id === lot.lotId)?.siteId
    accrue(state, lot.coin === 'BTC' ? 'mining_btc' : 'mining_eth', lot.revenueUsd, { site })
    parts.push(['power', -lot.powerCostUsd, { site }])
  }
  for (const [site, usd] of rents) parts.push(['rent', -usd, { site, biz: siteBusiness(state, site) }])
  bookSplit(state, soldUsd - powerCostUsd - rentUsd, parts)
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
  book(state, 'coins_sold', usd)
  return usd
}

export function treasuryValueUsd(state: GameState, w: MarketWeek): number {
  return COINS.reduce((sum, c) => sum + state.treasury[c] * coinPrice(w, c), 0)
}
