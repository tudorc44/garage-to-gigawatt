// Act IV's orbit content (M29.1; doc 33 §7-8, §16): the six files, validated with zod when this module is first imported
// (a malformed file throws, like any content file). The sim reads them through ORBIT.
import { z } from 'zod'
import providersRaw from './launch_providers.json' with { type: 'json' }
import satellitesRaw from './satellites_iv.json' with { type: 'json' }
import shellsRaw from './shells_iv.json' with { type: 'json' }
import insuranceRaw from './insurance_iv.json' with { type: 'json' }
import licencesRaw from './licences_iv.json' with { type: 'json' }
import tenantsRaw from './tenants_iv.json' with { type: 'json' }
import { quarterId } from './schemas.ts'

export const PROVIDER_IDS = ['pallas', 'northgate', 'kestrel', 'sovereign'] as const
export type ProviderId = (typeof PROVIDER_IDS)[number]
export const SHELL_IDS = ['sso', 'high_leo', 'high_orbit'] as const
export type ShellId = (typeof SHELL_IDS)[number]
export const GENERATION_IDS = ['gen31', 'gen33', 'gen35'] as const
export type GenerationId = (typeof GENERATION_IDS)[number]
export const ORBITAL_TENANT_IDS = ['sovereign', 'frontier_lab', 'inference_platform', 'eo_processor'] as const
export type OrbitalTenantId = (typeof ORBITAL_TENANT_IDS)[number]
export const REGISTRY_IDS = ['accords', 'neutral'] as const
export type RegistryId = (typeof REGISTRY_IDS)[number]

const pct = z.number().min(0).max(100)
const share = z.number().min(0).max(1)

const providersSchema = z.object({
  deposit_share: share,
  lead_quarters: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  providers: z
    .array(
      z.object({
        id: z.enum(PROVIDER_IDS),
        price_mult: z.number().positive(),
        failure_pct_by_year: z.record(z.string().regex(/^\d{4}$/), pct),
        slip_pct: pct,
        bump_pct_when_tight: pct,
        max_tonnes_per_booking: z.number().positive().nullable(),
        needs: z.string().nullable(),
        note: z.string(),
      }),
    )
    .length(PROVIDER_IDS.length),
})

const satellitesSchema = z.object({
  sizes_mw: z.array(z.number().positive()).min(1),
  generations: z
    .array(
      z.object({
        id: z.enum(GENERATION_IDS),
        from: quarterId,
        t_mw: z.number().positive().nullable(),
        market_column: z.enum(['gen33_t_mw', 'gen35_t_mw']).nullable(),
        note: z.string(),
      }),
    )
    .length(GENERATION_IDS.length),
  gpus: z.object({ usd_per_mw: z.number().positive(), spares_share: share, gpus_per_mw: z.number().positive() }),
  build_quarters: z.number().int().min(1),
  ops_usd_mw_yr: z.number().nonnegative(),
  design_life_years: z.number().positive(),
  utilisation: z.object({ contracted: share, spot: share }),
  spot_shell_rent_share: share,
})

const shellsSchema = z.object({
  shells: z
    .array(
      z.object({
        id: z.enum(SHELL_IDS),
        launch_mult: z.number().positive(),
        shielding_share: share,
        interactive_ok: z.boolean(),
        congestion_column: z.enum(['congestion_sso', 'congestion_high_leo', 'congestion_high_orbit']),
        closed_column: z.literal('sso_closed').nullable(),
      }),
    )
    .length(SHELL_IDS.length),
  debris: z.object({
    base_loss_pct_q: pct,
    reference_congestion: z.number().positive(),
    exponent: z.number().positive(),
    loss_capacity_share: share,
    cascade_capacity_loss_share: share,
    manoeuvre_life_quarters: z.number().int().min(0),
    conjunction_alert_chance_per_congestion_point: share,
  }),
})

const insuranceSchema = z.object({
  covers: z.string(),
  young_vehicle_failure_pct_at_least: pct,
  hard_market: z.object({
    trigger_loss_usd: z.number().positive(),
    rate_mult: z.number().positive(),
    capacity_mult: z.number().positive(),
    quarters: z.number().int().min(1),
  }),
  lender_cover_min_share: share,
  exposure_warning_share_of_equity: share,
})

const licencesSchema = z.object({
  filing: z.object({
    bandwidth: z.number().int().min(0),
    fee_usd: z.number().nonnegative(),
    filed_mw: z.number().positive(),
    approval_quarters: z.number().int().min(0),
    approval_extra_quarters_after_trigger: z.record(z.enum(['f1', 'f2', 'f3', 'f4']), z.number().int().min(0)),
    fast_track_pc: z.number().int().min(0),
  }),
  registries: z
    .array(
      z.object({
        id: z.enum(REGISTRY_IDS),
        approval_extra_quarters: z.number().int().min(0),
        sovereign_premium_add_pct: z.number(),
        clampdown_exempt: z.boolean(),
        note: z.string(),
      }),
    )
    .length(REGISTRY_IDS.length),
  registry_change_bandwidth: z.number().int().min(0),
  milestones: z.object({ due: quarterId, share_live: share, shrink_share: share }),
  clampdown: z.object({ cloud_capex_mult: z.number().positive() }),
})

const tenantsSchema = z.object({
  offers_per_block: z.number().int().min(1),
  late_penalty_share_of_acv: share,
  types: z
    .array(
      z.object({
        id: z.enum(ORBITAL_TENANT_IDS),
        name: z.string().min(1),
        term_years: z.number().positive(),
        rent_mult: z.number().positive(),
        add_sovereign_premium: z.boolean(),
        prepay_share: share,
        workload: z.enum(['batch', 'interactive']),
        max_mw: z.number().positive().nullable(),
      }),
    )
    .length(ORBITAL_TENANT_IDS.length),
  links: z.object({
    units_per_mw_interactive: z.number().nonnegative(),
    rent_unit_usd_yr: z.number().nonnegative(),
    ground_station: z.object({
      capex_usd: z.number().positive(),
      units: z.number().int().min(1),
      heat: z.number().nonnegative(),
      build_quarters: z.number().int().min(0),
      bandwidth: z.number().int().min(0),
    }),
  }),
})

/** The orbit content, checked. */
export const ORBIT = {
  launch: providersSchema.parse(providersRaw),
  satellites: satellitesSchema.parse(satellitesRaw),
  shells: shellsSchema.parse(shellsRaw),
  insurance: insuranceSchema.parse(insuranceRaw),
  licences: licencesSchema.parse(licencesRaw),
  tenants: tenantsSchema.parse(tenantsRaw),
}

export const provider = (id: ProviderId) => ORBIT.launch.providers.find((p) => p.id === id)!
export const shell = (id: ShellId) => ORBIT.shells.shells.find((s) => s.id === id)!
export const tenantType = (id: OrbitalTenantId) => ORBIT.tenants.types.find((t) => t.id === id)!
export const registry = (id: RegistryId) => ORBIT.licences.registries.find((r) => r.id === id)!
