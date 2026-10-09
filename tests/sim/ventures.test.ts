// M36 (doc 38 §5): energy ventures. Diligence shows the reference class; joining pays the buy-in (and any prepayment);
// the hidden overrun arrives as three cash calls (pay, dilute, walk); nuclear may be cancelled when undersubscribed;
// fusion passes or fails its gates and never delivers before 2038; first power delivers firm MW with no grid wait.
// E-B3 (the overrun statistics) and E-B4 (an SMR cancelled and a fusion fold across 30 seeds) are asserted here.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { ENERGY, VENTURES } from '../../src/content/energyContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { substream } from '../../src/sim/rng.ts'
import type { GameState } from '../../src/sim/state.ts'
import { drawOverrun } from '../../src/sim/systems/overrun.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'
import {
  buyInUsd,
  endQuarterVentures,
  joinVenture,
  referenceUsdKw,
  settleVentureCalls,
  venturesValueUsd,
} from '../../src/sim/systems/ventures.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** An Act III company in 2027Q1's Plan, rich, with its own site moved to `region`. */
function company(seed = 1, region = 'arizona'): GameState {
  const s = act3ScenarioCompany('s0', seed)
  s.cash = 5e9
  s.bandwidth = 9
  s.sites[1].region = region
  return s
}

/** Moves the ventures on quarter by quarter (cash calls take the default) up to `label`, without playing the rest. */
function stepTo(s: GameState, label: string): GameState {
  while (s.quarter < q(label)) {
    endQuarterVentures(s)
    s.quarter++
    settleVentureCalls(s)
  }
  return s
}

describe('E-B3: nuclear overruns reproduce the class over 1,000 draws (doc 38 §5.1)', () => {
  const draws = Array.from({ length: 1000 }, (_, i) => drawOverrun(substream(i + 1, 'eb3'), 'nuclear'))
  const share = (f: (m: number) => boolean) => draws.filter(f).length / draws.length
  it('P(m > 1.5) ≈ 55% and the mean ≈ 2.0, within ±5 points', () => {
    expect(Math.abs(share((m) => m > 1.5) - 0.55)).toBeLessThanOrEqual(0.05)
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length
    expect(Math.abs(mean - 2.0)).toBeLessThanOrEqual(0.15)
    expect(Math.max(...draws)).toBeLessThanOrEqual(ENERGY.overrun_classes.nuclear.cap)
  })
  it('P(m ≤ 1) is about 25% with these parameters, not the ~3% doc 38 states (reported to the design thread)', () => {
    expect(share((m) => m <= 1)).toBeGreaterThan(0.18)
    expect(share((m) => m <= 1)).toBeLessThan(0.32)
  })
})

describe('joining a venture (doc 38 §5.1)', () => {
  it('diligence costs 1 Bandwidth and the fee; the reference estimate is pitch × the class median', () => {
    let s = company()
    s = ok(s, { type: 'VENTURE_DILIGENCE', venture: 'smr' })
    expect(s.ventureDiligence).toEqual(['smr'])
    expect(s.cash).toBe(5e9 - VENTURES.diligence.fee_usd)
    expect(referenceUsdKw(s, 'smr')).toBeCloseTo(4000 * 1.6)
  })

  it('a stake pays its share of the budget now; an offtake needs a campus in the right region', () => {
    let s = company()
    const before = s.cash
    s = ok(s, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0.2, offtake: 0, prepay: 0 })
    expect(before - s.cash).toBe(0.2 * 7500 * 100 * 1000)
    expect(applyAction(s, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0, offtake: 0.5, prepay: 0 })).toMatchObject({
      ok: false,
      error: { key: 'error.venture_needs_campus' },
    })
    const elsewhere = company(1, 'ohio')
    expect(
      applyAction(elsewhere, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0, offtake: 0.5, prepay: 0, siteId: 'site-2' }),
    ).toMatchObject({ ok: false, error: { key: 'error.venture_region' } })
  })

  it('is not offered before Act III, and one nuclear venture every 8 quarters', () => {
    const s = company()
    expect(applyAction({ ...s, act: 2, quarter: q('2026Q1') }, { type: 'VENTURE_DILIGENCE', venture: 'egs' }).ok).toBe(false)
    const one = ok(s, { type: 'VENTURE_JOIN', venture: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
    expect(applyAction(one, { type: 'VENTURE_JOIN', venture: 'adv_fission', stake: 0.1, offtake: 0, prepay: 0 })).toMatchObject({
      ok: false,
      error: { key: 'error.venture_regulator_slot' },
    })
  })
})

