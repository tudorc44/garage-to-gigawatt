// M35 (doc 38 §4): energy options in the early eras and at sites. Owned generation is a badge with an honest payback,
// small wind hides its real capacity factor, a home battery rides machines through outages, utility batteries and
// on-site renewables give firm power only together, and special sites have their own prices and limits.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { ENERGY, energyYear, itcPct } from '../../src/content/energyContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  billOffsetUsd,
  buildCostUsd,
  energyChoices,
  paybackYears,
} from '../../src/sim/systems/energy.ts'
import { firmKw, flareOutput } from '../../src/sim/systems/energyAssets.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { mineWeek } from '../../src/sim/systems/mining.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import { capacityKw, normalPriceUsdKwh, poweredKw, uptime } from '../../src/sim/systems/sites.ts'
import { pudTariff, specialStatus } from '../../src/sim/systems/specialSites.ts'
import { act2Company } from './act2Helpers.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Plays the live quarter to its report (alerts take their default) and moves on to the next Plan phase. */
function playQuarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) }) : advance(s)
  return ok(s, { type: 'NEXT_QUARTER' })
}

/** An Act I game in the Plan phase of `label` with $1M and 20 S9s in the garage. */
function act1(label: string, seed = 1): GameState {
  const s = { ...newGame(seed), quarter: q(label) }
  s.cash = 1_000_000
  s.machines.push({ id: 'lot-9', model: 's9', siteId: 'site-1', condition: 'new', count: 3, failed: 0, earnsFromQuarter: 0 })
  return s
}

describe('the energy market file', () => {
  it('has one row per year, 2009-2040, and the ITC steps of doc 38 §4.1', () => {
    expect(ENERGY.market.map((r) => r.year)).toEqual(Array.from({ length: 32 }, (_, i) => 2009 + i))
    expect(energyYear(2014).res_solar_usd_w).toBe(4.3)
    expect(energyYear(2025).bess_usd_kwh_us).toBe(219)
    expect(energyYear(2023).texas_summer).toBe('hot')
    expect([itcPct('2019Q4'), itcPct('2021Q2'), itcPct('2022Q2'), itcPct('2022Q3')]).toEqual([30, 26, 26, 30])
  })
})

