// M35.4 (doc 38 §4.7-4.8, E-D6): Texas flexibility. Demand-response credits are paid each summer on curtailable MW
// (miners), by the summer's type; GPU MW never earn them unless a utility battery carries the AI load (E-B5's finding);
// 4CP trades 1.5% of Q3's output for a flat saving next year (M39.1); refusing a call while enrolled forfeits the year.
// M39.1 (doc 41): the credit is split into demand response and, for a fixed-price site, the resale of that power.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { ENERGY } from '../../src/content/energyContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState, Project } from '../../src/sim/state.ts'
import { endQuarterTexas, curtailableMw, fourCpSavingUsdMwYr, summerOf } from '../../src/sim/systems/texasPower.ts'
import { hashrateMult, powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** An Act II company with a 100 MW Texas site on a fixed contract and 10 MW of S19 Pros there, in `label`'s Plan phase. */
function texasCompany(label: string): GameState {
  const s = act2Company(label)
  s.sites.push({
    id: 'site-9',
    tier: 'texas_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    contract: { type: 'fixed', price: 0.035, startQuarter: s.quarter, endQuarter: s.quarter + 8 },
  })
  s.machines.push({ id: 'lot-9', model: 's19pro', siteId: 'site-9', condition: 'new', count: 3077, failed: 0, earnsFromQuarter: 0 })
  s.nextId = 10
  return s
}

/** A live 20 MW AI shell at the Texas site (enough of one for the rules here). */
function liveAi(s: GameState, kw = 20_000): void {
  s.projects.push({ id: 'project-9', siteId: 'site-9', kind: 'shell', kw, stage: 'live' } as Project)
}

describe('demand response (doc 38 §4.7)', () => {
  it('pays enrolled miner MW at Q3 end by the summer type: 2023 is hot; a fixed-price site gets DR and resale (M39.1)', () => {
    let s = texasCompany('2023Q3')
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })
    const mw = curtailableMw(s, s.sites[2])
    expect(mw).toBeCloseTo(10, 0)
    expect(summerOf('2023')).toBe('hot')
    const t = endQuarterTexas(s)
    expect(t.drUsd[0].usd).toBeCloseTo(mw * ENERGY.texas.dr_usd_mw_yr.hot, 2)
    expect(t.resaleUsd[0].usd).toBeCloseTo(mw * ENERGY.texas.resale_usd_mw_yr.hot, 2)
    expect(t.revenueUsd).toBeCloseTo(mw * (ENERGY.texas.dr_usd_mw_yr.hot + ENERGY.texas.resale_usd_mw_yr.hot), 2)
    // Not in another quarter, and not for a site that didn't enrol.
    expect(endQuarterTexas({ ...s, quarter: q('2023Q2') }).revenueUsd).toBe(0)
    expect(endQuarterTexas(texasCompany('2023Q3')).revenueUsd).toBe(0)
  })

  it('a site whose contract floated after enrolling earns DR only: no fixed price, no resale (M39.1)', () => {
    let s = texasCompany('2023Q3')
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })
    s.sites[2].contract!.type = 'index'
    const t = endQuarterTexas(s)
    expect(t.drUsd).toHaveLength(1)
    expect(t.resaleUsd).toEqual([])
    expect(t.revenueUsd).toBeCloseTo(curtailableMw(s, s.sites[2]) * ENERGY.texas.dr_usd_mw_yr.hot, 2)
  })

  it('the backlash: a payment over $30M (M39.1; was $50M a year)', () => {
    let s = texasCompany('2023Q3')
    s.machines[s.machines.length - 1].count *= 400 // ~4 GW of miners: about $420M in a hot summer
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })
    expect(ENERGY.texas.backlash.payment_usd).toBe(30e6)
    endQuarterTexas(s)
    expect(s.log.some((e) => e.key === 'log.texas.backlash')).toBe(true)
  })

  it('needs an ERCOT site on a fixed contract, from 2020', () => {
    const s = texasCompany('2023Q1')
    s.sites[2].contract!.type = 'index'
    expect(applyAction(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })).toMatchObject({ ok: false, error: { key: 'error.texas_needs_fixed' } })
    expect(applyAction(texasCompany('2023Q1'), { type: 'TEXAS_SET', siteId: 'site-2', enrolled: true })).toMatchObject({ ok: false })
  })

  it('refusing a call while enrolled forfeits the year', () => {
    let s = texasCompany('2023Q3')
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })
    s.sites[2].dr!.forfeitYear = '2023'
    expect(endQuarterTexas(s).revenueUsd).toBe(0)
  })

  it('E-B5: a site that turns all its miners into AI loses its credits unless a battery carries the AI load', () => {
    let s = texasCompany('2024Q3')
    s.machines = []
    liveAi(s)
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', enrolled: true })
    expect(curtailableMw(s, s.sites[2])).toBe(0)
    expect(endQuarterTexas(s).revenueUsd).toBe(0)
    s = ok(s, { type: 'ENERGY_BUILD', siteId: 'site-9', kind: 'bess', size: 20, hours: 4 })
    s.sites[2].energy![0].readyQuarter = s.quarter
    expect(curtailableMw(s, s.sites[2])).toBe(20)
    expect(endQuarterTexas(s).revenueUsd).toBe(20 * (ENERGY.texas.dr_usd_mw_yr.normal + ENERGY.texas.resale_usd_mw_yr.normal))
  })
})

describe('4CP (doc 38 §4.7; M39.1, doc 40 §Q4)', () => {
  it('costs 1.5% of Q3 output and saves a flat amount per enrolled MW off next year, a quarter each quarter', () => {
    let s = texasCompany('2022Q3')
    const site = () => s.sites[2]
    const price2023 = powerPriceUsdKwh(site(), q('2023Q1'))
    s = ok(s, { type: 'TEXAS_SET', siteId: 'site-9', fourCp: true })
    expect(hashrateMult(site(), q('2022Q3'))).toBeCloseTo(1 - 0.015)
    expect(hashrateMult(site(), q('2022Q4'))).toBe(1)
    const mw = curtailableMw(s, site())
    endQuarterTexas(s)
    expect(site().dr!.discountYear).toBe('2023')
    expect(site().dr!.fourCpSavingUsd).toBeCloseTo(mw * fourCpSavingUsdMwYr('2023'), 2)
    expect(fourCpSavingUsdMwYr('2023')).toBe(50_000)
    expect(fourCpSavingUsdMwYr('2026')).toBe(60_000)
    // the price itself doesn't change any more
    expect(powerPriceUsdKwh(site(), q('2023Q1'))).toBe(price2023)
    // in each quarter of 2023 a quarter of the saving comes off the power cost
    const in2023 = { ...structuredClone(s), quarter: q('2023Q2') }
    const before = in2023.quarterStats.powerCostUsd
    const t = endQuarterTexas(in2023)
    expect(Math.abs(t.fourCpUsd[0].usd - site().dr!.fourCpSavingUsd! / 4)).toBeLessThanOrEqual(0.005 + 1e-9)
    expect(in2023.quarterStats.powerCostUsd).toBe(before - t.fourCpUsd[0].usd)
    expect(endQuarterTexas({ ...structuredClone(s), quarter: q('2024Q2') }).fourCpUsd).toEqual([])
  })

  it('AI halls can only shed the peaks with a battery as big as their load', () => {
    const s = texasCompany('2024Q1')
    liveAi(s)
    expect(applyAction(s, { type: 'TEXAS_SET', siteId: 'site-9', fourCp: true })).toMatchObject({
      ok: false,
      error: { key: 'error.texas_ai_needs_battery' },
    })
  })
})
