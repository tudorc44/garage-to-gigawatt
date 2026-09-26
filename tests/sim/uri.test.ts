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
} from '../../src/sim/systems/curtailment.ts'
import { mineWeek } from '../../src/sim/systems/mining.ts'

const Q = CONTENT.quarters.indexOf('2021Q1')
const URI_WEEK = 6 // the week of 2021-02-15
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

  it('keep mining: index power costs 10× that week; fixed contracts are unaffected', () => {
    const idx = texas('index')
    expect(powerCost(idx, URI_WEEK)).toBeCloseTo(
      powerCost(idx, URI_WEEK - 1) * 10,
    )
    const fix = texas('fixed')
    expect(powerCost(fix, URI_WEEK)).toBeCloseTo(powerCost(fix, URI_WEEK - 1))
  })

  it('curtail: the Texas machines sit the storm out and the credit is paid', () => {
    let s = advance(texas('index')) // plays the week before the storm; the grid asks
    expect(s.interrupt?.id).toBe('uri')
    const credit = s.interrupt!.curtail!.creditUsd
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'curtail' })
    const cash = s.cash
    s = advance(s) // the storm week
    const week = s.quarterStats.weeks.at(-1)!
    expect(week.revenueUsd).toBe(0)
    expect(week.powerCostUsd).toBe(0)
    expect(s.cash).toBeCloseTo(cash + credit, 0)
  })

  it('keep mining through it: grievance +5 at Texas, and the index bill is 10×', () => {
    let s = advance(texas('index'))
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'mine' })
    expect(s.siteHeat['site-2'].grievance).toBe(5)
    const before = s.quarterStats.weeks.at(-1)!.powerCostUsd
    s = advance(s)
    expect(s.quarterStats.weeks.at(-1)!.powerCostUsd).toBeCloseTo(
      before * 10,
      0,
    )
  })
})
