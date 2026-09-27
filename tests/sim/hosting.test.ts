// Hosting (Act II, scope 0.2 §2.4; doc 18 §4, §5.3 and §2.3): the same-site conversion, the
// all-in rate by year, 4-quarter terms that renew, fees and power in EBITDA, and ending a contract.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  endHostingFeeUsd,
  hostingRateUsdKwh,
  quarterFeesUsd,
} from '../../src/sim/systems/hosting.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { heatOf } from '../../src/sim/systems/heat.ts'
import { siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { ebitdaUsd } from '../../src/sim/systems/valuation.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

const warehouse: Site = {
  id: 'site-2',
  tier: 'warehouse',
  readyQuarter: 0,
  rentUsdQ: 0,
  powerPriceMult: 1,
  flaw: null,
}

/** An Act II company with an empty 1 MW warehouse, in the Plan phase of `label`. */
function act2(label = '2022Q4'): GameState {
  const s: GameState = {
    ...newGame(1),
    act: 2,
    quarter: q(label),
    cash: 5_000_000,
    bandwidth: 3,
  }
  s.sites.push({ ...warehouse })
  return s
}

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Plays the live quarter to its report (default answers to alerts), then starts the next. */
function playQuarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('hosting (scope 0.2 §2.4)', () => {
  it('the all-in rate: $0.085 (2022), $0.075 (2023), $0.060 (2024), then 2024’s', () => {
    expect(hostingRateUsdKwh(q('2022Q4'))).toBe(0.085)
    expect(hostingRateUsdKwh(q('2023Q2'))).toBe(0.075)
    expect(hostingRateUsdKwh(q('2024Q3'))).toBe(0.06)
    expect(hostingRateUsdKwh(q('2026Q4'))).toBe(0.06)
  })

  it('is Act II only, never the garage, and needs free energized kW', () => {
    const s1 = { ...act2(), act: 1 as const, quarter: q('2022Q3') }
    const r1 = applyAction(s1, {
      type: 'HOST_START',
      siteId: 'site-2',
      kw: 100,
    })
    expect(!r1.ok && r1.error.key).toBe('error.act2_only')
    const s = act2()
    const garage = applyAction(s, {
      type: 'HOST_START',
      siteId: 'site-1',
      kw: 1,
    })
    expect(!garage.ok && garage.error.key).toBe('error.hosting_garage')
    const big = applyAction(s, {
      type: 'HOST_START',
      siteId: 'site-2',
      kw: 1001,
    })
    expect(!big.ok && big.error.key).toBe('error.no_hosting_room')
  })

  it('converting costs $0.1M per MW and 1 Bandwidth; it goes live next quarter', () => {
    let s = act2('2022Q4')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 600 })
    expect(s.cash).toBe(5_000_000 - 60_000)
    expect(s.bandwidth).toBe(3 - BALANCE.hosting.bandwidth)
    const h = s.hosting[0]
    expect(h.readyQuarter).toBe(q('2023Q1'))
    // Signed for 2023Q1 → 2023's rate, for 4 quarters.
    expect(h.rateUsdKwh).toBe(0.075)
    expect(h.termEndQuarter).toBe(q('2023Q4'))
    // This quarter the 600 kW are being converted; next quarter they're hosting.
    expect(siteMwByUse(s, s.sites[1], s.quarter)).toMatchObject({
      building: 600,
      idle: 400,
      hosting: 0,
    })
    expect(siteMwByUse(s, s.sites[1], s.quarter + 1).hosting).toBe(600)
  })

  it('pays nothing while converting; then the fees come in and the site pays the power', () => {
    let s = act2('2022Q4')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 600 })
    s = playQuarter(s)
    expect(s.reports.at(-1)!.hostingFeesUsd).toBe(0)
    s = ok(s, { type: 'NEXT_QUARTER' })
    const site = s.sites.find((x) => x.id === 'site-2')!
    const priceUsdKwh = powerPriceUsdKwh(site, s.quarter)
    const cashBefore = s.cash
    s = playQuarter(s)
    const r = s.reports.at(-1)!
    const kwh = 600 * 24 * 7 * 13
    expect(r.hostingFeesUsd).toBeCloseTo(kwh * 0.075, 2)
    expect(r.marginByTier.warehouse).toBeCloseTo(kwh * (0.075 - priceUsdKwh), 2)
    // The fees count toward EBITDA (and so the valuation).
    expect(r.ebitdaUsd).toBeCloseTo(ebitdaUsd(r), 6)
    expect(r.hostingFeesUsd).toBeGreaterThan(0)
    expect(s.cash).toBeLessThan(cashBefore + r.hostingFeesUsd)
  })

  it('renews after 4 quarters at the then-current rate', () => {
    let s = act2('2023Q3')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 100 }) // live 2023Q4–2024Q3 at 0.075
    expect(s.hosting[0].rateUsdKwh).toBe(0.075)
    for (let i = 0; i < 5; i++) s = ok(playQuarter(s), { type: 'NEXT_QUARTER' })
    expect(CONTENT.quarters[s.quarter]).toBe('2024Q4')
    expect(s.hosting[0].rateUsdKwh).toBe(0.06)
    expect(s.hosting[0].termEndQuarter).toBe(q('2025Q3'))
    expect(s.log.some((e) => e.key === 'log.hosting_renewed')).toBe(true)
  })

  it('ending: free while converting or as a term renews, else a quarter of fees', () => {
    let s = act2('2022Q4')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 500 })
    expect(endHostingFeeUsd(s, s.hosting[0])).toBe(0) // still converting
    s = ok(playQuarter(s), { type: 'NEXT_QUARTER' }) // 2023Q1: live, mid-term
    const fee = endHostingFeeUsd(s, s.hosting[0])
    expect(fee).toBe(Math.round(quarterFeesUsd(s.hosting[0])))
    expect(fee).toBe(Math.round(500 * 24 * 7 * 13 * 0.075))
    const cash = s.cash
    const ended = ok(s, { type: 'HOST_END', contractId: s.hosting[0].id })
    expect(ended.cash).toBe(cash - fee)
    expect(ended.hosting).toEqual([])
    // Played on to the renewal (2024Q1 starts a new term): ending then is free.
    for (let i = 0; i < 4; i++) s = ok(playQuarter(s), { type: 'NEXT_QUARTER' })
    expect(CONTENT.quarters[s.quarter]).toBe('2024Q1')
    expect(endHostingFeeUsd(s, s.hosting[0])).toBe(0)
  })

  it('hosted machines add to the site’s Heat load', () => {
    let s = act2('2022Q4')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 1000 })
    s = ok(playQuarter(s), { type: 'NEXT_QUARTER' })
    const before = heatOf(s, 'site-2').load
    s = playQuarter(s)
    expect(before).toBe(0)
    expect(heatOf(s, 'site-2').load).toBeGreaterThan(0)
  })

  it('leaving the site ends its hosting', () => {
    let s = act2('2022Q4')
    s = ok(s, { type: 'HOST_START', siteId: 'site-2', kw: 100 })
    s = ok(s, { type: 'LEAVE_SITE', siteId: 'site-2' })
    expect(s.hosting).toEqual([])
  })
})
