import { describe, expect, it } from 'vitest'
import { playGame } from '../src/sim/replay.ts'
import { BOTS } from '../tools/bots.ts'

describe('sim-runner bots', () => {
  it.each(Object.keys(BOTS))(
    '%s plays a whole game with only legal actions',
    (name) => {
      // playGame throws if any action the bot sends is rejected.
      const { state } = playGame(1, BOTS[name])
      expect(['ended', 'gameover']).toContain(state.phase)
      for (const r of state.reports)
        expect(Number.isFinite(r.valuationUsd)).toBe(true)
    },
  )
})
