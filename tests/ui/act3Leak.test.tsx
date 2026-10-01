// @vitest-environment happy-dom
// M15.5: the leak guard and the D15 guard.
// - Every Act III play screen, rendered for a fixture state at 2028Q2 in each scenario, shows none of the
//   reveal: no scenario name, no trigger title, no decoy reason, and not the words "decoy" or "false alarm".
//   (The fixture has no played history: a trigger is also an event card the player sees when it fires, by
//   design, and the Log then lists it; the guard is about the reveal's text, not about that card.)
// - M16.0 (DT answer 1): the same with real played history to 2028Q2 (the trigger card may show under its
//   title; nothing else of the reveal may).
// - An event card flagged for the D15 review doesn't fire (M16.0, DT answer 4); if one ever showed, its text
//   would be withheld.
import { cleanup, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  type ScenarioId,
} from '../../src/content/index.ts'
import { act3CardEngineId } from '../../src/content/act3Cards.ts'
import { signalsHidden } from '../../src/content/signalsHidden.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { applyStep } from '../../src/sim/replay.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'
import { BOTS } from '../../tools/bots.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import { SectionView, type Section } from '../../src/ui/screens/Sections.tsx'
import { Act3Intro } from '../../src/ui/screens/Act3Preview.tsx'
import { act3ScenarioCompany } from '../sim/act3Helpers.ts'

const text = en as Record<string, string>
afterEach(cleanup)

const act = () => null
const noop = () => {}

