// Act IV's lunar content (M30.1; doc 33 §9, §11.2-11.3, §12): two files, validated with zod when this module is first
// imported (a malformed file throws, like any content file). The sim reads them through MOON. (The hidden truth, the
// grade and the noise, is lunar_truth.json, read only by sim/systems/lunarGeology.ts.)
import { z } from 'zod'
import lunarRaw from './lunar_iv.json' with { type: 'json' }
import claimsRaw from './lunar_claims_iv.json' with { type: 'json' }
import { quarterId } from './schemas.ts'

export const LUNAR_SITE_IDS = [
  'shackleton_ridge',
  'de_gerlache_ridge',
  'malapert_massif',
  'nobile_rim',
  'haworth_rim',
  'cabeus',
  'amundsen_rim',
  'leibnitz_beta',
] as const
export type LunarSiteId = (typeof LUNAR_SITE_IDS)[number]
export const LUNAR_CLAIMANT_IDS = ['accords_bloc', 'station_bloc', 'northgate', 'cratermark', 'jade_arc'] as const
export type LunarClaimantId = (typeof LUNAR_CLAIMANT_IDS)[number]
export const OFFTAKE_BUYER_IDS = ['accords_programme', 'station_programme', 'lander_operator'] as const
export type OfftakeBuyerId = (typeof OFFTAKE_BUYER_IDS)[number]
export const RESOURCE_CATEGORIES = ['inferred', 'indicated', 'measured'] as const
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

const share = z.number().min(0).max(1)
const usd = z.number().nonnegative()
const bw = z.number().int().min(0)
const range = z.tuple([z.number(), z.number()]).refine(([a, b]) => a <= b, 'a range runs low to high')

const lunarSchema = z.object({
  sites: z
    .array(
      z.object({
        id: z.enum(LUNAR_SITE_IDS),
        illumination: share,
        ice_access: z.number().positive(),
        max_kwe: z.number().positive(),
        bloc_interest: z.enum(['both', 'accords', 'station', 'none']),
      }),
    )
    .length(LUNAR_SITE_IDS.length),
  claim: z.object({ bandwidth: bw, fee_usd: usd, pc: z.number().int().min(0), land_within_quarters: z.number().int().min(1) }),
  dispute: z.object({ pc_to_hold: z.number().int().min(0), share_resource_share: share }),
  inferred_t_per_site: z.number().positive(),
  category_confidence: z.object({ inferred: share, indicated: share, measured: share }),
  stage_factor: z.object({ claim: share, pilot: share, production: share }),
  presence_value_usd: usd,
  mission: z.object({
    bandwidth: bw,
    payload_kg: z.number().positive(),
    rover_drill_usd: usd,
    lead_quarters: range,
    abort_delay_quarters: z.number().int().min(1),
    abort_cost_usd: usd,
  }),
  power: z.object({
    solar: z.object({
      sizes_kwe: z.array(z.number().positive()).min(1),
      kg_per_kwe: z.number().positive(),
      hardware_usd_per_kwe: usd,
      build_quarters: z.number().int().min(0),
      bandwidth: bw,
    }),
    reactor: z.object({
      kwe: z.number().positive(),
      from: quarterId,
      setup_usd: usd,
      lease_usd_q: usd,
      bloc: z.enum(['accords', 'station']),
      bandwidth: bw,
    }),
    megawatt_contract: z.object({ mwe: z.number().positive(), from: quarterId, fee_usd: usd, bandwidth: bw }),
  }),
  pilot: z.object({
    bandwidth: bw,
    min_kwe: z.number().positive(),
    base_usd: usd,
    mass_t: z.number().positive(),
    build_quarters: z.number().int().min(1),
    t_water_per_kwe_yr: z.number().positive(),
    efficiency: share,
    llo_share: share,
    measured_after_quarters: z.number().int().min(1),
    dust_loss_share_q: share,
    maintenance_usd_q: usd,
  }),
  production: z.object({
    bandwidth: bw,
    capex_usd: usd,
    first_output_quarters: range,
    draw_quarters: z.number().int().min(1),
  }),
  offtake: z.object({
    bandwidth: bw,
    volume_t_yr: range,
    term_quarters: z.number().int().min(1),
    price_spread: range,
    prepay_share: share,
    buyers: z.array(z.enum(OFFTAKE_BUYER_IDS)).min(1),
    backlog_weight: share,
  }),
  alerts: z.object({ dust_fault_chance_q: share, dust_repair_usd: usd, dust_accept_loss_share: share }),
})

const claim = z.object({
  claimant: z.enum(LUNAR_CLAIMANT_IDS),
  site: z.enum(LUNAR_SITE_IDS),
  claim: quarterId,
  lands: quarterId,
})
const claimsSchema = z.object({
  futures: z.object({ f1: z.array(claim), f2: z.array(claim), f3: z.array(claim), f4: z.array(claim) }),
})

/** The lunar content, checked. */
export const MOON = {
  ...lunarSchema.parse(lunarRaw),
  claims: claimsSchema.parse(claimsRaw).futures,
}

export const lunarSite = (id: LunarSiteId) => MOON.sites.find((s) => s.id === id)!
