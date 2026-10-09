// @vitest-environment happy-dom
// M35 (doc 38 §4): a site's Power options show each option's honest numbers and build through the action; the Plan's
// to-do lists the special sites on offer, greyed with the reason when closed.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import type { Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { EnergyDialog } from '../../src/ui/components/energyDialog.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'

afterEach(cleanup)

function garage2018(): GameState {
  const s = { ...newGame(1), quarter: CONTENT.quarters.indexOf('2018Q1') }
  s.cash = 3_000_000
  return s
}

describe('the Power options dialog', () => {
  it('quotes rooftop solar with its payback and builds it', () => {
    const act = vi.fn<(a: Action) => null>(() => null)
    const { container } = render(<EnergyDialog state={garage2018()} act={act} siteId="site-1" onClose={() => {}} />)
    const solar = container.querySelector('[data-energy-choice="rooftop_solar"]')!
    expect(solar.textContent).toContain('pays back in about')
    expect(container.querySelector('[data-energy-choice="small_wind"]')!.textContent).toContain('20%')
    fireEvent.click([...solar.querySelectorAll('button')].find((b) => b.textContent === 'Build')!)
    expect(act).toHaveBeenCalledWith({ type: 'ENERGY_BUILD', siteId: 'site-1', kind: 'rooftop_solar', size: 3 })
  })
})

describe('special sites on the Plan', () => {
  it('lists the hydro allocations greyed by the moratorium, and the flare pad open', () => {
    const s = garage2018()
    s.sites.push({ id: 'site-7', tier: 'warehouse', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null, serial: 1 })
    render(<PlanScreen state={s} act={() => null} />)
    const pud = screen.getByRole('button', { name: /Lease a PUD county allocation/ }) as HTMLButtonElement
    expect(pud.disabled).toBe(true)
    expect(pud.title).toMatch(/moratorium/)
    expect((screen.getByRole('button', { name: /Build a flare-gas pad/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows none before the player has a warehouse', () => {
    render(<PlanScreen state={garage2018()} act={() => null} />)
    expect(screen.queryByRole('button', { name: /flare-gas pad/ })).toBeNull()
  })
})
