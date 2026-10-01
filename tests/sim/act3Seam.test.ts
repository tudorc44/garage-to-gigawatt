// M15.1: the opening quarter mustn't give the scenario away. Every market column the UI shows live in Act III
// (the new-lease index midpoint, GPU rents, the mid→top retrofit cost, the nuclear PPA price where present)
// must, at 2027Q1, differ across the four scenarios by at most 3% of its mean ((max − min) / mean). M15 pinned
// three failing columns (all s2 high); M16.0 set s2's values to s0's, so none fail now.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const COLUMNS = [
  'gpu_h100_hyperscaler_usd_hr',
  'gpu_h100_neocloud_usd_hr',
  'gpu_h100_spot_usd_hr',
  'gpu_h100_1yr_contract_usd_hr',
  'gpu_a100_hyperscaler_usd_hr',
  'gpu_h200_hyperscaler_usd_hr',
  'gpu_h200_neocloud_usd_hr',
  'gpu_b200_hyperscaler_usd_hr',
  'gpu_b200_neocloud_usd_hr',
  'gpu_gb200nvl72_blended_usd_hr',
  'gpu_rubin_hyperscaler_usd_hr',
  'gpu_rubin_neocloud_usd_hr',
  'gpu_rubin_ultra_hyperscaler_usd_hr',
  'gpu_rubin_ultra_neocloud_usd_hr',
  'capex_retrofit_density_mid_to_top_usd_mw',
  'nuclear_ppa_usd_mwh',
]

/** Each scenario's 2027Q1 row, by column name. */
const rows = [0, 1, 2, 3].map((s) => {
  const lines = readFileSync(
    new URL(`../../src/content/market_s${s}.csv`, import.meta.url),
    'utf8',
  ).split('\n')
  const head = lines[0].split(',')
  const row = lines.find((l) => l.startsWith('2027Q1,'))!.split(',')
  return Object.fromEntries(head.map((k, i) => [k, row[i]]))
})

/** (max − min) / mean of a column's 2027Q1 values, or null when it is blank (not available yet). */
function spread(values: string[]): number | null {
  const n = values.filter((v) => v !== '').map(Number)
  if (n.length === 0) return null
  const mean = n.reduce((a, b) => a + b, 0) / n.length
  return (Math.max(...n) - Math.min(...n)) / mean
}

describe('the 2027Q1 seam across scenarios (M15.1)', () => {
  it('the new-lease index is the same in every scenario at 2027Q1 (0.88 / 1.04, mid 0.96)', () => {
    for (const r of rows) {
      expect(r.rfp_new_lease_index_low).toBe('0.88')
      expect(r.rfp_new_lease_index_high).toBe('1.04')
    }
    const mid = rows.map(
      (r) =>
        String((Number(r.rfp_new_lease_index_low) + Number(r.rfp_new_lease_index_high)) / 2),
    )
    expect(spread(mid)).toBe(0)
  })

  it('every live column is within 3% (M16.0 fixed s2’s H200 rents and GB200 NVL72 blend: no pinned failures)', () => {
    const failing = COLUMNS.filter((c) => {
      const s = spread(rows.map((r) => r[c]))
      return s !== null && s > 0.03
    })
    expect(failing).toEqual([])
  })
})
