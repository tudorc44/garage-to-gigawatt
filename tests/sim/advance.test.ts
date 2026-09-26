import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { interruptChoices } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

function act(state: GameState, action: Action): GameState {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(`action failed: ${r.error.key}`)
  return r.state
}

/** Plays the live quarter to the end, answering every alert with `choice` (default: hold). */
function playQuarter(state: GameState, choice = 'hold'): GameState {
  let s = act(state, { type: 'END_PLAN' })
  while (s.phase === 'live') {
    s = s.interrupt ? act(s, { type: 'RESOLVE_INTERRUPT', choice }) : advance(s)
  }
  return s
}

const buyRig: Action = {
  type: 'BUY_MACHINES',
  model: 'gpu_gen1',
  condition: 'new',
  count: 1,
  siteId: 'site-1',
}

describe('the quarter loop', () => {
  it('advance() only runs in the live phase', () => {
    expect(() => advance(newGame(1))).toThrow(/live phase/)
  })

  it('plays 13 weeks, then shows a report; a rig bought in Q1 earns nothing until Q2', () => {
    const s = playQuarter(act(newGame(1), buyRig))
    expect(s.phase).toBe('report')
    expect(s.week).toBe(13)
    expect(s.reports).toHaveLength(1)
    expect(s.reports[0]).toMatchObject({
      quarter: '2017Q1',
      revenueUsd: 0,
      cash: 8000,
    })
  })

  it('next quarter: Bandwidth refills, the rig earns, the report adds up', () => {
    let s = playQuarter(act(newGame(1), buyRig))
    s = act(s, { type: 'NEXT_QUARTER' })
    expect(s).toMatchObject({
      phase: 'plan',
      quarter: 1,
      week: 0,
      bandwidth: 3,
    })
    s = playQuarter(s)
    const r = s.reports[1]
    expect(r.quarter).toBe('2017Q2')
    expect(r.revenueUsd).toBeGreaterThan(500)
    expect(r.hashrate.ETH).toBe(180 - 180 * s.machines[0].failed)
    expect(r.cash).toBeCloseTo(
      8000 + r.revenueUsd - r.powerCostUsd - r.rentUsd,
      1,
    )
    expect(r.costPerCoinUsd.ETH).toBeCloseTo(r.powerCostUsd / r.coinsMined.ETH)
  })

  it('keeps cash rounded to cents', () => {
    let s = act(act(newGame(3), buyRig), { type: 'END_PLAN' })
    s = { ...s, quarter: 1 }
    s = advance(s)
    expect(Math.round(s.cash * 100) / 100).toBe(s.cash)
  })

  it('after the last quarter (2022Q3) comes the Merge decision, and the choice ends the act', () => {
    let s: GameState = { ...newGame(1), quarter: CONTENT.quarters.length - 1 }
    s = act(playQuarter(s), { type: 'NEXT_QUARTER' })
    expect(s.phase).toBe('merge')
    expect(applyAction(s, { type: 'MERGE_CHOOSE', choice: 'nope' }).ok).toBe(
      false,
    )
    s = act(s, { type: 'MERGE_CHOOSE', choice: 'gpu_cloud' })
    expect(s.phase).toBe('ended')
    expect(s.mergeChoice).toBe('gpu_cloud')
    expect(s.log.at(-1)!.key).toBe('log.merge_choice')
  })
})

