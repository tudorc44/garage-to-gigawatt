// M36.4 (design thread, 9 Oct 2026, answer 9): Act IV's Power slot reads doc 33's waits: a grid upgrade waits the
// future's grid_wait_q × 0.8-1.2 (16-24 quarters at 20; F4 8-12 at 10), on-site gas takes 6-10 quarters. Acts II-III keep
// Act II's regional queues and the 2-quarter gas build.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import type { Project } from '../../src/sim/state.ts'
import { drawPowerQuarters, expectedPowerQuarters, gridQuarterRange } from '../../src/sim/systems/power.ts'
import { act2Company } from './act2Helpers.ts'
import { act4Company } from './act4Helpers.ts'

const gas = (id: string): Project => ({ id, siteId: 'site-2', power: 'gas', kw: 10_000 }) as Project

describe("Act IV's power waits (doc 33)", () => {
  // (political capital at 50: below 15 the existing Act III rule adds a quarter to every grid queue)
  it('a grid upgrade waits 16-24 quarters in 2031, in every region', () => {
    const s = act4Company('s0', 'f1')
    s.politicalCapital = 50
    expect(gridQuarterRange(s, 'ercot')).toEqual([16, 24])
    expect(gridQuarterRange(s, 'nordics')).toEqual([16, 24])
  })

  it('F4: 8-12 quarters once its grid wait falls to 10 (2034Q1)', () => {
    const s = act4Company('s0', 'f4')
    s.politicalCapital = 50
    s.quarter = CONTENT.quarters.indexOf('2034Q1')
    expect(gridQuarterRange(s, 'ercot')).toEqual([8, 12])
  })

  it('on-site gas takes 6-10 quarters in Act IV, 2 before', () => {
    const s = act4Company('s0', 'f2')
    const draws = Array.from({ length: 40 }, (_, i) => drawPowerQuarters(s, gas(`project-${i}`)))
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(6)
    expect(Math.max(...draws)).toBeLessThanOrEqual(10)
    expect(expectedPowerQuarters(s, gas('p'))).toBe(6)
    expect(drawPowerQuarters(act2Company('2024Q1'), gas('p'))).toBe(2)
    expect(gridQuarterRange(act2Company('2024Q1'), 'ercot')).not.toEqual([16, 24])
  })
})
