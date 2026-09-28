// Act II equity raise / at-the-market offering (M4.5; scope 0.2 §2.7, doc 18 §7.1): priced at the
// valuation now (the last report's plus this quarter's signings, M5.0d), dilution 8–30%, 1 Bandwidth,
// up to twice a quarter (M7.0, A1a).
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../src/sim/state.ts'
import {
  equityPreMoneyUsd,
  equityRaiseUsd,
  signedThisQuarterUsd,
} from '../../src/sim/systems/equity.ts'
import {
  contractWeight,
  remainingContractUsd,
} from '../../src/sim/systems/projects.ts'
import { aiEbitdaUsd } from '../../src/sim/systems/valuation.ts'
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
    expect(r.bandwidth).toBe(s.bandwidth - 1)
    expect(r.log.at(-1)!.key).toBe('log.equity_raised')
  })

  it('dilution only 8–30%; twice a quarter at the same price; public companies do it at the market', () => {
    const s = { ...valued(), bandwidth: 4 }
    expect(() => ok(s, { type: 'RAISE_EQUITY', dilution: 0.05 })).toThrow(
      'error.equity_dilution',
    )
    expect(() => ok(s, { type: 'RAISE_EQUITY', dilution: 0.31 })).toThrow(
      'error.equity_dilution',
    )
    const first = ok(s, { type: 'RAISE_EQUITY', dilution: 0.3 })
    const second = ok(first, { type: 'RAISE_EQUITY', dilution: 0.3 })
    // Both priced at the same pre-money (the last report's valuation).
    expect(second.cash - first.cash).toBeCloseTo(first.cash - s.cash, 2)
    expect(second.founderStake).toBeCloseTo(s.founderStake * 0.7 * 0.7, 12)
    expect(() => ok(second, { type: 'RAISE_EQUITY', dilution: 0.08 })).toThrow(
      'error.equity_once',
    )
    const pub = ok(
      { ...s, raisesDone: [...s.raisesDone, 'ipo_spac'] },
      { type: 'RAISE_EQUITY', dilution: 0.2 },
    )
    expect(pub.log.at(-1)!.key).toBe('log.atm_raised')
  })

  it('is priced off the valuation with this quarter’s signed contracts in it (owner, M4 answers)', () => {
    let s = valued()
    const pre = s.reports.at(-1)!.valuationUsd
    s = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    const p = s.projects[0]
    s = ok(s, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: p.id,
      offerId: p.offers[0].id,
    })
    const signed = s.projects[0]
    const added = signedThisQuarterUsd(s)
    expect(added.backlogUsd).toBeCloseTo(
      remainingContractUsd(signed) * contractWeight(signed),
      4,
    )
    expect(added.backlogUsd).toBeGreaterThan(0)
    // The first AI deal: the pivot premium's +2 on last quarter's mining EBITDA, at once.
    const r = s.reports.at(-1)!
    expect(s.firstAiDealQuarter).toBe(s.quarter)
    expect(added.pivotUsd).toBeCloseTo(
      Math.max(0, (r.ebitdaUsd - aiEbitdaUsd(r)) * 4) * 2,
      4,
    )
    expect(equityPreMoneyUsd(s)).toBeCloseTo(
      pre + added.backlogUsd + added.pivotUsd,
      4,
    )
    // Next quarter the report has them; nothing is counted twice.
    expect(signedThisQuarterUsd(playQuarter(s))).toEqual({
      backlogUsd: 0,
      pivotUsd: 0,
    })
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
