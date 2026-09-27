// Act II capital content (M4.1): lenders.json in the game, the rate paths, the DDTL spread split by
// tenant credit, how tenant ratings read, and the equipment loan in Act II.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import {
  ddtlRate,
  ddtlSpreadBps,
  isInvestmentGrade,
  projectDebtRate,
  ratingRank,
  sofr,
} from '../../src/sim/systems/finance.ts'
import { equipmentTerms } from '../../src/sim/systems/loans.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('lenders.json in the game', () => {
  it('project debt: 60–75% of capex, rate 10.5% → 8.5% → 7.0% → 7.5%, held at the ends', () => {
    expect(CONTENT.finance.projectDebt.ltv).toEqual([0.6, 0.75])
    expect(projectDebtRate(q('2022Q4'))).toBeCloseTo(0.105, 9)
    expect(projectDebtRate(q('2023Q3'))).toBeCloseTo(0.105, 9)
    expect(projectDebtRate(q('2024Q2'))).toBeCloseTo(0.093, 9) // 3/5 of the way to 8.5%
    expect(projectDebtRate(q('2024Q4'))).toBeCloseTo(0.085, 9)
    expect(projectDebtRate(q('2025Q4'))).toBeCloseTo(0.07, 9)
    expect(projectDebtRate(q('2026Q4'))).toBeCloseTo(0.075, 9)
  })

  it('DDTL spread: the market file’s 900 → 800 → … → 420 bps, then split by tenant credit in 2026', () => {
    expect(ddtlSpreadBps(q('2022Q4'), false)).toBe(900) // before the first DDTL: its first value
    expect(ddtlSpreadBps(q('2023Q3'), false)).toBe(900)
    expect(ddtlSpreadBps(q('2024Q4'), true)).toBe(550)
    expect(ddtlSpreadBps(q('2025Q4'), false)).toBe(420)
    expect(ddtlSpreadBps(q('2026Q1'), true)).toBe(225)
    expect(ddtlSpreadBps(q('2026Q1'), false)).toBe(420)
    expect(ddtlSpreadBps(q('2026Q4'), false)).toBe(475)
    expect(sofr(q('2023Q4'))).toBeCloseTo(0.0533, 9)
    expect(ddtlRate(q('2023Q4'), false)).toBeCloseTo(0.0533 + 0.08, 9)
  })

  it('the rating matrix, range and runway notch', () => {
    const r = CONTENT.finance.rating
    expect(r.matrix.lt2).toEqual({ weak: 'B+', mixed: 'BB', strong: 'BBB' })
    expect(r.matrix.gt6.weak).toBe('CCC-')
    expect([r.min, r.max]).toEqual(['CCC-', 'BBB'])
    expect([r.runwayQuarters, r.runwayNotches]).toEqual([4, -1])
    expect(CONTENT.finance.equity.dilution).toEqual([0.08, 0.2])
    expect(CONTENT.finance.backstop.equity).toEqual([0.03, 0.06])
  })
})

describe('tenant ratings', () => {
  it('read the first grade of a card’s rating', () => {
    expect(ratingRank('A/AA')).toBe(ratingRank('A'))
    expect(ratingRank('AA')).toBe(ratingRank('A'))
    expect(ratingRank('BB (backstopped to A)')).toBe(ratingRank('BB'))
    expect(ratingRank('B+ (rising)')).toBe(ratingRank('B+'))
    expect(isInvestmentGrade('BBB')).toBe(true)
    expect(isInvestmentGrade('A/AA')).toBe(true)
    expect(isInvestmentGrade('BB')).toBe(false)
    expect(isInvestmentGrade('n/a')).toBe(false)
  })
})

describe('the equipment loan in Act II', () => {
  it('is always offered, on the last Act I era’s terms', () => {
    expect(equipmentTerms(q('2022Q3'))).toBeUndefined() // Act I 2022: until 2022Q2
    for (const label of ['2022Q4', '2024Q2', '2026Q4'])
      expect(equipmentTerms(q(label))).toMatchObject({
        ltv: 0.5,
        apr: 0.14,
        tenorQuarters: 8,
      })
  })
})
