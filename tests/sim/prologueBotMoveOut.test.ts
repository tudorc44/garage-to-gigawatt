// M72.4 (doc 51 v1.5 §16 decision 2): the pps-operator bot moves out only when its cash covers the deposit and four quarters of the
// costs it would carry; the other bots move out as before (their rows are byte-identical: X-B1).
import { describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'
import { PROLOGUE_BOTS, PROLOGUE_SETTINGS } from '../../tools/prologueBots.ts'

function planAt(cash: number): GameState {
  const s = newPrologueGame(5)
  s.phase = 'plan'
  s.quarter = quarterIndex('2014Q1')!
  s.sites[0].tier = 'home_rig'
  s.siteSerials = { home_rig: 1 }
  s.machines = []
  s.cash = cash
  s.bandwidth = 4
  return s
}
const movesOut = (bot: string, cash: number) => PROLOGUE_BOTS[bot].plan(planAt(cash)).some((a) => a.type === 'P0_MOVE_OUT')

describe('the pps-operator moves out on cash, the others as before', () => {
  it('carries the four-quarter rule; no other bot does', () => {
    expect(PROLOGUE_SETTINGS['pps-operator'].moveOutCashQuarters).toBe(4)
    for (const [name, set] of Object.entries(PROLOGUE_SETTINGS)) if (name !== 'pps-operator') expect(set.moveOutCashQuarters, name).toBeUndefined()
  })

  it('with little cash the pps-operator stays at home; with plenty it moves out', () => {
    expect(movesOut('pps-operator', 3000)).toBe(false)
    expect(movesOut('pps-operator', 1e6)).toBe(true)
  })

  it('the pool-operator (no cash rule) moves out in 2014Q1 with the deposit in hand', () => {
    expect(movesOut('pool-operator', 3000)).toBe(true)
  })
})
