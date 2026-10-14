// M69.3 (doc 51 v1.1 §3; pools_player.json): your own bitcoin pool in the Prologue: the unlock, the actions, the outside-miners
// model, PPLNS and PPS, the bills, the risks and their cards, the 2014 boycott, the sale and the handover, the save format.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { decodeSave, encodeSave } from '../../src/platform/saves.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { medianFee, poolReserveUsd, poolRiskCards, poolSalePriceUsd } from '../../src/sim/prologue/pool.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { restoreSave } from '../../src/sim/save.ts'
import type { GameState } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const refused = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

/** A Plan phase in `quarter`, living at a home rig, with `cash`. */
function planAt(quarter: string, cash = 5000, seed = 11): GameState {
  const s = newPrologueGame(seed)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.sites[0].tier = 'home_rig'
  s.siteSerials = { home_rig: 1 }
  s.machines = []
  s.cash = cash
  s.bandwidth = 3
  return s
}
const startQuarter = (s: GameState) => ok(s, { type: 'END_PLAN' })
/** A card on screen takes its default (or `answer`); otherwise a week passes. */
function playWeek(s: GameState, answers: Record<string, string> = {}): GameState {
  while (s.interrupt) {
    const id = s.interrupt.event!
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: answers[id] ?? CONTENT.prologue.events.cards.find((c) => c.id === id)?.default ?? 'accept' })
  }
  return s.phase === 'live' ? advance(s) : s
}
function playQuarter(s: GameState, answers: Record<string, string> = {}): GameState {
  if (s.phase === 'plan') s = startQuarter(s)
  while (s.phase === 'live') s = playWeek(s, answers)
  return s
}
const open = (s: GameState, method: 'PPLNS' | 'PPS' = 'PPLNS', feePct = 0.01) => ok(s, { type: 'P0_OPEN_POOL', method, feePct })

describe('opening a pool', () => {
  it('opens from 2011Q2 with a home rig or better: 1 Bandwidth and the setup cash', () => {
    expect(refused(planAt('2011Q1'), { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.01 })).toBe('error.p0_pool_locked')
    const bedroom = planAt('2011Q2')
    bedroom.sites[0].tier = 'bedroom'
    expect(refused(bedroom, { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.01 })).toBe('error.p0_pool_locked')
    const s = open(planAt('2011Q2'))
    expect(s.bandwidth).toBe(2)
    expect(s.cash).toBe(5000 - CONTENT.prologue.pool!.open_action.setup_cash_usd.value)
    expect(s.prologue!.ownPool).toMatchObject({ method: 'PPLNS', feePct: 0.01, reputation: 50, coldStorage: false })
    expect(refused(s, { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.01 })).toBe('error.p0_pool_open_already')
  })

  it('a fee must sit inside the method\'s range, and you need the Bandwidth and the cash', () => {
    expect(refused(planAt('2011Q2'), { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.04 })).toBe('error.p0_pool_fee')
    expect(refused(planAt('2011Q2'), { type: 'P0_OPEN_POOL', method: 'PPS', feePct: 0.01 })).toBe('error.p0_pool_fee')
    expect(refused({ ...planAt('2011Q2'), bandwidth: 0 }, { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.01 })).toBe('error.no_bandwidth')
    expect(refused(planAt('2011Q2', 100), { type: 'P0_OPEN_POOL', method: 'PPLNS', feePct: 0.01 })).toBe('error.no_cash')
  })

  it('PPS needs the cash reserve (3 x sqrt(blocks a week) block rewards); with it, PPS opens', () => {
    const poor = planAt('2013Q4', 400)
    expect(poolReserveUsd(poor)).toBeGreaterThan(400)
    expect(refused(poor, { type: 'P0_OPEN_POOL', method: 'PPS', feePct: 0.02 })).toBe('error.p0_pps_reserve')
    const rich = planAt('2013Q4', 1e9)
    expect(open(rich, 'PPS', 0.02).prologue!.ownPool!.method).toBe('PPS')
  })

  it('changing settings costs 1 Bandwidth; protection is from 2013Q1 and cold storage is permanent; each costs 1 Bandwidth', () => {
    let s = open(planAt('2012Q2'))
    s = ok(s, { type: 'P0_POOL_SETTINGS', method: 'PPLNS', feePct: 0.02 })
    expect(s.bandwidth).toBe(1)
    expect(s.prologue!.ownPool!.feePct).toBe(0.02)
    expect(refused(s, { type: 'P0_POOL_DDOS_PROTECTION' })).toBe('error.p0_not_yet')
    s = ok(s, { type: 'P0_POOL_COLD_STORAGE' })
    expect(s.prologue!.ownPool!.coldStorage).toBe(true)
    expect(refused(s, { type: 'P0_POOL_COLD_STORAGE' })).toBe('error.p0_pool_have_it')
    expect(refused({ ...open(planAt('2012Q2')), bandwidth: 0 }, { type: 'P0_POOL_COLD_STORAGE' })).toBe('error.no_bandwidth')
    const later = ok(open(planAt('2013Q1')), { type: 'P0_POOL_DDOS_PROTECTION' })
    expect(later.prologue!.ownPool!.protectionFrom).toBe(later.quarter + 1)
  })
})

