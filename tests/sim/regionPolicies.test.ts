// Act II regions (M5.4; scope 0.2 §2.6, doc 18 §6 and §11; regions.json): the region panel's data,
// the Heat modifier, and the policy events that change numbers.
import { describe, expect, it } from 'vitest'
import { CONTENT, POWER_REGIONS, act2Quarter } from '../../src/content/index.ts'
import { regionsView } from '../../src/sim/selectors.ts'
import type { GameState, Site } from '../../src/sim/state.ts'
import { baseHeat, eraHeat, recalcHeat } from '../../src/sim/systems/heat.ts'
import {
  directCurtailment,
  extraQueueQuarters,
  gridUpgradesHalted,
  nationalHeatDelta,
} from '../../src/sim/systems/regions.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function siteIn(region: string, s: GameState): Site {
  const site: Site = {
    id: `site-${region}`,
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    region,
  }
  s.sites.push(site)
  return site
}

describe('regions.json', () => {
  it('has the six market regions with the pack’s Heat and anger modifiers', () => {
    expect(Object.keys(CONTENT.regions).sort()).toEqual(
      [...POWER_REGIONS].sort(),
    )
    expect(CONTENT.regions.ercot.heat_modifier).toBe(0.9)
    expect(CONTENT.regions.pjm.heat_modifier).toBe(1.3)
    expect(CONTENT.regions.nordics.anger_modifier).toBe(0.6)
  })
})

describe('policy events', () => {
  it('Virginia’s large-load tax: +$0.011/kWh on PJM sites from 2026Q3, contract or not', () => {
    const s = act2Company('2026Q3')
    const site = siteIn('pjm', s)
    const market = (label: string) => act2Quarter(q(label))!.powerUsdKwh.pjm
    expect(powerPriceUsdKwh(site, q('2026Q2'))).toBeCloseTo(market('2026Q2'), 9)
    expect(powerPriceUsdKwh(site, q('2026Q3'))).toBeCloseTo(
      market('2026Q3') + 0.011,
      9,
    )
    site.contract = {
      type: 'fixed',
      price: 0.05,
      startQuarter: q('2026Q2'),
      endQuarter: q('2027Q1'),
    }
    expect(powerPriceUsdKwh(site, q('2026Q4'))).toBeCloseTo(0.061, 9)
  })

  it('ERCOT halts new grid upgrades for 2 quarters from 2026Q3', () => {
    expect(gridUpgradesHalted('ercot', q('2026Q2'))).toBe(false)
    expect(gridUpgradesHalted('ercot', q('2026Q3'))).toBe(true)
    expect(gridUpgradesHalted('ercot', q('2026Q4'))).toBe(true)
    expect(gridUpgradesHalted('pjm', q('2026Q3'))).toBe(false)
  })

  it('ERCOT SB6: direct curtailment of 75 MW+ sites from 2026Q1', () => {
    expect(directCurtailment('ercot', q('2025Q4'))).toBeNull()
    expect(directCurtailment('ercot', q('2026Q1'))).toEqual({ minKw: 75_000 })
    expect(directCurtailment('georgia', q('2026Q1'))).toBeNull()
  })

  it('2026Q1’s blocked projects: Heat +10 everywhere and the PJM queue +4 quarters', () => {
    expect(nationalHeatDelta(q('2025Q4'))).toBe(0)
    expect(nationalHeatDelta(q('2026Q1'))).toBe(10)
    expect(extraQueueQuarters('pjm', q('2025Q4'))).toBe(0)
    expect(extraQueueQuarters('pjm', q('2026Q1'))).toBe(4)
    expect(extraQueueQuarters('ohio', q('2026Q1'))).toBe(0)
  })
})

describe('Heat in Act II: scaled by the region, plus national policies', () => {
  // An empty site: its parts are the base Heat and the era pressure on big sites.
  const parts = (s: GameState, site: Site) =>
    baseHeat(s, site) + eraHeat(s, site)

  it('an ERCOT site’s Heat is 0.9 × its parts; from 2026Q1 +10 on top', () => {
    const s = act2Company('2025Q4')
    const site = siteIn('ercot', s)
    recalcHeat(s, site)
    expect(s.siteHeat[site.id].value).toBeCloseTo(parts(s, site) * 0.9, 9)
    s.quarter = q('2026Q1')
    recalcHeat(s, site)
    expect(s.siteHeat[site.id].value).toBeCloseTo(parts(s, site) * 0.9 + 10, 9)
  })

  it('unchanged in Act I', () => {
    const s = {
      ...act2Company('2025Q4'),
      quarter: q('2021Q1'),
      act: 1 as const,
    }
    const site = siteIn('ercot', s)
    recalcHeat(s, site)
    expect(s.siteHeat[site.id].value).toBeCloseTo(parts(s, site), 9)
  })
})

describe('the region panel', () => {
  it('lists the six regions, with your sites, and starts on your biggest', () => {
    const s = act2Company('2024Q4')
    const v = regionsView(s)
    expect(v.regions.map((r) => r.id)).toEqual([...POWER_REGIONS])
    expect(v.home).toBe('georgia') // the own site
    const pjm = v.regions.find((r) => r.id === 'pjm')!
    expect(pjm.queueMonths).toEqual([60, 96])
    expect(
      pjm.policies.find((p) => p.id === 'pjm_capacity_spike')!.active,
    ).toBe(true)
    expect(
      pjm.policies.find((p) => p.id === 'va_large_load_tax'),
    ).toMatchObject({
      active: false,
      hasEffect: true,
    })
  })
})
