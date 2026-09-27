// Market system: this week's coin prices and mining revenue, and machine prices.
// Everything comes straight from the scripted content (market_weekly + machines.json).
import {
  CONTENT,
  act1ValueQuarter,
  act2Quarter,
  type Machine,
  type MarketWeek,
} from '../../content/index.ts'
import type { Coin, Condition } from '../state.ts'

export function getModel(id: string): Machine | undefined {
  return CONTENT.machines.find((m) => m.id === id)
}

/** Market data for a week of a quarter (week 0–12). Throws past the end of the data, so a
 * wrong index fails loudly instead of reading undefined. */
export function marketWeek(quarter: number, week: number): MarketWeek {
  const w = CONTENT.market[quarter]?.[week]
  if (!w)
    throw new RangeError(
      `No market data for quarter ${quarter}, week ${week} (the market has ${CONTENT.market.length} quarters of ${CONTENT.market[0].length} weeks)`,
    )
  return w
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

/**
 * Act II prices for machines with an `act2_price` (owner decision B7): the quarter's $/TH tier
 * (its first week, the Plan-phase price) × the machine's TH/s is the new price; used = new ×
 * the used/new ratio of the model and quarter named in `used_ratio_from`. undefined outside
 * Act II or for machines without Act II pricing (GPU rigs keep their held 2022Q3 prices).
 */
export function act2Prices(
  model: Machine,
  quarter: number,
): { newUsd: number; usedUsd: number } | undefined {
  const price = model.act2_price
  if (!price || !act2Quarter(quarter)) return undefined
  const perTh = marketWeek(quarter, 0)[`asic_price_usd_th_${price.tier}`]
  if (perTh === null) return undefined
  const from = getModel(price.used_ratio_from.model)!
  const q = price.used_ratio_from.quarter
  const newUsd = perTh * model.hashrate
  return {
    newUsd,
    usedUsd: newUsd * (from.price_used[q]! / from.price_new[q]!),
  }
}

/**
 * Purchase price this quarter, or undefined if it can't be bought (not out yet, or retail ended).
 * Act I prices come from machines.json. From 2022Q4 on, ASICs follow the $/TH tiers (act2Prices;
 * an ASIC whose retail ended stays used-only; the S21's used market opens at act2_used_from);
 * other machines keep their 2022Q3 prices.
 */
export function buyPrice(
  model: Machine,
  quarter: number,
  condition: Condition,
): number | undefined {
  const label = CONTENT.quarters[quarter]
  const act2 = act2Prices(model, quarter)
  if (act2) {
    if (label < model.available_from) return undefined
    if (condition === 'new')
      return model.retail_new_ends && label > model.retail_new_ends
        ? undefined
        : act2.newUsd
    return model.act2_used_from && label < model.act2_used_from
      ? undefined
      : act2.usedUsd
  }
  const q = act1ValueQuarter(quarter)
  if (q < model.available_from) return undefined
  if (condition === 'new') return model.price_new[q]
  // The 2020Q4–2022Q1 GPU shortage: used rigs cost at least the new price (machines.json gpu_cap).
  const cap = CONTENT.gpuCap
  const used = model.price_used[q]
  const newPrice = model.price_new[q]
  if (
    model.coin === 'ETH' &&
    q >= cap.window[0] &&
    q <= cap.window[1] &&
    used !== undefined &&
    newPrice !== undefined
  )
    return Math.max(used, newPrice * cap.usedPriceMinNewMult)
  return used
}

/**
 * What one working unit sells for: the market's used price. In Act II, ASICs sell at their
 * tier-based used price (even before a used market opens for buyers); others at 2022Q3's.
 */
export function sellPrice(model: Machine, quarter: number): number {
  const act2 = act2Prices(model, quarter)
  if (act2) return act2.usedUsd
  return model.price_used[act1ValueQuarter(quarter)] ?? 0
}

/** Quarters from order to delivery. Used machines are delivered at once. */
export function leadTimeQuarters(
  model: Machine,
  quarter: number,
  condition: Condition,
): number {
  if (condition === 'used') return 0
  return (
    model.lead_time_quarters[act1ValueQuarter(quarter)] ??
    model.lead_time_quarters.default
  )
}
