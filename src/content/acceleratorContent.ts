// The accelerator venture (M54; doc 43 §0.10 with §0.12, doc 49): Halyard Silicon and its chip, Halyard Bowline.
// venture_accelerator.json is written by tools/act5/chips.py (npm run content:act5); validated with zod when first
// imported (only the fields the sim reads). Its hazards and draws are rules the engine reads; no screen shows them.
import { z } from 'zod'
import raw from './venture_accelerator.json' with { type: 'json' }

const share = z.number().min(0).max(1)
const range = z.tuple([z.number(), z.number()])

const schema = z.object({
  types: z.object({
    accelerator: z.object({
      developer: z.string(),
      chip: z.string(),
      from: z.string().regex(/^\d{4}Q[1-4]$/),
      pitch: z.object({ budget_usd: z.number().positive(), volume: z.string() }),
      diligence: z.object({ bandwidth: z.number().int(), fee_usd: z.number().nonnegative() }),
      overrun_class: z.object({ median: z.number().positive(), sigma: z.number().nonnegative(), cap: z.number().positive() }),
      equity_shares: z.array(share).min(1),
      milestones: z
        .array(
          z.object({
            id: z.string(),
            pitched: z.string(),
            pitch_q_from_start: z.number().int().optional(),
            pitch_q_after_previous: z.number().int().optional(),
          }),
        )
        .length(4),
      slip: z.object({ median: z.number().positive(), sigma: z.number().nonnegative(), floor: z.number(), cap: z.number() }),
      respin: z.object({
        chance: share,
        second_chance: share,
        delay_q: z.array(z.number().int()).min(1),
        cash_call_share_of_pitch: share,
      }),
      hazard_per_year_before_volume: z.object({ cancel: share, acquired_gain: share, acquired_loss: share }),
      acquisition: z.object({
        gain: z.object({ stake_paid_mark_mult: range, player_can_block_with_stake_ge: share }),
        loss: z.object({ stake_paid_paid_in_mult: range }),
      }),
      allocation_reservation: z.object({
        menu: z.array(z.object({ deposit_share: share, discount: share })).min(1),
        reserved_mw: z.array(z.number().positive()).min(1),
        must_take_delivery_within_q: z.number().int().positive(),
      }),
      foundry_allocation: z.object({ chance_at_volume: share, units_cap_share: share, quarters: z.number().int() }),
      after_volume: z.object({
        units_ramp_by_quarter_since_volume: z.array(share).min(1),
        ebitda_share_of_price_by_year_since_volume: z.array(share).min(1),
      }),
      marks: z.object({ milestone_mult: z.number().positive(), slip_mult: z.number().positive() }),
      targets: z.object({ p_volume_within_8_years: share }),
      calibration_check: z.object({ p_volume_within_8_years: share }).passthrough(),
    }),
  }),
})

export const ACCELERATOR = schema.parse(raw).types.accelerator
const M = ACCELERATOR.milestones
/** The pitched quarters per phase: tape-out from the start, then each after the previous (doc 49 with §0.12). */
export const ACCEL_PITCH_Q = {
  tape_out: M[0].pitch_q_from_start ?? 0,
  first_silicon: M[1].pitch_q_after_previous ?? 0,
  qualification: M[2].pitch_q_after_previous ?? 0,
  volume: M[3].pitch_q_after_previous ?? 0,
}
