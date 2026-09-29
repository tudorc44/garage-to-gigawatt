import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import {
  aiInfraMultiple,
  ebitdaUsd,
  eraMultiple,
  valuationUsd,
} from '../../src/sim/systems/valuation.ts'

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

describe('Act II multiples (capital_act2.json, doc 18 §8)', () => {
  it('mining: the anchors, and straight lines between them', () => {
    expect(eraMultiple(q('2022Q4'))).toBe(4)
    expect(eraMultiple(q('2023Q2'))).toBe(6) // halfway from 4 (2022Q4) to 8 (2023Q4)
    expect(eraMultiple(q('2023Q4'))).toBe(8)
    expect(eraMultiple(q('2024Q4'))).toBe(9)
    expect(eraMultiple(q('2025Q4'))).toBe(7)
    // doc 18's table: 6, 6, 6, 5 through 2026 (the game's copy adds the Q1 and Q2 anchors)
    expect([39 - 3, 39 - 2, 39 - 1, 39].map((x) => eraMultiple(x))).toEqual([
      6, 6, 6, 5,
    ])
  })

  it('AI infrastructure: 10 → 20 → 26 → 30, then the 2026 compression 24 → 20 → 18 → 15', () => {
    expect(aiInfraMultiple(q('2022Q4'))).toBe(10)
    expect(aiInfraMultiple(q('2023Q4'))).toBe(20)
    // Halfway from 26 to 30, less DeepSeek's −3 in 2025Q1–Q2 (events_act2.json, M5.8).
    expect(aiInfraMultiple(q('2025Q2'))).toBe(25)
    expect(aiInfraMultiple(q('2025Q3'))).toBe(29)
    expect(aiInfraMultiple(q('2025Q4'))).toBe(30)
    expect(
      ['2026Q1', '2026Q2', '2026Q3', '2026Q4'].map((l) =>
        aiInfraMultiple(q(l)),
      ),
    ).toEqual([24, 20, 18, 15])
    expect(aiInfraMultiple(q('2022Q3'))).toBe(0) // no AI units in Act I
  })

  it('an Act II valuation uses the Act II mining multiple', () => {
    expect(valuationUsd(q('2024Q4'), 1_000_000, 0, 0)).toBe(36_000_000) // $4M a year × 9
  })
})
