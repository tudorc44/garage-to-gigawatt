// Energy options (M35, doc 38 §4): energy.json (the rules) and market_energy.json (the prices by year, 2009-2040),
// validated with zod when this module is first imported (a malformed file throws, like any content file). The sim
// reads them through ENERGY. Every value's source and grade: docs/energy-content/README.md.
import { z } from 'zod'
import energyRaw from './energy.json' with { type: 'json' }
import marketEnergyRaw from './market_energy.json' with { type: 'json' }
import venturesRaw from './ventures.json' with { type: 'json' }
import { quarterId } from './schemas.ts'

export const OWNED_KINDS = ['rooftop_solar', 'small_wind', 'home_battery'] as const
export type OwnedKind = (typeof OWNED_KINDS)[number]
export const SITE_ASSET_KINDS = ['bess', 'btm_solar', 'btm_wind', 'iron_air'] as const
export type SiteAssetKind = (typeof SITE_ASSET_KINDS)[number]
export type EnergyKind = OwnedKind | SiteAssetKind
export const SPECIAL_SITE_KINDS = ['pud', 'muni', 'quebec', 'iceland', 'flare'] as const
export type SpecialSiteKind = (typeof SPECIAL_SITE_KINDS)[number]
export const SUMMERS = ['mild', 'normal', 'hot'] as const
export type Summer = (typeof SUMMERS)[number]
export const OVERRUN_CLASSES = ['nuclear', 'pumped_hydro', 'thermal', 'wind', 'transmission', 'solar'] as const
export type OverrunClass = (typeof OVERRUN_CLASSES)[number]

const share = z.number().min(0).max(1)
const pos = z.number().positive()
const nonneg = z.number().nonnegative()
const quarters = z.number().int().min(0)
const range = z.tuple([nonneg, nonneg])
const PRICE_COLS = [
  'res_solar_usd_w',
  'small_wind_usd_kw',
  'home_battery_usd_kwh',
  'bess_usd_kwh_us',
  'utility_solar_usd_kw',
  'utility_wind_usd_kw',
  'iron_air_usd_kwh',
] as const
export type EnergyPriceCol = (typeof PRICE_COLS)[number]
const priceCol = z.enum(PRICE_COLS)
const byYear = z.record(z.string().regex(/^\d{4}$/), nonneg)

const specialKindSchema = z.object({
  tier: z.string(),
  kw: pos,
  power_usd_kwh: byYear.optional(),
  running_usd_mwh: nonneg.optional(),
  genset_usd_kw: nonneg.optional(),
  rent_usd_q: nonneg,
  capex_usd: nonneg.optional(),
  build_quarters: quarters,
  from: quarterId,
  until: quarterId,
  cooling_mult: pos.optional(),
  town_hall_per_year: share.optional(),
  town_hall_heat: z.number().optional(),
  green: z.boolean().optional(),
  delivery_extra_quarters: quarters.optional(),
  mining_only: z.boolean().optional(),
  queue: z.enum(['hydro', 'iceland']).optional(),
})

/**
 * A reference class's cost multiplier (doc 38 §5.1): lognormal (median, σ), capped; or, refitted (design thread, 9 Oct
 * 2026, answer 6), with chance p_under a draw in `under`, else 1 + X with X lognormal (x_median, x_sigma). `median`
 * stays the class median diligence quotes.
 */
const overrunClassSchema = z.object({
  median: pos,
  sigma: nonneg,
  cap: pos,
  p_under: share.optional(),
  under: range.optional(),
  x_median: pos.optional(),
  x_sigma: nonneg.optional(),
})

const ownedBase = {
  from: quarterId,
  until: quarterId,
  price_col: priceCol,
  price_unit: z.enum(['usd_w', 'usd_kw', 'usd_kwh']),
  build_quarters: quarters,
  lifetime_years: pos,
}

