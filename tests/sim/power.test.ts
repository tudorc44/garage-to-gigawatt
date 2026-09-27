// New power in a project's Power slot (M5.6; scope 0.2 §2.5, doc 18 §5.3; conversions.json ›
// grid_upgrade, on_site_gas): grid upgrades with a regional queue, and on-site gas with Heat.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import type { GameState } from '../../src/sim/state.ts'
import { siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import { gasHeat, gridQuarterRange } from '../../src/sim/systems/power.ts'
import { projectCapex } from '../../src/sim/systems/projects.ts'
import { capacityKw, poweredKw } from '../../src/sim/systems/sites.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** The own site (Georgia) full of S19s, so it has no free MW. */
function full(label = '2024Q2'): GameState {
  const s = act2Company(label)
  s.machines.push({
    id: 'lot-x',
    model: 's19pro',
    siteId: 'site-2',
    condition: 'new',
    count: 6153, // 6,153 × 3.25 kW ≈ 20 MW
    failed: 0,
    earnsFromQuarter: 0,
  })
  return s
}
const open = (s: GameState, power: 'grid' | 'gas', kw = 10_000) =>
  ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw, kind: 'shell', power })
/** Signs the first offer, funds with cash and starts the build. */
function start(s: GameState): GameState {
  const p = s.projects.at(-1)!
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: p.id,
    offerId: p.offers[0].id,
  })
  s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: p.id })
  return ok(s, { type: 'PROJECT_START', projectId: p.id })
}

describe('a grid upgrade', () => {
  it('opens on a site with no free MW: its MW join the site but have no power yet', () => {
    const before = full()
    expect(() =>
      ok(before, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 10_000,
        kind: 'shell',
      }),
    ).toThrow('error.no_project_room')
    const s = open(before, 'grid')
    const site = s.sites[1]
    expect(capacityKw(site)).toBe(capacityKw(before.sites[1]) + 10_000)
    expect(poweredKw(site, s.quarter)).toBe(
      poweredKw(before.sites[1], s.quarter),
    )
    expect(site.powerAdds).toEqual([
      {
        projectId: 'project-1',
        kw: 10_000,
        source: 'grid',
        readyQuarter: null,
      },
    ])
  })

  it('costs $750K/MW in the capex, and the queue (drawn at the build start) sets the go-live', () => {
    const opened = open(full(), 'grid')
    const p = opened.projects[0]
    const withPower = projectCapex(opened, p)
    expect(withPower.powerUsd).toBe(7_500_000)
    const s = start(opened)
    const add = s.sites[1].powerAdds![0]
    const [lo, hi] = gridQuarterRange(opened, 'georgia') // 8–16
    expect([lo, hi]).toEqual([8, 16])
    expect(add.readyQuarter! - s.quarter).toBeGreaterThanOrEqual(lo)
    expect(add.readyQuarter! - s.quarter).toBeLessThanOrEqual(hi)
    expect(s.projects[0].readyQuarter).toBe(add.readyQuarter) // longer than the 3-quarter build
    expect(s.cash).toBeCloseTo(opened.cash - withPower.totalUsd, 0)
  })

  it('waiting MW pay no reservation; once energized and live they are the project’s AI shell MW', () => {
    let s = start(open(full(), 'grid'))
    const before = playQuarter(s).reports.at(-1)!
    // Only the ~2 kW the S19s leave free pay it (10 MW would pay ~$250K a quarter).
    expect(before.reservationUsd).toBeLessThan(100)
    const ready = s.projects[0].readyQuarter!
    s = { ...s, quarter: ready - 1 }
    s = playQuarter(s)
    expect(s.projects[0].stage).toBe('live')
    const use = siteMwByUse(s, s.sites[1], s.quarter)
    expect(use.aiShell).toBe(10_000)
    expect(poweredKw(s.sites[1], s.quarter)).toBe(capacityKw(s.sites[1]))
  })

  it('the Ex-Utility Exec takes a quarter off the queue; PJM’s queue is 4 quarters longer from 2026Q1', () => {
    const s = full()
    expect(
      gridQuarterRange({ ...s, staff: { ex_utility: 0 } }, 'georgia'),
    ).toEqual([7, 15])
    expect(gridQuarterRange({ ...s, quarter: q('2026Q1') }, 'pjm')).toEqual([
      24, 36,
    ])
  })

  it('is halted in ERCOT in 2026Q3–Q4', () => {
    const s = full('2026Q3')
    s.sites[1].region = 'ercot'
    expect(() => open(s, 'grid')).toThrow('error.grid_halted')
    expect(() => open(s, 'gas')).not.toThrow()
  })

  it('cancelling the project drops its new power', () => {
    const s = open(full(), 'grid')
    const c = ok(s, { type: 'PROJECT_CANCEL', projectId: 'project-1' })
    expect(c.sites[1].powerAdds).toBeUndefined()
    expect(capacityKw(c.sites[1])).toBe(capacityKw(full().sites[1]))
  })
})

describe('on-site gas', () => {
  it('$1.5M/MW and 2 quarters; the turbines add 20 Heat at the site while they run', () => {
    const opened = open(full(), 'gas')
    expect(projectCapex(opened, opened.projects[0]).powerUsd).toBe(15_000_000)
    const s = start(opened)
    const add = s.sites[1].powerAdds![0]
    expect(add.readyQuarter).toBe(s.quarter + 2)
    expect(s.projects[0].readyQuarter).toBe(s.quarter + 3) // the shell's build is longer
    expect(gasHeat(s.sites[1], s.quarter + 1)).toBe(0)
    expect(gasHeat(s.sites[1], s.quarter + 2)).toBe(20)
  })

  it('an air-permit flaw adds its 25 Heat to the turbines’', () => {
    const s = start(open(full(), 'gas'))
    s.sites[1].flaw = 'air_permit_for_gas'
    s.sites[1].category = 'energized_land_powered_shell'
    expect(gasHeat(s.sites[1], s.quarter + 2)).toBe(45)
  })
})
