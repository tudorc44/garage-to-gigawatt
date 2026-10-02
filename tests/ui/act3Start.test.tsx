// @vitest-environment happy-dom
// M18.4: A3-12, start at Act III and Scenario Mode (test builds only): the three preset cards from the built
// companies' figures, "Start in 2027 →" starting the picked preset's company; Scenario Mode locked and unlocked, its
// start forcing the chosen scenario with the top-bar tag and "scenario known" on the reading score.
import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { ScenarioMode, StartAct3 } from '../../src/ui/screens/Act3Preview.tsx'
import { TitleScreen } from '../../src/ui/screens/Start.tsx'
import { readSettings } from '../../src/platform/settings.ts'
import { TopBar } from '../../src/ui/components/frame.tsx'
import { act2Company } from '../sim/act2Helpers.ts'
import { buildAct3End } from '../../src/sim/systems/act3End.ts'
import { Act3Reveal } from '../../src/ui/screens/Act3Reveal.tsx'

afterEach(cleanup)

describe('A3-12: start at Act III', () => {
  it('the title screen shows "Start at Act III (2027)" beside the other starts in a test build, with three preset cards', () => {
    const { container, getByText } = render(
      <TitleScreen
        onStart={() => {}}
        onStartAct2={() => {}}
        onStartPrologue={() => {}}
        saves={{ autosave: null, manual: null }}
        onLoad={() => {}}
        act3Start={<StartAct3 onReady={() => {}} />}
      />,
    )
    fireEvent.click(getByText('New career ▾'))
    fireEvent.click(getByText('Start at Act III (2027)'))
    const cards = container.querySelectorAll('[data-preset]')
    expect(cards).toHaveLength(3)
    const good = container.querySelector('[data-preset="good"]')!.textContent!
    expect(good).toContain('Steady Builder')
    expect(good).toContain('~$412.6M')
    // M18.8: Great is the best great-path company at 2026Q4, shown as "~$2.7B"
    expect(container.querySelector('[data-preset="great"]')!.textContent).toContain('~$2.7B')
    expect(good).toContain('BB+')
    expect(good).toContain('A solid Act II finish: mixed tenants, modest debt.')
    expect(container.querySelector('[data-preset="lifeline"]')!.textContent).toContain('Last Site Standing')
  })

  it('each preset starts its own company (its recipe played to 2026Q4)', async () => {
    for (const p of CONTENT.act3Presets) {
      const onReady = vi.fn<(end: GameState) => void>()
      const { container } = render(<StartAct3 onReady={onReady} />)
      fireEvent.click(container.querySelector('[data-start-act3] > button')!)
      fireEvent.click(container.querySelector(`[data-preset="${p.id}"]`)!)
      fireEvent.click(container.querySelector('[data-start-2027]')!)
      await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 30_000 })
      const end = onReady.mock.calls[0][0]
      expect(end.phase).toBe('chapter')
      expect(end.reports.at(-1)!.valuationUsd / 1e6).toBeCloseTo(p.valuationUsd / 1e6, 1)
      cleanup()
    }
  }, 90_000)
})

describe('A3-12: Scenario Mode', () => {
  it('locked: "Finish Act III once to unlock." (the default on a fresh device)', () => {
    expect(readSettings().act3Finished).toBe(false)
    const { container } = render(<ScenarioMode unlocked={false} onReady={() => {}} />)
    expect(container.querySelector('[data-scenario-mode="locked"]')!.textContent).toContain(
      'Finish Act III once to unlock.',
    )
    expect((container.querySelector('button[disabled]') as HTMLButtonElement).textContent).toBe('Locked')
  })

  it('unlocked: the four scenarios openly by name and line; the start hands over the chosen scenario', async () => {
    const onReady = vi.fn<(end: GameState, scenario: string) => void>()
    const { container } = render(<ScenarioMode unlocked onReady={onReady} />)
    const opts = [...container.querySelectorAll('[data-scenario]')].map((x) => x.textContent)
    expect(opts).toEqual([
      'Muddle Throughsteady, one reset',
      'The Great Repricingcapex bust',
      'Lift-Offdemand explosion',
      'Efficiency Shockcheaper compute',
    ])
    fireEvent.click(container.querySelector('[data-preset="lifeline"]')!)
    fireEvent.click(container.querySelector('[data-scenario="s1"]')!)
    fireEvent.click(container.querySelector('[data-scenario-start]')!)
    await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 30_000 })
    expect(onReady.mock.calls[0][1]).toBe('s1')
  }, 60_000)

  it('a Scenario Mode run plays the chosen scenario and carries the top-bar tag', () => {
    const s = toAct3(act2Company('2026Q4'), { scenario: 's2', scenarioMode: true })
    expect(s.scenarioId).toBe('s2')
    expect(s.scenarioMode).toBe(true)
    const { container } = render(<TopBar state={s} />)
    expect(container.querySelector('[data-scenario-mode-tag]')!.textContent).toBe('Scenario Mode')
  })

  it('the chapter report still reveals and scores, the reading score labelled "scenario known"', () => {
    const s = toAct3(act2Company('2026Q4'), { scenario: 's1', scenarioMode: true })
    s.phase = 'chapter'
    s.act3End = buildAct3End(s)
    const { container } = render(<Act3Reveal state={s} onNew={() => {}} />)
    expect(container.querySelector('[data-scenario-known]')!.textContent).toContain('scenario known')
    cleanup()
    const plain = toAct3(act2Company('2026Q4'), { scenario: 's1' })
    plain.phase = 'chapter'
    plain.act3End = buildAct3End(plain)
    expect(render(<Act3Reveal state={plain} onNew={() => {}} />).container.querySelector('[data-scenario-known]')).toBeNull()
  })
})
