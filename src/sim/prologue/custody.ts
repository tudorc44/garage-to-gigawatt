// Custody and selling in the prologue (Alpha 0.3 §2.6–§2.9; prologue.json): every coin is in your
// wallet or on the exchange; moving coins takes a week and no Bandwidth; selling needs coins on the
// exchange (a sell order moves what it needs from your wallet first, which takes that week); the
// forum's "sell for almost nothing" offers; and the solo / pool switch.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type Coin, type GameState } from '../state.ts'
import { P, poolsOpen } from './setup.ts'
import { book, roundCash } from '../ledger.ts'

const EPS = 1e-9
const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})
const absWeek = (s: GameState) => s.quarter * BALANCE.weeksPerQuarter + s.week

/** Coins on their way (moves not landed yet), by destination. */
function inTransit(s: GameState, coin: Coin, to: 'exchange' | 'wallet') {
  return s
    .prologue!.moves.filter((m) => m.coin === coin && m.to === to)
    .reduce((n, m) => n + m.amount, 0)
}

/** What can be moved now: wallet coins not already heading out, or exchange coins likewise. */
export function movable(
  s: GameState,
  coin: Coin,
  to: 'exchange' | 'wallet',
): number {
  const p = s.prologue!
  const onEx = p.onExchange[coin]
  const wallet = Math.max(0, s.treasury[coin] - onEx)
  return Math.max(
    0,
    to === 'exchange'
      ? wallet - inTransit(s, coin, 'exchange')
      : onEx - inTransit(s, coin, 'wallet'),
  )
}

/** Starts a move; it lands a week later (the week's first step). */
function startMove(
  s: GameState,
  coin: Coin,
  amount: number,
  to: 'exchange' | 'wallet',
): void {
  s.prologue!.moves.push({ coin, amount, to, arrives: absWeek(s) + 1 })
  if (to === 'exchange') flag(s, 'exchange_custody_opened')
}

function flag(s: GameState, f: string): void {
  if (!s.prologue!.flags.includes(f)) s.prologue!.flags.push(f)
}

export function moveCoins(
  s: GameState,
  coin: Coin,
  amount: number,
  to: 'exchange' | 'wallet',
): Message | undefined {
  if (!(amount > 0)) return fail('error.bad_count')
  const max = movable(s, coin, to)
  if (amount > max + EPS)
    return fail('error.p0_not_enough_coins', { coin, have: max })
  startMove(s, coin, Math.min(amount, max), to)
  logEntry(
    s,
    to === 'exchange' ? 'log.p0_move_exchange' : 'log.p0_move_wallet',
    { coin, amount },
  )
  return undefined
}

/** Everything off the exchange (a card's "move everything into your own wallet"). */
export function withdrawAll(s: GameState): void {
  for (const coin of ['BTC', 'ETH'] as const) {
    const n = movable(s, coin, 'wallet')
    if (n > EPS) startMove(s, coin, n, 'wallet')
  }
}

/**
 * A sell order: `amount` joins the sell queue; whatever the exchange doesn't already hold (beyond
 * earlier orders) is moved there from your wallet first. Returns the amount ordered.
 */
export function orderSale(s: GameState, coin: Coin, amount: number): number {
  const p = s.prologue!
  const free = Math.max(
    0,
    p.onExchange[coin] +
      inTransit(s, coin, 'exchange') -
      inTransit(s, coin, 'wallet') -
      p.sellQueue[coin],
  )
  const fromWallet = Math.min(
    Math.max(0, amount - free),
    movable(s, coin, 'exchange'),
  )
  const ordered = Math.min(amount, free + fromWallet)
  if (fromWallet > EPS) startMove(s, coin, fromWallet, 'exchange')
  p.sellQueue[coin] += ordered
  return ordered
}

/** Coins you could still order sold (not already in the queue). */
export function sellable(s: GameState, coin: Coin): number {
  return Math.max(0, s.treasury[coin] - s.prologue!.sellQueue[coin])
}

