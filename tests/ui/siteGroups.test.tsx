// @vitest-environment happy-dom
// M33.4 (design thread, doc 35): Fleet & Sites lists every site grouped by type ("Own site · 12 · …"), groups of 3 or
// fewer open, larger ones folded; filter chips combine.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../src/sim/state.ts'
import { addSite } from '../../src/sim/systems/siteSerials.ts'
import { SitesList } from '../../src/ui/components/siteGroups.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

/** A 20-site company: the garage, 12 own sites, 4 warehouses, 3 small units. */
function company(): GameState {
  const s = act2Company('2024Q1')
  s.sites = s.sites.filter((x) => x.id === 'site-1')
  const add = (tier: string, n: number) => {
    for (let i = 0; i < n; i++)
      addSite(s, {
        id: `site-${s.nextId++}`,
        tier,
        readyQuarter: 0,
        rentUsdQ: 0,
        powerPriceMult: 1,
        flaw: null,
      })
  }
  add('own_site', 12)
  add('warehouse', 4)
  add('small_unit', 3)
  return s
}

const rows = (c: Element) => c.querySelectorAll('[data-site-row]').length

describe('Fleet & Sites: grouped sites', () => {
  it('groups by type; groups of 3 or fewer open, larger ones folded until clicked', () => {
    const s = company()
    expect(s.sites).toHaveLength(20)
    const { container } = render(<SitesList state={s} />)
    const heads = [...container.querySelectorAll('.site-group-head')].map((h) => h.textContent)
    expect(heads).toHaveLength(4)
    expect(heads.find((h) => h?.includes('Own site'))).toContain('Own site · 12')
    // Open: the garage (1) and the small units (3); folded: own sites (12) and warehouses (4).
    expect(rows(container)).toBe(1 + 3)
    const own = container.querySelector('[data-site-group="own_site"] .site-group-head')!
    fireEvent.click(own)
    expect(rows(container)).toBe(1 + 3 + 12)
    expect(container.textContent).toContain('Own site 12')
  })

  it('filter chips combine: Heat ≥ 30, then Has projects', () => {
    const s = company()
    for (const site of s.sites.slice(1, 3))
      s.siteHeat[site.id] = { ...(s.siteHeat[site.id] ?? {}), value: 55 } as GameState['siteHeat'][string]
    const { container } = render(<SitesList state={s} />)
    fireEvent.click(container.querySelector('[data-site-filter="heat"]')!)
    const heads = [...container.querySelectorAll('.site-group-head')].map((h) => h.textContent)
    expect(heads).toEqual([expect.stringContaining('Own site · 2')])
    expect(rows(container)).toBe(2) // a group of 2 shows open
    fireEvent.click(container.querySelector('[data-site-filter="projects"]')!)
    expect(rows(container)).toBe(0)
    expect(container.textContent).toContain('No site matches these filters.')
  })
})
