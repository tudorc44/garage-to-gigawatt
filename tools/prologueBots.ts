// Scripted strategies for the prologue (Alpha 0.3 §5). A prologue bot plays Act 0 with its own
// settings (pool, keep/sell %, custody, backup, buying, pre-orders, moving out) and hands over to
// an Act I / II bot after 2016Q4. Like every bot it only sends actions, so it can't break a rule.
import { CONTENT, quarterIndex } from '../src/content/index.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import { altWeek, lotAltChoices, scryptKhs } from '../src/sim/prologue/alts.ts'
import { committedCostsUsd, poolUnlocked } from '../src/sim/prologue/pool.ts'
import { walletCoins } from '../src/sim/prologue/engine.ts'
import { prologueCard } from '../src/sim/prologue/events.ts'
import { sellable } from '../src/sim/prologue/custody.ts'
import { conferenceNow, moveOutBlocker } from '../src/sim/prologue/life.ts'
import { openVendors } from '../src/sim/prologue/preorders.ts'
import {
  P,
  depositUsd,
  poolsOpen,
  rentUsdQ,
  siteCapacityKw,
  siteLoadKw,
} from '../src/sim/prologue/setup.ts'
import type { Strategy } from '../src/sim/replay.ts'
import type { GameState } from '../src/sim/state.ts'
import { buyPrice, marketWeek } from '../src/sim/systems/market.ts'
import { BOTS } from './bots.ts'

export interface PrologueBotSettings {
  /** Join a pool once pools open (2010Q4). */
  pool: boolean
  /** Share of mined coins sold (the keep/sell %), once there's a price. */
  sellPct: number
  /** Where coins live: the wallet, or the exchange (mined coins land there; wallet coins are sent). */
  custody: 'wallet' | 'exchange'
  /** Back up the wallet whenever it isn't. */
  backup: boolean
  /** Buy machines (the best BTC machine per dollar that pays back within `paybackQuarters`). */
  buy: boolean
  paybackQuarters: number
  /** Cash kept back when buying. */
  reserveUsd: number
  /** Pre-order from this vendor when its window opens (null: never). */
  preorder: string | null
  /** Go to a conference when there's one this quarter. */
  conference: boolean
  /** Move out in this quarter (or later, once affordable); null: stay at home until the handover. */
  moveOutFrom: string | null
  /**
   * M72.4 (doc 51 v1.5 §16 decision 2): move out only when cash covers the deposit and this many quarters of committed costs (rent,
   * power, the pool's bills). Absent for every earlier bot (opt-out invariance); the pps-operator carries it.
   */
  moveOutCashQuarters?: number
  /**
   * M73.2 (doc 51 v1.6 §17): in 2009Q1 build the home rig and buy this many Spare PCs (CPU) into it. Absent for every earlier bot
   * (opt-out invariance); the cpu-farmer carries it.
   */
  sparePcs?: number
  /** Answer to the Mt Gox collapse card. */
  goxAnswer: 'withdraw' | 'accept'
  /** Stop at every quarter report (a Plan phase every quarter). */
  stopEvery: boolean
  /**
   * M68.6 (doc 51 v1.0 §6): chase scrypt coins. From 2013Q2 every GPU lot mines Litecoin, then each quarter the scrypt coin
   * that pays most per kH/s; at the 2014Q3 card it sells every GPU. Absent for every earlier bot (opt-out invariance).
   */
  scrypt?: boolean
  /**
   * M69.6 (doc 51 v1.1 §6): run your own pool. Opens in the first Plan phase it can (2011Q2 on, when it has a home rig and the
   * cash), with this payout method and fee, and buys cold storage if asked. An open pool is sold at the handover. Absent for
   * every earlier bot (opt-out invariance).
   */
  ownPool?: { method: 'PPLNS' | 'PPS'; feePct: number; coldStorage: boolean }
  /**
   * M70.6 (doc 51 v1.2 §4): join the mining club in 2013Q1's Plan phase with this stake, keys and hosting, and buy the club out at
   * the handover. `traps`: take the scrypt-box and cloud-contract offers (the trusting player) instead of passing. Absent for every
   * earlier bot (opt-out invariance).
   */
  club?: { stake: number; keys: 'player' | 'jun'; hosting: 'your_place' | 'friends_flat'; traps: boolean }
}

const label = (q: number) => CONTENT.quarters[q] ?? ''

