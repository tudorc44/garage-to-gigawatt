// M18.1: the corporate facility (secured on the company): drawn by a card, interest each quarter end, a bullet 12
// quarters after the draw, repaid early from Capital (0 BW, logs debt_repay); it counts in debt like other debt, and
// unpaid service goes through the quarter-end liquidity path.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { debtStackView, standbyView } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type QuarterReport } from '../../src/sim/state.ts'
import {
  autoDrawStandby,
  corporateApr,
  drawCorporate,
  drawStandby,
  expireStandby,
  settleStandbyFee,
  standbyArrangeBlocker,
  standbyDrawBlocker,
  standbyTerms,
  standbyUndrawnUsd,
} from '../../src/sim/systems/corporateDebt.ts'
import { serviceFacilities } from '../../src/sim/systems/facilities.ts'
import { debtUsd, ratingLoanBand } from '../../src/sim/systems/loans.ts'
import { sofr } from '../../src/sim/systems/finance.ts'
import { scheduledObligations } from '../../src/sim/systems/runway.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function co(label = '2027Q2'): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = q(label)
  s.act3Renewals = []
  s.creditRating = 'BB'
  return s
}

describe('the corporate facility', () => {
  it('rate = SOFR + the rating band’s spread + any debt_spread_add + its own spread', () => {
    const s = co()
    s.events.spreadAddBps = 150
    expect(corporateApr(s, -25)).toBeCloseTo(
      sofr(s.quarter, 's0') + ratingLoanBand('BB').spread + 0.015 - 0.0025,
      9,
    )
  })

  it('drawn: cash in, a bullet 12 quarters on; counted in debt; on the debt stack with Repay and in the runway', () => {
    const s = co()
    const cash = s.cash
    const before = debtUsd(s)
    drawCorporate(s, 20_000_000, -25)
    expect(s.cash).toBe(cash + 20_000_000)
    expect(debtUsd(s) - before).toBe(20_000_000)
    const f = s.facilities[0]
    expect(f).toMatchObject({ kind: 'corporate', projectId: '', dueQuarter: q('2027Q2') + 12 })
    const row = debtStackView(s).rows.find((r) => r.kind === 'corporate')!
    expect(row).toMatchObject({ maturity: '2030Q2', facilityId: f.id, repayBlocked: null })
    // (the runway looks at the quarter after a report's: last quarter's report → this quarter)
    const report = { quarter: CONTENT.quarters[s.quarter - 1] } as QuarterReport
    const items = scheduledObligations(s, report).items
    expect(items.find((i) => i.kind === 'corporate')!.usd).toBeCloseTo((20_000_000 * f.apr) / 4, 2)
  })

  it('each quarter end: interest only; in its due quarter: interest and the whole principal', () => {
    const s = co()
    drawCorporate(s, 10_000_000, 0)
    const f = s.facilities[0]
    let cash = s.cash
    let paid = serviceFacilities(s)
    expect(paid.interestUsd).toBeCloseTo((10_000_000 * f.apr) / 4, 2)
    expect(paid.principalUsd).toBe(0)
    expect(s.cash).toBeCloseTo(cash - paid.interestUsd, 2)
    s.quarter = f.dueQuarter!
    cash = s.cash
    paid = serviceFacilities(s)
    expect(paid.principalUsd).toBe(10_000_000)
    expect(s.facilities).toEqual([])
    expect(s.log.at(-1)!.key).toBe('log.corporate_due')
    expect(s.cash).toBeCloseTo(cash - 10_000_000 - paid.interestUsd, 2)
  })

  it('unpaid service drives cash below zero (no missed-quarter count): the quarter-end liquidity path follows', () => {
    const s = co()
    drawCorporate(s, 10_000_000, 0)
    s.cash = 0
    serviceFacilities(s)
    expect(s.cash).toBeLessThan(0)
    expect(s.facilities[0].missedQuarters).toBe(0)
  })

  it('repay early from Capital: 0 Bandwidth, logs debt_repay; greyed without the cash', () => {
    const s = co()
    s.phase = 'plan'
    drawCorporate(s, 10_000_000, 0)
    const id = s.facilities[0].id
    const bw = s.bandwidth
    const r = applyAction(s, { type: 'REPAY_COMPANY_FACILITY', facilityId: id })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.facilities).toEqual([])
    expect(r.state.bandwidth).toBe(bw)
    expect(r.state.act3Moves!.at(-1)!.kind).toBe('debt_repay')
    const poor = co()
    poor.phase = 'plan'
    drawCorporate(poor, 10_000_000, 0)
    poor.cash = 5_000_000
    const p = applyAction(poor, { type: 'REPAY_COMPANY_FACILITY', facilityId: poor.facilities[0].id })
    expect(p.ok).toBe(false)
    if (!p.ok) expect(p.error.key).toBe('error.no_cash')
  })
})

