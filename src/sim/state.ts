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
  }
}

/** The quarter's label, e.g. "2017Q1". */
export function quarterLabel(state: GameState): string {
  return CONTENT.quarters[state.quarter]
}