const energySchema = z.object({
  crf: z.object({ rate: pos, years: pos }),
  itc: z.object({
    steps: z.array(z.object({ from: quarterId, pct: z.number().min(0).max(100) })).min(1),
    applies_to: z.array(z.enum(OWNED_KINDS)),
  }),
  net_metering_until: quarterId,
  daylight_share: share,
  owned: z.object({
    rooftop_solar: z.object({
      ...ownedBase,
      running_usd_kw_yr: nonneg,
      cf: share,
      cf_by_region: z.record(z.string(), share),
      roof_kw: z.record(z.string(), pos),
      sizes_kw: z.array(pos).min(1),
      heat_once: z.object({ tiers: z.array(z.string()), delta: z.number() }),
    }),
    small_wind: z.object({
      ...ownedBase,
      running_usd_kw_yr: nonneg,
      cf_pitched: share,
      cf_realised: range,
      limit_kw: z.record(z.string(), pos),
      sizes_kw: z.array(pos).min(1),
      breakdown_per_year: share,
      repair_share_of_capex: share,
      noise_per_year: share,
      noise_heat: z.number(),
      overrun_class: z.enum(OVERRUN_CLASSES),
    }),
    home_battery: z.object({
      ...ownedBase,
      block_kwh: pos,
      machines_per_block: z.number().int().min(1),
      ride_through_hours: pos,
      max_blocks: z.record(z.string(), z.number().int().min(1)),
      fire_per_year: share,
      fire_damage_usd: nonneg,
    }),
  }),
  special_sites: z.object({
    kinds: z.object({
      pud: specialKindSchema,
      muni: specialKindSchema,
      quebec: specialKindSchema,
      iceland: specialKindSchema,
      flare: specialKindSchema,
    }),
    requires_tier_index: z.number().int().min(0),
    queues: z.object({
      hydro: z.object({
        per_quarter: z.number().int().min(1),
        flood_quarter: quarterId,
        moratorium_from: quarterId,
        moratorium_quarters: z.tuple([quarters, quarters]),
        tariff_new_load_mult: range,
        tariff_existing_mult: pos,
      }),
      iceland: z.object({
        per_quarter: z.number().int().min(1),
        freezes: z.array(z.object({ from: quarterId, quarters: quarters })),
      }),
    }),
    flare: z.object({
      cf_first_quarters: quarters,
      cf: share,
      decline_per_quarter: share,
      relocate_downtime_quarters: quarters,
      relocate_wear_share: share,
      relocate_usd_kw: nonneg,
      genset_fail_per_quarter: share,
      genset_fail_weeks: quarters,
      heat_once: z.number(),
      tax_break: z.object({ from: quarterId, running_mult: pos }),
      accident_per_year: share,
      accident_heat: z.number(),
      accident_usd: nonneg,
    }),
  }),
  texas: z.object({
    from: quarterId,
    contract: z.enum(['fixed', 'index']),
    dr_usd_mw_yr: z.object({ mild: nonneg, normal: nonneg, hot: nonneg }),
    /** M39.1 (doc 41): resale of a fixed-price site's curtailed power, paid with the DR credit. */
    resale_usd_mw_yr: z.object({ mild: nonneg, normal: nonneg, hot: nonneg }),
    resale_contract: z.enum(['fixed', 'index']),
    dr_paid_quarter_of_year: z.number().int().min(1).max(4),
    refusal_forfeits_year: z.boolean(),
    four_cp: z.object({
      q3_output_loss: share,
      /** M39.1: the flat saving per enrolled MW off the next year's power, by that year (the last step at or before it). */
      saving_usd_mw_yr: z.array(z.object({ from: z.string().regex(/^\d{4}$/), usd: nonneg })).min(1),
    }),
    backlash: z.object({ payment_usd: pos, heat: z.number(), anger: z.number() }),
  }),
  site_assets: z.object({
    bess: z.object({
      from: quarterId,
      price_col: priceCol,
      region_mult: z.record(z.string(), pos),
      hours: z.array(z.number().int().positive()).min(1),
      hours_act4: z.array(z.number().int().positive()).min(1),
      sizes_mw: z.array(pos).min(1),
      running_usd_kw_yr: nonneg,
      round_trip_loss: share,
      build_quarters: quarters,
      lifetime_years: pos,
      fade_per_year: share,
      overrun_class: z.enum(OVERRUN_CLASSES),
      capacity_derate: z.record(z.string(), share),
      capacity_regions: z.array(z.string()),
      capacity_from: quarterId,
      fire_per_year: share,
      fire_heat: z.number(),
      fire_repair_share: share,
      firm_share: share,
      /** M39.4 (doc 41): ERCOT ancillary-services income per MW of battery power, $ a year, by year (paid quarterly). */
      ercot_ancillary_usd_mw_yr: z.array(z.object({ from: z.string().regex(/^\d{4}$/), usd: nonneg })).optional(),
    }),
    btm_solar: z.object({
      from: quarterId,
      price_col: priceCol,
      sizes_mw: z.array(pos).min(1),
      running_usd_kw_yr: nonneg,
      cf_by_region: z.record(z.string(), share),
      build_quarters: quarters,
      overrun_class: z.enum(OVERRUN_CLASSES),
      heat_once: z.number(),
      rural_tiers: z.array(z.string()),
      land_mw_per_site_mw: pos,
    }),
    btm_wind: z.object({
      from: quarterId,
      price_col: priceCol,
      sizes_mw: z.array(pos).min(1),
      running_usd_kw_yr: nonneg,
      cf_by_region: z.record(z.string(), share),
      build_quarters: quarters,
      overrun_class: z.enum(OVERRUN_CLASSES),
      heat_once: z.number(),
      complaint_per_year: share,
      complaint_heat: z.number(),
      rural_tiers: z.array(z.string()),
      land_mw_per_site_mw: pos,
    }),
    iron_air: z.object({
      from: quarterId,
      price_col: priceCol,
      hours: pos,
      sizes_mw: z.array(pos).min(1),
      round_trip: share,
      build_quarters: quarters,
      slip_chance: share,
      slip_quarters: quarters,
      lifetime_years: pos,
      overrun_class: z.enum(OVERRUN_CLASSES),
      firm_share: share,
    }),
  }),
  overrun_classes: z.object(
    Object.fromEntries(OVERRUN_CLASSES.map((k) => [k, overrunClassSchema])) as Record<OverrunClass, typeof overrunClassSchema>,
  ),
})

