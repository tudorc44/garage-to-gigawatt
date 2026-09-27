// Act II interrupts (M5.9; scope 0.2 §2.9; interrupts_act2.json): the random spot price shock, the
// GPU spot price alert, and grid curtailment at AI sites (the SLA credit, SB6).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import { curtailOffer } from '../../src/sim/systems/curtailment.ts'
import { availableChoices } from '../../src/sim/systems/interrupts.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import {
  annualContractUsd,
  neocloudUsdHr,
} from '../../src/sim/systems/projects.ts'
import {
  checkSpotAlerts,
  planSpotShock,
} from '../../src/sim/systems/spotMarket.ts'
import {
  act2Company,
  ok,
  pilotReady,
  playQuarter,
  shellReady,
} from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A live 1 MW pilot on spot, in the Plan phase of `label`. */
function livePilot(label: string, seed = 1): GameState {
  let s = ok(pilotReady('2023Q3', seed), {
    type: 'PROJECT_START',
    projectId: 'project-1',
  })
  while (s.projects[0].stage !== 'live') s = playQuarter(s)
  return { ...s, quarter: q(label) }
}
const live = (s: GameState, week: number): GameState => ({
  ...s,
  phase: 'live',
  week,
  interrupt: null,
  interruptsThisQuarter: 0,
})

describe('the random spot price shock', () => {
  it('only from 2025Q3, about 15% of quarters', () => {
    const s = act2Company('2025Q2')
    planSpotShock(s)
    expect(s.spotShock).toBeNull()
    let hits = 0
    for (let seed = 1; seed <= 400; seed++) {
      const x = act2Company('2025Q4', seed)
      planSpotShock(x)
      if (x.spotShock) {
        hits++
        expect(x.spotShock.week).toBeGreaterThanOrEqual(2)
        expect(x.spotShock.week).toBeLessThanOrEqual(12)
      }
    }
    expect(hits / 400).toBeGreaterThan(0.1)
    expect(hits / 400).toBeLessThan(0.2)
  })

  it('pauses a company with a spot cluster; "lock" fixes 70% of the neocloud price for 4 quarters', () => {
    const s = live(livePilot('2025Q4'), 4)
    s.spotShock = { week: 5 }
    checkSpotAlerts(s, marketWeek(s.quarter, 4))
    expect(s.interrupt?.id).toBe('spot_price_shock')
    expect(availableChoices(s)).toEqual(['lock', 'stay'])
    const locked = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'lock' })
    expect(locked.projects[0].spotLock).toEqual({
      usdHr: neocloudUsdHr('h100', s.quarter)! * 0.7,
      until: s.quarter + 3,
    })
    const stay = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'stay' })
    expect(stay.events.modifiers.at(-1)).toMatchObject({
      kind: 'spot',
      mult: 0.7,
    })
  })

  it('passes silently as "stay" when the 3 interrupts are used up', () => {
    const s = { ...live(livePilot('2025Q4'), 4), interruptsThisQuarter: 3 }
    s.spotShock = { week: 5 }
    checkSpotAlerts(s, marketWeek(s.quarter, 4))
    expect(s.interrupt).toBeNull()
    expect(s.events.modifiers.at(-1)).toMatchObject({ kind: 'spot', mult: 0.7 })
    expect(s.log.at(-1)!.key).toBe('log.spot_shock_silent')
  })
})

describe('the GPU spot price alert', () => {
  it('fires on a 15%+ weekly H100 spot move (2023Q4’s first week: $5.00 → $3.50) with a spot cluster', () => {
    const s = live(livePilot('2023Q4'), 0)
    checkSpotAlerts(s, marketWeek(s.quarter, 0))
    expect(s.interrupt?.id).toBe('gpu_spot_alert')
    expect(s.interrupt!.changePct).toBeCloseTo(-0.3, 9)
    const locked = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'lock' })
    expect(locked.projects[0].spotLock!.usdHr).toBe(
      neocloudUsdHr('h100', s.quarter),
    )
  })

  it('stays quiet without a spot cluster', () => {
    const s = live(act2Company('2023Q4'), 0)
    checkSpotAlerts(s, marketWeek(s.quarter, 0))
    expect(s.interrupt).toBeNull()
  })

  it('a locked cluster earns every GPU-hour at the locked price', () => {
    let s = livePilot('2025Q4')
    s.projects[0].spotLock = { usdHr: 1, until: s.quarter }
    s = ok(s, { type: 'END_PLAN' })
    s.projectEvents = []
    s.events.queue = []
    s.spotShock = null
    s = advance({ ...s, interrupt: null })
    const gpus = s.projects[0].gpuCount
    expect(s.quarterStats.aiRevenueUsd).toBeCloseTo(gpus * 1 * 24 * 7, 0)
  })
})

describe('grid curtailment at AI sites', () => {
  /** A live shell with its tenant at an ERCOT own site, in 2024Q3 (the curtailment season). */
  function ercotShell(kw = 5000): GameState {
    let s = shellReady('2023Q3')
    s.sites[1].region = 'ercot'
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    while (s.projects[0].stage !== 'live') s = playQuarter(s)
    s.sites[1].kw = kw
    return s
  }

  it('the AI halls go dark too, and their tenants get 15% of a month’s charge', () => {
    const s = ercotShell()
    const offer = curtailOffer(s, marketWeek(s.quarter, 3))
    expect(offer.aiMw).toBe(5)
    expect(offer.slaUsd).toBeCloseTo(
      (annualContractUsd(s.projects[0]) / 12) * 0.15,
      4,
    )
    expect(offer.forced).toBeUndefined()
  })

  it('SB6: from 2026Q1 an ERCOT site of 75 MW or more can’t refuse', () => {
    const s = { ...ercotShell(100_000), quarter: q('2026Q3') }
    const offer = curtailOffer(s, marketWeek(s.quarter, 3))
    expect(offer.forced).toBe(true)
    const shown: GameState = {
      ...s,
      phase: 'live',
      interrupt: {
        id: 'curtailment',
        week: 3,
        coin: 'BTC',
        changePct: 0,
        curtail: offer,
      },
    }
    expect(availableChoices(shown)).toEqual(['curtail'])
  })
})
