// @vitest-environment happy-dom
// M57.2 (doc 43 §15, epilogue_v.json): Act V's chapter report and the campaign finale at 2040. The record carries the
// three titles, the exit, the ventures' and the rivals' fates; the chapter report shows them and opens the finale: the
// ledger gains Act IV's 2035 row and Act V's 2040 row, the multiple uses 2040's net worth after the exit, and the
// epilogue's lines come from the file (filled, no placeholder left). The hidden rival fates are read only by act5End.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { playFrom } from '../../src/sim/replay.ts'
import { finaleViewV } from '../../src/sim/finaleViews.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { Act5Chapter } from '../../src/ui/screens/Act5Entry.tsx'
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
const noop = () => {}

let end5: GameState | null = null
function act5Finished(): GameState {
  if (!end5) {
    const end4 = playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
    end5 = playFrom(toAct5(end4, { vfuture: 'v2' }), { plan: () => [] }, { through: 5 }).state
  }
  return structuredClone(end5)
}

describe('Act V’s chapter report and the 2040 finale (M57.2)', () => {
  it('the record: career, reading and megawatt titles, the exit (held by default), rival fates', () => {
    const e = act5Finished().act5End!
    expect(e.careerTitleId).toBeTruthy()
    expect(e.megawatts?.titleId).toMatch(/^(firm|flexible|orbital|landlord)$/)
    expect(e.exitChoice).toBe('hold')
    expect(e.rivalFates!.length).toBeGreaterThan(0)
    // Orrery appears only after F1/F3 (doc 43 §0.4): this career came through f1, so its fate is told
    expect(e.rivalFates!.some((r) => r.rival === 'orrery_compute')).toBe(true)
  })

  it('the finale view: Act IV’s 2035 row, Act V’s 2040 row, the multiple on 2040’s net worth, 3-6 lines', () => {
    const s = act5Finished()
    const v = finaleViewV(s)
    expect(v.rows.map((r) => r.act).slice(-2)).toEqual(['act4', 'act5'])
    expect(v.rows.at(-1)!.year).toBe(2040)
    expect(v.netWorthUsd).toBe(s.act5End!.founderNetWorthUsd)
    expect(v.careerMultiple).toBeCloseTo(v.netWorthUsd / v.start.wealthUsd)
    expect(v.epilogueV.length).toBeGreaterThanOrEqual(3)
    expect(v.epilogueV.length).toBeLessThanOrEqual(6)
    expect(finaleViewV(s)).toEqual(v) // deterministic
  })

  it('the chapter report shows the exit and the titles, and its button opens the finale with no placeholder left', () => {
    const { container } = render(<Act5Chapter state={act5Finished()} onNew={noop} />)
    expect(container.querySelector('[data-reveal-exit]')).not.toBeNull()
    expect(container.querySelector('[data-mw-title]')).not.toBeNull()
    expect(container.textContent).toContain('Rival fates are scenario illustrations, not predictions.')
    expect(container.textContent).not.toContain('being built')
    fireEvent.click(container.querySelector('[data-to-finale]')!)
    const f = container.querySelector('[data-act5-finale]')!
    expect(f.textContent).toContain('Act V: Firm')
    expect(f.textContent).toContain('Act IV: The Race to Orbit')
    expect(f.querySelectorAll('[data-finale-epilogue] p').length).toBeGreaterThanOrEqual(3)
    expect(f.textContent).not.toMatch(/\{\w+\}|ui\.|epilogue\./)
  })

  it('the hidden rival fates (rivalsHiddenV) are read only by act5End.ts', () => {
    const root = join(__dirname, '../../src')
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]))
    const importers = walk(root)
      .filter((f) => /\.tsx?$/.test(f) && !/rivalsHiddenV\.ts$/.test(f))
      .filter((f) => /rivalsHiddenV/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(root.length + 1).replace(/\\/g, '/'))
    expect(importers).toEqual(['sim/systems/act5End.ts'])
  })
})
