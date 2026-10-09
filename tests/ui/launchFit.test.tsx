// @vitest-environment happy-dom
// Launch slot clarity (design thread, 9 Oct 2026; presentation only). A block no launch in the window can take says
// why (its mass, the most free in one quarter) and which size would fit, from when; quarters left out for slots are
// counted, not silently dropped; Open a block shows the mass and warns when it's too heavy for every launch.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ORBIT } from '../../src/content/orbitContent.ts'
import { CONTENT } from '../../src/content/index.ts'
import type { GameState } from '../../src/sim/state.ts'
import { slotsTonnes } from '../../src/sim/systems/orbitLaunch.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { fmt } from '../../src/ui/format.ts'
import { SectionView } from '../../src/ui/screens/Sections.tsx'
import { act, orbitCompany } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)

const noop = () => null
const T_MW = 18 // Gen 31 in SSO (no shielding): satellites_iv.json
const board = (s: GameState) => render(<SectionView state={s} act={noop} section="orbit" />)

/** The booking window's quarters and their third-party slots (nothing else booked). */
function window(s: GameState) {
  const [lo, hi] = ORBIT.launch.lead_quarters
  return Array.from({ length: hi - lo + 1 }, (_, i) => s.quarter + lo + i).map((q) => ({
    q,
    slots: slotsTonnes(s, q),
  }))
}

describe('launch slot clarity', () => {
  it('nothing fits: the mass against the most free, and the largest size that fits and from when', () => {
    let s = orbitCompany('f1')
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 100, shell: 'sso', gen: 'gen31' })
    const w = window(s)
    const mass = 100 * T_MW
    expect(w.every((x) => x.slots < mass)).toBe(true)
    const { container } = board(s)
    const box = container.querySelector('[data-launch-nothing-fits]')!
    expect(box).not.toBeNull()
    expect(box.textContent).toContain(`it weighs ${mass.toLocaleString('en-US')} t`)
    const most = Math.max(...w.map((x) => x.slots))
    expect(box.textContent).toContain(`the most free in one quarter is ${Math.round(most).toLocaleString('en-US')} t`)
    // The hint: the largest listed size whose mass fits some quarter, and the earliest such quarter.
    const size = [...ORBIT.satellites.sizes_mw].sort((a, b) => b - a).find((mw) => mw * T_MW <= most)!
    const from = w.find((x) => x.slots >= size * T_MW)!.q
    expect(box.textContent).toContain(
      `A ${size} MW block would fit from ${fmt.quarter(CONTENT.quarters[from])}.`,
    )
  })

  it('some fit: the quarters left out for slots are counted under the options', () => {
    let s = orbitCompany('f1')
    for (let i = 0; i < 3; i++)
      s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    const q = s.quarter + ORBIT.launch.lead_quarters[0]
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: q })
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob2', provider: 'pallas', quarter: q })
    const { container } = board(s)
    const card = container.querySelector('[data-orbit-block="ob3"]')!
    expect(card.querySelector('[data-launch-unfit]')?.textContent).toBe("1 other quarter doesn't fit (180 t).")
  })

  it('Open a block shows the mass, and warns when no launch in the window can take it', () => {
    const s = orbitCompany('f1')
    const { container } = board(s)
    const form = container.querySelector('[data-orbit-open]')!
    expect(form.querySelector('[data-open-mass]')?.textContent).toBe('180 t')
    expect(form.querySelector('[data-open-too-heavy]')).toBeNull()
    const size = form.querySelectorAll('select')[1] as HTMLSelectElement
    fireEvent.change(size, { target: { value: '100' } })
    expect(form.querySelector('[data-open-mass]')?.textContent).toBe('1,800 t')
    expect(form.querySelector('[data-open-too-heavy]')?.textContent).toContain(
      'Too heavy for every launch in the window',
    )
    // Opening stays allowed, to plan ahead.
    expect((form.querySelector('.btn-primary') as HTMLButtonElement).disabled).toBe(false)
  })
})
