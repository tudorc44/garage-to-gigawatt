// M11.4a: the Act III market-data layer. quarterInputs() gives every Act II system its quarterly
// inputs in both acts: Act II's own act2Quarter() there, the drawn scenario's market_sN.csv row here.
// No system reads it for Act III yet (the gates open in M11.4c), so nothing else changes.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  act2Quarter,
  actFirstQuarter,
  actLastQuarter,
  quarterInputs,
  type Act2Quarter,
} from '../../src/content/index.ts'

/** Every numeric leaf of an Act II-shaped record, by dotted path (null stays null). */
function leaves(o: unknown, prefix = ''): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    if (v && typeof v === 'object')
      Object.assign(out, leaves(v, `${prefix}${k}.`))
    else if (typeof v === 'number' || v === null) out[`${prefix}${k}`] = v
  }
  return out
}

const FIRST = actFirstQuarter(3)
const LAST = actLastQuarter(3)

describe('quarterInputs: Act I and II are exactly act2Quarter', () => {
  it('returns act2Quarter’s own record (same object) for every quarter before Act III', () => {
    for (let q = -32; q <= actLastQuarter(2); q++)
      expect(quarterInputs(q)).toBe(act2Quarter(q))
    // a scenario passed for an earlier quarter changes nothing
    for (const id of SCENARIO_IDS)
      for (let q = 0; q <= actLastQuarter(2); q++)
        expect(quarterInputs(q, id)).toBe(act2Quarter(q))
  })

  it('an Act III quarter without a scenario throws, like marketWeek', () => {
    for (let q = FIRST; q <= LAST; q++)
      expect(() => quarterInputs(q)).toThrow(/Act III.*scenario/)
  })
})

describe('quarterInputs in Act III: the scenario row, in Act II’s shape', () => {
  it('every Act II field resolves for all 16 quarters × 4 scenarios, from the same-named column', () => {
    for (const id of SCENARIO_IDS)
      for (let q = FIRST; q <= LAST; q++) {
        const r = CONTENT.act3Scenarios[id].quarterly[q - FIRST]
        const i = quarterInputs(q, id)!
        expect(i.quarter).toBe(r.quarter)
        expect(i.gpuRentalUsdHr).toEqual({
          h100: {
            hyperscaler: r.gpu_h100_hyperscaler_usd_hr,
            neocloud: r.gpu_h100_neocloud_usd_hr,
            spot: r.gpu_h100_spot_usd_hr,
            contract1y: r.gpu_h100_1yr_contract_usd_hr,
          },
          a100Hyperscaler: r.gpu_a100_hyperscaler_usd_hr,
          h200: {
            hyperscaler: r.gpu_h200_hyperscaler_usd_hr,
            neocloud: r.gpu_h200_neocloud_usd_hr,
          },
          b200: {
            hyperscaler: r.gpu_b200_hyperscaler_usd_hr,
            neocloud: r.gpu_b200_neocloud_usd_hr,
          },
          gb200Blended: r.gpu_gb200nvl72_blended_usd_hr,
        })
        expect(i.gpuPurchaseUsd).toEqual({
          h100: r.h100_unit_purchase_usd,
          h100Hgx8: r.h100_hgx8_system_usd,
          h200: r.h200_unit_purchase_usd,
          b200: r.b200_unit_purchase_usd,
          gb200Rack: r.gb200_nvl72_rack_usd,
        })
        expect(i.capexUsdMw).toEqual({
          gpuHallToHosting: r.capex_hosting_usd_mw,
          retrofitShell: r.capex_retrofit_shell_usd_mw,
          greenfieldShell: r.capex_greenfield_shell_usd_mw,
          fullstackIncremental: r.capex_fullstack_incremental_usd_mw,
        })
        expect(i.sofrPct).toBe(r.sofr_pct)
        expect(i.hySpreadBps).toBe(r.hy_spread_bps)
        expect(i.ddtlSpreadBps).toBe(r.ddtl_spread_bps)
        expect(i.capRateHyperscalePct).toBe(r.cap_rate_hyperscale_pct)
        expect(i.multiple).toEqual({
          mining: r.mining_ev_ebitda_mult,
          aiInfra: r.ai_infra_ev_ebitda_mult,
        })
        expect(i.evPerMwUsdM).toEqual({
          mining: r.ev_per_mw_mining_usd_m,
          aiAnnounced: r.ev_per_mw_ai_announced_usd_m,
          aiStabilized: r.ev_per_mw_ai_stabilized_usd_m,
        })
        expect(i.powerUsdKwh).toEqual({
          ercot: r.power_usd_kwh_ercot,
          pjm: r.power_usd_kwh_pjm,
          ohio: r.power_usd_kwh_ohio,
          georgia: r.power_usd_kwh_georgia,
          arizona: r.power_usd_kwh_arizona,
          nordics: r.power_usd_kwh_nordics,
        })
        expect(i.pjmCapacityUsdMwDay).toBe(r.pjm_capacity_price_usd_mwday)
        expect(i.hyperscalerCapexUsdBnQ).toBe(r.hyperscaler_capex_usd_bn_q)
        expect(i.aiDemandIndex).toBe(r.ai_demand_index_0_100)
      }
  })

  it('only the A100 hyperscaler rent is empty (undefined, as in Act II); every other field has a value', () => {
    for (const id of SCENARIO_IDS)
      for (let q = FIRST; q <= LAST; q++) {
        const empty = Object.entries(leaves(quarterInputs(q, id)))
          .filter(([, v]) => v === null)
          .map(([k]) => k)
        expect(empty, `${id} ${CONTENT.quarters[q]}`).toEqual([
          'gpuRentalUsdHr.a100Hyperscaler',
        ])
      }
    // ...as it is in Act II's last quarter.
    expect(
      leaves(act2Quarter(actLastQuarter(2)))['gpuRentalUsdHr.a100Hyperscaler'],
    ).toBeNull()
  })

  it('does not read the Rubin, nuclear, renewal, RFP or walk columns, nor the hidden phase and scenario', () => {
    for (const id of SCENARIO_IDS) {
      const text = JSON.stringify(quarterInputs(FIRST, id))
      for (const bad of [
        'rubin',
        'nuclear',
        'renewal',
        'rfp',
        'walk',
        'phase',
        'scenario',
        'lead_time',
      ])
        expect(text.toLowerCase()).not.toContain(bad)
    }
  })
})

