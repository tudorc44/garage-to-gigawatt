// M32.1 (doc 33 §6.7, §15.1): the Act IV move log (orbital-exposure signs; ground and lunar moves at 0), the reading score
// (Act III's rules on the future's ideal stances; the oracles), and the end record's reveal (the future, the lunar grade
// and the truth beside your estimates, the fleet's true reliability, the titles, the rivals' fates).
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT, FUTURE_IDS } from '../../src/content/index.ts'
import { signalsHiddenIv } from '../../src/content/signalsHiddenIv.ts'
import type { GameState } from '../../src/sim/state.ts'
import { act4Outcome, buildAct4End, frontierTitleId } from '../../src/sim/systems/act4End.ts'
import { trueReliability } from '../../src/sim/systems/fleetReliability.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import { computeReadingIv, oracleLogsIv, scoredSignsIv } from '../../src/sim/systems/readingScoreIv.ts'
import { act, act3Finished, orbitCompany } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)

describe('the Act IV move log (M32.1)', () => {
  it('orbital moves carry their exposure sign; ground and lunar moves are logged at 0; spot isn’t a presale', () => {
    let s = orbitCompany()
    s.politicalCapital = 40
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    orbitBlock(s, 'ob1')!.offers = [{ type: 'sovereign', price: 9e6, termQuarters: 20 }]
    s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 0 })
    s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob2', offer: 'spot' })
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob2' })
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
    s = act(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: 'ob1' })
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })
    expect(s.act4Moves!.map((m) => m.kind)).toEqual([
      'orbit_presale',
      'orbit_debt',
      'orbit_commit',
      'launch_booking',
      'orbit_insure',
      'lunar_move',
    ])
    expect(s.act4Moves!.every((m) => m.q === 0)).toBe(true)
    // Act III never logs Act IV moves
    expect(act3Finished('s0').act4Moves).toBeUndefined()
  })
})

describe('the Act IV reading score (M32.1)', () => {
  it.each(FUTURE_IDS)('%s: perfect > passive > opposite (calm quarters cap the perfect reader below 100, as Act III)', (f) => {
    const o = oracleLogsIv(f)
    const perfect = computeReadingIv(o.perfect, f).score!
    const passive = computeReadingIv(o.passive, f).score!
    const opposite = computeReadingIv(o.opposite, f).score!
    // (M36.11: in F2, staying out of orbit is the reading itself, so passive scores as perfect does: 100)
    if (f === 'f2') expect(passive).toBe(perfect)
    else expect(perfect).toBeGreaterThan(passive)
    expect(passive).toBeGreaterThan(opposite)
    expect(perfect).toBeGreaterThanOrEqual(85)
    expect(opposite).toBeLessThanOrEqual(35)
  })
})

describe('a build and its funding (M40.1, design thread answer 1 after M39)', () => {
  it("a build quarter's presale, insurance and debt draw count 0; the booking carries it", () => {
    const build = [
      { q: 0, kind: 'orbit_presale' as const },
      { q: 0, kind: 'orbit_debt' as const },
      { q: 0, kind: 'launch_booking' as const },
      { q: 0, kind: 'orbit_insure' as const },
    ]
    expect(scoredSignsIv(build)).toEqual([0, 0, 1, 0])
    expect(computeReadingIv(build, 'f1').perQuarter[0].value).toBe(1)
    // without a build that quarter, insurance keeps its −1
    expect(scoredSignsIv([{ q: 2, kind: 'orbit_insure' }])).toEqual([-1])
  })

  it('never counts a build quarter’s hedges as decoy moves (F1 decoy window 2031Q4-2032Q2, wrong stance −1)', () => {
    const inDecoy = [
      { q: 3, kind: 'orbit_commit' as const },
      { q: 3, kind: 'orbit_insure' as const },
      { q: 3, kind: 'orbit_presale' as const },
    ]
    expect(computeReadingIv(inDecoy, 'f1').penalty).toBe(0)
    expect(computeReadingIv([{ q: 3, kind: 'orbit_insure' }], 'f1').penalty).toBe(10)
  })

  it('M41.1: a raise takes the sign of the next scored move after it, at any distance; 0 with none (never a decoy)', () => {
    expect(scoredSignsIv([{ q: 1, kind: 'equity_raise' }, { q: 1, kind: 'orbit_commit' }])).toEqual([1, 1])
    // a run of raises saving up for a build two years on: all +
    const savings = [1, 2, 3, 4, 5, 6, 7, 8].map((q) => ({ q, kind: 'equity_raise' as const }))
    expect(scoredSignsIv([...savings, { q: 9, kind: 'launch_booking' }])).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1])
    // followed by a sale: −1; ground and lunar moves (0) are skipped
    expect(scoredSignsIv([{ q: 1, kind: 'equity_raise' }, { q: 2, kind: 'ground_move' }, { q: 6, kind: 'orbit_sale' }])).toEqual([-1, 0, -1])
    // a build's own hedges and debt (0 after rule a) are skipped too
    expect(scoredSignsIv([{ q: 1, kind: 'equity_raise' }, { q: 2, kind: 'orbit_debt' }, { q: 2, kind: 'orbit_insure' }])).toEqual([0, 0, 0])
    // nothing scored after it: 0, never a decoy (F1's window is 2031Q4-2032Q2, wrong stance −1)
    expect(scoredSignsIv([{ q: 3, kind: 'equity_raise' }])).toEqual([0])
    expect(computeReadingIv([{ q: 3, kind: 'equity_raise' }], 'f1').penalty).toBe(0)
  })
})

