// The "is this Act II?" helpers (M9.1): a pure refactor, so they must say exactly what the old
// `act === 2` and `act2Quarter(q)` checks said, for every act and every quarter.
import { describe, expect, it } from 'vitest'
import { CONTENT, act2Quarter, isActIIQuarter } from '../../src/content/index.ts'
import { inActII, isActII, newGame } from '../../src/sim/state.ts'
import { act2Company } from './act2Helpers.ts'

describe('inActII / isActII', () => {
  it('is true only for act 2', () => {
    expect(isActII(2)).toBe(true)
    for (const act of [0, 1, 3, -1, null, undefined, '2', {}])
      expect(isActII(act)).toBe(false)
  })

  it('reads a game’s act, and treats no game as not Act II', () => {
    expect(inActII(newGame(1))).toBe(false) // Act I
    expect(inActII(act2Company('2024Q1'))).toBe(true)
    expect(inActII({ act: 0 })).toBe(false)
    expect(inActII(null)).toBe(false)
    expect(inActII(undefined)).toBe(false)
  })
})

describe('isActIIQuarter', () => {
  it('agrees with act2Quarter() for every quarter, the prologue’s and quarters past the end included', () => {
    for (let q = -40; q < CONTENT.quarters.length + 20; q++)
      expect(isActIIQuarter(q)).toBe(act2Quarter(q) !== undefined)
  })

  it('is true exactly for Act II’s quarters (2022Q4 to 2026Q4)', () => {
    const first = CONTENT.quarters.indexOf('2022Q4')
    const last = CONTENT.quarters.indexOf('2026Q4')
    for (let q = 0; q < CONTENT.quarters.length; q++)
      expect(isActIIQuarter(q)).toBe(q >= first && q <= last)
  })
})
