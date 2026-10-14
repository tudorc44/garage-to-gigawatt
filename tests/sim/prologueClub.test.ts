// M70.4 (doc 51 v1.2 §4; club.json): the mining club in the Prologue: joining, shares, the group buy and its delivery roll, Teo's GPUs,
// the weekly split, keys and hosting, the seven cards, the endings, the save format, the books.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { decodeSave, encodeSave } from '../../src/platform/saves.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { clubKw } from '../../src/sim/prologue/clubLoad.ts'
import { clubAssetsUsd, clubQuarterStart, memberValueUsd } from '../../src/sim/prologue/club.ts'
import { newPrologueGame, siteLoadKw } from '../../src/sim/prologue/setup.ts'
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
/** A Plan phase in `quarter`, with a home rig and cash. */
function planAt(quarter = '2013Q1', cash = 20000, seed = 11): GameState {
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
const join = (s: GameState, stake = 2000, keys: 'player' | 'jun' = 'player', hosting: 'your_place' | 'friends_flat' = 'your_place') =>
  ok(s, { type: 'P0_JOIN_CLUB', stake, keys, hosting })
function playWeek(s: GameState, answers: Record<string, string> = {}): GameState {
  while (s.interrupt) {
    const id = s.interrupt.event!
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: answers[id] ?? CONTENT.prologue.events.cards.find((c) => c.id === id)?.default ?? 'accept' })
  }
  return s.phase === 'live' ? advance(s) : s
}
function playQuarter(s: GameState, answers: Record<string, string> = {}): GameState {
  if (s.phase === 'plan') s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live') s = playWeek(s, answers)
  return s
}
/** Plays on to the Plan phase or live quarter of `quarter` (report phases answered with NEXT_QUARTER). */
function through(s: GameState, quarter: string, answers: Record<string, string> = {}): GameState {
  const target = quarterIndex(quarter)!
  while (s.quarter < target) {
    s = playQuarter(s, answers)
    if (s.phase === 'report') s = ok(s, { type: 'NEXT_QUARTER' })
  }
  return s
}
const club = (s: GameState) => s.prologue!.club!

