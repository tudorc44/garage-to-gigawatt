// @vitest-environment happy-dom
// M34.2 (the owner's answers after M33, 9 Oct 2026; all presentation): 3b the card's "Acquired · powered since"; 3c
// project names carry their site ("Own site 3 · AI 1"); 3d the dashboard's Fleet & sites panel capped from 6 sites; 3e site
// names in sentences link to the card; 3f a fee-charging site action always lands on one confirm.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { addSite } from '../../src/sim/systems/siteSerials.ts'
import { ActionRow } from '../../src/ui/components/basics.tsx'
import { SiteCardHost } from '../../src/ui/components/siteCard.tsx'
import { SiteName } from '../../src/ui/components/siteName.tsx'
import { projectName } from '../../src/ui/names.ts'
import { FleetPanel, PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

function company(n: number, heat = 0): GameState {
  const s = act2Company('2024Q1')
  s.sites = s.sites.filter((x) => x.id === 'site-1')
  for (let i = 0; i < n; i++)
    addSite(s, { id: `site-${s.nextId++}`, tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
  if (heat > 0) s.siteHeat[s.sites[1].id] = { ...(s.siteHeat[s.sites[1].id] ?? {}), value: heat } as GameState['siteHeat'][string]
  return s
}
const noop = vi.fn<(a: Action) => null>(() => null)

describe('M34.2: telling sites apart, follow-ups', () => {
  it('3b: the card says when the site was acquired, and leaves it out for an older save', () => {
    const s = company(2)
    const site = s.sites[2]
    const { container } = render(
      <SiteCardHost state={s} act={noop}>
        <SiteName state={s} site={site} />
      </SiteCardHost>,
    )
    fireEvent.click(container.querySelector(`[data-site-link="${site.id}"]`)!)
    expect(container.querySelector('[data-site-card]')!.textContent).toContain('Acquired Q1 2024')
    cleanup()
    const old = company(2)
    old.sites[2].acquiredQuarter = null
    const r = render(
      <SiteCardHost state={old} act={noop}>
        <SiteName state={old} site={old.sites[2]} />
      </SiteCardHost>,
    )
    fireEvent.click(r.container.querySelector('[data-site-link]')!)
    const text = r.container.querySelector('[data-site-card]')!.textContent!
    expect(text).not.toContain('Acquired')
    expect(text).not.toContain('unknown')
  })

  it('3c: a project is named after its site: "Own site 3 · AI 1"', () => {
    const s = company(3)
    expect(projectName(s.sites[3], 1)).toBe('Own site 3 · AI 1')
  })

  it('3d: the dashboard panel keeps cards under 6 sites; from 6, one line per type and the way to Fleet & Sites', () => {
    const few = render(<FleetPanel state={company(4)} />)
    expect(few.container.querySelector('[data-fleet-types]')).toBeNull()
    expect(few.container.querySelectorAll('.fleet-row').length).toBeGreaterThanOrEqual(5)
    cleanup()
    const many = render(<FleetPanel state={company(7)} />)
    const lines = many.container.querySelectorAll('[data-fleet-type]')
    expect([...lines].map((l) => l.textContent)).toContain('Own site · 7 · 140 MW · 140 MW free')
    expect(many.container.querySelectorAll('.fleet-row')).toHaveLength(0)
  })

  it('3e: a site name in a to-do row opens the card, not the row’s action', () => {
    const s = company(2)
    const click = vi.fn()
    const { container } = render(
      <SiteCardHost state={s} act={noop}>
        <ActionRow icon="close" name="Leave Own site 2" onClick={click} />
      </SiteCardHost>,
    )
    const link = container.querySelector(`[data-site-link="${s.sites[2].id}"]`)!
    expect(link.textContent).toBe('Own site 2')
    fireEvent.click(link)
    expect(click).not.toHaveBeenCalled()
    expect(container.querySelector(`[data-site-card="${s.sites[2].id}"]`)).not.toBeNull()
  })

  it('3f: one hot site is named with its cost; clicking opens the confirm, never acts at once', () => {
    const s = company(1, 45)
    const act = vi.fn<(a: Action) => null>(() => null)
    const { container } = render(<PlanScreen state={s} act={act} />)
    const row = screen.getByRole('button', { name: /Talk to the neighbours at Own site 1/ })
    fireEvent.click(row)
    expect(act).not.toHaveBeenCalled()
    expect(container.querySelector(`[data-site-confirm="talk:${s.sites[1].id}"]`)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))
    expect(act).toHaveBeenCalledWith({ type: 'OUTREACH', siteId: s.sites[1].id })
  })
})
