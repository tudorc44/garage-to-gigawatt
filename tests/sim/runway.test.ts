// The cash runway looks one quarter ahead at contractual amounts (M9.0): last quarter's EBITDA less the
// debt payments already fixed for the coming quarter (loans' schedule, the bridge with its step to
// amortising, project debt and DDTLs of projects that are live by then). The rating rule is unchanged.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import {
  roundCents,
  type EquipmentLoan,
  type Facility,
  type QuarterReport,
} from '../../src/sim/state.ts'
import { serviceDueUsd } from '../../src/sim/systems/facilities.ts'
import { payLoanWeek } from '../../src/sim/systems/loans.ts'
import { ratingInputs } from '../../src/sim/systems/rating.ts'
import {
  runway,
  scheduledObligations,
} from '../../src/sim/systems/runway.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A minimal report for the quarter before `state.quarter`, with a given EBITDA. */
function reportFor(label: string, ebitdaUsd: number): QuarterReport {
  return { quarter: label, ebitdaUsd } as QuarterReport
}

function loan(balanceUsd: number, weeksLeft: number): EquipmentLoan {
  return {
    amountUsd: balanceUsd,
    balanceUsd,
    apr: 0.08,
    weeklyPrincipalUsd: roundCents(balanceUsd / weeksLeft),
    weeksLeft,
    takenQuarter: q('2022Q4'),
  }
}

describe('scheduled obligations', () => {
  it('an equipment loan: a quarter of its weekly payments, exactly as payLoanWeek pays them', () => {
    const s = act2Company('2023Q2')
    s.equipmentLoan = loan(20_000_000, 104)
    const items = scheduledObligations(s, reportFor('2023Q1', 0)).items
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('equipment_loan')
    const c = structuredClone(s)
    let paid = 0
    for (let w = 0; w < BALANCE.weeksPerQuarter; w++) {
      const p = payLoanWeek(c)
      paid += p.interestUsd + p.principalUsd
    }
    expect(items[0].usd).toBeCloseTo(paid, 2)
  })

  it('the bridge: the coming payment, with its step from interest only to amortising', () => {
    const io = BALANCE.lifeline.bridgeInterestOnlyQuarters
    const first = q('2022Q4')
    const s = act2Company('2022Q4')
    s.bridgeLoan = {
      amountUsd: 10_950_000,
      balanceUsd: 10_950_000,
      apr: 0.14,
      takenQuarter: first,
      dueQuarter: first + 11,
    }
    // The last interest-only quarter has just ended (state and report at the quarter's end): the coming one amortises.
    s.quarter = first + io - 1
    const atEnd = scheduledObligations(s, reportFor(CONTENT.quarters[s.quarter], 0))
    const bridgeEnd = atEnd.items.find((i) => i.kind === 'bridge')!
    expect(bridgeEnd.phase).toBe('amortising')
    expect(bridgeEnd.usd).toBeGreaterThan(10_950_000 / 8)
    // The next Plan phase (the quarter has started, payments not yet made): the same coming payment.
    const s2 = structuredClone(s)
    s2.quarter = first + io
    const inPlan = scheduledObligations(s2, reportFor(CONTENT.quarters[first + io - 1], 0))
    expect(inPlan.items.find((i) => i.kind === 'bridge')!.usd).toBeCloseTo(
      bridgeEnd.usd,
      2,
    )
    // Before the step: interest only, a small payment.
    s.quarter = first
    expect(
      scheduledObligations(s, reportFor(CONTENT.quarters[first], 0)).items.find(
        (i) => i.kind === 'bridge',
      )!.phase,
    ).toBe('interest_only')
  })

  it('project debt: interest plus a slice once the project is live (or goes live by then); nothing while it builds', () => {
    const s = act2Company('2024Q2')
    const base = {
      kw: 5000,
      kind: 'shell',
      gpu: null,
      openedQuarter: q('2024Q1'),
      offers: [],
      tenant: null,
      spot: false,
      capital: 'cash',
      capexUsd: 0,
      gpuCapexUsd: 0,
      gpuCount: 0,
      startQuarter: q('2024Q1'),
      soldQuarter: null,
      siteId: 'site-2',
    }
    s.projects.push(
      ...([
      { ...base, id: 'project-1', n: 1, stage: 'live', readyQuarter: q('2024Q2') },
      { ...base, id: 'project-2', n: 2, stage: 'building', readyQuarter: q('2024Q3') },
      { ...base, id: 'project-3', n: 3, stage: 'building', readyQuarter: q('2025Q1') },
    ] as never[]),
    )
    const fac = (projectId: string): Facility => ({
      id: `f-${projectId}`,
      kind: 'project_debt',
      projectId,
      amountUsd: 40_000_000,
      balanceUsd: 40_000_000,
      apr: 0.08,
      tenorQuarters: 20,
      drawnQuarter: q('2024Q1'),
      missedQuarters: 0,
      rating: 'BBB',
    })
    s.facilities.push(fac('project-1'), fac('project-2'), fac('project-3'))
    // The report is for 2024Q2; the coming quarter is 2024Q3.
    const items = scheduledObligations(s, reportFor('2024Q2', 0)).items
    const byN = (n: number) => items.find((i) => i.projectN === n)
    const due = serviceDueUsd(s, s.facilities[0])
    expect(byN(1)!.usd).toBeCloseTo(due.interestUsd + due.principalUsd, 2) // live now
    expect(byN(2)!.usd).toBeCloseTo(due.interestUsd + due.principalUsd, 2) // live by 2024Q3
    expect(byN(3)).toBeUndefined() // still building: interest is capitalised, no cash
  })
})

