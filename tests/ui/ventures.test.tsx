// @vitest-environment happy-dom
// M36 (doc 38 §5): the Ventures page shows each developer's pitch, diligence's estimate once done, joins through the
// action, and offers a waiting cash call's answers. It never shows the hidden cost multiplier.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import { joinVenture } from '../../src/sim/systems/ventures.ts'
import { VenturesSection } from '../../src/ui/screens/Ventures.tsx'
import { act3ScenarioCompany } from '../sim/act3Helpers.ts'

afterEach(cleanup)

function company() {
  const s = act3ScenarioCompany('s0')
  s.cash = 5e9
  s.bandwidth = 9
  return s
}

describe('the Ventures page', () => {
  it('shows the pitches, runs diligence and joins with a stake', () => {
    const act = vi.fn<(a: Action) => null>(() => null)
    const { container } = render(<VenturesSection state={company()} act={act} />)
    const smr = container.querySelector('[data-venture-offer="smr"]')!
    expect(smr.textContent).toContain('$4,000/kW')
    expect(smr.querySelector('[data-venture-reference]')).toBeNull()
    fireEvent.click([...smr.querySelectorAll('button')].find((b) => /Diligence/.test(b.textContent!))!)
    expect(act).toHaveBeenCalledWith({ type: 'VENTURE_DILIGENCE', venture: 'smr' })
    const select = smr.querySelector('select')!
    fireEvent.change(select, { target: { value: '0.1' } })
    fireEvent.click([...smr.querySelectorAll('button')].find((b) => b.textContent === 'Join')!)
    expect(act).toHaveBeenCalledWith({ type: 'VENTURE_JOIN', venture: 'smr', stake: 0.1, offtake: 0, prepay: 0 })
  })

  it('after diligence, shows the reference-class estimate', () => {
    const s = company()
    s.ventureDiligence = ['smr']
    const { container } = render(<VenturesSection state={s} act={() => null} />)
    expect(container.querySelector('[data-venture-offer="smr"] [data-venture-reference]')!.textContent).toContain('$6,400/kW')
  })

  it('lists your venture with a waiting cash call and its answers, but never the hidden multiplier', () => {
    const s = company()
    const v = joinVenture(s, { type: 'egs', stake: 0.2, offtake: 0, prepay: 0 })
    v.m = 1.734
    v.call = { n: 1, dueUsd: 12_345_678, partnerShare: null, costShare: null }
    const act = vi.fn<(a: Action) => null>(() => null)
    const { container } = render(<VenturesSection state={s} act={act} />)
    const call = container.querySelector(`[data-venture-call="${v.id}"]`)!
    expect(call.textContent).toContain('$12.3M')
    fireEvent.click(screen.getByRole('button', { name: 'Dilute' }))
    expect(act).toHaveBeenCalledWith({ type: 'VENTURE_CALL', ventureId: v.id, choice: 'dilute' })
    expect(container.textContent).not.toMatch(/1\.73|173%/)
  })
})
