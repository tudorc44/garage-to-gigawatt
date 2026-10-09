import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playFrom, playGame, replay } from '../../src/sim/replay.ts'
import { SAVE_VERSION, restoreSave } from '../../src/sim/save.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { newGame, toAct3, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  decodeSave,
  encodeSave,
  readSlot,
  writeSlot,
} from '../../src/platform/saves.ts'
import { BOTS } from '../../tools/bots.ts'

/** Plays on to the end of the current quarter (default answers to alerts). */
function finishQuarter(s: GameState): GameState {
  while (s.phase === 'live') {
    if (s.interrupt) {
      const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      s = r.ok ? r.state : s
      if (s.interrupt) s = { ...s, interrupt: null }
    } else s = advance(s)
  }
  return s
}

describe('saves (scope §2.13)', () => {
  it('a mid-quarter save, loaded, plays on exactly like the original', () => {
    const { state: end, log } = playGame(7, BOTS['raise-climb'])
    // A busy mid-live state: the bot's game stopped after its 200th week (2020Q4, mid-quarter).
    let weeks = 0
    const cut = log.findIndex((st) => st.type === 'ADVANCE' && ++weeks === 200)
    const s = replay(7, log.slice(0, cut + 1))
    expect(s.phase).toBe('live')
    expect(s.machines.length).toBeGreaterThan(0)
    const text = encodeSave(s)
    const loaded = decodeSave(text)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.state).toEqual(s)
    expect(finishQuarter(loaded.state)).toEqual(finishQuarter(s))
    // A whole finished game survives the round trip too.
    const whole = decodeSave(encodeSave(end))
    expect(whole.ok && whole.state).toEqual(end)
  })

  it('fills in fields added after the save was made', () => {
    const old = JSON.parse(JSON.stringify(newGame(3)))
    delete old.staff
    delete old.marketRead
    delete old.mergeChoice
    delete old.quarterStats.salariesUsd
    delete old.events.eligibleQuarters
    const r = restoreSave(old)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.staff).toEqual({})
    expect(r.state.marketRead).toBeNull()
    expect(r.state.mergeChoice).toBeNull()
    expect(r.state.quarterStats.salariesUsd).toBe(0)
    expect(r.state.events.eligibleQuarters).toBe(0)
  })

  it('refuses things that are not saves, with a reason', () => {
    expect(decodeSave('hello').ok).toBe(false)
    expect(decodeSave('G2G1.not-base64!').ok).toBe(false)
    const cut = encodeSave(newGame(1)).slice(0, 40)
    expect(decodeSave(cut).ok).toBe(false)
    const future = restoreSave({ ...newGame(1), version: SAVE_VERSION + 1 })
    expect(!future.ok && future.error.key).toBe('error.save_version')
    expect(restoreSave([1, 2]).ok).toBe(false)
    for (const version of [0, 1.5, '2', undefined])
      expect(restoreSave({ ...newGame(1), version }).ok).toBe(false)
  })

  it('refuses a save whose act does not fit its quarter', () => {
    expect(restoreSave({ ...newGame(1), act: 3 }).ok).toBe(false)
    expect(restoreSave({ ...newGame(1), act: undefined }).ok).toBe(false)
    // Act II starts at the act boundary (2022Q3, after the Merge); an Act II save can't be earlier.
    expect(restoreSave({ ...newGame(1), act: 2, quarter: 5 }).ok).toBe(false)
    expect(restoreSave({ ...newGame(1), act: 2, quarter: 22 }).ok).toBe(true)
    expect(restoreSave({ ...newGame(1), act: 2, quarter: 23 }).ok).toBe(true)
    // Act I ends at 2022Q3.
    expect(restoreSave({ ...newGame(1), act: 1, quarter: 23 }).ok).toBe(false)
  })

  it('slots fail softly where there is no browser storage', () => {
    expect(writeSlot('manual', newGame(1))).toBe(false)
    expect(readSlot('manual')).toBeNull()
  })
})

// Real version-1 saves, made by the Act I build before the act field existed (27 Sep 2026,
// seed 7, raise-climb bot): a Plan phase, a live quarter at week 5, the Merge decision, and a
// finished game (phase "ended", made with the build of commit cb475bd).
// They must keep loading in every later build.
const V1_SAVES = [
  'v1-plan-2021Q2',
  'v1-live-2020Q4',
  'v1-merge-2022Q3',
  'v1-ended-2022Q3',
] as const
/**
 * Fields the game gained after the version-1 saves were captured, as paths (`*` = every item),
 * with the starting value a loaded save must get for them.
 */
const ADDED_SINCE_V1: Record<string, unknown> = {
  hosting: [],
  'quarterStats.hostingFeesUsd': 0,
  'reports.*.hostingFeesUsd': 0,
  'quarterStats.reservationUsd': 0,
  'reports.*.reservationUsd': 0,
  'quarterStats.aiRevenueUsd': 0,
  'quarterStats.aiCostUsd': 0,
  'quarterStats.lateDamagesUsd': 0,
  'reports.*.aiRevenueUsd': 0,
  'reports.*.aiCostUsd': 0,
  'reports.*.lateDamagesUsd': 0,
  projects: [],
  projectEvents: [],
  facilities: [],
  creditRating: null,
  firstAiDealQuarter: null,
  act2Entry: null,
  bridgeLoan: null,
  preset: false,
  spotShock: null,
  'events.creditNotch': null,
  'events.valuationMult': null,
  'events.ebitdaMult': null,
  'events.spreadAddBps': 0,
  'events.aiLabRevenueMult': 1,
  'events.extraOffers': null,
}

