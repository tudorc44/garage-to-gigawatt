// @vitest-environment happy-dom
// UI fix: "Your machines" gets a Max button per batch, a Sell button that shows the total for the count entered, and a per-type
// "Sell all" behind a confirm line. UI only: selling through them is the same SELL_MACHINES actions entered by hand.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { fmt } from '../../src/ui/format.ts'
import { sellAllPlan } from '../../src/ui/components/sellCount.tsx'
import { FleetDialog } from '../../src/ui/screens/dialogs.tsx'

afterEach(cleanup)

/** An Act I game with batches of 2,105 and 1,053 Gen 1 rigs (two sites' worth, broken units in one) and 40 S9s. */
function company(): GameState {
  const s = structuredClone(newGame(1))
  s.phase = 'plan'
  s.sites.push({ id: 'site-2', tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
  const mk = (id: string, model: string, siteId: string, count: number, failed = 0) =>
    ({ id, model, siteId, condition: 'used' as const, count, failed, earnsFromQuarter: 0 })
  s.machines = [mk('lot-a', 'gpu_gen1', s.sites[0].id, 2105, 5), mk('lot-b', 'gpu_gen1', 'site-2', 1053), mk('lot-c', 's9', 'site-2', 40)]
  return s
}

function dialog(initial: GameState) {
  let state = initial
  const view = render(<div />)
  const draw = () => view.rerender(<FleetDialog state={state} act={act} onClose={() => {}} />)
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

const sold = (s: GameState, a: Action[]): GameState => a.reduce((x, act) => {
  const r = applyAction(x, act)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}, s)

describe('Max and the total on the Sell button', () => {
  it('Max fills the row\'s full count (working and broken) and the button shows the count and total', () => {
    const d = dialog(company())
    const row = d.view.container.querySelector('tbody tr')!
    fireEvent.click(row.querySelector('[data-sell-max]')!)
    const input = row.querySelector('input[type="number"]') as HTMLInputElement
    expect(input.value).toBe('2105')
    const label = [...row.querySelectorAll('button.btn')].find((b) => /^Sell 2,105 for \$/.test(b.textContent ?? ''))
    expect(label).toBeTruthy()
  })

  it('selling through Max gives the same state as the same count entered by hand', () => {
    const start = company()
    const d = dialog(start)
    const row = d.view.container.querySelector('tbody tr')!
    fireEvent.click(row.querySelector('[data-sell-max]')!)
    fireEvent.click([...row.querySelectorAll('button.btn')].find((b) => /^Sell 2,105/.test(b.textContent ?? ''))!)
    expect(d.state).toEqual(sold(start, [{ type: 'SELL_MACHINES', lotId: 'lot-a', count: 2105 }]))
  })
})

describe('Sell all, per machine type', () => {
  it('plans every batch of the type, across sites, with the dry-run total', () => {
    const s = company()
    const plan = sellAllPlan(s, 'gpu_gen1')!
    expect(plan.count).toBe(3158)
    expect(plan.batches).toBe(2)
    expect(plan.total).toBeCloseTo(sold(s, plan.actions).cash - s.cash, 6)
    expect(sellAllPlan(s, 'pc_cpu')).toBeNull()
  })

  it('the confirm line states the count and the total; Yes sells every batch exactly as row by row', () => {
    const start = company()
    const d = dialog(start)
    fireEvent.click(d.view.container.querySelector('[data-sell-all-btn="gpu_gen1"]')!)
    const line = d.view.container.querySelector('[data-sell-all-confirm]')!.textContent ?? ''
    const total = sellAllPlan(start, 'gpu_gen1')!.total
    expect(line).toContain('Sell all 3,158 GPU Rig Gen 1 for $')
    expect(line).toContain(fmt.money(total))
    fireEvent.click(d.view.container.querySelector('[data-sell-all-yes]')!)
    expect(d.state).toEqual(sold(start, [{ type: 'SELL_MACHINES', lotId: 'lot-a', count: 2105 }, { type: 'SELL_MACHINES', lotId: 'lot-b', count: 1053 }]))
    expect(d.state.machines.map((m) => m.model)).toEqual(['s9']) // the other type is untouched
  })

  it('has no button that sells every type at once', () => {
    const d = dialog(company())
    expect(d.view.container.querySelectorAll('[data-sell-all-btn]').length).toBe(2)
  })
})
