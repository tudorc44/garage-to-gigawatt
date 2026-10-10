// @vitest-environment happy-dom
// M30.5 (doc 33 §17): Act IV's Moon screen (A4-06) and the prospect report (A4-07). The polar sites with yours, the
// rivals' and the blocs' claims; a programme card per site; disputes (also on the Plan screen); offtake; the "after 2035"
// panel; the report modal. No screen names the future or the lunar grade.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import type { GameState } from '../../src/sim/state.ts'
import { claimOf, startQuarterMoonClaims } from '../../src/sim/systems/moon.ts'
import { startQuarterMoonOps } from '../../src/sim/systems/moonOps.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { Nav } from '../../src/ui/components/frame.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { SectionView } from '../../src/ui/screens/Sections.tsx'
import { act, orbitCompany } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)

const noop = () => null
const HIDDEN = /On Schedule|The Wall|Closed Shell|Cheap Ground|\brich\b|\bpatchy\b|\bdry\b/i

/** A company holding Malapert with a pilot running, a claim on Shackleton in dispute with the bloc, an offtake offer. */
function programme(): GameState {
  let s = orbitCompany('f1')
  s.politicalCapital = 60
  s.quarter = CONTENT.quarters.indexOf('2031Q4')
  startQuarterMoonClaims(s)
  s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
  s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'shackleton_ridge' })
  const c = claimOf(s, 'malapert_massif')!
  c.status = 'held'
  c.landedQuarter = s.quarter
  c.reports.push({ quarter: s.quarter, step: 'first', estimateT: 412345, lowT: 200000, highT: 850000 })
  c.solar = { kwe: 100, readyQuarter: s.quarter }
  c.pilot = { decidedQuarter: 0, readyQuarter: s.quarter, capexUsd: 6e8, availability: 0.94, maintained: false, runQuarters: 1, processedT: 3.2 }
  startQuarterMoonOps(s)
  return s
}

describe('Act IV Moon screen (M30.5)', () => {
  it('A4-06: the 8 sites, your programme, the dispute, offtake and "after 2035"; no future, no grade', () => {
    const s = programme()
    const { container } = render(<SectionView state={s} act={noop} section="moon" />)
    const text = container.textContent ?? ''
    expect(container.querySelectorAll('[data-moon-sites] tbody tr')).toHaveLength(8)
    expect(text).toContain('(also claimed by Accords bloc)')
    expect(container.querySelector('[data-moon-site="malapert_massif"]')?.textContent).toContain('412,345 t')
    expect(container.querySelector('[data-moon-site="malapert_massif"]')?.textContent).toContain('3.2 t of water processed')
    expect(container.querySelector('[data-moon-disputes]')?.textContent).toContain('Accords bloc also claims the Shackleton')
    expect(container.querySelector('[data-moon-offtake]')?.textContent).toContain('t of water a year')
    expect(container.querySelector('[data-moon-after]')).not.toBeNull()
    expect(text).not.toMatch(HIDDEN)
  })

  it('A4-07: the prospect report modal lists the reports with their bands and category', () => {
    const s = programme()
    const { container, getAllByText } = render(<SectionView state={s} act={noop} section="moon" />)
    fireEvent.click(getAllByText(/Prospect reports \(1\)/)[0])
    const dialog = container.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Indicated')
    expect(dialog.textContent).toContain('200,000-850,000 t')
    expect(dialog.textContent).not.toMatch(HIDDEN)
  })

  it('the Plan screen shows a waiting dispute; the Moon nav item is Act IV only', () => {
    const plan = render(<PlanScreen state={programme()} act={noop} />)
    expect(plan.container.querySelector('[data-moon-disputes]')).not.toBeNull()
    cleanup()
    expect(render(<Nav seed={1} plan act={4} />).container.textContent).toContain('Moon')
    cleanup()
    expect(render(<Nav seed={1} plan act={3} />).container.textContent).not.toContain('Moon')
  })
})
