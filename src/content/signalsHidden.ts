// The HIDDEN view of Act III's signals files (M11.2): the authoring fields the player must never see.
// ONLY tests/ and tools/ (the oracle script) may import this file. src/ui, selectors, systems and
// player bots must not: the files' own DO_NOT_EXPOSE rule and M8.9 answer 3. A test greps src/ for that.
import { z } from 'zod'
import signalsS0Raw from './signals_s0.json' with { type: 'json' }
import signalsS1Raw from './signals_s1.json' with { type: 'json' }
import signalsS2Raw from './signals_s2.json' with { type: 'json' }
import signalsS3Raw from './signals_s3.json' with { type: 'json' }
import { SIGNAL_IDS, scenarioId, type ScenarioId } from './schemas.ts'

const quarter = z.string().regex(/^\d{4}Q[1-4]$/)

const hiddenSchema = z.object({
  scenario: scenarioId,
  scenario_name: z.string(),
  reasoning: z.string(),
  trigger: z.object({
    quarter,
    title: z.string(),
    card_id: z.string(),
    signals_start_quarter: quarter,
    quarters_of_warning: z.number().int(),
  }),
  decoy: z.object({
    indicator: z.enum(SIGNAL_IDS),
    quarters: z.array(quarter),
    peak_quarter: quarter,
    /** Why it moved, and the tell (M13.3: shown in the chapter report's reveal). */
    reason: z.string(),
    tell: z.string(),
  }),
  indicators: z.array(
    z.object({
      id: z.enum(SIGNAL_IDS),
      label: z.string(),
      higher_means: z.string(),
      role_in_scenario: z.string(),
      authoring_latent: z.unknown(),
      series: z.array(
        z.object({
          quarter,
          displayed: z.number(),
          arrow: z.enum(['up', 'down', 'flat']),
          role_tag: z.string().optional(),
          sharp: z.object({
            low: z.number(),
            high: z.number(),
            note: z.string(),
          }),
        }),
      ),
    }),
  ),
})
export type SignalsHidden = z.output<typeof hiddenSchema>

const RAW: Record<ScenarioId, unknown> = {
  s0: signalsS0Raw,
  s1: signalsS1Raw,
  s2: signalsS2Raw,
  s3: signalsS3Raw,
}

/** One scenario's full signals file, hidden fields included. For tests and oracle scripts only. */
export function signalsHidden(id: ScenarioId): SignalsHidden {
  return hiddenSchema.parse(RAW[id])
}