/** A BTC machine's earnings per unit over a quarter at this week's network and price (in a pool). */
function quarterUsd(s: GameState, hashrateTh: number): number {
  const w = marketWeek(s.quarter, 0)
  const perBlock = w.btc_block_subsidy / Math.max(0.01, 1 - w.btc_fee_share)
  const netTh = w.btc_hashrate_EHs * 1e6
  return (
    (hashrateTh / (hashrateTh + netTh)) *
    P().blocks_per_week *
    perBlock *
    w.btc_usd *
    13
  )
}

/** The machines to buy now: the best BTC model per dollar that pays back in time, into free room. */
function buys(s: GameState, set: PrologueBotSettings): Action[] {
  const out: Action[] = []
  let cash = s.cash - set.reserveUsd
  const models = CONTENT.prologue.machines
    .filter((m) => m.coin === 'BTC' && !P().not_for_sale.includes(m.id) && m.id !== P().spare_pc.model) // (the Spare PC is a hobby buy: no earlier bot takes it)
    .map((m) => ({ m, price: buyPrice(m, s.quarter, 'new') }))
    .filter(
      (x): x is { m: (typeof x)['m']; price: number } =>
        x.price !== undefined && x.price > 0,
    )
    .filter(
      (x) => quarterUsd(s, x.m.hashrate) * set.paybackQuarters >= x.price,
    )
    .sort((a, b) => b.m.hashrate / b.price - a.m.hashrate / a.price)
  const best = models[0]
  if (!best) return out
  for (const site of s.sites) {
    if (site.readyQuarter > s.quarter) continue
    const free = siteCapacityKw(site) - siteLoadKw(s, site.id)
    const count = Math.min(
      Math.floor((free + 1e-9) / best.m.power_kw),
      Math.floor(cash / best.price),
    )
    if (count < 1) continue
    out.push({
      type: 'P0_BUY',
      model: best.m.id,
      condition: 'new',
      count,
      siteId: site.id,
    })
    cash -= count * best.price
  }
  return out
}

/**
 * The scrypt switcher's coin choices (M68.6): from 2013Q2 each GPU lot points at the open scrypt coin that pays most per kH/s
 * this quarter's first week (Litecoin also earns Dogecoin once merged mining starts). Nothing before 2013Q2.
 */
function scryptMoves(s: GameState): Action[] {
  if (label(s.quarter) < '2013Q2') return []
  const row = altWeek(s.quarter, 0)
  if (!row) return []
  const pays = (c: 'LTC' | 'DOGE') =>
    c === 'LTC'
      ? (row.ltc_rev_usd_khs_day ?? 0) + (row.doge_merged_mining === true ? (row.doge_rev_usd_khs_day ?? 0) : 0)
      : (row.doge_rev_usd_khs_day ?? 0)
  const out: Action[] = []
  for (const lot of s.machines) {
    const open = lotAltChoices(s, lot)
    if (open.length === 0) continue
    const best = [...open].sort((a, b) => pays(b) - pays(a))[0]
    if (lot.altCoin !== best) out.push({ type: 'P0_SET_LOT_COIN', lotId: lot.id, coin: best })
  }
  return out
}

/** The pool operator's moves (M69.6): open as soon as it can, then cold storage. (Each is sent only if the sim would accept it.) */
function poolMoves(s: GameState, pool: NonNullable<PrologueBotSettings['ownPool']>): Action[] {
  const out: Action[] = []
  if (!s.prologue!.ownPool && !s.prologue!.poolEnded && poolUnlocked(s)) out.push({ type: 'P0_OPEN_POOL', method: pool.method, feePct: pool.feePct })
  const t = apply(s, out)
  if (t.prologue!.ownPool && pool.coldStorage && !t.prologue!.ownPool.coldStorage) out.push({ type: 'P0_POOL_COLD_STORAGE' })
  return out
}

/** The club bot's moves (M70.6): join in 2013Q1, and ask to buy the friends out at the handover. (Refused ones are skipped.) */
function clubMoves(s: GameState, club: NonNullable<PrologueBotSettings['club']>): Action[] {
  const out: Action[] = []
  const p = s.prologue!
  if (!p.club && !p.clubEnded && label(s.quarter) === '2013Q1')
    out.push({ type: 'P0_JOIN_CLUB', stake: club.stake, keys: club.keys, hosting: club.hosting })
  if (p.club && p.club.ending !== 'buy_out') out.push({ type: 'P0_CLUB_ENDING', kind: 'buy_out' })
  return out
}

/** Can the bot move out now by its own cash rule (M72.4): the deposit plus `moveOutCashQuarters` quarters of the costs it would carry. */
function movesOutNow(s: GameState, set: PrologueBotSettings, cash: number): boolean {
  if (set.moveOutFrom === null || label(s.quarter) < set.moveOutFrom) return false
  if (set.moveOutCashQuarters === undefined) return true
  const rent = s.prologue!.livingAtHome ? rentUsdQ(s.quarter) : 0 // (committedCostsUsd counts rent only once moved out)
  return cash >= depositUsd(s.quarter) + set.moveOutCashQuarters * (committedCostsUsd(s) + rent)
}

