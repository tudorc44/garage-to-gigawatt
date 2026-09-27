import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { ebitdaUsd, valuationUsd } from '../../src/sim/systems/valuation.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('valuation (review A5)', () => {
  it('EBITDA is revenue minus power and rent', () => {
    expect(ebitdaUsd({ revenueUsd: 100, powerCostUsd: 30, rentUsd: 20 })).toBe(
      50,
    )
  })

  it('run-rate EBITDA × era multiple + cash + treasury', () => {
    // 2021Q3 multiple is 22×: $1M a quarter → $4M a year → $88M, plus $5M cash and $2M coins.
    expect(valuationUsd(q('2021Q3'), 1_000_000, 5_000_000, 2_000_000)).toBe(
      95_000_000,
    )
    // The same business is worth far less in 2022Q3 (4×).
    expect(valuationUsd(q('2022Q3'), 1_000_000, 0, 0)).toBe(16_000_000)
  })

  it('a loss-making quarter adds no operating value, and debt is subtracted', () => {
    expect(valuationUsd(0, -50_000, 10_000, 0)).toBe(10_000)
    expect(valuationUsd(0, 0, 10_000, 0, 4_000)).toBe(6_000)
  })

  it('has a multiple for every quarter of Act I', () => {
    for (const label of CONTENT.quarters.slice(0, actLastQuarter(1) + 1)) {
      expect(CONTENT.eraMultiple[label]).toBeGreaterThan(0)
    }
  })
})
