// Act III's scenario event cards (M11.5c; events_act3.json): 8 per scenario plus 5 shared. They run
// through Act II's card engine as scripted cards. This file turns each authored card into an engine
// card:
// - its id becomes opaque (the authored id names the scenario, and the card view hands the id to the
//   UI, so the player must not be able to read the scenario off it);
// - its choices get ids c1, c2 … in file order, and the default label becomes that id;
// - each effect key is mapped to the engine's own vocabulary where the meaning is the same
//   (EFFECT_MAP), or deferred to the build step that adds it;
// - a choice with any deferred effect is deferred whole (mine, reversible): otherwise a choice would
//   charge its price and never deliver (a legal bill with no recovery), or hand over its benefit for
//   free (a refinance spread cut with no new facility). A deferred choice does nothing but log.
// The role tag (signal, decoy, trigger …) is not kept, and the scenario stays inside the engine.
import { z } from 'zod'
import { quarterId, type EventCardRaw } from './schemas.ts'

export const act3CardSchema = z.object({
  id: z.string().min(1),
  scenario: z.enum(['s0', 's1', 's2', 's3', 'all']),
  quarter: quarterId,
  trigger: z.string().min(1),
  role: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  default: z.string().min(1),
  choices: z
    .array(
      z.object({
        label: z.string().min(1),
        effect: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
})
export const eventsAct3FileSchema = z.object({
  event_cards: z.array(act3CardSchema).min(1),
})
export type Act3CardRaw = z.output<typeof act3CardSchema>

/** Where an effect key goes: mapped to the engine now, or the step that will wire it. */
export type EffectRoute =
  { map: string; note: string } | { defer: string; note: string }

/**
 * Every effect key the cards use (M11.5c). `map` names the engine effect it becomes; `defer` names the
 * D16 step that builds it, or "question" where no step owns it yet (listed for the design thread).
 */
export const EFFECT_MAP: Record<string, EffectRoute> = {
  cash: {
    map: 'cash',
    note: 'a plain dollar amount; a formula ("+revenue_this_quarter*0.02") is deferred',
  },
  legal_cost: {
    map: 'cash',
    note: 'a cash cost (the amount is taken off cash)',
  },
  delay_quarters: {
    map: 'delay_marginal_project',
    note: 'a positive delay slips the building project with the lowest projected return (Act II ec07); a negative one (a speed-up) is deferred to step 5',
  },
  debt_spread_bps: {
    map: 'debt_spread_add',
    note: 'added to the spread of new equipment loans and DDTLs from then on (Act II ec16)',
  },
  credit_notch: {
    map: 'credit_notch',
    note: 'notches for 2 quarters, the duration Act II cards use (mine, reversible)',
  },
  bandwidth: {
    map: 'bandwidth_next',
    note: 'a card plays in the live quarter, so its Bandwidth comes off next quarter, as Act II cards do (mine, reversible)',
  },
  rent_index: { defer: 'step 4', note: 'renewal and re-let pricing' },
  term: { defer: 'step 4', note: 'contract term' },
  term_years: { defer: 'step 4', note: 'contract term' },
  term_add_years: { defer: 'step 4', note: 'contract term' },
  walk_prob: { defer: 'step 4', note: 'tenant walks at renewal' },
  tenant_walk_chance: { defer: 'step 4', note: 'tenant walks' },
  tenant_revenue_mult: { defer: 'step 4', note: 'a renegotiated rent' },
  tenant_slots: { defer: 'step 4', note: 'the RFP pipeline' },
  rfp_weeks: { defer: 'step 4', note: 'the re-let RFP' },
  recovery: { defer: 'step 4', note: 'recovery on a defaulted lease' },
  retrofit: { defer: 'step 5', note: 'density retrofit' },
  gpu_rack: { defer: 'step 5', note: 'Rubin racks' },
  capex_mw: { defer: 'step 5', note: 'new halls' },
  capex_mult: { defer: 'step 5', note: 'turbine/equipment cost' },
  gpu_resale_mult: {
    defer: 'step 5',
    note: 'a GPU sale at a price; the engine has no partial GPU sale at a multiple',
  },
  mw: {
    defer: 'step 5',
    note: 'buying or selling MW; the engine has no card-driven site deal',
  },
  power_option: { defer: 'step 6', note: 'nuclear PPA' },
  pc_cost: { defer: 'step 6', note: 'political capital' },
  hire: { defer: 'step 6', note: 'the Government Affairs Lead' },
  ratepayer_anger: {
    defer: 'step 6',
    note: 'Anger is worked out from MW and policy bumps; the engine has no Anger nudge',
  },
  idle_mw: {
    defer: 'question',
    note: '"+X" names no amount, and the engine has no card-driven idling',
  },
  mining_revenue_mult: {
    defer: 'question',
    note: 'no duration is given (the engine modifier needs one)',
  },
  debt: {
    defer: 'question',
    note: 'a corporate revolver or facility: the engine has no general corporate debt',
  },
  debt_reduce: {
    defer: 'question',
    note: 'buying back debt at a discount: no corporate debt to reduce',
  },
  debt_maturity_years: {
    defer: 'question',
    note: 'extending maturity: no corporate debt with a maturity',
  },
  reveals: {
    defer: 'question',
    note: 'maps to a free Signals read, but the card names no indicator ("signals")',
  },
}

/** The deferred-effect marker the engine logs (systems/events.ts). */
export interface DeferredEffects {
  keys: string[]
  steps: string[]
}

const NUMBER = /^[+-]?\d+(\.\d+)?$/

/** An effect value as a plain number, or null when it is a formula. */
function plainNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && NUMBER.test(v)) return Number(v)
  return null
}

/**
 * A deterministic opaque id for an authored card id: FNV-1a, then murmur3's finaliser so that similar
 * ids ("s1_c3", "s1_c4") don't share hex digits (plain FNV-1a leaves a shared middle that would
 * still group a scenario's cards).
 */
export function act3CardEngineId(authoredId: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < authoredId.length; i++)
    h = Math.imul(h ^ authoredId.charCodeAt(i), 0x01000193)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return `a3_${(h >>> 0).toString(16).padStart(8, '0')}`
}

