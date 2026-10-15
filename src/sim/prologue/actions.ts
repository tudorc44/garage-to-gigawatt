// The prologue's actions (Alpha 0.3, Act 0). In act 0 every action comes here first: the prologue's
// own, End Plan and card answers are handled here; a few of Act I's (sell or repair machines, the
// keep/sell %, next quarter) fall through to Act I's code; the rest don't exist in the prologue.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type Coin, type GameState } from '../state.ts'
import { book } from '../ledger.ts'
import { addMachines } from '../systems/machines.ts'
import { buyPrice, getModel } from '../systems/market.ts'
import { beginPrologueLive } from './engine.ts'
import { resolvePrologueInterrupt } from './events.ts'
import {
  answerOffer,
  cancelSale,
  moveCoins,
  sellCoins,
  setMinedTo,
  setPool,
} from './custody.ts'
import {
  attendConference,
  backUpWallet,
  buildHomeRig,
  buildSmallUnit,
  buyVanity,
  moveBackHome,
  moveOut,
  onMachineBought,
  takeUsedOffer,
} from './life.ts'
import { placePreorder } from './preorders.ts'
import { cancelAltSale, isAltCoin, sellAlt, setAltHodl, setLotCoin } from './alts.ts'
import type { AltCoin } from './types.ts'
import { joinClub, setEnding, setGpuCoin } from './club.ts'
import { buyColdStorage, buyProtection, closePool, openPool, sellPool, setPoolSettings } from './pool.ts'
import { P, siteCapacityKw, siteLoadKw } from './setup.ts'
import { siteParams } from '../systems/siteSerials.ts'

export type PrologueAction =
  | {
      type: 'P0_BUY'
      model: string
      condition: 'new' | 'used'
      count: number
      siteId: string
    }
  | { type: 'P0_BUILD_HOME_RIG' }
  | { type: 'P0_MOVE_OUT' }
  | { type: 'P0_MOVE_BACK' }
  | { type: 'P0_BUILD_SMALL_UNIT' }
  | { type: 'P0_SET_POOL'; pool: boolean }
  | {
      type: 'P0_MOVE_COINS'
      coin: Coin
      amount: number
      to: 'exchange' | 'wallet'
    }
  | { type: 'P0_MINED_TO'; to: 'wallet' | 'exchange' }
  | { type: 'P0_SELL'; coin: Coin | AltCoin; amount: number }
  | { type: 'P0_CANCEL_SALE'; coin: Coin | AltCoin }
  /** M68.4 (doc 51 v1.0 §5): points a GPU lot at a coin ('BTC' or 'ETH' = its own, 'LTC', 'DOGE'). Free; starts next week. */
  | { type: 'P0_SET_LOT_COIN'; lotId: string; coin: 'BTC' | 'ETH' | AltCoin }
  /** M69.3 (doc 51 v1.1 §3): your own pool. Open it with a payout method and a fee (1 Bandwidth, setup cash); change either later (1 Bandwidth). */
  | { type: 'P0_OPEN_POOL'; method: 'PPLNS' | 'PPS'; feePct: number }
  | { type: 'P0_POOL_SETTINGS'; method: 'PPLNS' | 'PPS'; feePct: number }
  | { type: 'P0_POOL_DDOS_PROTECTION' }
  | { type: 'P0_POOL_COLD_STORAGE' }
  | { type: 'P0_SELL_POOL' }
  | { type: 'P0_CLOSE_POOL' }
  /** M70.4 (doc 51 v1.2 §4): join the mining club in 2013Q1's Plan phase: your stake, who holds the keys, where it runs (1 Bandwidth). */
  | { type: 'P0_JOIN_CLUB'; stake: number; keys: 'player' | 'jun'; hosting: 'your_place' | 'friends_flat' }
  /** The coin the club's GPUs mine; free. */
  | { type: 'P0_CLUB_GPU_COIN'; coin: 'BTC' | 'LTC' | 'DOGE' }
  /** How the club ends at the handover if it is still open; free. */
  | { type: 'P0_CLUB_ENDING'; kind: 'buy_out' | 'dissolve' }
  /** M68.4: the keep share of an altcoin's newly mined coins (1 = keep all), as bitcoin's keep/sell %. */
  | { type: 'P0_SET_ALT_HODL'; coin: AltCoin; hodl: number }
  | { type: 'P0_BACKUP' }
  | { type: 'P0_OFFER'; id: string; accept: boolean }
  | { type: 'P0_PREORDER'; vendor: string }
  | { type: 'P0_CONFERENCE'; id: string }
  | { type: 'P0_USED_OFFER'; siteId: string }
  | { type: 'P0_VANITY'; id: string }