describe('the runway', () => {
  it('is null when EBITDA covers the fixed payments, else cash ÷ the burn', () => {
    const s = act2Company('2023Q2')
    s.equipmentLoan = loan(20_000_000, 104)
    s.cash = 6_000_000
    const scheduled = scheduledObligations(s, reportFor('2023Q1', 0)).totalUsd
    expect(runway(s, reportFor('2023Q1', scheduled + 1)).quarters).toBeNull()
    const burning = runway(s, reportFor('2023Q1', scheduled - 1_000_000))
    expect(burning.flowUsd).toBeCloseTo(-1_000_000, 2)
    expect(burning.quarters).toBeCloseTo(6, 6)
  })

  it('looks ahead: a bridge about to start amortising shortens it (last quarter\'s payments would not have shown it)', () => {
    const io = BALANCE.lifeline.bridgeInterestOnlyQuarters
    const first = q('2022Q4')
    const s = act2Company('2022Q4')
    s.bridgeLoan = {
      amountUsd: 10_950_000,
      balanceUsd: 10_950_000,
      apr: 0.14,
      takenQuarter: first,
      dueQuarter: first + 11,
    }
    s.cash = 5_000_000
    s.quarter = first + io - 1 // the last interest-only quarter has just ended
    const label = CONTENT.quarters[s.quarter]
    const ebitda = 300_000
    const interestOnlyPaid = 0.14 * 10_950_000 // roughly what the last quarter's payments were
    // The old rule: EBITDA less last quarter's interest (no principal yet).
    const oldFlow = ebitda - interestOnlyPaid / 4
    const oldRunway = oldFlow < 0 ? s.cash / -oldFlow : null
    const now = runway(s, reportFor(label, ebitda)).quarters!
    expect(now).toBeLessThan(oldRunway ?? Infinity)
  })

  it('leaves the rating rule alone: under the threshold is short, at or over it is not', () => {
    const s = act2Company('2023Q2')
    s.equipmentLoan = loan(20_000_000, 104)
    const report = reportFor('2023Q1', 0)
    report.interestUsd = 0
    report.principalUsd = 0
    const threshold = CONTENT.finance.rating.runwayQuarters
    const burn = -runway(s, report).flowUsd
    s.cash = burn * (threshold - 0.5)
    expect(ratingInputs(s, report).shortRunway).toBe(true)
    s.cash = burn * (threshold + 0.5)
    expect(ratingInputs(s, report).shortRunway).toBe(false)
    expect(ratingInputs(s, report).runwayQuarters).toBeCloseTo(threshold + 0.5, 6)
  })
})
