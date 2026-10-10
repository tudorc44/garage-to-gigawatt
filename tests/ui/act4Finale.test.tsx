// @vitest-environment happy-dom
// M32.3 (doc 33 §15.2, A4-12): the campaign finale. A career from the garage (Act I) through Act IV: a ledger row per act
// played from stored records, the career multiple on $10,000, the megawatt line, a frontier title and a 3-5 line
// epilogue; the chapter report's button opens it.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { playFrom } from '../../src/sim/replay.ts'
import { finaleView } from '../../src/sim/finaleViews.ts'
import { Act4Chapter } from '../../src/ui/screens/Act4Entry.tsx'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
const noop = () => {}

describe('the campaign finale (M32.3)', () => {
  const end = () => playFrom(act4Company('s0', 'f4'), { plan: () => [] }, { through: 4 }).state

  it('a garage career: a ledger row for each act, the multiple on $10,000, a ground-only epilogue', () => {
    const s = end()
    const v = finaleView(s)
    expect(v.start).toMatchObject({ kind: 'garage', wealthUsd: 10_000, kw: 5, year: 2017 })
    expect(v.rows.map((r) => r.act)).toEqual(['act1', 'act2', 'act3', 'act4'])
    expect(v.rows[2].mw).toBeGreaterThan(0)
    expect(v.careerMultiple).toBeCloseTo(v.netWorthUsd / 10_000)
    expect(v.epilogue[0]).toBe('finale.epilogue.ground')
    expect(v.epilogue).toContain('finale.epilogue.future.f4')
    expect(v.epilogue.length).toBeGreaterThanOrEqual(2)
    expect(v.epilogue.length).toBeLessThanOrEqual(5)
    expect(v.frontierTitleId).toBe('earthbound')
  })

  it('the chapter report’s button opens it', () => {
    const { container } = render(<Act4Chapter state={end()} onNew={noop} />)
    fireEvent.click(container.querySelector('[data-to-finale]')!)
    const f = container.querySelector('[data-act4-finale]')!
    expect(f.querySelectorAll('[data-finale-ledger] tbody tr')).toHaveLength(4)
    expect(f.textContent).toContain('It began in a garage in 2017')
    expect(f.textContent).toContain('You never left the ground. The ground was enough.')
  })
})
