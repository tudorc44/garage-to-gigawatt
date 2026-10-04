// M18.13 (DT): the Act III leverage covenant. Each Act III quarter end tests company LTV (debt ÷ valuation) against
// max(75%, entry LTV + 5 points). A breach bars new debt, sweeps half the operating cash flow into debt (highest rate
// first) from the next quarter end, and must reach the limit − 10 points by the end of the 2nd quarter after; missed,
// forced sales (× 0.85) run, and if they fall short the lenders call the rest.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { covenantView } from '../../src/sim/selectors.ts'
import {
  emptyQuarterStats,
  toAct3,
  type GameState,
  type QuarterReport,
} from '../../src/sim/state.ts'
import {
  companyLtv,
  covenantCureLtv,
  covenantLimit,
  covenantSweep,
  prepayDebt,
  testCovenant,
} from '../../src/sim/systems/covenant.ts'
import {
  drawCorporate,
  standbyDrawBlocker,
  arrangeStandby,
} from '../../src/sim/systems/corporateDebt.ts'
import { borrowBlocker, debtUsd } from '../../src/sim/systems/loans.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function co(label = '2027Q2'): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = q(label)
  s.act3Renewals = []
  s.creditRating = 'BB'
  // a known entry: debt 30% of value
  s.act3Entry = { ...s.act3Entry!, debtUsd: 30_000_000, valuationUsd: 100_000_000 }
  return s
}

/** A report whose valuation puts the company's LTV at `ltv`. */
function reportAt(s: GameState, ltv: number): QuarterReport {
  return { valuationUsd: debtUsd(s) / ltv, cash: s.cash } as QuarterReport
}

describe('the leverage covenant (M18.13)', () => {
  it('the limit is max(75%, entry LTV + 5 points); the cure level 10 points under', () => {
    const s = co()
    expect(covenantLimit(s)).toBe(0.75)
    expect(covenantCureLtv(s)).toBeCloseTo(0.65, 9)
    s.act3Entry = { ...s.act3Entry!, debtUsd: 80_000_000, valuationUsd: 100_000_000 }
    expect(covenantLimit(s)).toBeCloseTo(0.85, 9)
    expect(covenantCureLtv(s)).toBeCloseTo(0.75, 9)
    expect(BALANCE.act3.covenant).toEqual({
      floorLtv: 0.75,
      entryHeadroom: 0.05,
      cureMargin: 0.1,
      cureQuarters: 2,
      sweepShare: 0.5,
    })
  })

  it('under the limit: no breach; the report carries the test', () => {
    const s = co()
    drawCorporate(s, 50_000_000, 0)
    const r = reportAt(s, 0.7)
    testCovenant(s, r)
    expect(s.covenantBreach).toBeUndefined()
    expect(r.covenant).toEqual({ ltv: expect.closeTo(0.7, 9), limit: 0.75, cureLtv: expect.closeTo(0.65, 9) })
  })

  it('above it: a breach to cure by the end of the 2nd quarter after; no new debt, but the standby still draws', () => {
    const s = co()
    arrangeStandby(s)
    drawCorporate(s, 50_000_000, 0)
    const r = reportAt(s, 0.8)
    testCovenant(s, r)
    expect(s.covenantBreach).toEqual({ fromQuarter: q('2027Q2'), untilQuarter: q('2027Q4') })
    expect(s.log.at(-1)!.key).toBe('log.covenant_breach')
    expect(r.covenant!.untilQuarter).toBe(q('2027Q4'))
    expect(covenantView(s)!.breach).toEqual({ untilQuarter: '2027Q4' })
    expect(borrowBlocker(s, 1_000_000)).toEqual({ key: 'error.covenant_breach' })
    const facilities = s.facilities.length
    drawCorporate(s, 10_000_000, 0)
    expect(s.facilities.length).toBe(facilities)
    expect(s.log.at(-1)!.key).toBe('log.covenant_no_debt')
    s.quarter++
    // (this test company's standby is sized at $0; the breach isn't what blocks it)
    expect(standbyDrawBlocker(s, 1_000_000)?.key).not.toBe('error.covenant_breach')
  })

  it('the sweep: from the next quarter end, half of (EBITDA − interest) prepays debt, highest rate first', () => {
    const s = co()
    drawCorporate(s, 50_000_000, 0)
    drawCorporate(s, 20_000_000, 300)
    testCovenant(s, reportAt(s, 0.8))
    // not in the quarter the breach was found
    expect(covenantSweep(s)).toBe(0)
    s.quarter++
    s.cash = 100_000_000
    s.quarterStats = { ...emptyQuarterStats(), revenueUsd: 30_000_000, interestUsd: 2_000_000 }
    const debt = debtUsd(s)
    const dear = s.facilities.reduce((a, f) => (f.apr > a.apr ? f : a))
    const dearBefore = dear.balanceUsd
    const swept = covenantSweep(s)
    expect(swept).toBeCloseTo(0.5 * (30_000_000 - 2_000_000), 2)
    expect(debtUsd(s)).toBeCloseTo(debt - swept, 2)
    // the dearest loan is paid first (it's at least as big as the sweep here, or gone)
    expect(dearBefore - (s.facilities.includes(dear) ? dear.balanceUsd : 0)).toBeCloseTo(
      Math.min(dearBefore, swept),
      2,
    )
    expect(s.log.at(-1)!.key).toBe('log.covenant_sweep')
  })

  it('prepayDebt never spends cash the company doesn’t have', () => {
    const s = co()
    drawCorporate(s, 10_000_000, 0)
    s.cash = 4_000_000
    expect(prepayDebt(s, 10_000_000)).toBe(4_000_000)
    expect(s.cash).toBe(0)
  })

  it('cured when LTV is back to the cure level: logged, new debt open again', () => {
    const s = co()
    drawCorporate(s, 50_000_000, 0)
    testCovenant(s, reportAt(s, 0.8))
    s.quarter++
    testCovenant(s, reportAt(s, 0.7))
    expect(s.covenantBreach).toBeDefined()
    s.quarter++
    testCovenant(s, reportAt(s, 0.6))
    expect(s.covenantBreach).toBeUndefined()
    expect(s.log.at(-1)!.key).toBe('log.covenant_cured')
    expect(borrowBlocker(s, 1_000_000)?.key).not.toBe('error.covenant_breach')
  })

  it('missed at the deadline with nothing to sell: the lenders call what is left (cash below zero → the rescue path)', () => {
    const s = co()
    for (const p of s.projects) p.stage = 'ended'
    drawCorporate(s, 50_000_000, 0)
    testCovenant(s, reportAt(s, 0.9))
    s.quarter = s.covenantBreach!.untilQuarter
    s.cash = 10_000_000
    const owed = s.facilities.reduce((a, f) => a + f.balanceUsd, 0) + (s.equipmentLoan?.balanceUsd ?? 0)
    testCovenant(s, reportAt(s, 0.9))
    expect(s.covenantBreach).toBeUndefined()
    expect(s.facilities).toEqual([])
    expect(s.log.at(-1)!.key).toBe('log.covenant_called')
    expect(s.cash).toBeCloseTo(10_000_000 - owed, 2)
  })

  it('Act II: no test', () => {
    const s = act2Company('2026Q4')
    const r = { valuationUsd: 1 } as QuarterReport
    testCovenant(s, r)
    expect(r.covenant).toBeUndefined()
    expect(companyLtv(s, 1)).toBeGreaterThanOrEqual(0)
  })
})