describe('F2 reads exposure (M36.11, design thread)', () => {
  it('a quiet quarter with no orbital exposure is a match; holding a block is not', () => {
    expect(computeReadingIv([], 'f2').score).toBe(100)
    expect(computeReadingIv([{ q: 0, kind: 'lunar_move' }], 'f2').score).toBe(100)
    const held = computeReadingIv([{ q: 0, kind: 'orbit_commit' }], 'f2')
    expect(held.perQuarter[1].value).toBe(0.5)
    const sold = computeReadingIv([{ q: 0, kind: 'orbit_commit' }, { q: 3, kind: 'orbit_sale' }], 'f2')
    expect(sold.perQuarter[4].value).toBe(1)
  })
})

describe('the Act IV reveal (M32.1)', () => {
  /** A company at 2035Q4's chapter phase (set up directly). */
  function ended(f: 'f1' | 'f2' | 'f3' | 'f4'): GameState {
    const s = orbitCompany(f)
    s.quarter = Q('2035Q4')
    s.phase = 'chapter'
    return s
  }

  it('the future, its trigger and decoy; the fleet’s true reliability; the rivals’ fates; the titles', () => {
    const s = ended('f2')
    const e = buildAct4End(s)
    const h = signalsHiddenIv('f2')
    expect(e).toMatchObject({ futureId: 'f2', futureName: h.future_name, triggerQuarter: h.trigger.quarter, gameOver: false })
    expect(e.decoy!.indicator).toBe(h.decoy.indicator)
    expect(e.fleet!.failurePctYr).toBeCloseTo(trueReliability('f2').failureShareYr * 100)
    expect(e.rivalFates!.find((r) => r.rival === 'orrery_compute')!.failed).toBe(true)
    expect(e.rivalFates!.find((r) => r.rival === 'pallas_compute')!.failed).toBe(false)
    expect(e.frontierTitleId).toBe('earthbound')
    expect(e.careerTitleId).toBeDefined()
    expect(act4Outcome(s).survived).toBe(true)
  })

  it('the lunar grade and, per site of yours, your estimate beside the truth', () => {
    let s = ended('f1')
    s.lunarGrade = 'dry'
    s.phase = 'plan'
    s.politicalCapital = 40
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })
    s.phase = 'chapter'
    const e = buildAct4End(s)
    expect(e.lunar!.grade).toBe('dry')
    expect(e.lunar!.sites[0]).toMatchObject({ site: 'cabeus', estimateT: null, category: 'inferred' })
    expect(e.lunar!.sites[0].truthT).toBeGreaterThan(0)
    expect(e.lunar!.sites[0].truthT).toBeLessThan(800000)
  })

  it('frontier titles: earthbound, orbital, cislunar, selenian', () => {
    const s = orbitCompany('f1')
    expect(frontierTitleId(s)).toBe('earthbound')
    s.act4Orbit = {
      blocks: [], licences: [], registry: 'accords', linksRented: 0, stations: [], hardMarketUntil: null, cascadeDone: false,
      planned: [], safeModeQuarter: null, nextN: 1,
    }
    s.act4Orbit.blocks.push({ ...structuredClone(s.act4Orbit.blocks[0] ?? {}), id: 'x', stage: 'live', mw: 100, capacity: 1 } as never)
    expect(frontierTitleId(s)).toBe('orbital')
    s.act4Moon = {
      claims: [{ site: 'cabeus', claimedQuarter: 0, landBy: 0, status: 'held', landedQuarter: 0, reports: [], solar: null, reactor: null, pilot: null, production: null }],
      missions: [], disputes: [], offtakes: [], offers: [], megawattQuarter: null, alignedBloc: null, freezeUntil: null, planned: [], nextId: 1,
    }
    expect(frontierTitleId(s)).toBe('cislunar')
    s.act4Moon.claims[0].pilot = { decidedQuarter: 0, readyQuarter: 0, capexUsd: 0, availability: 1, maintained: false, runQuarters: 1, processedT: 2 }
    expect(frontierTitleId(s)).toBe('selenian')
  })
})
