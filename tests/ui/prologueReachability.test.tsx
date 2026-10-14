// @vitest-environment happy-dom
// M69.4 (doc 51 v1.1 §2): every Prologue action has a screen that sends it, and the new Ventures item shows in the Prologue's
// menu. (Act V has the same rule in act5Reachability.test.tsx.)
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'
import { Ventures } from '../../src/ui/screens/prologue/Ventures.tsx'

afterEach(cleanup)

const root = join(__dirname, '../../src')
const uiText = () =>
  readdirSync(join(root, 'ui/screens/prologue'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => readFileSync(join(root, 'ui/screens/prologue', f), 'utf8'))
    .join('\n')

describe('Prologue reachability (M69.4)', () => {
  it('every P0_ action in the Prologue\'s action list is sent by a Prologue screen', () => {
    const actions = readFileSync(join(root, 'sim/prologue/actions.ts'), 'utf8')
    const union = actions.slice(actions.indexOf('export type PrologueAction'), actions.indexOf('/** Act I actions that work unchanged'))
    const types = [...union.matchAll(/type: '(P0_[A-Z_]+)'/g)].map((m) => m[1])
    expect(types.length).toBeGreaterThan(20)
    const ui = uiText()
    const orphans = types.filter((a) => !ui.includes(`type: '${a}'`))
    expect(orphans).toEqual([])
  })
})

function plan(quarter: string, cash = 20000): GameState {
  const s = newPrologueGame(4)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  s.sites[0].tier = 'home_rig'
  s.siteSerials = { home_rig: 1 }
  s.machines = []
  s.cash = cash
  s.bandwidth = 3
  return s
}

function screen(initial: GameState) {
  let state = initial
  const view = render(<div />)
  const draw = () => view.rerender(<Ventures state={state} act={act} tick={() => {}} skip={() => {}} onNew={() => {}} />)
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

describe('the Ventures screen (pool panel)', () => {
  it('before 2011Q2 it says when the pool opens, and offers nothing', () => {
    const g = screen(plan('2010Q4'))
    expect(g.view.container.querySelector('[data-pool-locked]')!.textContent).toContain('Q2 2011')
    expect(g.view.container.querySelector('[data-pool-open]')).toBeNull()
  })

  it('opening: pick PPS and a fee, open; the panel then shows the pool and its actions', () => {
    const g = screen(plan('2013Q4', 1e9))
    const c = g.view.container
    fireEvent.click([...c.querySelectorAll('[data-pool-settings] button')].find((b) => b.textContent === 'PPS')!)
    fireEvent.input(c.querySelector('[data-pool-fee]') as HTMLInputElement, { target: { value: '3' } })
    fireEvent.click(c.querySelector('[data-pool-open]')!)
    expect(g.state.prologue!.ownPool).toMatchObject({ method: 'PPS', feePct: 0.03 })
    expect(c.querySelector('[data-pool-quarter]')).not.toBeNull()
    expect(c.querySelector('[data-pool-ddos]')).not.toBeNull()
    expect(c.querySelector('[data-pool-cold]')).not.toBeNull()
  })

  it('settings, protection, cold storage and the sale all send their actions', () => {
    const g = screen(plan('2013Q2', 1e6))
    const c = g.view.container
    fireEvent.click(c.querySelector('[data-pool-open]')!)
    expect(g.state.prologue!.ownPool).toBeDefined()
    fireEvent.click(c.querySelector('[data-pool-ddos]')!)
    expect(g.state.prologue!.ownPool!.protectionFrom).toBe(g.state.quarter + 1)
    fireEvent.click(c.querySelector('[data-pool-cold]')!)
    expect(g.state.prologue!.ownPool!.coldStorage).toBe(true)
    // the sale shows its price and sells
    expect(c.querySelector('[data-pool-sale]')!.textContent).toContain('A buyer would pay')
    fireEvent.click(c.querySelector('[data-pool-sell]')!)
    expect(g.state.prologue!.ownPool).toBeUndefined()
    expect(c.querySelector('[data-pool-ended]')!.textContent).toContain('You sold')
  })

  it('closing a pool, and the apply button is off until the settings differ', () => {
    const g = screen(plan('2012Q2', 1e6))
    const c = g.view.container
    fireEvent.click(c.querySelector('[data-pool-open]')!)
    expect((c.querySelector('[data-pool-apply]') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.input(c.querySelector('[data-pool-settings-panel] [data-pool-fee]') as HTMLInputElement, { target: { value: '2' } })
    expect((c.querySelector('[data-pool-apply]') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(c.querySelector('[data-pool-apply]')!)
    expect(g.state.prologue!.ownPool!.feePct).toBe(0.02)
    fireEvent.click(c.querySelector('[data-pool-close]')!)
    expect(g.state.prologue!.ownPool).toBeUndefined()
    expect(c.querySelector('[data-pool-ended]')!.textContent).toContain('closed')
  })
})
