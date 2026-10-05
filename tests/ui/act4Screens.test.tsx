// @vitest-environment happy-dom
// M27.6: every screen an Act IV game shows renders (the Plan screen and each section, the live quarter, the quarter
// report, the intro and the chapter stub), in every future, and none names its future.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { FUTURE_IDS } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playFrom } from '../../src/sim/replay.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { Act4Chapter, Act4Intro } from '../../src/ui/screens/Act4Entry.tsx'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import { SectionView, type Section } from '../../src/ui/screens/Sections.tsx'
import { act3Finished, act4Company } from '../sim/act4Helpers.ts'
import { Act3Chapter } from '../../src/ui/screens/Act3Entry.tsx'

afterEach(cleanup)
beforeAll(() => preloadAct3Panels(), 0)

const act = () => null
const noop = () => {}
const SECTIONS: Section[] = ['projects', 'contracts', 'government', 'fleet', 'capital', 'people', 'league', 'log']
/** The futures' working names (doc 33 §6.2): no screen during play may show them. */
const NAMES = /On Schedule|The Wall|Closed Shell|Cheap Ground/

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

describe('Act IV screens render (M27.6)', () => {
  it.each(FUTURE_IDS)('%s: Plan, every section, live, report, intro', (f) => {
    const plan = act4Company('s1', f)
    const bodies: string[] = []
    const r1 = render(<PlanScreen state={plan} act={act} />)
    bodies.push(r1.container.textContent ?? '')
    expect(r1.container.textContent).toContain('2031')
    cleanup()
    for (const section of SECTIONS) {
      const v = render(<SectionView state={plan} act={act} section={section} />)
      bodies.push(v.container.textContent ?? '')
      cleanup()
    }
    const live = { ...structuredClone(plan), phase: 'live' as const, week: 3 }
    bodies.push(render(<LiveScreen state={live} act={act} tick={noop} skip={noop} />).container.textContent ?? '')
    cleanup()
    const report = toReport(plan)
    expect(report.phase).toBe('report')
    const rr = render(<ReportScreen state={report} act={act} onGameOver={noop} />)
    expect(rr.container.textContent).toContain('Act IV')
    bodies.push(rr.container.textContent ?? '')
    cleanup()
    const intro = render(<Act4Intro state={plan} onEnter={noop} />)
    expect(intro.container.querySelector('[data-act4-intro]')).not.toBeNull()
    bodies.push(intro.container.textContent ?? '')
    for (const b of bodies) expect(b).not.toMatch(NAMES)
  })

  it('the Act III chapter report offers "Continue to Act IV" to a company that survived, when the app passes it', () => {
    const end = act3Finished('s0')
    expect(end.phase).toBe('chapter')
    let continued = false
    const v = render(<Act3Chapter state={end} onNew={noop} onContinueAct4={() => (continued = true)} />)
    const button = v.container.querySelector<HTMLButtonElement>('[data-continue-act4]')!
    expect(button).not.toBeNull()
    button.click()
    expect(continued).toBe(true)
    cleanup()
    // without the callback, the footer is as it was
    expect(render(<Act3Chapter state={end} onNew={noop} />).container.querySelector('[data-continue-act4]')).toBeNull()
  })

  it('the chapter stub shows the end record after 2035Q4', () => {
    const end = playFrom(act4Company('s0', 'f2'), { plan: () => [] }, { through: 4 }).state
    const v = render(<Act4Chapter state={end} onNew={noop} />)
    expect(v.container.querySelector('[data-act4-chapter]')).not.toBeNull()
    expect(v.container.textContent).not.toMatch(NAMES)
  }, 0)
})
