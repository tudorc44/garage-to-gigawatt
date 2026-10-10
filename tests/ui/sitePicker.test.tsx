// @vitest-environment happy-dom
// M33.2 (design thread, doc 35): one action, many sites. The SitePicker lists eligible sites first (sorted by the
// action's fact), the ineligible greyed below with their reason; a filter box from 9 rows. The Plan to-do names a single
// site inline and groups 2+ sites into one row that opens the picker.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import type { GameState, Site } from '../../src/sim/state.ts'
import { addSite } from '../../src/sim/systems/siteSerials.ts'
import { SitePicker, type PickRow } from '../../src/ui/components/sitePicker.tsx'
import { PlanScreen } from '../../src/ui/screens/Plan.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

function withSites(n: number, tier = 'own_site'): GameState {
  const s = act2Company('2024Q1')
  s.sites = s.sites.filter((x) => x.id === 'site-1') // the garage
  for (let i = 0; i < n; i++)
    addSite(s, {
      id: `site-${s.nextId++}`,
      tier,
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    })
  return s
}

const ids = (c: Element) =>
  [...c.querySelectorAll('[data-pick-row]')].map((r) =>
    r.getAttribute('data-pick-row'),
  )

describe('SitePicker', () => {
  it('eligible rows first, cheapest first; the ineligible greyed below with their reason', () => {
    const s = withSites(3)
    const [a, b, c] = s.sites.slice(1) as Site[]
    const rows: PickRow[] = [
      { site: a, fact: '$30', factSort: 30 },
      { site: b, fact: '$5', factSort: 5, why: 'No free power' },
      { site: c, fact: '$10', factSort: 10 },
    ]
    const pick = vi.fn()
    const { container } = render(
      <SitePicker
        state={s}
        title="Pick"
        factLabel="Cost"
        actionLabel="Do it"
        rows={rows}
        onPick={pick}
        onClose={() => {}}
      />,
    )
    expect(ids(container)).toEqual([c.id, a.id, b.id])
    const greyed = container.querySelector(`[data-pick-row="${b.id}"]`)!
    expect(greyed.className).toContain('locked')
    expect(greyed.textContent).toContain('No free power')
    expect(greyed.querySelector('button')).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: /Do it/ })[0])
    expect(pick).toHaveBeenCalledWith(c)
    // Sorting by the fact the other way keeps the greyed row last.
    fireEvent.click(container.querySelector('[data-sort="fact"]')!)
    expect(ids(container)).toEqual([a.id, c.id, b.id])
    // No filter box under 9 rows; site names are unique short names.
    expect(container.querySelector('.picker-filter')).toBeNull()
    expect(container.textContent).toContain('Own site 3')
  })

  it('a filter box from 9 rows narrows the list by name', () => {
    const s = withSites(9)
    const rows: PickRow[] = s.sites
      .slice(1)
      .map((x, i) => ({ site: x, fact: String(i), factSort: i }))
    const { container } = render(
      <SitePicker
        state={s}
        title="Pick"
        factLabel="Cost"
        actionLabel="Go"
        rows={rows}
        onPick={() => {}}
        onClose={() => {}}
      />,
    )
    const box = container.querySelector('.picker-filter') as HTMLInputElement
    expect(box).not.toBeNull()
    fireEvent.input(box, { target: { value: 'Own site 7' } })
    expect(ids(container)).toHaveLength(1)
  })
})

describe('Plan to-do: grouped site actions', () => {
  const noop = vi.fn<(a: Action) => null>(() => null)

  it('one leavable site is named inline', () => {
    const { container } = render(<PlanScreen state={withSites(1)} act={noop} />)
    expect(container.textContent).toContain('Own site 1')
    expect(container.textContent).not.toContain('Leave a site ·')
  })

  it('2+ leavable sites are one row that opens the picker', () => {
    const { container } = render(<PlanScreen state={withSites(4)} act={noop} />)
    const row = screen.getByRole('button', { name: /Leave a site · 4 eligible/ })
    fireEvent.click(row)
    const picker = container.querySelector('[data-site-picker]')!
    expect(picker).not.toBeNull()
    expect(ids(container)).toHaveLength(4)
  })
})
