// The Act III move log (M14.2; doc 27 D14, the design thread's M14 spec). Each player action that applies in
// Act III and is a "big move" adds one entry { q, kind }: q is the Act III quarter index (0–15), kind says
// what it was; MOVE_SIGN says whether it is offensive (+1: build, borrow, buy, lock long) or defensive (−1:
// sell, repay, raise cash, shorten). NOT hidden: it knows nothing about the scenario. The reading score
// (readingScore.ts, hidden) reads the log at the end of the act.
//
// Not logged (neutral or forced; the spec): renewal accept / counter / re-let, reads, idling, hires,
// keeping MW empty, GPU contracts under 2 years, the rescue sale, emergency equity, the automatic re-let,
// defaults applied by the engine, and anything outside Act III.
import { actFirstQuarter } from '../../content/index.ts'
import type { Action } from '../actions.ts'
import {
  inActIII,
  type Act3MoveKind,
  type GameState,
  type Project,
} from '../state.ts'
import { getCard } from './events.ts'
import { getModel } from './market.ts'

export const ACT3_MOVE_KINDS: readonly Act3MoveKind[] = [
  'project_commit',
  'debt_draw',
  'site_buy',
  'gpu_buy',
  'blend_extend',
  'gpu_contract_long',
  'card_lengthen',
  'distressed_buy',
  'sale_voluntary',
  'debt_repay',
  'card_shorten',
  'equity_raise',
  'asic_buy',
  'retrofit',
  'power_lock',
  'hedge',
  'project_delay',
  'project_accelerate',
  'cash_reserve',
]

/** +1 offensive, −1 defensive. */
export const MOVE_SIGN: Record<Act3MoveKind, 1 | -1> = {
  project_commit: 1,
  debt_draw: 1,
  site_buy: 1,
  gpu_buy: 1,
  blend_extend: 1,
  gpu_contract_long: 1,
  card_lengthen: 1,
  distressed_buy: 1,
  sale_voluntary: -1,
  debt_repay: -1,
  card_shorten: -1,
  equity_raise: -1,
  // M15.0 (DT): ASIC buys, retrofits and long power locks build; a backstop hedges.
  asic_buy: 1,
  retrofit: 1,
  power_lock: 1,
  hedge: -1,
  // M16.0 (DT): slipping a build defends, speeding one up builds; a revolver drawn as insurance defends.
  project_delay: -1,
  project_accelerate: 1,
  cash_reserve: -1,
}

/** A GPU contract this long or longer is a big move (DT: 2 years). */
const LONG_GPU_CONTRACT_QUARTERS = 8

/** The kind one authored card effect counts as, or null (no sign). */
function cardEffectKind(
  key: string,
  value: unknown,
  distressed: boolean,
): Act3MoveKind | null {
  const n = typeof value === 'number' ? value : Number(value)
  switch (key) {
    case 'term_years':
      return n > 0 ? 'card_lengthen' : n < 0 ? 'card_shorten' : null
    case 'term_add_years':
      return n > 0 ? 'card_lengthen' : null
    case 'term':
      return value === '1yr' || value === 'spot' ? 'card_shorten' : null
    case 'cash':
      // "+ev_stabilized*0.8": the sale of a stabilised site (with mw "-X").
      return /ev_stabilized/.test(String(value)) ? 'sale_voluntary' : null
    case 'gpu_resale_mult':
      return 'sale_voluntary'
    case 'debt_reduce':
      return 'debt_repay'
    case 'debt':
      return 'debt_draw'
    case 'gpu_rack':
      return 'gpu_buy'
    case 'capex_mw':
      return 'project_commit'
    case 'retrofit':
      return 'retrofit'
    case 'delay_quarters':
      // M16.0: a positive delay slips a build, a negative one speeds it up.
      return n > 0 ? 'project_delay' : n < 0 ? 'project_accelerate' : null
    case 'power_option':
      // A nuclear or fixed PPA signed: locking power long.
      return /ppa/i.test(String(value)) ? 'power_lock' : null
    case 'mw':
      // Buying MW (a number); "-X" goes with the sale above.
      return Number.isFinite(n) && n > 0
        ? distressed
          ? 'distressed_buy'
          : 'site_buy'
        : null
    default:
      return null
  }
}

/**
 * A card choice's move (M14.2 rule 3): the sign of the sum of its effects' signs (zero: none); the kind of
 * the first effect with that sign (the dominant one; a tie goes to the first in the choice's list).
 */