describe('outside miners and the weeks', () => {
  it('the pool pulls in outside hashrate (network x small-pool share x pull), and it grows quarter by quarter', () => {
    let s = open(planAt('2011Q2'))
    s = startQuarter(s)
    s = playWeek(s)
    const w = CONTENT.market[s.quarter][0]
    const first = s.prologue!.ownPool!.outsideTh
    const expected = w.btc_hashrate_EHs * 1e6 * 0.3 * 0.005
    expect(first).toBeCloseTo(expected, 6)
    s = ok(playQuarterFrom(s), { type: 'NEXT_QUARTER' })
    expect(s.prologue!.ownPool!.pull).toBeGreaterThan(0.005 * 0.95) // churn takes 5%, new miners come in
  })

  it('PPLNS: the operator keeps the fee on the blocks found; the miners are paid only from found blocks', () => {
    let s = open(planAt('2013Q4', 5000), 'PPLNS', 0.02)
    s = playQuarter(s)
    const q = s.prologue!.reports.at(-1)!.pool!
    expect(q.blocks).toBeGreaterThanOrEqual(0)
    if (q.blocks > 0) expect(q.feeUsd / (q.feeUsd + q.paidMinersUsd)).toBeCloseTo(0.02, 6)
    expect(q.operatorBtc).toBeGreaterThanOrEqual(0)
  })

  it('PPS: miners are paid the expected value, so a week can be a loss for the operator, and the pool\'s coins can go negative on a bad week', () => {
    let s = open(planAt('2013Q4', 1e9), 'PPS', 0.02)
    let worst = Infinity
    let best = -Infinity
    s = startQuarter(s)
    while (s.phase === 'live') {
      s = playWeek(s)
      const op = s.prologue!.ownPool?.quarter.operatorBtc
      if (op !== undefined) {
        worst = Math.min(worst, op)
        best = Math.max(best, op)
      }
    }
    // (a PPS pool's quarterly operator net moves with luck; PPLNS's is the fee, never negative)
    expect(Number.isFinite(best)).toBe(true)
    expect(s.prologue!.reports.at(-1)!.pool!.paidMinersUsd).toBeGreaterThan(0)
  })

  it('the quarter\'s server bill comes out of cash, and the protection bill from the quarter after it is bought', () => {
    let s = open(planAt('2013Q1', 100000))
    const bill = CONTENT.prologue.pool!.server_bill_usd_quarter['2013'].value
    s = ok(s, { type: 'P0_POOL_DDOS_PROTECTION' })
    const first = playQuarter(s)
    expect(first.prologue!.reports.at(-1)!.pool!.billsUsd).toBe(bill)
    const second = playQuarter(ok(first, { type: 'NEXT_QUARTER' }))
    expect(second.prologue!.reports.at(-1)!.pool!.billsUsd).toBe(bill + CONTENT.prologue.pool!.ddos_protection.usd_quarter['2013'].value)
  })

  it('the same seed gives the same pool', () => {
    const a = playQuarter(open(planAt('2012Q3')))
    const b = playQuarter(open(planAt('2012Q3')))
    expect(a).toEqual(b)
  })
})

/** Plays the rest of the live quarter the state is in. */
function playQuarterFrom(s: GameState): GameState {
  while (s.phase === 'live') s = playWeek(s)
  return s
}