describe('the seam: 2027Q1 against 2026Q4', () => {
  // Fields the delivered data moves more than ±10% across the boundary (M11.4a: listed, not fixed).
  const KNOWN_OUTLIERS = [
    'gpuRentalUsdHr.h200.hyperscaler',
    'hyperscalerCapexUsdBnQ',
  ]

  it('the rebased multiples equal Act II’s 2026Q4 anchors exactly (AI 15×, mining 5×)', () => {
    const a2 = act2Quarter(actLastQuarter(2))!
    expect(a2.multiple).toEqual({ mining: 5, aiInfra: 15 })
    for (const id of SCENARIO_IDS)
      expect(quarterInputs(FIRST, id)!.multiple).toEqual(a2.multiple)
  })

  it('every other field is within ±10% of 2026Q4, except the known outliers', () => {
    const a2 = leaves(act2Quarter(actLastQuarter(2)))
    for (const id of SCENARIO_IDS) {
      const now = leaves(quarterInputs(FIRST, id))
      const over: string[] = []
      for (const [k, v] of Object.entries(now)) {
        if (k.startsWith('multiple.')) continue
        const o = a2[k]
        if (v === null || o === null) {
          expect(v, `${id} ${k}`).toBe(o)
          continue
        }
        if (o !== 0 && Math.abs(v / o - 1) > 0.1) over.push(k)
      }
      expect(over.sort(), `${id} fields over ±10%`).toEqual(
        [...KNOWN_OUTLIERS].sort(),
      )
    }
  })
})

describe('the Act III scenario rows in the timeline', () => {
  it('has 16 inputs per scenario, on the timeline’s labels', () => {
    for (const id of SCENARIO_IDS) {
      const inputs = CONTENT.act3Scenarios[id].inputs
      expect(inputs).toHaveLength(16)
      expect(inputs.map((r: Act2Quarter) => r.quarter)).toEqual(
        CONTENT.quarters.slice(FIRST, LAST + 1),
      )
    }
    expect(BALANCE.act3.scenarioWeightsPct.s0).toBe(25) // M11.1's draw is untouched
  })
})
