import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import {
  newGame,
  type ContractType,
  type GameState,
} from '../../src/sim/state.ts'
import {
  checkUri,
  curtailCreditMult,
  curtailOffer,
  stormChargeUsd,
} from '../../src/sim/systems/curtailment.ts'
import { mineWeek } from '../../src/sim/systems/mining.ts'

const Q = CONTENT.quarters.indexOf('2021Q1')
const URI_WEEK = 6 // the week of 2021-02-15
const S19_KW = CONTENT.machines.find((m) => m.id === 's19pro')!.power_kw
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

/** 2021Q1, live, after week `week`: a Texas site on a `type` contract with 100 S19 Pros. */
function texas(type: ContractType, week = URI_WEEK - 1): GameState {
  const s: GameState = {
    ...newGame(1),
    phase: 'live',
    quarter: Q,
    week,
    cash: 1_000_000,
  }
  s.sites.push({
    id: 'site-2',
    tier: 'texas_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    contract: {
      type,
      price: type === 'index' ? 0.028 : 0.035,
      startQuarter: Q - 1,
      endQuarter: Q + 3,
      indexMult: type === 'index' ? 1 : undefined,
    },
  })
  s.machines.push({
    id: 'lot-9',
    model: 's19pro',
    siteId: 'site-2',
    condition: 'new',
    count: 100,
    failed: 0,
    earnsFromQuarter: 0,
  })
  return s
}
const powerCost = (s: GameState, week: number) =>
  mineWeek(s, CONTENT.market[Q][week])[0].powerCostUsd

describe('curtailment rights (sites.json power_options › curtail_credit_mult)', () => {
  it('index contracts earn 1.5× curtailment credits, fixed 1×', () => {
    const idx = texas('index')
    const fix = texas('fixed')
    expect(curtailCreditMult(idx.sites[1])).toBe(1.5)
    expect(curtailCreditMult(fix.sites[1])).toBe(1)
    const w = CONTENT.market[Q][URI_WEEK]
    // Same machines, same week: the only difference in credit is the multiplier.
    expect(curtailOffer(idx, w).creditUsd).toBeCloseTo(
      curtailOffer(fix, w).creditUsd * 1.5,
    )
  })
})

describe('Winter Storm Uri (shocks.json)', () => {
  it('the grid asks the week before (after week 6 of 2021Q1), even with the 3 interrupts used up', () => {
    const s = { ...texas('index'), interruptsThisQuarter: 3 }
    checkUri(s)
    expect(s.interrupt).toMatchObject({ id: 'uri', week: URI_WEEK - 1 })
    expect(s.interrupt!.curtail!.mw).toBeGreaterThan(0)
    expect(s.interruptsThisQuarter).toBe(3)
    const early = texas('index', URI_WEEK - 2)
    checkUri(early)
    expect(early.interrupt).toBeNull()
  })

  it('firm load: $3.00/kWh for 168 h on every delivered machine, broken included, undelivered not', () => {
    const s = texas('index')
    s.machines[0].failed = 10 // broken: still contracted load
    s.machines.push({
      id: 'lot-10',
      model: 's19pro',
      siteId: 'site-2',
      condition: 'new',
      count: 50,
      failed: 0,
      earnsFromQuarter: Q + 2, // arrives next quarter: not contracted yet
    })
    const kw = 100 * S19_KW
    expect(stormChargeUsd(s, URI_WEEK)).toBeCloseTo(kw * 168 * 3.0)
    expect(stormChargeUsd(s, URI_WEEK - 1)).toBe(0)
    expect(stormChargeUsd(texas('fixed'), URI_WEEK)).toBe(0)
  })

  it('in the storm, index machines switch themselves off (they earn nothing); fixed ones mine as usual', () => {
    const idx = mineWeek(texas('index'), CONTENT.market[Q][URI_WEEK])[0]
    expect(idx.running).toBe(false)
    expect(idx.revenueUsd).toBe(0)
    const fix = texas('fixed')
    expect(powerCost(fix, URI_WEEK)).toBeGreaterThan(0)
    expect(powerCost(fix, URI_WEEK)).toBeCloseTo(powerCost(fix, URI_WEEK - 1))
  })

  it('curtail: the Texas machines sit the storm out and the credit is paid', () => {
    let s = advance(texas('index')) // plays the week before the storm; the grid asks
    expect(s.interrupt?.id).toBe('uri')
    const credit = s.interrupt!.curtail!.creditUsd
    expect(credit).toBeGreaterThan(0) // priced at normal power, not at the storm price
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'curtail' })
    const cash = s.cash
    s = advance(s) // the storm week
    const week = s.quarterStats.weeks.at(-1)!
    expect(week.revenueUsd).toBe(0)
    expect(week.powerCostUsd).toBe(0)
    expect(s.cash).toBeCloseTo(cash + credit, 0)
  })

  it('keep mining on index: grievance +5, no revenue, and the storm charge (its own report number)', () => {
    let s = advance(texas('index'))
    const charge = s.interrupt!.curtail!.stormUsd!
    expect(charge).toBeCloseTo(100 * S19_KW * 168 * 3.0)
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'mine' })
    expect(s.siteHeat['site-2'].grievance).toBe(5)
    const cash = s.cash
    s = advance(s)
    const week = s.quarterStats.weeks.at(-1)!
    expect(week.revenueUsd).toBe(0)
    expect(week.powerCostUsd).toBeCloseTo(charge, 0)
    expect(cash - s.cash).toBeCloseTo(charge, 0)
    expect(s.quarterStats.stormChargeUsd).toBeCloseTo(charge, 0)
    expect(s.log.some((e) => e.key === 'log.storm_charge')).toBe(true)
  })

  it('the grid still asks when only the storm charge is at stake (every machine broken)', () => {
    const s = texas('index')
    s.machines[0].failed = 100
    checkUri(s)
    expect(s.interrupt?.id).toBe('uri')
    expect(s.interrupt!.curtail!.mw).toBe(0)
    expect(s.interrupt!.curtail!.stormUsd).toBeGreaterThan(0)
  })
})
