// M17.0 (DT answer 12): the structural leak check. No view object the UI receives carries a card's role, the
// scenario or a scenario phase: every one-argument view (selectors.ts, projectViews.ts, capitalViews.ts) is
// called on real Act III states played to 2028Q2 in each scenario (Plan phase, and with an Act III card on
// screen), and walked for keys named role, scenario, scenarioId or scenarioPhase, and for a key "phase"
// holding a scenario phase. Log lines are walked the same way. The word checks stay in act3Leak.test.tsx.
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  type ScenarioId,
} from '../../src/content/index.ts'
import { act3CardEngineId } from '../../src/content/act3Cards.ts'
import * as capitalViews from '../../src/sim/capitalViews.ts'
import * as projectViews from '../../src/sim/projectViews.ts'
import { applyStep } from '../../src/sim/replay.ts'
import * as selectors from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'
import { BOTS } from '../../tools/bots.ts'

/** The scenario files' phase names (the hidden column), which no view may hold. */
const PHASES = new Set(
  SCENARIO_IDS.flatMap((id) =>
    CONTENT.act3Scenarios[id].quarterly.map((r) => String(r.phase)),
  ),
)
const BANNED = new Set(['role', 'scenario', 'scenarioId', 'scenarioPhase'])

/** Every path in `v` whose key is banned, or a "phase" key holding a scenario phase. */
function leaks(v: unknown, path = '', seen = new Set<unknown>()): string[] {
  if (!v || typeof v !== 'object' || seen.has(v)) return []
  seen.add(v)
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => [
    ...(BANNED.has(k) ? [`${path}.${k}`] : []),
    ...(k === 'phase' && PHASES.has(String(x)) ? [`${path}.phase=${x}`] : []),
    ...leaks(x, `${path}.${k}`, seen),
  ])
}

/** A Growth quick start on `id`, played by its bot to the Plan phase of 2028Q2. */
async function played(id: ScenarioId): Promise<GameState> {
  let s = toAct3(await quickStartCompany('growth'), { scenario: id, forced: true })
  const bot = BOTS['sign-then-raise']
  const stop = CONTENT.quarters.indexOf('2028Q2')
  while (!(s.quarter === stop && s.phase === 'plan') && s.phase !== 'gameover') {
    if (s.phase === 'plan') {
      for (const a of bot.plan(s)) s = applyStep(s, a)
      s = applyStep(s, { type: 'END_PLAN' })
    } else if (s.phase === 'live')
      s = applyStep(
        s,
        s.interrupt
          ? { type: 'RESOLVE_INTERRUPT', choice: bot.answer?.(s) ?? defaultChoice(s) }
          : { type: 'ADVANCE' },
      )
    else s = applyStep(s, { type: 'NEXT_QUARTER' })
  }
  return s
}

/** Every one-argument view, called on `s` (a view that throws for this state is skipped). */
function allViews(s: GameState): [string, unknown][] {
  const mods = { selectors, projectViews, capitalViews } as Record<
    string,
    Record<string, unknown>
  >
  return Object.entries(mods).flatMap(([m, mod]) =>
    Object.entries(mod).flatMap(([name, f]) => {
      if (typeof f !== 'function' || f.length !== 1) return []
      try {
        return [[`${m}.${name}`, (f as (x: GameState) => unknown)(s)] as [string, unknown]]
      } catch {
        return []
      }
    }),
  )
}

describe('no UI view carries a role, scenario or scenario phase (M17.0, DT answer 12)', () => {
  it('the walker finds a planted leak (self-check)', () => {
    expect(leaks({ a: [{ role: 'trigger' }], b: { scenarioId: 's1' } }, 'x')).toEqual(
      ['x.a.0.role', 'x.b.scenarioId'],
    )
    const phase = [...PHASES][0]
    expect(leaks({ c: { phase } }, 'x')).toEqual([`x.c.phase=${phase}`])
    expect(leaks({ phase: 'plan' }, 'x')).toEqual([]) // the game's own phase is fine
  })

  it.each(SCENARIO_IDS)('%s: the Plan phase, an Act III card on screen, and the log', async (id) => {
    const s = await played(id)
    expect(s.phase).toBe('plan')
    const found: string[] = []
    for (const [name, v] of allViews(s)) found.push(...leaks(v, name))
    // with a scenario card on screen (the card view, its blocked choices, the alerts)
    const live = structuredClone(s)
    live.phase = 'live'
    live.week = 2
    live.interrupt = {
      id: 'event',
      event: act3CardEngineId(`${id}_c1`),
      week: 1,
      coin: 'BTC',
      changePct: 0,
    }
    for (const [name, v] of allViews(live)) found.push(...leaks(v, `live:${name}`))
    found.push(...leaks(s.log, 'log'))
    expect(found).toEqual([])
    // the walk saw a good share of the views
    expect(allViews(s).length).toBeGreaterThan(40)
  }, 120_000)
})