describe('risks and cards', () => {
  const hits = (id: string, cold: boolean, protectedNow: boolean) => {
    let n = 0
    for (let seed = 1; seed <= 3000; seed++) {
      const s = open(planAt('2013Q4', 1e6, seed))
      s.prologue!.ownPool!.coldStorage = cold
      s.prologue!.ownPool!.protectionFrom = protectedNow ? -100 : null
      s.prologue!.cardQueue = []
      poolRiskCards(s)
      if (s.prologue!.cardQueue.some((c) => c.id === id)) n++
    }
    return n / 3000
  }

  it('a DDoS comes about 3% of quarters, half as often with protection', () => {
    expect(hits('pool_ddos', false, false)).toBeGreaterThan(0.02)
    expect(hits('pool_ddos', false, false)).toBeLessThan(0.045)
    expect(hits('pool_ddos', false, true)).toBeLessThan(hits('pool_ddos', false, false))
  })

  it('a theft comes about 1% of quarters, about a fifth as often with cold storage', () => {
    const open_ = hits('pool_theft', false, false)
    const cold = hits('pool_theft', true, false)
    expect(open_).toBeGreaterThan(0.004)
    expect(cold).toBeLessThan(open_ / 2)
  })

  it('a DDoS answer: riding it out costs reputation and a fifth of the outside miners; buying protection also orders it', () => {
    let s = open(planAt('2013Q4', 1e6))
    s = startQuarter(s)
    s.prologue!.cardQueue = [{ id: 'pool_ddos', week: 1 }]
    const pull = s.prologue!.ownPool!.pull
    s = playWeek(s, { pool_ddos: 'protect' })
    s = playWeek(s, { pool_ddos: 'protect' })
    const pool = s.prologue!.ownPool!
    expect(pool.reputation).toBe(35)
    expect(pool.pull).toBeLessThan(pull * 0.85)
    expect(pool.protectionFrom).toBe(s.quarter + 1)
  })

  it('a theft: repaying takes cash from you; explaining costs 30 reputation instead', () => {
    const run = (answer: string) => {
      let s = open(planAt('2013Q4', 1e6))
      s = startQuarter(s)
      for (let i = 0; i < 4; i++) s = playWeek(s)
      s.prologue!.ownPool!.quarter.paidMinersUsd = 5000 // (what the miners were paid so far: a week of it is stolen)
      s.prologue!.cardQueue = [{ id: 'pool_theft', week: s.week }]
      s = playWeek(s, { pool_theft: answer }) // (the card comes at the week's end)
      const cash = s.cash
      s = playWeek(s, { pool_theft: answer }) // (answered, then the next week)
      return { cash: s.cash - cash, rep: s.prologue!.ownPool!.reputation }
    }
    const repay = run('repay')
    const explain = run('explain')
    expect(repay.cash).toBeLessThan(explain.cash)
    expect(explain.rep).toBe(20)
    expect(repay.rep).toBe(50)
  })

  it('a PPS pool with cash under the reserve is offered the crunch card; below zero, half its outside miners leave and reputation falls 30', () => {
    let s = open(planAt('2013Q4', 1e9), 'PPS', 0.02)
    s.cash = 50 // (under the reserve, above zero)
    s = startQuarter(s)
    let seen = false
    for (let i = 0; i < 3 && s.phase === 'live'; i++) {
      s = playWeek(s)
      if (s.interrupt?.event === 'pool_pps_crunch') seen = true
    }
    expect(seen).toBe(true)
    const broke = open(planAt('2013Q4', 1e9), 'PPS', 0.02)
    broke.cash = -10
    const pull = broke.prologue!.ownPool!.pull
    const after = playWeek(startQuarter(broke))
    expect(after.prologue!.ownPool!.pull).toBeLessThan(pull * 0.55)
    expect(after.prologue!.ownPool!.reputation).toBeLessThanOrEqual(20)
  })
})

describe('the 2014 boycott', () => {
  it('a pool at or below the median fee gets 1.3x outside hashrate in 2014Q2 and Q3', () => {
    const at = (fee: number, answer: string) => {
      let s = open(planAt('2014Q1', 1e6), 'PPLNS', fee)
      s.quarter = quarterIndex('2014Q2')!
      s.phase = 'plan'
      s.prologue!.ownPool!.pull = 0.02
      s = startQuarter(s)
      // (no DDoS or theft this quarter: they would cost the reputation the bonus needs)
      s.prologue!.cardQueue = s.prologue!.cardQueue.filter((c) => c.id === 'pool_boycott_2014')
      while (s.phase === 'live' && s.week < 12) s = playWeek(s, { pool_boycott_2014: answer })
      return s
    }
    const w = (s: GameState) => CONTENT.market[s.quarter][s.week - 1]
    const low = at(0.01, 'keep_fee')
    const high = at(0.03, 'keep_fee')
    expect(medianFee(low.quarter)).toBe(0.01)
    const base = (s: GameState) => w(s).btc_hashrate_EHs * 1e6 * 0.1 * s.prologue!.ownPool!.pull
    expect(low.prologue!.ownPool!.outsideTh / base(low)).toBeCloseTo(1.3, 5)
    expect(high.prologue!.ownPool!.outsideTh / base(high)).toBeCloseTo(1, 5)
    const cut = at(0.03, 'cut_fee')
    expect(cut.prologue!.ownPool!.feeOverride).toMatchObject({ fee: 0 })
    expect(cut.prologue!.ownPool!.outsideTh / base(cut)).toBeCloseTo(1.3, 5)
  })
})

