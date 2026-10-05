// Act IV's presets (M32.4; doc 33 §3.4): three 2030Q4 companies, each a recipe (a bot, a seed and an Act III scenario
// played from 2017), written by the sim (tools/act4/presets.ts). Validated with zod when first imported.
import { z } from 'zod'
import raw from './presets_act4.json' with { type: 'json' }
import { scenarioId } from './schemas.ts'

export const ACT4_PRESET_IDS = ['fortress', 'neocloud', 'ridge'] as const
export type Act4PresetId = (typeof ACT4_PRESET_IDS)[number]

const schema = z.object({
  presets: z
    .array(
      z.object({
        id: z.enum(ACT4_PRESET_IDS),
        bot: z.string().min(1),
        seed: z.number().int(),
        act3_scenario: scenarioId,
        valuation_usd_m: z.number(),
        founder_net_worth_usd_m: z.number(),
        cash_usd_m: z.number(),
        debt_usd_m: z.number(),
        energized_mw: z.number(),
        contracted_mw: z.number(),
        cloud_mw: z.number(),
        sites_with_power: z.number().int(),
        rating: z.string().nullable(),
      }),
    )
    .length(ACT4_PRESET_IDS.length),
})

export const PRESETS_IV = schema.parse(raw).presets
