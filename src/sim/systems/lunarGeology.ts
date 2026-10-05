// The lunar geology system (M28.3; doc 33 §6.4, §9.2, §9.4, §6.8; IV-D9). The ONLY reader of the hidden file
// src/content/lunar_truth.json besides act4End.ts (the reveal), tests/ and tools/ (grep-tested). It draws the act's lunar
// grade at the Act III → IV boundary (on its own substream, independent of the future) and, from M30, turns the truth into
// noisy prospect estimates. Nothing it returns to play is the truth itself: only estimates (M30).
import { z } from 'zod'
import raw from '../../content/lunar_truth.json' with { type: 'json' }
import { random, substream } from '../rng.ts'

export const LUNAR_GRADES = ['rich', 'patchy', 'dry'] as const
export type LunarGrade = (typeof LUNAR_GRADES)[number]

const gradeSchema = z.object({
  water_wt_pct: z.number().positive(),
  pilot_grade_factor: z.number().min(0).max(1),
  resource_t_per_site: z.number().positive(),
  note: z.string(),
})
const lunarTruthSchema = z.object({
  grade_weights_pct: z.object({ rich: z.number(), patchy: z.number(), dry: z.number() }),
  grades: z.object({ rich: gradeSchema, patchy: gradeSchema, dry: gradeSchema }),
  site_variance_sd_log: z.number().nonnegative(),
  prospect_noise_sd_log: z.object({
    first: z.number().nonnegative(),
    second: z.number().nonnegative(),
    pilot: z.number().nonnegative(),
  }),
})

/** The validated hidden file (throws at load if it's malformed, like any content file). */
const TRUTH = lunarTruthSchema.parse(raw)

/**
 * The act's lunar grade (doc 33 §6.4: Rich 20%, Patchy 50%, Dry 30% ⚙), drawn from substream(act4Seed,
 * "act4_lunar_grade"): independent of the future draw and of the main RNG, so no earlier act's game changes.
 */
export function drawLunarGrade(act4Seed: number): LunarGrade {
  const roll = random(substream(act4Seed, 'act4_lunar_grade')) * 100
  let acc = 0
  for (const g of LUNAR_GRADES) {
    acc += TRUTH.grade_weights_pct[g]
    if (roll < acc) return g
  }
  return LUNAR_GRADES[LUNAR_GRADES.length - 1]
}

/** A grade's pilot output factor (doc 33 §9.4: Rich 1.0, Patchy 0.5, Dry 0.15 ⚙). Sim-internal: never shown. */
export function pilotGradeFactor(grade: LunarGrade): number {
  return TRUTH.grades[grade].pilot_grade_factor
}