export function cardChoiceMove(
  effect: Record<string, unknown>,
  distressed = false,
  cashReserve = false,
): Act3MoveKind | null {
  // M16.0 (DT): debt drawn only to hold the same cash (a revolver "as insurance") defends.
  if (cashReserve) return 'cash_reserve'
  const kinds = Object.entries(effect).map(([k, v]) =>
    cardEffectKind(k, v, distressed),
  )
  const sum = kinds.reduce((s, k) => s + (k ? MOVE_SIGN[k] : 0), 0)
  if (sum === 0) return null
  const sign = Math.sign(sum)
  return kinds.find((k) => k !== null && MOVE_SIGN[k] === sign) ?? null
}

/** A tenant signed on a project by this action (none before, one after): a lease or a GPU contract. */
function newSigning(
  before: GameState,
  after: GameState,
): Project | undefined {
  return after.projects.find((p) => {
    const was = before.projects.find((x) => x.id === p.id)
    return p.tenant && was && !was.tenant
  })
}

/** What a player action that applied counts as in the move log, or null. */
export function moveOf(
  before: GameState,
  after: GameState,
  a: Action,
): Act3MoveKind | null {
  switch (a.type) {
    case 'PROJECT_START':
      return 'project_commit'
    case 'PROJECT_SIGN_TENANT':
    case 'DEAL_ACCEPT':
    case 'DEAL_COUNTER': {
      // A tenant negotiation that ends in a signing counts like signing; a renewal counter is neutral.
      if (a.type !== 'PROJECT_SIGN_TENANT' && before.dealNegotiation?.side !== 'tenant')
        return null
      const p = newSigning(before, after)
      if (!p) return null
      const gpu = p.tenant!.gpu
      if (!gpu) return 'project_commit'
      return gpu.termQuarters >= LONG_GPU_CONTRACT_QUARTERS
        ? 'gpu_contract_long'
        : null
    }
    case 'TAKE_LOAN':
    case 'TAKE_CRYPTO_LOAN':
      return 'debt_draw'
    case 'BUILD_SITE':
    case 'BUILD_PHASE':
      return 'site_buy'
    case 'BUY_MACHINES':
      return getModel(a.model)?.coin === 'ETH' ? 'gpu_buy' : 'asic_buy'
    case 'BID_AUCTION':
      // A won auction (it settles at once); placing a bid that loses logs nothing.
      return after.log.length > before.log.length &&
        after.log.slice(before.log.length).some((e) => e.key === 'log.auction_won')
        ? 'site_buy'
        : null
    case 'SELL_TREASURY':
      return 'sale_voluntary'
    case 'PROJECT_BACKSTOP':
      return 'hedge'
    case 'BLEND_ACCEPT':
      return 'blend_extend'
    case 'PROJECT_SELL':
    case 'PROJECT_SELL_GPUS':
      return 'sale_voluntary'
    case 'SELL_MACHINES':
      // GPU rigs or ASICs (A1): a sale raises cash.
      return 'sale_voluntary'
    case 'REPAY_LOAN':
    case 'REPAY_CRYPTO_LOAN':
    case 'REPAY_CONSTRUCTION_LOAN':
    case 'REPAY_BRIDGE_LOAN':
      return 'debt_repay'
    case 'RAISE_EQUITY':
    case 'RAISE':
    case 'PITCH_ACCEPT':
    case 'PITCH_COUNTER':
      // A raise the player chose (a pitch counter may close the round): the stake went down.
      return after.founderStake < before.founderStake ? 'equity_raise' : null
    case 'RESOLVE_INTERRUPT': {
      const active = before.interrupt
      if (active?.id !== 'event') return null
      const card = getCard(active.event ?? '')
      if (card?.act !== 3) return null
      const choice = card.choices.find((c) => c.id === a.choice) as
        | {
            act3Effect?: Record<string, unknown>
            act3Distressed?: boolean
            act3CashReserve?: boolean
          }
        | undefined
      return choice?.act3Effect
        ? cardChoiceMove(
            choice.act3Effect,
            !!choice.act3Distressed,
            !!choice.act3CashReserve,
          )
        : null
    }
    default:
      return null
  }
}

/** Called once an action has applied: in Act III, a big move adds its entry. */
export function recordAct3Move(
  before: GameState,
  after: GameState,
  a: Action,
): void {
  if (!inActIII(before) || !before.scenarioId) return
  const kind = moveOf(before, after, a)
  if (!kind) return
  ;(after.act3Moves ??= []).push({
    q: before.quarter - actFirstQuarter(3),
    kind,
  })
}