describe('joining the club', () => {
  it('is offered in 2013Q1\'s Plan phase only; a stake of $500-$5,000 in $500 steps; 1 Bandwidth, the cash', () => {
    expect(refused(planAt('2012Q4'), { type: 'P0_JOIN_CLUB', stake: 2000, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_locked')
    expect(refused(planAt('2013Q2'), { type: 'P0_JOIN_CLUB', stake: 2000, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_locked')
    expect(refused(planAt(), { type: 'P0_JOIN_CLUB', stake: 400, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_stake')
    expect(refused(planAt(), { type: 'P0_JOIN_CLUB', stake: 1250, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_stake')
    expect(refused(planAt(), { type: 'P0_JOIN_CLUB', stake: 5500, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_stake')
    expect(refused({ ...planAt(), bandwidth: 0 }, { type: 'P0_JOIN_CLUB', stake: 2000, keys: 'player', hosting: 'your_place' })).toBe('error.no_bandwidth')
    expect(refused(planAt('2013Q1', 1000), { type: 'P0_JOIN_CLUB', stake: 2000, keys: 'player', hosting: 'your_place' })).toBe('error.no_cash')
    const s = join(planAt())
    expect(s.bandwidth).toBe(2)
    // (the stake went in; its share of the cash left over after the group-buy units comes back: 20,000 - 2,000 + 180)
    expect(s.cash).toBeGreaterThan(18000)
    expect(s.cash).toBeLessThan(18500)
    expect(refused(s, { type: 'P0_JOIN_CLUB', stake: 2000, keys: 'player', hosting: 'your_place' })).toBe('error.p0_club_in')
  })

  it('shares follow the value put in (cash plus Teo\'s GPUs at the used price); the friends\' $3,000 and Teo\'s two GPUs come with it', () => {
    const s = join(planAt(), 2000)
    const c = club(s)
    const gpu = CONTENT.prologue.machines.find((m) => m.id === 'gpu_gaming_2010')!
    const used = (gpu as unknown as { price_used: Record<string, number> }).price_used
    const gpuValue = 2 * (used['2012Q4'] ?? 0) // (the table ends in 2012Q4; later quarters use its last price)
    const total = 2000 + 3000 + gpuValue
    expect(c.shares.you).toBeCloseTo(2000 / total, 9)
    expect(c.shares.teo).toBeCloseTo((1000 + gpuValue) / total, 9)
    expect(c.shares.mara).toBeCloseTo(1000 / total, 9)
    expect(Object.values(c.shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(c.lots).toMatchObject([{ kind: 'gpu', model: 'gpu_gaming_2010', count: 2 }])
  })

  it('all the pooled cash goes into the group buy: one order per $650, each with its own delivery roll', () => {
    const s = join(planAt(), 2000)
    expect(club(s).orders.length).toBe(Math.floor(5000 / 650))
    for (const o of club(s).orders) expect(['on_time', 'late', 'very_late', 'never']).toContain(o.outcome)
    expect(club(s).orders.every((o) => o.paidUsd === 650)).toBe(true)
    // the rolls are on their own streams: the same seed rolls the same, another seed need not
    const again = join(planAt(), 2000)
    expect(club(again).orders).toEqual(club(s).orders)
    // the cash left over (5000 - 7 x 650 = 450) stays with the members: yours comes back to you
    expect(club(s).bal.mara.cash).toBeGreaterThan(0)
  })

  it('a game that never joins has no club state at all', () => {
    const s = playQuarter(planAt())
    expect(s.prologue!.club).toBeUndefined()
    expect(s.prologue!.clubEnded).toBeUndefined()
    expect(s.prologue!.reports.at(-1)!.club).toBeUndefined()
  })
})

describe('the machines and the weekly split', () => {
  it('group-buy units arrive by their rolls and earn from the next quarter; Teo\'s GPUs mine from the quarter after joining', () => {
    let s = join(planAt(), 2000)
    const due = club(s).orders.filter((o) => o.deliverQuarter !== null).map((o) => o.deliverQuarter!)
    expect(due.length).toBeGreaterThan(0)
    s = through(s, '2014Q1')
    const asics = club(s).lots.filter((l) => l.kind === 'asic')
    expect(asics.length).toBe(club(s).orders.filter((o) => o.delivered && o.outcome !== 'never').length)
    for (const l of asics) expect(l.earnsFrom).toBeGreaterThan(quarterIndex('2013Q3')! - 1)
  })

  it('the output is split by shares: with the keys yours it goes to your wallet, the friends\' parts wait in their balances', () => {
    let s = join(planAt(), 5000, 'player')
    s.prologue!.club!.lots = [{ id: 'x', kind: 'asic', model: 'asic_preorder_group', count: 5, earnsFrom: s.quarter }]
    s = ok(s, { type: 'END_PLAN' })
    for (let i = 0; i < 4; i++) s = playWeek(s)
    const c = club(s)
    expect(s.treasury.BTC).toBeGreaterThan(0)
    expect(c.bal.you.BTC).toBe(0)
    const friends = c.bal.mara.BTC + c.bal.teo.BTC + c.bal.jun.BTC
    expect(friends / (friends + s.treasury.BTC)).toBeCloseTo(1 - c.shares.you, 6)
  })

  it('with the keys at Jun your share waits in the club\'s balance too', () => {
    let s = join(planAt(), 5000, 'jun')
    s.prologue!.club!.lots = [{ id: 'x', kind: 'asic', model: 'asic_preorder_group', count: 5, earnsFrom: s.quarter }]
    s = ok(s, { type: 'END_PLAN' })
    for (let i = 0; i < 4; i++) s = playWeek(s)
    expect(s.treasury.BTC).toBe(0)
    expect(club(s).bal.you.BTC).toBeGreaterThan(0)
  })

  it('Teo\'s GPUs mine the coin you pick: Litecoin, from the week it exists, with merged Dogecoin later', () => {
    let s = join(planAt('2013Q1'), 2000, 'jun')
    s = ok(s, { type: 'P0_CLUB_GPU_COIN', coin: 'LTC' })
    s.prologue!.club!.lots = [{ id: 'g', kind: 'gpu', model: 'gpu_gaming_2010', count: 2, earnsFrom: s.quarter }]
    s = ok(s, { type: 'END_PLAN' })
    s = playWeek(s)
    expect(club(s).bal.teo.BTC).toBe(0) // nothing mined on bitcoin
    expect(club(s).bal.you.LTC + club(s).bal.mara.LTC + club(s).bal.teo.LTC + club(s).bal.jun.LTC).toBeGreaterThan(0)
  })
})

describe('hosting and keys', () => {
  it('in your place the club\'s machines count against the household and the club pays you; in Mara\'s flat they do not and you pay your share', () => {
    const mine = join(planAt(), 2000, 'player', 'your_place')
    mine.prologue!.club!.lots = [{ id: 'x', kind: 'asic', model: 'asic_preorder_group', count: 3, earnsFrom: mine.quarter }]
    const host = mine.prologue!.club!.hostSiteId
    const base = siteLoadKw(planAt(), host)
    expect(siteLoadKw(mine, host) - base).toBeCloseTo(clubKw(mine.prologue!.club!), 9)
    const flat = join(planAt(), 2000, 'player', 'friends_flat')
    flat.prologue!.club!.lots = [{ id: 'x', kind: 'asic', model: 'asic_preorder_group', count: 3, earnsFrom: flat.quarter }]
    expect(siteLoadKw(flat, flat.prologue!.club!.hostSiteId)).toBe(base)
    // the money: in your place you are paid (the friends' part), in the flat you pay
    const cashAfter = (s: GameState) => {
      let t = ok(s, { type: 'END_PLAN' })
      const start = t.cash
      t = playWeek(t)
      return t.cash - start
    }
    const incomeWeek = CONTENT.prologue.rules.start.income_usd_q / 13
    mine.prologue!.club!.bal.mara.cash = 1000 // (the friends have something to pay with)
    expect(cashAfter(mine) - incomeWeek).toBeGreaterThan(0)
    expect(cashAfter(flat) - incomeWeek).toBeLessThan(0)
  })

  it('keys at Jun: a 1.5% chance a quarter, then 30-100% of everything the club holds is gone; keys yours: no such roll', () => {
    let lost = 0
    let share = 0
    const n = 4000
    for (let seed = 1; seed <= n; seed++) {
      const s = join(planAt('2013Q1', 20000, seed), 2000, 'jun')
      s.prologue!.club!.bal.jun.cash = 1000
      clubQuarterStart(s)
      if (club(s).lostUsd > 0) {
        lost++
        share += 1 - club(s).bal.jun.cash / 1000
      }
    }
    expect(lost / n).toBeGreaterThan(0.009)
    expect(lost / n).toBeLessThan(0.022)
    expect(share / lost).toBeGreaterThan(0.3)
    const mine = join(planAt(), 2000, 'player')
    mine.prologue!.club!.bal.jun.cash = 1000
    for (let q = 0; q < 200; q++) {
      mine.quarter = quarterIndex('2013Q1')! + (q % 8)
      clubQuarterStart(mine)
    }
    expect(club(mine).bal.jun.cash).toBe(1000)
  })

  it('a dead drive takes the friends\' coins held in your wallet too (keys yours)', () => {
    let s = join(planAt(), 2000, 'player')
    s.prologue!.club!.bal.teo.BTC = 4
    s = ok(s, { type: 'END_PLAN' })
    s.interrupt = { id: 'event', event: 'dead_hard_drive', week: 0, coin: 'BTC', changePct: 0 }
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accept' })
    expect(club(s).bal.teo.BTC).toBe(0)
  })
})

describe('the cards', () => {
  const withClub = (keys: 'player' | 'jun' = 'player') => {
    const s = join(planAt(), 2000, keys)
    s.prologue!.club!.bal.mara = { cash: 800, BTC: 0, LTC: 0, DOGE: 0 }
    s.prologue!.club!.bal.teo = { cash: 800, BTC: 0, LTC: 0, DOGE: 0 }
    s.prologue!.club!.bal.jun = { cash: 800, BTC: 0, LTC: 0, DOGE: 0 }
    s.prologue!.club!.lots = [{ id: 'g', kind: 'gpu', model: 'gpu_gaming_2010', count: 2, earnsFrom: s.quarter }]
    return s
  }
  /** Answers one card on screen now. */
  let before!: GameState // (the state with the card on screen, just before it is answered)
  const answer = (s: GameState, id: string, choice: string): GameState => {
    s = ok(s, { type: 'END_PLAN' })
    s.prologue!.cardQueue = [{ id, week: 1 }]
    s = advance(s)
    expect(s.interrupt?.event).toBe(id)
    before = structuredClone(s)
    return ok(s, { type: 'RESOLVE_INTERRUPT', choice })
  }
  const friendsCash = (s: GameState) => club(s).bal.mara.cash + club(s).bal.teo.cash + club(s).bal.jun.cash

  it('club_power_bill: split by shares charges each member, "pay it yourself" charges you alone, an argument costs a friendship point', () => {
    const base = withClub()
    base.prologue!.club!.lots = [{ id: 'x', kind: 'asic', model: 'asic_preorder_group', count: 4, earnsFrom: base.quarter }]
    const bill = clubKw(club(base)) * CONTENT.prologue.club!.rules.hosting.your_place.fee_from_club_usd_kw_quarter.value
    const you = club(base).shares.you
    const split = answer(structuredClone(base), 'club_power_bill', 'split')
    expect(friendsCash(before) - friendsCash(split)).toBeCloseTo(bill * (1 - you), 4)
    expect(before.cash - split.cash).toBeCloseTo(bill * you, 1) // (cash is kept in cents)
    const pay = answer(structuredClone(base), 'club_power_bill', 'pay')
    expect(friendsCash(before) - friendsCash(pay)).toBe(0)
    expect(before.cash - pay.cash).toBeCloseTo(bill, 1)
    const argue = answer(structuredClone(base), 'club_power_bill', 'argue')
    expect(club(argue).friendship).toBe(-1)
  })

  it('club_peak_cashout: buying Teo out costs his share at market value and gives you his share; letting him sell pays out his coins; refusing costs a friendship point', () => {
    const base = withClub()
    const bought = answer(structuredClone(base), 'club_peak_cashout', 'buy_out')
    const price = memberValueUsd(before, club(before), 'teo')
    expect(club(bought).members).not.toContain('teo')
    expect(club(bought).shares.you).toBeCloseTo(club(before).shares.you + club(before).shares.teo, 9)
    // (you pay his value; the cash he held in the club (800) comes to you with his share)
    expect(before.cash - bought.cash).toBeCloseTo(price - 800, -1) // (within a few dollars: weekly ticks on his coin balances)
    const refuse = answer(structuredClone(base), 'club_peak_cashout', 'wait')
    expect(club(refuse).friendship).toBe(-1)
    const sells = structuredClone(base)
    sells.prologue!.club!.bal.teo.BTC = 3
    expect(club(answer(sells, 'club_peak_cashout', 'let_sell')).bal.teo.BTC).toBe(0)
    // too poor to buy him out: the card does nothing but cost a friendship point
    const poor = structuredClone(base)
    poor.cash = 10
    expect(club(answer(poor, 'club_peak_cashout', 'buy_out')).members).toContain('teo')
  })

  it('club_gpu_flip: 1.5x what the cards cost new, paid out by shares; the GPUs go', () => {
    const base = withClub()
    const sold = answer(structuredClone(base), 'club_gpu_flip', 'sell')
    expect(club(sold).lots.filter((l) => l.kind === 'gpu')).toEqual([])
    const launch = 399 // (the 2010Q3 launch price)
    expect(friendsCash(sold) - friendsCash(before)).toBeCloseTo(2 * launch * 1.5 * (1 - club(base).shares.you), 2)
    expect(club(answer(structuredClone(base), 'club_gpu_flip', 'keep')).lots.length).toBe(1)
  })

  it('club_scrypt_box: a quarter share for the club, paid by shares; it arrives by its delay roll and mines Litecoin; the club can\'t order it without the money', () => {
    const base = withClub()
    base.quarter = quarterIndex('2014Q2')!
    const bought = answer(structuredClone(base), 'club_scrypt_box', 'buy')
    const box = club(bought).orders.find((o) => o.kind === 'scrypt_box')!
    expect(box.paidUsd).toBe(2499)
    expect(box.deliverQuarter).toBeGreaterThanOrEqual(base.quarter + 1)
    expect(box.deliverQuarter).toBeLessThanOrEqual(base.quarter + 4)
    const poor = structuredClone(base)
    poor.prologue!.club!.bal.mara.cash = 0
    poor.prologue!.club!.bal.teo.cash = 0
    poor.prologue!.club!.bal.jun.cash = 0
    expect(club(answer(poor, 'club_scrypt_box', 'buy')).orders.some((o) => o.kind === 'scrypt_box')).toBe(false)
  })

  it('club_cloud_contract: the friends\' money goes in, pays a little for two quarters and nothing after', () => {
    const base = withClub()
    base.quarter = quarterIndex('2014Q3')!
    let s = answer(structuredClone(base), 'club_cloud_contract', 'invest')
    expect(club(s).cloud?.investedUsd).toBeGreaterThan(friendsCash(before) - 5) // (less a week of hosting fees)
    expect(club(s).cloud?.investedUsd).toBeLessThan(friendsCash(before) + 5)
    expect(club(s).bal.mara.cash + club(s).bal.teo.cash + club(s).bal.jun.cash).toBe(0)
    const cashes: number[] = []
    for (let i = 0; i < 4; i++) {
      s = playQuarter(s)
      if (s.phase === 'report') s = ok(s, { type: 'NEXT_QUARTER' })
      cashes.push(club(s).bal.mara.cash + club(s).bal.teo.cash + club(s).bal.jun.cash)
    }
    // (after the first quarter nothing; then 10%, then 2% of the principal; then nothing: the sourced shutdown)
    expect(cashes[0]).toBe(0)
    expect(cashes[1]).toBeGreaterThan(cashes[0])
    // (after the shutdown nothing comes in: the balances can only fall, by the hosting fees)
    expect(cashes[3]).toBeLessThanOrEqual(cashes[2] + 1e-6)
  })
})

describe('the endings', () => {
  const rich = () => {
    const s = join(planAt('2013Q1', 200000), 5000, 'player')
    return s
  }
  const end = (s: GameState, kind: 'buy_out' | 'dissolve') => {
    s = ok(s, { type: 'END_PLAN' })
    s = through(s, '2015Q1')
    s.phase = 'live'
    s.prologue!.cardQueue = [{ id: 'club_breakup', week: 1 }]
    s.week = 0
    s = advance(s)
    expect(s.interrupt?.event).toBe('club_breakup')
    return ok(s, { type: 'RESOLVE_INTERRUPT', choice: kind })
  }

  it('buy out: you pay the friends their share, the machines and coins become yours, no club is left', () => {
    const s = end(rich(), 'buy_out')
    expect(s.prologue!.club).toBeUndefined()
    expect(s.prologue!.clubEnded).toMatchObject({ kind: 'buy_out', early: true })
    expect(s.prologue!.clubEnded!.usd).toBeGreaterThan(0)
    expect(s.machines.some((l) => l.model === 'gpu_gaming_2010' && l.count >= 2)).toBe(true)
  })

  it('dissolve: machines go at the used price, coins at the week\'s price, split by shares; you get your part in cash', () => {
    const start = rich()
    const s = end(start, 'dissolve')
    expect(s.prologue!.club).toBeUndefined()
    expect(s.prologue!.clubEnded).toMatchObject({ kind: 'dissolve', early: true })
    expect(s.machines.filter((l) => l.model === 'asic_preorder_group')).toEqual([])
  })

  it('a buy-out you cannot afford falls back to dissolving', () => {
    let s = rich()
    s = ok(s, { type: 'END_PLAN' })
    s = through(s, '2015Q1')
    s.cash = 5
    s.prologue!.club!.bal.mara.cash = 5000
    s.phase = 'live'
    s.prologue!.cardQueue = [{ id: 'club_breakup', week: 1 }]
    s.week = 0
    s = advance(s)
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'buy_out' })
    expect(s.prologue!.clubEnded!.kind).toBe('dissolve')
  })

  it('"keep the club going" carries on to the handover, where its set ending applies; nothing of it reaches Act I', () => {
    let s = join(planAt('2013Q1', 200000), 2000, 'player')
    s = ok(s, { type: 'P0_CLUB_ENDING', kind: 'dissolve' })
    s = ok(s, { type: 'END_PLAN' })
    s = through(s, '2016Q4')
    if (s.phase === 'plan') s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live') s = playWeek(s)
    expect(s.prologue!.club).toBeUndefined()
    expect(s.prologue!.clubEnded).toMatchObject({ kind: 'dissolve', early: false })
    s = ok(s, { type: 'NEXT_QUARTER' })
    const act1 = ok(s, { type: 'CONTINUE_TO_ACT_1' })
    expect(JSON.stringify(act1)).not.toContain('"club"')
  })
})

describe('saves and the books', () => {
  it('a version-8 Prologue save loads at version 9 with no club; a club survives export and import', () => {
    const s = planAt()
    const r = restoreSave(JSON.parse(JSON.stringify({ ...structuredClone(s), version: 8 })))
    expect(r.ok && r.state.version).toBe(9)
    expect(r.ok && r.state.prologue!.club).toBeUndefined()
    const withClub = playWeek(ok(join(planAt()), { type: 'END_PLAN' }))
    const back = decodeSave(encodeSave(withClub))
    expect(back.ok && back.state).toEqual(withClub)
  })

  it('every quarter reconciles with the club, in either hosting and with either keys, through to the handover', () => {
    for (const [keys, hosting] of [['player', 'your_place'], ['jun', 'friends_flat']] as const) {
      let s = join(planAt('2013Q1', 200000, 5), 3000, keys, hosting)
      s = through(s, '2016Q4')
      expect(unreconciled(s), `${keys} ${hosting}`).toEqual([])
    }
  })

  it('the club\'s assets are valued (machines at the used price, orders at what was paid)', () => {
    const s = join(planAt(), 2000)
    expect(clubAssetsUsd(s, club(s))).toBeGreaterThan(7 * 650 - 1)
  })
})
