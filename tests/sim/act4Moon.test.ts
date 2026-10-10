// M30 (doc 33 §9): Act IV's lunar programme. M30.2: claims (cost, the landing clock), the scripted rival and bloc claims,
// disputes (hold, align, share, withdraw; first to land holds).
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import { MOON } from '../../src/content/moonContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import {
  claimOf,
  endQuarterMissions,
  landingChance,
  missionCostUsd,
  resolveLunarAlert,
  resourceCategory,
  resourceShare,
  rivalOn,
  startQuarterMoonClaims,
} from '../../src/sim/systems/moon.ts'
import { prospectReport } from '../../src/sim/systems/lunarGeology.ts'
import { act, orbitCompany, playQuarter } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}
/** A rich Act IV company with political capital to spend. */
function lunarCompany(future: 'f1' | 'f2' | 'f3' | 'f4' = 'f1'): GameState {
  const s = orbitCompany(future)
  s.politicalCapital = 60
  return s
}
/** Moves to the start of a later quarter's Plan phase (the scripted claims arrive). */
function at(s: GameState, label: string): GameState {
  s.quarter = Q(label)
  startQuarterMoonClaims(s)
  return s
}

describe('lunar claims and disputes (M30.2)', () => {
  it('a claim costs 1 Bandwidth, the fee and political capital; it must land within 6 quarters', () => {
    const s = lunarCompany()
    const x = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    expect(x.bandwidth).toBe(s.bandwidth - 1)
    expect(x.cash).toBe(s.cash - MOON.claim.fee_usd)
    expect(x.politicalCapital).toBe(60 - MOON.claim.pc)
    expect(claimOf(x, 'malapert_massif')).toMatchObject({ status: 'claimed', landBy: s.quarter + 6, landedQuarter: null })
    expect(err(x, { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })).toBe('error.moon_claimed')
    expect(err({ ...s, act: 3 }, { type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })).toBe('error.moon_unavailable')
  })

  it('a claim that never lands lapses after its deadline', () => {
    let s = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })
    s = at(s, CONTENT.quarters[s.quarter + 6])
    expect(claimOf(s, 'cabeus')).toBeDefined()
    s = at(s, CONTENT.quarters[s.quarter + 1])
    expect(claimOf(s, 'cabeus')).toBeUndefined()
    expect(s.act4Moon!.claims[0].status).toBe('lost')
  })

  it('claiming a site another claims raises a dispute; unanswered, the first to land takes it', () => {
    let s = at(lunarCompany(), '2031Q4')
    expect(rivalOn(s, 'shackleton_ridge')).toMatchObject({ claimant: 'accords_bloc', landed: false })
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })
    expect(s.act4Moon!.disputes).toEqual([{ site: 'shackleton_ridge', claimant: 'accords_bloc', raisedQuarter: s.quarter }])
    s = at(s, '2032Q2') // the bloc lands
    expect(claimOf(s, 'shackleton_ridge')).toBeUndefined()
    expect(s.log.at(-1)!.key).toBe('log.moon.lost_to')
    expect(err(s, { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })).toBe('error.moon_lost_site')
  })

  it('a scripted claim arriving on your site raises a dispute; landing first wins it', () => {
    let s = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'de_gerlache_ridge' })
    s = at(s, '2032Q1')
    expect(s.act4Moon!.disputes[0]).toMatchObject({ site: 'de_gerlache_ridge', claimant: 'northgate' })
    claimOf(s, 'de_gerlache_ridge')!.landedQuarter = s.quarter
    claimOf(s, 'de_gerlache_ridge')!.status = 'held'
    s = at(s, '2032Q2')
    expect(s.act4Moon!.disputes).toHaveLength(0)
    expect(rivalOn(s, 'de_gerlache_ridge')).toBeUndefined()
    s = at(s, '2033Q1') // Northgate's landing quarter passes: you still hold it
    expect(claimOf(s, 'de_gerlache_ridge')!.status).toBe('held')
  })

  it('answers: hold (political capital), align with a bloc, share (half the resource), withdraw', () => {
    const base = act(at(lunarCompany(), '2031Q4'), { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })
    const r = (choice: 'hold' | 'align' | 'share' | 'withdraw') =>
      act(base, { type: 'RESOLVE_LUNAR_DISPUTE', site: 'shackleton_ridge', choice })
    const hold = r('hold')
    expect(hold.politicalCapital).toBe(base.politicalCapital! - MOON.dispute.pc_to_hold)
    expect(rivalOn(hold, 'shackleton_ridge')).toBeUndefined()
    expect(claimOf(at(hold, '2032Q3'), 'shackleton_ridge')!.status).toBe('claimed')
    const align = r('align')
    expect(align.act4Moon!.alignedBloc).toBe('accords')
    const share = r('share')
    expect(resourceShare(claimOf(at(share, '2032Q3'), 'shackleton_ridge')!)).toBe(0.5)
    const withdraw = r('withdraw')
    expect(claimOf(withdraw, 'shackleton_ridge')).toBeUndefined()
    // a commercial claimant has no bloc to align with
    let n = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'de_gerlache_ridge' })
    n = at(n, '2032Q1')
    expect(err(n, { type: 'RESOLVE_LUNAR_DISPUTE', site: 'de_gerlache_ridge', choice: 'align' })).toBe('error.moon_no_bloc')
  })

  it('a site another has landed on can’t be claimed', () => {
    const s = at(lunarCompany(), '2032Q2')
    expect(err(s, { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })).toBe('error.moon_held')
  })
})