/** Act I actions that work unchanged in the prologue. */
const SHARED = new Set([
  'NEXT_QUARTER',
  'START_PROLOGUE',
  'CONTINUE_TO_ACT_1',
  'SELL_MACHINES',
  'REPAIR_MACHINES',
  'REPAIR_ALL',
  'SET_HODL',
  // M35 (doc 38 §4.1-4.3): rooftop solar, small wind and a home battery at a household site or the garage.
  'ENERGY_BUILD',
  'ENERGY_REPAIR',
])

const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})

/**
 * Runs an action in act 0: a Message if it's refused, undefined if it's done, or 'act1' to let Act
 * I's reducer handle one of the shared actions.
 */
export function runPrologue(
  s: GameState,
  a: { type: string } & Record<string, unknown>,
): Message | undefined | 'act1' {
  if (SHARED.has(a.type)) return 'act1'
  switch (a.type) {
    case 'END_PLAN':
      if (s.phase !== 'plan') return fail('error.wrong_phase')
      beginPrologueLive(s)
      return undefined
    case 'RESOLVE_INTERRUPT':
      if (s.phase !== 'live') return fail('error.wrong_phase')
      return resolvePrologueInterrupt(s, String(a.choice))
  }
  if (!a.type.startsWith('P0_')) return fail('error.not_in_prologue')
  if (s.phase !== 'plan') return fail('error.wrong_phase')
  return runPlanAction(s, a as unknown as PrologueAction)
}

/** Why buying `count` of `model` into `siteId` isn't possible now, or undefined. */
export function p0BuyBlocker(
  s: GameState,
  a: Extract<PrologueAction, { type: 'P0_BUY' }>,
): Message | undefined {
  const model = getModel(a.model)
  if (!model || !CONTENT.prologue.machines.includes(model))
    return fail('error.unknown_model', { model: a.model })
  if (P().not_for_sale.includes(model.id))
    return fail('error.not_for_sale', {
      model: a.model,
      condition: a.condition,
    })
  if (!Number.isInteger(a.count) || a.count < 1) return fail('error.bad_count')
  // M73.1 (doc 51 v1.6 §17): the starter PC can be bought again as a Spare PC: new only, into the home rig, 4 CPU PCs in all
  if (model.id === P().spare_pc.model) {
    // (doc 51 v1.7 §18: on sale in the opening only, 2009Q1 to last_quarter, no tail rule; sold new only)
    if (a.condition === 'used' || CONTENT.quarters[s.quarter] > P().spare_pc.last_quarter)
      return fail('error.not_for_sale', { model: a.model, condition: a.condition })
    const site0 = s.sites.find((x) => x.id === a.siteId)
    if (site0?.tier === 'bedroom') return fail('error.p0_spare_needs_rig')
    const owned = s.machines.filter((l) => l.model === model.id).reduce((n, l) => n + l.count, 0)
    if (owned + a.count > P().spare_pc.cap) return fail('error.p0_spare_cap', { cap: P().spare_pc.cap, owned })
  }
  const unit = buyPrice(model, s.quarter, a.condition)
  if (unit === undefined)
    return fail('error.not_for_sale', {
      model: a.model,
      condition: a.condition,
    })
  const site = s.sites.find((x) => x.id === a.siteId)
  if (!site) return fail('error.unknown_site')
  const freeKw = siteCapacityKw(site) - siteLoadKw(s, site.id)
  const neededKw = model.power_kw * a.count
  if (neededKw > freeKw + 1e-9)
    return fail('error.no_capacity', { ...siteParams(site), freeKw, neededKw })
  const cost = unit * a.count
  if (cost > s.cash)
    return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
  return undefined
}

