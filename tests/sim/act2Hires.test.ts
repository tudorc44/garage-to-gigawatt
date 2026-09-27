// Act II hires and Bandwidth (M5.7; scope 0.2 §2.2, §2.8; hires_act2.json).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { hireViews } from '../../src/sim/selectors.ts'
import type { GameState, Site } from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { debtOffer } from '../../src/sim/systems/facilities.ts'
import { getHire, salaryUsdQ } from '../../src/sim/systems/hires.ts'
import { equipmentTerms } from '../../src/sim/systems/loans.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function withSite(s: GameState, kw: number): GameState {
  const site: Site = {
    id: `site-${s.nextId++}`,
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    region: 'ercot',
    category: 'distressed_miner_site',
    kw,
  }
  s.sites.push(site)
  return s
}

describe('the new hires', () => {
  it('are on the People list in Act II only, and can only be hired there', () => {
    const act2 = act2Company('2023Q3')
    expect(hireViews(act2).map((h) => h.id)).toContain('head_of_development')
    expect(hireViews(act2).map((h) => h.id)).toContain('capital_markets_lead')
    const act1 = { ...act2, act: 1 as const, quarter: q('2021Q1') }
    expect(hireViews(act1).map((h) => h.id)).not.toContain(
      'head_of_development',
    )
    expect(() =>
      ok(act1, { type: 'HIRE', hire: 'head_of_development' }),
    ).toThrow('error.act2_only')
    expect(() =>
      ok(act2, { type: 'HIRE', hire: 'government_affairs_lead' }),
    ).toThrow('error.unknown_hire')
  })

  it('are paid hires_act2.json’s salaries (a year ÷ 4, between the anchors)', () => {
    const hod = getHire('head_of_development')!
    expect(salaryUsdQ(hod, q('2022Q4'))).toBe(220_000 / 4)
    expect(salaryUsdQ(hod, q('2023Q2'))).toBeCloseTo(225_000 / 4, 6)
    expect(salaryUsdQ(getHire('capital_markets_lead')!, q('2026Q4'))).toBe(
      255_000 / 4,
    )
  })

  it('the Head of Development: +1 Bandwidth from the quarter after hiring', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'HIRE',
      hire: 'head_of_development',
    })
    expect(bandwidthForQuarter(s)).toBe(4)
    s = playQuarter(s)
    expect(s.bandwidth).toBe(5)
  })

  it('the Capital Markets Lead cuts 0.75 point off new equipment loans and DDTLs', () => {
    const s = { ...act2Company('2024Q2'), creditRating: 'BB' }
    const hired = { ...s, staff: { capital_markets_lead: s.quarter - 1 } }
    expect(equipmentTerms(s)!.apr - equipmentTerms(hired)!.apr).toBeCloseTo(
      0.0075,
      9,
    )
    let p = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 2000,
      kind: 'cloud',
      gpu: 'h100',
    })
    const project = p.projects[0]
    p = { ...p }
    const without = debtOffer(p, project, 'ddtl').apr
    const withLead = debtOffer(
      { ...p, staff: { capital_markets_lead: 0 } },
      project,
      'ddtl',
    ).apr
    expect(without - withLead).toBeCloseTo(0.0075, 9)
  })
})

describe('Act II Bandwidth', () => {
  it('base 4 (owner, 28 Sep 2026); +1 at 50 MW energized, +1 more at 200 MW; the own site’s Act I bonus is gone', () => {
    const s = act2Company('2024Q2') // a 20 MW own site
    expect(bandwidthForQuarter(s)).toBe(4)
    expect(bandwidthForQuarter(withSite(act2Company('2024Q2'), 30_000))).toBe(5)
    expect(bandwidthForQuarter(withSite(act2Company('2024Q2'), 180_000))).toBe(
      6,
    )
  })

  it('+1 each from the Chief of Staff (an Act I hire carries over) and the Head of Development, at most 8', () => {
    const s = withSite(act2Company('2024Q2'), 500_000)
    s.staff = { chief_of_staff: 0, head_of_development: 0 }
    expect(bandwidthForQuarter(s)).toBe(8)
    expect(bandwidthForQuarter({ ...s, act: 1, quarter: q('2021Q1') })).toBe(6)
    s.staff = { chief_of_staff: 0 }
    expect(bandwidthForQuarter(s)).toBe(7)
  })
})
