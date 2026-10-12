// M65.1 (doc 43 §0.21 decision 1): V-B8 is a sign check. Checked on M64's table (the sim run of 12 Oct 2026).
import { describe, expect, it } from 'vitest'
import { vb8Passes } from '../../tools/act5/verdicts.ts'

describe('V-B8 as restated in doc 43 §0.21', () => {
  // Perfect ÷ Passive and Over-reactor ÷ Passive per future (v1 v2 v3 v4), M64's --act5 table
  const FB = { perfect: [1.155, 1.015, 1.15, 1.092], over: [0.833, 0.923, 0.889, 0.919] }
  const OL = { perfect: [1.061, 1.014, 1.116, 1.292], over: [0.866, 0.924, 0.893, 0.874] }

  it('passes on both of M64\'s presets (the old 1.15-in-3-of-4 form missed on both)', () => {
    expect(vb8Passes(FB.perfect, FB.over)).toBe(true)
    expect(vb8Passes(OL.perfect, OL.over)).toBe(true)
    expect(FB.perfect.filter((x) => x >= 1.15).length).toBeLessThan(3)
    expect(OL.perfect.filter((x) => x >= 1.15).length).toBeLessThan(3)
  })

  it('misses when any future\'s Perfect ÷ Passive falls to 1.00 or below', () => {
    expect(vb8Passes([1.155, 1.0, 1.15, 1.092], FB.over)).toBe(false)
    expect(vb8Passes([1.155, 0.99, 1.15, 1.092], FB.over)).toBe(false)
  })

  it('misses when the over-reactor is above 0.97 × Passive in any future', () => {
    expect(vb8Passes(FB.perfect, [0.833, 0.923, 0.98, 0.919])).toBe(false)
    expect(vb8Passes(FB.perfect, [0.833, 0.923, 0.97, 0.919])).toBe(true)
  })

  it('is not a pass with nothing measured', () => {
    expect(vb8Passes([], [])).toBe(false)
  })
})
