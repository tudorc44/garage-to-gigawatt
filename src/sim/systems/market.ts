// Market system: this week's coin prices and mining revenue, and machine prices.
// Everything comes straight from the scripted content (market_weekly + machines.json).
import { CONTENT, type Machine, type MarketWeek } from '../../content/index.ts'
import type { Coin, Condition } from '../state.ts'

export function getModel(id: string): Machine | undefined {
  return CONTENT.machines.find((m) => m.id === id)
}

/** Market data for a week of a quarter (week 0–12). */
export function marketWeek(quarter: number, week: number): MarketWeek {
  return CONTENT.market[quarter][week]
}

/** The week before, crossing into the previous quarter if needed. undefined for the very first week. */
export function previousMarketWeek(
  quarter: number,
  week: number,
): MarketWeek | undefined {
  if (week > 0) return CONTENT.market[quarter][week - 1]
  return CONTENT.market[quarter - 1]?.at(-1)
}

export function coinPrice(w: MarketWeek, coin: Coin): number {
  return coin === 'BTC' ? w.btc_usd : w.eth_usd
}

/** Dollars one healthy unit mines per day this week, before power. */
export function revenuePerUnitDay(model: Machine, w: MarketWeek): number {
  return model.coin === 'ETH'
    ? model.hashrate * w.eth_rev_usd_mh_day
    : model.hashrate * w.btc_hashprice_usd_th_day
}

/** Purchase price this quarter, or undefined if it can't be bought (not out yet, or retail ended). */
export function buyPrice(
  model: Machine,
  quarter: number,
  condition: Condition,
): number | undefined {
  const q = CONTENT.quarters[quarter]
  if (q < model.available_from) return undefined
  return condition === 'new' ? model.price_new[q] : model.price_used[q]
}

/** What one working unit sells for: the market's used price. */
export function sellPrice(model: Machine, quarter: number): number {
  return model.price_used[CONTENT.quarters[quarter]] ?? 0
}

/** Quarters from order to delivery. Used machines are delivered at once. */
export function leadTimeQuarters(
  model: Machine,
  quarter: number,
  condition: Condition,
): number {
  if (condition === 'used') return 0
  return (
    model.lead_time_quarters[CONTENT.quarters[quarter]] ??
    model.lead_time_quarters.default
  )
}
