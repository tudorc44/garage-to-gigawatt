// M27.4 (doc 33 §3.1–3.2, §6.1; IV-D19): the Act III → IV boundary. What carries, what drops, the future draw on its
// own substream, and the market seam from the player's own Act III scenario.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT, FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { drawFuture, toAct4 } from '../../src/sim/state.ts'
import { marketWeek, scenarioOf } from '../../src/sim/systems/market.ts'
import { act3Finished, act4Company } from './act4Helpers.ts'

describe('the Act III → IV boundary (M27.4)', () => {
  it('enters 2031Q1’s Plan phase with the entry record measured at 2030Q4, and leaves the Act III state untouched', () => {
    const end = act3Finished('s2')
    expect(end.phase).toBe('chapter')
    expect(end.act).toBe(3)
    const before = structuredClone(end)
    const s = toAct4(end, { future: 'f3' })
    expect(end).toEqual(before)
    expect(s.act).toBe(4)
    expect(s.quarter).toBe(actFirstQuarter(4))
    expect(CONTENT.quarters[s.quarter]).toBe('2031Q1')
    expect(s.phase).toBe('plan')
    expect(s.week).toBe(0)
    expect(s.futureId).toBe('f3')
    expect(s.act4Entry).toMatchObject({
      quarter: '2031Q1',
      valuationUsd: end.reports.at(-1)!.valuationUsd,
      cashUsd: end.cash,
      creditRating: end.creditRating,
    })
    expect(s.act4Entry!.founderNetWorthUsd).toBeCloseTo(
      Math.max(0, end.founderStake * end.reports.at(-1)!.valuationUsd),
      6,
    )
  })

  it('carries the money, assets, debt, Act III systems and records unchanged (doc 33 §3.1)', () => {
    const end = act3Finished('s1')
    const s = toAct4(end, { future: 'f2' })
    for (const k of [
      'cash',
      'treasury',
      'founderStake',
      'raisesDone',
      'sites',
      'machines',
      'hosting',
      'facilities',
      'equipmentLoan',
      'constructionLoans',
      'bridgeLoan',
      'cryptoLoan',
      'creditRating',
      'siteHeat',
      'staff',
      'firedQuarter',
      'ppas',
      'politicalCapital',
      'angerAdj',
      'act3Gov',
      'act3Standby',
      'covenantBreach',
      'communityDeal',
      'seed',
      'scenarioId',
      'act3Entry',
      'act3End',
      'reports',
    ] as const)
      expect(s[k], k).toEqual(end[k])
    // the log carries; only Act IV's own lines may follow it
    expect(s.log.slice(0, end.log.length)).toEqual(end.log)
  })

  it('drops Act III-only state and the last Read the market; Act III’s scenario does not continue (doc 33 §3.2)', () => {
    const s = act4Company('s0', 'f1')
    expect(s.act3Wildcards).toBeUndefined()
    expect(s.act3WildcardOpen).toBeUndefined()
    expect(s.act3ExportRule).toBeUndefined()
    expect(s.act3SignalReads).toBeUndefined()
    expect(s.act3Moves).toBeUndefined()
    expect(s.marketRead).toBeNull()
    expect(s.act3BlendOffers ?? []).toEqual([])
    expect(s.interrupt).toBeNull()
    expect(s.quarterStats.revenueUsd).toBe(0)
  })

  it('the future draw is its own substream: deterministic per seed, the main RNG untouched, weights as doc 33', () => {
    const end = act3Finished('s3')
    const a = toAct4(end)
    expect(toAct4(end).futureId).toBe(a.futureId)
    expect(a.futureId).toBe(drawFuture(end.seed))
    expect(a.rng).toBe(end.rng)
    const counts = Object.fromEntries(FUTURE_IDS.map((f) => [f, 0])) as Record<string, number>
    const N = 4000
    for (let seed = 1; seed <= N; seed++) counts[drawFuture(seed)]++
    for (const f of FUTURE_IDS)
      expect(Math.abs(counts[f] / N - BALANCE.act4.futureWeightsPct[f] / 100), f).toBeLessThan(0.03)
  })

  it('reads its market through "scenario.future": 2031Q1 opens on the player’s own Act III 2030Q4 prices', () => {
    const end = act3Finished('s2')
    const s = toAct4(end, { future: 'f4' })
    expect(scenarioOf(s)).toBe('s2.f4')
    const lastAct3 = CONTENT.act3Scenarios.s2.weeks.at(-1)!.at(-1)!
    expect(marketWeek(s.quarter, 0, scenarioOf(s)).btc_usd).toBeCloseTo(lastAct3.btc_usd, 6)
  })

  it('needs an Act III game: a state without an Act III scenario is refused', () => {
    const end = act3Finished('s0')
    delete end.scenarioId
    expect(() => toAct4(end, { future: 'f1' })).toThrow(/Act III scenario/)
  })
})
