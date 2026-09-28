// Project debt and the GPU-backed DDTL (M4.2; scope 0.2 §2.7, doc 18 §7.1, §7.4): who can borrow,
// how much (the share, trimmed to DSCR ≥ 1.12×), drawing at the start of the build, interest while
// building, missed payments and foreclosure, and repaying on a sale.
import { describe, expect, it } from 'vitest'
import type { GameState } from '../../src/sim/state.ts'
import {
  debtOffer,
  debtPlan,
  serviceDueUsd,
  serviceFacilities,
} from '../../src/sim/systems/facilities.ts'
import { ddtlRate, projectDebtRate } from '../../src/sim/systems/finance.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { projectCapex, saleValueUsd } from '../../src/sim/systems/projects.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

/** A 5 MW shell in 2023Q3 with `card` signed (readyBy 5 quarters on), funded. */
function shellWith(card: string): GameState {
  let s = ok(act2Company('2023Q3'), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s.projects[0].offers = [{ id: 'o1', card, readyByQuarters: 5 }]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

/** A 2 MW H100 cloud in 2023Q3 with a GPU contract from `card` (`years`, buffer 1), funded. */
function cloudWith(card: string, years: number): GameState {
  let s = ok(act2Company('2023Q3'), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 2000,
    kind: 'cloud',
    gpu: 'h100',
  })
  s.projects[0].offers = [
    {
      id: 'o1',
      card,
      readyByQuarters: 0,
      gpu: { termYears: years, bufferQuarters: 1 },
    },
  ]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

const debt = (s: GameState, d: 'project_debt' | 'ddtl', on = true) =>
  ok(s, { type: 'PROJECT_DEBT', projectId: 'project-1', debt: d, on })

describe('who can borrow', () => {
  it('project debt needs a tenant rated BBB or better, or an AI lab (M7.0, A7)', () => {
    expect(() =>
      debt(shellWith('tc_realname_coreweave_style'), 'project_debt'),
    ).toThrow('error.debt_needs_bbb') // a B+ neocloud
    debt(shellWith('tc_meridian_labs'), 'project_debt') // a BB AI lab
    debt(shellWith('tc_enterprise_render'), 'project_debt') // BBB
    debt(shellWith('tc_north_azure_cloud'), 'project_debt') // AA
  })

  it('an AI lab below BBB: 50% of cost at the project-debt rate + 3 points; a BBB AI lab keeps 65%', () => {
    const lab = shellWith('tc_meridian_labs')
    const o = debtOffer(lab, lab.projects[0], 'project_debt')
    expect(o.capUsd).toBeCloseTo(
      projectCapex(lab, lab.projects[0]).totalUsd * 0.5,
      4,
    )
    expect(o.apr).toBeCloseTo(projectDebtRate(lab.quarter) + 0.03, 9)
    const bbb = shellWith('tc_enterprise_render')
    const b = debtOffer(bbb, bbb.projects[0], 'project_debt')
    expect(b.capUsd).toBeCloseTo(
      projectCapex(bbb, bbb.projects[0]).totalUsd * 0.65,
      4,
    )
    expect(b.apr).toBeCloseTo(projectDebtRate(bbb.quarter), 9)
  })

  it('a DDTL needs a GPU contract', () => {
    expect(() => debt(shellWith('tc_north_azure_cloud'), 'ddtl')).toThrow(
      'error.ddtl_needs_contract',
    )
    debt(cloudWith('tc_meridian_labs', 2), 'ddtl')
  })

  it('not before 2023Q3', () => {
    const s = shellWith('tc_north_azure_cloud')
    expect(() =>
      debt({ ...s, quarter: s.quarter - 1 }, 'project_debt'),
    ).toThrow('error.debt_early')
  })
})

describe('how much', () => {
  it('project debt: 75% of capex on an A/AA tenant (65% on BBB), at the quarter’s rate, over the lease', () => {
    const s = shellWith('tc_north_azure_cloud')
    const o = debtOffer(s, s.projects[0], 'project_debt')
    const capex = projectCapex(s, s.projects[0]).totalUsd
    expect(o.capUsd).toBeCloseTo(capex * 0.75, 4)
    expect(o.apr).toBeCloseTo(projectDebtRate(s.quarter), 9)
    expect(o.tenorQuarters).toBe(15 * 4)
    expect(o.rating).toBe('A') // secured on a strong tenant
    const bbb = shellWith('tc_enterprise_render')
    expect(debtOffer(bbb, bbb.projects[0], 'project_debt').share).toBe(0.65)
  })

  it('a DDTL: 50% of GPU cost for a non-IG tenant at SOFR + the spread; trimmed to DSCR ≥ 1.12×', () => {
    const s = debt(cloudWith('tc_meridian_labs', 1), 'ddtl')
    const p = s.projects[0]
    const o = debtOffer(s, p, 'ddtl')
    expect(o.share).toBe(0.5)
    expect(o.capUsd).toBeCloseTo(projectCapex(s, p).gpuUsd * 0.5, 4)
    expect(o.apr).toBeCloseTo(ddtlRate(s.quarter, false), 9)
    const plan = debtPlan(s, p)
    expect(plan.totalUsd).toBeGreaterThan(0)
    expect(plan.totalUsd).toBeLessThanOrEqual(o.capUsd)
    expect(plan.dscr!).toBeGreaterThanOrEqual(1.12 - 1e-9)
  })
})

describe('drawing and servicing', () => {
  it('draws at the start (the cash only covers the rest); while building the interest is capitalised (M7.0, A1b)', () => {
    const s = debt(shellWith('tc_north_azure_cloud'), 'project_debt')
    const plan = debtPlan(s, s.projects[0])
    const capex = projectCapex(s, s.projects[0]).totalUsd
    const r = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    expect(r.cash).toBeCloseTo(s.cash - (Math.round(capex) - plan.totalUsd), 0)
    expect(r.facilities).toHaveLength(1)
    const f = r.facilities[0]
    expect(f).toMatchObject({ kind: 'project_debt', amountUsd: plan.totalUsd })
    expect(debtUsd(r)).toBeCloseTo(plan.totalUsd, 6)
    expect(serviceDueUsd(r, f)).toMatchObject({
      principalUsd: 0,
      interestUsd: 0,
    }) // building: no cash due
    const next = playQuarter(r)
    const idc = (plan.totalUsd * f.apr) / 4
    expect(next.facilities[0].balanceUsd).toBeCloseTo(plan.totalUsd + idc, 2)
    expect(next.facilities[0].amountUsd).toBeCloseTo(plan.totalUsd + idc, 2)
    expect(next.reports.at(-1)!.interestUsd).toBe(0)
  })

  it('once live it amortises; selling the project repays what it still owes', () => {
    let s = debt(shellWith('tc_north_azure_cloud'), 'project_debt')
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    for (let i = 0; i < 4; i++) s = playQuarter(s)
    expect(s.projects[0].stage).toBe('live')
    const f = s.facilities[0]
    expect(f.balanceUsd).toBeCloseTo(f.amountUsd * (1 - 1 / 60), 2) // one live quarter paid
    const price = saleValueUsd(s, s.projects[0])
    const r = ok(s, { type: 'PROJECT_SELL', projectId: 'project-1' })
    expect(r.facilities).toEqual([])
    expect(r.cash).toBeCloseTo(s.cash + Math.round(price) - f.balanceUsd, 2)
  })

  it('two missed quarters in a row: the lender forecloses the project and its MW', () => {
    let s = debt(shellWith('tc_north_azure_cloud'), 'project_debt')
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    const owed = s.facilities[0].balanceUsd
    // Live (a building project owes no cash: its interest is capitalised), and no cash for the debt
    // service at two quarter ends in a row.
    s.projects[0].stage = 'live'
    s.cash = 0
    expect(serviceFacilities(s)).toEqual({ interestUsd: 0, principalUsd: 0 })
    expect(s.facilities[0].missedQuarters).toBe(1)
    expect(s.facilities[0].balanceUsd).toBeGreaterThan(owed) // unpaid interest added
    expect(s.cash).toBe(0) // no forced payment
    serviceFacilities(s)
    expect(s.projects[0].stage).toBe('foreclosed')
    expect(s.facilities).toEqual([])
    expect(capacityKw(s.sites[1])).toBe(15_000)
    expect(s.log.some((e) => e.key === 'log.project_foreclosed')).toBe(true)
  })
})
