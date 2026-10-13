// @vitest-environment happy-dom
// M66.3 (doc 43 §0.23 items 2, 3 and 5): the orbit line on the shared report panel prints signed money ("+$26.1M"), not
// whole dollars; the Ventures page and its error say the Act V thing in Act V (and the old thing in Acts III-IV); the Halyard
// diligence line shows P(volume within 8 years) ≈ 0.30 from the file.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { applyAction } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import { SectionView } from '../../src/ui/screens/Sections.tsx'
import en from '../../src/i18n/en.json' with { type: 'json' }
import goldenF1 from '../golden/act4-f1-seed-1.json' with { type: 'json' }
import goldenV4 from '../golden/act5-v4-seed-1.json' with { type: 'json' }
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
const act = () => null
const noop = () => {}
const text = en as Record<string, string>

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

/** The orbit line of a report: "Orbit: blocks live ...". */
function orbitLine(state: GameState): string {
  const body = render(<ReportScreen state={state} act={act} onGameOver={noop} />).container.textContent ?? ''
  const m = /Orbit: blocks live[\s\S]*?valued at/.exec(body)
  expect(m, 'the orbit line is on the report').not.toBeNull()
  return m![0]
}

describe('the orbit line on the shared report panel (M66.3, item 2)', () => {
  it('Act V: "EBITDA +$11.3M" style, never whole dollars (the act5-v4 golden\'s last report, which has orbit earnings)', () => {
    const s = structuredClone(goldenV4) as unknown as GameState
    expect(s.reports.at(-1)?.orbitEbitdaUsd ?? 0).toBeGreaterThan(0)
    const line = orbitLine(s)
    expect(line).toMatch(/EBITDA [+−]?\$\d+(\.\d+)?[KMB]/)
    expect(line).not.toMatch(/\$\d{1,3}(,\d{3}){2,}/)
  })

  it('Act IV: the same panel, the same format (the act4-f1 golden\'s last report, which has orbit revenue)', () => {
    const s = structuredClone(goldenF1) as unknown as GameState
    expect(s.reports.at(-1)?.orbitRevenueUsd ?? 0).toBeGreaterThan(0)
    const line = orbitLine(s)
    expect(line).toMatch(/EBITDA [+−]?\$\d+(\.\d+)?[KMB]/)
    expect(line).not.toMatch(/\$\d{1,3}(,\d{3}){2,}/)
  })
})

describe('ventures copy (M66.3, items 3 and 5)', () => {
  it('Act V: the Ventures page says new ventures closed in 2035 and never "Acts III and IV"', () => {
    const plan = toAct5(act4Finished(), { vfuture: 'v2' })
    const body = render(<SectionView state={plan} act={act} section="ventures" />).container.textContent ?? ''
    expect(body).toContain(text['ui.ventures.intro_v'])
    expect(body).not.toContain('Acts III and IV')
    // the Halyard diligence line, from the file
    expect(body).toContain('P(volume within 8 years) ≈ 0.30')
  })

  it('Act V: joining a venture is refused with the Act V wording; the Act III-IV key is unchanged', () => {
    const plan = toAct5(act4Finished(), { vfuture: 'v2' })
    const r = applyAction(plan, { type: 'VENTURE_JOIN', venture: 'egs', stake: 0.1, offtake: 0, prepay: 0 } as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.key).toBe('error.venture_closed_v')
    expect(text['error.venture_closed_v']).toBe('New ventures closed at the end of 2035.')
    expect(text['error.venture_closed']).toBe('Energy ventures are offered in Acts III and IV.')
  })
})
