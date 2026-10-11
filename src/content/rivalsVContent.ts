// Act V's rivals (M56; doc 43 §12 with §0.9 item 11; rivals_v.json from doc 47): Act IV's five fictional rivals carry on
// with Act V curves per future, plus one firm-power developer, Ironvale Power (the SMR-wave story: a big orderbook, few
// units). Anchors ($B value, orbital MW, firm MW, Ironvale's orderbook and delivered units) are interpolated per Act V
// quarter like rivals_iv.json; identical in every future through 2036Q2. Orrery is present only after Act IV's F1 or F3
// (the futures it survived). The runtime view only: zod drops each future's `fate` (the chapter report's, step C).
import { z } from 'zod'
import raw from './rivals_v.json' with { type: 'json' }
import { V_FUTURE_IDS, type VFutureId } from './schemas.ts'

export const ACT5_RIVAL_IDS = ['pallas_compute', 'northgate', 'orrery_compute', 'jade_arc', 'cratermark', 'ironvale_power'] as const
export type Act5RivalId = (typeof ACT5_RIVAL_IDS)[number]

const quarter = z.string().regex(/^\d{4}Q[1-4]$/)
const path = z.record(quarter, z.number().nonnegative())
const series = z.object({
  value: path,
  orbitMw: path,
  firmMw: path,
  orderbookUnits: path.optional(),
  deliveredUnits: path.optional(),
})
const schema = z.object({
  rivals: z
    .array(
      z.object({
        id: z.enum(ACT5_RIVAL_IDS),
        present_if_act4_future: z.array(z.enum(['f1', 'f2', 'f3', 'f4'])).optional(),
        common: series,
        futures: z.object(
          Object.fromEntries(V_FUTURE_IDS.map((v) => [v, series.extend({ fails: quarter.optional() })])) as Record<
            VFutureId,
            ReturnType<typeof series.extend<{ fails: z.ZodOptional<typeof quarter> }>>
          >,
        ),
      }),
    )
    .length(ACT5_RIVAL_IDS.length),
  orrery_auction_v3: z.object({
    quarter,
    mw: z.number().positive(),
    shell: z.enum(['sso', 'high_leo', 'high_orbit']),
    gen: z.enum(['gen31', 'gen33', 'gen35']),
    life_left_quarters: z.number().int().min(1),
    price_usd_per_mw: z.number().positive(),
    bandwidth: z.number().int().nonnegative(),
    open_quarters: z.number().int().min(1),
  }),
})

const ACT5_QUARTERS = Array.from({ length: 20 }, (_, i) => `${2036 + Math.floor(i / 4)}Q${(i % 4) + 1}`)
const qi = (label: string) => ACT5_QUARTERS.indexOf(label)

/** One value per Act V quarter from anchors: straight lines between them, flat before the first and after the last. */
function along(anchors: Record<string, number>): number[] {
  const pts = Object.entries(anchors)
    .map(([q, v]) => [qi(q), v] as const)
    .sort((a, b) => a[0] - b[0])
  return ACT5_QUARTERS.map((_, i) => {
    if (i <= pts[0][0]) return pts[0][1]
    for (let k = 1; k < pts.length; k++) {
      const [q1, v1] = pts[k]
      const [q0, v0] = pts[k - 1]
      if (i <= q1) return v0 + ((v1 - v0) * (i - q0)) / (q1 - q0)
    }
    return pts[pts.length - 1][1]
  })
}

const file = schema.parse(raw)
type Line = (number | null)[]

/** Each rival's numbers per Act V quarter (index 0 = 2036Q1), per future: value $, orbital and firm MW; null once failed. */
export const RIVALS_V = file.rivals.map((r) => ({
  id: r.id,
  presentIfAct4Future: r.present_if_act4_future ?? null,
  futures: Object.fromEntries(
    V_FUTURE_IDS.map((v) => {
      const p = r.futures[v]
      const failsAt = p.fails ? qi(p.fails) : null
      const line = (k: 'value' | 'orbitMw' | 'firmMw', mult = 1): Line =>
        along({ ...r.common[k], ...p[k] }).map((x, i) => (failsAt !== null && i >= failsAt ? null : x * mult))
      const opt = (k: 'orderbookUnits' | 'deliveredUnits'): Line | null =>
        r.common[k] || p[k] ? line_(k) : null
      const line_ = (k: 'orderbookUnits' | 'deliveredUnits'): Line =>
        along({ ...(r.common[k] ?? {}), ...(p[k] ?? {}) }).map((x, i) => (failsAt !== null && i >= failsAt ? null : x))
      return [
        v,
        {
          value: line('value', 1e9),
          orbitMw: line('orbitMw'),
          firmMw: line('firmMw'),
          orderbookUnits: opt('orderbookUnits'),
          deliveredUnits: opt('deliveredUnits'),
          failsAt,
        },
      ]
    }),
  ) as Record<
    VFutureId,
    { value: Line; orbitMw: Line; firmMw: Line; orderbookUnits: Line | null; deliveredUnits: Line | null; failsAt: number | null }
  >,
}))

/** V3's Orrery auction (its blocks go to auction when it fails there). */
export const ORRERY_AUCTION_V3 = file.orrery_auction_v3