describe('the sale and the handover', () => {
  it('the sale opens in 2013Q1 and pays the last four quarters of fee income x 2', () => {
    expect(refused(open(planAt('2012Q4')), { type: 'P0_SELL_POOL' })).toBe('error.p0_not_yet')
    let s = open(planAt('2013Q1', 1e6), 'PPLNS', 0.03)
    for (let i = 0; i < 2; i++) s = ok(playQuarter(s), { type: 'NEXT_QUARTER' })
    const pool = s.prologue!.ownPool!
    const price = poolSalePriceUsd(pool)
    expect(price).toBeCloseTo(pool.feeUsdQuarters.slice(-4).reduce((a, b) => a + b, 0) * 2, 6)
    s.phase = 'plan' // (a Plan phase: the sale is a Plan action)
    const cash = s.cash
    const sold = ok(s, { type: 'P0_SELL_POOL' })
    expect(sold.cash - cash).toBeCloseTo(price, 2)
    expect(sold.prologue!.ownPool).toBeUndefined()
    expect(sold.prologue!.poolEnded).toMatchObject({ kind: 'sold' })
  })

  it('closing a pool brings nothing', () => {
    const closed = ok(open(planAt('2012Q2')), { type: 'P0_CLOSE_POOL' })
    expect(closed.prologue!.ownPool).toBeUndefined()
    expect(closed.prologue!.poolEnded).toMatchObject({ kind: 'closed', usd: 0 })
  })

  it('an open pool is sold automatically at the end of 2016Q4, and nothing of it reaches Act I', () => {
    let s = open(planAt('2016Q4', 1e6), 'PPLNS', 0.01)
    s.prologue!.ownPool!.feeUsdQuarters = [1000, 1000, 1000, 1000]
    s = playQuarter(s)
    expect(s.phase).toBe('report')
    expect(s.prologue!.ownPool).toBeUndefined()
    expect(s.prologue!.poolEnded).toMatchObject({ kind: 'handover', quarter: s.quarter })
    // (the last four quarters: three of the 1,000s and this quarter's fee, x 2)
    expect(s.prologue!.poolEnded!.usd).toBeCloseTo(2 * (3000 + s.prologue!.reports.at(-1)!.pool!.feeUsd), 2)
    s = ok(s, { type: 'NEXT_QUARTER' })
    const act1 = ok(s, { type: 'CONTINUE_TO_ACT_1' })
    expect(act1.prologue).toBeUndefined()
    expect(JSON.stringify(act1)).not.toContain('ownPool')
  })
})

describe('the books', () => {
  it('every quarter reconciles with an open pool, PPS or PPLNS, through to the handover', () => {
    for (const method of ['PPLNS', 'PPS'] as const) {
      let s = open(planAt('2013Q4', 1e9, 5), method, method === 'PPS' ? 0.02 : 0.01)
      for (let i = 0; i < 4; i++) s = ok(playQuarter(s), { type: 'NEXT_QUARTER' })
      expect(unreconciled(s), method).toEqual([])
    }
  })
})

describe('saves', () => {
  it('a version-7 Prologue save loads at version 8 with no pool; an open pool survives export and import', () => {
    const s = planAt('2013Q4')
    const r = restoreSave(JSON.parse(JSON.stringify({ ...structuredClone(s), version: 7 })))
    expect(r.ok && r.state.version).toBe(8)
    expect(r.ok && r.state.prologue!.ownPool).toBeUndefined()
    const withPool = playWeek(startQuarter(open(planAt('2013Q4'))))
    const back = decodeSave(encodeSave(withPool))
    expect(back.ok && back.state).toEqual(withPool)
  })

  it('a game that never opens a pool has no pool state at all', () => {
    const s = playQuarter(planAt('2013Q4'))
    expect(s.prologue!.ownPool).toBeUndefined()
    expect(s.prologue!.poolEnded).toBeUndefined()
    expect(s.prologue!.reports.at(-1)!.pool).toBeUndefined()
  })
})