/** One choice's effects in the engine's vocabulary, or the deferred marker. */
export function translateEffects(
  effect: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const deferred: DeferredEffects = { keys: [], steps: [] }
  const defer = (key: string, step: string) => {
    deferred.keys.push(key)
    if (!deferred.steps.includes(step)) deferred.steps.push(step)
  }
  for (const [key, value] of Object.entries(effect)) {
    const route = EFFECT_MAP[key]
    if (!route) throw new Error(`events_act3.json: unknown effect "${key}"`)
    if ('defer' in route) {
      defer(key, route.defer)
      continue
    }
    const n = plainNumber(value)
    switch (key) {
      case 'cash':
        if (n === null) defer(key, 'question')
        else out.cash = ((out.cash as number | undefined) ?? 0) + n
        break
      case 'legal_cost':
        if (n === null) defer(key, 'question')
        else out.cash = ((out.cash as number | undefined) ?? 0) - n
        break
      case 'delay_quarters':
        if (n === null) defer(key, 'question')
        else if (n > 0) out.delay_marginal_project = n
        else defer(key, 'step 5')
        break
      case 'debt_spread_bps':
        if (n === null) defer(key, 'question')
        else out.debt_spread_add = n
        break
      case 'credit_notch':
        if (n === null) defer(key, 'question')
        else out.credit_notch = { notches: n, quarters: 2 }
        break
      case 'bandwidth':
        if (n === null) defer(key, 'question')
        else out.bandwidth_next = n
        break
    }
  }
  // A choice with any deferred effect is deferred whole (see the note at the top).
  if (deferred.keys.length > 0) {
    const all = Object.keys(effect)
    return {
      deferred: {
        keys: all,
        steps: deferred.steps,
      } satisfies DeferredEffects,
    }
  }
  return out
}

/** An authored card as an engine card (scripted, week 2 of its quarter, Act III's deck). */
export function toEngineCard(
  c: Act3CardRaw,
  weekOf: string,
): EventCardRaw & { scenario: Act3CardRaw['scenario'] } {
  const choices = c.choices.map((ch, i) => ({
    id: `c${i + 1}`,
    effects: translateEffects(ch.effect),
  }))
  const def = c.choices.findIndex((ch) => ch.label === c.default)
  return {
    id: act3CardEngineId(c.id),
    type: 'scripted',
    quarter: c.quarter,
    week_of: weekOf,
    default: def < 0 ? '' : `c${def + 1}`,
    choices,
    scenario: c.scenario,
  }
}
