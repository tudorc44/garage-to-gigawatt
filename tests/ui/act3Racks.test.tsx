// @vitest-environment happy-dom
// M16.5: the A3-07 screen (Sites & Fleet in Act III), rendered from a fixture company: the halls table, the
// fit matrix, the retrofit panel (Start retrofit sends RETROFIT) and the GPU change panel; a blocked row shows
// its reason.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import type { Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { RacksPanel } from '../../src/ui/screens/Act3Racks.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

const text = en as Record<string, string>
const q = (label: string) => CONTENT.quarters.indexOf(label)
afterEach(cleanup)

const base: Omit<Project, 'id' | 'n'> = {
  siteId: 'site-2',
  kw: 5000,
  kind: 'shell',
  gpu: null,
  openedQuarter: q('2024Q1'),
  stage: 'live',
  offers: [],
  tenant: null,
  spot: false,
  capital: 'cash',
  capexUsd: 50_000_000,
  gpuCapexUsd: 0,
  gpuCount: 0,
  startQuarter: q('2024Q2'),
  readyQuarter: q('2024Q4'),
  soldQuarter: null,
}

/** A 20 MW site with three halls: a low leased shell, a mid H100 cloud on spot, a hall being built. */
function fixture(): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = q('2027Q4')
  s.bandwidth = 4
  s.act3Renewals = []
  const card = CONTENT.projects.tenantCards.find((c) => c.type === 'hyperscaler')!
  s.projects = [
    {
      ...base,
      id: 'project-1',
      n: 1,
      tier: 'low',
      tenant: {
        card: card.id,
        signedQuarter: q('2025Q1'),
        readyByQuarter: q('2025Q1'),
        lateQuarters: 0,
        walkRolled: true,
        prepaymentLeftUsd: 0,
        servedQuarters: 4,
        termQuarters: 40,
      },
    },
    {
      ...base,
      id: 'project-2',
      n: 2,
      kind: 'cloud',
      gpu: 'h100',
      tier: 'mid',
      gpuCount: 3750,
      gpuCapexUsd: 3750 * 28_000,
    },
    {
      ...base,
      id: 'project-3',
      n: 3,
      kw: 4000,
      tier: 'mid',
      stage: 'building',
      startQuarter: q('2027Q3'),
      readyQuarter: q('2028Q2'),
    },
  ]
  return s
}

function show(state: GameState) {
  const act = vi.fn<(a: Action) => null>(() => null)
  const view = render(<RacksPanel state={state} act={act} />)
  return { ...view, act }
}

describe('A3-07: the halls table and the fit matrix', () => {
  it('one row per live, building or proposed hall: MW, density badge, what fits', () => {
    const { container } = show(fixture())
    const rows = container.querySelectorAll('[data-hall]')
    expect(rows).toHaveLength(3)
    const badge = (id: string) =>
      container.querySelector(`[data-hall="${id}"] [data-density]`)!
    expect(badge('project-1').getAttribute('data-density')).toBe('low')
    expect(badge('project-1').textContent).toContain('Low · 40–60 kW/rack')
    expect(badge('project-2').textContent).toContain('Mid · ~125 kW/rack')
    const fits = (id: string) =>
      container.querySelector(`[data-hall="${id}"]`)!.children[3].textContent
    expect(fits('project-1')).toBe('H100, H200')
    expect(fits('project-2')).toBe('H100, H200, B200, Rubin')
    expect(container.querySelector('[data-halls]')!.textContent).toContain(
      '20 MW energized',
    )
  })

  it('a blocked row shows its reason (a hall being built)', () => {
    const { container } = show(fixture())
    const row = container.querySelector('[data-hall="project-3"]')!
    expect(row.querySelector('[data-retrofit]')).toBeNull()
    expect(row.querySelector('[data-block]')!.textContent).toBe(
      text['error.retrofit_building'],
    )
  })

  it('the matrix: ✓ fits / ✗ too dense, the tier each generation needs in bold, Rubin Ultra "from 2027Q3" before it is out', () => {
    const early = fixture()
    early.quarter = q('2027Q2')
    const { container } = show(early)
    const m = container.querySelector('[data-fit-matrix]')!
    const cells = (gen: string) =>
      [...m.querySelectorAll(`[data-gen="${gen}"] [data-fit]`)].map((c) =>
        c.getAttribute('data-fit'),
      )
    expect(cells('hopper')).toEqual(['yes', 'yes', 'yes'])
    expect(cells('blackwell')).toEqual(['no', 'yes', 'yes'])
    expect(cells('rubin')).toEqual(['no', 'yes', 'yes'])
    expect(cells('rubin_ultra')).toEqual(['no', 'no', 'yes'])
    expect(m.querySelector('[data-gen="rubin_ultra"] td.needs')!.textContent).toBe(
      text['ui.act3.racks.fits'],
    )
    expect(m.querySelector('[data-gen="rubin_ultra"]')!.textContent).toContain(
      'from Q3 2027',
    )
    expect(m.textContent).toContain(text['ui.act3.racks.matrix_note'])
  })
})

