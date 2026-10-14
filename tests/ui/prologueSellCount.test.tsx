// @vitest-environment happy-dom
// Fix (13 Oct 2026): on the Prologue's Rig screen, Sell sold the whole stack. A stack of several now opens a count picker
// (default 1; quick picks 1, 10, half and all; a number field capped at the stack; the cash shown before Sell), and a stack
// of 1 still sells at once. The count control is shared with Act I's "Your machines" dialog (components/sellCount.tsx).
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'
import { cashChange, quickCounts } from '../../src/ui/components/sellCount.tsx'
import { fmt } from '../../src/ui/format.ts'
import { Machines } from '../../src/ui/screens/prologue/Machines.tsx'

afterEach(cleanup)

/** A Prologue game in 2012Q2 with the home rig built and `count` FPGA boards on it (one bought, the stack set to `count`). */
function withFpgas(count: number): GameState {
  const r = applyAction(newPrologueGame(3), { type: 'START_PROLOGUE' })
  if (!r.ok) throw new Error(r.error.key)
  const rig = applyAction({ ...r.state, quarter: quarterIndex('2012Q2')!, cash: 1e7 }, { type: 'P0_BUILD_HOME_RIG' })
  if (!rig.ok) throw new Error(rig.error.key)
  const site = rig.state.sites.at(-1)!.id
  const buy = applyAction(rig.state, { type: 'P0_BUY', model: 'fpga_board', condition: 'new', count: 1, siteId: site })
  if (!buy.ok) throw new Error(buy.error.key)
  const s = structuredClone(buy.state)
  const lot = s.machines.find((m) => m.model === 'fpga_board')!
  lot.count = count
  return s
}

/** The Rig screen on a mutable game: `act` applies the action and re-renders. */
function rig(initial: GameState) {
  let state = initial
  const view = render(<div />)
  const draw = () => view.rerender(<Machines state={state} act={act} tick={() => {}} skip={() => {}} onNew={() => {}} />)
  const act = (a: Action) => {
    const r = applyAction(state, a)
    if (!r.ok) return r.error
    state = r.state
    draw()
    return null
  }
  draw()
  return { view, get state() { return state } }
}

describe('Prologue: selling part of a stack', () => {
  it('327 FPGA boards, sell 100: 227 remain and the cash the picker showed is booked', () => {
    const start = withFpgas(327)
    const lot = start.machines.find((m) => m.model === 'fpga_board')!
    const expected = cashChange(start, { type: 'SELL_MACHINES', lotId: lot.id, count: 100 })!
    expect(expected).toBeGreaterThan(0)
    const g = rig(start)
    const { container, getByText } = g.view
    fireEvent.click(getByText('Sell…'))
    const input = container.querySelector('[data-sell-count] input') as HTMLInputElement
    expect(input.value).toBe('1') // the default count
    fireEvent.input(input, { target: { value: '100' } })
    // the cash shows before confirming, on the Sell button
    const button = [...container.querySelectorAll('[data-sell-count] button.btn')].find((b) => /^Sell 100 for/.test(b.textContent ?? ''))!
    expect(button.textContent).toBe(`Sell 100 for ${fmt.money(expected)}`)
    const cash0 = g.state.cash
    fireEvent.click(button)
    const after = g.state.machines.find((m) => m.model === 'fpga_board')!
    expect(after.count).toBe(227)
    expect(g.state.cash - cash0).toBeCloseTo(expected, 2)
    // the picker closes, and the stack's card shows 227
    expect(container.querySelector('[data-sell-count]')).toBeNull()
    expect(container.textContent).toContain('227')
  })

  it('quick picks: 1, 10, half and all; the field is capped at the stack', () => {
    expect(quickCounts(327).map((p) => p.n)).toEqual([1, 10, 163, 327])
    expect(quickCounts(10).map((p) => `${p.key}${p.n}`)).toEqual(['one1', 'half5', 'all10'])
    expect(quickCounts(2).map((p) => `${p.key}${p.n}`)).toEqual(['one1', 'all2'])
    const g = rig(withFpgas(327))
    const { container, getByText } = g.view
    fireEvent.click(getByText('Sell…'))
    fireEvent.click(getByText('Half (163)'))
    const input = container.querySelector('[data-sell-count] input') as HTMLInputElement
    expect(input.value).toBe('163')
    fireEvent.click(getByText('All (327)'))
    expect(input.value).toBe('327')
    fireEvent.input(input, { target: { value: '9999' } })
    expect(input.value).toBe('327')
  })

  it('a stack of 1 sells at once, with no picker', () => {
    const start = withFpgas(1)
    const g = rig(start)
    const { container } = g.view
    // (the FPGA board's own row; the starting PC has a row of its own)
    const row = [...container.querySelectorAll('.fleet-row')].find((r) => /FPGA/.test(r.textContent ?? ''))!
    expect(row.textContent).not.toContain('Sell…')
    const sell = [...row.querySelectorAll('button.btn')].find((b) => /^Sell \(/.test(b.textContent ?? ''))!
    fireEvent.click(sell)
    expect(g.state.machines.find((m) => m.model === 'fpga_board')).toBeUndefined()
    expect(g.state.cash).toBeGreaterThan(start.cash)
  })
})
