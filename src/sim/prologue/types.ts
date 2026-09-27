// The prologue's own state (Alpha 0.3, Act 0: 2009Q1–2016Q4). Kept in GameState.prologue, which
// only a prologue start has: an Act I start never carries it, so its saves and goldens don't change.
import type { Coin } from '../state.ts'

export type CoinAmounts = Record<Coin, number>

/** A coin move between your wallet and the exchange: it arrives after one week (scope §2.7). */
export interface CoinMove {
  coin: Coin
  amount: number
  to: 'exchange' | 'wallet'
  /** Absolute week index (quarter × 13 + week) when it lands. */
  arrives: number
}

/** A pre-order (scope §2.9; prologue.json › preorders): paid up front, its delivery rolled at order time. */
export interface Preorder {
  id: string
  vendor: string
  /** Share of a unit (the group buy is half a unit for half the price). */
  unitShare: number
  paidUsd: number
  orderedQuarter: number
  /** The quarter it arrives (it earns from the next one), or null if it never comes. */
  deliverQuarter: number | null
  outcome: 'on_time' | 'late' | 'very_late' | 'never'
  delivered: boolean
}

/** One prologue quarter as the auto-play card and the report show it. */
export interface PrologueReport {
  quarter: string
  /** Auto-played (no Plan phase): shown as a single summary card. */
  auto: boolean
  coinsMined: CoinAmounts
  /** Blocks found solo this quarter (0 in a pool). */
  blocksFound: number
  btcUsd: number
  ethUsd: number
  difficultyChangePct: number
  cash: number
  treasury: CoinAmounts
  onExchange: CoinAmounts
  powerCostUsd: number
  incomeUsd: number
  rentUsd: number
  soldUsd: number
  netWorthUsd: number
  patience: number | null
  /** Cards played this quarter and the answer (auto-played ones took their default). */
  cards: { id: string; choice: string }[]
}

export interface PrologueState {
  /** Still living with your parents: household power is free, income comes in, patience counts. */
  livingAtHome: boolean
  /** Household patience, 0–100 (scope §2.3). */
  patience: number
  /** The household made you cut your load back to the threshold until (and including) this quarter. */
  cutLoadUntil: number | null
  /** Patience hit 0: the household's card waits in the Plan phase (move out, or cut the load). */
  householdCard: boolean
  /** Mine in a pool (from 2010Q4) instead of solo. */
  pool: boolean
  /** The part of the treasury that sits on an exchange (the rest is in your wallet). */
  onExchange: CoinAmounts
  /** Where newly mined coins land. */
  minedTo: 'wallet' | 'exchange'
  /** Coin moves in transit (a week). */
  moves: CoinMove[]
  /** Coins waiting to be sold on the exchange (the weekly cap sells them over time). */
  sellQueue: CoinAmounts
  /** No selling until (and including) this absolute week (the 2011 Mt Gox hack). */
  noSellingUntil: number | null
  /** Your wallet is backed up (until you buy a new PC-class machine or move out). */
  backup: boolean
  preorders: Preorder[]
  /** Forum offers taken or turned down, by id. */
  offersTaken: string[]
  offersIgnored: string[]
  /** Conferences attended (their contact improves pre-order odds and brings a used-machine offer). */
  conferences: string[]
  /** A conference contact's used-machine offer, open until the end of the quarter. */
  usedOffer: { model: string; quarter: number; discount: number } | null
  vanity: string[]
  /** Coins lost for good: to exchanges and to lost wallets. */
  lost: { exchange: CoinAmounts; wallet: CoinAmounts }
  /** Totals mined over the prologue, and blocks found solo. */
  mined: CoinAmounts
  blocksFound: number
  /** "Stop here": the next quarter gets a Plan phase even if it would auto-play. */
  stopNext: boolean
  /** Story flags set by cards (read_whitepaper, has_eth …). */
  flags: string[]
  /** This quarter's cards not played yet (week = the 1-based week they come in). */
  cardQueue: { id: string; week: number }[]
  /** Random cards already played (each at most once a game; the wallet-loss card may repeat). */
  cardsFired: string[]
  /** Cards that paused the game for a choice, over the prologue (the pacing check, scope §5). */
  cardsShown: number
  /** A card slowed your machines until (and including) this absolute week. */
  slowdown: { mult: number; until: number } | null
  /** A card asked for a panel in the next Plan phase ('buy:<model>', 'preorders', 'wallet', 'offers'). */
  openPanel: string | null
  reports: PrologueReport[]
  /** This quarter's running totals. */
  quarter: {
    coinsMined: CoinAmounts
    blocksFound: number
    powerCostUsd: number
    incomeUsd: number
    rentUsd: number
    soldUsd: number
    cards: { id: string; choice: string }[]
  }
}

/**
 * What a prologue start brought into Act I (scope §2.12, P0-17): its net worth at the handover, for
 * scoring Act I by the growth multiple; and the coins' custody at that point (shown, no Act I rules).
 */
export interface PrologueCarry {
  startNetWorthUsd: number
  onExchange: CoinAmounts
  lost: { exchange: CoinAmounts; wallet: CoinAmounts }
}
