// The whole game lives in one plain GameState object: no classes, no functions, so it
// can be copied, compared, saved as JSON and replayed. Systems read and update it.
import { BALANCE, CONTENT } from '../content/index.ts'

export type Phase = 'plan' | 'live' | 'report' | 'gameover' | 'ended'
export type Coin = 'BTC' | 'ETH'
export type Condition = 'new' | 'used'

export interface Site {
  id: string
  /** Site tier id from sites.json, e.g. "garage" or "warehouse". */
  tier: string
  /** Quarter index when the site is energized. Before that it's still being built. */
  readyQuarter: number
  /** Scouted offers vary around the tier's numbers; these are this site's actual terms. */
  rentUsdQ: number
  powerPriceMult: number
  /** Hidden flaw id (sites.json flaws), revealed once built. null = no flaw. */
  flaw: string | null
}

/** A batch of identical machines bought together and placed at one site. */
export interface MachineLot {
  id: string
  model: string
  siteId: string
  condition: Condition
  count: number
  /** How many of the `count` units are broken and not hashing until repaired. */
  failed: number
  /** Quarter index when the lot starts earning (the quarter after delivery). */
  earnsFromQuarter: number
}

/** A site offer revealed by scouting. Its flaw stays hidden until the player builds it. */
export interface SiteOffer {
  id: string
  tier: string
  rentUsdQ: number
  capexUsd: number
  powerPriceMult: number
  flaw: string | null
}

export interface GameState {
  /** Save-format version, for future migrations. */
  version: 1
  seed: number
  /** Current position of the seeded RNG (see rng.ts). */
  rng: number
  phase: Phase
  /** 0 = 2017Q1 … 22 = 2022Q3; CONTENT.quarters[quarter] gives the label. */
  quarter: number
  /** Weeks already played in this quarter's live phase (0–13). */
  week: number
  /** Dollars. Rounded to cents once per week. */
  cash: number
  bandwidth: number
  /** Share of each week's mined coins kept in the treasury (0–1). The rest is sold. */
  hodlPct: number
  treasury: Record<Coin, number>
  sites: Site[]
  machines: MachineLot[]
  siteOffers: SiteOffer[]
  /** Counter for making unique ids ("site-3", "lot-7"). */
  nextId: number
  /** An alert waiting for the player's answer; the live quarter is paused while it's set. */
  interrupt: ActiveInterrupt | null
  interruptsThisQuarter: number
  /** Running totals for the quarter being played. */
  quarterStats: QuarterStats
  /** What happened in the most recent week (for the live-quarter ticker). */
  lastWeek: WeekSummary | null
  /** One report per finished quarter. */
  reports: QuarterReport[]
}

export interface ActiveInterrupt {
  /** Interrupt id from interrupts.json, e.g. "price_alert". */
  id: string
  /** Index of the week (0–12) the alert fired in. */
  week: number
  coin: Coin
  /** The weekly price move that set it off, e.g. -0.27. */
  changePct: number
}

export interface QuarterStats {
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  coinsMined: Record<Coin, number>
  powerByCoin: Record<Coin, number>
  failures: number
  /** Dollars raised by selling treasury coins in alerts. */
  treasurySoldUsd: number
}

export interface WeekSummary {
  /** 1–13 */
  week: number
  date: string
  btcUsd: number
  ethUsd: number
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  failures: number
  /** Batches that switched themselves off this week (revenue below power cost). */
  batchesOff: number
  cash: number
}

export interface QuarterReport {
  quarter: string
  /** Healthy, earning hashrate at quarter end: BTC in TH/s, ETH in MH/s. */
  hashrate: Record<Coin, number>
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  coinsMined: Record<Coin, number>
  /** Power cost per coin mined, or null if none was mined. */
  costPerCoinUsd: Record<Coin, number | null>
  failures: number
  brokenUnits: number
  treasury: Record<Coin, number>
  treasuryValueUsd: number
  cash: number
  /** Filled when cash went below zero and assets had to be sold. */
  forcedSale: { treasuryUsd: number; machinesUsd: number; units: number } | null
}

export function emptyQuarterStats(): QuarterStats {
  return {
    revenueUsd: 0,
    powerCostUsd: 0,
    rentUsd: 0,
    coinsMined: { BTC: 0, ETH: 0 },
    powerByCoin: { BTC: 0, ETH: 0 },
    failures: 0,
    treasurySoldUsd: 0,
  }
}

/** Money is kept in plain dollars and rounded to cents once per week. */
export function roundCents(usd: number): number {
  return Math.round(usd * 100) / 100
}

export function newGame(seed: number): GameState {
  const start = CONTENT.siteTiers.find((t) => t.id === BALANCE.startSite)!
  return {
    version: 1,
    seed,
    rng: seed | 0,
    phase: 'plan',
    quarter: 0,
    week: 0,
    cash: BALANCE.startCash,
    bandwidth: BALANCE.bandwidth.perQuarter,
    hodlPct: 0,
    treasury: { BTC: 0, ETH: 0 },
    sites: [
      {
        id: 'site-1',
        tier: start.id,
        readyQuarter: 0,
        rentUsdQ: start.rent_usd_q,
        powerPriceMult: 1,
        flaw: null,
      },
    ],
    machines: [],
    siteOffers: [],
    nextId: 2,
    interrupt: null,
    interruptsThisQuarter: 0,
    quarterStats: emptyQuarterStats(),
    lastWeek: null,
    reports: [],
  }
}

/** The quarter's label, e.g. "2017Q1". */
export function quarterLabel(state: GameState): string {
  return CONTENT.quarters[state.quarter]
}
