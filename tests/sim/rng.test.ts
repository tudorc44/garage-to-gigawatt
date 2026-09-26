import { describe, expect, it } from 'vitest'
import {
  chance,
  pick,
  random,
  randomInt,
  seedFromString,
} from '../../src/sim/rng.ts'

describe('seeded RNG', () => {
  it('gives the same sequence for the same seed', () => {
    const a = { rng: 42 }
    const b = { rng: 42 }
    const rollsA = Array.from({ length: 100 }, () => random(a))
    const rollsB = Array.from({ length: 100 }, () => random(b))
    expect(rollsA).toEqual(rollsB)
    expect(a.rng).toBe(b.rng)
  })

  it('gives a different sequence for a different seed', () => {
    expect(random({ rng: 1 })).not.toBe(random({ rng: 2 }))
  })

  it('stays in [0, 1) and looks roughly uniform', () => {
    const h = { rng: 7 }
    const rolls = Array.from({ length: 10_000 }, () => random(h))
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...rolls)).toBeLessThan(1)
    const mean = rolls.reduce((s, x) => s + x, 0) / rolls.length
    expect(mean).toBeCloseTo(0.5, 1)
  })

  it('carries on correctly after a save/load (JSON round trip)', () => {
    const h = { rng: 99 }
    random(h)
    const loaded = JSON.parse(JSON.stringify(h))
    expect(random(loaded)).toBe(random(h))
  })

  it('randomInt includes both ends; chance and pick behave', () => {
    const h = { rng: 3 }
    const ints = new Set(Array.from({ length: 500 }, () => randomInt(h, 2, 4)))
    expect([...ints].sort()).toEqual([2, 3, 4])
    expect(chance(h, 0)).toBe(false)
    expect(chance(h, 1)).toBe(true)
    expect(['a', 'b']).toContain(pick(h, ['a', 'b']))
  })

  it('turns text into a stable seed', () => {
    expect(seedFromString('garage')).toBe(seedFromString('garage'))
    expect(seedFromString('garage')).not.toBe(seedFromString('gigawatt'))
  })
})