/** The cpu-farmer's opening (M73.2): the home rig and the spare PCs in 2009Q1, sent only if the sim accepts them. */
function sparePcMoves(s: GameState, set: PrologueBotSettings): Action[] {
  if (!set.sparePcs || label(s.quarter) !== '2009Q1') return []
  const out: Action[] = []
  if (!s.sites.some((x) => x.tier === 'home_rig')) out.push({ type: 'P0_BUILD_HOME_RIG' })
  const t = apply(s, out)
  const rig = t.sites.find((x) => x.tier === 'home_rig')
  if (rig) out.push({ type: 'P0_BUY', model: P().spare_pc.model, condition: 'new', count: set.sparePcs, siteId: rig.id })
  return out
}

/** The state after these actions (refused ones skipped). */
function apply(s: GameState, actions: Action[]): GameState {
  let t = s
  for (const a of actions) {
    const r = applyAction(t, a)
    if (r.ok) t = r.state
  }
  return t
}

/** Sells BTC machines far less efficient (hash per kW) than the best one on sale, to make room. */
function obsolete(s: GameState, keepScryptGpus = false): Action[] {
  const efficiency = (id: string) => {
    const m = CONTENT.prologue.machines.find((x) => x.id === id)
    return m && m.coin === 'BTC' ? m.hashrate / m.power_kw : null
  }
  const onSale = CONTENT.prologue.machines.filter(
    (m) =>
      m.coin === 'BTC' &&
      !P().not_for_sale.includes(m.id) &&
      m.id !== P().spare_pc.model &&
      buyPrice(m, s.quarter, 'new') !== undefined,
  )
  const best = Math.max(0, ...onSale.map((m) => m.hashrate / m.power_kw))
  return s.machines
    .filter((l) => {
      if (keepScryptGpus && scryptKhs(l.model) > 0) return false
      const e = efficiency(l.model)
      return e !== null && e < 0.25 * best
    })
    .map((l) => ({ type: 'SELL_MACHINES', lotId: l.id, count: l.count }))
}

/** The prologue's Plan-phase actions for a bot with these settings. */
export function prologuePlan(s: GameState, set: PrologueBotSettings): Action[] {
  const p = s.prologue!
  const q = label(s.quarter)
  const out: Action[] = []
  // The backup's Bandwidth is kept back for last (it goes after the buys, which would lapse it).
  let bw =
    s.bandwidth -
    (set.backup && !p.backup ? P().wallet_loss.backup_bandwidth : 0)
  let cash = s.cash
  if (
    set.moveOutFrom !== null &&
    q >= set.moveOutFrom &&
    bw >= P().bandwidth_costs.build &&
    !moveOutBlocker(s) &&
    movesOutNow(s, set, cash)
  ) {
    out.push({ type: 'P0_MOVE_OUT' })
    cash -= depositUsd(s.quarter)
    bw -= P().bandwidth_costs.build
  }
  // Once out of the house: sell enough coins to pay the rent until the next Plan phase, and one more.
  const w = marketWeek(s.quarter, 0)
  const next =
    P().decision_quarters.map(quarterIndex).find((d) => d! > s.quarter) ??
    CONTENT.acts.find((a) => a.act === 0)!.lastQuarter
  const floor = (next! - s.quarter + 1) * rentUsdQ(s.quarter)
  if (!p.livingAtHome || out.some((a) => a.type === 'P0_MOVE_OUT'))
    if (cash < floor && w.btc_usd > 0 && bw >= P().bandwidth_costs.sell) {
      const want = ((floor - cash) / w.btc_usd) * 1.3
      const amount = Math.min(want, sellable(s, 'BTC'))
      if (amount > 1e-9) {
        out.push({ type: 'P0_SELL', coin: 'BTC', amount })
        bw -= P().bandwidth_costs.sell
      }
    }
  const keep = 1 - set.sellPct
  if (s.hodlPct.BTC !== keep) out.push({ type: 'SET_HODL', pct: keep })
  if (set.pool && !p.pool && poolsOpen(s.quarter))
    out.push({ type: 'P0_SET_POOL', pool: true })
  if (p.minedTo !== set.custody)
    out.push({ type: 'P0_MINED_TO', to: set.custody })
  if (set.custody === 'exchange')
    for (const coin of ['BTC', 'ETH'] as const) {
      const n = walletCoins(s, coin) - p.moves
        .filter((m) => m.coin === coin && m.to === 'exchange')
        .reduce((a, m) => a + m.amount, 0)
      if (n > 1e-9)
        out.push({ type: 'P0_MOVE_COINS', coin, amount: n, to: 'exchange' })
    }
  if (set.conference && conferenceNow(s) && cash > conferenceNow(s)!.cost_usd) {
    out.push({ type: 'P0_CONFERENCE', id: conferenceNow(s)!.id })
    cash -= conferenceNow(s)!.cost_usd
  }
  if (
    set.preorder &&
    !p.preorders.some((o) => o.vendor === set.preorder) &&
    openVendors(s).some((v) => v.id === set.preorder)
  ) {
    const price = openVendors(s).find((v) => v.id === set.preorder)!.price_usd
    if (cash >= price) {
      out.push({ type: 'P0_PREORDER', vendor: set.preorder })
      cash -= price
    }
  }
  if (set.buy) {
    const home = P().site_tiers.find((t) => t.id === 'home_rig')!
    const moving = out.some((a) => a.type === 'P0_MOVE_OUT')
    if (
      p.livingAtHome &&
      !moving &&
      !s.sites.some((x) => x.tier === 'home_rig') &&
      cash >= home.capex_usd + set.reserveUsd &&
      bw >= 1 &&
      label(s.quarter) >= '2010Q3'
    )
      out.push({ type: 'P0_BUILD_HOME_RIG' })
  }
  return out
}

