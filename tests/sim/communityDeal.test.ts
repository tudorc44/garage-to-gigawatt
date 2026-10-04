// M19.2 (owner request via the design thread, 4 Oct 2026): the yearly Community Deal. Offered every 4 quarters (first
// the quarter after hiring) on the hottest site at Heat 30 or more (tie: the larger; never the garage), waiting when
// none qualifies; signing (1 BW, $100K × MW, $100K–$20M) puts Heat at 12 through an offset that fades 5 a quarter.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  communityDealCostUsd,
  communityDealTarget,
  openCommunityDeal,
} from '../../src/sim/systems/communityDeal.ts'
import {
  endQuarterHeat,
  heatOf,
  recalcHeat,
  startQuarterHeat,
} from '../../src/sim/systems/heat.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const Q0 = q('2019Q1')

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

function site(id: string, tier: string, extraKw = 0): Site {
  return {
    id,
    tier,
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    ...(extraKw ? { powerAdds: [{ kw: extraKw, readyQuarter: 0 }] } : {}),
  } as Site
}

/** 2019Q1 Plan phase, a warehouse (site-2, 1 MW), the manager hired; site-2's load set so Heat = `heat`. */
function company(heat = 40): GameState {
  let s: GameState = { ...newGame(1), quarter: Q0, cash: 5_000_000 }
  s.sites.push(site('site-2', 'warehouse'))
  s = ok(s, { type: 'HIRE', hire: 'community_relations' })
  setHeat(s, 'site-2', heat)
  return s
}

/** Sets a site's load so its Heat is `heat` (warehouse base 15, −5 with her; nothing else in 2019). */
function setHeat(s: GameState, id: string, heat: number): void {
  const x = s.sites.find((y) => y.id === id)!
  heatOf(s, id).load = 0
  recalcHeat(s, x)
  heatOf(s, id).load = heat - heatOf(s, id).value
  recalcHeat(s, x)
}

/** Moves to the next quarter's Plan phase the way the game does (quarter end, then the new quarter's start). */
function nextQuarter(s: GameState): void {
  s.quarter++
  endQuarterHeat(s)
  startQuarterHeat(s)
  openCommunityDeal(s)
}
const heat = (s: GameState, id = 'site-2') => heatOf(s, id).value

describe('the Community Deal offer (M19.2)', () => {
  it('first offered the quarter after hiring, then every 4 quarters', () => {
    const s = company()
    expect(s.communityDeal).toEqual({ nextQuarter: Q0 + 1 })
    openCommunityDeal(s)
    expect(s.communityDeal!.offer).toBeUndefined()
    nextQuarter(s)
    expect(s.communityDeal!.offer).toEqual({ siteId: 'site-2', costUsd: 100_000 })
    expect(s.communityDeal!.nextQuarter).toBe(Q0 + 5)
    for (let i = 0; i < 3; i++) {
      nextQuarter(s)
      expect(s.communityDeal!.offer).toBeUndefined()
    }
    nextQuarter(s)
    expect(s.quarter).toBe(Q0 + 5)
    expect(s.communityDeal!.offer?.siteId).toBe('site-2')
  })

  it('waits while no site is at 30, then comes the first quarter one is; the clock restarts from then', () => {
    const s = company(25)
    nextQuarter(s)
    expect(s.communityDeal!.offer).toBeUndefined()
    nextQuarter(s)
    expect(s.communityDeal!.offer).toBeUndefined()
    setHeat(s, 'site-2', 30)
    nextQuarter(s)
    expect(s.communityDeal!.offer?.siteId).toBe('site-2')
    expect(s.communityDeal!.nextQuarter).toBe(s.quarter + 4)
  })

  it('targets the hottest site (tie: the larger), never the garage', () => {
    const s = company(35)
    s.sites.push(site('site-3', 'warehouse', 4_000))
    setHeat(s, 'site-3', 35)
    expect(communityDealTarget(s)?.id).toBe('site-3') // tie: 5 MW beats 1 MW
    setHeat(s, 'site-2', 36)
    expect(communityDealTarget(s)?.id).toBe('site-2')
    // a hot garage alone gets nothing
    setHeat(s, 'site-2', 10)
    setHeat(s, 'site-3', 10)
    heatOf(s, s.sites[0].id).grievance = 40
    recalcHeat(s, s.sites[0])
    expect(heat(s, s.sites[0].id)).toBeGreaterThanOrEqual(30)
    expect(communityDealTarget(s)).toBeUndefined()
  })

  it('costs $100K × MW, at least $100K and at most $20M', () => {
    expect(communityDealCostUsd(site('a', 'warehouse'))).toBe(100_000)
    expect(communityDealCostUsd(site('b', 'texas_site'))).toBe(10_000_000)
    expect(communityDealCostUsd(site('c', 'texas_site', 150_000))).toBe(20_000_000)
  })

  it('"Not this year" and END_PLAN let it lapse; no offer → the actions refuse', () => {
    const s = company()
    nextQuarter(s)
    const declined = ok(s, { type: 'COMMUNITY_DEAL_DECLINE' })
    expect(declined.communityDeal!.offer).toBeUndefined()
    const lapsed = ok(s, { type: 'END_PLAN' })
    expect(lapsed.communityDeal!.offer).toBeUndefined()
    expect(applyAction(declined, { type: 'COMMUNITY_DEAL_SIGN' })).toMatchObject({
      ok: false,
      error: { key: 'error.no_community_deal' },
    })
  })
})

