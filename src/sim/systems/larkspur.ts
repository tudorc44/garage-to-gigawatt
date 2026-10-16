// Larkspur Silicon (M78.1; doc 58 v1.1 §2): an invented start-up that raises $20M to build an Ethereum ASIC. Offered by a
// headline in 2020Q2 and joined from the Ventures screen in 2020Q2-Q4. Its own fate is one set of draws per game, replayed from
// the seed whether or not you join (`substream(seed, "larkspur:slip")` and `"larkspur:outcome"`): a slip of 0, 1 or 2 quarters
// that shifts tape-out, first units and volume, and an outcome at tape-out (ships, cancelled, acquired). Nothing here runs, and
// no state is written, in a game that never touches it, so every golden stays byte-identical.
//
// Your roles: a stake (10, 20 or 30% of the pitched budget) paid in thirds (the buy-in, a call at tape-out and a call at first
// units: pay, dilute (the stake halves) or walk); at the tape-out call a 20%+ backer picks LK-5 or LK-6; an allocation
// reservation (up to 10 units per 10% of stake, a 10% deposit, 10% off, the first two quarters of volume); the stake's value
// (at cost until volume, then your share of the units shipped x margin, a tenth of that after the Merge) resolves into cash at
// Act I's end. Everyone else buys the machine at full price from the quarter after the reserved blocks ship.
// HIDDEN: the draws. Views show only what has happened.
import { CONTENT, actLastQuarter, type Machine } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { book, roundCash } from '../ledger.ts'
import { random, substream } from '../rng.ts'
import { logEntry, roundCents, type GameState, type Larkspur } from '../state.ts'
import { underMoratorium } from './heat.ts'
import { addMachines } from './machines.ts'
import { siteParams } from './siteSerials.ts'
import { capacityKw, usedKw } from './sites.ts'

const L = () => CONTENT.larkspur!
const qIndex = (label: string): number => CONTENT.quarters.indexOf(label)

export type LarkspurOutcome = 'ships' | 'cancelled' | 'acquired'

export interface LarkspurDraws {
  slip: number
  tape: number
  first: number
  volume: number
  outcome: LarkspurOutcome
}

/** The start-up's fate for this game (quarter indexes absolute). Hidden: no screen reads `outcome` before it is revealed. */
export function larkspurDraws(state: Pick<GameState, 'seed'>): LarkspurDraws {
  const f = L()
  let u = random(substream(state.seed, 'larkspur:slip'))
  let slip = 0
  for (const k of Object.keys(f.slip.quarters).sort()) {
    u -= f.slip.quarters[k]
    if (u < 0) {
      slip = Number(k)
      break
    }
  }
  const o = f.outcome.odds
  const v = random(substream(state.seed, 'larkspur:outcome'))
  const outcome: LarkspurOutcome = v < o.ships ? 'ships' : v < o.ships + o.cancelled ? 'cancelled' : 'acquired'
  return {
    slip,
    tape: qIndex(f.milestones.tape_out) + slip,
    first: qIndex(f.milestones.first_units) + slip,
    volume: qIndex(f.milestones.volume) + slip,
    outcome,
  }
}

/** Whether the feature's files are in the build. */
export const larkspurAvailable = (): boolean => CONTENT.larkspur !== undefined

export const larkspurThirdUsd = (stake: number): number => roundCents((stake * L().offer.budget_usd) / 3)

/** The model the world's machine is: the backer's pick at the tape-out call (LK-5 when none was made). */
export const larkspurModelId = (state: GameState): 'lk5' | 'lk6' => state.larkspur?.memory ?? L().memory.default

export function lkModel(id: string): Machine | undefined {
  return CONTENT.larkspur?.models.find((m) => m.id === id)
}

/** An LK unit's list price in a quarter (the model's latest listed price at or before it). */
export function lkPriceUsd(modelId: string, quarter: number): number {
  const curve = lkModel(modelId)!.price_new
  const keys = Object.keys(curve).sort()
  const label = CONTENT.quarters[quarter]
  const at = keys.filter((k) => k <= label).at(-1) ?? keys[0]
  return curve[at]
}

// ---------- the offer and your roles ----------