describe('prospect missions, landings and reports (M30.3)', () => {
  it('a mission: 1 Bandwidth, 2 t at the delivery price + $60M (≈ $140M in 2031), arriving 3-5 quarters later', () => {
    let s = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    expect(missionCostUsd(s)).toBe(2000 * 40000 + 60e6)
    const cash = s.cash
    const bw = s.bandwidth
    s = act(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })
    const m = s.act4Moon!.missions[0]
    expect(s.cash).toBe(cash - 140e6)
    expect(s.bandwidth).toBe(bw - 1)
    expect(m.arrivalQuarter - s.quarter).toBeGreaterThanOrEqual(3)
    expect(m.arrivalQuarter - s.quarter).toBeLessThanOrEqual(5)
    expect(err(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })).toBe('error.moon_mission_en_route')
    expect(err(s, { type: 'SEND_LUNAR_MISSION', site: 'cabeus' })).toBe('error.moon_no_claim')
  })

  it('played through: the landing window comes up in its quarter (default commit); success holds the claim with a report', () => {
    let s = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    s = act(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })
    const arrival = s.act4Moon!.missions[0].arrivalQuarter
    while (s.quarter < arrival) s = playQuarter(s)
    s = playQuarter(s)
    const m = s.act4Moon!.missions[0]
    expect(['landed', 'lost']).toContain(m.status)
    const claim = claimOf(s, 'malapert_massif')!
    if (m.status === 'landed') {
      expect(claim).toMatchObject({ status: 'held', landedQuarter: arrival })
      expect(claim.reports).toHaveLength(1)
      expect(claim.reports[0].step).toBe('first')
      expect(resourceCategory(claim)).toBe('indicated')
    } else {
      expect(claim).toMatchObject({ status: 'claimed', landedQuarter: null })
      expect(resourceCategory(claim)).toBe('inferred')
    }
  })

  it('landing success follows the market’s rate (55% in 2031, over many missions)', () => {
    let landed = 0
    const N = 1000
    const base = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    for (let i = 0; i < N; i++) {
      const s = structuredClone(base)
      s.act4Moon!.missions.push({
        id: `t${i}`, site: 'malapert_massif', launchedQuarter: 0, arrivalQuarter: s.quarter, costUsd: 0, status: 'en_route', aborts: 0,
      })
      s.interrupt = { id: 'lunar_landing', week: 3, coin: 'BTC', changePct: 0, lunarMissionId: `t${i}` }
      resolveLunarAlert(s, 'commit')
      if (s.act4Moon!.missions[0].status === 'landed') landed++
    }
    expect(landingChance(base)).toBe(0.55)
    // (1,000 missions: ±5 points is over 3 standard deviations; 300 gave a 3-sigma run on this seed)
    expect(Math.abs(landed / N - 0.55)).toBeLessThan(0.05)
  })

  it('reports are estimates, unbiased and narrowing: the first prospect’s median sits near the pilot-grade reading', () => {
    const s = lunarCompany()
    const ice = 0.6
    const med = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    const first = Array.from({ length: 401 }, (_, n) => prospectReport(7, 'patchy', 'malapert_massif', ice, 'first', n))
    const pilot = Array.from({ length: 401 }, (_, n) => prospectReport(7, 'patchy', 'malapert_massif', ice, 'pilot', n))
    const mf = med(first.map((r) => r.estimateT))
    const mp = med(pilot.map((r) => r.estimateT))
    expect(Math.abs(mf / mp - 1)).toBeLessThan(0.1)
    expect(first[0].highT / first[0].lowT).toBeGreaterThan(pilot[0].highT / pilot[0].lowT)
    expect(s.act4Moon).toBeUndefined()
  })

  it('aborting a landing costs $10M and a quarter; an unfired landing lands at the quarter’s end', () => {
    let s = act(lunarCompany(), { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    s = act(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })
    const m = s.act4Moon!.missions[0]
    m.arrivalQuarter = s.quarter
    s.interrupt = { id: 'lunar_landing', week: 3, coin: 'BTC', changePct: 0, lunarMissionId: m.id }
    const cash = s.cash
    const x = structuredClone(s)
    resolveLunarAlert(x, 'abort')
    expect(x.act4Moon!.missions[0]).toMatchObject({ arrivalQuarter: s.quarter + 1, aborts: 1, status: 'en_route' })
    expect(x.cash).toBe(cash - 10e6)
    const y = structuredClone(s)
    y.interrupt = null
    endQuarterMissions(y)
    expect(y.act4Moon!.missions[0].status).not.toBe('en_route')
  })
})
