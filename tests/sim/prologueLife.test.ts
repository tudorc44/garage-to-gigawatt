// Life in the prologue (Alpha 0.3 §2.3, §2.4, §2.7, §2.11): the home rig, household patience and
// its card, moving out, the small unit, the wallet backup, conferences and vanity.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { addMachines } from '../../src/sim/systems/machines.ts'
import { usedOfferPrice } from '../../src/sim/prologue/life.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
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

/** A prologue game in the Plan phase of `quarter`, with `cash`. */
function planAt(quarter: string, cash = 50_000): GameState {
  const s = newPrologueGame(3)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.cash = cash
  return s
}

function playQuarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live') s = advance(s)
  return s
}

describe('the household (scope §2.3, §2.4)', () => {
  it('the home rig: $300 and 1 Bandwidth, once', () => {
    let s = planAt('2010Q3', 1000)
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    expect(s.cash).toBe(700)
    expect(s.bandwidth).toBe(1)
    expect(s.sites.map((x) => x.tier)).toEqual(['bedroom', 'home_rig'])
    expect(refused(s, { type: 'P0_BUILD_HOME_RIG' })).toBe('error.p0_have_site')
  })

  it('patience drains 15 a quarter over the threshold; at 0 the card waits in the Plan phase; its default cuts the load', () => {
    let s = planAt('2010Q3')
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    const rig = s.sites[1].id
    addMachines(s, 'gpu_gaming_2010', 'used', 3, rig) // 1.05 kW > 0.8
    s.prologue!.patience = 15
    s = playQuarter(s)
    expect(s.prologue!.patience).toBe(0)
    expect(s.prologue!.householdCard).toBe(true)
    s = ok(s, { type: 'NEXT_QUARTER' })
    expect(s.phase).toBe('plan') // 2010Q4 would auto-play
    s = ok(s, { type: 'END_PLAN' })
    expect(s.prologue!.householdCard).toBe(false)
    expect(s.prologue!.cutLoadUntil).toBe(s.quarter)
    expect(s.prologue!.patience).toBe(
      CONTENT.prologue.rules.household.patience_after_cut,
    )
  })

  it('moving out: the deposit, the garage (rigs move in), no income, rent, +1 Bandwidth next quarter', () => {
    let s = planAt('2011Q2', 10_000)
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    addMachines(s, 'gpu_gaming_2010', 'used', 2, s.sites[1].id)
    s = ok(s, { type: 'P0_MOVE_OUT' })
    expect(s.cash).toBe(10_000 - 300 - 900)
    expect(s.bandwidth).toBe(0)
    expect(s.sites.map((x) => x.tier)).toEqual(['garage'])
    expect(s.machines.every((l) => l.siteId === s.sites[0].id)).toBe(true)
    expect(s.prologue!.livingAtHome).toBe(false)
    const cash = s.cash
    s = playQuarter(s)
    expect(s.prologue!.reports.at(-1)!.incomeUsd).toBe(0)
    expect(s.prologue!.reports.at(-1)!.rentUsd).toBeCloseTo(2790, 0)
    expect(s.cash).toBeLessThan(cash)
    s = ok(s, { type: 'NEXT_QUARTER', stopHere: true })
    expect(s.bandwidth).toBe(3)
  })

  it('the small unit: after moving out, from 2014Q1, at Act I cost', () => {
    let s = planAt('2013Q4', 100_000)
    expect(refused(s, { type: 'P0_BUILD_SMALL_UNIT' })).toBe('error.p0_at_home')
    s = ok(s, { type: 'P0_MOVE_OUT' })
    s.bandwidth = 2
    expect(refused(s, { type: 'P0_BUILD_SMALL_UNIT' })).toBe('error.p0_not_yet')
    s.quarter = quarterIndex('2014Q1')!
    s = ok(s, { type: 'P0_BUILD_SMALL_UNIT' })
    expect(s.sites.map((x) => x.tier)).toEqual(['garage', 'small_unit'])
  })
})

describe('the wallet backup (scope §2.7)', () => {
  it('1 Bandwidth; a new PC-class machine lapses it; moving out lapses it', () => {
    let s = planAt('2010Q3')
    s = ok(s, { type: 'P0_BACKUP' })
    expect(s.prologue!.backup).toBe(true)
    expect(s.bandwidth).toBe(1)
    expect(refused(s, { type: 'P0_BACKUP' })).toBe('error.p0_backed_up')
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    s = ok(s, {
      type: 'P0_BUY',
      model: 'gpu_gaming_2010',
      condition: 'new',
      count: 1,
      siteId: s.sites[1].id,
    })
    expect(s.prologue!.backup).toBe(false)
  })
})

describe('money sinks (scope §2.11)', () => {
  it('a conference: its cost, then a used machine at −15% this quarter only', () => {
    let s = planAt('2013Q2')
    expect(refused(s, { type: 'P0_CONFERENCE', id: 'bitcoin2014' })).toBe(
      'error.p0_no_conference',
    )
    s = ok(s, { type: 'P0_CONFERENCE', id: 'bitcoin2013' })
    expect(s.cash).toBe(50_000 - 900)
    expect(s.prologue!.conferences).toEqual(['bitcoin2013'])
    const price = usedOfferPrice(s)!
    expect(price).toBeGreaterThan(0)
    s = ok(s, { type: 'P0_BUILD_HOME_RIG' })
    const before = s.machines.length
    s = ok(s, { type: 'P0_USED_OFFER', siteId: s.sites[1].id })
    expect(s.machines.length).toBe(before + 1)
    expect(refused(s, { type: 'P0_USED_OFFER', siteId: s.sites[1].id })).toBe(
      'error.p0_no_offer',
    )
  })

  it('vanity: cash for a line in the chapter report, once each', () => {
    let s = planAt('2013Q4')
    s = ok(s, { type: 'P0_VANITY', id: 'watch' })
    expect(s.cash).toBe(43_000)
    expect(refused(s, { type: 'P0_VANITY', id: 'watch' })).toBe(
      'error.p0_have_vanity',
    )
  })
})
