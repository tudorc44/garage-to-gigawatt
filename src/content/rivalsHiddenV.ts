// The HIDDEN view of Act V's rivals (M57.2, doc 43 §15.1): each rival's fate per future, a sentence that gives the future
// away. ONLY tests/, tools/ and src/sim/systems/act5End.ts may import this file (a grep test).
import { z } from 'zod'
import raw from './rivals_v.json' with { type: 'json' }
import { V_FUTURE_IDS, type VFutureId } from './schemas.ts'

const FILE = z
  .object({
    rivals: z.array(
      z.object({
        id: z.string(),
        futures: z.object(
          Object.fromEntries(V_FUTURE_IDS.map((v) => [v, z.object({ fate: z.string(), fails: z.string().optional() })])) as Record<
            VFutureId,
            z.ZodObject<{ fate: z.ZodString; fails: z.ZodOptional<z.ZodString> }>
          >,
        ),
      }),
    ),
  })
  .parse(raw)

/** Each rival's fate in this future (the chapter report's, after the reveal). */
export function rivalFatesV(future: VFutureId): { rival: string; fate: string; fails: string | null }[] {
  return FILE.rivals.map((r) => ({ rival: r.id, fate: r.futures[future].fate, fails: r.futures[future].fails ?? null }))
}