describe('A3-07: the retrofit panel', () => {
  it('both options (low → mid selected; mid → top needs mid first), the income lost, what fits after, the tenant note; Start retrofit sends RETROFIT', () => {
    const { container, act } = show(fixture())
    fireEvent.click(container.querySelector('[data-retrofit="project-1"]')!)
    const panel = container.querySelector('[data-retrofit-panel]')!
    const low = panel.querySelector('[data-option="low_to_mid"]')!
    const top = panel.querySelector('[data-option="mid_to_top"]')!
    expect(low.getAttribute('data-on')).toBe('true')
    expect(low.textContent).toContain('$1.5M/MW')
    expect(low.textContent).toContain('$7.5M')
    expect(low.textContent).toContain('10 weeks')
    expect(top.textContent).toContain('26 weeks')
    expect(top.textContent).toContain(text['ui.act3.racks.needs_mid'])
    // 10 weeks from the start of 2027Q4: that quarter keeps 3/13 (23%)
    expect(panel.querySelector('[data-income]')!.textContent).toContain('23%')
    expect(panel.querySelector('[data-after]')!.textContent).toBe(
      'H100, H200, B200, Rubin',
    )
    expect(panel.textContent).toContain(text['ui.act3.racks.tenant_note'])
    fireEvent.click(screen.getByRole('button', { name: /Start retrofit/ }))
    expect(act).toHaveBeenCalledWith({ type: 'RETROFIT', projectId: 'project-1' })
  })

  it('a mid-tier hall: mid → top at this quarter’s price, 26 weeks, the earnings note', () => {
    const s = fixture()
    s.projects[1] = { ...s.projects[1], kind: 'shell', gpu: null, tenant: null }
    const { container } = show(s)
    fireEvent.click(container.querySelector('[data-retrofit="project-2"]')!)
    const panel = container.querySelector('[data-retrofit-panel]')!
    expect(
      panel.querySelector('[data-option="mid_to_top"]')!.getAttribute('data-on'),
    ).toBe('true')
    expect(panel.textContent).toContain(text['ui.act3.racks.earns_note'])
  })
})

describe('A3-07: the GPU change panel', () => {
  it('the fitting generations with unit price, count, cost and net; the current GPUs’ sale value; Change GPUs sends REFIT_GPUS', () => {
    const { container, act } = show(fixture())
    fireEvent.click(container.querySelector('[data-refit="project-2"]')!)
    const panel = container.querySelector('[data-refit-panel]')!
    const gens = [...panel.querySelectorAll('[data-choice]')].map((r) =>
      r.getAttribute('data-choice'),
    )
    expect(gens).toEqual(['h200', 'b200', 'rubin_nvl144'])
    expect(panel.querySelector('[data-sale]')!.textContent).toMatch(/^\$/)
    fireEvent.click(
      panel.querySelector('[data-choice="rubin_nvl144"] input')!,
    )
    fireEvent.click(screen.getByRole('button', { name: /Change GPUs →/ }))
    expect(act).toHaveBeenCalledWith({
      type: 'REFIT_GPUS',
      projectId: 'project-2',
      gpu: 'rubin_nvl144',
    })
  })
})
