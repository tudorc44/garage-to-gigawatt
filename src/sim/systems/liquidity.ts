// Act I's liquidity brake (owner, P5.0 answer P1; designed): a Satoshi-scale prologue start can't turn
// its coins into cash at once. Each week, coin sales (the keep/sell share of mined coins, and treasury
// sales from the Plan phase, alerts and cards) are capped at the year's USD cap; each sale fetches
// market × (1 − 0.2 × sale ÷ cap), and whatever the cap leaves unsold stays in the treasury and sells
// in the weeks after (unfilled orders carry over). The quarter end's forced sale is an emergency and
// isn't capped (mine). The cap and impact apply to prologue starts only: for a $10K start the cap
// never binds but the impact term would nudge every sale and every golden (mine). The loan cap
// (4 weeks of the cap) applies to every Act I game; it never binds for a $10K start.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Coin, GameState } from '../state.ts'

const L = () => BALANCE.act1Liquidity
const W = () => BALANCE.weeksPerQuarter

/** The weekly sell cap in a quarter (its year's; null outside Act I's years). */
export function act1SellCapUsdWeek(quarter: number): number | null {
  const year = (CONTENT.quarters[quarter] ?? '').slice(0, 4)
  return L().sellCapUsdWeekByYear[year] ?? null
}

/** Whether the sale cap and price impact apply now: a prologue start, in Act I. */
export function brakeApplies(state: GameState): boolean {
  return (
    state.act === 1 &&
    state.prologueCarry !== undefined &&
    act1SellCapUsdWeek(state.quarter) !== null
  )
}

/** The brake's state for this week (created, or reset at a new week). */
function thisWeek(state: GameState) {
  const now = state.quarter * W() + state.week
  const l = (state.act1Liquidity ??= {
    week: now,
    soldUsd: 0,
    queue: { BTC: 0, ETH: 0 },
  })
  if (l.week !== now) {
    l.week = now
    l.soldUsd = 0
  }
  return l
}

/**
 * Sells up to `coins` of `coin` at `px` under the cap (assumes brakeApplies): returns the coins sold
 * and the dollars they fetched after the price impact. The caller keeps the rest.
 */
function sellUnderCap(
  state: GameState,
  coins: number,
  px: number,
): { sold: number; usd: number } {
  const cap = act1SellCapUsdWeek(state.quarter)!
  const l = thisWeek(state)
  if (coins <= 0 || px <= 0) return { sold: 0, usd: 0 }
  const sold = Math.min(coins, Math.max(0, cap - l.soldUsd) / px)
  const saleUsd = sold * px
  l.soldUsd += saleUsd
  return { sold, usd: saleUsd * (1 - L().impact * (saleUsd / cap)) }
}

/**
 * Sells `coins` of `coin` out of the treasury under the cap; what the cap leaves joins the queue
 * (it stays in the treasury). Returns the dollars fetched (added to cash by the caller).
 */
export function sellFromTreasury(
  state: GameState,
  coin: Coin,
  coins: number,
  px: number,
): number {
  const { sold, usd } = sellUnderCap(state, coins, px)
  state.treasury[coin] -= sold
  const l = thisWeek(state)
  l.queue[coin] += coins - sold
  return usd
}

/** At a week's start: the coins still waiting sell first, up to the cap. Returns the dollars. */
export function sellQueued(
  state: GameState,
  prices: Record<Coin, number>,
): number {
  const l = thisWeek(state)
  let usd = 0
  for (const coin of ['BTC', 'ETH'] as const) {
    const waiting = Math.min(l.queue[coin], state.treasury[coin])
    if (waiting <= 0) continue
    const r = sellUnderCap(state, waiting, prices[coin])
    state.treasury[coin] -= r.sold
    l.queue[coin] = Math.max(0, waiting - r.sold)
    usd += r.usd
  }
  return usd
}

/** A crypto-backed loan's most principal under the brake: `loanWeeks` of the year's cap (all games). */
export function cryptoLoanCapUsd(quarter: number): number {
  const cap = act1SellCapUsdWeek(quarter)
  return cap === null ? Infinity : cap * L().loanWeeks
}
