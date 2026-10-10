// M30.4 (doc 33 §9.3-9.7, §11.2-11.3): Act IV's lunar operations. Power (solar arrays, the reactor not before 2034 and
// later with the Reactor Delay), the pilot plant (its gates, output, measured after two quarters, dust and maintenance),
// offtake (prepayments, deliveries), the production decision (its gates; first output always after 2035), the Flag on
// the Pole, and the lunar unit in the books.
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT, act4Row, actLastQuarter } from '../../src/content/index.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { MOON, lunarSite } from '../../src/content/moonContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState, LunarClaim } from '../../src/sim/state.ts'
import { pilotGradeFactor } from '../../src/sim/systems/lunarGeology.ts'
import { claimOf, resourceCategory } from '../../src/sim/systems/moon.ts'
import {
  effectiveKwe,
  endQuarterMoonOps,
  lunarUnitUsd,
  siteValueUsd,
  solarCostUsd,
  startQuarterMoonOps,
} from '../../src/sim/systems/moonOps.ts'
import { act, orbitCompany, playQuarter } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

/** A company holding the Shackleton ridge with one prospect report (set up directly; the bloc's claim not yet in). */
function holding(grade: 'rich' | 'patchy' | 'dry' = 'rich'): GameState {
  let s = orbitCompany('f1')
  s.politicalCapital = 60
  s.lunarGrade = grade
  s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })
  const c = claimOf(s, 'shackleton_ridge')!
  c.status = 'held'
  c.landedQuarter = s.quarter
  c.reports.push({ quarter: s.quarter, step: 'first', estimateT: 1.5e6, lowT: 0.7e6, highT: 3e6 })
  s.bandwidth = 9
  return s
}
const claim = (s: GameState): LunarClaim => claimOf(s, 'shackleton_ridge')!

describe('lunar power (M30.4)', () => {
  it('a solar array: sizes up to the ridge, delivered mass + hardware, ready in 2 quarters, output × illumination', () => {
    let s = holding()
    expect(solarCostUsd(s, 100)).toBe(100 * (60 * 40000 + 1e6))
    expect(err(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 75 })).toBe('error.moon_bad_size')
    s = act(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 100 })
    expect(effectiveKwe(claim(s), s.quarter)).toBe(0)
    expect(effectiveKwe(claim(s), s.quarter + 2)).toBeCloseTo(94)
    expect(err(s, { type: 'BUILD_LUNAR_SOLAR', site: 'cabeus', kwe: 25 })).toBe('error.moon_not_held')
  })

  it('a reactor lease: not before 2034Q1, not before 2036Q1 once the Reactor Delay fires; it aligns you with its bloc', () => {
    const s = holding()
    expect(err(s, { type: 'LEASE_LUNAR_REACTOR', site: 'shackleton_ridge' })).toBe('error.moon_reactor_later')
    s.quarter = Q('2034Q1')
    const x = act(s, { type: 'LEASE_LUNAR_REACTOR', site: 'shackleton_ridge' })
    expect(x.act4Moon!.alignedBloc).toBe('accords')
    s.act4Wildcards = [{ id: 'reactor_delay', quarter: Q('2032Q1'), fired: true }]
    expect(err(s, { type: 'LEASE_LUNAR_REACTOR', site: 'shackleton_ridge' })).toBe('error.moon_reactor_later')
  })
})

describe('the pilot plant (M30.4)', () => {
  it('needs an indicated resource and 100 kWe; costs $300M + 8 t delivered; first water 7 quarters on', () => {
    let s = holding()
    expect(err(s, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })).toBe('error.moon_needs_power')
    s = act(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 100 })
    const cash = s.cash
    s = act(s, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })
    expect(cash - s.cash).toBe(300e6 + 8000 * 40000)
    expect(claim(s).pilot).toMatchObject({ readyQuarter: s.quarter + 7, availability: 1 })
    const none = holding()
    claim(none).reports = []
    expect(err(none, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })).toBe('error.moon_needs_indicated')
  })

  it('output a quarter = 1.2 t/kWe-yr × kWe × 0.3 × grade × ice × availability ÷ 4; measured after two quarters; dust without a crew', () => {
    for (const grade of ['rich', 'patchy', 'dry'] as const) {
      let s = holding(grade)
      s = act(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 100 })
      s = act(s, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })
      s.quarter = claim(s).pilot!.readyQuarter
      endQuarterMoonOps(s)
      const site = lunarSite('shackleton_ridge')
      const yearly = 1.2 * 100 * site.illumination * 0.3 * pilotGradeFactor(grade) * site.ice_access
      expect(claim(s).pilot!.processedT).toBeCloseTo(yearly / 4)
      expect(claim(s).pilot!.availability).toBeCloseTo(0.97)
      expect(resourceCategory(claim(s))).toBe('indicated')
      if (grade !== 'dry' || yearly > 0) {
        s.quarter++
        endQuarterMoonOps(s)
        expect(resourceCategory(claim(s))).toBe('measured')
        expect(claim(s).reports.at(-1)!.step).toBe('pilot')
      }
    }
    // a maintenance crew keeps availability, for a fee
    let m = holding()
    m = act(m, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 100 })
    m = act(m, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })
    m = act(m, { type: 'SET_LUNAR_MAINTENANCE', site: 'shackleton_ridge', on: true })
    m.quarter = claim(m).pilot!.readyQuarter
    const cash = m.cash
    endQuarterMoonOps(m)
    expect(claim(m).pilot!.availability).toBe(1)
    expect(cash - m.cash).toBe(MOON.pilot.maintenance_usd_q)
  })

  it('the Flag on the Pole freezes extraction outside the Station partnership', () => {
    let s = holding()
    s = act(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 100 })
    s = act(s, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })
    s.quarter = claim(s).pilot!.readyQuarter
    s.act4Wildcards = [{ id: 'flag_on_the_pole', quarter: s.quarter, fired: true }]
    startQuarterMoonOps(s)
    expect(s.act4Moon!.freezeUntil).toBeGreaterThanOrEqual(s.quarter + 1)
    const frozen = structuredClone(s)
    endQuarterMoonOps(frozen)
    expect(claim(frozen).pilot!.processedT).toBe(0)
    s.act4Moon!.alignedBloc = 'station'
    endQuarterMoonOps(s)
    expect(claim(s).pilot!.processedT).toBeGreaterThan(0)
  })
})

