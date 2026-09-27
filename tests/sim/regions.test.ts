// Act II regions for Act I sites (owner decision B3) and the power reservation on idle and
// under-construction MW (owner decision A2).
import { describe, expect, it } from 'vitest'
import { CONTENT, act2Quarter } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import { openingOfferUsdKwh } from '../../src/sim/systems/contracts.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  normalPriceUsdKwh,
  powerPriceUsdKwh,
  regionOf,
  smallLoadPremiumUsdKwh,
} from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const site = (tier: string, extra: Partial<Site> = {}): Site => ({
  id: `site-${tier}`,
  tier,
  readyQuarter: 0,
  rentUsdQ: 0,
  powerPriceMult: 1,
  flaw: null,
  ...extra,
})
const region = (label: string) => act2Quarter(q(label))!.powerUsdKwh

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}
function playQuarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('regions for Act I sites (owner B3)', () => {
  it('Texas → ERCOT; own site, warehouse and small unit → Georgia; the garage has none', () => {
    expect(regionOf(site('texas_site'))).toBe('ercot')
    expect(regionOf(site('own_site'))).toBe('georgia')
    expect(regionOf(site('warehouse'))).toBe('georgia')
    expect(regionOf(site('small_unit'))).toBe('georgia')
    expect(regionOf(site('garage'))).toBeUndefined()
    expect(regionOf(site('warehouse', { region: 'nordics' }))).toBe('nordics')
  })

  it('small-load premium: the 2022 gap over Georgia (small unit +6¢, warehouse +3.5¢), none elsewhere', () => {
    expect(smallLoadPremiumUsdKwh(site('small_unit'))).toBeCloseTo(0.06, 10)
    expect(smallLoadPremiumUsdKwh(site('warehouse'))).toBeCloseTo(0.035, 10)
    expect(smallLoadPremiumUsdKwh(site('own_site'))).toBe(0)
    expect(smallLoadPremiumUsdKwh(site('texas_site'))).toBe(0)
  })

  it('Act II normal prices follow the region series (+ premium); Act I is unchanged', () => {
    const g = region('2024Q2').georgia
    expect(normalPriceUsdKwh(site('own_site'), q('2024Q2'))).toBeCloseTo(g, 10)
    expect(normalPriceUsdKwh(site('warehouse'), q('2024Q2'))).toBeCloseTo(
      g + 0.035,
      10,
    )
    expect(normalPriceUsdKwh(site('small_unit'), q('2024Q2'))).toBeCloseTo(
      g + 0.06,
      10,
    )
    // Texas: fixed = ERCOT; index keeps its Act I discount to fixed (2.8¢ vs 3.5¢).
    const e = region('2024Q2').ercot
    expect(
      normalPriceUsdKwh(site('texas_site'), q('2024Q2'), 'fixed'),
    ).toBeCloseTo(e, 10)
    expect(
      normalPriceUsdKwh(site('texas_site'), q('2024Q2'), 'index'),
    ).toBeCloseTo(e * 0.8, 10)
    // The scouting multiplier still applies.
    expect(
      normalPriceUsdKwh(site('own_site', { powerPriceMult: 1.1 }), q('2024Q2')),
    ).toBeCloseTo(g * 1.1, 10)
    // Act I and the garage keep their paths (the garage holds its 2022 household price).
    expect(normalPriceUsdKwh(site('own_site'), q('2022Q3'))).toBe(0.05)
    expect(normalPriceUsdKwh(site('garage'), q('2025Q1'))).toBe(0.15)
  })

  it('a site keeps its Act I contract until renewal, then renews against the region', () => {
    const s = site('own_site', {
      contract: {
        type: 'fixed',
        price: 0.0569,
        startQuarter: q('2022Q2'),
        endQuarter: q('2023Q1'),
      },
    })
    expect(powerPriceUsdKwh(s, q('2022Q4'))).toBe(0.0569)
    expect(openingOfferUsdKwh(s, q('2023Q1'), 'fixed')).toBeCloseTo(
      region('2023Q1').georgia * CONTENT.negotiation.openingMult,
      10,
    )
  })
})

describe('power reservation on idle and under-construction MW (owner A2)', () => {
  it('an idle 1 MW warehouse pays 25% of its full-load power for the quarter, on top of rent', () => {
    let s: GameState = {
      ...newGame(1),
      act: 2,
      quarter: q('2024Q2'),
      cash: 1_000_000,
    }
    s.sites.push(site('warehouse'))
    const price = normalPriceUsdKwh(s.sites[1], s.quarter)
    s = playQuarter(s)
    const r = s.reports.at(-1)!
    expect(r.reservationUsd).toBeCloseTo(1000 * 2190 * price * 0.25, 0)
    expect(r.powerCostUsd).toBeGreaterThanOrEqual(r.reservationUsd)
  })

  it('there is no reservation in Act I, nor on the garage', () => {
    let s: GameState = { ...newGame(1), quarter: q('2022Q2'), cash: 1_000_000 }
    s.sites.push(site('warehouse'))
    s = playQuarter(s)
    expect(s.reports.at(-1)!.reservationUsd).toBe(0)
    let g: GameState = { ...newGame(1), act: 2, quarter: q('2024Q2') }
    g = playQuarter(g)
    expect(g.reports.at(-1)!.reservationUsd).toBe(0)
  })
})
