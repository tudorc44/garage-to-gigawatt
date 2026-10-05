// @vitest-environment happy-dom
// M31.6 (doc 33 §17): A4-09, the Capital screen's Act IV block (the space-equity window, orbital loans, insurance, lunar
// funding); A4-10, the quarter report's orbit and Moon panel; the deal card's four ways to pay.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import type { GameState } from '../../src/sim/state.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import { startOrbitalBuilds } from '../../src/sim/systems/orbitLaunch.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { SectionView } from '../../src/ui/screens/Sections.tsx'
import { Act4ReportPanel } from '../../src/ui/screens/Act4Money.tsx'
import { act, orbitCompany, playQuarter } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
const noop = () => null

/** A block with a sovereign tenant on project debt, building; a task order on offer. */
function financed(): GameState {
  let s = orbitCompany('f1')
  s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
  orbitBlock(s, 'ob1')!.offers = [{ type: 'sovereign', price: 9e6, termQuarters: 20 }]
  s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 0 })
  s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
  s.act4Orbit!.licences[0].approvedQuarter = s.quarter
  s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
  return s
}

describe('Act IV money screens (M31.6)', () => {
  it('the deal card offers four ways to pay, each enabled or with its reason', () => {
    const s = financed()
    s.act4Orbit!.registry = 'neutral' // export credit needs the Accords registry
    const { container } = render(<SectionView state={s} act={noop} section="orbit" />)
    const options = [...container.querySelectorAll('[data-slot="capital"] option')]
    expect(options.map((o) => o.textContent)).toEqual(['Own cash', 'Export-credit loan', 'Project debt', 'Sovereign co-funding'])
    expect((options[1] as HTMLOptionElement).disabled).toBe(true)
    expect((options[2] as HTMLOptionElement).disabled).toBe(false)
  })

  it('A4-09: the window, the loans and the lunar task order on the Capital screen', () => {
    let s = financed()
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })
    startOrbitalBuilds(s)
    s.act4Moon = {
      claims: [], missions: [], disputes: [], offtakes: [], offers: [], megawattQuarter: null, alignedBloc: null,
      freezeUntil: null, planned: [], nextId: 1, taskOrderUsd: 9e7,
    }
    const { container } = render(<SectionView state={s} act={noop} section="capital" />)
    const block = container.querySelector('[data-capital-iv]')!.textContent!
    expect(block).toContain('The space-equity window is open')
    expect(block).toContain('Project debt')
    expect(block).toContain('Building: interest joins the loan')
    expect(block).toContain('An agency task order would pay $90.0M')
  })

  it('A4-10: the report’s orbit and Moon panel, only in Act IV with a programme', () => {
    let s = orbitCompany('f1')
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    Object.assign(s.act4Orbit!.blocks[0], { stage: 'live', liveQuarter: s.quarter, retireQuarter: s.quarter + 20, tenant: 'spot', capexSpentUsd: 2e8 })
    s = playQuarter(s)
    const { container } = render(<Act4ReportPanel state={s} />)
    expect(container.querySelector('[data-report-iv]')!.textContent).toContain('Orbit: blocks live 1')
    cleanup()
    const none = playQuarter(orbitCompany('f1'))
    expect(render(<Act4ReportPanel state={none} />).container.querySelector('[data-report-iv]')).toBeNull()
  })
})