describe('signing the deal (M19.2)', () => {
  it('pays, 1 BW, Heat to 12 at once; then 17, 22, … as the goodwill fades 5 a quarter (load unchanged), logged when gone', () => {
    const s0 = company(40)
    nextQuarter(s0)
    const cash = s0.cash
    const bw = s0.bandwidth
    const s = ok(s0, { type: 'COMMUNITY_DEAL_SIGN' })
    expect(s.cash).toBe(cash - 100_000)
    expect(s.bandwidth).toBe(bw - 1)
    expect(heat(s)).toBeCloseTo(12, 9)
    expect(heatOf(s, 'site-2').dealOffset).toBeCloseTo(-28, 9)
    expect(s.communityDeal!.offer).toBeUndefined()
    expect(s.log.at(-1)!.key).toBe('log.community_deal_signed')
    const seen: number[] = []
    for (let i = 0; i < 6; i++) {
      nextQuarter(s)
      seen.push(Math.round(heat(s)))
    }
    expect(seen).toEqual([17, 22, 27, 32, 37, 40])
    expect(heatOf(s, 'site-2').dealOffset).toBeUndefined()
    expect(s.log.some((e) => e.key === 'log.community_deal_faded')).toBe(true)
  })

  it('a new deal on the same site replaces what is left', () => {
    const s0 = company(40)
    nextQuarter(s0)
    let s = ok(s0, { type: 'COMMUNITY_DEAL_SIGN' })
    for (let i = 0; i < 4; i++) nextQuarter(s)
    expect(heat(s)).toBeCloseTo(32, 9) // 4 quarters faded: −28 → −8
    s = ok(s, { type: 'COMMUNITY_DEAL_SIGN' })
    expect(heat(s)).toBeCloseTo(12, 9)
    expect(heatOf(s, 'site-2').dealOffset).toBeCloseTo(-28, 9)
  })

  it('never raises Heat (already at 12 or under: no offset)', () => {
    const s0 = company(40)
    nextQuarter(s0)
    setHeat(s0, 'site-2', 10)
    const s = ok(s0, { type: 'COMMUNITY_DEAL_SIGN' })
    expect(heatOf(s, 'site-2').dealOffset).toBeUndefined()
    expect(heat(s)).toBeCloseTo(10, 9)
  })

  it('letting her go stops the offers but keeps the offset already paid for', () => {
    const s0 = company(40)
    nextQuarter(s0)
    const s = ok(s0, { type: 'COMMUNITY_DEAL_SIGN' })
    nextQuarter(s)
    const t = ok(s, { type: 'FIRE', hire: 'community_relations' })
    expect(heatOf(t, 'site-2').dealOffset).toBeCloseTo(-23, 9)
    expect(heat(t)).toBeCloseTo(17 + 5, 9) // her −5 is gone, the deal's goodwill isn't
    expect(t.communityDeal).toBeUndefined()
    for (let i = 0; i < 5; i++) nextQuarter(t)
    expect(t.communityDeal).toBeUndefined()
  })
})
