// @vitest-environment happy-dom
// M67.3 (doc 43 §0.24 item 2, V-D5): a "Start at Act V" preset start draws its future from a fresh seed (the title screen's
// seed field, else random), not from the preset company's fixed one, so two starts can draw different futures. The preset
// company (the 2035Q4 state) doesn't change. Before this, both presets always drew V1.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { V_FUTURE_IDS } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { drawVFuture, toAct5, type GameState } from '../../src/sim/state.ts'
import { toSeed } from '../../src/ui/seed.ts'
import { TitleScreen } from '../../src/ui/screens/Start.tsx'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

describe('preset starts draw a fresh Act V future', () => {
  it('different seeds can draw different futures (and the draw is the seed\'s, as for any new game)', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1)
    const drawn = seeds.map((n) => toAct5(act4Finished(), { preset: 'firm_builder', act5Seed: n }).vFutureId)
    expect(new Set(drawn).size).toBeGreaterThan(1)
    for (const [i, n] of seeds.entries()) expect(drawn[i]).toBe(drawVFuture(n))
    for (const f of drawn) expect(V_FUTURE_IDS).toContain(f)
  })

  it('the preset company does not change with the seed: same money, sites and valuation entry', () => {
    const a = toAct5(act4Finished(), { preset: 'firm_builder', act5Seed: 1 })
    const b = toAct5(act4Finished(), { preset: 'firm_builder', act5Seed: 2 })
    expect(b.cash).toBe(a.cash)
    expect(b.sites).toEqual(a.sites)
    expect(b.act5Entry?.valuationUsd).toBe(a.act5Entry?.valuationUsd)
    expect(b.founderStake).toBe(a.founderStake)
  })

  it('the seed field: a number is used as typed, text is hashed, empty is random', () => {
    expect(toSeed('7')).toBe(7)
    expect(toSeed('abc')).toBe(toSeed('abc'))
    const r = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75)
    expect(toSeed('')).not.toBe(toSeed(''))
    expect(r).toHaveBeenCalledTimes(2)
  })

  it('the title screen hands the seed field\'s text to the Act V start card', () => {
    const act5Start = vi.fn((seedText: string) => <span data-act5-card>{seedText}</span>)
    const { container } = render(
      <TitleScreen
        onStart={() => {}}
        onStartAct2={() => {}}
        onStartPrologue={() => {}}
        saves={{ autosave: null, manual: null }}
        onLoad={() => {}}
        act5Start={act5Start}
      />,
    )
    // the Act V card renders inside the open "New career" menu
    fireEvent.click(container.querySelector('button.btn-primary, button')!)
    const input = container.querySelector('input[type="text"], input:not([type])') as HTMLInputElement | null
    expect(input).not.toBeNull()
    fireEvent.input(input!, { target: { value: ' 42 ' } })
    const last = act5Start.mock.calls.at(-1)![0]
    expect(last).toBe('42')
  })
})
