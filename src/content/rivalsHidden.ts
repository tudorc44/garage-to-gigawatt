// The HIDDEN view of rivals_act3.json (M11.5b): each rival's scripted fate for a scenario, and its D15
// review flag. Fates are part of the end-of-act reveal, so nothing may show them during play: only
// systems/act3End.ts (the reveal), tests and tools/ (release-check) import this file. A test greps src/.
import { z } from 'zod'
import rivalsRaw from './rivals_act3.json' with { type: 'json' }
import { SCENARIO_IDS, type ScenarioId } from './schemas.ts'

const schema = z.object({
  scenarios: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        name: z.string(),
        fate: z.string().min(1),
        d15_review: z.boolean(),
        /** Set once the owner's editorial review (with counsel) clears the fate (doc 27 §15; M20.1: both s1 flags). */
        d15_cleared: z.boolean().optional(),
        /** M20.1: who cleared it, when, and on what basis. */
        d15_note: z.string().optional(),
      }),
    ),
  ),
})

export interface RivalFate {
  rival: string
  name: string
  fate: string
  /** Doc 27 §15: needs an editorial/legal review before any public release. */
  d15Review: boolean
  /** Shown as "Fate withheld pending review": flagged for review and not cleared (M15.5's D15 guard). */
  withheld: boolean
}

/** The five rivals' fates in a scenario, in file order. */
export function rivalFates(id: ScenarioId): RivalFate[] {
  const all = schema.parse(rivalsRaw).scenarios[id]
  return Object.entries(all).map(([rival, r]) => ({
    rival,
    name: r.name,
    fate: r.fate,
    d15Review: r.d15_review,
    withheld: d15Withheld(r.d15_review, r.d15_cleared),
  }))
}

/** The D15 guard (M15.5, kept in M20.1): a flagged fate shows only once cleared. */
export function d15Withheld(review: boolean, cleared?: boolean): boolean {
  return review && cleared !== true
}

/** Every scenario's fates flagged for D15 review (for the release check). */
export function d15Items(): (RivalFate & { scenario: ScenarioId })[] {
  return SCENARIO_IDS.flatMap((scenario) =>
    rivalFates(scenario)
      .filter((f) => f.d15Review)
      .map((f) => ({ ...f, scenario })),
  )
}
