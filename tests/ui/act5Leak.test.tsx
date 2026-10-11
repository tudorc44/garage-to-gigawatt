// @vitest-environment happy-dom
// M51 (doc 43 §6.8, V-D29): Act V's leak guard. Every screen an Act V game shows during play (the Plan screen with its
// Signals panel and each section, a live quarter, a quarter report, the intro) renders in every future and names none
// of the reveal: no future's name, no decoy's name, no trigger title, not the words "decoy" or "false alarm". After
// 2040Q4 the chapter report reveals the future (Act5Reveal.tsx, the one Act V screen allowed to).
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { V_FUTURE_IDS } from '../../src/content/index.ts'
import { signalsHiddenV } from '../../src/content/signalsHiddenV.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { Act5Chapter, Act5Intro } from '../../src/ui/screens/Act5Entry.tsx'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import { SectionView, type Section } from '../../src/ui/screens/Sections.tsx'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(() => preloadAct3Panels(), 0)

const act = () => null
const noop = () => {}
const SECTIONS: Section[] = ['projects', 'contracts', 'government', 'fleet', 'capital', 'people', 'league', 'log']

/** Every future's name, decoy name and trigger title, from the hidden files, plus the reveal's own words. */
const words = V_FUTURE_IDS.flatMap((v) => {
  const h = signalsHiddenV(v)
  return [h.future_name, h.decoy.name, h.trigger.title]
})
const LEAK = new RegExp([...new Set(words)].map((w) => w.replace(/[.*+?^${}()|[\]\\$]/g, '\\$&')).join('|') + '|decoy|false alarm', 'i')

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

function toReport(s: GameState): GameState {
  const step = (a: Parameters<typeof applyAction>[1]) => {
    const r = applyAction(s, a)
    if (!r.ok) throw new Error(r.error.key)
    s = r.state
  }
  step({ type: 'END_PLAN' })
  while (s.phase === 'live')
    if (s.interrupt) step({ type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
    else s = advance(s)
  return s
}

describe('Act V’s leak guard (M51)', () => {
  it.each(V_FUTURE_IDS)('%s: Plan (with Signals and a read), every section, live, report, intro: no reveal', (v) => {
    let plan = toAct5(act4Finished(), { vfuture: v })
    const read = applyAction(plan, { type: 'READ_SIGNAL_V', indicator: 'firm_buildout' })
    expect(read.ok).toBe(true)
    if (read.ok) plan = read.state
    const bodies: string[] = []
    const r1 = render(<PlanScreen state={plan} act={act} />)
    expect(r1.container.textContent).toContain('Grid Queue')
    bodies.push(r1.container.textContent ?? '')
    cleanup()
    for (const section of SECTIONS) {
      bodies.push(render(<SectionView state={plan} act={act} section={section} />).container.textContent ?? '')
      cleanup()
    }
    const live = { ...structuredClone(plan), phase: 'live' as const, week: 3 }
    bodies.push(render(<LiveScreen state={live} act={act} tick={noop} skip={noop} />).container.textContent ?? '')
    cleanup()
    const report = toReport(plan)
    bodies.push(render(<ReportScreen state={report} act={act} onGameOver={noop} />).container.textContent ?? '')
    cleanup()
    bodies.push(render(<Act5Intro state={plan} onEnter={noop} />).container.textContent ?? '')
    for (const b of bodies) expect(b).not.toMatch(LEAK)
  })

  it('after 2040Q4 the chapter report reveals the future, its turn and its decoy, and the reading score', () => {
    const end = playFrom(toAct5(act4Finished(), { vfuture: 'v3' }), { plan: () => [] }, { through: 5 }).state
    const v = render(<Act5Chapter state={end} onNew={noop} />)
    const h = signalsHiddenV('v3')
    expect(v.container.querySelector('[data-reveal-future]')!.textContent).toContain(h.future_name)
    expect(v.container.querySelector('[data-reveal-future]')!.textContent).toContain(h.trigger.title)
    expect(v.container.querySelector('[data-reveal-reading]')!.textContent).toMatch(/Your reading/)
  })
})
