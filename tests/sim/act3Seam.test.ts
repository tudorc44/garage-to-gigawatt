// M15.1: the opening quarter mustn't give the scenario away. Every market column the UI shows live in Act III
// (the new-lease index midpoint, GPU rents, the mid→top retrofit cost, the nuclear PPA price where present)
// must, at 2027Q1, differ across the four scenarios by at most 3% of its mean ((max − min) / mean). The
// columns that fail are reported, not fixed (the design thread's answer D1): the list is pinned here and goes
// to the step-7 checklist, so a new failure (or a fix) shows up as a test change.
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

  it('every live column is within 3%, except the pinned list for step 7', () => {
    const failing = COLUMNS.filter((c) => {
      const s = spread(rows.map((r) => r[c]))
      return s !== null && s > 0.03
    })
    // Reported to step 7 (not fixed in M15): H200 rents 5.9% and the GB200 NVL72 blend 3.1%, all s2 high.
    expect(failing).toEqual([
      'gpu_h200_hyperscaler_usd_hr',
      'gpu_h200_neocloud_usd_hr',
      'gpu_gb200nvl72_blended_usd_hr',
    ])
  })
})
