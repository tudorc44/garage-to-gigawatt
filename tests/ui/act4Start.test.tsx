// @vitest-environment happy-dom
// M32.4 (doc 33 §3.4, §17 A4-13): "Start at Act IV" with the three sim-made presets, and Act IV's Scenario Mode (locked
// until an Act IV finish; then a preset and an open future). A preset is a real company played from 2017 to 2030Q4;
// Scenario Mode marks the state, and the finale calls the campaign "scenario known".
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { PRESETS_IV } from '../../src/content/presetsAct4.ts'
import { finaleView } from '../../src/sim/finaleViews.ts'
import { toAct4 } from '../../src/sim/state.ts'
import { presetAct4Company } from '../../src/ui/act4PresetStart.ts'
import { ScenarioModeAct4, StartAct4 } from '../../src/ui/screens/Act4Entry.tsx'

afterEach(cleanup)

describe('Start at Act IV and Scenario Mode (M32.4)', () => {
  it('the start card opens three preset cards', () => {
    const { container } = render(<StartAct4 onReady={() => {}} />)
    fireEvent.click(container.querySelector('[data-start-act4] button')!)
    expect(container.querySelectorAll('[data-preset-iv]')).toHaveLength(3)
    expect(container.textContent).toContain('Ground Fortress')
    expect(container.textContent).toContain('Last Ridge')
  })

  it('Scenario Mode is locked until an Act IV finish; unlocked, it offers the four futures openly', () => {
    const locked = render(<ScenarioModeAct4 unlocked={false} onReady={() => {}} />)
    expect(locked.container.querySelector('[data-scenario-mode-iv="locked"]')).not.toBeNull()
    cleanup()
    const open = render(<ScenarioModeAct4 unlocked onReady={() => {}} />)
    expect(open.container.querySelectorAll('[data-future]')).toHaveLength(4)
    expect(open.container.textContent).toContain('The Wall')
  })

  it('a preset is its recipe’s company at 2030Q4; entering marks the preset, Scenario Mode the open future', async () => {
    const p = PRESETS_IV.find((x) => x.id === 'ridge')!
    const end = await presetAct4Company('ridge')
    expect(end.phase).toBe('chapter')
    expect(end.reports.at(-1)!.quarter).toBe('2030Q4')
    expect(Math.round(end.reports.at(-1)!.valuationUsd / 1e5) / 10).toBe(p.valuation_usd_m)
    const s = toAct4(end, { preset: 'ridge', future: 'f3', scenarioMode: true })
    expect(s).toMatchObject({ act4Preset: 'ridge', act4ScenarioMode: true, futureId: 'f3' })
    expect(s.futureForced).toBeUndefined()
    // the finale: a preset start, the campaign "scenario known"
    s.phase = 'chapter'
    const v = finaleView(s)
    expect(v.start.kind).toBe('preset')
    expect(v.scenarioKnown).toBe(true)
    expect(v.rows.map((r) => r.act)).toEqual(['act4'])
  })
})
