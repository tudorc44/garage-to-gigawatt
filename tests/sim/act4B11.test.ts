// B11 (act4-scope.md §5; doc 33 §9.4-9.5, §18): the lunar honesty invariant, played. A company takes the first
// opportunity at the de Gerlache ridge (claim and a mission in 2031Q1; another mission straight after a failed landing;
// on landing, a 100 kWe solar array and the pilot at once, with a maintenance crew; the megawatt contract and the
// production decision as soon as they're allowed), in each lunar grade. By 2035Q4 its pilot processes Rich 15-60, Patchy
// 5-30, Dry 0-8 t of water a year; no production plant produces inside the act; nothing lunar touches orbital costs.
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { act4Row, actLastQuarter } from '../../src/content/index.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { claimOf } from '../../src/sim/systems/moon.ts'
import { launchPriceUsdKg } from '../../src/sim/systems/orbitLaunch.ts'
import { act, orbitCompany, playQuarter } from './act4Helpers.ts'

const SITE = 'de_gerlache_ridge' as const
/** Takes an action if it's allowed now (the schedule tries each step every quarter). */
const tryAct = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  return r.ok ? r.state : s
}

function firstOpportunity(grade: 'rich' | 'patchy' | 'dry'): { s: GameState; lastYearT: number } {
  let s = orbitCompany('f1')
  s.lunarGrade = grade
  s.politicalCapital = 80
  s = act(s, { type: 'CLAIM_LUNAR_SITE', site: SITE })
  const processedAt: number[] = []
  while (s.phase === 'plan') {
    s.cash = Math.max(s.cash, 5e9)
    s.politicalCapital = Math.max(s.politicalCapital ?? 0, 40)
    const c = claimOf(s, SITE)
    if (c && c.status !== 'held') s = tryAct(s, { type: 'SEND_LUNAR_MISSION', site: SITE })
    s = tryAct(s, { type: 'RESOLVE_LUNAR_DISPUTE', site: SITE, choice: 'hold' })
    s = tryAct(s, { type: 'BUILD_LUNAR_SOLAR', site: SITE, kwe: 100 })
    s = tryAct(s, { type: 'DECIDE_LUNAR_PILOT', site: SITE })
    if (claimOf(s, SITE)?.pilot && !claimOf(s, SITE)!.pilot!.maintained)
      s = tryAct(s, { type: 'SET_LUNAR_MAINTENANCE', site: SITE, on: true })
    s = tryAct(s, { type: 'SIGN_LUNAR_MEGAWATT' })
    s = tryAct(s, { type: 'DECIDE_LUNAR_PRODUCTION', site: SITE })
    // nothing lunar ever changes what a launch costs: Pallas to SSO is the market's LEO price, ×1 ×1
    expect(launchPriceUsdKg(s, 'pallas', 'sso')).toBe(act4Row(s.quarter, scenarioOf(s)).launch_usd_kg_leo)
    s = playQuarter(s)
    processedAt.push(claimOf(s, SITE)?.pilot?.processedT ?? 0)
  }
  expect(s.phase).toBe('chapter')
  const n = processedAt.length
  return { s, lastYearT: processedAt[n - 1] - processedAt[n - 5] }
}

describe('B11: the lunar honesty invariant, played at the first opportunity (M30.6)', () => {
  const band = { rich: [15, 60], patchy: [5, 30], dry: [0, 8] } as const
  it.each(['rich', 'patchy', 'dry'] as const)('%s', (grade) => {
    const { s, lastYearT } = firstOpportunity(grade)
    const c = claimOf(s, SITE)!
    expect(c.pilot, 'the pilot was decided').not.toBeNull()
    expect(c.pilot!.readyQuarter).toBeLessThanOrEqual(actLastQuarter(4) - 4)
    expect(lastYearT).toBeGreaterThanOrEqual(band[grade][0])
    expect(lastYearT).toBeLessThanOrEqual(band[grade][1])
    // production, if decided, produces nothing inside the act
    if (c.production) expect(c.production.firstOutputQuarter).toBeGreaterThan(actLastQuarter(4))
  })
})
