// @vitest-environment happy-dom
// M17.6: the step-6 screens, rendered from fixture companies: A3-08 (the nuclear PPA in the Power slot: the
// details, both unavailable states, "Use this power →"), A3-09 (the meter, the warning, the hire, a lobbying
// Start, a Spend, the greyed reasons) and the wildcard card on the Plan screen.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT, type PowerRegion } from '../../src/content/index.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import type { Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { openNextWildcard } from '../../src/sim/systems/wildcards.ts'
import {
  GovernmentSection,
  WildcardPanel,
} from '../../src/ui/screens/Act3Government.tsx'
import { ProjectsSection } from '../../src/ui/screens/Projects.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

const text = en as Record<string, string>
const q = (label: string) => CONTENT.quarters.indexOf(label)
afterEach(cleanup)

function co(label: string, region: PowerRegion = 'pjm'): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.sites.find((x) => x.id === 'site-2')!.region = region
  return s
}
const act = () => vi.fn<(a: Action) => null>(() => null)

function openPower(s: GameState) {
  const a = act()
  const view = render(<ProjectsSection state={s} act={a} />)
  fireEvent.click(screen.getAllByRole('button', { name: /Open a project/ })[0])
  // pick the 20 MW own site
  const site = [...view.container.querySelectorAll('input[name="project-site"]')].at(-1) as HTMLInputElement
  fireEvent.click(site)
  fireEvent.click(view.container.querySelector('[data-power-nuclear]')!)
  return { ...view, act: a }
}

describe('A3-08: the nuclear PPA in the Power slot', () => {
  it('the details: price now, grid power here, 15 years, contracted MW, no queue, the regions, take-or-pay with the worked line; Use this power → opens with power nuclear', () => {
    const s = co('2027Q3')
    const { container, act: a } = openPower(s)
    const d = container.querySelector('[data-nuclear-details]')!
    const price = CONTENT.act3Scenarios.s0.quarterly[2].nuclear_ppa_usd_mwh!
    expect(d.textContent).toContain(`$${price}/MWh`)
    expect(d.textContent).toContain('15 years, fixed')
    expect(d.textContent).toContain(text['ui.nuclear.regions_value'])
    expect(d.textContent).toContain('none')
    expect(container.querySelector('[data-take-or-pay]')!.textContent).toContain(
      'You pay for at least 90% of the 20 MW, whether the site uses them or not.',
    )
    // half = 10 of 20 MW: 0.9 × 20 − 10 = 8 MW unused
    expect(container.querySelector('[data-worked]')!.textContent).toContain(
      `If the site draws 10 of 20 MW: 8 MW × 8,760 h × $${price}/MWh`,
    )
    fireEvent.click(container.querySelector('[data-use-nuclear]')!)
    expect(container.querySelector('[data-nuclear-details]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Open project/ }))
    expect(a).toHaveBeenCalledWith(expect.objectContaining({ type: 'PROJECT_OPEN', power: 'nuclear' }))
  })

  it('unavailable here: the region reason; unavailable yet: "Available from 2027Q3."', () => {
    const ercot = openPower(co('2027Q3', 'ercot')).container
    expect(ercot.querySelector('[data-nuclear-unavailable]')!.textContent).toContain(
      text['error.nuclear_region'],
    )
    expect((ercot.querySelector('[data-use-nuclear]') as HTMLButtonElement).disabled).toBe(true)
    cleanup()
    const early = openPower(co('2027Q2')).container
    expect(early.querySelector('[data-nuclear-unavailable]')!.textContent).toContain(
      'Available from 2027Q3.',
    )
  })
})

describe('A3-09: the Government section', () => {
  it('the meter (40, the decay note), the hire card, lobbying and the spend cards with their reasons', () => {
    const s = co('2027Q2')
    const a = act()
    const { container } = render(<GovernmentSection state={s} act={a} />)
    expect(container.querySelector('[data-pc]')!.textContent).toBe('40')
    expect(container.querySelector('[data-meter]')!.textContent).toContain(
      'Falls 2 a quarter without upkeep. Started Act III at 40.',
    )
    expect(container.querySelector('[data-warning]')).toBeNull()
    expect(container.querySelector('[data-hire]')!.textContent).toContain('$450.0K/q')
    expect(container.querySelector('[data-hire]')!.textContent).toContain('a net +1 a quarter')
    // lobbying: the coalition can start; the delegation needs the Director
    expect(
      container.querySelector('[data-lobby="state_delegation"] [data-block]')!.textContent,
    ).toBe(text['error.needs_director'])
    fireEvent.click(
      container.querySelector('[data-lobby="trade_assoc"] button')!,
    )
    expect(a).toHaveBeenCalledWith({ type: 'LOBBY', id: 'trade_assoc' })
    // spend: five cards; the favour can be spent; the permit has no build to speed up
    expect(container.querySelectorAll('[data-spend-card]')).toHaveLength(5)
    expect(
      container.querySelector('[data-spend-card="pc_fast_permit"] [data-block]')!.textContent,
    ).toBe(text['error.card_no_build'])
    fireEvent.click(
      container.querySelector('[data-spend-card="pc_anger_shield"] button')!,
    )
    expect(a).toHaveBeenCalledWith({ type: 'PC_SPEND', id: 'pc_anger_shield' })
  })

  it('below 15: the warning state with its two penalty lines', () => {
    const s = co('2028Q4')
    s.politicalCapital = 12
    const { container } = render(<GovernmentSection state={s} act={act()} />)
    const w = container.querySelector('[data-warning]')!
    expect(w.textContent).toContain('Warning · below 15')
    expect(w.textContent).toContain('Ratepayer Anger 40')
    expect(w.textContent).toContain('1 more quarter')
    expect(
      container.querySelector('[data-spend-card="pc_anger_shield"] [data-block]')!.textContent,
    ).toBe('Needs 15 political capital (you have 12).')
  })
})

describe('the wildcard card on the Plan screen', () => {
  it('shows the open wildcard, its default, and sends the choice', () => {
    const s = co('2028Q2')
    s.act3Wildcards = [{ id: 'wc_grid_event', quarter: s.quarter, status: 'pending' }]
    s.act3WildcardOpen = null
    openNextWildcard(s)
    const a = act()
    const { container } = render(<WildcardPanel state={s} act={a} />)
    expect(container.textContent).toContain(text['wildcard.wc_grid_event.title'])
    expect(container.textContent).toContain(text['ui.wildcard.default'])
    fireEvent.click(container.querySelector('[data-wildcard-choice="c2"]')!)
    expect(a).toHaveBeenCalledWith({ type: 'WILDCARD_CHOOSE', choice: 'c2' })
  })
})