/** Additions whose value depends on the save (M33.1's site numbers, given on load): a check, not a fixed value. */
const ADDED_CHECKS: Record<string, (v: unknown) => boolean> = {
  'sites.*.serial': (v) => Number.isInteger(v) && (v as number) >= 1,
  siteSerials: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
}

/**
 * Checks that `actual` keeps every value of `expected`, recursively, and that anything extra is
 * a known addition (ADDED_SINCE_V1) with its starting value. Records the extra paths in `added`.
 */
function expectKeeps(
  actual: unknown,
  expected: unknown,
  path: string,
  added: string[],
): void {
  const isObj = (x: unknown): x is Record<string, unknown> =>
    typeof x === 'object' && x !== null && !Array.isArray(x)
  if (Array.isArray(expected) && Array.isArray(actual)) {
    expect(actual.length).toBe(expected.length)
    expected.forEach((e, i) => expectKeeps(actual[i], e, `${path}.*`, added))
    return
  }
  if (isObj(expected) && isObj(actual)) {
    for (const key of Object.keys(actual)) {
      const p = path ? `${path}.${key}` : key
      if (key in expected) expectKeeps(actual[key], expected[key], p, added)
      else if (p in ADDED_CHECKS) {
        expect(ADDED_CHECKS[p](actual[key]), `${p} = ${JSON.stringify(actual[key])}`).toBe(true)
        added.push(p)
      } else {
        expect(ADDED_SINCE_V1, `unexpected new field ${p}`).toHaveProperty([p])
        expect(actual[key]).toEqual(ADDED_SINCE_V1[p])
        added.push(p)
      }
    }
    for (const key of Object.keys(expected))
      expect(actual).toHaveProperty([key])
    return
  }
  expect(actual, path).toEqual(expected)
}