describe('offtake, production and the books (M30.4)', () => {
  it('offtake: an offer once you hold a site; signing prepays a fifth of a year; the pilot’s water is delivered and paid', () => {
    let s = holding()
    startQuarterMoonOps(s)
    const o = s.act4Moon!.offers[0]
    expect(o.volumeTYr).toBeGreaterThanOrEqual(2)
    expect(o.volumeTYr).toBeLessThanOrEqual(10)
    const cash = s.cash
    s = act(s, { type: 'SIGN_LUNAR_OFFTAKE', offer: 0 })
    const prepaid = 0.2 * o.volumeTYr * 1000 * o.priceUsdKg
    expect(s.cash - cash).toBeCloseTo(prepaid)
    s = act(s, { type: 'BUILD_LUNAR_SOLAR', site: 'shackleton_ridge', kwe: 200 })
    s = act(s, { type: 'DECIDE_LUNAR_PILOT', site: 'shackleton_ridge' })
    s.quarter = claim(s).pilot!.readyQuarter
    s.act4Moon!.offtakes[0].endQuarter = s.quarter + 4
    endQuarterMoonOps(s)
    const delivered = s.act4Moon!.offtakes[0].deliveredT
    expect(delivered).toBeCloseTo(Math.min(claim(s).pilot!.processedT, o.volumeTYr / 4))
    expect(s.quarterStats.moonRevenueUsd).toBeCloseTo(delivered * 1000 * o.priceUsdKg)
  })

  it('production: needs measured and the megawatt contract; capex drawn over its build; first output after 2035 always', () => {
    let s = holding()
    expect(err(s, { type: 'DECIDE_LUNAR_PRODUCTION', site: 'shackleton_ridge' })).toBe('error.moon_needs_measured')
    claim(s).reports.push({ quarter: s.quarter, step: 'pilot', estimateT: 1.8e6, lowT: 1.5e6, highT: 2.1e6 })
    expect(err(s, { type: 'DECIDE_LUNAR_PRODUCTION', site: 'shackleton_ridge' })).toBe('error.moon_needs_megawatt')
    expect(err(s, { type: 'SIGN_LUNAR_MEGAWATT' })).toBe('error.moon_reactor_later')
    s.quarter = Q('2034Q1')
    s = act(s, { type: 'SIGN_LUNAR_MEGAWATT' })
    s = act(s, { type: 'DECIDE_LUNAR_PRODUCTION', site: 'shackleton_ridge' })
    const p = claim(s).production!
    expect(p.firstOutputQuarter).toBeGreaterThan(actLastQuarter(4))
    const cash = s.cash
    endQuarterMoonOps(s)
    expect(cash - s.cash).toBeCloseTo(4e9 / 24)
  })

  it('the lunar unit: your estimate × value/t × confidence × stage + presence; a lapsed or unlanded claim adds nothing', () => {
    const s = holding()
    const c = claim(s)
    const v = siteValueUsd(s, c)
    const perT = act4Row(s.quarter, scenarioOf(s)).lunar_value_usd_t
    expect(v).toBeCloseTo(1.5e6 * perT * 0.5 * 0.2 + 25e6)
    expect(lunarUnitUsd(s)).toBeCloseTo(v)
    c.status = 'claimed'
    expect(siteValueUsd(s, c)).toBe(0)
  })

  it('the report carries the lunar unit and its EBITDA only when there’s a lunar programme', () => {
    const s = playQuarter(holding())
    const r = s.reports.at(-1)!
    expect(r.lunarUsd).toBeGreaterThan(0)
    expect(r).toHaveProperty('moonEbitdaUsd')
    const plain = playQuarter(orbitCompany())
    expect(plain.reports.at(-1)!).not.toHaveProperty('lunarUsd')
  })
})
