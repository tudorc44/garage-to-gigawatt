// M11.1: the Act III scenario id (s0–s3) and the market readers' optional scenario argument.
// Two things must hold: (1) a scenario changes what advance() produces in Act III; (2) every call
// that gives no scenario (all of Act I and Act II) is provably untouched, the same way M9/M10 proved
// their refactors: identical values, and where it matters the very same objects.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  actFirstQuarter,
  actLastQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import { currentMarket } from '../../src/sim/selectors.ts'
import {
  drawScenario,
  newGame,
  toAct3,
  type GameState,
} from '../../src/sim/state.ts'
import {
  marketWeek,
  previousMarketWeek,
  scenarioOf,
} from '../../src/sim/systems/market.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { act2Company, ok } from './act2Helpers.ts'
import { act3WithoutScenario } from './act3Helpers.ts'

/** An Act III state (scenario `id`) with a working fleet on the own site, at the first Act III quarter. */
function act3With(id: ScenarioId, seed = 1): GameState {
  const s = toAct3(act2Company('2026Q4', seed))
  s.machines.push({
    id: 'lot-test',
    model: 's21', // the newest BTC ASIC: profitable in every scenario, so it never switches off
    siteId: 'site-2',
    condition: 'new',
    count: 500,
    failed: 0,
    earnsFromQuarter: 0,
  })
  return { ...s, scenarioId: id }
}

