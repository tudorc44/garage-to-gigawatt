// The prologue's event cards and exchange events (Alpha 0.3 §2.7, §2.10; events_prologue.json,
// prologue.json › exchange / wallet_loss). As Act I's engine:
// - Scripted cards come in their historical week.
// - Random cards: at most one a quarter (a 35% roll, a random week), picked by weight among the
//   cards whose window and conditions hold, each once a game. The wallet-loss roll (0.75% a quarter,
//   × 0.15 with a backup) skips that roll and takes the slot with the dead_hard_drive card.
// - In an auto-played quarter a random card takes its default by itself unless it pauses auto-play.
// - The 2011 Mt Gox hack (no selling that week, household patience −5) and the 2016 Bitfinex hack (a
//   12% chance to lose 36% of what's on an exchange) happen in their week; the 2014 collapse is its
//   card's answer (a 20% chance, if you try to withdraw, to save half before 80% is lost).
// Rolls use their own streams ("p0events:…", "wallet_loss:…", "p0card:…", "bitfinex"), so other
// systems' draws are unchanged.
import {
  BALANCE,
  CONTENT,
  type MarketWeek,
  type PrologueCard,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, uniform } from '../rng.ts'
import { logEntry, roundCents, type Coin, type GameState } from '../state.ts'
import { getModel } from '../systems/market.ts'
import { orderSale, withdrawAll } from './custody.ts'
import { prologueEndQuarter } from './engine.ts'
import { answerHousehold, attendConference, conferenceNow } from './life.ts'
import { placePreorder } from './preorders.ts'
import { P, householdTier, isDecisionQuarter, rollStream } from './setup.ts'

const W = () => BALANCE.weeksPerQuarter
const COINS: Coin[] = ['BTC', 'ETH']
const label = (q: number) => CONTENT.quarters[q] ?? ''
const absWeek = (s: GameState) => s.quarter * W() + s.week
const deck = () => CONTENT.prologue.events

export const prologueCard = (id: string): PrologueCard | undefined =>
  deck().cards.find((c) => c.id === id)

/** This live quarter plays by itself (no Plan phase was held for it). */
export function autoPlaying(s: GameState): boolean {
  return (
    !isDecisionQuarter(s.quarter) &&
    !s.prologue!.flags.includes('planned_now')
  )
}

function walletCoins(s: GameState, coin: Coin): number {
  return Math.max(0, s.treasury[coin] - s.prologue!.onExchange[coin])
}

/** Does a card's condition hold now? */
function holds(s: GameState, req: string): boolean {
  const p = s.prologue!
  switch (req) {
    case 'at_home':
      return p.livingAtHome
    case 'household_site':
      return s.sites.some((x) => householdTier(x.tier))
    case 'bedroom':
      return s.sites.some((x) => x.tier === 'bedroom')
    case 'btc':
      return s.treasury.BTC > 0
    case 'has_eth':
      return (
        s.treasury.ETH > 0 ||
        s.machines.some((l) => getModel(l.model)?.coin === 'ETH')
      )
  }
  if (req.startsWith('flag:')) return p.flags.includes(req.slice(5))
  return false
}

function inWindow(s: GameState, c: PrologueCard): boolean {
  const q = label(s.quarter)
  if (c.quarters && !c.quarters.includes(q)) return false
  if (c.from && q < c.from) return false
  return true
}

