// M16.1: Act III's newest GPUs (gpus_act3.json and the scenario CSVs). Rubin and Rubin Ultra are buyable in
// Act III only, priced and rented from the scenario's own columns; Act II's generations keep their GPUs per MW;
// the newest generation on sale takes the scenario's chip lead time.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  type ScenarioId,
} from '../../src/content/index.ts'
import {
  availableGpus,
  gpuContractUsdHr,
  gpuGeneration,
  gpuLeadTimeWeeks,
  gpuPriceUsd,
  neocloudUsdHr,
} from '../../src/sim/systems/projects.ts'
import { gpuRenewalIndex } from '../../src/sim/systems/leaseIndex.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A scenario CSV's value for a column and quarter ('' when blank). */
function csv(id: ScenarioId, quarter: string, column: string): string {
  const lines = readFileSync(
    new URL(`../../src/content/market_${id}.csv`, import.meta.url),
    'utf8',
  ).split('\n')
  const head = lines[0].split(',')
  const row = lines.find((l) => l.startsWith(`${quarter},`))!.split(',')
  return row[head.indexOf(column)]
}

describe('the Act III generations (M16.1)', () => {
  it('Rubin 900 and Rubin Ultra 1,050 GPUs per MW (gpus_act3.json); Act II’s keep 750 (DT: the file’s 650 / 760 are not used)', () => {
    expect(gpuGeneration('rubin_nvl144')!.gpusPerMw).toBe(900)
    expect(gpuGeneration('rubin_ultra')!.gpusPerMw).toBe(1050)
    for (const id of ['h100', 'h200', 'b200'])
      expect(gpuGeneration(id)!.gpusPerMw).toBe(750)
  })

  it('neither is on sale in Act II; Rubin from 2027Q1 and Rubin Ultra from its first priced quarter (2027Q3) in every scenario', () => {
    expect(availableGpus(q('2026Q4')).map((g) => g.id)).toEqual([
      'h100',
      'h200',
      'b200',
    ])
    for (const id of SCENARIO_IDS) {
      const ids = (label: string) =>
        availableGpus(q(label), id).map((g) => g.id)
      expect(ids('2027Q1')).toEqual(['h100', 'h200', 'b200', 'rubin_nvl144'])
      expect(ids('2027Q2')).not.toContain('rubin_ultra')
      expect(ids('2027Q3')).toContain('rubin_ultra')
      expect(csv(id, '2027Q2', 'rubin_ultra_nvl576_rack_usd')).toBe('')
    }
  })

  it('prices: Rubin’s unit price from the CSV; Rubin Ultra’s rack ÷ 144 (≈ $131,944 at $19M: M18.8 raised it $4M)', () => {
    for (const id of SCENARIO_IDS)
      for (const label of ['2027Q1', '2028Q3', '2030Q4']) {
        expect(gpuPriceUsd('rubin_nvl144', q(label), id)).toBe(
          Number(csv(id, label, 'rubin_unit_purchase_usd')),
        )
      }
    expect(gpuPriceUsd('rubin_ultra', q('2027Q3'), 's0')).toBeCloseTo(
      19_000_000 / 144,
      6,
    )
    expect(BALANCE.act3.density.gpusPerRack).toEqual({
      rubin_nvl144: 72,
      rubin_ultra: 144,
    })
  })

  it('rents: spot from the Rubin neocloud columns; a GPU contract off the same series × the term factor (like the B200)', () => {
    // × the K1 rent factors (M18.6, relaxed in M18.12: Rubin 0.65, Rubin Ultra 0.60)
    const k1 = BALANCE.act3.rubinRentFactor
    expect(k1).toEqual({ rubin_nvl144: 0.65, rubin_ultra: 0.6 })
    expect(neocloudUsdHr('rubin_nvl144', q('2027Q1'), 's2')).toBeCloseTo(
      Number(csv('s2', '2027Q1', 'gpu_rubin_neocloud_usd_hr')) * k1.rubin_nvl144,
      10,
    )
    expect(neocloudUsdHr('rubin_ultra', q('2028Q1'), 's1')).toBeCloseTo(
      Number(csv('s1', '2028Q1', 'gpu_rubin_ultra_neocloud_usd_hr')) * k1.rubin_ultra,
      10,
    )
    const factor = BALANCE.projects.gpuContracts.termFactor[3] ?? 1
    // (M18.12: × the Act III contract-rate multiplier, 0.55 from 2027Q4)
    expect(gpuContractUsdHr('rubin_nvl144', 3, q('2027Q4'), 's3')).toBeCloseTo(
      Number(csv('s3', '2027Q4', 'gpu_rubin_neocloud_usd_hr')) * factor * k1.rubin_nvl144 * 0.55,
      10,
    )
    // the renewal index: the B200's
    expect(gpuRenewalIndex(q('2028Q2'), 's0', 'rubin_ultra')).toBe(
      gpuRenewalIndex(q('2028Q2'), 's0', 'b200'),
    )
  })

  it('lead times: the newest generation on sale takes the scenario column; older ones Act II’s last', () => {
    // 2027Q1 (s1): Rubin is the newest.
    expect(gpuLeadTimeWeeks('rubin_nvl144', q('2027Q1'), 's1')).toBe(18)
    // 2027Q3: Rubin Ultra is out and takes the column; Rubin falls back to the B200's Act II lead time.
    expect(gpuLeadTimeWeeks('rubin_ultra', q('2027Q3'), 's1')).toBe(
      Number(csv('s1', '2027Q3', 'newest_gen_lead_time_weeks')),
    )
    expect(gpuLeadTimeWeeks('rubin_nvl144', q('2027Q3'), 's1')).toBe(6)
    expect(gpuLeadTimeWeeks('b200', q('2027Q3'), 's1')).toBe(6)
    expect(gpuLeadTimeWeeks('h100', q('2027Q3'), 's1')).toBe(4)
    expect(gpuLeadTimeWeeks('h200', q('2027Q3'), 's1')).toBe(4)
  })

  it('the density block (DT / designed): generation tiers, rent multiples by tier, the top new build', () => {
    const d = BALANCE.act3.density
    expect(d.genTier).toMatchObject({
      h100: 'low',
      h200: 'low',
      b200: 'mid',
      rubin_nvl144: 'mid',
      rubin_ultra: 'top',
    })
    expect(d.shellTierRentMult).toEqual({ low: 0.85, mid: 1, top: 1.1 })
    expect(d.topNewBuildRetrofitShare).toBe(0.6)
    expect(d.topNewBuildExtraQuarters).toBe(1)
    expect(d.carriedShellMidFrom).toBe('2025Q1')
    expect(CONTENT.act3Gpus.lowToMid).toEqual({
      retrofitUsdMw: 1_500_000,
      weeks: 10,
    })
    expect(CONTENT.act3Gpus.midToTopWeeks).toBe(26)
    expect(CONTENT.act3Gpus.tierRackKw.low.range).toEqual([40, 60])
    expect(CONTENT.act3Gpus.tierRackKw.mid.rackKw).toBe(125)
    expect(CONTENT.act3Gpus.tierRackKw.top.rackKw).toBe(600)
  })
})
