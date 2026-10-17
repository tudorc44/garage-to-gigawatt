// M80.2 (doc 58 v1.2 §11): Larkspur as a timing bet. The $8M budget, and selling the stake between the first-units quarter and the
// Merge: the window, the price (the stake's share of the trailing four quarters' earnings x the multiple, the E9 cut before volume),
// half once, all ends the stake, 1 Bandwidth, and a held stake keeps M78's rule after the Merge.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  larkspurDraws,
  larkspurQuarterUnits,
  larkspurSaleOpen,
  larkspurSaleValueUsd,
  larkspurThirdUsd,
  larkspurTrailingEarningsUsd,
} from '../../src/sim/systems/larkspur.ts'
import { larkspurView } from '../../src/sim/ventures12Views.ts'
import { ok, playQuarter } from './act2Helpers.ts'

const q = (l: string) => quarterIndex(l)!
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? undefined : r.error.key
}
function act1At(label: string, seed = 1): GameState {
  const s = { ...newGame(seed), quarter: q(label), phase: 'plan' as const, cash: 200_000_000, bandwidth: 6, nextId: 3 }
  s.sites.push({ id: 'site-2', tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
  return s
}
function seedWith(pred: (d: ReturnType<typeof larkspurDraws>) => boolean): number {
  for (let seed = 1; seed < 500; seed++) if (pred(larkspurDraws({ seed }))) return seed
  throw new Error('no seed')
}
const onTime = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
const late = seedWith((d) => d.slip === 2 && d.outcome === 'ships')

/** A 20% backer who paid every call, played to the Plan phase of `label`. */
function backerAt(label: string, seed = onTime): GameState {
  let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.2 })
  while (s.quarter < q('2021Q2')) s = playQuarter(s)
  s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay', memory: 'lk6' })
  while (s.quarter < q('2021Q4')) s = playQuarter(s)
  s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
  while (s.quarter < q(label)) s = playQuarter(s)
  return s
}
const sell = (kind: 'all' | 'half'): Action => ({ type: 'LARKSPUR_SELL', kind })

