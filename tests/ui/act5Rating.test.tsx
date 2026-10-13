// @vitest-environment happy-dom
// M66.2 (doc 43 §0.23 decision 1, §3.1, §11.4): the credit rating is reviewed at every Act V quarter end (it was skipped: the
// gate was isAct2RulesQuarter, which stops at Act IV, so Act V reports carried no rating and printed "BBB → null"). A debt-free
// company rates as the formula says; the report never prints "null".
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { BALANCE } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { leverageBand, ratingInputs } from '../../src/sim/systems/rating.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(() => preloadAct3Panels(), 0)
const act = () => null
const noop = () => {}

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

/** Plays one Act V quarter (default choices) and returns the state at its report. */
function toReport(s: GameState): GameState {
  const r = applyAction(s, { type: 'END_PLAN' })
  if (!r.ok) throw new Error(r.error.key)
  s = r.state
  while (s.phase === 'live') {
    if (s.interrupt) {
      const c = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      if (!c.ok) throw new Error(c.error.key)
      s = c.state
    } else s = advance(s)
  }
  return s
}

/** The same company with no debt anywhere (every loan, facility and orbital loan cleared). */
function debtFree(s: GameState): GameState {
  const c = structuredClone(s)
  c.equipmentLoan = null
  c.constructionLoans = []
  c.bridgeLoan = null
  c.cryptoLoan = null
  c.facilities = []
  if (c.act4Orbit) c.act4Orbit.debts = []
  c.ventures = (c.ventures ?? []).map((v) => ({ ...v, plantDebt: undefined }))
  return c
}

describe('the credit rating in Act V (M66.2)', () => {
  it('an Act V quarter end sets the rating and its reasons on the report and on the state', () => {
    const end = toReport(toAct5(act4Finished(), { vfuture: 'v1' }))
    const report = end.reports.at(-1)!
    expect(report.creditRating).toBeTruthy()
    expect(BALANCE.finance.ratingScale as readonly string[]).toContain(report.creditRating)
    expect(end.creditRating).toBe(report.creditRating)
    expect(report.ratingWhy).toBeTruthy()
    // and it is the formula's, on the same inputs
    expect(report.creditRating).toBe(ratingInputs(end, report).rating)
  })

  it('a debt-free Act V company gets the formula\'s rating: no debt is the under-2x band', () => {
    const plan = debtFree(toAct5(act4Finished(), { vfuture: 'v2' }))
    expect(debtUsd(plan)).toBe(0)
    const end = toReport(plan)
    const report = end.reports.at(-1)!
    const inputs = ratingInputs(end, report)
    expect(inputs.band).toBe('lt2')
    expect(leverageBand(0, 0)).toBe('lt2')
    expect(report.creditRating).toBe(inputs.rating)
    expect(report.creditRating).not.toBeNull()
  })

  it('the report row never contains "null", and shows the unrated text for a company that has no rating', () => {
    const end = toReport(toAct5(act4Finished(), { vfuture: 'v3' }))
    const withRating = render(<ReportScreen state={end} act={act} onGameOver={noop} />).container.textContent ?? ''
    expect(withRating).not.toMatch(/null/)
    cleanup()
    // the old failure: the previous quarter had a rating, this one none
    const unrated = structuredClone(end)
    unrated.reports.at(-1)!.creditRating = undefined
    unrated.creditRating = null
    const text = render(<ReportScreen state={unrated} act={act} onGameOver={noop} />).container.textContent ?? ''
    expect(text).not.toMatch(/null/)
    expect(text).toContain((en as Record<string, string>)['ui.report.a2_rating_none'])
  })
})