describe('price alerts', () => {
  /** 2017Q1 at week 9: ETH rises 26.5% that week (and ≥15% in weeks 10–12 too). */
  const holding = (): GameState => ({
    ...newGame(1),
    phase: 'live',
    week: 9,
    treasury: { BTC: 0, ETH: 100 },
  })

  it('pause the quarter on a 15%+ weekly move', () => {
    const s = advance(holding())
    expect(s.interrupt).toMatchObject({
      id: 'price_alert',
      coin: 'ETH',
      week: 9,
    })
    expect(s.interrupt!.changePct).toBeCloseTo(0.265, 2)
    expect(s.week).toBe(10)
    expect(() => advance(s)).toThrow(/interrupt/)
  })

  it('"sell ETH" sells 25% of the ETH at that week’s price; "hold" does nothing', () => {
    const s = advance(holding())
    const price = CONTENT.market[0][9].eth_usd
    const sold = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'sell_eth' })
    expect(sold.treasury.ETH).toBeCloseTo(75)
    expect(sold.cash).toBeCloseTo(s.cash + 25 * price)
    expect(sold.interrupt).toBeNull()
    const held = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
    expect(held.treasury.ETH).toBe(100)
    const bad = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'panic' })
    expect(bad.ok ? '' : bad.error.key).toBe('error.bad_choice')
  })

  it('offer "sell BTC" only when the treasury holds BTC, and sell only that coin', () => {
    const ethOnly = advance(holding())
    expect(interruptChoices(ethOnly).map((c) => c.id)).toEqual([
      'sell_eth',
      'hold',
    ])
    const noBtc = applyAction(ethOnly, {
      type: 'RESOLVE_INTERRUPT',
      choice: 'sell_btc',
    })
    expect(noBtc.ok ? '' : noBtc.error.key).toBe('error.nothing_to_sell')

    const both = advance({ ...holding(), treasury: { BTC: 2, ETH: 100 } })
    expect(interruptChoices(both).map((c) => c.id)).toEqual([
      'sell_btc',
      'sell_eth',
      'hold',
    ])
    const sold = act(both, { type: 'RESOLVE_INTERRUPT', choice: 'sell_btc' })
    expect(sold.treasury).toEqual({ BTC: 1.5, ETH: 100 })
  })

  it('fire at most 3 times a quarter (2017Q1 has 4 big ETH weeks)', () => {
    let s: GameState = { ...holding(), week: 0 }
    let alerts = 0
    while (s.phase === 'live') {
      if (s.interrupt) {
        alerts++
        s = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      } else s = advance(s)
    }
    expect(alerts).toBe(3)
  })

  it("don't fire with an empty treasury (nothing to decide)", () => {
    const s = advance({ ...holding(), treasury: { BTC: 0, ETH: 0 } })
    expect(s.interrupt).toBeNull()
  })

  it('an alert in week 13 holds the quarter open until answered', () => {
    const s = advance({ ...holding(), week: 12 })
    expect(s.phase).toBe('live')
    expect(s.interrupt).not.toBeNull()
    const done = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
    expect(done.phase).toBe('report')
  })
})

describe('running out of cash', () => {
  const lastWeek = (cash: number): GameState => {
    const s: GameState = {
      ...newGame(1),
      phase: 'live',
      week: 12,
      quarter: 4,
      interruptsThisQuarter: 3, // no price alerts in this test
      cash,
    }
    s.machines.push({
      id: 'lot-1',
      model: 'gpu_gen1',
      siteId: 'site-1',
      condition: 'new',
      count: 2,
      failed: 0,
      earnsFromQuarter: 99,
    })
    return s
  }

  it('sells treasury coins first, then machines, just enough to get back to zero', () => {
    const s = advance({ ...lastWeek(-3000), treasury: { BTC: 0.1, ETH: 0 } })
    const r = s.reports[0]
    expect(s.phase).toBe('report')
    expect(r.forcedSale!.treasuryUsd).toBeGreaterThan(0)
    expect(s.treasury.BTC).toBe(0)
    expect(r.forcedSale!.units).toBe(1) // 2018Q1 used price $2,500 covers the rest
    expect(s.machines[0].count).toBe(1)
    expect(s.cash).toBeGreaterThanOrEqual(0)
  })

  it('game over when even selling everything leaves cash below zero', () => {
    const s = advance(lastWeek(-1_000_000))
    expect(s.phase).toBe('gameover')
    expect(s.machines).toEqual([])
    expect(s.reports[0].forcedSale!.units).toBe(2)
  })
})