const readV1 = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/saves/${name}.json`, import.meta.url),
      'utf8',
    ),
  )

describe('save format version 2: the act field (Alpha 0.2 §2.15)', () => {
  it('a new game is the current version (5 since Act IV, M27.2), in Act I', () => {
    expect(newGame(1).version).toBe(SAVE_VERSION)
    expect(SAVE_VERSION).toBe(5)
    expect(newGame(1).act).toBe(1)
  })

  it.each(V1_SAVES)(
    'migrates the version-1 save %s: version 5, Act I, nothing else changed',
    (name) => {
      const v1 = readV1(name)
      expect(v1.version).toBe(1)
      expect('act' in v1).toBe(false)
      const r = restoreSave(v1)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.state.version).toBe(5)
      expect(r.state.act).toBe(1)
      // Everything the save had stays as it was (a finished game's "ended" is now "chapter");
      // fields added to the game since are known additions with their starting values.
      const expected = { ...v1, version: 5, act: 1 } as Record<string, unknown>
      if (v1.phase === 'ended') expected.phase = 'chapter'
      const added: string[] = []
      expectKeeps(r.state, expected, '', added)
      expect(added).toContain('hosting')
    },
  )

  it('migrates a version-1 save exported as text (the G2G1. string) too', () => {
    const v1 = readV1('v1-plan-2021Q2')
    const text = 'G2G1.' + Buffer.from(JSON.stringify(v1)).toString('base64')
    const r = decodeSave(text)
    expect(r.ok && r.state.version).toBe(5)
    expect(r.ok && r.state.act).toBe(1)
  })

  it('migrates a version-2 save (Act I or Act II) to version 5 with nothing else changed (the prologue, Act III and Act IV steps)', () => {
    for (const s of [
      newGame(7),
      { ...newGame(7), act: 2 as const, quarter: 30 },
    ]) {
      const v2 = { ...structuredClone(s), version: 2 }
      const r = restoreSave(v2)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.state).toEqual({ ...s, version: 5 })
    }
  })

  it('migrates a version-3 save (Act I or II) to version 5 with nothing else changed (the Act III step, M10, then Act IV)', () => {
    for (const s of [
      newGame(7),
      { ...newGame(7), act: 2 as const, quarter: 30 },
    ]) {
      const v3 = { ...structuredClone(s), version: 3 }
      const r = restoreSave(v3)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.state).toEqual({ ...s, version: 5 })
    }
  })

  it('migrates a version-4 save (any act up to III) to version 5 with nothing else changed (the Act IV step, M27.2)', () => {
    for (const s of [
      newGame(7),
      { ...newGame(7), act: 2 as const, quarter: 30 },
      toAct3(newGame(7), { scenario: 's2' }),
    ]) {
      const v4 = { ...structuredClone(s), version: 4 }
      const r = restoreSave(v4)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.state).toEqual({ ...s, version: 5 })
    }
  })

  it('drops M10’s act3Stub key on load (it only ever existed in test-made saves), and keeps an Act III game’s scenario and reveal (M11.3)', () => {
    const old = {
      ...toAct3(newGame(7), { scenario: 's1' }),
      act3Stub: true,
    }
    const r = restoreSave(structuredClone(old))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect('act3Stub' in r.state).toBe(false)
    expect(r.state.scenarioId).toBe('s1')
    expect(r.state.act3SignalReads).toEqual([])
    // Act III's last quarter is 2030Q4: a save past it is refused.
    expect(restoreSave({ ...toAct3(newGame(7)), quarter: 56 }).ok).toBe(false)
    expect(restoreSave({ ...toAct3(newGame(7)), quarter: 55 }).ok).toBe(true)
  })

  it('accepts an act-0 (prologue) save only inside the prologue’s quarters', () => {
    const p = { ...newPrologueGame(7), quarter: -20 }
    expect(restoreSave(p).ok).toBe(true)
    expect(restoreSave({ ...p, quarter: 3 }).ok).toBe(false)
    expect(restoreSave({ ...p, quarter: -40 }).ok).toBe(false)
    expect(restoreSave({ ...newGame(7), quarter: -5 }).ok).toBe(false)
  })

  it('a migrated version-1 save plays on to the Merge', () => {
    const bot = BOTS['raise-climb']
    for (const name of V1_SAVES.filter((n) => n !== 'v1-ended-2022Q3')) {
      const r = restoreSave(readV1(name))
      if (!r.ok) throw new Error(name)
      let s = r.state
      while (s.phase !== 'merge') {
        expect(s.phase).not.toBe('gameover')
        if (s.phase === 'plan') {
          for (const a of bot.plan(s)) {
            const next = applyAction(s, a)
            if (next.ok) s = next.state
          }
          s = ok(applyAction(s, { type: 'END_PLAN' }))
        } else if (s.phase === 'live') {
          s = s.interrupt
            ? ok(
                applyAction(s, {
                  type: 'RESOLVE_INTERRUPT',
                  choice: defaultChoice(s),
                }),
              )
            : advance(s)
        } else s = ok(applyAction(s, { type: 'NEXT_QUARTER' }))
      }
      expect(s.quarter).toBe(22)
      expect(s.act).toBe(1)
      s = ok(applyAction(s, { type: 'MERGE_CHOOSE', choice: 'hold_and_wait' }))
      expect(s.phase).toBe('chapter')
    }
  })

  it('Act I → Act II: a finished version-1 game loads at the Act I chapter report and plays on to the end of Act II', () => {
    const r = restoreSave(readV1('v1-ended-2022Q3'))
    if (!r.ok) throw new Error('load')
    expect(r.state.phase).toBe('chapter')
    expect(r.state.act).toBe(1)
    expect(r.state.mergeChoice).toBe('hold_and_wait')
    const { state, log } = playFrom(r.state, BOTS['raise-climb'], {
      through: 2,
    })
    expect(log.slice(0, 2)).toEqual([
      { type: 'CONTINUE_TO_ACT_2' },
      { type: 'START_ACT_2' },
    ])
    expect(state.act).toBe(2)
    expect(state.phase).toBe('chapter')
    expect(state.reports.at(-1)!.quarter).toBe('2026Q4')
    // What carried over is still there: the machines and the founder's stake.
    expect(state.founderStake).toBe(r.state.founderStake)
    expect(state.machines.length).toBeGreaterThan(0)
  })

  it('Act I → Act II: a version-1 save at the Merge decision carries on into Act II', () => {
    const r = restoreSave(readV1('v1-merge-2022Q3'))
    if (!r.ok) throw new Error('load')
    const { state } = playFrom(r.state, BOTS['raise-climb'], { through: 2 })
    expect(state.act).toBe(2)
    expect(state.phase).toBe('chapter')
  })

  it('a save made at the Act II intro (the "Start of Act II" slot) loads and starts 2022Q4', () => {
    const r = restoreSave(readV1('v1-ended-2022Q3'))
    if (!r.ok) throw new Error('load')
    const intro = ok(applyAction(r.state, { type: 'CONTINUE_TO_ACT_2' }))
    const loaded = decodeSave(encodeSave(intro))
    expect(loaded.ok && loaded.state).toEqual(intro)
    if (!loaded.ok) return
    const q4 = ok(applyAction(loaded.state, { type: 'START_ACT_2' }))
    expect(q4.phase).toBe('plan')
    expect(q4.quarter).toBe(23)
  })

  it('a game played across the act boundary replays exactly from its seed and steps', () => {
    const { state, log } = playGame(3, BOTS['raise-climb'], { through: 2 })
    expect(state.act).toBe(2)
    expect(replay(3, log)).toEqual(state)
  })

  it('a version-2 save round-trips unchanged', () => {
    const s = restoreSave(readV1('v1-merge-2022Q3'))
    if (!s.ok) throw new Error('load')
    const again = decodeSave(encodeSave(s.state))
    expect(again.ok && again.state).toEqual(s.state)
  })
})

function ok(r: ReturnType<typeof applyAction>): GameState {
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
