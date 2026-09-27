// Act II equity raise / at-the-market offering (M4.5; scope 0.2 §2.7, doc 18 §7.1): priced at the
// last valuation, dilution 8–20%, 2 Bandwidth, once a quarter.
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../src/sim/state.ts'
import { equityRaiseUsd } from '../../src/sim/systems/equity.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

/** An Act II company with a first quarter report (its valuation prices the raise). */
function valued(): GameState {
  return playQuarter(act2Company('2023Q3'))
}

describe('the equity raise', () => {
  it('raises pre-money × d ÷ (1 − d) and dilutes the founder by d', () => {
    const s = valued()
    const pre = s.reports.at(-1)!.valuationUsd
    expect(equityRaiseUsd(s, 0.1)).toBe(Math.floor((pre * 0.1) / 0.9))
    const r = ok(s, { type: 'RAISE_EQUITY', dilution: 0.1 })
    expect(r.cash).toBe(s.cash + equityRaiseUsd(s, 0.1))
    expect(r.founderStake).toBeCloseTo(s.founderStake * 0.9, 12)
    expect(r.bandwidth).toBe(s.bandwidth - 2)
    expect(r.log.at(-1)!.key).toBe('log.equity_raised')
  })

  it('dilution only 8–20%; once a quarter; public companies do it at the market', () => {
    const s = valued()
    expect(() => ok(s, { type: 'RAISE_EQUITY', dilution: 0.05 })).toThrow(
      'error.equity_dilution',
    )
    expect(() => ok(s, { type: 'RAISE_EQUITY', dilution: 0.25 })).toThrow(
      'error.equity_dilution',
    )
    const once = ok(s, { type: 'RAISE_EQUITY', dilution: 0.08 })
    expect(() => ok(once, { type: 'RAISE_EQUITY', dilution: 0.08 })).toThrow(
      'error.equity_once',
    )
    const pub = ok(
      { ...s, raisesDone: [...s.raisesDone, 'ipo_spac'] },
      { type: 'RAISE_EQUITY', dilution: 0.2 },
    )
    expect(pub.log.at(-1)!.key).toBe('log.atm_raised')
  })

  it('needs a valuation (a report) and Act II', () => {
    expect(() =>
      ok(act2Company('2023Q3'), { type: 'RAISE_EQUITY', dilution: 0.1 }),
    ).toThrow('error.equity_no_value')
    const s = valued()
    expect(() =>
      ok({ ...s, act: 1 }, { type: 'RAISE_EQUITY', dilution: 0.1 }),
    ).toThrow('error.act2_only')
  })
})
