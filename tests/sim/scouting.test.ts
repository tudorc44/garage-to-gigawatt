// Act II scouting (M5.5; scope 0.2 §2.6, doc 18 §6; sites_act2.json): the categories by quarter,
// the offers, buying one, and what the hidden flaws do.
import { describe, expect, it } from 'vitest'
import { CONTENT, act2Quarter } from '../../src/content/index.ts'
import type { GameState, Site } from '../../src/sim/state.ts'
import { transformerUpgrade } from '../../src/sim/systems/construction.ts'
import { projectCapex } from '../../src/sim/systems/projects.ts'
import { getRegion } from '../../src/sim/systems/regions.ts'
import { landUsdMw, openCategories } from '../../src/sim/systems/scouting.ts'
import { capacityKw, poweredKw } from '../../src/sim/systems/sites.ts'
import { act2Company, ok } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const cat = (id: string) =>
  CONTENT.act2Sites.categories.find((c) => c.id === id)!

describe('the categories open by quarter', () => {
  it('distressed 2022Q4–2023Q4, greenfield from 2023Q1, energized land from 2024Q1', () => {
    const ids = (label: string) => openCategories(q(label)).map((c) => c.id)
    expect(ids('2022Q4')).toEqual(['distressed_miner_site'])
    expect(ids('2023Q2')).toEqual([
      'distressed_miner_site',
      'greenfield_new_site',
    ])
    expect(ids('2024Q2')).toEqual([
      'energized_land_powered_shell',
      'greenfield_new_site',
    ])
  })
})

describe('scouting', () => {
  it('1 Bandwidth: 2–3 offers from the open categories, sized and priced in their ranges, at most one hidden flaw each', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = ok(act2Company('2023Q2', seed), { type: 'SCOUT_SITES_ACT2' })
      expect(s.bandwidth).toBe(5)
      const offers = s.siteOffers.filter((o) => o.category)
      expect(offers.length).toBeGreaterThanOrEqual(2)
      expect(offers.length).toBeLessThanOrEqual(3)
      for (const o of offers) {
        const c = cat(o.category!)
        const mw = o.kw! / 1000
        expect(mw % 10).toBe(0)
        expect(mw).toBeGreaterThanOrEqual(c.mw_range[0])
        expect(mw).toBeLessThanOrEqual(c.mw_range[1])
        expect(o.capexUsd / mw).toBeGreaterThanOrEqual(c.price_usd_mw[0] - 1)
        expect(o.capexUsd / mw).toBeLessThanOrEqual(c.price_usd_mw[1] + 1)
        if (o.flaw !== null) expect(c.hidden_flaws).toContain(o.flaw)
        if (o.category === 'greenfield_new_site') {
          const [lo, hi] = getRegion(o.region as never).queue_months
          expect(o.readyQuarters).toBeGreaterThanOrEqual(Math.ceil(lo / 3))
          expect(o.readyQuarters).toBeLessThanOrEqual(Math.ceil(hi / 3))
        } else expect(o.readyQuarters).toBe(1)
      }
    }
  })

  it('about 70% of Act II offers carry a hidden flaw; the rest are clean (owner, 28 Sep 2026)', () => {
    const offers = [...Array(40).keys()].flatMap((seed) =>
      ok(act2Company('2023Q2', seed + 1), {
        type: 'SCOUT_SITES_ACT2',
      }).siteOffers.filter((o) => o.category),
    )
    const flawed = offers.filter((o) => o.flaw !== null).length / offers.length
    expect(flawed).toBeGreaterThan(0.55)
    expect(flawed).toBeLessThan(0.85)
  })

  it('energized land is priced as land: $1.2M/MW in 2024 ×(VA 1.25, Nordics 0.75), ±15%', () => {
    expect(landUsdMw(q('2024Q2'), 'ercot')).toBe(1_200_000)
    expect(landUsdMw(q('2025Q1'), 'pjm')).toBe(2_000_000)
    expect(landUsdMw(q('2026Q4'), 'nordics')).toBe(1_500_000)
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = ok(act2Company('2024Q2', seed), { type: 'SCOUT_SITES_ACT2' })
      for (const o of s.siteOffers.filter(
        (x) => x.category === 'energized_land_powered_shell',
      )) {
        const perMw = o.capexUsd / (o.kw! / 1000)
        const base = landUsdMw(q('2024Q2'), o.region as never)
        expect(perMw).toBeGreaterThanOrEqual(base * 0.85 - 1)
        expect(perMw).toBeLessThanOrEqual(base * 1.15 + 1)
      }
    }
  })

  it('replaces older Act II offers, keeps Act I ones, and is Act II only', () => {
    let s = act2Company('2023Q2')
    s.siteOffers.push({
      id: 'offer-act1',
      tier: 'warehouse',
      rentUsdQ: 1,
      capexUsd: 1,
      powerPriceMult: 1,
      flaw: null,
    })
    s = ok(s, { type: 'SCOUT_SITES_ACT2' })
    const first = s.siteOffers.filter((o) => o.category).map((o) => o.id)
    s = ok(s, { type: 'SCOUT_SITES_ACT2' })
    expect(s.siteOffers.some((o) => first.includes(o.id))).toBe(false)
    expect(s.siteOffers.some((o) => o.id === 'offer-act1')).toBe(true)
    expect(() =>
      ok({ ...act2Company('2023Q2'), act: 1 }, { type: 'SCOUT_SITES_ACT2' }),
    ).toThrow('error.act2_only')
  })
})

