// @vitest-environment happy-dom
// M67.2 (doc 43 §0.24 item 1): the Plan screen's Signals panel shows this quarter's Act V headlines, headlines only.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { actFirstQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(() => preloadAct3Panels(), 0)
const act = () => null

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

/** The "Headline · Q3 2037" labels in a panel (the panel's tip also uses the .signal class, so count labels). */
const headlineLabels = (panel: Element) => [...panel.querySelectorAll('.label')].filter((e) => /^Headline/.test(e.textContent ?? ''))

describe('Act V headlines in the Signals panel', () => {
  it('V4 2037Q3: the capacity filing shows under a "Headline" label; the sharp notes and the next quarter\'s lines do not', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v4' })
    s.quarter = actFirstQuarter(5) + 6
    const panel = render(<PlanScreen state={s} act={act} />).container.querySelector('.panel.signals')!
    const text = panel.textContent ?? ''
    expect(text).toContain('Three utilities file for emergency capacity after a record heat wave.')
    expect(text).toContain('Headline')
    expect(text).not.toContain('The capacity auction clears at the cap') // 2037Q4's line
    expect(headlineLabels(panel).length).toBe(2)
  })

  it('2036Q1 has no headline: the panel shows none', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    const panel = render(<PlanScreen state={s} act={act} />).container.querySelector('.panel.signals')!
    expect(headlineLabels(panel).length).toBe(0)
  })
})