describe('rooftop solar (doc 38 §4.1)', () => {
  it('costs $/W × kW net of the tax credit, offsets the bill and shows a long payback', () => {
    let s = act1('2018Q1')
    const garage = s.sites[0]
    expect(buildCostUsd(s, garage, 'rooftop_solar', 7)).toBe(7 * 3800 * 0.7)
    s = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-1', kind: 'rooftop_solar', size: 7 })
    const solar = s.sites[0].energy![0]
    expect(solar.readyQuarter).toBe(q('2018Q2'))
    s = playQuarter(s)
    s = playQuarter(s)
    const report = s.reports.at(-1)!
    expect(report.energyRevenueUsd).toBeGreaterThan(0)
    // The honesty line: decades, not years (the roof is a badge, not a cost cutter: E-D1).
    const years = paybackYears(s, s.sites[0], s.sites[0].energy![0])!
    expect(years).toBeGreaterThan(10)
  })

  it('has no room at a site whose tier has no roof (a rented unit)', () => {
    const s = act1('2018Q1')
    s.sites.push({ id: 'site-7', tier: 'small_unit', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
    expect(energyChoices(s, s.sites[1]).map((c) => c.kind)).not.toContain('rooftop_solar')
    expect(applyAction(s, { type: 'ENERGY_BUILD', siteId: 'site-7', kind: 'rooftop_solar', size: 5 }).ok).toBe(false)
  })

  it('a quarter without an energy asset books no energy line (earlier reports are untouched)', () => {
    const s = playQuarter(act1('2018Q1'))
    expect(s.reports.at(-1)!.energyRevenueUsd).toBeUndefined()
    expect(s.quarterStats.energyCostUsd).toBeUndefined()
  })
})

describe('small wind, the trap (doc 38 §4.2)', () => {
  it('draws a realised capacity factor of 8-15% against the pitched 20%', () => {
    const cfs: number[] = []
    for (let seed = 1; seed <= 20; seed++) {
      const s = ok(act1('2018Q1', seed), { type: 'ENERGY_BUILD', siteId: 'site-1', kind: 'small_wind', size: 10 })
      cfs.push(s.sites[0].energy![0].cf!)
    }
    expect(Math.min(...cfs)).toBeGreaterThanOrEqual(0.08)
    expect(Math.max(...cfs)).toBeLessThanOrEqual(0.15)
  })

  it('quotes the pitched capacity factor until its first report, then the real one', () => {
    let s = ok(act1('2018Q1'), { type: 'ENERGY_BUILD', siteId: 'site-1', kind: 'small_wind', size: 10 })
    const before = paybackYears(s, s.sites[0], s.sites[0].energy![0])
    for (let i = 0; i < 3; i++) s = playQuarter(s)
    const after = paybackYears(s, s.sites[0], s.sites[0].energy![0])
    // The real one is worse (or never pays back at all).
    expect(after === null || (before !== null && after > before)).toBe(true)
  })
})

describe('home battery (doc 38 §4.3)', () => {
  it('keeps its share of machines running through outages at an unreliable site; earns no arbitrage', () => {
    const s = act1('2018Q1')
    const site: Site = { id: 'site-7', tier: 'warehouse', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: 'unreliable_power' }
    s.sites.push(site)
    s.machines.push({ id: 'lot-7', model: 's9', siteId: 'site-7', condition: 'new', count: 4, failed: 0, earnsFromQuarter: 0 })
    const w = marketWeek(s.quarter, 0)
    const rev = (st: GameState) => mineWeek(st, w).find((l) => l.lotId === 'lot-7')!.revenueUsd
    const without = rev(s)
    let b = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-7', kind: 'home_battery', size: 4 })
    b = { ...b, quarter: b.quarter + 1 }
    expect(rev(b)).toBeGreaterThan(without)
    expect(billOffsetUsd(b, b.sites[1])).toBe(0)
  })
})

describe('utility battery and on-site renewables (doc 38 §4.8-4.9)', () => {
  it('renewables add no firm power alone; with a 4-hour battery 30% of what it covers', () => {
    let s = act2Company('2024Q1')
    const before = capacityKw(s.sites[1])
    s = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-2', kind: 'btm_solar', size: 10 })
    expect(capacityKw(s.sites[1])).toBe(before)
    s = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-2', kind: 'bess', size: 5, hours: 4 })
    // Planned capacity counts it at once; energized power once both are built (solar 4 quarters, battery 3).
    expect(capacityKw(s.sites[1])).toBe(before + 5000 * 0.3)
    expect(poweredKw(s.sites[1], s.quarter + 3)).toBe(before)
    expect(firmKw(s.sites[1], s.quarter + 4)).toBe(1500)
    expect(poweredKw(s.sites[1], s.quarter + 4)).toBe(before + 1500)
  })

  it('a battery in PJM earns the capacity payment in Act III', () => {
    let s = act3ScenarioCompany('s0')
    s.sites[1].region = 'pjm'
    s = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-2', kind: 'bess', size: 10, hours: 4 })
    for (let i = 0; i < 4; i++) s = playQuarter(s)
    expect(s.reports.at(-1)!.energyRevenueUsd).toBeGreaterThan(10 * 300 * 91 * 0.6 * 0.95)
  })

  it('is offered from Act II only, at utility-scale sites', () => {
    const early = act1('2021Q1')
    early.sites.push({ id: 'site-7', tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
    expect(energyChoices(early, early.sites[1]).map((c) => c.kind)).not.toContain('bess')
    const s = act2Company('2024Q1')
    expect(energyChoices(s, s.sites[1]).map((c) => c.kind)).toEqual(expect.arrayContaining(['bess', 'btm_solar', 'btm_wind']))
    expect(energyChoices(s, s.sites[0]).map((c) => c.kind)).not.toContain('bess')
  })
})

describe('special sites (doc 38 §4.4-4.6)', () => {
  /** An Act I game with a warehouse (special sites show from a warehouse up). */
  function withWarehouse(label: string, seed = 1): GameState {
    const s = act1(label, seed)
    s.sites.push({ id: 'site-7', tier: 'warehouse', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
    s.nextId = 8
    return s
  }

  it('leases a hydro allocation at its own cheap price, one a quarter', () => {
    let s = withWarehouse('2017Q2')
    s = ok(s, { type: 'SPECIAL_LEASE', kind: 'pud' })
    const pud = s.sites.at(-1)!
    expect(pud.special).toBe('pud')
    expect(normalPriceUsdKwh(pud, s.quarter)).toBeCloseTo(0.026 * 0.95)
    expect(specialStatus(s, 'quebec')).toBe('queue_full')
    expect(applyAction(s, { type: 'SPECIAL_LEASE', kind: 'quebec' }).ok).toBe(false)
  })

  it('PUD (M39.2): 2.6¢; no new sites 2018Q1-2019Q1; from 2019Q2 a tariff ramps to ×2.5-3.0 over 8-12 quarters, existing load too', () => {
    expect(specialStatus(withWarehouse('2017Q4'), 'pud')).toBe('open')
    expect(specialStatus(withWarehouse('2018Q1'), 'pud')).toBe('moratorium')
    expect(specialStatus(withWarehouse('2019Q1'), 'pud')).toBe('moratorium')
    expect(specialStatus(withWarehouse('2019Q2'), 'pud')).toBe('open')
    for (let seed = 1; seed <= 10; seed++) {
      const t = pudTariff(withWarehouse('2017Q1', seed))!
      expect(t.from).toBe(q('2019Q2'))
      expect(t.mult).toBeGreaterThanOrEqual(2.5)
      expect(t.mult).toBeLessThanOrEqual(3.0)
      expect(t.quarters).toBeGreaterThanOrEqual(8)
      expect(t.quarters).toBeLessThanOrEqual(12)
    }
    // a site taken in 2017 (before the tariff) carries the ramp: the existing load pays it too, no renewal needed
    const s = ok(withWarehouse('2017Q2'), { type: 'SPECIAL_LEASE', kind: 'pud' })
    const pud = s.sites.at(-1)!
    const t = pud.tariffRamp!
    const base = 0.026 * 0.95
    expect(normalPriceUsdKwh(pud, q('2019Q1'))).toBeCloseTo(base)
    expect(normalPriceUsdKwh(pud, t.from)).toBeCloseTo(base * (1 + (t.mult - 1) / t.quarters))
    expect(normalPriceUsdKwh(pud, t.from + t.quarters - 1)).toBeCloseTo(base * t.mult)
    expect(normalPriceUsdKwh(pud, t.from + t.quarters + 4)).toBeCloseTo(base * t.mult)
  })

  it('muni (M39.2): 2.0¢ until 2017Q4; no new sites for 6 quarters from 2018Q1; from 2018Q1 the overage at market price', () => {
    expect(specialStatus(withWarehouse('2019Q2'), 'muni')).toBe('moratorium')
    expect(specialStatus(withWarehouse('2019Q3'), 'muni')).toBe('open')
    const s = ok(withWarehouse('2017Q2'), { type: 'SPECIAL_LEASE', kind: 'muni' })
    const muni = s.sites.at(-1)!
    expect(normalPriceUsdKwh(muni, q('2017Q4'))).toBeCloseTo(0.02)
    // from 2018Q1: what a normal warehouse pays, if that's more
    const market = (quarter: number) => normalPriceUsdKwh({ ...muni, special: undefined }, quarter)
    for (const l of ['2018Q1', '2020Q2', '2022Q1'])
      expect(normalPriceUsdKwh(muni, q(l))).toBeCloseTo(Math.max(0.02, market(q(l))))
    expect(market(q('2018Q1'))).toBeGreaterThan(0.02)
  })

  it('Québec (M39.2): grandfathered at 4.5¢; no new sites 2018Q2-2019Q3; new ones from 2019Q4 lose 3.4% to curtailment', () => {
    const early = ok(withWarehouse('2018Q1'), { type: 'SPECIAL_LEASE', kind: 'quebec' })
    const old = early.sites.at(-1)!
    expect(normalPriceUsdKwh(old, q('2021Q1'))).toBeCloseTo(0.045 * 0.95)
    expect(uptime(old, q('2021Q1'))).toBe(1)
    expect(specialStatus(withWarehouse('2018Q2'), 'quebec')).toBe('moratorium')
    expect(specialStatus(withWarehouse('2019Q3'), 'quebec')).toBe('moratorium')
    const late = ok(withWarehouse('2019Q4'), { type: 'SPECIAL_LEASE', kind: 'quebec' })
    const curtailed = late.sites.at(-1)!
    expect(normalPriceUsdKwh(curtailed, q('2021Q1'))).toBeCloseTo(0.045 * 0.95)
    expect(uptime(curtailed, q('2021Q1'))).toBeCloseTo(1 - 0.034)
  })

  it('Iceland (M39.3): every other quarter in 2018, stops from 2021Q4; machines shipped there take a quarter longer', () => {
    expect(specialStatus(withWarehouse('2018Q1'), 'iceland')).toBe('open')
    expect(specialStatus(withWarehouse('2018Q2'), 'iceland')).toBe('rationed')
    expect(specialStatus(withWarehouse('2018Q3'), 'iceland')).toBe('open')
    expect(specialStatus(withWarehouse('2018Q4'), 'iceland')).toBe('rationed')
    expect(specialStatus(withWarehouse('2019Q1'), 'iceland')).toBe('open')
    expect(specialStatus(withWarehouse('2022Q1'), 'iceland')).toBe('frozen')
    let s = ok(withWarehouse('2019Q1'), { type: 'SPECIAL_LEASE', kind: 'iceland' })
    const ice = s.sites.at(-1)!
    s = { ...s, quarter: ice.readyQuarter }
    s = ok(s, { type: 'BUY_MACHINES', model: 's9', condition: 'new', count: 1, siteId: ice.id })
    const lot = s.machines.at(-1)!
    const home = ok({ ...s, machines: [] }, { type: 'BUY_MACHINES', model: 's9', condition: 'new', count: 1, siteId: 'site-7' })
    expect(lot.earnsFromQuarter).toBe(home.machines.at(-1)!.earnsFromQuarter + 1)
  })

  it('Iceland (M39.3): the price is locked when taken (4.3¢ in 2017, 5.1-7.1¢ after); the 2021Q4 dry winter costs a week', () => {
    const early = ok(withWarehouse('2017Q3'), { type: 'SPECIAL_LEASE', kind: 'iceland' }).sites.at(-1)!
    expect(early.lockedUsdKwh).toBe(0.043)
    expect(normalPriceUsdKwh(early, q('2022Q1'))).toBeCloseTo(0.043 * 0.9)
    const prices = new Set<number>()
    for (let seed = 1; seed <= 10; seed++) {
      const ice = ok(withWarehouse('2019Q1', seed), { type: 'SPECIAL_LEASE', kind: 'iceland' }).sites.at(-1)!
      expect(ice.lockedUsdKwh!).toBeGreaterThanOrEqual(0.051)
      expect(ice.lockedUsdKwh!).toBeLessThanOrEqual(0.071)
      // locked: the same in every later year
      expect(normalPriceUsdKwh(ice, q('2021Q3'))).toBeCloseTo(ice.lockedUsdKwh! * 0.9)
      prices.add(ice.lockedUsdKwh!)
    }
    expect(prices.size).toBeGreaterThan(5)
    // the dry winter: an Iceland site already running loses one week of 2021Q4's output
    expect(uptime(early, q('2021Q4'))).toBeCloseTo(12 / 13)
    expect(uptime(early, q('2022Q1'))).toBe(1)
  })

  it('a flare pad is mining only, declines after a year and can move to a new well', () => {
    let s = act2Company('2023Q1')
    s = ok(s, { type: 'SPECIAL_LEASE', kind: 'flare' })
    const pad = s.sites.at(-1)!
    const ready = pad.readyQuarter
    expect(flareOutput(pad, ready)).toBeCloseTo(0.85)
    expect(flareOutput(pad, ready + 3)).toBeCloseTo(0.85)
    expect(flareOutput(pad, ready + 4)).toBeCloseTo(0.85 * 0.92)
    expect(applyAction(s, { type: 'PROJECT_OPEN', siteId: pad.id, kw: 1000, kind: 'pilot' })).toMatchObject({
      ok: false,
      error: { key: 'error.flare_mining_only' },
    })
    s = { ...s, quarter: ready + 6 }
    s = ok(s, { type: 'FLARE_RELOCATE', siteId: pad.id })
    const moved = s.sites.at(-1)!
    expect(flareOutput(moved, s.quarter)).toBe(0)
    expect(flareOutput(moved, s.quarter + 1)).toBeCloseTo(0.85)
  })
})

describe('a game without energy plays as before', () => {
  it('leaves every new field out of the state', () => {
    let s = act1('2018Q1')
    for (let i = 0; i < 2; i++) s = playQuarter(s)
    expect(JSON.stringify(s)).not.toMatch(/"energy"|"special"|"dr"|"flare"|energyRevenueUsd/)
  })
})