/** Sell coins from the Plan screen (1 Bandwidth, as Act I's treasury sale). */
export function sellCoins(
  s: GameState,
  coin: Coin,
  amount: number,
): Message | undefined {
  if (!(amount > 0)) return fail('error.bad_count')
  const max = sellable(s, coin)
  if (amount > max + EPS)
    return fail('error.p0_not_enough_coins', { coin, have: max })
  const cost = P().bandwidth_costs.sell
  if (s.bandwidth < cost)
    return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
  s.bandwidth -= cost
  const n = orderSale(s, coin, Math.min(amount, max))
  logEntry(s, 'log.p0_sell_order', { coin, amount: n })
  return undefined
}

/** Cancel the rest of a coin's sell order (free). */
export function cancelSale(s: GameState, coin: Coin): void {
  s.prologue!.sellQueue[coin] = 0
}

export function setPool(s: GameState, pool: boolean): Message | undefined {
  if (pool && !poolsOpen(s.quarter))
    return fail('error.p0_not_yet', { quarter: P().pools.from })
  s.prologue!.pool = pool
  logEntry(s, pool ? 'log.p0_pool_on' : 'log.p0_pool_off')
  return undefined
}

export function setMinedTo(s: GameState, to: 'wallet' | 'exchange'): void {
  s.prologue!.minedTo = to
  if (to === 'exchange') flag(s, 'exchange_custody_opened')
}

// ---------- forum offers (§2.9) ----------

/**
 * The offers in the tray now: each opens in its quarter and stays until the end of the first
 * decision quarter at or after it (most offer quarters auto-play: prologue.json offer_note).
 */
export function openOffers(s: GameState) {
  const p = s.prologue!
  const q = label(s.quarter)
  const decisions = P().decision_quarters
  return P().offers.filter((o) => {
    if (p.offersTaken.includes(o.id) || p.offersIgnored.includes(o.id))
      return false
    const until = decisions.find((d) => d >= o.quarter) ?? o.quarter
    return o.quarter <= q && q <= until
  })
}

/** Accept (the coins go from your wallet for the cash, outside the selling cap) or ignore an offer. */
export function answerOffer(
  s: GameState,
  id: string,
  accept: boolean,
): Message | undefined {
  const p = s.prologue!
  const offer = openOffers(s).find((o) => o.id === id)
  if (!offer) return fail('error.p0_no_offer')
  if (!accept) {
    p.offersIgnored.push(id)
    return undefined
  }
  // The buyer takes coins you hold (wallet first, then the exchange's free coins).
  const wallet = movable(s, 'BTC', 'exchange')
  const exchangeFree = Math.max(
    0,
    p.onExchange.BTC - inTransit(s, 'BTC', 'wallet') - p.sellQueue.BTC,
  )
  if (wallet + exchangeFree < offer.btc - EPS)
    return fail('error.p0_not_enough_coins', {
      coin: 'BTC',
      have: wallet + exchangeFree,
    })
  const fromExchange = Math.max(0, offer.btc - wallet)
  p.onExchange.BTC -= fromExchange
  s.treasury.BTC -= offer.btc
  book(s, 'coins_sold', offer.usd)
  roundCash(s)
  p.offersTaken.push(id)
  logEntry(s, 'log.p0_offer_taken', { btc: offer.btc, cashUsd: offer.usd })
  return undefined
}

/** Offers still open when their window closes count as ignored. */
export function expireOffers(s: GameState): void {
  const p = s.prologue!
  const q = label(s.quarter)
  const decisions = P().decision_quarters
  for (const o of P().offers) {
    if (p.offersTaken.includes(o.id) || p.offersIgnored.includes(o.id))
      continue
    const until = decisions.find((d) => d >= o.quarter) ?? o.quarter
    if (q >= until) p.offersIgnored.push(o.id)
  }
}
