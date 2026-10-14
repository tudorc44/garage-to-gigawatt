// M68.4 (doc 51 v1.0 §5): altcoins for old GPUs in the Prologue: the coin per GPU lot, scrypt income, merged mining, the
// wallet, the thin-market selling limits, the 2014Q3 card, the handover, the save migration, and opt-out invariance.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { decodeSave, encodeSave } from '../../src/platform/saves.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import {
  altIncome,
  altPrice,
  altSaleProceeds,
  altWeek,
  altWeeklyCapUsd,
  newAlts,
} from '../../src/sim/prologue/alts.ts'
import { isDecisionQuarterFor, newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { saleValueUsd } from '../../src/sim/systems/machines.ts'
import type { GameState, MachineLot } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const refused = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

/** A Plan phase in `quarter` with `count` of a model in one lot at the (free-power) bedroom. */
function planAt(quarter: string, model = 'gpu_gaming_2010', count = 10, seed = 11): GameState {
  const s = newPrologueGame(seed)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  const lot: MachineLot = { id: 'lot-g', model, siteId: s.sites[0].id, condition: 'used', count, failed: 0, earnsFromQuarter: s.quarter }
  s.machines = [lot]
  s.bandwidth = 2
  return s
}
/** A card on screen takes its default answer (a dead drive is accepted); otherwise a week passes. */
const playWeek = (s: GameState): GameState => {
  while (s.interrupt)
    s = ok(s, {
      type: 'RESOLVE_INTERRUPT',
      choice: CONTENT.prologue.events.cards.find((c) => c.id === s.interrupt!.event)?.default ?? 'accept',
    })
  return s.phase === 'live' ? advance(s) : s
}
const startQuarter = (s: GameState) => ok(s, { type: 'END_PLAN' })
const weekRow = (s: GameState) => altWeek(s.quarter, s.week)!
/** A week of the part-time income that a game at home also books (the sales are measured net of it). */
const INCOME_WEEK = CONTENT.prologue.rules.start.income_usd_q / 13

describe('the coin per GPU lot (SET_LOT_COIN)', () => {
  it('Litecoin from 2011Q4, Dogecoin from 2013Q4, free, and only for a GPU', () => {
    expect(refused(planAt('2011Q3'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })).toBe('error.p0_lot_coin')
    const s = ok(planAt('2011Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    expect(s.machines[0].altCoin).toBe('LTC')
    expect(s.bandwidth).toBe(2) // 0 Bandwidth
    expect(refused(planAt('2013Q3'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'DOGE' })).toBe('error.p0_lot_coin')
    expect(ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'DOGE' }).machines[0].altCoin).toBe('DOGE')
    expect(refused(planAt('2013Q4', 'fpga_board'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })).toBe('error.p0_lot_coin')
    expect(refused(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'nope', coin: 'LTC' })).toBe('error.unknown_lot')
  })

  it('the 2015 ETH rig can choose Litecoin or Dogecoin; BTC (or ETH) puts a lot back on its own coin', () => {
    const rig = planAt('2015Q3', 'gpu_eth_2015', 2)
    expect(ok(rig, { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' }).machines[0].altCoin).toBe('LTC')
    expect(ok(rig, { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'DOGE' }).machines[0].altCoin).toBe('DOGE')
    let s = ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = ok(s, { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'BTC' })
    expect(s.machines[0].altCoin).toBeUndefined()
  })
})

describe('scrypt income', () => {
  it('a week on Litecoin pays units x scrypt kH/s x the week\'s $/kH/s/day x 7, in coins at the week\'s price', () => {
    let s = ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = startQuarter(s)
    const row = weekRow(s)
    const usd = 10 * 400 * row.ltc_rev_usd_khs_day! * 7
    s = playWeek(s)
    expect(s.prologue!.alts!.held.LTC).toBeCloseTo(usd / row.ltc_usd!, 9)
    expect(s.prologue!.alts!.held.DOGE).toBe(0) // not merged yet, and Dogecoin isn't live in week 1
    expect(s.treasury.BTC).toBe(0) // nothing mined on bitcoin
  })

  it('an old GPU earns far more on Litecoin than on bitcoin in 2013Q4 (X-B6: at least 10x)', () => {
    const run = (coin: 'BTC' | 'LTC') => {
      let s = ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin })
      s = startQuarter(s)
      let usd = 0
      for (let i = 0; i < 13 && s.phase === 'live'; i++) {
        const w = CONTENT.market[s.quarter][s.week]
        const before = [s.treasury.BTC, s.prologue!.alts?.held.LTC ?? 0]
        s = playWeek(s)
        usd += (s.treasury.BTC - before[0]) * w.btc_usd + ((s.prologue!.alts?.held.LTC ?? 0) - before[1]) * (altPrice(altWeek(s.quarter, Math.max(0, s.week - 1)), 'LTC') || 0)
      }
      return usd
    }
    expect(run('LTC') / run('BTC')).toBeGreaterThanOrEqual(10)
  })

  it('from the merged-mining week a lot on Litecoin also earns Dogecoin at the Dogecoin rate', () => {
    let s = ok(planAt('2014Q3'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = startQuarter(s)
    const first = CONTENT.prologue.alts!.weekly[s.quarter].findIndex((r) => r.doge_merged_mining === true)
    expect(first).toBeGreaterThan(0)
    for (let i = 0; i < first; i++) s = playWeek(s)
    expect(s.prologue!.alts!.held.DOGE).toBe(0)
    const row = weekRow(s)
    const before = s.prologue!.alts!.held.DOGE
    s = playWeek(s)
    const dogeUsd = 10 * 400 * row.doge_rev_usd_khs_day! * 7
    expect(s.prologue!.alts!.held.DOGE - before).toBeCloseTo(dogeUsd / row.doge_usd!, 9)
  })

  it('altIncome is null before the coin exists (the lot mines its own coin that week)', () => {
    const s = ok(planAt('2011Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    const live = startQuarter(s)
    expect(altIncome(live, live.machines[0], 10)).toBeNull() // week 1 of 2011Q4 is before the 13 Oct launch week
    expect(live.prologue!.alts).toBeDefined()
  })

  it('a lot that earns less than its power costs is switched off, as bitcoin\'s; and moving out puts power on the bill', () => {
    let s = planAt('2014Q4')
    s.prologue!.livingAtHome = false // power is paid
    s.sites[0].tier = 'garage'
    s = ok(s, { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'DOGE' })
    const row = altWeek(s.quarter, 0)!
    const earns = 10 * 400 * row.doge_rev_usd_khs_day! * 7
    const costs = 10 * CONTENT.prologue.machines.find((m) => m.id === 'gpu_gaming_2010')!.power_kw * 24 * 7 * 0.12
    s = playWeek(startQuarter(s))
    // whichever side of break-even this week is on, the rule is the same one bitcoin's lots follow
    if (earns < costs) expect(s.prologue!.alts!.held.DOGE).toBe(0)
    else expect(s.prologue!.alts!.held.DOGE).toBeGreaterThan(0)
  })
})

describe('selling altcoins within the thin market\'s limits', () => {
  const heldAt = (quarter: string, coin: 'LTC' | 'DOGE', amount: number) => {
    const s = planAt(quarter, 'gpu_gaming_2010', 0)
    s.machines = []
    s.prologue!.alts = newAlts()
    s.prologue!.alts.held[coin] = amount
    return s
  }

  it('a small sale is free: it brings the full price', () => {
    let s = heldAt('2014Q2', 'LTC', 1e6)
    const row = altWeek(s.quarter, 0)!
    const small = (0.004 * 5.8e6) / altPrice(row, 'LTC') // 0.4% of 2014's average daily volume
    s = ok(s, { type: 'P0_SELL', coin: 'LTC', amount: small })
    const cash = s.cash
    s = playWeek(startQuarter(s))
    expect(s.cash - cash - INCOME_WEEK).toBeCloseTo(small * altPrice(row, 'LTC'), 1)
    expect(s.prologue!.alts!.queue.LTC).toBeCloseTo(0, 9)
  })

  it('a big sale costs 1% of the price for each further 0.5%, and 2% of the daily volume is the most a week sells', () => {
    const row = altWeek(quarterIndex('2014Q2')!, 0)!
    expect(altSaleProceeds('LTC', row, 0.0075 * 5.8e6)).toBeCloseTo(0.0075 * 5.8e6 * 0.995, 2) // half a further step
    expect(altSaleProceeds('LTC', row, 0.01 * 5.8e6)).toBeCloseTo(0.01 * 5.8e6 * 0.99, 2) // one further step
    expect(altSaleProceeds('LTC', row, 0.02 * 5.8e6)).toBeCloseTo(0.02 * 5.8e6 * 0.97, 2)
    expect(altWeeklyCapUsd('LTC', row)).toBeCloseTo(0.02 * 5.8e6, 6)
    let s = heldAt('2014Q2', 'LTC', 1e6) // far more than a week can sell
    s = ok(s, { type: 'P0_SELL', coin: 'LTC', amount: 1e6 })
    const cash = s.cash
    s = playWeek(startQuarter(s))
    const soldUsd = s.cash - cash - INCOME_WEEK
    expect(soldUsd).toBeCloseTo(0.02 * 5.8e6 * 0.97, 0)
    expect(s.prologue!.alts!.queue.LTC).toBeGreaterThan(0) // the rest waits for next week
    expect(s.prologue!.alts!.held.LTC).toBeCloseTo(1e6 - (0.02 * 5.8e6) / altPrice(row, 'LTC'), 3)
  })

  it('the keep/sell % orders the sell share of each week\'s coins sold, as for bitcoin', () => {
    let s = ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = ok(s, { type: 'P0_SET_ALT_HODL', coin: 'LTC', hodl: 0.5 })
    s = playWeek(startQuarter(s))
    const a = s.prologue!.alts!
    expect(a.mined.LTC).toBeGreaterThan(0)
    expect(a.sold.LTC).toBeGreaterThan(0)
    expect(a.sold.LTC + a.held.LTC).toBeCloseTo(a.mined.LTC, 9)
  })

  it('selling costs 1 Bandwidth, like a bitcoin sale, and you can\'t sell what you don\'t hold', () => {
    const s = heldAt('2014Q2', 'DOGE', 100)
    expect(refused(s, { type: 'P0_SELL', coin: 'DOGE', amount: 101 })).toBe('error.p0_not_enough_coins')
    expect(ok(s, { type: 'P0_SELL', coin: 'DOGE', amount: 50 }).bandwidth).toBe(1)
  })

  it('a dead drive takes altcoins with the rest of the wallet (the existing wallet-loss rule)', () => {
    let s = heldAt('2014Q2', 'LTC', 100)
    s = startQuarter(s)
    s.interrupt = { id: 'event', event: 'dead_hard_drive', week: 0, coin: 'BTC', changePct: 0 }
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accept' })
    expect(s.prologue!.alts!.held.LTC).toBe(0)
    expect(s.prologue!.alts!.lost.LTC).toBe(100)
  })
})

describe('the 2014Q3 card and decision quarter', () => {
  it('a player with a GPU on scrypt gets the Plan phase and the card; selling sells every scrypt lot at the used price', () => {
    let s = ok(planAt('2014Q3'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    expect(isDecisionQuarterFor(s, s.quarter)).toBe(true)
    s = startQuarter(s)
    while (s.phase === 'live' && !s.interrupt) s = playWeek(s)
    expect(s.interrupt?.event).toBe('scrypt_boxes_ship')
    const cash = s.cash
    const expected = saleValueUsd(s.machines[0], 10, s.quarter)
    expect(expected).toBeGreaterThan(0)
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'sell_gpus' })
    expect(s.machines).toEqual([])
    expect(s.cash - cash).toBeCloseTo(expected, 2)
  })

  it('keeping them leaves the lots as they were', () => {
    let s = ok(planAt('2014Q3'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = startQuarter(s)
    while (s.phase === 'live' && !s.interrupt) s = playWeek(s)
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'keep' })
    expect(s.machines.length).toBe(1)
    expect(s.machines[0].altCoin).toBe('LTC')
  })

  it('a game with no GPU on scrypt has no card, and 2014Q3 stays an auto-played quarter', () => {
    const s = planAt('2014Q3')
    expect(isDecisionQuarterFor(s, s.quarter)).toBe(false)
    let live = startQuarter(s)
    while (live.phase === 'live' && !live.interrupt) live = playWeek(live)
    expect(live.interrupt?.event).not.toBe('scrypt_boxes_ship')
  })
})

describe('the handover', () => {
  it('altcoins are sold over 2016Q4 within the limits and what is left converts at the last price x 0.9; none enters Act I', () => {
    let s = planAt('2016Q4', 'gpu_gaming_2010', 0)
    s.machines = []
    s.prologue!.alts = newAlts()
    s.prologue!.alts.held.LTC = 1e7 // far more than 13 weeks can sell
    s.prologue!.alts.held.DOGE = 100
    s = startQuarter(s)
    while (s.phase === 'live') s = playWeek(s)
    s = ok(s, { type: 'NEXT_QUARTER' })
    const a = s.prologue!.alts!
    expect(a.held.LTC).toBe(0)
    expect(a.held.DOGE).toBe(0)
    expect(a.handover!.LTC.amount).toBeCloseTo(1e7, 3)
    expect(a.handover!.LTC.usd).toBeGreaterThan(0)
    const last = altWeek(s.quarter, 12)!
    // the leftover (past 13 weeks of the 2% cap) went at the close x 0.9: more than the cap's sales alone
    const capCoins = (13 * 0.02 * 3.1e6) / altPrice(last, 'LTC')
    expect(1e7 - capCoins).toBeGreaterThan(0)
    expect(a.handover!.LTC.usd).toBeGreaterThan(capCoins * altPrice(last, 'LTC') * 0.96)
    expect(s.phase).toBe('chapter')
    const next = ok(s, { type: 'CONTINUE_TO_ACT_1' })
    expect(next.act).toBe(1)
    expect(next.prologue).toBeUndefined()
    expect(Object.keys(next.treasury)).toEqual(['BTC', 'ETH'])
    expect(JSON.stringify(next)).not.toContain('"alts"')
    expect(JSON.stringify(next)).not.toContain('altCoin')
  })
})

describe('saves and opt-out invariance', () => {
  it('a version-6 Prologue save loads at version 7 with every lot on its machine\'s own coin', () => {
    const s = planAt('2013Q4')
    const v6 = { ...structuredClone(s), version: 6 }
    const r = restoreSave(JSON.parse(JSON.stringify(v6)))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.version).toBe(7)
    expect(r.state.machines.every((l) => l.altCoin === undefined)).toBe(true)
    expect(r.state.prologue!.alts).toBeUndefined()
  })

  it('a lot\'s coin and the altcoin wallet survive export and import', () => {
    let s = ok(planAt('2013Q4'), { type: 'P0_SET_LOT_COIN', lotId: 'lot-g', coin: 'LTC' })
    s = playWeek(startQuarter(s))
    const back = decodeSave(encodeSave(s))
    expect(back.ok && back.state).toEqual(s)
  })

  it('a game that never points a GPU at an altcoin has no altcoin state at all', () => {
    let s = planAt('2013Q4')
    for (let i = 0; i < 3; i++) s = playWeek(i === 0 ? startQuarter(s) : s)
    expect(s.prologue!.alts).toBeUndefined()
    expect(s.machines.every((l) => !('altCoin' in l))).toBe(true)
    expect(JSON.stringify(s)).not.toContain('LTC')
  })
})