/** A company with one Act II offer of `category` with `flaw`, `mw` MW in `region`. */
function withOffer(
  flaw: string,
  category = 'distressed_miner_site',
  mw = 50,
  region = 'pjm',
): GameState {
  const s = act2Company('2023Q2')
  s.siteOffers.push({
    id: 'offer-x',
    tier: 'own_site',
    rentUsdQ: 0,
    capexUsd: 10_000_000,
    powerPriceMult: 1,
    flaw,
    category,
    kw: mw * 1000,
    region,
    readyQuarters: 1,
  })
  return s
}
const buy = (s: GameState) => ok(s, { type: 'BUILD_SITE', offerId: 'offer-x' })
const bought = (s: GameState): Site => s.sites.at(-1)!

describe('buying a site', () => {
  it('an owned site of its size, in its region, with power from next quarter (+ its flaw’s delay)', () => {
    const before = withOffer('water_limits')
    const s = buy(before)
    const site = bought(s)
    expect(site).toMatchObject({
      tier: 'own_site',
      category: 'distressed_miner_site',
      region: 'pjm',
      kw: 50_000,
      flaw: 'water_limits',
      readyQuarter: q('2023Q3'),
      rentUsdQ: 0,
    })
    expect(s.cash).toBe(before.cash - 10_000_000)
    expect(s.bandwidth).toBe(before.bandwidth - 1)
    expect(capacityKw(site)).toBe(40_000) // water limits: 80%
    expect(poweredKw(site, q('2023Q3'))).toBe(40_000)
    expect(s.siteOffers).toEqual([])
    // It pays PJM's power.
    expect(act2Quarter(q('2023Q3'))!.powerUsdKwh.pjm).toBeGreaterThan(0)
  })

  it('title defect: 2 quarters later and $500K; queue lost: 3 quarters later', () => {
    const before = withOffer('title_defect')
    const s = buy(before)
    expect(bought(s).readyQuarter).toBe(q('2023Q3') + 2)
    expect(s.cash).toBe(before.cash - 10_000_000 - 500_000)
    expect(bought(buy(withOffer('queue_position_lost'))).readyQuarter).toBe(
      q('2023Q3') + 3,
    )
  })

  it('fibre far away and poor power quality make AI builds there cost more per MW', () => {
    for (const [flaw, delta] of [
      ['fibre_distance', 300_000],
      ['tenant_unfit_power_quality', 400_000],
    ] as const) {
      const s = buy(withOffer(flaw, 'energized_land_powered_shell'))
      const site = bought(s)
      const at = (siteId?: string) =>
        projectCapex(
          s,
          { kw: 10_000, kind: 'shell', gpu: null, tenant: null, siteId },
          q('2024Q2'),
        ).retrofitUsd
      expect(at(site.id) - at(undefined)).toBeCloseTo(delta * 10, 0)
    }
  })

  it('an undersized transformer: 60% capacity until upgraded at $300K per MW of the site', () => {
    const site = bought(
      buy(withOffer('undersized_transformer', undefined, 100)),
    )
    expect(capacityKw(site)).toBe(60_000)
    expect(transformerUpgrade(site)!.costUsd).toBe(30_000_000)
  })
})
