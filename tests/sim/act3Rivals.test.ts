// M11.5b: the five rivals and the league in Act III, on the drawn scenario; each rival's fate is part of
// the reveal (act3End) and never shown during play.
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  act2Quarter,
  actFirstQuarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { d15Items, rivalFates } from '../../src/content/rivalsHidden.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  activeRivals,
  leagueTable,
  rivalMoves,
} from '../../src/sim/systems/rivals.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

const FIRST = actFirstQuarter(3)
const LAST = actLastQuarter(3)
const IDS = ['core_scientific', 'iren', 'hut8', 'cipher', 'coreweave']

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

describe('the delivered rivals data', () => {
  it('has the same five rivals as Act II, in the same order, in all four scenarios', () => {
    expect(CONTENT.act2Rivals.map((r) => r.id)).toEqual(IDS)
    for (const id of SCENARIO_IDS)
      expect(CONTENT.act3Rivals[id].map((r) => r.id)).toEqual(IDS)
  })

  it('has 16 quarters matching the Act III timeline for every series, and no negative MW', () => {
    const labels = CONTENT.quarters.slice(FIRST, LAST + 1)
    for (const id of SCENARIO_IDS)
      for (const r of CONTENT.act3Rivals[id])
        for (const series of [
          r.mw_energized,
          r.mw_ai_contracted,
          r.revenue_usd_m_q,
          r.ebitda_usd_m_q,
          r.mcap_usd_m,
          r.debt_usd_m,
        ]) {
          expect(Object.keys(series)).toEqual(labels)
          if (series === r.mw_energized || series === r.mw_ai_contracted)
            for (const v of Object.values(series))
              expect(v).toBeGreaterThanOrEqual(0)
        }
  })

  it('carries each rival’s fate and D15 flag only in the hidden view, never in CONTENT', () => {
    for (const id of SCENARIO_IDS)
      for (const r of CONTENT.act3Rivals[id])
        expect(Object.keys(r).sort()).toEqual(
          [
            'debt_usd_m',
            'ebitda_usd_m_q',
            'id',
            'mcap_usd_m',
            'mw_ai_contracted',
            'mw_energized',
            'name',
            'revenue_usd_m_q',
          ].sort(),
        )
    for (const id of SCENARIO_IDS) expect(rivalFates(id)).toHaveLength(5)
  })
})

describe('the league in Act III', () => {
  it('ranks the player’s valuation against each rival’s market cap in the current quarter', () => {
    const s = toReport(act3ScenarioCompany('s2', 1))
    const rows = leagueTable(s, s.reports.length - 1)
    expect(rows.map((r) => r.id).sort()).toEqual([...IDS, 'you'].sort())
    const cs = CONTENT.act3Rivals.s2.find((r) => r.id === 'coreweave')!
    const row = rows.find((r) => r.id === 'coreweave')!
    expect(row.valueUsd).toBe(cs.mcap_usd_m['2027Q1'] * 1e6)
    // Sorted by value, rank 1 the most valuable.
    const valued = rows.filter((r) => r.rank !== null)
    for (let i = 1; i < valued.length; i++)
      expect(valued[i - 1].valueUsd!).toBeGreaterThanOrEqual(
        valued[i].valueUsd!,
      )
  })

  it('reads the drawn scenario’s numbers: another scenario gives different numbers for the same quarter', () => {
    const q = FIRST + 8
    const by = (id: (typeof SCENARIO_IDS)[number]) =>
      activeRivals(q, id).map((r) => r.valueUsd)
    const all = SCENARIO_IDS.map((id) => JSON.stringify(by(id)))
    expect(new Set(all).size).toBe(4)
    // and each is that scenario's own series for that quarter
    for (const id of SCENARIO_IDS)
      expect(by(id)).toEqual(
        CONTENT.act3Rivals[id].map(
          (r) => r.mcap_usd_m[CONTENT.quarters[q]] * 1e6,
        ),
      )
  })

  it('only the current quarter is read: no later key of any series is touched', () => {
    const q = FIRST + 3
    const label = CONTENT.quarters[q]
    const touched: string[] = []
    const rival = CONTENT.act3Rivals.s0[0]
    const watch = (o: Record<string, number>) =>
      new Proxy(o, {
        get(t, k) {
          if (typeof k === 'string') touched.push(k)
          return Reflect.get(t, k)
        },
      })
    const saved = {
      e: rival.mw_energized,
      a: rival.mw_ai_contracted,
      m: rival.mcap_usd_m,
    }
    rival.mw_energized = watch(rival.mw_energized)
    rival.mw_ai_contracted = watch(rival.mw_ai_contracted)
    rival.mcap_usd_m = watch(rival.mcap_usd_m)
    try {
      activeRivals(q, 's0')
    } finally {
      rival.mw_energized = saved.e
      rival.mw_ai_contracted = saved.a
      rival.mcap_usd_m = saved.m
    }
    expect(touched.length).toBeGreaterThan(0)
    for (const k of touched) expect(k <= label, `${k} > ${label}`).toBe(true)
  })

  it('without a scenario there are no Act III rivals; Act II’s league is unchanged', () => {
    expect(activeRivals(FIRST)).toEqual([])
    const q = actLastQuarter(2)
    expect(activeRivals(q).map((r) => r.id)).toEqual(IDS)
    expect(activeRivals(q)[0].valueUsd).toBe(
      act2Quarter(q) && CONTENT.act2Rivals[0].mcap_usd_m['2026Q3'] * 1e6,
    )
  })

  it('rival moves: Act II’s rule is scripted moves listed per rival; Act III’s file has none, so none appear', () => {
    for (let q = FIRST; q <= LAST; q++) expect(rivalMoves(q)).toEqual([])
  })
})

describe('the reveal carries each rival’s fate', () => {
  it('act3End has the five fates for the drawn scenario, and nothing shows them before', () => {
    const s0 = act3ScenarioCompany('s1', 7)
    let s = s0
    const seenFates: number[] = []
    while (s.phase !== 'chapter' && s.phase !== 'gameover') {
      s = toReport(s)
      if (s.phase === 'gameover') break
      seenFates.push(JSON.stringify(s).includes('force majeure') ? 1 : 0)
      const n = applyAction(s, { type: 'NEXT_QUARTER' })
      if (!n.ok) throw new Error(n.error.key)
      s = n.state
    }
    expect(s.phase).toBe('chapter')
    expect(s.act3End!.rivalFates.map((f) => f.rival)).toEqual(IDS)
    expect(s.act3End!.rivalFates).toEqual(
      rivalFates('s1').map(({ rival, name, fate }) => ({ rival, name, fate })),
    )
    // No state before the end mentioned a fate.
    expect(seenFates.every((x) => x === 0)).toBe(true)
  })
})

describe('the D15 release check', () => {
  it('lists exactly the two flagged fates: S1 Core Scientific and S1 CoreWeave', () => {
    const items = d15Items()
    expect(items.map((i) => `${i.scenario}:${i.rival}`)).toEqual([
      's1:core_scientific',
      's1:coreweave',
    ])
  })
})
