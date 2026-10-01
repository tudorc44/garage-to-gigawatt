// @vitest-environment happy-dom
// M18.1, M18.2: the Capital screen in Act III: the standby block (none → Arrange with its fee; held → status and
// Draw) and a corporate facility's Repay in the debt stack.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type QuarterReport } from '../../src/sim/state.ts'
import { drawCorporate } from '../../src/sim/systems/corporateDebt.ts'
import { StandbyPanel } from '../../src/ui/screens/Act3Capital.tsx'
import { CapitalAct2 } from '../../src/ui/screens/CapitalAct2.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)
const q = (label: string) => CONTENT.quarters.indexOf(label)
const act = () => vi.fn<(a: Action) => null>(() => null)

function co(): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = q('2027Q1')
  s.phase = 'plan'
  s.bandwidth = 6
  s.act3Renewals = []
  s.creditRating = 'BB'
  s.reports = [{ quarter: '2026Q4', valuationUsd: 1_000_000_000 } as QuarterReport]
  return s
}

describe('the standby block', () => {
  it('none: the terms and "Arrange ($2.0M)", which sends STANDBY_ARRANGE', () => {
    const a = act()
    const { container } = render(<StandbyPanel state={co()} act={a} />)
    expect(container.querySelector('[data-standby-status]')!.textContent).toBe('None arranged.')
    expect(container.textContent).toContain('$200.0M for 8 quarters at SOFR + 350 bp')
    const btn = [...container.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Arrange'))!
    expect(btn.textContent).toContain('Arrange ($2.0M)')
    fireEvent.click(btn)
    expect(a).toHaveBeenCalledWith({ type: 'STANDBY_ARRANGE' })
  })

  it('held, the next quarter: the status line and Draw with an amount in $M', () => {
    const r = applyAction(co(), { type: 'STANDBY_ARRANGE' })
    if (!r.ok) throw new Error(r.error.key)
    const s = r.state
    s.quarter = q('2027Q2')
    const a = act()
    const { container } = render(<StandbyPanel state={s} act={a} />)
    expect(container.querySelector('[data-standby-status]')!.textContent).toContain(
      'Available until 2029Q1: undrawn $200.0M, drawn $0',
    )
    fireEvent.input(container.querySelector('[data-standby-amount]')!, { target: { value: '25' } })
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Draw')!)
    expect(a).toHaveBeenCalledWith({ type: 'STANDBY_DRAW', amountUsd: 25_000_000 })
  })
})

describe('a corporate facility in the debt stack', () => {
  it('a "Corporate facility" row with its due quarter and Repay', () => {
    const s = co()
    drawCorporate(s, 20_000_000, -25)
    const a = act()
    const { container } = render(<CapitalAct2 state={s} act={a} />)
    expect(container.textContent).toContain('Corporate facility')
    fireEvent.click(container.querySelector(`[data-repay="${s.facilities[0].id}"]`)!)
    expect(a).toHaveBeenCalledWith({ type: 'REPAY_COMPANY_FACILITY', facilityId: s.facilities[0].id })
  })
})
