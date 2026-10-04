// M19.1 (owner request via the design thread, 4 Oct 2026): the Community Relations Manager. Heat −5 at every site
// while she's on staff (floor 0), "Talk to the neighbours" at 0 Bandwidth, hireable once you own a site beyond the
// garage, salary on the Act I scale ($95K → $140K, × 1.08 from 2022, Act I's formula carried into Acts II and III).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { communityView } from '../../src/sim/selectors.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import { heatOf, updateHeatWeek } from '../../src/sim/systems/heat.ts'
import { getHire, salaryUsdQ } from '../../src/sim/systems/hires.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const ID = 'community_relations'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}

/** A Plan-phase game in `label` with a warehouse (site-2), Heat worked out with nothing running. */
function withWarehouse(label = '2019Q1'): GameState {
  const s = { ...newGame(1), quarter: q(label), cash: 2_000_000 }
  const site: Site = {
    id: 'site-2',
    tier: 'warehouse',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  }
  s.sites.push(site)
  updateHeatWeek(s, [])
  return s
}
const heat = (s: GameState, id = 'site-2') => heatOf(s, id).value
const hire: Action = { type: 'HIRE', hire: ID }

describe('the Community Relations Manager (M19.1)', () => {
  it('is an Act I hire: Mae Holloway (M21.0, DT A1), $95K (2017) → $140K (2021), × 1.08 from 2022 and on into Acts II and III', () => {
    const h = getHire(ID)!
    expect(CONTENT.hires.list.map((x) => x.id)).toContain(ID)
    expect(h.name).toBe('Mae Holloway')
    expect(salaryUsdQ(h, q('2017Q1'))).toBe(23_750)
    expect(salaryUsdQ(h, q('2021Q1'))).toBe(35_000)
    expect(salaryUsdQ(h, q('2022Q1'))).toBeCloseTo(37_800, 6)
    expect(salaryUsdQ(h, q('2024Q2'))).toBeCloseTo(37_800, 6)
    expect(salaryUsdQ(h, q('2028Q1'))).toBeCloseTo(37_800, 6)
  })

  it('needs a site beyond the garage', () => {
    const garageOnly = { ...newGame(1), quarter: q('2019Q1'), cash: 2_000_000 }
    expect(err(garageOnly, hire)).toBe('error.hire_needs_site')
    expect(ok(withWarehouse(), hire).staff[ID]).toBe(q('2019Q1'))
  })

  it('Heat −5 at every site at once (floor 0), back when she leaves', () => {
    const s = withWarehouse()
    const before = heat(s)
    expect(before).toBeGreaterThan(5)
    const garageBefore = heat(s, s.sites[0].id)
    const t = ok(s, hire)
    expect(heat(t)).toBeCloseTo(before - 5, 9)
    // the garage with nothing running: its base 5 → 0
    expect(garageBefore).toBe(5)
    expect(heat(t, t.sites[0].id)).toBe(0)
    // the floor: a site whose parts come to under 5 doesn't go below 0
    heatOf(t, t.sites[0].id).grievance = -3
    updateHeatWeek(t, [])
    expect(heat(t, t.sites[0].id)).toBe(0)
    heatOf(t, t.sites[0].id).grievance = 0
    // the next week's Heat keeps the −5
    updateHeatWeek(t, [])
    expect(heat(t)).toBeCloseTo(before - 5, 9)
    const u = ok({ ...t, quarter: t.quarter + 1 }, { type: 'FIRE', hire: ID })
    expect(heat(u)).toBeCloseTo(before, 9)
  })

  it('"Talk to the neighbours" costs 0 Bandwidth with her (its cash cost unchanged)', () => {
    const s = ok(withWarehouse(), hire)
    const bw = s.bandwidth
    const cash = s.cash
    expect(communityView(s).outreachBandwidth).toBe(0)
    const t = ok(s, { type: 'OUTREACH', siteId: 'site-2' })
    expect(t.bandwidth).toBe(bw)
    expect(t.cash).toBe(cash - 10_000)
    // without her: 1 Bandwidth, as before
    expect(communityView(withWarehouse()).outreachBandwidth).toBe(1)
  })

  it('other hires don’t touch Heat (no recalculation on hiring them)', () => {
    const s = withWarehouse()
    heatOf(s, 'site-2').value = 33 // a stale value stays until the next week
    expect(heat(ok(s, { type: 'HIRE', hire: 'ops_manager' }))).toBe(33)
  })
})
