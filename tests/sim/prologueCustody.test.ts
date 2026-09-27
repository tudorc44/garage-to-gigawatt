// Custody and selling in the prologue (Alpha 0.3 §2.6–§2.9): coin moves take a week, selling needs
// coins on the exchange and a weekly cap with price impact, the keep/sell %, the pool, forum offers.
import { describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { openOffers } from '../../src/sim/prologue/custody.ts'
import { prologueDefaultChoice } from '../../src/sim/prologue/events.ts'
import { newPrologueGame, sellCapUsdWeek } from '../../src/sim/prologue/setup.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import type { GameState } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function refused(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected a refusal')
  return r.error.key
}

function planAt(quarter: string, btc = 0): GameState {
  const s = newPrologueGame(5)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.treasury.BTC = btc
  s.machines = [] // no mining noise
  return s
}

describe('custody (scope §2.7)', () => {
  it('a move takes a week and costs no Bandwidth', () => {
    let s = planAt('2011Q4', 100)
    s = ok(s, { type: 'P0_MOVE_COINS', coin: 'BTC', amount: 40, to: 'exchange' })
    expect(s.bandwidth).toBe(2)
    expect(s.prologue!.onExchange.BTC).toBe(0)
    s = ok(s, { type: 'END_PLAN' })
    s = advance(s) // week 1: still on its way
    expect(s.prologue!.onExchange.BTC).toBe(0)
    s = advance(s) // week 2: landed
    expect(s.prologue!.onExchange.BTC).toBe(40)
    expect(
      refused(
        { ...s, phase: 'plan' },
        { type: 'P0_MOVE_COINS', coin: 'BTC', amount: 61, to: 'exchange' },
      ),
    ).toBe('error.p0_not_enough_coins')
  })

  it('selling: the wallet coins move first, then sell up to the weekly cap at a lower price', () => {
    let s = planAt('2011Q4', 100_000)
    s = ok(s, { type: 'P0_SELL', coin: 'BTC', amount: 50_000 })
    expect(s.bandwidth).toBe(1)
    s = ok(s, { type: 'END_PLAN' })
    s = advance(s)
    expect(s.cash).toBeCloseTo(2000 + 1200 / 13, 0) // nothing on the exchange yet
    const cash = s.cash
    const w = marketWeek(s.quarter, s.week)
    const cap = sellCapUsdWeek(s.quarter)
    s = advance(s)
    // A full week's cap sells at market × (1 − 0.2).
    expect(s.cash - cash - 1200 / 13).toBeCloseTo(cap * 0.8, 0)
    expect(s.treasury.BTC).toBeCloseTo(100_000 - cap / w.btc_usd, 3)
    // The rest waits in the queue.
    expect(s.prologue!.sellQueue.BTC).toBeCloseTo(50_000 - cap / w.btc_usd, 3)
  })

  it('the keep/sell %: with a price, the sell share of mined coins is ordered sold', () => {
    let s = newPrologueGame(5)
    s.phase = 'plan'
    s.quarter = quarterIndex('2011Q4')!
    s = ok(s, { type: 'SET_HODL', coin: 'BTC', pct: 0 })
    s = ok(s, { type: 'P0_SET_POOL', pool: true })
    s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live')
      s = s.interrupt
        ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: prologueDefaultChoice(s) })
        : advance(s)
    const r = s.prologue!.reports.at(-1)!
    expect(r.coinsMined.BTC).toBeGreaterThan(0)
    expect(r.soldUsd).toBeGreaterThan(0)
  })
})

describe('solo and pool (scope §2.6)', () => {
  it('pools open in 2010Q4', () => {
    expect(
      refused(planAt('2010Q3'), { type: 'P0_SET_POOL', pool: true }),
    ).toBe('error.p0_not_yet')
    const s = ok(planAt('2010Q4'), { type: 'P0_SET_POOL', pool: true })
    expect(s.prologue!.pool).toBe(true)
  })
})

describe('forum offers (scope §2.9)', () => {
  it('open in their quarter, stay to the next decision quarter; taking one trades coins for cash outside the cap', () => {
    let s = planAt('2010Q2', 10_000)
    // 2009Q4's offer closed with 2009Q4 (a decision quarter); 2010Q1's wait for 2010Q2.
    expect(openOffers(s).map((o) => o.id)).toEqual([
      'offer_forum_buyer_2',
      'offer_local_trade',
      'offer_forum_buyer_3',
    ])
    s = ok(s, { type: 'P0_OFFER', id: 'offer_forum_buyer_3', accept: true })
    expect(s.treasury.BTC).toBe(9_500)
    expect(s.cash).toBe(2040)
    s = ok(s, { type: 'P0_OFFER', id: 'offer_local_trade', accept: false })
    expect(openOffers(s).map((o) => o.id)).toEqual(['offer_forum_buyer_2'])
    expect(
      refused(s, { type: 'P0_OFFER', id: 'offer_forum_buyer_4', accept: true }),
    ).toBe('error.p0_no_offer')
  })
})
