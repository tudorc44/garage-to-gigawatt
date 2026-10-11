// The HIDDEN view of Act V's signals files (M51, doc 43 §6.8): the authoring fields the player must never see (the
// future's name and reasoning, its trigger, its decoy's reason and tell, each indicator's true path and role tags).
// ONLY tests/, tools/ and src/sim/systems/act5End.ts may import this file (a test greps src/ for that).
import { z } from 'zod'
import signalsVV1Raw from './signals_v_v1.json' with { type: 'json' }
import signalsVV2Raw from './signals_v_v2.json' with { type: 'json' }
import signalsVV3Raw from './signals_v_v3.json' with { type: 'json' }
import signalsVV4Raw from './signals_v_v4.json' with { type: 'json' }
import { SIGNAL_IDS_V, vFutureId, type VFutureId } from './schemas.ts'

const quarter = z.string().regex(/^\d{4}Q[1-4]$/)

const hiddenSchema = z.object({
  future: vFutureId,
  future_name: z.string(),
  reasoning: z.string(),
  trigger: z.object({
    quarter,
    title: z.string(),
    body: z.string(),
    card_id: z.string(),
    signals_start_quarter: quarter,
    quarters_of_warning: z.number().int(),
  }),
  decoy: z.object({
    indicator: z.enum(SIGNAL_IDS_V),
    quarters: z.array(quarter).min(1),
    peak_quarter: quarter,
    name: z.string(),
    reason: z.string(),
    tell: z.string(),
    wrong_reading: vFutureId,
  }),
  indicators: z.array(
    z.object({
      id: z.enum(SIGNAL_IDS_V),
      label: z.string(),
      higher_means: z.string(),
      authoring_latent: z.array(z.number()),
      series: z.array(
        z.object({
          quarter,
          displayed: z.number(),
          arrow: z.enum(['up', 'down', 'flat']),
          role_tag: z.string(),
          sharp: z.object({ low: z.number(), high: z.number(), note: z.string() }),
        }),
      ),
    }),
  ),
})
export type SignalsHiddenV = z.output<typeof hiddenSchema>

const RAW: Record<VFutureId, unknown> = {
  v1: signalsVV1Raw,
  v2: signalsVV2Raw,
  v3: signalsVV3Raw,
  v4: signalsVV4Raw,
}

/** One future's full signals file, hidden fields included. For tests, tools and act5End only. */
export function signalsHiddenV(id: VFutureId): SignalsHiddenV {
  return hiddenSchema.parse(RAW[id])
}
