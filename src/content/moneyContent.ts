// Act IV's money and rivals content (M31.1; doc 33 §11, §12, §14.3): three files, validated with zod when this module is
// first imported (a malformed file throws, like any content file). The rivals' anchor paths become one value per Act IV
// quarter here (straight lines between anchors, held at the ends; null from a failure quarter on).
import { z } from 'zod'
import capitalRaw from './capital_iv.json' with { type: 'json' }
import hiresRaw from './hires_iv.json' with { type: 'json' }
import rivalsRaw from './rivals_iv.json' with { type: 'json' }
import { FUTURE_IDS, quarterId, type FutureId } from './schemas.ts'

const share = z.number().min(0).max(1)
const usd = z.number().nonnegative()
const bw = z.number().int().min(0)
const TENANT = ['sovereign', 'frontier_lab', 'inference_platform', 'eo_processor'] as const

const capitalSchema = z.object({
  export_credit: z.object({
    bandwidth: bw,
    apr: z.number().min(0).max(1),
    share_of_build: share,
    build_cost_mult: z.number().positive(),
    tenor_quarters: z.number().int().min(1),
    registry: z.enum(['accords', 'neutral']),
  }),
  project_debt: z.object({
    bandwidth: bw,
    share_of_capex: share,
    spread_bps: z.object(Object.fromEntries(TENANT.map((t) => [t, z.number().nonnegative()])) as Record<(typeof TENANT)[number], z.ZodNumber>),
    cure_quarters: z.number().int().min(1),
  }),
  co_funding: z.object({ bandwidth: bw, share_of_capex: share, revenue_share: share }),
  space_equity: z.object({ window_min_mult: z.number().positive(), story_ref_mult: z.number().positive() }),
  task_orders: z.object({
    chance_q: share,
    usd: z.tuple([usd, usd]),
    max_share_of_mission: share,
    bloc: z.enum(['accords', 'station']),
  }),
  fire_sale: z.object({ orbital: share, lunar: share, lunar_to_bloc: share }),
})

export const ACT4_HIRE_IDS = ['launch_procurement_lead', 'space_ops_chief', 'lunar_programme_director', 'chief_risk_officer'] as const
export type Act4HireId = (typeof ACT4_HIRE_IDS)[number]
const hiresSchema = z.object({
  hires: z
    .array(
      z.object({
        id: z.enum(ACT4_HIRE_IDS),
        salary_usd_yr: usd,
        effect: z.record(z.string(), z.union([z.number(), z.boolean()])),
      }),
    )
    .length(ACT4_HIRE_IDS.length),
})

export const ACT4_RIVAL_IDS = ['pallas_compute', 'northgate', 'orrery_compute', 'jade_arc', 'cratermark'] as const
export type Act4RivalId = (typeof ACT4_RIVAL_IDS)[number]
const path = z.record(quarterId, z.number().nonnegative())
const rivalsSchema = z.object({
  rivals: z
    .array(
      z.object({
        id: z.enum(ACT4_RIVAL_IDS),
        common: z.object({ value: path, orbitMw: path }),
        futures: z.object(
          Object.fromEntries(
            FUTURE_IDS.map((f) => [f, z.object({ value: path, orbitMw: path, fails: quarterId.optional() })]),
          ) as Record<FutureId, z.ZodObject<{ value: typeof path; orbitMw: typeof path; fails: z.ZodOptional<typeof quarterId> }>>,
        ),
      }),
    )
    .length(ACT4_RIVAL_IDS.length),
  orrery_auction: z.object({
    mw: z.number().positive(),
    shell: z.enum(['sso', 'high_leo', 'high_orbit']),
    gen: z.enum(['gen31', 'gen33', 'gen35']),
    life_left_quarters: z.number().int().min(1),
    price_usd_per_mw: usd,
    bandwidth: bw,
    open_quarters: z.number().int().min(1),
  }),
})

const ACT4_QUARTERS = Array.from({ length: 20 }, (_, i) => `${2031 + Math.floor(i / 4)}Q${(i % 4) + 1}`)
const qi = (label: string) => ACT4_QUARTERS.indexOf(label)

/** One value per Act IV quarter from anchors: straight lines between them, held flat before the first and after the last. */
function along(anchors: Record<string, number>): number[] {
  const pts = Object.entries(anchors)
    .map(([q, v]) => [qi(q), v] as const)
    .sort((a, b) => a[0] - b[0])
  return ACT4_QUARTERS.map((_, i) => {
    if (i <= pts[0][0]) return pts[0][1]
    for (let k = 1; k < pts.length; k++) {
      const [q1, v1] = pts[k]
      const [q0, v0] = pts[k - 1]
      if (i <= q1) return v0 + ((v1 - v0) * (i - q0)) / (q1 - q0)
    }
    return pts[pts.length - 1][1]
  })
}

const rivalsFile = rivalsSchema.parse(rivalsRaw)

/** The money and rivals content, checked; each rival's value ($) and orbital MW per Act IV quarter, per future. */
export const MONEY = {
  capital: capitalSchema.parse(capitalRaw),
  hires: hiresSchema.parse(hiresRaw).hires,
  rivals: rivalsFile.rivals.map((r) => ({
    id: r.id,
    futures: Object.fromEntries(
      FUTURE_IDS.map((f) => {
        const p = r.futures[f]
        const fails = p.fails ? qi(p.fails) : null
        const value = along({ ...r.common.value, ...p.value }).map((v, i) => (fails !== null && i >= fails ? null : v * 1e9))
        const orbitMw = along({ ...r.common.orbitMw, ...p.orbitMw }).map((v, i) => (fails !== null && i >= fails ? null : v))
        return [f, { value, orbitMw, failsAt: fails }]
      }),
    ) as Record<FutureId, { value: (number | null)[]; orbitMw: (number | null)[]; failsAt: number | null }>,
  })),
  orreryAuction: rivalsFile.orrery_auction,
}