const price = nonneg.nullable()
const marketEnergySchema = z
  .array(
    z.object({
      year: z.number().int().min(2009).max(2040),
      res_solar_usd_w: price,
      small_wind_usd_kw: price,
      home_battery_usd_kwh: price,
      bess_usd_kwh_us: price,
      utility_solar_usd_kw: price,
      utility_wind_usd_kw: price,
      iron_air_usd_kwh: price,
      texas_summer: z.union([z.enum(SUMMERS), z.literal('')]),
    }),
  )
  .refine((rows) => rows.every((r, i) => r.year === 2009 + i), 'market_energy: one row per year from 2009, in order')

export type SpecialSiteRules = z.infer<typeof specialKindSchema>

// ---------- Ventures (M36, doc 38 §5) ----------

export const VENTURE_TYPES = ['egs', 'egs2', 'smr', 'adv_fission', 'fusion', 'pumped', 'control'] as const
export type VentureType = (typeof VENTURE_TYPES)[number]
const slipSchema = z.object({ median: pos, sigma: nonneg })
const intRange = z.tuple([quarters, quarters])
const regionsSchema = z.union([z.array(z.string()).min(1), z.literal('nuclear'), z.literal('any')])
const targets = z.object({ p2035: share, p2040: share.optional() })
const nuclearSchema = z.object({
  from: quarterId,
  mw: pos,
  pitch_usd_kw: pos,
  /** The pitched first power, years after joining (doc 38 §5.3: "2032" for a 2027 start). */
  pitch_cod_years: pos,
  ppa_usd_mwh: pos,
  class: z.literal('nuclear'),
  foak_floor: pos,
  licence_q: quarters,
  build_q: quarters,
  slip: slipSchema,
  running_usd_mwh: nonneg,
  cf: share,
  regions: regionsSchema,
  cancel: z.object({ subscribed_min: share, per_year: share, others_subscribed: range }),
  cost_share: z.object({ chance: share, share: range }),
  haleu: z.object({ chance: share, slip_q: intRange }).optional(),
  regulator_slot_q: quarters,
  lifetime_years: pos,
  targets,
})
const egsSchema = z.object({
  from: quarterId,
  mw: pos,
  pitch_usd_kw: pos,
  pitch_cod_quarters: quarters,
  ppa_usd_mwh: pos,
  class: z.literal('thermal'),
  licence_q: quarters,
  build_q: quarters,
  slip: slipSchema,
  running_usd_mwh: nonneg,
  cf: share,
  regions: regionsSchema,
  weak_field: z.object({ chance: share, cf: share, fix_usd_kw: nonneg }),
  seismic: z.object({ per_year: share, pause_q: quarters, heat: z.number() }),
  pc_on_cod: z.number(),
  targets,
})
const venturesSchema = z.object({
  diligence: z.object({ bandwidth: quarters, fee_usd: nonneg }),
  equity_shares: z.array(share).min(1),
  offtake_shares: z.array(share).min(1),
  offtake_cap_mw: pos,
  prepay: z.array(z.object({ share, price_cut: share })).min(1),
  ppa_years: pos,
  cash_calls: z.array(share).length(3),
  partner_cover: range,
  default_call: z.enum(['pay', 'dilute', 'walk']),
  crf: z.object({ rate: pos }),
  marks: z.object({ milestone_mult: pos, slip_mult: pos }),
  types: z.object({
    egs: egsSchema,
    // M36.11: the second EGS block (doc 38's later blocks), from 2031Q1
    egs2: egsSchema,
    smr: nuclearSchema,
    adv_fission: nuclearSchema,
    fusion: z.object({
      from: quarterId,
      mw: pos,
      capex_usd_kw: pos,
      pitch_usd_mwh: pos,
      pitch_years: pos,
      gates: z.array(z.object({ id: z.string(), p: share, q: intRange })).length(4),
      pivot: z.object({ chance: share, q: intRange, valuation_mult: share }),
      reservation_share: share,
      reservation_mw: pos,
      hype: z.object({ plus: z.number(), minus: z.number(), minus_q: quarters }),
      no_power_before: quarterId,
      targets,
    }),
    pumped: z.object({
      from: quarterId,
      mw: pos,
      pitch_usd_kw: pos,
      pitch_years: pos,
      real_usd_kw: pos,
      class: z.literal('pumped_hydro'),
      licence_q: quarters,
      build_q: quarters,
      slip: slipSchema,
      hours: pos,
      running_usd_kw_yr: nonneg,
      capacity_usd_kw_yr: nonneg,
      govt_share: range,
      tbm: z.object({ chance: share, slip_q: quarters, budget_share: share }),
      regions: regionsSchema,
      targets,
    }),
    control: z.object({
      from: quarterId,
      mw: pos,
      bess_hours: pos,
      ppa_usd_mwh: pos,
      class: z.literal('solar'),
      licence_q: quarters,
      build_q: quarters,
      slip: slipSchema,
      slip_extra_q: quarters,
      grid_wait_q: intRange,
      running_usd_kw_yr: nonneg,
      cf_region: z.string(),
      regions: regionsSchema,
      targets,
    }),
  }),
  act4_power: z.object({ grid_wait_spread: range, gas_build_q: intRange, gas_class: z.enum(OVERRUN_CLASSES) }),
})

/** The venture content, checked (M36). */
export const VENTURES = venturesSchema.parse(venturesRaw)

const rules = energySchema.parse(energyRaw)

/** The energy content, checked. */
export const ENERGY = {
  ...rules,
  specialKinds: rules.special_sites.kinds as Record<SpecialSiteKind, SpecialSiteRules>,
  market: marketEnergySchema.parse(marketEnergyRaw),
}

/** The energy market row for a year (clamped to 2009-2040). */
export function energyYear(year: number) {
  const rows = ENERGY.market
  return rows[Math.min(rows.length - 1, Math.max(0, year - rows[0].year))]
}

/** The US residential ITC in a quarter ("2021Q2"), percent. */
export function itcPct(quarter: string): number {
  let pct = 0
  for (const s of ENERGY.itc.steps) if (quarter >= s.from) pct = s.pct
  return pct
}
