// Act V's presets (M49; doc 43 §3.4, §0.8, §0.9 item 11): 2035Q4 companies, each a recipe (an Act IV preset's line, an
// Act IV future and seed, and the ventures or battery the Balanced archetype adds), written by the sim
// (tools/act5/presets.ts). Each carries its Act IV future into Act V. Validated with zod when first imported.
import { z } from 'zod'
import raw from './presets_v.json' with { type: 'json' }
import { ACT4_PRESET_IDS } from './presetsAct4.ts'
import { futureId } from './schemas.ts'

// (doc 43 §0.14 item 1: Small Grid is cut; two presets ship)
export const ACT5_PRESET_IDS = ['firm_builder', 'orbital_landlord'] as const
export type Act5PresetId = (typeof ACT5_PRESET_IDS)[number]

const schema = z.object({
  presets: z.array(
    z.object({
      id: z.enum(ACT5_PRESET_IDS),
      /** Doc 43 §0.17 item 2: the preset's description (the Start at Act V screen's line). */
      description: z.string().optional(),
      act4_preset: z.enum(ACT4_PRESET_IDS),
      act4_future: futureId,
      act4_seed: z.number().int(),
      joins: z.union([z.literal('btm'), z.array(z.string())]),
      join_from: z.string().optional(),
      queue: z.boolean().optional(),
      vb7_busts: z.number().int().optional(),
      vb7_runs: z.number().int().optional(),
      valuation_usd_m: z.number(),
      founder_net_worth_usd_m: z.number(),
      cash_usd_m: z.number(),
      debt_usd_m: z.number(),
      energized_mw: z.number(),
      free_mw: z.number(),
      lease_share: z.number(),
      orbit_share: z.number(),
      rating: z.string().nullable(),
    }),
  ),
})

/** The presets the scan found (a description no company fitted is left out and reported, not targeted). */
export const PRESETS_V = schema.parse(raw).presets
