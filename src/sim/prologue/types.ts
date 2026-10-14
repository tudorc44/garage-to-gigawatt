// The prologue's own state (Alpha 0.3, Act 0: 2009Q1–2016Q4). Kept in GameState.prologue, which
// only a prologue start has: an Act I start never carries it, so its saves and goldens don't change.
import type { Coin } from '../state.ts'

export type CoinAmounts = Record<Coin, number>

/** M68.4 (doc 51 v1.0 §5): the Prologue's scrypt coins. They live only in your own wallet (no exchange, no moves). */
export type AltCoin = 'LTC' | 'DOGE'
export const ALT_COINS: readonly AltCoin[] = ['LTC', 'DOGE']
export type AltAmounts = Record<AltCoin, number>

/**
 * Altcoin holdings and orders. Absent from a game that never points a GPU at an altcoin, so such a game's state (and every
 * golden) is as it was.
 */
export interface AltState {
  held: AltAmounts
  /** The share of newly mined coins kept (1 = keep all); the rest is ordered sold, as bitcoin's keep/sell %. */
  hodl: AltAmounts
  /** Coins ordered sold, waiting for the week's selling limits. */
  queue: AltAmounts
  mined: AltAmounts
  /** Lost with the wallet (a dead drive). */
  lost: AltAmounts
  /** Totals sold over the game: coins and dollars. */
  sold: AltAmounts
  soldUsd: AltAmounts
  /** What the last report already counted (for the quarter's own figures). */
  mark: { mined: AltAmounts; soldUsd: AltAmounts }
  /** The 2016Q4 handover: coins sold in 2016 (within the limits, then the leftover conversion) and what they brought. */
  handover?: Record<AltCoin, { amount: number; usd: number }>
}

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
  /** M68.4: only in a game with altcoins: what the quarter mined and sold, and what the wallet holds at its end. */
  alts?: { mined: AltAmounts; soldUsd: AltAmounts; held: AltAmounts }
  /** M69.3: only in a game with an open pool. */
  pool?: PoolReport
  /** M70.4: only in a game with the club: the quarter's output, and your share of it. */
  club?: { outputUsd: number; yourShareUsd: number; hostingUsd: number }
}

/**
 * Your own bitcoin pool (M69.3, doc 51 v1.1 §3). Absent from a game that never opens one, so such a game's state (and every
 * golden) is as it was.
 */
export interface OwnPool {
  name: string
  method: 'PPLNS' | 'PPS'
  /** The fee as a fraction (0.01 = 1%). */
  feePct: number
  openedQuarter: number
  /** Cold storage: the theft chance stays at its low value for good. */
  coldStorage: boolean
  /** DDoS protection from this quarter on (null: none). */
  protectionFrom: number | null
  /** 0-100, starts at 50. */
  reputation: number
  /** Outside miners' pull on the small-pool market (starts at start_pull). */
  pull: number
  /** The last 4 weeks' blocks found and expected, newest last (luck memory). */
  luck: { found: number; expected: number }[]
  /** Unlucky weeks in a row under PPLNS (the slide starts after 3). */
  unluckyRun: number
  /** A fee set by the boycott card until this quarter (inclusive), and whether the boycott bonus is open to the pool. */
  feeOverride: { fee: number; until: number } | null
  boycott: { from: number; until: number } | null
  /** An outage, a theft or an insolvency this quarter (it blocks the +5 reputation). */
  incident: boolean
  /** This week's figures, for the screen: outside hashrate in TH/s, blocks found, luck ratio. */
  outsideTh: number
  lastBlocks: number
  /** Dollars by quarter, newest last: the operator's fee income (the sale price is its last four) and the quarter so far. */
  feeUsdQuarters: number[]
  quarter: { feeUsd: number; paidMinersUsd: number; billsUsd: number; ownBtc: number; operatorBtc: number; blocks: number; operatorUsd?: number }
  /** A PPS crunch card was already raised this quarter. */
  crunchQuarter: number | null
}

