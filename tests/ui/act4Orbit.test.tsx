// @vitest-environment happy-dom
// M29.5 (doc 33 §17): Act IV's orbit screens. The Orbit board (A4-03) with a block in every stage (A4-05's deal card),
// the manifest (A4-04), licences and registry (A4-08), links; the exposure warning (A4-02) on the Plan screen; the orbit
// alerts' card in the live quarter; the Orbit nav item in Act IV only. No screen names the future or a block's true life.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import type { GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { Nav } from '../../src/ui/components/frame.tsx'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { SectionView } from '../../src/ui/screens/Sections.tsx'
import { act, orbitCompany } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)

const noop = () => null
const NAMES = /On Schedule|The Wall|Closed Shell|Cheap Ground|f[1-4]\b|retire/i

/** A company with five blocks: planning (with offers), building, awaiting launch, climbing and live. */
function fleet(): GameState {
  let s = orbitCompany('f2')
  for (let i = 0; i < 5; i++) s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: i % 2 ? 'cloud' : 'shell', mw: 5, shell: 'sso', gen: 'gen31' })
  s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob2', provider: 'pallas', quarter: s.quarter + 2 })
  const stages = ['building', 'awaiting_launch', 'climbing', 'live'] as const
  stages.forEach((stage, i) => {
    const b = s.act4Orbit!.blocks[i + 1]
    Object.assign(b, {
      stage,
      tenant: 'spot',
      capital: 'cash',
      capexSpentUsd: 1e8,
      buildDoneQuarter: s.quarter + 1,
      liveQuarter: stage === 'live' ? s.quarter : s.quarter + 2,
      retireQuarter: stage === 'live' ? s.quarter + 16 : null,
      telemetry: stage === 'live' ? [{ quarter: s.quarter - 1, failurePctYr: 9.1 }] : [],
      lastEbitdaUsd: stage === 'live' ? 4e6 : undefined,
      launch: b.launch ?? { provider: 'northgate', quarter: s.quarter + 1, priceUsdKg: 540, depositUsd: 7e6, slips: 0 },
    })
  })
  return s
}

describe('Act IV orbit screens (M29.5)', () => {
  it('the Orbit board renders every stage, the manifest, licences, registry and links, and names no future', () => {
    const s = fleet()
    const { container } = render(<SectionView state={s} act={noop} section="orbit" />)
    const text = container.textContent ?? ''
    expect(container.querySelector('[data-orbit-board]')).not.toBeNull()
    expect(container.querySelectorAll('[data-orbit-block]')).toHaveLength(5)
    for (const stage of ['Planning', 'Building', 'Waiting for launch', 'Climbing to orbit', 'Live'])
      expect(text).toContain(stage)
    expect(container.querySelector('[data-orbit-manifest]')).not.toBeNull()
    expect(container.querySelector('[data-orbit-licences]')).not.toBeNull()
    expect(container.querySelector('[data-orbit-links]')).not.toBeNull()
    expect(container.querySelector('[data-orbit-telemetry]')?.textContent).toContain('9.1%')
    expect(text).toContain('design life 5 years')
    expect(text).not.toMatch(NAMES)
  })

  it('A4-02: a launch with uninsured value over 15% of equity shows the warning on the Plan screen', () => {
    const s = fleet()
    s.reports.at(-1)!.valuationUsd = 1e10
    const r = render(<PlanScreen state={s} act={noop} />)
    expect(r.container.querySelector('[data-orbit-exposure]')).toBeNull() // ~$100M+ against a $10B company: under 15%
    cleanup()
    const big = fleet()
    big.reports.at(-1)!.valuationUsd = 3e8
    const r2 = render(<PlanScreen state={big} act={noop} />)
    expect(r2.container.querySelector('[data-orbit-exposure]')?.textContent).toContain('Launch exposure')
  })

  it('the orbit alerts’ card: a conjunction on a block, with its two choices and the default marked', () => {
    const s = { ...fleet(), phase: 'live' as const, week: 4 }
    s.interrupt = { id: 'orbit_conjunction', week: 4, coin: 'BTC', changePct: 0, orbitBlockId: 'ob5' }
    const { container } = render(<LiveScreen state={s} act={noop} tick={() => {}} skip={() => {}} />)
    const text = container.textContent ?? ''
    expect(text).toContain('Conjunction alert')
    expect(text).toContain('block 5')
    expect(container.querySelectorAll('.choice')).toHaveLength(2)
    expect(container.querySelector('.choice.default')?.textContent).toContain('Manoeuvre')
  })

  it('the Orbit nav item shows in Act IV only', () => {
    const four = render(<Nav seed={1} plan act={4} />).container.textContent
    cleanup()
    const three = render(<Nav seed={1} plan act={3} />).container.textContent
    expect(four).toContain('Orbit')
    expect(three).not.toContain('Orbit')
  })
})
