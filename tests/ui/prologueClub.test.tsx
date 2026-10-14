// @vitest-environment happy-dom
// M70.5 (doc 51 v1.2 §4): the club's panel in Ventures: the offer in 2013Q1 (stake, keys, hosting, Join), the members and their
// shares once in, the GPU coin and the ending choices, and the chapter report's club line.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'
import { Chapter } from '../../src/ui/screens/prologue/End.tsx'
import { Ventures } from '../../src/ui/screens/prologue/Ventures.tsx'

afterEach(cleanup)

function plan(quarter: string): GameState {
  const s = newPrologueGame(5)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.sites[0].tier = 'home_rig'
  s.siteSerials = { home_rig: 1 }
  s.machines = []
  s.cash = 20000
  s.bandwidth = 3
  return s
}

/** The screen on a mutable game: `act` applies the action and redraws. */
function screen(s: GameState) {
  const actions: Action[] = []
  let state = s
  const act = (a: Action) => {
    actions.push(a)
    const r = applyAction(state, a)
    if (!r.ok) return r.error
    state = r.state
    ui.rerender(<Ventures state={state} act={act} tick={() => {}} skip={() => {}} onNew={() => {}} />)
    return null
  }
  const ui = render(<Ventures state={state} act={act} tick={() => {}} skip={() => {}} onNew={() => {}} />)
  return { ui, actions, state: () => state }
}

describe('the club panel', () => {
  it('in 2013Q1 offers the club with a stake, keys and hosting, and joins with what was chosen', () => {
    const { ui, actions, state } = screen(plan('2013Q1'))
    fireEvent.change(ui.container.querySelector('[data-club-stake]')!, { target: { value: '3500' } })
    fireEvent.click(ui.container.querySelector('[data-club-keys="jun"]')!)
    fireEvent.click(ui.container.querySelector('[data-club-hosting="friends_flat"]')!)
    fireEvent.click(ui.container.querySelector('[data-club-join]')!)
    expect(actions).toContainEqual({ type: 'P0_JOIN_CLUB', stake: 3500, keys: 'jun', hosting: 'friends_flat' })
    expect(state().prologue!.club).toBeDefined()
    const members = ui.container.querySelector('[data-club-members]')!
    expect(members.textContent).toContain('Nell')
    expect(members.textContent).toContain('Teo')
    expect(members.textContent).toContain('Jun')
    expect(ui.container.querySelector('[data-club-join]')).toBeNull()
  })

  it('in another quarter says when the club forms, with no join button', () => {
    const { ui } = screen(plan('2012Q1'))
    expect(ui.container.querySelector('[data-club-join]')).toBeNull()
    expect(ui.container.querySelector('[data-club-none]')!.textContent).toContain('2013Q1')
  })

  it('once in, the GPU coin and the ending are free choices', () => {
    const { ui, actions, state } = screen(plan('2013Q1'))
    fireEvent.click(ui.container.querySelector('[data-club-join]')!)
    fireEvent.click(ui.container.querySelector('[data-club-coin="LTC"]')!)
    fireEvent.click(ui.container.querySelector('[data-club-ending="dissolve"]')!)
    expect(actions).toContainEqual({ type: 'P0_CLUB_GPU_COIN', coin: 'LTC' })
    expect(actions).toContainEqual({ type: 'P0_CLUB_ENDING', kind: 'dissolve' })
    expect(state().prologue!.club!.ending).toBe('dissolve')
  })

  it("a join you cannot afford in bandwidth is disabled", () => {
    const s = plan('2013Q1')
    s.bandwidth = 0
    const { ui } = screen(s)
    expect(ui.container.querySelector<HTMLButtonElement>('[data-club-join]')!.disabled).toBe(true)
  })
})

describe('the chapter report', () => {
  it('names the club\'s ending', () => {
    const s = plan('2016Q4')
    s.prologue!.clubEnded = { kind: 'buy_out', quarter: s.quarter, usd: 1234, early: false }
    const { container } = render(<Chapter state={s} act={() => null} tick={() => {}} skip={() => {}} onNew={() => {}} />)
    expect(container.querySelector('[data-club-ended]')!.textContent).toContain('Nell')
  })
})