/** An own pool's quarter for the report: fee income, what outside miners were paid, bills, the coins, the blocks found. */
export interface PoolReport {
  feeUsd: number
  paidMinersUsd: number
  billsUsd: number
  ownBtc: number
  operatorBtc: number
  blocks: number
  outsideTh: number
  reputation: number
  /** M71.4: the operator's take at each week's price (fees, and under PPS the luck on top), and the payout method; absent in older saves. */
  operatorUsd?: number
  method?: 'PPLNS' | 'PPS'
}

/** The mining club (M70.4, doc 51 v1.2 §4). Absent from a game that never joins it. */
export type ClubMember = 'you' | 'nell' | 'teo' | 'jun'
export const CLUB_FRIENDS: readonly ClubMember[] = ['nell', 'teo', 'jun']
/** What a member holds in the club's custody: cash and coins. */
export interface ClubBalance {
  cash: number
  BTC: number
  LTC: number
  DOGE: number
}
/** A club machine: an ASIC from the group buy, one of Teo's GPUs, or a share of a scrypt box. */
export interface ClubLot {
  id: string
  kind: 'asic' | 'gpu' | 'box'
  model: string
  count: number
  /** The first quarter it earns (the quarter after it arrives). */
  earnsFrom: number
}
/** A club order with a vendor: the group buy's unit or the scrypt-box share; its delivery was rolled when it was placed. */
export interface ClubOrder {
  id: string
  kind: 'group_buy' | 'scrypt_box'
  paidUsd: number
  orderedQuarter: number
  outcome: 'on_time' | 'late' | 'very_late' | 'never'
  deliverQuarter: number | null
  delivered: boolean
}
export interface Club {
  joinedQuarter: number
  /** Shares by value put in (they sum to 1 over the members still in). */
  shares: Record<ClubMember, number>
  members: ClubMember[]
  stakeUsd: number
  keys: 'player' | 'jun'
  hosting: 'your_place' | 'friends_flat'
  hostSiteId: string
  bal: Record<ClubMember, ClubBalance>
  lots: ClubLot[]
  orders: ClubOrder[]
  /** The coin Teo's GPUs mine (the coin selector, as for your own). */
  gpuCoin: 'BTC' | 'LTC' | 'DOGE'
  /** Recorded (a refusal costs one); nothing reads it yet (doc 51 v1.2 gives it no effect). */
  friendship: number
  cloud: { investedUsd: number; sinceQuarter: number } | null
  /** Hosting fees the friends could not pay yet. */
  feeDebtUsd: number
  /** What happens at the handover if the club is still open. */
  ending: 'buy_out' | 'dissolve'
  nextId: number
  /** This quarter's figures for the report. */
  quarter: { outputUsd: number; yourShareUsd: number; hostingUsd: number }
  /** Dollars lost to Jun's keys over the club's life. */
  lostUsd: number
}
/** Setup the player chose for the offer, joined in the Plan phase (P0_JOIN_CLUB carries it; kept for the screen). */
export interface ClubEnded {
  kind: 'buy_out' | 'dissolve'
  quarter: number
  /** What the player paid the friends (buy out) or the whole club was worth when it was split (dissolve). */
  usd: number
  early: boolean
}

export interface PrologueState {
  /** M70.4: the mining club (absent until you join). */
  club?: Club
  /** M70.4: how the club ended, for the chapter report. */
  clubEnded?: ClubEnded
  /** M69.3: your own pool (absent until one is opened). */
  ownPool?: OwnPool
  /** M69.3: an own pool sold or closed: when, for how much, and whether the handover sold it (the chapter report's line). */
  poolEnded?: { name: string; quarter: number; usd: number; kind: 'sold' | 'handover' | 'closed' | 'insolvent'; unpaidUsd?: number }
  /** M68.4: altcoins (absent until a GPU is pointed at one). */
  alts?: AltState
  /** Still living with your parents: household power is free, income comes in, patience counts. */
  livingAtHome: boolean
  /** Household patience, 0–100 (scope §2.3). */
  patience: number
  /** The household made you cut your load back to the threshold until (and including) this quarter. */
  cutLoadUntil: number | null
  /** Patience hit 0: the household's card waits in the Plan phase (move out, or cut the load). */
  householdCard: boolean
  /** Moved back home after moving out (P5.0, P6): the part-time income doesn't come back. */
  movedBack?: boolean
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
