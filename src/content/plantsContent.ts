// Act V's plants (M52; doc 43 §7, §11 with §0.4; plants_v.json from doc 47): the operating classes' costs, capacity
// factors, contracted shares and capacity ratings; the valuation's contract tail; plant debt, its covenants, fund sales
// and output contracts. Validated with zod when first imported (only the fields the sim reads).
import { z } from 'zod'
import raw from './plants_v.json' with { type: 'json' }
import type { VentureType } from './energyContent.ts'

const nonNeg = z.number().nonnegative()
const share = z.number().min(0).max(1)

const thermal = z.object({
  fixed_usd_kw_yr: nonNeg,
  single_unit_fixed_mult: z.number().positive().optional(),
  var_usd_mwh: nonNeg,
  contracted_share_at_cod: share,
  capacity_rating_col: z.string().optional(),
  capacity_rating: share.optional(),
  follow_on: z
    .object({
      cost_mult_of_unit1_realised: z.number().positive().optional(),
      cost_usd_kw: z.number().positive().optional(),
      quarters: z.number().int().positive().optional(),
    })
    .nullable(),
})

const schema = z.object({
  classes: z.object({
    smr: thermal,
    adv_fission: thermal,
    egs: thermal.extend({ cf: z.object({ normal: share, weak_field: share }) }),
    fusion_pilot: thermal.extend({ cf: z.object({ pilot: share }), never_before: z.string() }),
    pumped: thermal.extend({
      hours: z.number().positive(),
      round_trip: share,
      capacity_regions: z.array(z.string()),
    }),
  }),
  valuation: z.object({
    contract_tail: z.object({
      years_left_le: z.number(),
      mult: z.number(),
      years_left_ge: z.number(),
      mult_long: z.number(),
    }),
  }),
  finance: z.object({
    debt_contracted: z.object({
      min_contracted_share: share,
      max_ltv: share,
      spread_bps: nonNeg,
      tenor_years: z.tuple([z.number().int(), z.number().int()]),
      sculpted_dscr: z.number().positive(),
    }),
    debt_merchant: z.object({
      max_ltv: share,
      spread_bps: nonNeg,
      tenor_years: z.number().int(),
      amort_pct_yr: nonNeg,
      cash_sweep: share,
    }),
    covenants: z.object({
      lock_up_below_dscr: z.number().positive(),
      restructure_after_q_below_1: z.number().int().positive(),
      restructure_stake_mult: share,
      lenders_take_after_q_below_1: z.number().int().positive(),
    }),
    contract_output: z.object({
      max_share: share,
      years: z.tuple([z.number().int(), z.number().int()]),
      price_vs_market: z.number(),
    }),
    fire_sale: z.object({ plant_stake: share, site_with_position: share }),
  }),
  // M53 (doc 43 §8 with §0.4): the queue's security, study bills, regions and fast lane
  queue: z.object({
    security_usd_kw: nonNeg,
    upgrade_bill: z.object({ median_col: z.record(z.string(), z.string()) }),
    region_map: z.record(z.string(), z.enum(['pjm', 'ercot', 'other'])),
    fast_lane: z.object({
      col: z.string(),
      curtail_h_yr_col: z.string(),
      output_loss: share,
      notice_hours: z.number().positive(),
      future_only: z.string(),
    }),
  }),
})

export const PLANTS = schema.parse(raw)
export type PlantClassId = keyof typeof PLANTS.classes

/** The plant class a venture type operates as in Act V (null: the control keeps Act IV's treatment, mine). */
export function plantClassOf(type: VentureType): PlantClassId | null {
  switch (type) {
    case 'egs':
    case 'egs2':
      return 'egs'
    case 'smr':
      return 'smr'
    case 'adv_fission':
      return 'adv_fission'
    case 'fusion':
      return 'fusion_pilot'
    case 'pumped':
      return 'pumped'
    default:
      return null
  }
}