/** A normal player: pools from 2010Q4, buys machines that pay back within a year, moves out in 2014. */
const NORMAL: PrologueBotSettings = {
  pool: true,
  sellPct: 0,
  custody: 'wallet',
  backup: true,
  buy: true,
  paybackQuarters: 4,
  reserveUsd: 200,
  preorder: null,
  conference: false,
  moveOutFrom: '2014Q1',
  goxAnswer: 'accept',
  stopEvery: false,
}

/** The scope's §5 prologue bots (each hands over to `shell-climb` for Act I and II). */
export const PROLOGUE_SETTINGS: Record<string, PrologueBotSettings> = {
  /** Pool from 2010Q4, sells 100% of what it mines (mined coins go to the exchange). */
  'sell-as-mined': { ...NORMAL, sellPct: 1, custody: 'exchange' },
  /** Keeps every coin, on the exchange. */
  'gox-hodler': { ...NORMAL, custody: 'exchange' },
  /** Keeps every coin in its own wallet, backed up; mines from 2009. */
  'careful-hodler': { ...NORMAL },
  /** M73.2 (doc 51 v1.6 §17): the careful hodler that builds the home rig and buys 3 Spare PCs in 2009Q1 (4 CPU PCs in all). */
  'cpu-farmer': { ...NORMAL, sparePcs: 3 },
  /** Keeps every coin in its own wallet and never backs it up. */
  'no-backup': { ...NORMAL, backup: false },
  /** A careful hodler that pre-orders an ASIC (Summit Silicon, 2012Q4) and goes to a conference. */
  'preorder-summit': {
    ...NORMAL,
    preorder: 'preorder_summit_silicon',
    conference: true,
  },
  /** A careful hodler in the group buy (2013Q1). */
  'preorder-group': { ...NORMAL, preorder: 'group_buy' },
  /** M69.1 (doc 51 v1.1 §12 item 1): the sell-as-mined bot with the altcoins, for the paired X-B7 check. */
  'sell-as-mined-scrypt': { ...NORMAL, sellPct: 1, custody: 'exchange', scrypt: true },
  /**
   * M69.6 (doc 51 v1.1 §6, X-B2, X-B3, X-B7): the sell-as-mined bot with its own pool: opens in 2011Q2 at 1% PPLNS, cold storage,
   * sold at the handover. (The ratio X-B2 asks for is against the sell-as-mined bot, so this bot sells as it mines too: mine, reversible.)
   */
  'pool-operator': { ...NORMAL, sellPct: 1, custody: 'exchange', ownPool: { method: 'PPLNS', feePct: 0.01, coldStorage: true } },
  /** M69.6 (X-B8): the pool operator that also chases scrypt, for the pacing numbers of a bot using the features there are. */
  'pool-and-scrypt': { ...NORMAL, sellPct: 1, custody: 'exchange', scrypt: true, ownPool: { method: 'PPLNS', feePct: 0.01, coldStorage: true } },
  /** M69.6 (X-B3): the same with PPS at a 2% fee and no cold storage: the risky pool. */
  'pps-operator': { ...NORMAL, sellPct: 1, custody: 'exchange', moveOutCashQuarters: 4, ownPool: { method: 'PPS', feePct: 0.02, coldStorage: false } },
  /** M70.6 (X-B5): the sell-as-mined bot alone in the group buy (2013Q1), the club bot's solo comparison. */
  'group-solo': { ...NORMAL, sellPct: 1, custody: 'exchange', preorder: 'group_buy' },
  /** M70.6 (X-B5, X-B7): the sell-as-mined bot in the club with $2,000, its own keys, in your place; passes both traps, buys the friends out. */
  'club-bot': { ...NORMAL, sellPct: 1, custody: 'exchange', club: { stake: 2000, keys: 'player', hosting: 'your_place', traps: false } },
  /** M70.6: the trusting player: Jun holds the keys, both traps taken (the scrypt box and the cloud contract). */
  'club-trusting': { ...NORMAL, sellPct: 1, custody: 'exchange', club: { stake: 2000, keys: 'jun', hosting: 'your_place', traps: true } },
  /** M70.6 (X-B8): a bot using all three features (altcoins, own pool, club), for the pacing numbers. */
  'club-all': {
    ...NORMAL,
    sellPct: 1,
    custody: 'exchange',
    scrypt: true,
    ownPool: { method: 'PPLNS', feePct: 0.01, coldStorage: true },
    club: { stake: 2000, keys: 'player', hosting: 'your_place', traps: false },
  },
  /** M68.6 (doc 51 v1.0 §6): a careful hodler that chases scrypt coins with its GPUs from 2013Q2 and sells them at the 2014Q3 card. */
  'scrypt-switcher': { ...NORMAL, scrypt: true },
}

