// Pre-orders (Alpha 0.3 §2.9): vendors in their window, paid up front, the delivery rolled at order
// time (seeded), a conference contact's +10 points, arrival and the refund when a vendor folds.
import { describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { deliverPreorders, preorderOdds, refundQuarter } from '../../src/sim/prologue/preorders.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

function planAt(quarter: string, seed = 7): GameState {
  const s = newPrologueGame(seed)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.cash = 20_000
  return s
}

describe('pre-orders (scope §2.9)', () => {
  it('only in the vendor window; paid up front', () => {
    const early = applyAction(planAt('2012Q3'), {
      type: 'P0_PREORDER',
      vendor: 'preorder_summit_silicon',
    })
    expect(early.ok).toBe(false)
    const s = ok(planAt('2012Q4'), {
      type: 'P0_PREORDER',
      vendor: 'preorder_summit_silicon',
    })
    expect(s.cash).toBe(20_000 - 1300)
    expect(s.prologue!.preorders).toHaveLength(1)
  })

  it('the roll follows the vendor odds (45 / 35 / 15 / 5) over many orders', () => {
    const n = 600
    const count = { on_time: 0, late: 0, very_late: 0, never: 0 }
    for (let seed = 1; seed <= n; seed++) {
      const s = ok(planAt('2013Q1', seed), {
        type: 'P0_PREORDER',
        vendor: 'preorder_summit_silicon',
      })
      count[s.prologue!.preorders[0].outcome]++
    }
    expect(count.on_time / n).toBeCloseTo(0.45, 1)
    expect(count.late / n).toBeCloseTo(0.35, 1)
    expect(count.very_late / n).toBeCloseTo(0.15, 1)
    expect(count.never / n).toBeLessThan(0.1)
  })

  it('a conference contact moves 10 points into on time, from very late first', () => {
    const s = planAt('2013Q2')
    s.prologue!.conferences = ['bitcoin2013']
    const odds = preorderOdds(s, 'preorder_northgate_asics')
    expect(odds.on_time).toBeCloseTo(0.5, 9)
    expect(odds.severe).toBeCloseTo(0.05, 9)
    expect(odds.never).toBeCloseTo(0.05, 9)
  })

  it('an on-time unit arrives after the promised quarter (into a site with room) and earns from the next', () => {
    let s = planAt('2013Q1')
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    s = ok(s, { type: 'P0_PREORDER', vendor: 'preorder_summit_silicon' })
    const o = s.prologue!.preorders[0]
    o.outcome = 'on_time'
    o.deliverQuarter = s.quarter + 1
    s.quarter++
    deliverPreorders(s)
    const lot = s.machines.find((l) => l.model === 'asic_preorder_early')!
    expect(lot.siteId).toBe(s.sites[1].id)
    expect(lot.earnsFromQuarter).toBe(s.quarter + 1)
  })

  it('a vendor that never ships refunds its share when it folds', () => {
    let s = planAt('2013Q1')
    s = ok(s, { type: 'P0_PREORDER', vendor: 'group_buy' })
    const o = s.prologue!.preorders[0]
    o.outcome = 'never'
    o.deliverQuarter = null
    const cash = s.cash
    s.quarter = refundQuarter(o)
    deliverPreorders(s)
    expect(s.cash).toBe(cash + 650 * 0.4)
    expect(o.delivered).toBe(true)
  })
})
