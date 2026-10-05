// The HIDDEN view of Act IV's signals files (M28.1, doc 33 §6.8): the authoring fields the player must never see (the
// future's name and reasoning, its trigger, its decoy's reason and tell, each indicator's true path and role tags).
// ONLY tests/, tools/ and src/sim/systems/act4End.ts may import this file (a test greps src/ for that).
import { z } from 'zod'
import signalsIvF1Raw from './signals_iv_f1.json' with { type: 'json' }
import signalsIvF2Raw from './signals_iv_f2.json' with { type: 'json' }
import signalsIvF3Raw from './signals_iv_f3.json' with { type: 'json' }
import signalsIvF4Raw from './signals_iv_f4.json' with { type: 'json' }
import { SIGNAL_IDS_IV, futureId, type FutureId } from './schemas.ts'

const quarter = z.string().regex(/^\d{4}Q[1-4]$/)

const hiddenSchema = z.object({
  future: futureId,
  future_name: z.string(),
  reasoning: z.string(),
  trigger: z.object({
    quarter,
    title: z.string(),
    card_id: z.string(),
    signals_start_quarter: quarter,
    quarters_of_warning: z.number().int(),
  }),
  decoy: z.object({
    indicator: z.enum(SIGNAL_IDS_IV),
    quarters: z.array(quarter),
    peak_quarter: quarter,
    reason: z.string(),
    tell: z.string(),
  }),
  indicators: z.array(
    z.object({
      id: z.enum(SIGNAL_IDS_IV),
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
export type SignalsHiddenIv = z.output<typeof hiddenSchema>

const RAW: Record<FutureId, unknown> = {
  f1: signalsIvF1Raw,
  f2: signalsIvF2Raw,
  f3: signalsIvF3Raw,
  f4: signalsIvF4Raw,
}

/** One future's full signals file, hidden fields included. For tests, tools and act4End only. */
export function signalsHiddenIv(id: FutureId): SignalsHiddenIv {
  return hiddenSchema.parse(RAW[id])
}
