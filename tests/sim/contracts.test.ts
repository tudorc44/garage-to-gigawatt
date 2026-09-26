import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  openingOfferUsdKwh,
  renewalDue,
  startQuarterContracts,
} from '../../src/sim/systems/contracts.ts'
import {
  normalPriceUsdKwh,
  powerPriceUsdKwh,
} from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
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

/** A game in `label` with a `tier` site (site-2) that is powered this quarter. */
function powered(tier: string, label: string, mult = 1): GameState {
  const s = { ...newGame(1), quarter: q(label) }
  const site: Site = {
    id: 'site-2',
    tier,
    readyQuarter: q(label),
    rentUsdQ: 0,
    powerPriceMult: mult,
    flaw: null,
  }
  s.sites.push(site)
  startQuarterContracts(s)
  return s
}
const site2 = (s: GameState) => s.sites[1]

describe('power contracts', () => {
  it('the first starts when the site is powered: normal price (scouting multiplier included), 4 quarters', () => {
    const s = powered('warehouse', '2018Q2', 0.9)
    expect(site2(s).contract).toMatchObject({
      type: 'fixed',
      startQuarter: q('2018Q2'),
      endQuarter: q('2019Q2'),
    })
    expect(site2(s).contract!.price).toBeCloseTo(0.06 * 0.9)
    expect(powerPriceUsdKwh(site2(s), s.quarter)).toBeCloseTo(0.054)
  })

  it('the garage has none: household price as before', () => {
    const s = newGame(1)
    startQuarterContracts(s)
    expect(s.sites[0].contract).toBeUndefined()
    expect(powerPriceUsdKwh(s.sites[0], 0)).toBeCloseTo(0.12)
  })

  it('the price is locked for the term: the warehouse keeps 6¢ when the 2019 path drops to 5.5¢', () => {
    const s = powered('warehouse', '2018Q4')
    expect(normalPriceUsdKwh(site2(s), q('2019Q1'))).toBeCloseTo(0.055)
    expect(powerPriceUsdKwh(site2(s), q('2019Q1'))).toBeCloseTo(0.06)
  })

  it('at the end of the term a renewal is due; doing nothing takes the opening (+10%) for 4 quarters', () => {
    let s = powered('warehouse', '2018Q2')
    s = { ...s, quarter: q('2019Q2') }
    expect(renewalDue(s, site2(s))).toBe(true)
    expect(openingOfferUsdKwh(site2(s), s.quarter, 'fixed')).toBeCloseTo(
      0.055 * 1.1,
    )
    s = ok(s, { type: 'END_PLAN' })
    expect(site2(s).contract).toMatchObject({
      type: 'fixed',
      startQuarter: q('2019Q2'),
      endQuarter: q('2020Q2'),
    })
    expect(site2(s).contract!.price).toBeCloseTo(0.055 * 1.1)
  })

  it('accepting the opening costs no Bandwidth; only a due renewal can be accepted', () => {
    const early = powered('warehouse', '2018Q2')
    const accept: Action = {
      type: 'ACCEPT_RENEWAL',
      siteId: 'site-2',
      contractType: 'fixed',
    }
    expect(err(early, accept)).toBe('error.no_renewal')
    const due = ok({ ...early, quarter: q('2019Q2') }, accept)
    expect(due.bandwidth).toBe(3)
    expect(renewalDue(due, site2(due))).toBe(false)
  })

  it('Texas starts on fixed (3.5¢) and can switch to index (2.8¢) at a renewal', () => {
    let s = powered('texas_site', '2020Q1')
    expect(site2(s).contract!.price).toBeCloseTo(0.035)
    s = ok(
      { ...s, quarter: q('2021Q1') },
      { type: 'ACCEPT_RENEWAL', siteId: 'site-2', contractType: 'index' },
    )
    expect(site2(s).contract).toMatchObject({ type: 'index' })
    expect(site2(s).contract!.price).toBeCloseTo(0.028 * 1.1)
    // Only Texas has an index option: a warehouse renewal can't switch to it.
    const warehouseDue = powered('warehouse', '2018Q2')
    expect(
      err(
        { ...warehouseDue, quarter: q('2019Q2') },
        { type: 'ACCEPT_RENEWAL', siteId: 'site-2', contractType: 'index' },
      ),
    ).toBe('error.bad_choice')
  })

  it('index prices move ±25% each quarter (own random stream: same seed, same moves)', () => {
    const moves: number[] = []
    for (let seed = 1; seed <= 40; seed++) {
      const s = { ...powered('texas_site', '2020Q1'), seed }
      site2(s).contract = {
        type: 'index',
        price: 0.028,
        startQuarter: s.quarter,
        endQuarter: s.quarter + 8,
      }
      s.quarter++
      startQuarterContracts(s)
      const m = site2(s).contract!.indexMult!
      expect(m).toBeGreaterThanOrEqual(0.75)
      expect(m).toBeLessThanOrEqual(1.25)
      expect(powerPriceUsdKwh(site2(s), s.quarter)).toBeCloseTo(0.028 * m)
      moves.push(m)
    }
    expect(new Set(moves).size).toBeGreaterThan(30)
  })

  it('the rate_class flaw and the Heat 50 rate hike still apply on top of the contract', () => {
    const s = powered('warehouse', '2018Q2')
    site2(s).surcharge = 1.2
    expect(powerPriceUsdKwh(site2(s), s.quarter)).toBeCloseTo(0.06 * 1.2)
    site2(s).rateMult = 1.3 // the rate_class card's "accept"
    expect(powerPriceUsdKwh(site2(s), s.quarter)).toBeCloseTo(0.06 * 1.3 * 1.2)
  })
})