/** An Act III company on `id` at 2028Q2, in `phase` (the report: one quarter's real report, relabelled). */
function at2028Q2(id: ScenarioId, phase: GameState['phase']): GameState {
  let s = act3ScenarioCompany(id, 1)
  if (phase === 'report') {
    // Play 2027Q1 (its only card is the shared "Open the Signals panel") to have a quarter report.
    const step = (a: Parameters<typeof applyAction>[1]) => {
      const r = applyAction(s, a)
      if (!r.ok) throw new Error(r.error.key)
      s = r.state
    }
    step({ type: 'END_PLAN' })
    while (s.phase === 'live')
      if (s.interrupt)
        step({ type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      else s = advance(s)
    s.reports.at(-1)!.quarter = '2028Q2'
  }
  s.quarter = CONTENT.quarters.indexOf('2028Q2')
  s.phase = phase
  s.week = phase === 'live' ? 3 : 0
  return s
}

/** Everything the reveal says, for every scenario: none of it may be on a play screen. */
const FORBIDDEN = SCENARIO_IDS.flatMap((id) => {
  const h = signalsHidden(id)
  return [h.scenario_name, h.trigger.title, h.decoy.reason, h.decoy.tell]
})

function expectNoLeak(where: string, body: string) {
  for (const bad of FORBIDDEN) expect(body, `${where}: ${bad}`).not.toContain(bad)
  expect(body, `${where}: "decoy"`).not.toMatch(/decoy/i)
  expect(body, `${where}: "false alarm"`).not.toMatch(/false alarm/i)
}

const SECTIONS: Section[] = [
  'projects',
  'contracts',
  'government',
  'fleet',
  'capital',
  'people',
  'league',
  'log',
]

describe('the leak guard: Act III play screens at 2028Q2 show nothing of the reveal', () => {
  it.each(SCENARIO_IDS)('%s', async (id) => {
    // Plan (with the Act III panels, loaded on demand: wait for them)
    const plan = render(<PlanScreen state={at2028Q2(id, 'plan')} act={act} />)
    await waitFor(() =>
      expect(plan.container.textContent).toContain(text['ui.act3.top.due']),
    )
    expectNoLeak(`${id} plan`, plan.container.textContent ?? '')
    plan.unmount()
    // every left-nav section
    for (const section of SECTIONS) {
      const v = render(
        <SectionView state={at2028Q2(id, 'plan')} act={act} section={section} />,
      )
      if (section === 'contracts')
        await waitFor(() =>
          expect(v.container.textContent).toContain('Every tenant contract'),
        )
      expectNoLeak(`${id} ${section}`, v.container.textContent ?? '')
      v.unmount()
    }
    // the live quarter
    const live = render(
      <LiveScreen state={at2028Q2(id, 'live')} act={act} tick={noop} skip={noop} />,
    )
    expectNoLeak(`${id} live`, live.container.textContent ?? '')
    live.unmount()
    // the quarter report
    const report = render(
      <ReportScreen
        state={at2028Q2(id, 'report')}
        act={act}
        onGameOver={noop}
      />,
    )
    expectNoLeak(`${id} report`, report.container.textContent ?? '')
    report.unmount()
    // the Act III intro
    const intro = render(
      <Act3Intro state={at2028Q2(id, 'plan')} onEnter={noop} />,
    )
    expectNoLeak(`${id} intro`, intro.container.textContent ?? '')
  }, 60_000)
})

/** A Growth quick-start company on `id`, played by its bot to the Plan phase of 2028Q2 (real history). */
async function playedTo2028Q2(id: ScenarioId): Promise<GameState> {
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

/**
 * M16.0 (DT answer 1): with played history, the trigger card (an event the player sees when it fires) may
 * show in the Log under its title; nothing else of the reveal may: no scenario name, no narrative, no decoy
 * reason or tell, not the words "decoy" or "false alarm".
 */
const FORBIDDEN_PLAYED = SCENARIO_IDS.flatMap((id) => {
  const h = signalsHidden(id)
  return [
    h.scenario_name,
    h.decoy.reason,
    h.decoy.tell,
    text[`act3.reveal.${id}.trigger`],
  ]
})

describe('the leak guard with played history (M16.0, DT answer 1)', () => {
  it.each(SCENARIO_IDS)('%s: played to 2028Q2, the Plan and every section show no reveal text', async (id) => {
    const s = await playedTo2028Q2(id)
    expect(s.phase).toBe('plan')
    const check = (where: string, body: string) => {
      for (const bad of FORBIDDEN_PLAYED)
        expect(body, `${id} ${where}: ${bad.slice(0, 40)}`).not.toContain(bad)
      expect(body, `${id} ${where}: "decoy"`).not.toMatch(/decoy/i)
      expect(body, `${id} ${where}: "false alarm"`).not.toMatch(/false alarm/i)
      // DT answer 1: no role tag and no word "trigger" outside the chapter report. (The other role tags,
      // signal / recovery / winner / intro / shared, are everyday words the game uses for other things.)
      expect(body, `${id} ${where}: "trigger"`).not.toMatch(/trigger/i)
      expect(body, `${id} ${where}: role tag`).not.toMatch(/aftermath|flavour/i)
    }
    const plan = render(<PlanScreen state={s} act={act} />)
    await waitFor(() =>
      expect(plan.container.textContent).toContain(text['ui.act3.top.due']),
    )
    check('plan', plan.container.textContent ?? '')
    plan.unmount()
    for (const section of SECTIONS) {
      const v = render(<SectionView state={s} act={act} section={section} />)
      check(section, v.container.textContent ?? '')
      v.unmount()
    }
  }, 120_000)
})

describe('the D15 guard', () => {
  it('a card flagged for the D15 review (and not cleared) does not fire (M16.0, DT answer 4)', () => {
    const id = act3CardEngineId('s1_c3')
    const card = CONTENT.events.byId[id] as {
      withheld?: boolean
      quarterIndex?: number
    }
    const queued = (flag: boolean) => {
      if (flag) card.withheld = true
      try {
        const s = act3ScenarioCompany('s1', 1)
        s.quarter = card.quarterIndex!
        const r = applyAction(s, { type: 'END_PLAN' })
        if (!r.ok) throw new Error(r.error.key)
        return r.state.events.queue.map((e) => e.id)
      } finally {
        delete card.withheld
      }
    }
    expect(queued(false)).toContain(id)
    expect(queued(true)).not.toContain(id)
  })

  it('an event card flagged for the D15 review (and not cleared) shows "Withheld pending review" in play (kept as a safety net)', () => {
    const id = act3CardEngineId('s1_c3')
    const card = CONTENT.events.byId[id] as { withheld?: boolean }
    expect(card.withheld).toBeUndefined() // nothing is flagged today
    card.withheld = true
    try {
      const s = at2028Q2('s1', 'live')
      s.quarter = CONTENT.quarters.indexOf('2028Q1')
      s.interrupt = { id: 'event', event: id, week: 1, coin: 'BTC', changePct: 0 }
      const v = render(<LiveScreen state={s} act={act} tick={noop} skip={noop} />)
      const body = v.container.textContent ?? ''
      expect(body).toContain(text['ui.event.withheld'])
      expect(body).not.toContain(text[`event.${id}.title`])
    } finally {
      delete card.withheld
    }
  })
})
