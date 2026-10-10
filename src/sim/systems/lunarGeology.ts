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

/** The sum of 12 uniform rolls minus 6: a standard normal value from + − only (replays never differ by browser). */
function normal(r: ReturnType<typeof substream>): number {
  let z = -6
  for (let i = 0; i < 12; i++) z += random(r)
  return z
}

/** e^x from + − × ÷ only (a 24-term series after halving: replays never differ by browser). */
function exp(x: number): number {
  let k = 0
  while (Math.abs(x) > 0.5) {
    x /= 2
    k++
  }
  let term = 1
  let sum = 1
  for (let n = 1; n < 24; n++) {
    term = (term * x) / n
    sum += term
  }
  for (let i = 0; i < k; i++) sum *= sum
  return sum
}

/**
 * M30.3: a site's true resource (t of water-bearing ice): the act's grade's tonnes × the site's ice access × a per-site
 * factor drawn once on its own substream. Sim-internal: only estimates leave this file for play.
 */
function trueResourceT(act4Seed: number, grade: LunarGrade, site: string, iceAccess: number): number {
  const r = substream(act4Seed, `act4_lunar_site:${site}`)
  return TRUTH.grades[grade].resource_t_per_site * iceAccess * exp(normal(r) * TRUTH.site_variance_sd_log)
}

/** The reveal only (act4End.ts, M32.1): a site's true resource, shown in the chapter report beside your estimates. */
export const revealSiteTruthT = trueResourceT

/**
 * A prospect report (doc 33 §9.2): the site's resource × exp(N(0, sd)) for the report's step (first prospect, a later
 * one, or a pilot that has run), with a 90% band. Median-unbiased; each step narrower. Rolled on its own substream per
 * site and report number.
 */
export function prospectReport(
  act4Seed: number,
  grade: LunarGrade,
  site: string,
  iceAccess: number,
  step: 'first' | 'second' | 'pilot',
  n: number,
): { estimateT: number; lowT: number; highT: number } {
  const sd = TRUTH.prospect_noise_sd_log[step]
  const r = substream(act4Seed, `act4_lunar_report:${site}:${n}`)
  const estimateT = trueResourceT(act4Seed, grade, site, iceAccess) * exp(normal(r) * sd)
  const band = exp(1.645 * sd)
  return { estimateT, lowT: estimateT / band, highT: estimateT * band }
}