/** Plays the 13 live weeks of the first Act III quarter (default answers to any alert). */
function playLive(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('the scenario draw (doc 27 D2)', () => {
  it('is deterministic: the same seed always draws the same scenario', () => {
    for (const seed of [1, 2, 3, 42, 2027, 99999])
      expect(drawScenario(seed)).toBe(drawScenario(seed))
  })

  it('follows 25 / 30 / 25 / 20 % over many seeds', () => {
    const n = 8000
    const count: Record<ScenarioId, number> = { s0: 0, s1: 0, s2: 0, s3: 0 }
    for (let seed = 1; seed <= n; seed++) count[drawScenario(seed)]++
    const w = BALANCE.act3.scenarioWeightsPct
    expect(w.s0 + w.s1 + w.s2 + w.s3).toBe(100)
    for (const id of SCENARIO_IDS)
      expect(Math.abs(count[id] / n - w[id] / 100)).toBeLessThan(0.02)
  })

  it('uses its own substream: drawing never moves the main RNG', () => {
    const before = act2Company('2026Q4', 7)
    const after = toAct3(before)
    expect(after.rng).toBe(before.rng)
    expect(after.scenarioId).toBe(drawScenario(7))
  })

  it('is set at the Act II→III boundary only: absent for Act I, Act II and the M10 stub', () => {
    expect(newGame(1).scenarioId).toBeUndefined()
    expect(act2Company('2024Q1').scenarioId).toBeUndefined()
    expect(toAct3(newGame(1)).scenarioId).toBeDefined()
    expect(toAct3(newGame(1)).act).toBe(3)
    // The test-only option forces a scenario; without it the seed's draw stands.
    expect(toAct3(newGame(1), { scenario: 's2' }).scenarioId).toBe('s2')
    expect(toAct3(newGame(1)).scenarioId).toBe(drawScenario(1))
  })
})

describe('a scenario changes what advance() produces in Act III', () => {
  it('the same seed and the same actions give different numbers under different scenarios', () => {
    const results = SCENARIO_IDS.map((id) => {
      const s = playLive(act3With(id))
      return { id, cash: s.cash, btc: s.treasury.BTC, week: s.week }
    })
    // Every scenario played the same 13 weeks...
    for (const r of results) expect(r.week).toBe(13)
    // ...and no two earned the same.
    const cashes = results.map((r) => r.cash)
    expect(new Set(cashes).size).toBe(4)
  })

  it('the same scenario twice is identical (determinism)', () => {
    expect(playLive(act3With('s2', 5))).toEqual(playLive(act3With('s2', 5)))
  })

  it('advance() reads the scenario’s own weeks, not the shared market', () => {
    for (const id of SCENARIO_IDS) {
      const s = act3With(id)
      const first = actFirstQuarter(3)
      expect(currentMarket(s)).toBe(CONTENT.act3Scenarios[id].weeks[0][0])
      expect(scenarioOf(s)).toBe(id)
      expect(marketWeek(first + 1, 4, id)).toBe(
        CONTENT.act3Scenarios[id].weeks[1][4],
      )
    }
    // The four scenarios really are four different BTC price paths.
    const paths = SCENARIO_IDS.map((id) =>
      CONTENT.act3Scenarios[id].weeks.map((w) => w.at(-1)!.btc_usd).join(),
    )
    expect(new Set(paths).size).toBe(4)
  })
})

describe('calls with no scenario are unaffected (Act I, Act II, the stub)', () => {
  it('marketWeek without a scenario returns the shared market’s own objects, for every quarter and week', () => {
    for (let q = 0; q <= actLastQuarter(2); q++)
      for (let w = 0; w < BALANCE.weeksPerQuarter; w++)
        expect(marketWeek(q, w)).toBe(CONTENT.market[q][w])
  })

  it('previousMarketWeek without a scenario is the old rule: week − 1, or the last week before', () => {
    for (let q = 0; q <= actLastQuarter(2); q++)
      for (let w = 0; w < BALANCE.weeksPerQuarter; w++)
        expect(previousMarketWeek(q, w)).toBe(
          w > 0
            ? CONTENT.market[q][w - 1]
            : q === 0
              ? undefined
              : CONTENT.market[q - 1].at(-1),
        )
  })

  it('a scenario id passed for a quarter before Act III is ignored (Act I and II can never change)', () => {
    for (const id of SCENARIO_IDS)
      for (let q = 0; q < actFirstQuarter(3); q++) {
        expect(marketWeek(q, 0, id)).toBe(CONTENT.market[q][0])
        expect(previousMarketWeek(q, 5, id)).toBe(CONTENT.market[q][4])
      }
  })

  it('an Act III scenario follows on from Act II’s last quarter: week 0 looks back at 2026Q4', () => {
    const first = actFirstQuarter(3)
    expect(previousMarketWeek(first, 0, 's1')).toBe(
      CONTENT.market[first - 1].at(-1),
    )
  })

  it('scenarioOf gives nothing outside Act III, even for a state that (wrongly) holds an id', () => {
    const a2 = { ...act2Company('2024Q1'), scenarioId: 's3' as const }
    const a1 = { ...newGame(1), scenarioId: 's3' as const }
    expect(scenarioOf(a2)).toBeUndefined()
    expect(scenarioOf(a1)).toBeUndefined()
    // And advancing Act II is identical with or without the stray id.
    const clean = act2Company('2024Q1', 3)
    const stray = { ...clean, scenarioId: 's3' as const }
    const step = (s: GameState) => {
      s = ok(s, { type: 'END_PLAN' })
      for (let i = 0; i < 13 && s.phase === 'live' && !s.interrupt; i++)
        s = advance(s)
      return s
    }
    const played = step(stray)
    delete played.scenarioId
    expect(played).toEqual(step(clean))
  })

  it('reading an Act III week or quarter without a scenario throws (M11.3)', () => {
    const first = actFirstQuarter(3)
    for (let q = first; q <= actLastQuarter(3); q++) {
      expect(() => marketWeek(q, 0)).toThrow(/Act III.*scenario/)
      expect(() => previousMarketWeek(q, 3)).toThrow(/Act III.*scenario/)
    }
    // The first Act III quarter's week 0 looks back at Act II's last quarter, which is fine.
    expect(() => previousMarketWeek(first, 0)).not.toThrow()
    const s = act3WithoutScenario()
    expect(scenarioOf(s)).toBeUndefined()
    expect(() => currentMarket(s)).toThrow(/Act III.*scenario/)
    expect(() => advance(ok(s, { type: 'END_PLAN' }))).toThrow()
  })

  it('quarters 0–39 of the timeline are exactly what they were: the labels and 13 weeks each', () => {
    const labels: string[] = []
    for (let y = 2017, q = 1; labels.length < 40; q = q === 4 ? 1 : q + 1) {
      labels.push(`${y}Q${q}`)
      if (q === 4) y++
    }
    expect(CONTENT.quarters.slice(0, 40)).toEqual(labels)
    for (let q = 0; q < 40; q++) expect(CONTENT.market[q]).toHaveLength(13)
    // The shared market ends at 2026Q4: Act III's prices live only in the scenarios.
    expect(CONTENT.market).toHaveLength(40)
    expect(CONTENT.acts.filter((a) => a.act !== 3 && a.act !== 0)).toEqual([
      { act: 1, firstQuarter: 0, lastQuarter: 22 },
      { act: 2, firstQuarter: 23, lastQuarter: 39 },
    ])
  })
})
