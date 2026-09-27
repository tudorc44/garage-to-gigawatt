import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  pitchCounterRisk,
  walkawayEndsRound,
} from '../../src/sim/systems/pitch.ts'

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

const OPENING = 6_000_000 // seed pre-money
const AMOUNT = 1_500_000
/** A game in `label` with a powered 100 kW small unit and full Bandwidth: the seed round is open. */
function seedOpen(label = '2018Q2', seed = 1): GameState {
  const s = { ...newGame(seed), quarter: q(label) }
  s.sites.push({
    id: 'site-2',
    tier: 'small_unit',
    readyQuarter: 0,
    rentUsdQ: 6000,
    powerPriceMult: 1,
    flaw: null,
  })
  // A quarter of mining behind it: the seed's condition (owner, 28 Sep 2026).
  s.reports.push({ revenueUsd: 1_000 } as GameState['reports'][number])
  return s
}
const start: Action = { type: 'PITCH_START', round: 'seed' }
const ask = (preMoneyUsd: number): Action => ({
  type: 'PITCH_COUNTER',
  preMoneyUsd,
})
/** A pitch in progress with the hidden limit set to `limit` (tests only). */
function pitching(limit: number, label = '2018Q2'): GameState {
  const s = ok(seedOpen(label), start)
  s.pitch!.limitUsd = limit
  return s
}
/** Plays pitches that the investor walks away from until one does. */
function investorWalks(s: GameState): GameState {
  const out = ok(s, start)
  out.pitch!.limitUsd = out.pitch!.openingUsd
  for (let rng = 0; rng < 1000; rng++) {
    const tryIt = structuredClone(out)
    tryIt.pitch!.rng = rng
    const after = ok(tryIt, ask(tryIt.pitch!.openingUsd * 2))
    if (!after.pitch) return after
  }
  throw new Error('the investor never walked')
}
const nextQuarter = (s: GameState): GameState => ({
  ...s,
  quarter: s.quarter + 1,
  bandwidth: 3,
})