/** Plans this quarter's cards as the live quarter starts. */
export function schedulePrologueEvents(s: GameState): void {
  const p = s.prologue!
  const rules = deck()
  p.cardQueue = []
  // The household's card (patience ran out last quarter) comes first.
  if (p.householdCard) p.cardQueue.push({ id: 'household', week: 1 })
  for (const c of rules.cards)
    if (c.type === 'scripted' && c.quarterIndex === s.quarter)
      p.cardQueue.push({ id: c.id, week: c.weekIndex! + 1 })
  if (label(s.quarter) < rules.random_start) return
  const r = rollStream(s.seed, `p0events:${s.quarter}`)
  const [w0, w1] = rules.random_week_range
  // The wallet-loss roll: a dead hard drive takes the quarter's random slot.
  const wl = P().wallet_loss
  if (COINS.some((c) => walletCoins(s, c) > 0)) {
    const chance =
      wl.chance_per_quarter.value * (p.backup ? wl.backup_mult : 1)
    if (uniform(rollStream(s.seed, `wallet_loss:${s.quarter}`), 0, 1) < chance) {
      p.cardQueue.push({ id: 'dead_hard_drive', week: randomInt(r, w0, w1) })
      return
    }
  }
  const eligible = rules.cards.filter(
    (c) =>
      c.type === 'random' &&
      !p.cardsFired.includes(c.id) &&
      inWindow(s, c) &&
      (c.requires ?? []).every((req) => holds(s, req)),
  )
  const total = eligible.reduce((n, c) => n + (c.weight ?? 1), 0)
  if (total <= 0) return
  if (uniform(r, 0, 1) >= rules.random_chance_per_quarter) return
  let roll = uniform(r, 0, total)
  const card =
    eligible.find((c) => (roll -= c.weight ?? 1) < 0) ?? eligible.at(-1)!
  p.cardQueue.push({ id: card.id, week: randomInt(r, w0, w1) })
}

/**
 * The week's exchange events (before the week's selling): the 2011 Mt Gox hack halts selling for
 * the week and costs household patience; the 2016 Bitfinex hack may take 36% of what's on an exchange.
 */
export function prologueExchangeWeek(s: GameState, w: MarketWeek): void {
  const p = s.prologue!
  const ex = P().exchange
  if (w.week === ex.gox_hack.week_of) {
    p.noSellingUntil = absWeek(s) + ex.gox_hack.no_selling_weeks - 1
    if (p.livingAtHome)
      p.patience = Math.max(
        0,
        Math.min(
          P().household.patience_start,
          p.patience + ex.gox_hack.household_patience,
        ),
      )
    logEntry(s, 'log.p0_gox_hack', {}, s.week + 1)
  }
  if (w.week === ex.bitfinex.week_of && COINS.some((c) => p.onExchange[c] > 0)) {
    if (uniform(rollStream(s.seed, 'bitfinex'), 0, 1) < ex.bitfinex.chance.value)
      loseOnExchange(s, ex.bitfinex.loss_share, 'log.p0_bitfinex')
  }
}

/** Coins lost on the exchange (a hack or a collapse). */
function loseOnExchange(
  s: GameState,
  share: number,
  key: 'log.p0_bitfinex' | 'log.p0_gox_collapse',
): void {
  const p = s.prologue!
  for (const coin of COINS) {
    const lost = p.onExchange[coin] * share
    if (lost <= 0) continue
    p.onExchange[coin] -= lost
    s.treasury[coin] -= lost
    p.lost.exchange[coin] += lost
    p.sellQueue[coin] = Math.min(p.sellQueue[coin], p.onExchange[coin])
    logEntry(s, key, { coin, amount: lost }, s.week + 1)
  }
}

/** Coins lost with your wallet (a dead drive): `share` of what's in it, moves out of it included. */
function loseWallet(s: GameState, share: number): void {
  const p = s.prologue!
  for (const coin of COINS) {
    const lost = walletCoins(s, coin) * share
    if (lost <= 0) continue
    s.treasury[coin] -= lost
    p.lost.wallet[coin] += lost
    for (const m of p.moves)
      if (m.coin === coin && m.to === 'exchange') m.amount *= 1 - share
    logEntry(s, 'log.p0_wallet_lost', { coin, amount: lost })
  }
  p.moves = p.moves.filter((m) => m.amount > 1e-12)
}

/**
 * After a week is played (`weekNo` = weeks played, 1-based): due cards come in turn. In an
 * auto-played quarter a random card takes its default by itself, unless it pauses auto-play;
 * otherwise the first due card pauses the quarter.
 */
export function checkPrologueEvents(s: GameState, weekNo: number): void {
  const p = s.prologue!
  while (!s.interrupt) {
    const i = p.cardQueue.findIndex((e) => e.week <= weekNo)
    if (i < 0) return
    const e = p.cardQueue.splice(i, 1)[0]
    const card = prologueCard(e.id)!
    if (card.type === 'random') p.cardsFired.push(card.id)
    if (card.type === 'random' && autoPlaying(s) && !card.pauses_autoplay) {
      applyChoice(s, card, card.default)
      continue
    }
    p.cardsShown++
    s.interrupt = {
      id: 'event',
      event: card.id,
      week: weekNo - 1,
      coin: 'BTC',
      changePct: 0,
    }
  }
}

