import { describe, expect, it } from 'vitest'
import { newGame, quarterLabel } from '../../src/sim/state.ts'

describe('newGame', () => {
  it('starts in the Q1 2017 plan phase with $10k, 3 Bandwidth and an empty garage', () => {
    const s = newGame(1)
    expect(quarterLabel(s)).toBe('2017Q1')
    expect(s.phase).toBe('plan')
    expect(s.cash).toBe(10_000)
    expect(s.bandwidth).toBe(3)
    expect(s.sites).toEqual([expect.objectContaining({ tier: 'garage' })])
    expect(s.machines).toEqual([])
    expect(s.treasury).toEqual({ BTC: 0, ETH: 0 })
  })

  it('is plain data: survives a JSON round trip unchanged', () => {
    const s = newGame(123)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })

  it('stores the seed and starts the RNG from it', () => {
    expect(newGame(5).rng).toBe(5)
    expect(newGame(5)).toEqual(newGame(5))
  })
})
