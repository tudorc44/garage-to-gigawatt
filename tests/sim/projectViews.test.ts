// The Projects page and Deal builder views (wireframes A2-04 / A2-05), and the projected return.
import { describe, expect, it } from 'vitest'
import {
  dealView,
  openProjectView,
  projectsView,
} from '../../src/sim/selectors.ts'
import {
  annualIrr,
  annualRentUsd,
  projectedReturn,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { act2Company, ok, pilotReady, shellReady } from './act2Helpers.ts'

describe('the projected return', () => {
  it('IRR: the yearly rate at which the quarterly flows are worth nothing today', () => {
    const flows = [-100, ...Array<number>(20).fill(7.5)] // 30 a year for 5 years
    const irr = annualIrr(flows)!
    const q = Math.pow(1 + irr, 1 / 4) - 1
    const npv = flows.reduce((sum, f, i) => sum + f / Math.pow(1 + q, i), 0)
    expect(npv).toBeCloseTo(0, 6)
    expect(irr).toBeCloseTo(0.18, 2)
    expect(annualIrr([-100, 10, 10])).toBeNull() // never pays back
  })

  it('a signed shell: rent less opex, over the lease, after its build quarters', () => {
    const s = shellReady()
    const p = s.projects[0]
    const card = tenantCard(p.tenant!.card)!
    const r = projectedReturn(s, p)
    expect(r.revenueUsd).toBeCloseTo(annualRentUsd(card, 5000), 4)
    expect(r.ebitdaUsd).toBeCloseTo(annualRentUsd(card, 5000) * 0.825, 4)
    expect(r.paybackYears).toBeCloseTo(r.capexUsd / r.ebitdaUsd!, 6)
    expect(r.irr).toBeGreaterThan(0)
  })

  it('a shell with no tenant has nothing to project yet', () => {
    const s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    expect(projectedReturn(s, s.projects[0])).toMatchObject({
      revenueUsd: null,
      irr: null,
    })
  })
})

describe('the views', () => {
  it('cards move from Proposed to Slots filling to Building', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    expect(projectsView(s).byColumn.proposed).toHaveLength(1)
    s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
    expect(projectsView(s).byColumn.filling).toHaveLength(1)
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    const v = projectsView(s)
    expect(v.byColumn.building).toHaveLength(1)
    expect(v.byColumn.building[0].toGo).toBe(1)
    expect(v.kw).toBe(1000)
  })

  it('the deal builder lists offers with their terms and says why the build can’t start', () => {
    const s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    const d = dealView(s, 'project-1')!
    expect(d.offers.length).toBeGreaterThanOrEqual(2)
    expect(d.offers[0].blocker).toBeNull()
    expect(d.startBlocker?.key).toBe('error.project_slots')
    expect(d.power).toMatchObject({ totalKw: 20_000, freeKw: 15_000 })
  })

  it('opening: the non-garage sites with their free MW, and the pilot sizes', () => {
    const v = openProjectView(pilotReady())
    expect(v.sites.map((x) => x.site.id)).toEqual(['site-2'])
    expect(v.sites[0].freeKw).toBe(19_000)
    expect(v.pilotSizes).toEqual([500, 1000, 1500, 2000])
    expect(v.nextId).toBe('project-2')
  })
})
