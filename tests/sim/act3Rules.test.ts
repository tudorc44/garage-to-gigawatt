// M11.4c: Act II's systems run in Act III on the scenario's market. The gate list (which systems run
// and which stay off) is in dev-notes; these tests pin the answers that are testable.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  POWER_REGIONS,
  SCENARIO_IDS,
  actFirstQuarter,
  isAct2RulesQuarter,
  isActIIQuarter,
} from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame } from '../../src/sim/replay.ts'
import { inAct2Rules, toAct3, type GameState } from '../../src/sim/state.ts'
import { regionAnger } from '../../src/sim/systems/anger.ts'
import { hostingBlocker } from '../../src/sim/systems/hosting.ts'
import { hireBlocker } from '../../src/sim/systems/hires.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { scenarioDefaultProb } from '../../src/sim/systems/projects.ts'
import { activeRivals } from '../../src/sim/systems/rivals.ts'
import { scoutAct2Blocker } from '../../src/sim/systems/scouting.ts'
import {
  checkSpotAlerts,
  planSpotShock,
} from '../../src/sim/systems/spotMarket.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)

/** Plays one quarter (default answers to alerts) from its Plan phase to its report. */
function toReport(s: GameState): GameState {
  const r = applyAction(s, { type: 'END_PLAN' })
  if (!r.ok) throw new Error(r.error.key)
  s = r.state
  while (s.phase === 'live')
    s = s.interrupt
      ? (
          applyAction(s, {
            type: 'RESOLVE_INTERRUPT',
            choice: defaultChoice(s),
          }) as { state: GameState }
        ).state
      : advance(s)
  return s
}

/** A real Act II game played by a bot to the end of 2026Q4 (its projects, debt and rating carry on). */
let end: GameState
beforeAll(() => {
  end = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
})

describe('the gates: which Act II rules run in Act III', () => {
  it('isAct2RulesQuarter / inAct2Rules: Act II and Act III, nothing else', () => {
    expect(isAct2RulesQuarter(FIRST - 1)).toBe(true)
    expect(isAct2RulesQuarter(FIRST)).toBe(true)
    expect(isAct2RulesQuarter(FIRST + 15)).toBe(true)
    expect(isAct2RulesQuarter(0)).toBe(false)
    expect(isAct2RulesQuarter(-3)).toBe(false)
    expect(isActIIQuarter(FIRST)).toBe(false) // the old Act II-only gate is unchanged
    expect(inAct2Rules({ act: 3 })).toBe(true)
    expect(inAct2Rules({ act: 2 })).toBe(true)
    expect(inAct2Rules({ act: 1 })).toBe(false)
    expect(inAct2Rules({ act: 0 })).toBe(false)
    expect(inAct2Rules(null)).toBe(false)
  })

  it('YES: hosting, hires and the Act II reports are open in Act III', () => {
    const s = { ...toAct3(end, { scenario: 's0' }), bandwidth: 6 }
    const site = s.sites.find((x) => x.tier !== 'garage')!
    expect(hostingBlocker(s, site.id, 1000)?.key).not.toBe('error.act2_only')
    expect(hireBlocker(s, 'trader')?.key).not.toBe('error.act2_only')
    const done = toReport(s)
    expect(done.reports.at(-1)!.creditRating).toBeDefined()
    expect(done.reports.at(-1)!.mwByUseKw).toBeDefined()
  })

  it('NO: the spot shock and the spot alert, rivals (scouting opened in M11.5a)', () => {
    const s = { ...toAct3(end, { scenario: 's1' }), bandwidth: 6 }
    expect(scoutAct2Blocker(s)).toBeUndefined()
    for (let q = FIRST; q < FIRST + 16; q++) {
      const t = { ...s, quarter: q }
      planSpotShock(t)
      expect(t.spotShock).toBeNull()
    }
    const t = structuredClone(s)
    checkSpotAlerts(t, marketWeek(FIRST, 1, 's1'))
    expect(t.interrupt).toBeNull()
    for (let q = FIRST; q < FIRST + 16; q++) expect(activeRivals(q)).toEqual([])
  })

  it('Ratepayer Anger runs in Act III, from energized MW', () => {
    const s = toAct3(end, { scenario: 's0' })
    const total = POWER_REGIONS.reduce(
      (n, r) => n + regionAnger(s, r, FIRST),
      0,
    )
    expect(total).toBeGreaterThan(0)
    // ...and the standing policy bumps of Act II still apply (the national backlash of 2026Q1).
    expect(regionAnger(s, 'pjm', FIRST)).toBeGreaterThanOrEqual(
      regionAnger(s, 'pjm', FIRST - 1),
    )
  })
})

