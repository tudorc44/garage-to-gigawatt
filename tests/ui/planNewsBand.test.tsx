// @vitest-environment happy-dom
// M68.1 (doc 43 §0.25 item 4): the news band at the foot of the Plan screen shows the current quarter's own line in
// Acts III-V and never text from an earlier act.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { act3ScenarioCompany } from '../sim/act3Helpers.ts'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(() => preloadAct3Panels(), 0)
const act = () => null

const band = (s: GameState) =>
  render(<PlanScreen state={s} act={act} />).container.querySelector('.panel.news .news-text')!.textContent ?? ''
const at = (s: GameState, quarter: string): GameState => {
  const c = structuredClone(s)
  c.quarter = CONTENT.quarters.indexOf(quarter)
  return c
}

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

describe('the Plan screen news band in Acts III-V', () => {
  it('Act III: the quarter\'s shared card, or nothing; never an Act I line', () => {
    const s = act3ScenarioCompany('s0')
    expect(band(at(s, '2027Q3'))).toBe('Nuclear Offer')
    cleanup()
    expect(band(at(s, '2027Q4'))).toBe('')
  })

  it('Act IV: the quarter\'s shared card, or nothing', () => {
    const s = act4Company('s0', 'f1')
    expect(band(at(s, '2031Q3'))).toBe('The Space Act Applies')
    cleanup()
    expect(band(at(s, '2031Q2'))).toBe('')
  })

  it('Act V: the first Signals headline of the quarter, or nothing', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v4' })
    s.quarter = actFirstQuarter(5) + 6
    expect(band(s)).toBe('Three utilities file for emergency capacity after a record heat wave.')
    cleanup()
    expect(band(toAct5(act4Finished(), { vfuture: 'v1' }))).toBe('')
  })
})
