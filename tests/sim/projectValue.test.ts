// Projects in the valuation (Act II, scope 0.2 §2.8; doc 18 §7.3, §8): the sum of the parts, the
// pivot premium, projects under construction at capex spent, the weighted backlog, and selling a
// live shell at its cap rate.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { ratingBacklogView } from '../../src/sim/selectors.ts'
import { siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import {
  annualRentUsd,
  backlogUsd,
  backlogWeight,
  capRate,
  contractQuarters,
  floorEligible,
  remainingContractUsd,
  saleValueUsd,
  tenantCard,
  weightedBacklogUsd,
} from '../../src/sim/systems/projects.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'
import {
  aiEnterpriseUsd,
  valuationSplit,
  valuationUsd,
} from '../../src/sim/systems/valuation.ts'
import { ok, playQuarter, shellReady } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('the sum of the parts', () => {
  it('mining at the era multiple (+2 with the pivot premium), AI at the AI multiple', () => {
    const at = q('2025Q4') // mining 7×, AI infra 30×
    // $1M EBITDA a quarter, of which $0.4M from AI units.
    const parts = { aiEbitdaUsd: 400_000 }
    expect(valuationUsd(at, 1_000_000, 0, 0, 0, parts)).toBe(
      600_000 * 4 * 7 + 400_000 * 4 * 30,
    )
    expect(
      valuationUsd(at, 1_000_000, 0, 0, 0, { ...parts, pivot: true }),
    ).toBe(600_000 * 4 * 9 + 400_000 * 4 * 30)
  })

  it('a loss-making part adds nothing, without dragging the other down', () => {
    const at = q('2025Q4')
    // Mining loses $0.2M, AI earns $0.5M: the total is $0.3M, but AI alone is valued.
    expect(valuationUsd(at, 300_000, 0, 0, 0, { aiEbitdaUsd: 500_000 })).toBe(
      500_000 * 4 * 30,
    )
  })

  it('long A/AA or backstopped contracts: at least 18× (owner, 28 Sep 2026); the rest at the era multiple', () => {
    const late = q('2026Q4') // AI infra 15×
    expect(aiEnterpriseUsd(late, 1_000_000, 600_000)).toBe(
      600_000 * 4 * 18 + 400_000 * 4 * 15,
    )
    // The floor never lowers a higher era multiple (2025Q4: 30×).
    expect(aiEnterpriseUsd(q('2025Q4'), 1_000_000, 600_000)).toBe(
      1_000_000 * 4 * 30,
    )
    // The floored part can't exceed the AI EBITDA, and losses add nothing.
    expect(aiEnterpriseUsd(late, 500_000, 900_000)).toBe(500_000 * 4 * 18)
    expect(aiEnterpriseUsd(late, -100_000, 50_000)).toBe(0)
  })

  it('a 15-year AA shell earns the floor while at least 5 years are left', () => {
    const s = shellReady()
    const p = s.projects[0]
    p.stage = 'live'
    p.tenant!.card = 'tc_north_azure_cloud' // AA, 15 years
    expect(floorEligible(p)).toBe(true)
    p.tenant!.servedQuarters = contractQuarters(p) - 20
    expect(floorEligible(p)).toBe(true)
    p.tenant!.servedQuarters++
    expect(floorEligible(p)).toBe(false)
  })

  it('adds projects under construction and the weighted backlog', () => {
    expect(
      valuationUsd(q('2024Q2'), 0, 1_000, 0, 0, {
        constructionUsd: 50_000_000,
        weightedBacklogUsd: 7_000_000,
      }),
    ).toBe(57_001_000)
  })
})

describe('the backlog (remaining contracted revenue)', () => {
  it('weights by tenant credit: A/AA 20%, BBB 15%, below 8% (owner, 28 Sep 2026)', () => {
    expect(backlogWeight('AA')).toBe(0.2)
    expect(backlogWeight('A/AA')).toBe(0.2)
    expect(backlogWeight('A')).toBe(0.2)
    expect(backlogWeight('BBB')).toBe(0.15)
    expect(backlogWeight('BB (backstopped to A)')).toBe(0.08)
    expect(backlogWeight('B+ (rising)')).toBe(0.08)
  })

  it('a signed shell adds its whole contract, shrinking as quarters are served; the top bar shows it unweighted', () => {
    const s = shellReady()
    const p = s.projects[0]
    const card = tenantCard(p.tenant!.card)!
    const whole = annualRentUsd(card, 5000) * card.termYears
    expect(remainingContractUsd(p)).toBeCloseTo(whole, 4)
    expect(backlogUsd(s)).toBeCloseTo(whole, 4)
    expect(ratingBacklogView(s).backlogUsd).toBeCloseTo(whole, 4)
    expect(weightedBacklogUsd(s)).toBeCloseTo(
      whole * backlogWeight(card.rating),
      4,
    )
    p.tenant!.servedQuarters = 4
    expect(remainingContractUsd(p)).toBeCloseTo(
      whole - annualRentUsd(card, 5000),
      4,
    )
  })
})

describe('the quarter report', () => {
  it('counts a project under construction at its capex, and the weighted backlog', () => {
    let s = ok(shellReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    const capex = s.projects[0].capexUsd
    s = playQuarter(s)
    const r = s.reports.at(-1)!
    expect(r.constructionUsd).toBe(capex)
    expect(r.backlogUsd).toBeGreaterThan(0)
    expect(r.weightedBacklogUsd).toBeCloseTo(weightedBacklogUsd(s), 4)
    const v = valuationSplit(r, s.firstAiDealQuarter)
    expect(v.constructionUsd).toBe(capex)
    expect(v.treasuryUsd).toBeCloseTo(r.treasuryValueUsd, 2)
    // Signed in 2023Q3: the pivot premium is on from then.
    expect(v.miningMultiple).toBe(
      CONTENT.act2Market.find((x) => x.quarter === '2023Q3')!.multiple.mining +
        BALANCE.projects.pivotPremium,
    )
  })
})

describe('selling a live shell (2 Bandwidth, at the cap rate)', () => {
  it('cap rates: compress to 2026Q3, widen in the 2026Q4 aftershock; 100 MW+ use the hyperscale rates', () => {
    expect(capRate(q('2022Q4'), 5000)).toBe(0.075) // before 2023: 2023's
    expect(capRate(q('2024Q2'), 5000)).toBe(0.0675)
    expect(capRate(q('2026Q1'), 5000)).toBe(0.0575) // 2026Q1–Q3: 2026Q3's
    expect(capRate(q('2026Q4'), 5000)).toBe(0.065)
    expect(capRate(q('2025Q2'), 100_000)).toBe(0.0525)
  })

  it('only a live shell with a tenant can be sold', () => {
    const s = ok(shellReady(), {
      type: 'PROJECT_START',
      projectId: 'project-1',
    })
    expect(() =>
      ok(s, { type: 'PROJECT_SELL', projectId: 'project-1' }),
    ).toThrow('error.project_not_live')
  })

  it('pays NOI / cap rate less the prepayment it takes on; the MW leave the site', () => {
    let s = ok(shellReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    for (let i = 0; i < 3; i++) s = playQuarter(s)
    const p = s.projects[0]
    expect(p.stage).toBe('live')
    const card = tenantCard(p.tenant!.card)!
    const noi =
      annualRentUsd(card, 5000) * (1 - BALANCE.projects.shellOpexShare)
    const price = noi / capRate(s.quarter, 5000) - p.tenant!.prepaymentLeftUsd
    expect(saleValueUsd(s, p)).toBeCloseTo(price, 4)
    const r = ok(s, { type: 'PROJECT_SELL', projectId: 'project-1' })
    expect(r.cash).toBeCloseTo(s.cash + Math.round(price), 2)
    expect(r.bandwidth).toBe(s.bandwidth - 2)
    expect(r.projects[0]).toMatchObject({
      stage: 'sold',
      soldQuarter: s.quarter,
    })
    const site = r.sites[1]
    expect(capacityKw(site)).toBe(15_000)
    const use = siteMwByUse(r, site, r.quarter)
    expect(Object.values(use).reduce((a, b) => a + b, 0)).toBe(15_000)
    expect(use.aiShell).toBe(0)
    expect(backlogUsd(r)).toBe(0)
  })
})