function runPlanAction(s: GameState, a: PrologueAction): Message | undefined {
  switch (a.type) {
    case 'P0_BUY': {
      const blocked = p0BuyBlocker(s, a)
      if (blocked) return blocked
      const model = getModel(a.model)!
      const cost = buyPrice(model, s.quarter, a.condition)! * a.count
      book(s, 'machines', -cost, { site: a.siteId })
      addMachines(s, a.model, a.condition, a.count, a.siteId)
      onMachineBought(s, a.model)
      logEntry(s, 'log.bought', {
        count: a.count,
        // (M74.1: a bought copy of the starter PC is named "Spare PC (CPU)" in the log)
        model: a.model === P().spare_pc.model && a.condition === 'new' ? 'pc_cpu_spare' : a.model,
        condition: a.condition,
        costUsd: cost,
      })
      return undefined
    }
    case 'P0_BUILD_HOME_RIG':
      return buildHomeRig(s)
    case 'P0_MOVE_OUT':
      return moveOut(s)
    case 'P0_MOVE_BACK':
      return moveBackHome(s)
    case 'P0_BUILD_SMALL_UNIT':
      return buildSmallUnit(s)
    case 'P0_BACKUP':
      return backUpWallet(s)
    case 'P0_CONFERENCE':
      return attendConference(s, a.id)
    case 'P0_USED_OFFER':
      return takeUsedOffer(s, a.siteId)
    case 'P0_VANITY':
      return buyVanity(s, a.id)
    case 'P0_SET_POOL':
      return setPool(s, a.pool)
    case 'P0_MINED_TO':
      setMinedTo(s, a.to)
      return undefined
    case 'P0_MOVE_COINS':
      return moveCoins(s, a.coin, a.amount, a.to)
    case 'P0_SELL':
      return isAltCoin(a.coin) ? sellAlt(s, a.coin, a.amount) : sellCoins(s, a.coin, a.amount)
    case 'P0_CANCEL_SALE':
      if (isAltCoin(a.coin)) cancelAltSale(s, a.coin)
      else cancelSale(s, a.coin)
      return undefined
    case 'P0_SET_LOT_COIN':
      return setLotCoin(s, a.lotId, a.coin)
    case 'P0_SET_ALT_HODL':
      return setAltHodl(s, a.coin, a.hodl)
    case 'P0_OPEN_POOL':
      return openPool(s, a.method, a.feePct)
    case 'P0_POOL_SETTINGS':
      return setPoolSettings(s, a.method, a.feePct)
    case 'P0_POOL_DDOS_PROTECTION':
      return buyProtection(s)
    case 'P0_POOL_COLD_STORAGE':
      return buyColdStorage(s)
    case 'P0_SELL_POOL':
      return sellPool(s)
    case 'P0_CLOSE_POOL':
      return closePool(s)
    case 'P0_JOIN_CLUB':
      return joinClub(s, a.stake, a.keys, a.hosting)
    case 'P0_CLUB_GPU_COIN':
      return setGpuCoin(s, a.coin)
    case 'P0_CLUB_ENDING':
      return setEnding(s, a.kind)
    case 'P0_OFFER':
      return answerOffer(s, a.id, a.accept)
    case 'P0_PREORDER':
      return placePreorder(s, a.vendor)
    default:
      return fail('error.not_in_prologue')
  }
}
