// M18.12 (DT): GPU contracts signed in Act III are priced × a multiplier below the on-demand neocloud rate: 1.00 in
// 2027Q1 (the seam with Act II), 0.90 in 2027Q2, 0.80 in 2027Q3, then the end value (0.55) from 2027Q4. Act II and spot
// are unchanged; an Act II contract renewing in Act III gets the multiplier on its base.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import {
  gpuContractRateMult,
  gpuContractUsdHr,
  neocloudUsdHr,
} from '../../src/sim/systems/projects.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('the Act III GPU contract-rate multiplier', () => {
  it('the glide 1.00 / 0.90 / 0.80, then 0.55; 1 in Act II', () => {
    expect(['2027Q1', '2027Q2', '2027Q3', '2027Q4', '2030Q4'].map((l) => gpuContractRateMult(q(l)))).toEqual([
      1, 0.9, 0.8, 0.55, 0.55,
    ])
    expect(gpuContractRateMult(q('2026Q4'))).toBe(1)
    expect(BALANCE.act3.gpuContractRateMult.end).toBe(0.55)
  })

  it('a B200 contract signed in 2028Q1 = the neocloud rate × the term factor × 0.55; spot unchanged', () => {
    const spot = neocloudUsdHr('b200', q('2028Q1'), 's0')!
    const factor = BALANCE.projects.gpuContracts.termFactor[2]
    expect(gpuContractUsdHr('b200', 2, q('2028Q1'), 's0')).toBeCloseTo(spot * factor * 0.55, 10)
    // the seam: 2027Q1 is priced as Act II priced it
    const seam = neocloudUsdHr('b200', q('2027Q1'), 's0')!
    expect(gpuContractUsdHr('b200', 2, q('2027Q1'), 's0')).toBeCloseTo(seam * factor, 10)
  })
})
