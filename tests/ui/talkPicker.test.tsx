// @vitest-environment happy-dom
// Playtest fix (owner, 10 Oct 2026): in the Talk to the neighbours list, Talk acts at once (the row shows its cost), and
// "Talk at every site at Heat 30+" does them all after one confirm.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { addSite } from '../../src/sim/systems/siteSerials.ts'
import { PlanPicker } from '../../src/ui/screens/planPickers.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

/** An Act II company with three own sites, each at Heat 45. */
function hotCompany(): GameState {
  const s = act2Company('2024Q1')
  s.sites = s.sites.filter((x) => x.id === 'site-1')
  for (let i = 0; i < 3; i++)
    addSite(s, { id: `site-${s.nextId++}`, tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
  for (const site of s.sites.slice(1))
    s.siteHeat[site.id] = { ...(s.siteHeat[site.id] ?? {}), value: 45 } as GameState['siteHeat'][string]
  return s
}

describe('the Talk to the neighbours list', () => {
  it('a row talks at once, with no confirm', () => {
    const s = hotCompany()
    const act = vi.fn<(a: Action) => null>(() => null)
    const openDialog = vi.fn()
    const { container } = render(<PlanPicker state={s} act={act} kind="talk" openDialog={openDialog} onClose={() => {}} />)
    const row = container.querySelector(`[data-pick-row="${s.sites[1].id}"]`)!
    fireEvent.click(row.querySelector('button')!)
    expect(act).toHaveBeenCalledWith({ type: 'OUTREACH', siteId: s.sites[1].id })
    expect(openDialog).not.toHaveBeenCalled()
  })

  it('talks at every hot site after one confirm', () => {
    const s = hotCompany()
    const act = vi.fn<(a: Action) => null>(() => null)
    render(<PlanPicker state={s} act={act} kind="talk" openDialog={() => {}} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Talk at every site at Heat 30\+ \(3 sites/ }))
    expect(act).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))
    expect(act).toHaveBeenCalledTimes(3)
  })
})