describe('the standby liquidity facility (M18.2, F-7)', () => {
  /** A BB company valued at `valuationUsd` (its last report), in the Plan phase. */
  function sb(valuationUsd = 1_000_000_000, label = '2027Q1'): GameState {
    const s = co(label)
    s.phase = 'plan'
    s.bandwidth = 6
    s.reports = [{ quarter: '2026Q4', valuationUsd } as QuarterReport]
    return s
  }
  const ok = (s: GameState, a: Action) => {
    const r = applyAction(s, a)
    if (!r.ok) throw new Error(r.error.key)
    return r.state
  }

  it('arrange: 20% of the valuation (at most $500M), 1% upfront, 1 BW, logs hedge; one at a time', () => {
    const s = sb()
    const t = ok(s, { type: 'STANDBY_ARRANGE' })
    expect(t.act3Standby).toEqual({
      arrangedQuarter: q('2027Q1'),
      sizeUsd: 200_000_000,
      spreadBps: 350,
      untilQuarter: q('2027Q1') + 8,
    })
    expect(s.cash - t.cash).toBe(2_000_000)
    expect(s.bandwidth - t.bandwidth).toBe(1)
    expect(t.act3Moves!.at(-1)!.kind).toBe('hedge')
    expect(standbyArrangeBlocker(t)).toEqual({ key: 'error.standby_held' })
    expect(standbyTerms(sb(5_000_000_000)).sizeUsd).toBe(500_000_000)
  })

  it('arrange is blocked below BB− or with a payment late (and outside Act III)', () => {
    const low = sb()
    low.creditRating = 'B+'
    expect(standbyArrangeBlocker(low)).toEqual({ key: 'error.standby_rating', params: { rating: 'BB-' } })
    const late = sb()
    drawCorporate(late, 1_000_000, 0)
    late.facilities[0].missedQuarters = 1
    expect(standbyArrangeBlocker(late)).toEqual({ key: 'error.standby_late' })
    const act2 = act2Company('2026Q1')
    expect(standbyArrangeBlocker(act2)).toEqual({ key: 'error.act3_only' })
  })

  it('draw: from the next quarter, up to the undrawn part, even while lenders are frozen; each draw a bullet 8 quarters on, unlogged as a move', () => {
    const s = ok(sb(), { type: 'STANDBY_ARRANGE' })
    expect(standbyDrawBlocker(s, 1_000_000)).toEqual({ key: 'error.standby_next_quarter' })
    s.quarter = q('2027Q2')
    expect(standbyDrawBlocker(s, 300_000_000)).toEqual({
      key: 'error.standby_too_much',
      params: { amountUsd: 200_000_000 },
    })
    const moves = s.act3Moves!.length
    const t = ok(s, { type: 'STANDBY_DRAW', amountUsd: 50_000_000 })
    const f = t.facilities.find((x) => x.kind === 'standby')!
    expect(f).toMatchObject({ amountUsd: 50_000_000, dueQuarter: q('2027Q2') + 8 })
    expect(f.apr).toBeCloseTo(sofr(q('2027Q2'), 's0') + 0.035, 9)
    expect(standbyUndrawnUsd(t)).toBe(150_000_000)
    expect(t.act3Moves!.length).toBe(moves)
    expect(standbyView(t)!.held).toMatchObject({ undrawnUsd: 150_000_000, untilQuarter: '2029Q1' })
    expect(standbyView(t)!.drawnUsd).toBe(50_000_000)
  })

  it('the commitment fee: 0.50% a year on the undrawn part, each quarter', () => {
    const s = ok(sb(), { type: 'STANDBY_ARRANGE' })
    s.quarter = q('2027Q2')
    drawStandby(s, 40_000_000)
    const cash = s.cash
    expect(settleStandbyFee(s)).toBeCloseTo((160_000_000 * 0.005) / 4, 2)
    expect(cash - s.cash).toBeCloseTo(200_000, 2)
  })

  it('short of cash at the quarter end: drawn automatically, up to the shortfall, before any forced sale', () => {
    const s = ok(sb(), { type: 'STANDBY_ARRANGE' })
    s.quarter = q('2027Q2')
    s.cash = -30_000_000
    autoDrawStandby(s)
    expect(s.cash).toBe(0)
    expect(s.facilities.find((x) => x.kind === 'standby')!.amountUsd).toBe(30_000_000)
    expect(s.log.at(-1)!.key).toBe('log.standby_auto_drawn')
    // the shortfall beyond what's left stays (the liquidity path takes it from there)
    s.cash = -400_000_000
    autoDrawStandby(s)
    expect(s.cash).toBe(-400_000_000 + 170_000_000)
  })

  it('expires after 8 quarters (its draws stay until their bullets), then can be arranged again', () => {
    const s = ok(sb(), { type: 'STANDBY_ARRANGE' })
    s.quarter = q('2027Q2')
    drawStandby(s, 10_000_000)
    s.quarter = q('2029Q1')
    expireStandby(s)
    expect(s.act3Standby).toBeUndefined()
    expect(s.log.at(-1)!.key).toBe('log.standby_expired')
    expect(s.facilities.some((x) => x.kind === 'standby')).toBe(true)
    expect(standbyArrangeBlocker(s)).toBeUndefined()
  })
})