/** Whether the offer can be joined now: Act I, 2020Q2-Q4, before you have. */
export function larkspurOpen(state: GameState): boolean {
  if (!larkspurAvailable() || state.act !== 1) return false
  return state.quarter >= qIndex(L().offer.join_from) && state.quarter <= qIndex(L().offer.join_to) && !state.larkspur
}

export function larkspurJoinBlocker(state: GameState, stake: number): Message | undefined {
  if (!larkspurOpen(state)) return { key: 'error.larkspur_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!L().offer.stakes.includes(stake)) return { key: 'error.bad_choice' }
  const cost = larkspurThirdUsd(stake)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

export function joinLarkspur(state: GameState, stake: number): void {
  const usd = larkspurThirdUsd(stake)
  state.larkspur = {
    stake,
    stakeAtJoin: stake,
    paidUsd: usd,
    joinedQuarter: state.quarter,
    call: null,
    answered: [],
  }
  book(state, 'venture_calls', -usd, { venture: 'larkspur' })
  roundCash(state)
  logEntry(state, 'log.larkspur.joined', { costUsd: usd, pct: Math.round(stake * 100) })
}

/** The memory choice is the backer's with a big enough stake; otherwise the founders pick the cheaper bet. */
export const larkspurCanPickMemory = (l: Larkspur): boolean => l.stake >= L().memory.lk6_min_stake

export function larkspurCallBlocker(state: GameState, choice: string, memory?: string): Message | undefined {
  const c = state.larkspur?.call
  if (!c) return { key: 'error.bad_choice' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (choice !== 'pay' && choice !== 'dilute' && choice !== 'walk') return { key: 'error.bad_choice' }
  if (memory !== undefined && memory !== 'lk5' && memory !== 'lk6') return { key: 'error.bad_choice' }
  if (choice === 'pay' && state.cash < c.dueUsd) return { key: 'error.no_cash', params: { costUsd: c.dueUsd, cashUsd: state.cash } }
}

export function answerLarkspurCall(state: GameState, choice: 'pay' | 'dilute' | 'walk', memory?: 'lk5' | 'lk6'): void {
  const l = state.larkspur!
  const c = l.call!
  if (c.kind === 'tape_out')
    l.memory = memory === 'lk6' && larkspurCanPickMemory(l) ? 'lk6' : L().memory.default
  if (choice === 'pay') {
    book(state, 'venture_calls', -c.dueUsd, { venture: 'larkspur' })
    roundCash(state)
    l.paidUsd = roundCents(l.paidUsd + c.dueUsd)
  } else if (choice === 'dilute') {
    l.stake = l.stake * L().offer.dilute_mult
  } else {
    l.stake = 0
    l.walked = true
  }
  l.answered.push(c.kind)
  logEntry(state, 'log.larkspur.call_answered', { ventureChoice: choice, costUsd: choice === 'pay' ? c.dueUsd : 0 })
  l.call = null
}

/** An unanswered call takes its default at the end of the Plan: dilute (and the founders' memory, LK-5). */
export function settleLarkspur(state: GameState): void {
  if (state.larkspur?.call) answerLarkspurCall(state, 'dilute')
}

// ---------- the allocation reservation ----------

/** The reservation window: after the tape-out call, until volume. */
function reservingQuarter(state: GameState): boolean {
  const d = larkspurDraws(state)
  return state.quarter >= d.tape && state.quarter < d.volume
}

export const larkspurMaxReserveUnits = (stake: number): number =>
  Math.floor(Math.round((stake / 0.1) * 1e6) / 1e6) * L().reservation.units_per_10pct

export const larkspurDiscountedUsd = (modelId: string, quarter: number): number =>
  roundCents(lkPriceUsd(modelId, quarter) * (1 - L().reservation.discount))

export function larkspurDepositUsd(state: GameState, units: number): number {
  return roundCents(units * larkspurDiscountedUsd(larkspurModelId(state), state.quarter) * L().reservation.deposit_share)
}

export function larkspurReserveBlocker(state: GameState, units: number): Message | undefined {
  const l = state.larkspur
  if (!larkspurAvailable() || !l || l.stake <= 0 || l.ended) return { key: 'error.larkspur_no_stake' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (l.call) return { key: 'error.larkspur_answer_call' }
  if (!reservingQuarter(state) || !l.answered.includes('tape_out')) return { key: 'error.larkspur_no_reservation_yet' }
  if (l.reservation) return { key: 'error.larkspur_reserved' }
  if (!Number.isInteger(units) || units < 1 || units > larkspurMaxReserveUnits(l.stake)) return { key: 'error.bad_choice' }
  const cost = larkspurDepositUsd(state, units)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

export function reserveLarkspur(state: GameState, units: number): void {
  const l = state.larkspur!
  const usd = larkspurDepositUsd(state, units)
  l.reservation = { units, depositUsd: usd, bought: 0 }
  book(state, 'venture_calls', -usd, { venture: 'larkspur' })
  roundCash(state)
  logEntry(state, 'log.larkspur.reserved', { count: units, costUsd: usd })
}

// ---------- buying the machine ----------

/** What the machine's sale looks like in this quarter: the reserved window, the open market and the units left on the reservation. */
export function larkspurSale(state: GameState) {
  if (!larkspurAvailable()) return null
  const d = larkspurDraws(state)
  const f = L()
  const shipped = d.outcome === 'ships'
  const l = state.larkspur
  const ended = !!l?.ended
  const inWindow = shipped && !ended && state.quarter >= d.volume && state.quarter < d.volume + f.reservation.window_quarters
  const marketOpen =
    shipped &&
    !ended &&
    state.quarter >= d.volume + f.reservation.market_opens_after_quarters &&
    state.quarter <= qIndex('2022Q3')
  const reservedLeft = l?.reservation && inWindow ? l.reservation.units - l.reservation.bought : 0
  const model = larkspurModelId(state)
  return {
    model,
    listUsd: lkPriceUsd(model, state.quarter),
    discountedUsd: larkspurDiscountedUsd(model, state.quarter),
    inWindow,
    marketOpen,
    reservedLeft,
    volumeQuarter: d.volume,
  }
}

export function larkspurBuyBlocker(state: GameState, count: number, siteId: string): Message | undefined {
  const sale = larkspurSale(state)
  if (!sale) return { key: 'error.larkspur_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!Number.isInteger(count) || count < 1) return { key: 'error.bad_count' }
  const atDiscount = Math.min(count, sale.reservedLeft)
  if (count - atDiscount > 0 && !sale.marketOpen) return { key: 'error.larkspur_not_on_sale' }
  const site = state.sites.find((x) => x.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (underMoratorium(state, site.id)) return { key: 'error.moratorium', params: { ...siteParams(site), at: CONTENT.heat.moratoriumAt } }
  const neededKw = lkModel(sale.model)!.power_kw * count
  const freeKw = capacityKw(site) - usedKw(state, site.id)
  if (neededKw > freeKw + 1e-9) return { key: 'error.no_capacity', params: { ...siteParams(site), freeKw, neededKw } }
  const cost = larkspurCostUsd(state, count)
  if (cost > state.cash) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

/** The cash for `count` units now: reserved units at the discount less their deposit credit, the rest at the list price. */
export function larkspurCostUsd(state: GameState, count: number): number {
  const sale = larkspurSale(state)
  if (!sale) return 0
  const atDiscount = Math.min(count, sale.reservedLeft)
  const credit = larkspurCreditUsd(state, atDiscount)
  return roundCents(atDiscount * sale.discountedUsd - credit + (count - atDiscount) * sale.listUsd)
}

/** The deposit's share credited against `units` reserved units. */
function larkspurCreditUsd(state: GameState, units: number): number {
  const r = state.larkspur?.reservation
  return r && r.units > 0 ? roundCents((r.depositUsd * units) / r.units) : 0
}

export function buyLarkspur(state: GameState, count: number, siteId: string): void {
  const sale = larkspurSale(state)!
  const atDiscount = Math.min(count, sale.reservedLeft)
  const credit = larkspurCreditUsd(state, atDiscount)
  const list = roundCents(atDiscount * sale.discountedUsd + (count - atDiscount) * sale.listUsd)
  book(state, 'machines', -list, { site: siteId })
  if (credit > 0) book(state, 'venture_calls', credit, { venture: 'larkspur' })
  if (atDiscount > 0) state.larkspur!.reservation!.bought += atDiscount
  roundCash(state)
  addMachines(state, sale.model, 'new', count, siteId)
  logEntry(state, 'log.bought', { count, model: sale.model, condition: 'new', costUsd: list - credit })
}

// ---------- the quarter's end ----------

/** Units the start-up has shipped to the market by the end of `quarter` (0 before volume or if it never ships). */
export function larkspurUnitsShipped(state: GameState, quarter: number): number {
  const d = larkspurDraws(state)
  return d.outcome === 'ships' ? L().valuation.units_per_quarter * Math.max(0, quarter - d.volume + 1) : 0
}

/** Your stake's value now, $ (0 once it is lost, sold or resolved). */
export function larkspurValueUsd(state: GameState): number {
  const l = state.larkspur
  if (!l || l.ended || l.walked || l.stake <= 0 || l.resolvedUsd !== undefined) return 0
  const v = L().valuation
  const d = larkspurDraws(state)
  const merged = state.quarter > qIndex('2022Q3') || (state.quarter === qIndex('2022Q3') && state.phase !== 'plan')
  if (state.quarter < d.volume) {
    const share = l.stakeAtJoin > 0 ? l.stake / l.stakeAtJoin : 0
    return roundCents(l.paidUsd * share * (state.quarter >= qIndex(v.e9_quarter) ? v.e9_mult : 1))
  }
  const value = l.stake * larkspurUnitsShipped(state, state.quarter) * v.margin_usd
  return roundCents(merged ? value * v.merge_mult : value)
}

/** Called from endQuarter: raises the next quarter's calls, reveals the outcome at tape-out, resolves the stake at Act I's end. */
export function endQuarterLarkspur(state: GameState): void {
  const l = state.larkspur
  if (!l) return
  const d = larkspurDraws(state)
  const q = state.quarter
  if (l.stake > 0 && !l.ended && !l.call) {
    if (q + 1 === d.tape && !l.answered.includes('tape_out')) l.call = { kind: 'tape_out', dueUsd: larkspurThirdUsd(l.stakeAtJoin) }
    else if (q + 1 === d.first && d.outcome === 'ships' && !l.answered.includes('first_units'))
      l.call = { kind: 'first_units', dueUsd: larkspurThirdUsd(l.stakeAtJoin) }
  }
  // the outcome is revealed when the tape-out quarter ends
  if (q === d.tape && !l.ended && d.outcome !== 'ships') {
    const res = l.reservation
    if (d.outcome === 'cancelled') {
      l.ended = 'cancelled'
      logEntry(state, 'log.larkspur.cancelled')
    } else {
      const pay = l.stake > 0 ? roundCents(l.paidUsd * L().outcome.acquired_multiple) : 0
      if (pay > 0) book(state, 'asset_sales', pay, { venture: 'larkspur' })
      if (res) book(state, 'venture_calls', res.depositUsd, { venture: 'larkspur' })
      l.proceedsUsd = pay
      l.ended = 'acquired'
      logEntry(state, 'log.larkspur.acquired', { priceUsd: pay })
      roundCash(state)
    }
    l.stake = 0
  } else if (q === d.tape && d.outcome === 'ships') logEntry(state, 'log.larkspur.taped_out')
  if (q === d.first && d.outcome === 'ships') logEntry(state, 'log.larkspur.first_units')
  if (q === d.volume && d.outcome === 'ships') logEntry(state, 'log.larkspur.volume')
  // Act I's end: only cash and machines carry into Act II
  if (q === actLastQuarter(1) && l.resolvedUsd === undefined) {
    const value = larkspurValueUsd({ ...state, phase: 'live' } as GameState)
    if (value > 0) {
      book(state, 'asset_sales', value, { venture: 'larkspur' })
      roundCash(state)
      logEntry(state, 'log.larkspur.resolved', { priceUsd: value })
    }
    l.resolvedUsd = value
    l.stake = 0
  }
}

/** The ventures' headlines for this quarter (the offer, the E9 teaser, the 5 GB DAG), as text keys; shown only behind the ventures flag. */
export function larkspurNewsKeys(state: GameState): string[] {
  const f = CONTENT.larkspur
  if (!f || state.act !== 1) return []
  const out: string[] = []
  if (state.quarter === qIndex(f.offer.news_quarter)) out.push('news.larkspur.offer')
  if (state.quarter === qIndex(f.valuation.e9_quarter)) out.push('news.larkspur.e9')
  if (state.quarter === qIndex('2022Q3')) out.push('news.larkspur.dag5')
  return out
}
