// @vitest-environment happy-dom
// M33.3 (design thread, doc 35): a site name opens the site's card: the long name, power, uses, money, Heat and the
// actions open there, each going to its own confirm.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import { addSite } from '../../src/sim/systems/siteSerials.ts'
import { SiteCardHost } from '../../src/ui/components/siteCard.tsx'
import { SiteName } from '../../src/ui/components/siteName.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

function company() {
  const s = act2Company('2024Q1')
  s.sites = s.sites.filter((x) => x.id === 'site-1')
  for (let i = 0; i < 3; i++)
    addSite(s, {
      id: `site-${s.nextId++}`,
      tier: 'own_site',
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    })
  return s
}

describe('the site card', () => {
  it('opens from a site name, with the long name and its sections', () => {
    const s = company()
    const third = s.sites[3]
    const act = vi.fn<(a: Action) => null>(() => null)
    const { container } = render(
      <SiteCardHost state={s} act={act}>
        <SiteName state={s} site={third} />
      </SiteCardHost>,
    )
    expect(container.querySelector('[data-site-card]')).toBeNull()
    fireEvent.click(container.querySelector(`[data-site-link="${third.id}"]`)!)
    const card = container.querySelector(`[data-site-card="${third.id}"]`)!
    expect(card).not.toBeNull()
    expect(screen.getByRole('dialog', { name: /Own site 3 · Georgia · 20 MW/ })).toBeTruthy()
    for (const part of ['Power', 'Uses', 'Money', 'Heat'])
      expect(card.textContent).toContain(part)
    // Leave opens its own confirm; Talk opens the one fee confirm (M34.2, 3f), and Confirm acts.
    fireEvent.click(screen.getByRole('button', { name: 'Leave…' }))
    expect(screen.getByRole('dialog', { name: /Leave Own site 3/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Talk' }))
    expect(act).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Confirm/ }))
    expect(act).toHaveBeenCalledWith({ type: 'OUTREACH', siteId: third.id })
  })
})
