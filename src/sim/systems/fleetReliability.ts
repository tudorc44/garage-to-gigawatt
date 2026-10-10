// The fleet reliability system (M28.3; doc 33 §6.2, §6.5, §6.8; IV-D16). The ONLY reader of the hidden file
// src/content/orbit_truth_iv.json besides act4End.ts (the reveal), tests/ and tools/ (grep-tested). From M29 it draws
// each live orbital block's quarterly failures (its telemetry) from the future's true rate with seeded noise; play only
// ever sees that telemetry, never the true rate or life.
import { z } from 'zod'
import raw from '../../content/orbit_truth_iv.json' with { type: 'json' }
import type { FutureId } from '../../content/index.ts'

const reliability = z.object({
  gpu_failure_pct_yr: z.number().positive(),
  useful_life_years: z.number().positive(),
})
const orbitTruthSchema = z.object({
  planning_assumption: reliability,
  futures: z.object({ f1: reliability, f2: reliability, f3: reliability, f4: reliability }),
  telemetry_noise_sd_pct_points: z.number().nonnegative(),
  space_ops_chief_noise_mult: z.number().positive(),
})

/** The validated hidden file (throws at load if it's malformed, like any content file). */
const TRUTH = orbitTruthSchema.parse(raw)

/** The future's true orbital GPU failure rate (a share a year) and useful life (years). Sim-internal: never shown. */
export function trueReliability(future: FutureId): { failureShareYr: number; lifeYears: number } {
  const f = TRUTH.futures[future]
  return { failureShareYr: f.gpu_failure_pct_yr / 100, lifeYears: f.useful_life_years }
}

/** The telemetry noise (yearly percentage points, before the Space Operations Chief's narrowing). */
export const TELEMETRY = {
  noiseSdPctPoints: TRUTH.telemetry_noise_sd_pct_points,
  spaceOpsNoiseMult: TRUTH.space_ops_chief_noise_mult,
}
