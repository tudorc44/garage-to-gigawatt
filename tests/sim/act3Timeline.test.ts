// Act III's timeline (M11.3): 16 quarters, 2027Q1–2030Q4, then the Act III chapter report. Plumbing only:
// no scenario events, rivals, renewals, density, nuclear, political capital, wildcards, scoring or
// reveal yet. This state is unreachable from play (see act3Helpers.ts).
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  actFirstQuarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import { chapterReport } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { ok } from './act2Helpers.ts'
import { rivalFates } from '../../src/content/rivalsHidden.ts'
import { signalsHidden } from '../../src/content/signalsHidden.ts'
import { act3ScenarioCompany } from './act3Helpers.ts'

/** Plays one quarter's live weeks (default answers to anything that fires) and stops at its report. */
function toReport(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

/** Plays every Act III quarter; returns the state at the chapter report and the quarters reported. */
function playAll(s: GameState) {
  const seen: string[] = []
  while (s.phase !== 'chapter' && s.phase !== 'gameover') {
    s = toReport(s)
    if (s.phase === 'gameover') break
    seen.push(s.reports.at(-1)!.quarter)
    s = ok(s, { type: 'NEXT_QUARTER' })
  }
  return { state: s, seen }
}

// (M27.3: Act IV's quarters follow on the timeline, so Act III's are 40–55)
const ALL = CONTENT.quarters.slice(40, 56)

describe('Act III runs its 16 quarters, then the chapter report', () => {
  it('is 2027Q1 → 2030Q4, unreachable from play (no code path but the test helpers sets act 3)', () => {
    expect(ALL).toHaveLength(16)
    expect(ALL[0]).toBe('2027Q1')
    expect(ALL.at(-1)).toBe('2030Q4')
    expect(actLastQuarter(3)).toBe(55)
    const s = act3ScenarioCompany('s0', 7)
    expect(s.act).toBe(3)
    expect(CONTENT.quarters[s.quarter]).toBe('2027Q1')
  })

  it.each(SCENARIO_IDS)(
    'scenario %s plays every quarter with a Plan phase and a report each, then reaches the chapter report',
    (id) => {
      const { state, seen } = playAll(act3ScenarioCompany(id, 7))
      expect(seen).toEqual(ALL)
      expect(state.phase).toBe('chapter')
      expect(state.act).toBe(3)
      expect(state.quarter).toBe(actLastQuarter(3))
      expect(state.reports).toHaveLength(16)
    },
  )

  it.each(SCENARIO_IDS)(
    'scenario %s ends with a complete act3End record (the reveal) in the chapter phase',
    (id) => {
      const start = act3ScenarioCompany(id, 7)
      // Read one indicator in the first quarter, so the record has a read to carry.
      const read = ok(start, {
        type: 'READ_SIGNAL',
        indicator: 'chip_lead_times',
      })
      const { state } = playAll(read)
      const h = signalsHidden(id)
      expect(state.phase).toBe('chapter')
      expect(state.act3End).toMatchObject({
        scenarioId: id,
        scenarioName: h.scenario_name,
        triggerQuarter: h.trigger.quarter,
        decoy: { indicator: h.decoy.indicator, quarters: h.decoy.quarters },
        signalReads: [{ quarter: '2027Q1', indicator: 'chip_lead_times' }],
        rivalFates: rivalFates(id).map(({ rival, name, fate }) => ({
          rival,
          name,
          fate,
        })),
      })
      // M14.4: the reading block, the trigger quarter's index and the two titles.
      expect(Object.keys(state.act3End!).sort()).toEqual(
        [
          'careerTitleId',
          'decoy',
          'moves',
          'trigger',
          'reading',
          'readingTitleId',
          'rivalFates',
          'scenarioId',
          'scenarioName',
          'signalReads',
          'triggerQ',
          'triggerQuarter',
        ].sort(),
      )
      expect(state.act3End!.triggerQ).toBe(
        CONTENT.quarters.indexOf(h.trigger.quarter) - actFirstQuarter(3),
      )
      expect(state.act3End!.scenarioName.length).toBeGreaterThan(0)
    },
  )

  it('the reveal exists only at the end: no act3End in any earlier quarter, in any other act', () => {
    const mid = toReport(act3ScenarioCompany('s0', 7))
    expect(mid.act3End).toBeUndefined()
    expect(act3ScenarioCompany('s0', 7).act3End).toBeUndefined()
  })

  it('nothing but the Act II game-over rules ends Act III early: a company in debt ends in game over', () => {
    const broke = { ...act3ScenarioCompany('s1', 7), cash: -2_000_000_000 }
    const { state, seen } = playAll(broke)
    expect(state.phase).toBe('gameover')
    expect(seen).toEqual([])
  })

  it('a game over ends Act III early with the reveal (M14.4: decision 2 confirmed), its reading counted to that quarter', () => {
    const broke = { ...act3ScenarioCompany('s1', 7), cash: -2_000_000_000 }
    const end = playAll(broke).state
    expect(end.phase).toBe('gameover')
    expect(end.act3End).toBeDefined()
    expect(end.act3End!.careerTitleId).toBe('bust')
    expect(
      end.act3End!.reading.perQuarter.every(
        (x) => x.q <= end.quarter - actFirstQuarter(3),
      ),
    ).toBe(true)
  })

  it('a solvent company is never ended early: it reaches 2030Q4 in every scenario', () => {
    for (const id of SCENARIO_IDS)
      expect(playAll(act3ScenarioCompany(id, 3)).state.phase).toBe('chapter')
  })

  it('Act II’s report fields are on in Act III (M11.4c), and the chapter-report selector does not throw', () => {
    const { state } = playAll(act3ScenarioCompany('s2', 7))
    const r = state.reports.at(-1)!
    expect(r.mwByUseKw).toBeDefined()
    expect(r.creditRating).toBeDefined()
    expect(() => chapterReport(state)).not.toThrow()
  })

  it('the scenario decides the outcome: the same company ends with different cash in different scenarios', () => {
    const ends = SCENARIO_IDS.map(
      (id) => playAll(act3ScenarioCompany(id, 7)).state.cash,
    )
    expect(new Set(ends).size).toBe(4)
  })
})