describe('AI-lab distress from the scenario columns (DT 3)', () => {
  const at = (id: (typeof SCENARIO_IDS)[number], q: number) =>
    ({ scenarioId: id, quarter: q }) as GameState

  it('each tenant type reads its own column of the scenario’s quarter', () => {
    for (const id of SCENARIO_IDS)
      for (let n = 0; n < 16; n++) {
        const row = CONTENT.act3Scenarios[id].quarterly[n]
        const s = at(id, FIRST + n)
        expect(scenarioDefaultProb(s, 'ai_lab')).toBe(
          row.tenant_default_prob_q_ai_lab,
        )
        expect(scenarioDefaultProb(s, 'neocloud_sub_tenant')).toBe(
          row.tenant_default_prob_q_neocloud_sub,
        )
        expect(scenarioDefaultProb(s, 'hyperscaler')).toBe(
          row.tenant_default_prob_q_hyperscaler,
        )
      }
    expect(scenarioDefaultProb(at('s1', FIRST), undefined)).toBe(0)
  })

  it('S1 has its crisis peak (AI labs 18% a quarter) and S0 stays flat (0.5%)', () => {
    const peak = Math.max(
      ...Array.from({ length: 16 }, (_, n) =>
        scenarioDefaultProb(at('s1', FIRST + n), 'ai_lab'),
      ),
    )
    expect(peak).toBe(0.18)
    for (let n = 0; n < 16; n++)
      expect(scenarioDefaultProb(at('s0', FIRST + n), 'ai_lab')).toBe(0.005)
  })
})

describe('a real company plays Act III on each scenario', () => {
  const runs = new Map<string, GameState[]>()
  beforeAll(() => {
    for (const id of SCENARIO_IDS) {
      let s = toAct3(end, { scenario: id })
      const states: GameState[] = []
      while (s.phase !== 'chapter' && s.phase !== 'gameover') {
        s = toReport(s)
        if (s.phase === 'gameover') break
        states.push(s)
        const n = applyAction(s, { type: 'NEXT_QUARTER' })
        if (!n.ok) throw new Error(n.error.key)
        s = n.state
      }
      states.push(s)
      runs.set(id, states)
    }
  })

  it('reaches the chapter phase in every scenario with its projects, debt and rating running', () => {
    for (const id of SCENARIO_IDS) {
      const s = runs.get(id)!.at(-1)!
      expect(s.phase, id).toBe('chapter')
      expect(s.act3End?.scenarioId).toBe(id)
      expect(s.projects.length).toBeGreaterThan(0)
      expect(s.creditRating).not.toBeNull()
    }
  })

  it('the seam: 2027Q1’s valuation is within ±10% of the end of 2026Q4 (after the multiple rebase)', () => {
    const entry = end.reports.at(-1)!.valuationUsd
    for (const id of SCENARIO_IDS) {
      const first = runs.get(id)![0].reports.at(-1)!
      expect(first.quarter).toBe('2027Q1')
      expect(Math.abs(first.valuationUsd / entry - 1), id).toBeLessThan(0.1)
    }
  })

  it('the scenario shapes the outcome: S2 ends highest, S1 lowest (a sanity check, not a balance target)', () => {
    const last = (id: string) =>
      runs.get(id)!.at(-1)!.reports.at(-1)!.valuationUsd
    expect(last('s2')).toBeGreaterThan(last('s0'))
    expect(last('s0')).toBeGreaterThan(last('s1'))
    expect(last('s3')).toBeGreaterThan(last('s1'))
  })

  it('projects earn revenue from the scenario’s market in Act III', () => {
    const r = runs.get('s2')!.at(-1)!.reports.at(-1)!
    expect(r.aiRevenueUsd).toBeGreaterThan(0)
  })
})

describe('what reads the scenario files', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(n) ? [p] : []
    })
  }
  it('no system reads a scenario’s phase; only Signals-free code touches the per-quarter default columns', () => {
    const sim = files(new URL('../../src/sim', import.meta.url).pathname)
    const strip = (t: string) =>
      t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const users = sim
      .filter((f) => /act3Scenarios/.test(strip(readFileSync(f, 'utf8'))))
      .map((f) => f.split('/').slice(-2).join('/'))
      .sort()
    // Only the market readers (weeks) and the tenant-default roll (quarterly columns).
    expect(users).toEqual(['systems/market.ts', 'systems/projects.ts'])
    for (const f of sim) {
      const t = strip(readFileSync(f, 'utf8'))
      expect(t, f).not.toMatch(
        /quarterly\[[^\]]*\]\.phase|\.phase ===? ['"](baseline|signal_window|trigger|aftermath)/,
      )
    }
  })
})
