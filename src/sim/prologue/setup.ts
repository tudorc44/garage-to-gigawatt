// The prologue's setup and small shared rules (Alpha 0.3, Act 0; prologue.json): the start, the two
// household sites (bedroom, home rig) next to Act I's garage and small unit, what power costs where,
// rent, the pool fee, the selling cap, and your net worth.
import {
  CONTENT,
  actFirstQuarter,
  type MarketWeek,
} from '../../content/index.ts'
import { random, type RngHolder } from '../rng.ts'
import {
  emptyQuarterStats,
  newGame,
  type GameState,
  type Site,
} from '../state.ts'
import { saleValueUsd } from '../systems/machines.ts'
import { capacityKw, powerPriceUsdKwh } from '../systems/sites.ts'
import type { CoinAmounts, PrologueState } from './types.ts'

export const P = () => CONTENT.prologue.rules

const label = (quarter: number) => CONTENT.quarters[quarter] ?? ''
const year = (quarter: number) => label(quarter).slice(0, 4)

/** A value "by year" (rent, deposit, fee, cap): the latest listed year at or before, else the first. */
export function byYear(
  values: Record<string, number>,
  quarter: number,
): number {
  const years = Object.keys(values).sort()
  const at = years.filter((y) => y <= year(quarter)).at(-1) ?? years[0]
  return values[at]
}

export const zero = (): CoinAmounts => ({ BTC: 0, ETH: 0 })

/** The household sites (bedroom, home rig): power is free while you live at home. */
export function householdTier(tier: string) {
  return P().site_tiers.find((t) => t.id === tier)
}

/** A site's capacity: a household site's from prologue.json, Act I's tiers as in Act I. */
export function siteCapacityKw(site: Site): number {
  return householdTier(site.tier)?.capacity_kw ?? capacityKw(site)
}

/**
 * What a kWh costs you at a site now: nothing at a household site while you live at home; Act I's
 * price for the garage and small unit, at its 2017Q1 level through the prologue (Prologue choice).
 */
export function sitePowerUsdKwh(state: GameState, site: Site): number {
  if (householdTier(site.tier) && state.prologue?.livingAtHome !== false)
    return 0
  return powerPriceUsdKwh(site, 0)
}

export const rentUsdQ = (quarter: number) =>
  byYear(P().move_out.rent_usd_q_by_year, quarter)
export const depositUsd = (quarter: number) =>
  byYear(P().move_out.deposit_usd_by_year, quarter)
export const poolFee = (quarter: number) =>
  byYear(P().pools.fee_by_year, quarter)
export const sellCapUsdWeek = (quarter: number) =>
  byYear(P().sell_caps_usd_week.by_year, quarter)

/** Pools exist from 2010Q4. */
export const poolsOpen = (quarter: number) => label(quarter) >= P().pools.from

/** A decision quarter gets a Plan phase and a full report; the others auto-play (scope §2.2). */
export const isDecisionQuarter = (quarter: number) =>
  P().decision_quarters.includes(label(quarter))

/** Bandwidth each prologue quarter: 2, +1 once you've moved out; minus a card's cost next quarter. */
export function prologueBandwidth(state: GameState): number {
  const s = P().start
  return (
    s.bandwidth +
    (state.prologue?.livingAtHome ? 0 : s.bandwidth_after_move_out)
  )
}

/** The kW your machines draw at a site (working and broken alike, as Act I counts capacity). */
export function siteLoadKw(state: GameState, siteId: string): number {
  return state.machines
    .filter((l) => l.siteId === siteId)
    .reduce(
      (kw, l) =>
        kw +
        l.count *
          (CONTENT.prologue.machines.find((m) => m.id === l.model)?.power_kw ??
            CONTENT.machines.find((m) => m.id === l.model)?.power_kw ??
            0),
      0,
    )
}

/** Your net worth now: cash, coins at this week's prices, and machines at their used price. */
export function netWorthUsd(state: GameState, w: MarketWeek): number {
  const coins = state.treasury.BTC * w.btc_usd + state.treasury.ETH * w.eth_usd
  const machines = state.machines.reduce(
    (usd, l) => usd + saleValueUsd(l, l.count, state.quarter),
    0,
  )
  return state.cash + coins + machines
}

/** A Poisson draw (solo blocks found in a week, scope §2.6), on the given random stream. */
export function poisson(r: RngHolder, lambda: number): number {
  if (lambda <= 0) return 0
  if (lambda < 30) {
    const limit = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= random(r)
    } while (p > limit)
    return k - 1
  }
  // Many blocks: the normal approximation (Box–Muller).
  const u = Math.max(random(r), 1e-12)
  const v = random(r)
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z))
}

export function emptyPrologueQuarter(): PrologueState['quarter'] {
  return {
    coinsMined: zero(),
    blocksFound: 0,
    powerCostUsd: 0,
    incomeUsd: 0,
    rentUsd: 0,
    soldUsd: 0,
  }
}

/** A prologue start (scope §2.3): 2009Q1, the bedroom and your PC, $2,000, a part-time income. */
export function newPrologueGame(seed: number): GameState {
  const first = actFirstQuarter(0)
  const s = P().start
  const base = newGame(seed)
  const prologue: PrologueState = {
    livingAtHome: true,
    patience: P().household.patience_start,
    cutLoadUntil: null,
    householdCard: false,
    pool: false,
    onExchange: zero(),
    minedTo: 'wallet',
    moves: [],
    sellQueue: zero(),
    noSellingUntil: null,
    backup: false,
    preorders: [],
    offersTaken: [],
    offersIgnored: [],
    conferences: [],
    usedOffer: null,
    vanity: [],
    lost: { exchange: zero(), wallet: zero() },
    mined: zero(),
    blocksFound: 0,
    stopNext: false,
    flags: [],
    reports: [],
    quarter: emptyPrologueQuarter(),
  }
  return {
    ...base,
    act: 0,
    phase: 'intro',
    quarter: first,
    cash: s.cash_usd,
    bandwidth: s.bandwidth,
    sites: [
      {
        id: 'site-1',
        tier: s.site_tier,
        readyQuarter: first,
        rentUsdQ: 0,
        powerPriceMult: 1,
        flaw: null,
      },
    ],
    machines: s.machines.map((model, i) => ({
      id: `lot-${i + 1}`,
      model,
      siteId: 'site-1',
      condition: 'used' as const,
      count: 1,
      failed: 0,
      earnsFromQuarter: first,
    })),
    nextId: 2 + s.machines.length,
    quarterStats: emptyQuarterStats(),
    prologue,
  }
}
