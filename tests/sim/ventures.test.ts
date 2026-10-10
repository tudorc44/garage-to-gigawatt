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
  deliveredKw,
  endQuarterVentures,
  joinVenture,
  referenceUsdKw,
  settleVentureCalls,
  ventureCf,
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

describe('E-B3: overruns reproduce the sourced base rates over 1,000 draws (doc 38 §5.1, refitted: answer 6)', () => {
  const draws = (cls: 'nuclear' | 'pumped_hydro') =>
    Array.from({ length: 1000 }, (_, i) => drawOverrun(substream(i + 1, `eb3:${cls}`), cls))
  const share = (xs: number[], f: (m: number) => boolean) => xs.filter(f).length / xs.length
  it('nuclear: ~3% at or under budget, ~55% over by half, mean ~2.0 (each within ±5 points)', () => {
    const xs = draws('nuclear')
    expect(Math.abs(share(xs, (m) => m <= 1) - 0.03)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(share(xs, (m) => m > 1.5) - 0.55)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(xs.reduce((a, b) => a + b, 0) / xs.length - 2.0)).toBeLessThanOrEqual(0.15)
    expect(Math.max(...xs)).toBeLessThanOrEqual(ENERGY.overrun_classes.nuclear.cap)
  })
  it('pumped hydro: ~10% at or under budget, ~50% over by half, ~10% at 3× or more', () => {
    const xs = draws('pumped_hydro')
    expect(Math.abs(share(xs, (m) => m <= 1) - 0.1)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(share(xs, (m) => m > 1.5) - 0.5)).toBeLessThanOrEqual(0.05)
    expect(Math.abs(share(xs, (m) => m >= 3) - 0.1)).toBeLessThanOrEqual(0.05)
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
    expect(before - s.cash).toBe(0.2 * 7000 * 100 * 1000)
    // One developer per type: joined once.
    expect(applyAction(s, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0.1, offtake: 0, prepay: 0 })).toMatchObject({
      ok: false,
      error: { key: 'error.venture_joined' },
    })
    expect(applyAction(company(), { type: 'VENTURE_JOIN', venture: 'egs', stake: 0, offtake: 0.5, prepay: 0 })).toMatchObject({
      ok: false,
      error: { key: 'error.venture_needs_campus' },
    })
    const elsewhere = company(1, 'ohio')
    expect(
      applyAction(elsewhere, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0, offtake: 0.5, prepay: 0, siteId: 'site-2' }),
    ).toMatchObject({ ok: false, error: { key: 'error.venture_region' } })
  })

  it('a firm offtake is your share of the unit, capped at 100 MW per venture (M36.11)', () => {
    const s = company(1, 'tennessee')
    s.sites[1].region = CONTENT.act3Nuclear.regions[0]
    const v = joinVenture(s, { type: 'smr', stake: 0, offtake: 1, prepay: 0, siteId: 'site-2' })
    expect(v.offtakeMw).toBe(VENTURES.offtake_cap_mw)
    expect(joinVenture(company(2), { type: 'egs', stake: 0, offtake: 0.5, prepay: 0, siteId: 'site-2' }).offtakeMw).toBe(50)
  })

  it('the second EGS block opens in 2031Q1, at the NOAK pitch, on the first block’s terms (M36.11)', () => {
    const s = company()
    expect(applyAction(s, { type: 'VENTURE_JOIN', venture: 'egs2', stake: 0.2, offtake: 0, prepay: 0 })).toMatchObject({
      ok: false,
      error: { key: 'error.venture_not_yet' },
    })
    expect(buyInUsd(s, { type: 'egs2', stake: 0.2 })).toBe(0.2 * 5500 * 100 * 1000)
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
      // (and 2035Q4's own end: the honesty rule must hold through the act's last quarter)
      endQuarterVentures(s)
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

describe('ventures marked to milestones (M36.8, design thread answer 11a)', () => {
  it('buy-in × 1.25 per milestone × 0.8 per slip, scaled by dilution; calls at par; 0 once cancelled', () => {
    const s = company()
    const v = joinVenture(s, { type: 'egs', stake: 0.2, offtake: 0, prepay: 0 })
    const buyIn = v.buyInUsd!
    expect(venturesValueUsd(s)).toBe(buyIn)
    v.milestones = 2
    v.slips = 1
    expect(venturesValueUsd(s)).toBeCloseTo(buyIn * 1.25 * 1.25 * 0.8)
    v.stake = 0.1
    v.callsPaidUsd = 5e6
    expect(venturesValueUsd(s)).toBeCloseTo(buyIn * 0.5 * 1.25 * 1.25 * 0.8 + 5e6)
    v.stage = 'cancelled'
    expect(venturesValueUsd(s)).toBe(0)
  })

  it('a year past the pitched first power without it is a slip; each third of the build a milestone', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = company(seed)
      const v = joinVenture(s, { type: 'egs', stake: 0.2, offtake: 0, prepay: 0 })
      if (v.codQuarter <= v.pitchCodQuarter!) continue
      while (s.quarter < v.pitchCodQuarter!) {
        endQuarterVentures(s)
        s.quarter++
        settleVentureCalls(s)
      }
      expect(v.slips).toBeGreaterThanOrEqual(1)
      expect(v.milestones).toBeGreaterThanOrEqual(2)
      return
    }
    throw new Error('no seed where EGS is late')
  })
})

describe('M39.5 (doc 41): reactors run at 0.80 for their first 8 quarters, then 0.92', () => {
  it('ventureCf by quarters since first power', () => {
    const s = company()
    const v = joinVenture(s, { type: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
    v.stage = 'operating'
    v.codQuarter = q('2030Q1')
    expect(ventureCf(v, q('2030Q1'))).toBe(0.8)
    expect(ventureCf(v, q('2031Q4'))).toBe(0.8)
    expect(ventureCf(v, q('2032Q1'))).toBe(0.92)
    expect(VENTURES.types.smr.running_usd_mwh).toBe(40)
    expect(VENTURES.types.adv_fission.running_usd_mwh).toBe(40)
  })
})

describe('M40.2 (design thread answer 2 after M39): delivery follows the capacity factor', () => {
  it('a reactor delivers its offtake × 0.80 for 8 quarters, then × 0.92; EGS × 0.9, × 0.6 under a weak field', () => {
    const s = company()
    const smr = joinVenture(s, { type: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
    Object.assign(smr, { stage: 'operating', codQuarter: q('2030Q1'), siteId: 'site-2', offtakeMw: 50, partnerCut: 0 })
    expect(deliveredKw(smr, q('2030Q1'))).toBeCloseTo(40_000)
    expect(deliveredKw(smr, q('2032Q1'))).toBeCloseTo(46_000)
    const egs = joinVenture(s, { type: 'egs', stake: 0.1, offtake: 0, prepay: 0 })
    Object.assign(egs, { stage: 'operating', codQuarter: q('2030Q1'), siteId: 'site-2', offtakeMw: 50, partnerCut: 0 })
    expect(deliveredKw(egs, q('2030Q1'))).toBeCloseTo(45_000)
    egs.weakField = true
    expect(deliveredKw(egs, q('2030Q1'))).toBeCloseTo(30_000)
    egs.fieldFixed = true
    expect(deliveredKw(egs, q('2030Q1'))).toBeCloseTo(45_000)
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