export const PROLOGUE_BOTS: Record<string, Strategy> = Object.fromEntries(
  Object.entries(PROLOGUE_SETTINGS).map(([k, v]) => [k, prologueBot(v)]),
)

/**
 * A prologue bot: `set` in the prologue; after the handover, `after` (an Act I / II bot). Machines
 * are bought last, on the state the other actions left (the reducer checks cash and room).
 */
export function prologueBot(
  set: PrologueBotSettings,
  after: Strategy = BOTS['shell-climb'],
): Strategy {
  return {
    plan(s) {
      if (s.act !== 0) return after.plan(s)
      const actions = prologuePlan(s, set)
      if (set.sparePcs) actions.push(...sparePcMoves(apply(s, actions), set))
      if (set.buy) {
        // (the scrypt switcher keeps its GPUs: they are what it mines scrypt with)
        actions.push(...obsolete(s, set.scrypt === true))
        // Buy on the state the other actions leave (cash spent, a new site built).
        actions.push(...buys(apply(s, actions), set))
      }
      if (set.scrypt) actions.push(...scryptMoves(apply(s, actions)))
      if (set.ownPool) actions.push(...poolMoves(apply(s, actions), set.ownPool))
      if (set.club) actions.push(...clubMoves(apply(s, actions), set.club))
      // The backup last: a new PC-class machine would lapse it.
      const t = apply(s, actions)
      if (
        set.backup &&
        !t.prologue!.backup &&
        t.bandwidth >= P().wallet_loss.backup_bandwidth
      )
        actions.push({ type: 'P0_BACKUP' })
      return actions
    },
    answer(s) {
      if (s.act !== 0) return after.answer?.(s)
      const card = prologueCard(s.interrupt?.event ?? '')
      if (card?.id === 'mtgox_collapse') return set.goxAnswer
      if (card?.id === 'scrypt_boxes_ship' && set.scrypt) return 'sell_gpus'
      if (set.club) {
        if (card?.id === 'club_scrypt_box') return set.club.traps ? 'buy' : 'pass'
        if (card?.id === 'club_cloud_contract') return set.club.traps ? 'invest' : 'pass'
        if (card?.id === 'club_power_bill') return 'split'
        if (card?.id === 'club_peak_cashout') return 'wait'
        if (card?.id === 'club_gpu_flip') return 'keep'
        if (card?.id === 'club_breakup') return 'buy_out'
      }
      // The household's card: move out once the bot's moving-out quarter has come.
      if (card?.id === 'household')
        return set.moveOutFrom !== null &&
          label(s.quarter) >= set.moveOutFrom &&
          s.cash >= depositUsd(s.quarter) &&
          movesOutNow(s, set, s.cash)
          ? 'move_out'
          : 'cut_load'
      return undefined
    },
    merge: (s) => after.merge?.(s),
    lifeline: (s) => after.lifeline?.(s),
    stopHere: () => set.stopEvery,
  }
}
