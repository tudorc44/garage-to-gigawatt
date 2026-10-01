// @vitest-environment happy-dom
// M17.0 (DT answer 1): in Act III the open-project dialog lists every GPU on sale, Rubin Ultra included (from
// 2027Q3); picking Rubin Ultra switches "Build to top tier" on and locks it, with the extra cost shown.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import type { Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { ProjectsSection } from '../../src/ui/screens/Projects.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(cleanup)

function at(label: string): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's0' })
  s.quarter = CONTENT.quarters.indexOf(label)
  s.bandwidth = 6
  return s
}

function openCloud(s: GameState) {
  const act = vi.fn<(a: Action) => null>(() => null)
  const view = render(<ProjectsSection state={s} act={act} />)
  fireEvent.click(screen.getAllByRole('button', { name: /Open a project/ })[0])
  fireEvent.click(screen.getByRole('button', { name: 'AI cloud' }))
  return { ...view, act }
}

describe('the open-project dialog in Act III (M17.0)', () => {
  it('2027Q3: Rubin Ultra is listed; picking it ticks "Build to top tier" and locks it; Open sends topTier', () => {
    const { container, act } = openCloud(at('2027Q3'))
    const select = container.querySelector('select') as HTMLSelectElement
    const options = [...select.options].map((o) => o.value)
    expect(options).toEqual(['h100', 'h200', 'b200', 'rubin_nvl144', 'rubin_ultra'])
    const tick = container.querySelector('[data-top-tier]') as HTMLInputElement
    expect(tick.checked).toBe(false)
    expect(tick.disabled).toBe(false)
    fireEvent.change(select, { target: { value: 'rubin_ultra' } })
    expect(tick.checked).toBe(true)
    expect(tick.disabled).toBe(true)
    expect(container.querySelector('[data-top-locked]')!.textContent).toContain(
      'Rubin Ultra',
    )
    fireEvent.click(screen.getByRole('button', { name: /Open project/ }))
    expect(act).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROJECT_OPEN',
        kind: 'cloud',
        gpu: 'rubin_ultra',
        topTier: true,
      }),
    )
  })

  it('2027Q1: no Rubin Ultra yet, and the tick is closed', () => {
    const { container } = openCloud(at('2027Q1'))
    const options = [
      ...(container.querySelector('select') as HTMLSelectElement).options,
    ].map((o) => o.value)
    expect(options).not.toContain('rubin_ultra')
    expect(
      (container.querySelector('[data-top-tier]') as HTMLInputElement).disabled,
    ).toBe(true)
  })
})
