// M52.1 (doc 43 §0.2, §0.7 item 1, §0.9 item 2): Act V's scarcity repricing. The market files keep the carried rent,
// renewal, RFP and multiple columns scarcity-neutral; the engine applies the future's scarcity index where the carried
// systems read them (rents × s; the AI multiple and spot rents × (1 + 0.5 × (s − 1))), and nowhere before Act V.
import { describe, expect, it } from 'vitest'
import { CONTENT, act5Row, actFirstQuarter, actLastQuarter, quarterRow, type Act5MarketKey } from '../../src/content/index.ts'
import { gpuRenewalIndex, renewalBand, rfpMid } from '../../src/sim/systems/leaseIndex.ts'
import { gpuContractUsdHr, neocloudUsdHr } from '../../src/sim/systems/projects.ts'
import { scarcityIndex, scarcityMultipleFactor } from '../../src/sim/systems/scarcity.ts'
import { aiInfraMultiple } from '../../src/sim/systems/valuation.ts'

const last5 = actLastQuarter(5)
const first5 = actFirstQuarter(5)

describe('scarcity repricing (M52.1)', () => {
  it('is 1 outside Act V and the file’s index in it (V1 rises to 1.5, V3 falls to 0.8)', () => {
    expect(scarcityIndex(actLastQuarter(4), 's0.f1')).toBe(1)
    expect(scarcityIndex(first5, 's0.f1.v1')).toBe(1)
    expect(scarcityIndex(last5, 's0.f1.v1')).toBe(1.5)
    expect(scarcityIndex(last5, 's0.f1.v3')).toBe(0.8)
    expect(scarcityMultipleFactor(last5, 's0.f1.v1')).toBe(1.25)
    expect(scarcityMultipleFactor(last5, 's0.f1.v3')).toBeCloseTo(0.9, 10)
  })

  it('reprices rents (RFP, renewal band, GPU renewal index, GPU contracts) × s in Act V', () => {
    for (const key of ['s0.f1.v1', 's2.f3.v3'] as Act5MarketKey[]) {
      const r = quarterRow(last5, key)!
      const s = act5Row(last5, key)!.scarcity_index
      expect(rfpMid(last5, key)).toBeCloseTo(((r.rfp_new_lease_index_low! + r.rfp_new_lease_index_high!) / 2) * s, 10)
      expect(renewalBand(last5, key)!.lo).toBeCloseTo(r.renewal_shell_index_low! * s, 10)
      expect(gpuRenewalIndex(last5, key, 'h100')).toBeCloseTo(r.renewal_h100_gpu_index_vs_2025q4! * s, 10)
      // the same quarter's scarcity-neutral price, compared across the two keys' factors
      const neutral = gpuContractUsdHr('b200', 1, last5, key)! / s
      expect(neutral).toBeGreaterThan(0)
    }
    // V1 and V3 share the neutral columns, so their ratio is the ratio of their indices
    const v1 = gpuContractUsdHr('b200', 1, last5, 's0.f1.v1')!
    const v3 = gpuContractUsdHr('b200', 1, last5, 's0.f1.v3')!
    expect(v1 / v3).toBeCloseTo(1.5 / 0.8, 6)
  })

  it('moves the AI multiple and spot rents by 1 + 0.5 × (s − 1)', () => {
    const v1 = aiInfraMultiple(last5, 's0.f1.v1')
    const v3 = aiInfraMultiple(last5, 's0.f1.v3')
    expect(v1 / v3).toBeCloseTo(1.25 / 0.9, 6)
    const n1 = neocloudUsdHr('b200', last5, 's0.f1.v1')!
    const n3 = neocloudUsdHr('b200', last5, 's0.f1.v3')!
    expect(n1 / n3).toBeCloseTo(1.25 / 0.9, 6)
  })

  it('changes nothing in 2036Q1 (the common baseline: s = 1 in every future)', () => {
    const keys = ['v1', 'v2', 'v3', 'v4'].map((v) => `s0.f1.${v}` as Act5MarketKey)
    const m = keys.map((k) => aiInfraMultiple(first5, k))
    expect(new Set(m).size).toBe(1)
    expect(CONTENT.quarters[first5]).toBe('2036Q1')
  })
})
