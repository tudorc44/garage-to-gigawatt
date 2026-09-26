// Mining: each week, roll machine failures, then work out what every batch of
// machines mines and what its power costs. A batch whose revenue is below its power
// cost switches itself off for the week (scope §2.4).
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import { binomial } from '../rng.ts'
import type { Coin, GameState, MachineLot, Site } from '../state.ts'
import { isShutDown } from './heat.ts'
import { coinPrice, getModel, revenuePerUnitDay } from './market.ts'
import {
  flawEffect,
  hashrateMult,
  isReady,
  powerPriceUsdKwh,
  uptime,
} from './sites.ts'

export interface LotWeek {
  lotId: string
  coin: Coin
  /** Healthy units this week. */
  working: number
  /** false when the batch switched itself off (revenue below power cost) or has no working units. */
  running: boolean
  revenueUsd: number
  powerCostUsd: number
  coinsMined: number
}

/** A batch earns once it's delivered (earnsFromQuarter) and its site is energized. */
export function isEarning(state: GameState, lot: MachineLot): boolean {
  const site = state.sites.find((s) => s.id === lot.siteId)!
  return state.quarter >= lot.earnsFromQuarter && isReady(site, state.quarter)
}

/**
 * Weekly failure roll per batch: each working unit fails with chance
 * annual_failure_rate / 52 (× 1.5 if used, × the site's flaw multiplier).
 * Broken units stop hashing until repaired in the Plan phase. Returns new failures.
 */
export function rollFailures(state: GameState): number {
  let total = 0
  for (const lot of state.machines) {
    if (!isEarning(state, lot)) continue
    const model = getModel(lot.model)!
    const site = state.sites.find((s) => s.id === lot.siteId)!
    const p =
      (model.annual_failure_rate / 52) *
      (lot.condition === 'used' ? BALANCE.failures.usedMult : 1) *
      (flawEffect(site, 'failure_mult') ?? 1)
    const failures = binomial(state, lot.count - lot.failed, p)
    lot.failed += failures
    total += failures
  }
  return total
}

/** What each earning batch mines this week and what its power costs. Reads state only. */
export function mineWeek(
  state: GameState,
  w: MarketWeek,
  /** Price the week at normal power prices even during Uri (for the curtailment offer). */
  opts: { ignoreStorm?: boolean } = {},
): LotWeek[] {
  return state.machines
    .filter((lot) => isEarning(state, lot))
    .map((lot) => {
      const model = getModel(lot.model)!
      const site = state.sites.find((s) => s.id === lot.siteId)!
      const working = lot.count - lot.failed
      const up = uptime(site)
      const revenueUsd =
        working *
        revenuePerUnitDay(model, w) *
        7 *
        up *
        hashrateMult(site, state.quarter)
      const powerCostUsd =
        working *
        model.power_kw *
        24 *
        7 *
        up *
        ((opts.ignoreStorm ? undefined : stormPrice(state, site, w)) ??
          powerPriceUsdKwh(site, state.quarter))
      const running =
        working > 0 && revenueUsd >= powerCostUsd && !isShutDown(state, site.id)
      return {
        lotId: lot.id,
        coin: model.coin,
        working,
        running,
        revenueUsd: running ? revenueUsd : 0,
        powerCostUsd: running ? powerCostUsd : 0,
        coinsMined: running ? revenueUsd / coinPrice(w, model.coin) : 0,
      }
    })
}

/** Hashrate of healthy, earning machines: BTC in TH/s, ETH in MH/s. */
export function hashrate(state: GameState): Record<Coin, number> {
  const out: Record<Coin, number> = { BTC: 0, ETH: 0 }
  for (const lot of state.machines) {
    if (!isEarning(state, lot)) continue
    const model = getModel(lot.model)!
    out[model.coin] += (lot.count - lot.failed) * model.hashrate
  }
  return out
}

/**
 * Uri (shocks.json): during the storm, index-contract sites face the storm price per kWh, so
 * their machines switch themselves off (and earn nothing). The storm bill itself is charged on
 * the firm load in advance(), not here. undefined outside the storm or for fixed contracts.
 */
function stormPrice(
  state: GameState,
  site: Site,
  w: MarketWeek,
): number | undefined {
  if (site.contract?.type !== 'index') return
  const weekIndex = CONTENT.market[state.quarter].indexOf(w)
  const shock = CONTENT.shocks.find(
    (sh) =>
      sh.quarter === state.quarter &&
      weekIndex >= sh.week &&
      weekIndex < sh.week + sh.weeks,
  )
  return shock?.stormPriceUsdKwh
}