/** Answers the card on screen; then the next due card, or the quarter's end after week 13. */
export function resolvePrologueInterrupt(
  s: GameState,
  choice: string,
): Message | undefined {
  const card = prologueCard(s.interrupt?.event ?? '')
  if (!card || !card.choices.some((c) => c.id === choice))
    return { key: 'error.bad_choice' }
  s.interrupt = null
  applyChoice(s, card, choice)
  checkPrologueEvents(s, s.week)
  if (!s.interrupt && s.week >= W()) prologueEndQuarter(s)
  return undefined
}

/** The default answer to the card on screen (a bot's or a skip's). */
export function prologueDefaultChoice(s: GameState): string {
  return prologueCard(s.interrupt!.event!)!.default
}

function applyChoice(s: GameState, card: PrologueCard, choiceId: string): void {
  const p = s.prologue!
  const fx = card.choices.find((c) => c.id === choiceId)!.effects
  const r = rollStream(s.seed, `p0card:${s.quarter}:${card.id}`)
  p.quarter.cards.push({ id: card.id, choice: choiceId })
  logEntry(s, 'log.p0_card', {
    p0Card: `${card.id}.title`,
    p0Choice: `${card.id}.choice.${choiceId}`,
  })
  if (fx.flag && !p.flags.includes(fx.flag)) p.flags.push(fx.flag)
  if (fx.cash) s.cash = roundCents(s.cash + fx.cash)
  if (fx.household_patience && p.livingAtHome)
    p.patience = Math.max(
      0,
      Math.min(P().household.patience_start, p.patience + fx.household_patience),
    )
  if (fx.bandwidth_next) s.events.bandwidthNext += fx.bandwidth_next
  if (fx.slowdown)
    p.slowdown = {
      mult: fx.slowdown.mult,
      until: absWeek(s) + fx.slowdown.weeks - 1,
    }
  if (fx.sell) {
    const { coin, pct } = fx.sell
    const base =
      fx.sell.of === 'exchange'
        ? Math.max(0, p.onExchange[coin] - p.sellQueue[coin])
        : Math.max(0, s.treasury[coin] - p.sellQueue[coin])
    if (base * pct > 0) orderSale(s, coin, base * pct)
  }
  if (fx.withdraw_all) withdrawAll(s)
  if (fx.open_buy) openPanel(s, `buy:${fx.open_buy}`)
  if (fx.open_preorders) openPanel(s, 'preorders')
  if (fx.open_wallet) openPanel(s, 'wallet')
  if (fx.open_offers) openPanel(s, 'offers')
  if (fx.preorder) {
    const refused = placePreorder(s, fx.preorder)
    if (refused) logEntry(s, refused.key, refused.params)
  }
  if (fx.conference) {
    const c = conferenceNow(s)
    const refused = c
      ? attendConference(s, c.id)
      : ({ key: 'error.p0_no_conference' } as Message)
    if (refused) logEntry(s, refused.key, refused.params)
  }
  if (fx.recovery) {
    if (uniform(r, 0, 1) < fx.recovery.success_p)
      logEntry(s, 'log.p0_recovered')
    else loseWallet(s, 1)
  }
  if (fx.wallet_loss) loseWallet(s, fx.wallet_loss)
  // Moving out when you can't pay the deposit falls back to cutting the load.
  if (fx.household && answerHousehold(s, fx.household))
    answerHousehold(s, 'cut_load')
  if (fx.gox_collapse) {
    const g = P().exchange.gox_collapse
    if (fx.gox_collapse.withdraw && uniform(r, 0, 1) < g.withdraw_success) {
      for (const coin of COINS) {
        const saved = p.onExchange[coin] * g.withdraw_saves_share
        p.onExchange[coin] -= saved
        p.sellQueue[coin] = Math.min(p.sellQueue[coin], p.onExchange[coin])
        if (saved > 0) logEntry(s, 'log.p0_gox_saved', { coin, amount: saved })
      }
    }
    loseOnExchange(s, g.loss_share, 'log.p0_gox_collapse')
  }
}

/** A card asks for a Plan phase next quarter with a panel open. */
function openPanel(s: GameState, panel: string): void {
  s.prologue!.openPanel = panel
  s.prologue!.stopNext = true
}
