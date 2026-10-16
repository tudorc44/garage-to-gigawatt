// @vitest-environment happy-dom
// M71.1 (doc 51 v1.4 §14 decision 9): the Prologue expansion (altcoins, your own pool, the club) is behind the dev flag. In a
// production build: no Ventures screen, no coin selector, no expansion headlines, and a save that used a feature is refused.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { guardTestBuildSave } from '../../src/platform/preview.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { prologueNews } from '../../src/sim/prologue/views.ts'
import type { GameState } from '../../src/sim/state.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
})

function game(): GameState {
  const s = newPrologueGame(3)
  s.phase = 'plan'
  s.quarter = quarterIndex('2013Q1')!
  return s
}

describe('the expansion flag', () => {
  it('production refuses a Prologue save that used a feature, and loads one that did not', () => {
    const clean = game()
    expect(guardTestBuildSave({ ok: true, state: clean }, false).ok).toBe(true)
    for (const mark of ['alts', 'ownPool', 'poolEnded', 'club', 'clubEnded'] as const) {
      const s = game()
      ;(s.prologue as unknown as Record<string, unknown>)[mark] = {}
      expect(guardTestBuildSave({ ok: true, state: s }, false).ok, mark).toBe(false)
      expect(guardTestBuildSave({ ok: true, state: s }, true).ok, mark).toBe(true)
    }
  })

  it('the news list leaves out the expansion headlines when the flag is off', () => {
    const s = game()
    expect(prologueNews(s, true).length).toBeGreaterThan(prologueNews(s, false).length)
  })

  it('a production build shows no Ventures item, a test build does', async () => {
    const mount = async (mode: string) => {
      vi.resetModules()
      vi.stubEnv('MODE', mode)
      const { PlanOrLive } = await import('../../src/ui/screens/prologue/Plan.tsx')
      const { container } = render(
        <PlanOrLive state={game()} act={() => null} tick={() => {}} skip={() => {}} onNew={() => {}} speed={1} setSpeed={() => {}} />,
      )
      const items = [...container.querySelectorAll('.nav-item')].map((b) => b.textContent)
      cleanup()
      return items
    }
    const prod = await mount('production')
    const dev = await mount('development')
    expect(dev.length).toBe(prod.length + 1)
  }, 30_000) // (two dynamic imports of the whole Plan screen: slow when the machine is busy)
})