describe('investor pitches (capital.json › pitch)', () => {
  it('only the seed and Series A can be pitched; F&F and the IPO stay fixed offers', () => {
    expect(CONTENT.pitch.appliesTo).toEqual(['seed', 'series_a'])
    const s = { ...seedOpen('2018Q1') }
    expect(err(s, { type: 'PITCH_START', round: 'friends_family' })).toBe(
      'error.cant_pitch',
    )
    expect(err(s, { type: 'PITCH_START', round: 'ipo_spac' })).toBe(
      'error.cant_pitch',
    )
  })

  it('costs 2 Bandwidth; opens at the pre-money; the hidden limit is opening × 0.95–1.25', () => {
    let above = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = ok(seedOpen('2018Q2', seed), start)
      const p = s.pitch!
      expect(s.bandwidth).toBe(1)
      expect(p.openingUsd).toBe(OPENING)
      expect(p.offerUsd).toBe(OPENING)
      expect(p.limitUsd).toBeGreaterThanOrEqual(OPENING * 0.95)
      expect(p.limitUsd).toBeLessThan(OPENING * 1.25)
      if (p.limitUsd > OPENING) above++
    }
    // Above the opening about 5 times in 6 (design thread: ~83%).
    expect(above / 200).toBeGreaterThan(0.75)
    expect(above / 200).toBeLessThan(0.9)
  })

  it('has its own random stream: pitching leaves the main one alone', () => {
    const s = seedOpen()
    expect(ok(s, start).rng).toBe(s.rng)
  })

  it('a counter at or under the limit closes the round at your valuation', () => {
    const s = ok(pitching(7_000_000), ask(7_000_000))
    expect(s.pitch).toBeNull()
    expect(s.cash).toBe(10_000 + AMOUNT)
    expect(s.bandwidth).toBe(1) // only the pitch's 2 Bandwidth
    expect(s.founderStake).toBeCloseTo(1 - AMOUNT / 8_500_000)
    expect(s.raisesDone).toContain('seed')
    const [deal, raised] = s.log.slice(-2)
    expect(t(deal.key, deal.params)).toBe(
      'Closed the seed round at a $7.0M pre-money valuation (the investor opened at $6.0M).',
    )
    expect(raised.key).toBe('log.raised')
    expect(err({ ...s, bandwidth: 3 }, start)).toBe('error.raise_done')
  })

  it('asking for no more than their offer just takes their offer', () => {
    const s = ok(pitching(7_000_000), ask(5_000_000))
    expect(s.founderStake).toBeCloseTo(0.8)
  })

  it('within 10% over the limit: they come back halfway, with no walk-away roll', () => {
    const s = ok(pitching(7_000_000), ask(7_500_000))
    expect(s.pitch!.offerUsd).toBe(6_500_000)
    expect(s.pitch!.round).toBe(1)
    expect(s.pitch!.rng).toBe(pitching(7_000_000).pitch!.rng)
  })

  it('when the limit is below the opening they hold at the opening; accepting stays safe', () => {
    let s = ok(pitching(5_800_000), ask(6_300_000))
    expect(s.pitch!.offerUsd).toBe(OPENING)
    s = ok(s, { type: 'PITCH_ACCEPT' })
    expect(s.founderStake).toBeCloseTo(0.8)
  })

  it('after 3 counters their offer is final: accept it or walk', () => {
    let s = pitching(7_000_000)
    for (let i = 0; i < 3; i++) s = ok(s, ask(7_600_000))
    expect(s.pitch!.final).toBe(true)
    expect(err(s, ask(7_000_000))).toBe('error.negotiation_final')
    const offer = s.pitch!.offerUsd
    expect(offer).toBeCloseTo(7_000_000 - 1_000_000 / 8)
    s = ok(s, { type: 'PITCH_ACCEPT' })
    expect(s.founderStake).toBeCloseTo(1 - AMOUNT / (offer + AMOUNT))
  })

  it('overreaching: the investor walks away about 1 time in 4', () => {
    let walked = 0
    for (let seed = 1; seed <= 400; seed++) {
      const s = ok(seedOpen('2018Q2', seed), start)
      const after = ok(s, ask(s.pitch!.limitUsd * 1.2))
      if (!after.pitch) walked++
    }
    expect(walked / 400).toBeGreaterThan(0.18)
    expect(walked / 400).toBeLessThan(0.32)
  })

  it('a walk-away locks the round for a quarter and reopens it 10% lower, stacking to 20%', () => {
    let s = investorWalks(seedOpen('2018Q2'))
    expect(s.bandwidth).toBe(1) // the pitch's Bandwidth is lost
    expect(s.cash).toBe(10_000)
    expect(t(s.log.at(-1)!.key, s.log.at(-1)!.params)).toBe(
      'The seed investor walked away. The round reopens in 2018Q3 at a $5.4M valuation.',
    )
    expect(err({ ...s, bandwidth: 3 }, start)).toBe('error.pitch_locked')
    expect(err({ ...s, bandwidth: 3 }, { type: 'RAISE', round: 'seed' })).toBe(
      'error.pitch_locked',
    )

    s = nextQuarter(s)
    expect(ok(s, start).pitch!.openingUsd).toBeCloseTo(5_400_000)
    s = investorWalks(s)
    s = nextQuarter(s)
    expect(ok(s, start).pitch!.openingUsd).toBeCloseTo(4_800_000)
    s = investorWalks(s)
    s = nextQuarter(s)
    expect(ok(s, start).pitch!.openingUsd).toBeCloseTo(4_800_000) // capped at −20%

    // Taking the offer takes the lowered opening: $1.5M at $4.8M pre.
    const taken = ok(s, { type: 'RAISE', round: 'seed' })
    expect(taken.founderStake).toBeCloseTo(1 - AMOUNT / 6_300_000)
    expect(taken.pitchWalkaways).toEqual({}) // a deal resets the penalty
  })

  it('walking out yourself gets the same lockout and penalty', () => {
    const s = ok(pitching(7_000_000), { type: 'PITCH_WALK' })
    expect(s.pitch).toBeNull()
    expect(s.pitchWalkaways.seed).toEqual({
      penalty: 0.1,
      reopensQuarter: q('2018Q3'),
    })
    expect(s.log.at(-1)!.key).toBe('log.pitch_you_walked')
  })

  it("in the window's last quarter, walking away ends the round for good (and the UI is warned)", () => {
    expect(walkawayEndsRound(seedOpen('2019Q3'), 'seed')).toBe(false)
    const last = seedOpen('2019Q4')
    expect(walkawayEndsRound(last, 'seed')).toBe(true)
    const s = ok(pitching(7_000_000, '2019Q4'), { type: 'PITCH_WALK' })
    expect(s.log.at(-1)!.key).toBe('log.pitch_you_walked_lost')
    expect(err(nextQuarter(s), start)).toBe('error.raise_window')
    expect(err({ ...s, bandwidth: 3 }, start)).toBe('error.pitch_lost')
  })

  it('an open pitch blocks ending the Plan phase, other raises and power negotiations', () => {
    const s = pitching(7_000_000)
    s.bandwidth = 3
    expect(err(s, { type: 'END_PLAN' })).toBe('error.pitch_open')
    expect(err(s, { type: 'RAISE', round: 'friends_family' })).toBe(
      'error.pitch_open',
    )
    expect(
      err(s, {
        type: 'NEGOTIATE_START',
        siteId: 'site-2',
        contractType: 'fixed',
        term: 4,
      }),
    ).toBe('error.pitch_open')
  })

  it('shows walk-away risk from the public rules only (opening × 0.95–1.25, +10%)', () => {
    const s = pitching(7_000_000)
    expect(pitchCounterRisk(s, OPENING * 1.04)).toBe('none')
    expect(pitchCounterRisk(s, OPENING * 1.2)).toBe('possible')
    expect(pitchCounterRisk(s, OPENING * 1.4)).toBe('high')
    // Same answers whatever the hidden limit is.
    s.pitch!.limitUsd = 5_800_000
    expect(pitchCounterRisk(s, OPENING * 1.2)).toBe('possible')
  })
})
