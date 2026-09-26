import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { counterRisk } from '../../src/sim/systems/negotiation.ts'

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

const NORMAL = 0.055 // warehouse, 2019
/** 2019Q2, a warehouse (site-2) whose 4-quarter contract has just run out. */
function due(seed = 1): GameState {
  const s = { ...newGame(seed), quarter: q('2019Q2') }
  s.sites.push({
    id: 'site-2',
    tier: 'warehouse',
    readyQuarter: q('2018Q2'),
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    contract: {
      type: 'fixed',
      price: 0.06,
      startQuarter: q('2018Q2'),
      endQuarter: q('2019Q2'),
    },
  })
  return s
}
const start = (term = 4): Action => ({
  type: 'NEGOTIATE_START',
  siteId: 'site-2',
  contractType: 'fixed',
  term,
})
const bid = (priceUsdKwh: number): Action => ({
  type: 'NEGOTIATE_COUNTER',
  priceUsdKwh,
})
const contract = (s: GameState) => s.sites[1].contract!

describe('power contract negotiation', () => {
  it('costs 2 Bandwidth; opens at normal +10%; the hidden limit is normal × 0.85–1.05', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = ok(due(seed), start())
      const n = s.negotiation!
      expect(s.bandwidth).toBe(1)
      expect(n.openingUsdKwh).toBeCloseTo(NORMAL * 1.1)
      expect(n.offerUsdKwh).toBeCloseTo(NORMAL * 1.1)
      expect(n.limitUsdKwh).toBeGreaterThanOrEqual(NORMAL * 0.85 - 1e-12)
      expect(n.limitUsdKwh).toBeLessThanOrEqual(NORMAL * 1.05 + 1e-12)
    }
  })

  it('an 8-quarter term moves the limit 3% against you (same seed, same draw)', () => {
    const four = ok(due(), start(4)).negotiation!.limitUsdKwh
    const eight = ok(due(), start(8)).negotiation!.limitUsdKwh
    expect(eight).toBeCloseTo(four * 1.03)
    expect(err(due(), start(6))).toBe('error.bad_choice')
  })

  it('a counter at or above the limit is signed at your price, for your term', () => {
    const s0 = ok(due(), start(8))
    const price = s0.negotiation!.limitUsdKwh + 0.0001
    const s = ok(s0, bid(price))
    expect(s.negotiation).toBeNull()
    expect(contract(s).price).toBeCloseTo(price)
    expect(contract(s).endQuarter).toBe(q('2019Q2') + 8)
  })

  it('just below the limit (within 10%): the utility comes back halfway to its limit', () => {
    const s0 = ok(due(), start())
    const { limitUsdKwh: limit, offerUsdKwh: offer } = s0.negotiation!
    const s = ok(s0, bid(limit * 0.95))
    expect(s.negotiation!.round).toBe(1)
    expect(s.negotiation!.offerUsdKwh).toBeCloseTo((offer + limit) / 2)
    expect(s.negotiation!.history).toEqual([
      { counterUsdKwh: limit * 0.95, reply: 'counter' },
    ])
  })

  it('a lowball (over 10% below the limit) makes the utility walk away about 1 time in 4', () => {
    let walked = 0
    for (let seed = 1; seed <= 400; seed++) {
      const s0 = ok(due(seed), start())
      const s = ok(s0, bid(s0.negotiation!.limitUsdKwh * 0.8))
      if (!s.negotiation) {
        walked++
        // Walked away: the opening applies for 4 quarters.
        expect(contract(s).price).toBeCloseTo(NORMAL * 1.1)
        expect(contract(s).endQuarter).toBe(q('2019Q2') + 4)
      }
    }
    expect(walked / 400).toBeGreaterThan(0.18)
    expect(walked / 400).toBeLessThan(0.32)
  })

  it('after 3 counters without a deal: only the last offer or walking away is left', () => {
    let s = ok(due(), start())
    const limit = s.negotiation!.limitUsdKwh
    for (let i = 0; i < 3; i++) s = ok(s, bid(limit * 0.95))
    expect(s.negotiation!.final).toBe(true)
    expect(err(s, bid(limit))).toBe('error.negotiation_final')
    const last = s.negotiation!.offerUsdKwh
    const signed = ok(s, { type: 'NEGOTIATE_ACCEPT' })
    expect(contract(signed).price).toBeCloseTo(last)
    expect(last).toBeLessThan(NORMAL * 1.1)
  })

  it('walking away yourself: the opening offer for 4 quarters', () => {
    const s = ok(ok(due(), start(8)), { type: 'NEGOTIATE_WALK' })
    expect(s.negotiation).toBeNull()
    expect(contract(s).price).toBeCloseTo(NORMAL * 1.1)
    expect(contract(s).endQuarter).toBe(q('2019Q2') + 4)
  })

  it('asking for more than the offer just takes the offer', () => {
    const s0 = ok(due(), start())
    const s = ok(s0, bid(0.5))
    expect(contract(s).price).toBeCloseTo(s0.negotiation!.offerUsdKwh)
  })

  it('must be finished before the quarter starts; one negotiation at a time', () => {
    const s = ok(due(), start())
    expect(err(s, { type: 'END_PLAN' })).toBe('error.negotiation_open')
    expect(
      err(s, {
        type: 'ACCEPT_RENEWAL',
        siteId: 'site-2',
        contractType: 'fixed',
      }),
    ).toBe('error.negotiation_open')
    expect(err(s, start())).toBe('error.negotiation_open')
    expect(err({ ...due(), bandwidth: 1 }, start())).toBe('error.no_bandwidth')
  })

  it('the walk-away warning uses only the public rules, never the hidden limit', () => {
    const s = ok(due(), start())
    // A lowball is under 90% of a limit that lies in normal × 0.85–1.05.
    expect(counterRisk(s, NORMAL * 1.05 * 0.9)).toBe('none')
    expect(counterRisk(s, NORMAL * 0.9)).toBe('possible')
    expect(counterRisk(s, NORMAL * 0.85 * 0.9 - 0.0001)).toBe('high')
  })
})
