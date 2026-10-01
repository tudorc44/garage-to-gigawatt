// M18.1: the corporate facility (secured on the company): drawn by a card, interest each quarter end, a bullet 12
// quarters after the draw, repaid early from Capital (0 BW, logs debt_repay); it counts in debt like other debt, and
// unpaid service goes through the quarter-end liquidity path.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { debtStackView } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type QuarterReport } from '../../src/sim/state.ts'
import {
  corporateApr,
  drawCorporate,
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
