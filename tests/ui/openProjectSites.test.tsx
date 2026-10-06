// @vitest-environment happy-dom
// The New project dialog's site list (owner request, 6 Oct 2026): most free power first; sites with less free power than
// the smallest project (the pilot's minimum) fold under "Show N more sites", still reachable for Grid upgrade or gas.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import { openProjectView } from '../../src/sim/projectViews.ts'
import type { GameState, Site } from '../../src/sim/state.ts'
import { ProjectsSection } from '../../src/ui/screens/Projects.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

function site(id: string, tier: string): Site {
  return { id, tier, readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null } as Site
}

/** An Act II company with sites of every size: a Texas site, the 20 MW own site, a warehouse, small units. */
function company(): GameState {
  const s = act2Company('2023Q3')
  s.sites.push(
    site('site-10', 'small_unit'),
    site('site-11', 'texas_site'),
    site('site-12', 'small_unit'),
    site('site-13', 'warehouse'),
  )
  return s
}

function open(s: GameState) {
  const act = vi.fn<(a: Action) => null>(() => null)
  const view = render(<ProjectsSection state={s} act={act} />)
  fireEvent.click(screen.getAllByRole('button', { name: /Open a project/ })[0])
  return view
}

const listed = (c: Element) =>
  [...c.querySelectorAll('[data-site]')].map((e) => e.getAttribute('data-site'))

describe('the New project site list', () => {
  it('sorts by free power, folds the small ones, and shows them on request', () => {
    const s = company()
    const v = openProjectView(s)
    const minKw = v.pilotSizes[0]
    const sorted = [...v.sites].sort((a, b) => b.freeKw - a.freeKw)
    const big = sorted.filter((x) => x.freeKw >= minKw).map((x) => x.site.id)
    const small = sorted.filter((x) => x.freeKw < minKw).map((x) => x.site.id)
    expect(big[0]).toBe('site-11') // the Texas site has the most free power
    expect(small).toContain('site-10')
    expect(small).toContain('site-12')

    const { container } = open(s)
    expect(listed(container)).toEqual(big)
    // The site with the most free power is picked.
    const first = container.querySelector('[data-site] input') as HTMLInputElement
    expect(first.checked).toBe(true)

    const more = container.querySelector('[data-more-sites]') as HTMLButtonElement
    expect(more.textContent).toContain(`Show ${small.length} more sites`)
    fireEvent.click(more)
    expect(listed(container)).toEqual([...big, ...small])
    expect(more.getAttribute('aria-expanded')).toBe('true')
  })

  it('folding away the picked small site moves the pick back to the biggest', () => {
    const { container } = open(company())
    fireEvent.click(container.querySelector('[data-more-sites]')!)
    const smallInput = container.querySelector('[data-site="site-12"] input') as HTMLInputElement
    fireEvent.click(smallInput)
    expect(smallInput.checked).toBe(true)
    fireEvent.click(container.querySelector('[data-more-sites]')!)
    expect(container.querySelector('[data-site="site-12"]')).toBeNull()
    const biggest = container.querySelector('[data-site="site-11"] input') as HTMLInputElement
    expect(biggest.checked).toBe(true)
  })

  it('when no site has room for the smallest project, every site shows and nothing folds', () => {
    const s = act2Company('2023Q3')
    s.sites = s.sites.filter((x) => x.id !== 'site-2')
    s.sites.push(site('site-10', 'small_unit'), site('site-12', 'small_unit'))
    const { container } = open(s)
    expect(listed(container)).toEqual(
      expect.arrayContaining(['site-10', 'site-12']),
    )
    expect(container.querySelector('[data-more-sites]')).toBeNull()
  })
})