describe('the $8M budget', () => {
  it('stakes of 10/20/30% cost $0.8M/$1.6M/$2.4M in all, in thirds', () => {
    expect(CONTENT.larkspur!.offer.budget_usd).toBe(8_000_000)
    expect([0.1, 0.2, 0.3].map((x) => Math.round(larkspurThirdUsd(x) * 3))).toEqual([800_000, 1_600_000, 2_400_000])
    expect(larkspurThirdUsd(0.1)).toBeCloseTo(266_666.67, 1)
    expect(larkspurThirdUsd(0.3)).toBeCloseTo(800_000, 1)
    const j = ok(act1At('2020Q2'), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    expect(j.cash).toBeCloseTo(200_000_000 - 533_333.33, 2)
  })
})

describe('the sale window', () => {
  it('opens in the first-units quarter and closes with the Merge (Act I\'s last Plan phase)', () => {
    const d = larkspurDraws({ seed: onTime })
    expect(d.first).toBe(q('2021Q4'))
    expect(larkspurSaleOpen(backerAt('2021Q4'))).toBe(true)
    expect(err(backerAt('2021Q4'), sell('all'))).toBeUndefined()
    // before first units: closed (the calls are the only thing then)
    let early = ok(act1At('2020Q2', onTime), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (early.quarter < q('2021Q3')) early = playQuarter(early)
    expect(larkspurSaleOpen(early)).toBe(false)
    expect(err({ ...early, larkspur: { ...early.larkspur!, call: null } }, sell('all'))).toBe('error.larkspur_sale_closed')
    // the last Plan phase of Act I still sells; Act II does not
    const last = backerAt('2022Q3')
    expect(larkspurSaleOpen(last)).toBe(true)
    expect(err({ ...last, act: 2 }, sell('all'))).toBe('error.larkspur_sale_closed')
    // a slip moves the window with the first units
    const l = larkspurDraws({ seed: late })
    expect(l.first).toBe(q('2022Q2'))
  })

  it('needs a stake held: none, walked or ended is closed', () => {
    expect(err(act1At('2022Q1'), sell('all'))).toBe('error.larkspur_sale_closed')
    const s = backerAt('2022Q1')
    expect(larkspurSaleOpen({ ...s, larkspur: { ...s.larkspur!, walked: true, stake: 0 } })).toBe(false)
    expect(larkspurSaleOpen({ ...s, larkspur: { ...s.larkspur!, ended: 'cancelled' } })).toBe(false)
  })

  it('is a Plan-phase move that costs 1 Bandwidth, and needs it', () => {
    const s = backerAt('2022Q1')
    const sold = ok(s, sell('all'))
    expect(sold.bandwidth).toBe(s.bandwidth - 1)
    expect(err({ ...s, bandwidth: 0 }, sell('all'))).toBe('error.no_bandwidth')
    expect(err({ ...s, phase: 'live' }, sell('all'))).toBe('error.wrong_phase')
  })
})

describe('the price', () => {
  it('units: a trickle in the first-units quarter, the volume rate after, nothing before or if it never ships', () => {
    expect(larkspurQuarterUnits({ seed: onTime }, q('2021Q3'))).toBe(0)
    expect(larkspurQuarterUnits({ seed: onTime }, q('2021Q4'))).toBe(150)
    expect(larkspurQuarterUnits({ seed: onTime }, q('2022Q1'))).toBe(1500)
    expect(larkspurQuarterUnits({ seed: seedWith((d) => d.outcome === 'cancelled') }, q('2022Q1'))).toBe(0)
  })

  it('is the stake\'s share of the trailing earnings: nothing in the first-units quarter, then growing, cut by E9 before volume', () => {
    const margin = CONTENT.larkspur!.valuation.margin_usd
    const at = (label: string) => larkspurSaleValueUsd(backerAt(label))
    expect(at('2021Q4')).toBe(0) // no completed quarter of units yet
    // 2022Q1 (volume): trailing = the trickle quarter, and the E9 cut (x0.8) still applies before volume is reached
    expect(larkspurTrailingEarningsUsd(backerAt('2022Q1'))).toBe(150 * margin)
    expect(at('2022Q1')).toBeCloseTo(0.2 * 150 * margin, 0) // from volume on there is no cut
    expect(at('2022Q2')).toBeCloseTo(0.2 * (150 + 1500) * margin, 0)
    expect(at('2022Q3')).toBeCloseTo(0.2 * (150 + 1500 + 1500) * margin, 0)
    // and a 20% backer's paid-in is $1.6M: selling in the second volume quarter returns it
    expect(at('2022Q3')).toBeGreaterThan(1_600_000)
  })

  it('applies the E9 cut to a sale before volume (a slipped Larkspur with its first units in 2022Q2)', () => {
    let s = ok(act1At('2020Q2', late), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (s.quarter < q('2022Q3')) {
      const d = larkspurDraws({ seed: late })
      if (s.larkspur!.call) s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
      void d
      s = playQuarter(s)
    }
    if (s.larkspur!.call) s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
    // 2022Q3 is its volume quarter (slip 2): the trailing quarter is the trickle, before volume it is cut x0.8
    const d = larkspurDraws({ seed: late })
    expect(d.volume).toBe(q('2022Q3'))
    expect(larkspurSaleValueUsd(s)).toBeCloseTo(0.2 * 150 * 6000, 0)
  })

  it('the view shows the value each quarter with the sale on offer', () => {
    const v = larkspurView(backerAt('2022Q2'))!
    expect(v.stakeSale).toMatchObject({ open: true, halfUsed: false })
    expect(v.stakeSale!.valueUsd).toBeCloseTo(0.2 * 1650 * 6000, 0)
  })
})

describe('selling', () => {
  it('all: the cash arrives, the stake is gone, no more calls, the Act I resolution adds nothing', () => {
    const s = backerAt('2022Q2')
    const value = larkspurSaleValueUsd(s)
    const sold = ok(s, sell('all'))
    expect(sold.cash - s.cash).toBeCloseTo(value, 1)
    expect(sold.larkspur).toMatchObject({ stake: 0, ended: 'sold' })
    expect(sold.larkspur!.saleUsd).toBeCloseTo(value, 1)
    expect(err(sold, sell('all'))).toBe('error.larkspur_sale_closed')
    // through the Merge: resolved at 0, and the sale is the only cash from the stake
    const end = playQuarter(playQuarter(sold))
    expect(end.larkspur!.resolvedUsd).toBe(0)
  })

  it('half, once: half the price, half the stake; then only the rest can be sold', () => {
    const s = backerAt('2022Q2')
    const value = larkspurSaleValueUsd(s)
    const half = ok(s, sell('half'))
    expect(half.cash - s.cash).toBeCloseTo(value / 2, 1)
    expect(half.larkspur).toMatchObject({ stake: 0.1, soldHalf: true })
    expect(err({ ...half, bandwidth: 5 }, sell('half'))).toBe('error.larkspur_half_sold')
    // the next quarter's value is the remaining stake's share
    expect(larkspurSaleValueUsd(half)).toBeCloseTo(value / 2, 1)
    const rest = ok({ ...half, bandwidth: 5 }, sell('all'))
    expect(rest.larkspur).toMatchObject({ stake: 0, ended: 'sold' })
    expect(rest.larkspur!.saleUsd).toBeCloseTo(value, 1)
  })

  it('a stake held to the Merge keeps M78\'s rule: a tenth of its share of the units shipped x margin (the volume quarters, M78\'s formula), settled at Act I\'s end', () => {
    let s = backerAt('2022Q3')
    s = playQuarter(s)
    expect(s.larkspur!.resolvedUsd).toBeCloseTo(0.2 * 4500 * 6000 * 0.1, 0)
  })

  it('waiting is a bet: the value can fall from one quarter to the next (the E9 cut lifts and a late start has less)', () => {
    // the sale value never falls once volume is on (earnings only add), but a backer who waits past 2022Q3 gets a tenth
    const v = (l: string) => larkspurSaleValueUsd(backerAt(l))
    expect(v('2022Q3')).toBeGreaterThan(v('2022Q2'))
    const held = (backerAt('2022Q3'), playQuarter(backerAt('2022Q3')).larkspur!.resolvedUsd!)
    expect(held).toBeLessThan(v('2022Q3') / 5)
  })
})
