// M78.4 (doc 58 v1.1 §2): Larkspur Silicon. The start-up's draws, the offer window, the stake's calls (pay, dilute, walk), the memory
// choice, the reservation and its limits, the sale order, the memory walls, the E9 cut and the cash resolution at Act I's end.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { larkspurDraws, larkspurMaxReserveUnits, larkspurValueUsd, lkPriceUsd } from '../../src/sim/systems/larkspur.ts'
import { lkAtWall } from '../../src/sim/systems/afterMerge.ts'
import { larkspurView } from '../../src/sim/ventures12Views.ts'
import { ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => quarterIndex(label)!

/** An Act I Plan phase in `label` with a lot of cash and an own site with room. */
function act1At(label: string, seed = 1): GameState {
  const s = { ...newGame(seed), quarter: q(label), phase: 'plan' as const, cash: 200_000_000, bandwidth: 6, nextId: 3 }
  s.sites.push({ id: 'site-2', tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
  return s
}
const tryAct = (s: GameState, a: Action) => applyAction(s, a)

/** A seed whose draws are (slip, outcome); found by scanning. */
function seedWith(pred: (d: ReturnType<typeof larkspurDraws>) => boolean): number {
  for (let seed = 1; seed < 500; seed++) if (pred(larkspurDraws({ seed }))) return seed
  throw new Error('no seed')
}

describe('the start-up\'s fate (replayed from the seed)', () => {
  it('is the same every time and for every call, with or without a stake', () => {
    expect(larkspurDraws({ seed: 7 })).toEqual(larkspurDraws({ seed: 7 }))
  })

  it('follows the content odds over many seeds (slip 50/30/20, outcome 70/25/5)', () => {
    const n = 4000
    const slips = [0, 0, 0]
    const out = { ships: 0, cancelled: 0, acquired: 0 }
    for (let seed = 1; seed <= n; seed++) {
      const d = larkspurDraws({ seed })
      slips[d.slip]++
      out[d.outcome]++
    }
    expect(slips[0] / n).toBeCloseTo(0.5, 1)
    expect(slips[1] / n).toBeCloseTo(0.3, 1)
    expect(slips[2] / n).toBeCloseTo(0.2, 1)
    expect(out.ships / n).toBeCloseTo(0.7, 1)
    expect(out.cancelled / n).toBeCloseTo(0.25, 1)
    expect(out.acquired / n).toBeCloseTo(0.05, 1)
  })

  it('the slip shifts tape-out, first units and volume together', () => {
    const d = larkspurDraws({ seed: seedWith((x) => x.slip === 2) })
    expect([d.tape, d.first, d.volume]).toEqual([q('2021Q4'), q('2022Q2'), q('2022Q3')])
  })
})

describe('the offer window', () => {
  it('can be joined in 2020Q2-Q4 only, once, with a listed stake and the cash for the first third', () => {
    for (const [label, open] of [['2020Q1', false], ['2020Q2', true], ['2020Q4', true], ['2021Q1', false]] as const)
      expect(tryAct(act1At(label), { type: 'LARKSPUR_JOIN', stake: 0.2 }).ok, label).toBe(open)
    const s = act1At('2020Q2')
    expect(tryAct(s, { type: 'LARKSPUR_JOIN', stake: 0.25 }).ok).toBe(false)
    s.cash = 1000
    expect(tryAct(s, { type: 'LARKSPUR_JOIN', stake: 0.1 }).ok).toBe(false)
    const j = ok(act1At('2020Q2'), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    expect(j.larkspur).toMatchObject({ stake: 0.2, paidUsd: 1_333_333.33 })
    expect(j.cash).toBeCloseTo(200_000_000 - 1_333_333.33, 2)
    expect(tryAct(j, { type: 'LARKSPUR_JOIN', stake: 0.1 }).ok).toBe(false)
  })
})

describe('a backer through the years', () => {
  it('pays the calls, picks LK-6, and the outcome shows at the end of the tape-out quarter', () => {
    const seed = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    // the tape-out call is waiting in 2021Q2's Plan
    expect(s.larkspur!.call).toEqual({ kind: 'tape_out', dueUsd: 1_333_333.33 })
    const view = larkspurView(s)!
    expect(view.call!.canPickMemory).toBe(true)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay', memory: 'lk6' })
    expect(s.larkspur).toMatchObject({ memory: 'lk6', paidUsd: 2_666_666.66, call: null })
    s = playQuarter(s)
    while (s.quarter < q('2021Q4')) s = playQuarter(s)
    expect(s.larkspur!.call!.kind).toBe('first_units')
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
    expect(s.larkspur!.paidUsd).toBeCloseTo(4_000_000, 1)
  })

  it('an unanswered call is diluted (the share halves) and the founders pick LK-5', () => {
    const seed = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.3 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    s = playQuarter(s)
    expect(s.larkspur).toMatchObject({ stake: 0.15, memory: 'lk5' })
    expect(s.larkspur!.answered).toEqual(['tape_out'])
  })

  it('walking away forfeits the stake', () => {
    const seed = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.1 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'walk' })
    expect(s.larkspur).toMatchObject({ stake: 0, walked: true })
    expect(larkspurValueUsd(s)).toBe(0)
  })

  it('a 10% stake cannot pick the memory: the founders pick LK-5', () => {
    const seed = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.1 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    expect(larkspurView(s)!.call!.canPickMemory).toBe(false)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay', memory: 'lk6' })
    expect(s.larkspur!.memory).toBe('lk5')
  })
})

describe('the outcome', () => {
  it('cancelled: stake and calls lost, no machines ever', () => {
    const seed = seedWith((d) => d.outcome === 'cancelled' && d.slip === 0)
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
    s = playQuarter(s)
    expect(s.larkspur).toMatchObject({ ended: 'cancelled', stake: 0 })
    expect(larkspurValueUsd(s)).toBe(0)
    expect(s.larkspur!.call).toBeNull()
  })

  it('acquired: pays 1.5x paid-in in cash', () => {
    const seed = seedWith((d) => d.outcome === 'acquired' && d.slip === 0)
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
    const cash = s.cash
    s = playQuarter(s)
    expect(s.larkspur).toMatchObject({ ended: 'acquired' })
    expect(s.larkspur!.proceedsUsd).toBeCloseTo(4_000_000, 1)
    expect(s.cash - cash).toBeGreaterThan(3_900_000)
  })
})

describe('the machines', () => {
  it('prices follow the content (about $15,600 and $19,500)', () => {
    expect(lkPriceUsd('lk5', q('2022Q1'))).toBe(15600)
    expect(lkPriceUsd('lk6', q('2022Q1'))).toBe(19500)
    expect(CONTENT.larkspur!.models.map((m) => m.id)).toEqual(['lk5', 'lk6'])
  })

  it('reservation limits: up to 10 units per 10% of stake', () => {
    expect(larkspurMaxReserveUnits(0.1)).toBe(10)
    expect(larkspurMaxReserveUnits(0.2)).toBe(20)
    expect(larkspurMaxReserveUnits(0.3)).toBe(30)
    expect(larkspurMaxReserveUnits(0.15)).toBe(10)
  })

  it('memory walls: LK-5 in the week of 2022-08-17, LK-6 at the Merge', () => {
    expect(lkAtWall('lk5', '2022-08-08')).toBe(false)
    expect(lkAtWall('lk5', '2022-08-15')).toBe(true)
    expect(lkAtWall('lk6', '2022-09-05')).toBe(false)
    expect(lkAtWall('lk6', '2022-09-12')).toBe(true)
  })
})

describe('reserving, buying and the walls (a backer whose Larkspur ships on time)', () => {
  const seed = seedWith((d) => d.slip === 0 && d.outcome === 'ships')
  function toReserve(): GameState {
    let s = ok(act1At('2020Q2', seed), { type: 'LARKSPUR_JOIN', stake: 0.2 })
    while (s.quarter < q('2021Q2')) s = playQuarter(s)
    s = ok(s, { type: 'LARKSPUR_CALL', choice: 'pay', memory: 'lk6' })
    while (s.quarter < q('2021Q4')) s = playQuarter(s)
    return ok(s, { type: 'LARKSPUR_CALL', choice: 'pay' })
  }

  it('a reservation: up to 20 units for a 20% stake, 10% deposit at 10% off, once', () => {
    let s = toReserve()
    expect(tryAct(s, { type: 'LARKSPUR_RESERVE', units: 21 }).ok).toBe(false)
    s = ok(s, { type: 'LARKSPUR_RESERVE', units: 20 })
    expect(s.larkspur!.reservation).toEqual({ units: 20, depositUsd: 20 * 17550 * 0.1, bought: 0 })
    expect(tryAct(s, { type: 'LARKSPUR_RESERVE', units: 1 }).ok).toBe(false)
  })

  it('reserved units go first at the discount, the rest only from volume + 2', () => {
    let s = ok(toReserve(), { type: 'LARKSPUR_RESERVE', units: 20 })
    const site = 'site-2'
    expect(tryAct(s, { type: 'LARKSPUR_BUY', count: 1, siteId: site }).ok).toBe(false) // not before volume
    s = playQuarter(s)
    expect(s.quarter).toBe(q('2022Q1'))
    const cash = s.cash
    s = ok(s, { type: 'LARKSPUR_BUY', count: 20, siteId: site })
    expect(cash - s.cash).toBeCloseTo(20 * 17550 - 20 * 17550 * 0.1, 2) // the deposit is credited
    expect(s.machines.find((l) => l.model === 'lk6')!.count).toBe(20)
    expect(tryAct(s, { type: 'LARKSPUR_BUY', count: 1, siteId: site }).ok).toBe(false) // the market is not open yet
    s = playQuarter(s)
    s = playQuarter(s)
    expect(s.quarter).toBe(q('2022Q3'))
    expect(tryAct(s, { type: 'LARKSPUR_BUY', count: 1, siteId: site }).ok).toBe(true) // volume + 2: full price
  })

  it('LK units earn Ethereum until their wall, then Ethereum Classic by themselves', () => {
    let s = ok(toReserve(), { type: 'LARKSPUR_RESERVE', units: 20 })
    s = playQuarter(s)
    s = ok(s, { type: 'LARKSPUR_BUY', count: 20, siteId: 'site-2' })
    while (s.quarter < q('2022Q3')) s = playQuarter(s)
    expect(larkspurView(s)!.sale!.marketOpen).toBe(true)
    // play 2022Q3 and look at the notes and the books
    s = playQuarter(s)
    expect(s.log.some((e) => e.key === 'log.larkspur.wall_lk6')).toBe(true)
    expect(s.log.some((e) => e.key === 'log.larkspur.wall_lk5')).toBe(false) // no LK-5 lot
    expect(s.larkspur!.resolvedUsd).toBeDefined()
  })
})