describe('the build (doc 38 §5.1-5.3)', () => {
  it('an EGS overrun arrives as three cash calls; dilution cuts the stake pro rata', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = company(seed)
      const v = joinVenture(s, { type: 'egs', stake: 0.2, offtake: 0, prepay: 0 })
      if (v.m <= 1.1) continue
      let calls = 0
      while (s.quarter < v.buildEnd + 1) {
        endQuarterVentures(s)
        s.quarter++
        if (v.call) {
          calls++
          const before = v.stake
          settleVentureCalls(s)
          expect(v.stake).toBeLessThan(before)
        }
      }
      expect(calls).toBe(3)
      return
    }
    throw new Error('no seed with an overrun')
  })

  it('a FOAK SMR never comes in under 3× its pitch', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const v = joinVenture(company(seed), { type: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
      expect(v.m).toBeGreaterThanOrEqual(3)
    }
  })

  it('first power delivers the offtake to the campus with no grid wait, and the stake revalues', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = company(seed)
      s = ok(s, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0.2, offtake: 1, prepay: 1, siteId: 'site-2' })
      const v = s.ventures![0]
      if (v.codQuarter + 2 > q('2030Q4')) continue
      const before = capacityKw(s.sites[1])
      s = stepTo(s, CONTENT.quarters[v.codQuarter + 2])
      expect(s.ventures![0].stage).toBe('operating')
      expect(capacityKw(s.sites[1])).toBeGreaterThan(before)
      expect(venturesValueUsd(s)).toBeGreaterThan(0)
      return
    }
    throw new Error('no seed reached first power by 2030')
  })
})

describe('E-B4: across 30 seeds an SMR is cancelled and a fusion venture folds (doc 38 §5.10)', () => {
  it('counts the cancellations and folds to 2035Q4', () => {
    let cancelled = 0
    let folded = 0
    let fusionPower = 0
    for (let seed = 1; seed <= 30; seed++) {
      const s = company(seed)
      s.quarter = q('2028Q1')
      joinVenture(s, { type: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
      joinVenture(s, { type: 'fusion', stake: 0.1, offtake: 0, prepay: 0 })
      // (Step straight through Act IV's quarters: only the venture system runs.)
      s.act = 4
      s.futureId = 'f2'
      stepTo(s, '2035Q4')
      cancelled += s.ventures!.filter((v) => v.type === 'smr' && v.stage === 'cancelled').length
      folded += s.ventures!.filter((v) => v.type === 'fusion' && v.stage === 'folded').length
      fusionPower += s.ventures!.filter((v) => v.type === 'fusion' && v.stage === 'operating').length
    }
    expect(cancelled).toBeGreaterThanOrEqual(1)
    expect(folded).toBeGreaterThanOrEqual(1)
    // The honesty rule: fusion never delivers power inside the game.
    expect(fusionPower).toBe(0)
  })
})

describe('a game without a venture', () => {
  it('has no venture fields and books no venture value', () => {
    const s = company()
    expect(s.ventures).toBeUndefined()
    expect(venturesValueUsd(s)).toBe(0)
    expect(buyInUsd(s, { type: 'pumped', stake: 0.1 })).toBeGreaterThan(0)
  })
})
