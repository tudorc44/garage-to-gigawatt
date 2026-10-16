// M78.4 (doc 58 v1.1 §3): life after the Merge. Alternative-coin income interpolated by date, rental earnings and power, the choice
// action and its limits, and that a lot with no choice is untouched.
import { describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { ledgerQuarters } from '../../src/sim/ledger.ts'
import { addMachines } from '../../src/sim/systems/machines.ts'
import { altCoinPer60, lotPlan, rentalOn } from '../../src/sim/systems/afterMerge.ts'
import { getModel } from '../../src/sim/systems/market.ts'
import { lotChoices } from '../../src/sim/ventures12Views.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

describe('the income tables, interpolated by date', () => {
  it('hits the listed points and holds at the ends', () => {
    expect(altCoinPer60('etc', '2022-09-15')).toBeCloseTo(0.25, 9)
    expect(altCoinPer60('etc', '2022-10-15')).toBeCloseTo(0.2, 9)
    expect(altCoinPer60('rvn', '2022-10-15')).toBeCloseTo(0.25, 9)
    expect(altCoinPer60('erg', '2023-06-15')).toBeCloseTo(0.2, 9)
    expect(altCoinPer60('etc', '2026-10-15')).toBeCloseTo(0.03, 9)
    expect(altCoinPer60('etc', '2030-01-01')).toBeCloseTo(0.03, 9)
    expect(altCoinPer60('rvn', '2022-09-20')).toBeCloseTo(0.25, 9) // before its first point the first value holds
    const mid = altCoinPer60('etc', '2023-01-15')
    expect(mid).toBeLessThan(0.2)
    expect(mid).toBeGreaterThan(0.12)
  })

  it('rental: Gen 2 at 12% in 2022Q4, 30% in 2023Q3; Gen 1 half of each', () => {
    expect(rentalOn('2022-10-01')).toEqual({ rate: 0.1, utilisation: 0.12 })
    expect(rentalOn('2023-07-01')).toEqual({ rate: 0.12, utilisation: 0.3 })
    expect(rentalOn('2023-07-01', true)).toEqual({ rate: 0.06, utilisation: 0.15 })
    const r = rentalOn('2026-10-01')
    expect(r.rate).toBeCloseTo(0.065, 9)
    expect(r.utilisation).toBeCloseTo(0.2, 9)
  })

  it('a Gen 2 rig in 2023Q3 earns about $5.20 a day rented (6 x 0.12 x 24 x 0.30)', () => {
    const lot = { id: 'x', model: 'gpu_gen2', siteId: 's', condition: 'new' as const, count: 1, failed: 0, earnsFromQuarter: 0, use: 'rent' as const }
    const plan = lotPlan(lot, getModel('gpu_gen2')!, '2023-07-03')!
    expect(plan.revenuePerUnitDay).toBeCloseTo(5.184 + 0.0, 0)
    expect(plan.powerShare).toBeGreaterThan(0.29)
  })
})

describe('the choice', () => {
  function company() {
    const s = act2Company('2022Q4')
    addMachines(s, 'gpu_gen2', 'new', 10, 'site-2')
    s.machines[0].earnsFromQuarter = 0
    return s
  }

  it('is open in Act II only, for GPU rigs only', () => {
    const s = company()
    const id = s.machines[0].id
    expect(applyAction(s, { type: 'SET_LOT_USE', lotId: id, use: 'etc' }).ok).toBe(true)
    expect(applyAction({ ...s, act: 1 }, { type: 'SET_LOT_USE', lotId: id, use: 'etc' }).ok).toBe(false)
    const b = addMachines(s, 's9', 'new', 1, 'site-2')
    expect(applyAction(s, { type: 'SET_LOT_USE', lotId: b.id, use: 'etc' }).ok).toBe(false)
    expect(applyAction(s, { type: 'SET_LOT_USE', lotId: id, use: 'bogus' as never }).ok).toBe(false)
  })

  it('a lot on rental books mining_other and pays power only on rented hours; a lot on no choice earns nothing after the Merge', () => {
    const base = company()
    const plain = playQuarter(base)
    const rented = playQuarter(ok(base, { type: 'SET_LOT_USE', lotId: base.machines[0].id, use: 'rent' }))
    const lines = (st: typeof plain) => ledgerQuarters(st).find((l) => l.q === quarterIndex('2022Q4'))!.lines
    expect(lines(plain).mining_other ?? 0).toBe(0)
    expect(lines(rented).mining_other ?? 0).toBeGreaterThan(0)
    expect(rented.cash).toBeGreaterThan(plain.cash)
  })

  it('the views list sell, own coin, each alt coin and rent for a Gen 2 lot', () => {
    const rows = lotChoices(company())
    expect(rows[0].options.map((o) => o.use)).toEqual(['own', 'etc', 'rvn', 'erg', 'rent'])
    expect(rows[0].options[0].grossQuarterUsd).toBe(0)
    expect(rows[0].saleUsd).toBeGreaterThan(0)
  })
})
