// The prologue's cards and exchange events (Alpha 0.3 §2.7, §2.10): scripted cards pause, random
// cards in auto-played quarters take their default, Mt Gox's hack and collapse, Bitfinex, the
// wallet-loss roll and its card.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import {
  prologueDefaultChoice,
  prologueExchangeWeek,
  schedulePrologueEvents,
} from '../../src/sim/prologue/events.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import type { GameState } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

function planAt(quarter: string, seed = 11): GameState {
  const s = newPrologueGame(seed)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.machines = []
  return s
}

/** Plays weeks until a card shows (or the quarter ends). */
function untilCard(s: GameState): GameState {
  while (s.phase === 'live' && !s.interrupt) s = advance(s)
  return s
}

describe('cards (scope §2.10)', () => {
  it('the 24 cards are all there, with text', () => {
    expect(CONTENT.prologue.events.cards).toHaveLength(24)
  })

  it('a scripted card pauses in its week; answering it plays on', () => {
    let s = ok(ok(newPrologueGame(1), { type: 'START_PROLOGUE' }), {
      type: 'END_PLAN',
    })
    s = untilCard(s)
    expect(s.interrupt?.event).toBe('genesis_block')
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'read_whitepaper' })
    expect(s.prologue!.flags).toContain('read_whitepaper')
    expect(s.interrupt).toBeNull()
    expect(s.prologue!.cardsShown).toBe(1)
  })

  it('in an auto-played quarter a random card takes its default by itself', () => {
    let s = planAt('2009Q2')
    s.treasury.BTC = 100
    // 2009Q2 isn't a decision quarter and wasn't "stopped here": it auto-plays.
    s = ok(s, { type: 'END_PLAN' })
    s.prologue!.cardQueue = [{ id: 'friend_wants_coins', week: 1 }]
    s = advance(s)
    expect(s.interrupt).toBeNull()
    expect(s.prologue!.quarter.cards).toEqual([
      { id: 'friend_wants_coins', choice: 'decline' },
    ])
  })

  it('random cards: at most one a quarter, each once a game', () => {
    let fired = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = planAt('2012Q2', seed)
      s.phase = 'live'
      schedulePrologueEvents(s)
      expect(s.prologue!.cardQueue.length).toBeLessThanOrEqual(1)
      fired += s.prologue!.cardQueue.length
    }
    // 35% a quarter (the wallet roll can't fire: no coins).
    expect(fired / 200).toBeGreaterThan(0.25)
    expect(fired / 200).toBeLessThan(0.45)
  })
})

describe('exchange events (scope §2.7)', () => {
  it('2011 Mt Gox hack: no selling that week; household patience −5', () => {
    const s = planAt('2011Q2')
    s.phase = 'live'
    s.week = CONTENT.market[s.quarter].findIndex((w) => w.week === '2011-06-13')
    prologueExchangeWeek(s, marketWeek(s.quarter, s.week))
    expect(s.prologue!.patience).toBe(95)
    expect(s.prologue!.noSellingUntil).toBe(s.quarter * 13 + s.week)
  })

  it('2014 Mt Gox collapse: 80% of the exchange balance is lost; accepting is the default', () => {
    let s = planAt('2014Q1')
    s.treasury.BTC = 1500
    s.prologue!.onExchange.BTC = 1000
    s = ok(s, { type: 'END_PLAN' })
    while (s.interrupt?.event !== 'mtgox_collapse') {
      s = s.interrupt
        ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: prologueDefaultChoice(s) })
        : advance(s)
    }
    expect(prologueDefaultChoice(s)).toBe('accept')
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accept' })
    expect(s.prologue!.onExchange.BTC).toBeCloseTo(200, 6)
    expect(s.treasury.BTC).toBeCloseTo(700, 6)
    expect(s.prologue!.lost.exchange.BTC).toBeCloseTo(800, 6)
  })

  it('trying to withdraw saves half 20% of the time', () => {
    let saved = 0
    const n = 300
    for (let seed = 1; seed <= n; seed++) {
      let s = planAt('2014Q1', seed)
      s.treasury.BTC = 1000
      s.prologue!.onExchange.BTC = 1000
      s = ok(s, { type: 'END_PLAN' })
      while (s.interrupt?.event !== 'mtgox_collapse')
        s = s.interrupt
          ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: prologueDefaultChoice(s) })
          : advance(s)
      s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'withdraw' })
      if (s.prologue!.lost.exchange.BTC < 500) saved++
    }
    expect(saved / n).toBeGreaterThan(0.12)
    expect(saved / n).toBeLessThan(0.28)
  })

  it('2016 Bitfinex: a 12% chance to lose 36% of what is on an exchange', () => {
    let hit = 0
    const n = 1000
    for (let seed = 1; seed <= n; seed++) {
      const s = planAt('2016Q3', seed)
      s.treasury.BTC = 100
      s.prologue!.onExchange.BTC = 100
      s.week = CONTENT.market[s.quarter].findIndex(
        (w) => w.week === '2016-08-01',
      )
      prologueExchangeWeek(s, marketWeek(s.quarter, s.week))
      if (s.prologue!.lost.exchange.BTC > 0) {
        hit++
        expect(s.prologue!.lost.exchange.BTC).toBeCloseTo(36, 6)
      }
    }
    expect(hit / n).toBeGreaterThan(0.09)
    expect(hit / n).toBeLessThan(0.15)
  })
})

describe('the wallet-loss roll (scope §2.7)', () => {
  function rate(backup: boolean): number {
    let hits = 0
    let rolls = 0
    for (let seed = 1; seed <= 400; seed++)
      for (const q of ['2011Q1', '2012Q1', '2013Q1', '2015Q1', '2016Q1']) {
        const s = planAt(q, seed)
        s.treasury.BTC = 10
        s.prologue!.backup = backup
        s.phase = 'live'
        schedulePrologueEvents(s)
        rolls++
        if (s.prologue!.cardQueue.some((c) => c.id === 'dead_hard_drive'))
          hits++
      }
    return hits / rolls
  }

  it('about 0.75% a quarter without a backup; much less with one', () => {
    const without = rate(false)
    expect(without).toBeGreaterThan(0.004)
    expect(without).toBeLessThan(0.012)
    expect(rate(true)).toBeLessThan(0.004)
  })

  it('the dead drive: accepting loses the whole wallet (not the exchange)', () => {
    let s = planAt('2012Q2')
    s.treasury.BTC = 300
    s.prologue!.onExchange.BTC = 100
    s = ok(s, { type: 'END_PLAN' })
    s.prologue!.cardQueue = [{ id: 'dead_hard_drive', week: 1 }]
    s = advance(s)
    expect(s.interrupt?.event).toBe('dead_hard_drive')
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accept' })
    expect(s.treasury.BTC).toBeCloseTo(100, 6)
    expect(s.prologue!.lost.wallet.BTC).toBeCloseTo(200, 6)
  })
})
