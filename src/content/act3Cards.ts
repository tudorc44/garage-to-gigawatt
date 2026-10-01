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
import { BALANCE } from './balance.ts'
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
  // M12.3 (step 4): the contract keys become one `contract` effect on the card's target (TARGETS).
  rent_index: {
    map: 'contract',
    note: "the target's rent × x for the rest of its term; on uncontracted MW, × the new-lease reference; with rfp_weeks, on the re-let rent",
  },
  term: {
    map: 'contract',
    note: '"spot": a rolling 1-quarter lease at the new-lease reference (rent_index on its first quarter only); "1yr": 4 quarters left, rent unchanged',
  },
  term_years: {
    map: 'contract',
    note: 'n > 0: n years left from now; n < 0: |n| years fewer, at least 4 quarters',
  },
  term_add_years: { map: 'contract', note: 'n more years' },
  walk_prob: {
    map: 'contract',
    note: 'one seeded roll now; a walk ends the target at quarter end (shell: re-let, no BW; GPU: spot)',
  },
  tenant_walk_chance: { map: 'contract', note: 'as walk_prob' },
  tenant_revenue_mult: {
    map: 'contract',
    note: "the target's rent × x for the rest of its current term (not renewals)",
  },
  tenant_slots: {
    map: 'extra_shell_offers',
    note: 'n more shell offers in every draw for the next 4 quarters',
  },
  rfp_weeks: {
    map: 'contract',
    note: 'the target is re-let at quarter end with a gap of n weeks, rounded up to whole quarters',
  },
  recovery: {
    map: 'contract',
    note: 'r × the rent the target fails to pay over its next 4 quarters, paid at the end of the quarter 2 from now',
  },
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
    note: 'buying MW (a number) is step 5; "-X" with cash "+ev_stabilized*k" is the sale of the smallest live contracted shell (M12.3)',
  },
  power_option: { defer: 'step 6', note: 'nuclear PPA' },
  pc_cost: { defer: 'step 6', note: 'political capital' },
  hire: { defer: 'step 6', note: 'the Government Affairs Lead' },
  ratepayer_anger: {
    defer: 'step 6',
    note: 'Anger is worked out from MW and policy bumps; the engine has no Anger nudge',
  },
  idle_mw: {
    map: 'idle_old_asics',
    note: 'X = the MW of mining machines in the old ASIC price tier: off until the player turns them back on',
  },
  mining_revenue_mult: {
    map: 'hashrate_mult',
    note: 'mining revenue × x for 4 quarters (the fleet hashrate modifier, 52 weeks from next week)',
  },
  debt: {
    defer: 'step 7',
    note: 'a corporate draw: step 7 builds the corporate facility (owner, 27 Sep 2026)',
  },
  debt_reduce: {
    map: 'debt_reduce',
    note: 'the largest project debt or DDTL balance, less the amount (not below 0); the choice needs the cash',
  },
  debt_maturity_years: {
    map: 'debt_maturity_years',
    note: 'the largest project debt facility: n more years, its payments re-spread over the new tenor',
  },
  reveals: {
    map: 'free_read',
    note: 'a free Signals read of the indicator named in REVEALS (the choice’s bandwidth is its cost)',
  },
}

/** Which contract a card's contract effects act on (M12.3, the design thread's target rules). */
export type ContractTarget =
  | 'soonest' // the soonest end quarter (ties: larger rent)
  | 'best' // the highest-credit tenant (hyperscaler > neocloud > AI lab; ties: larger rent)
  | 'distressed' // distressed with the largest rent, else the largest AI lab, else the largest non-hyperscaler
  | 'all_shell' // every shell lease
  | 'uncontracted' // all uncontracted live AI shell MW
  | 'largest' // the largest annual rent (every other card)

/** Per authored card (and per choice, 1-based, where the choices differ); any other card: 'largest'. */
const TARGETS: Record<string, ContractTarget | Record<number, ContractTarget>> =
  {
    s0_c3: 'soonest',
    s3_c4: 'soonest',
    s2_c3: { 1: 'best', 2: 'uncontracted' },
    s1_c3: 'distressed',
    s1_c7: 'distressed',
    s3_c3: 'all_shell',
  }

/**
 * Choices whose rent_index re-lets the target now to a new tenant of the same card, with no gap, at the
 * old rent × x (s1_c7 "Re-let at spot": the defaulted tenant is replaced; mine, reversible).
 */
const REPLACE_TENANT = ['s1_c7.c2']

/** The effect keys the move log reads (systems/act3Moves.ts); only these are copied onto a choice. */
const MOVE_EFFECT_KEYS = [
  'term_years',
  'term_add_years',
  'term',
  'cash',
  'gpu_resale_mult',
  'debt_reduce',
  'debt',
  'gpu_rack',
  'capex_mw',
  'mw',
  'retrofit',
  'power_option',
]

/** The distressed purchases for the move log (M14.2: s1_c6 "Bid with cash" for a distressed 60 MW site). */
const DISTRESSED_BUY = ['s1_c6.c1']

/** reveals: the indicator a card's free read shows (design thread, M12.3). */
const REVEALS: Record<string, string> = { s3_c1: 'efficiency_index' }

/** The cash formulas the engine can compute now (M12.3), by pattern; the rest wait for their step. */
const CASH_FORMULAS: {
  re: RegExp
  to: (k: number) => Record<string, unknown>
}[] = [
  {
    re: /^\+revenue_this_quarter\*(\d+(?:\.\d+)?)$/,
    to: (k) => ({ revenue_share_at_end: k }),
  },
  { re: /^\+backstop_amount$/, to: () => ({ backstop_payout: true }) },
  {
    re: /^\+ev_stabilized\*(\d+(?:\.\d+)?)$/,
    to: (k) => ({ sell_smallest_shell: k }),
  },
]
const CASH_FORMULA_STEPS: { re: RegExp; step: string }[] = [
  { re: /ppa_savings/, step: 'step 6' },
  { re: /project_capex/, step: 'step 5' },
  { re: /\*mw$/, step: 'step 5' },
]

/** The contract keys, gathered into one `contract` effect. */
const CONTRACT_KEYS: Record<string, string> = {
  rent_index: 'rentIndex',
  term: 'term',
  term_years: 'termYears',
  term_add_years: 'termAddYears',
  walk_prob: 'walkProb',
  tenant_walk_chance: 'walkProb',
  tenant_revenue_mult: 'revenueMult',
  rfp_weeks: 'rfpWeeks',
  recovery: 'recovery',
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

/** A card's contract target (TARGETS), for choice `choice` (1-based). */
function targetOf(card: string | undefined, choice: number): ContractTarget {
  const t = card ? TARGETS[card] : undefined
  if (t === undefined) return 'largest'
  return typeof t === 'string' ? t : (t[choice] ?? 'largest')
}

/**
 * One choice's effects in the engine's vocabulary, or the deferred marker. `ctx` names the authored
 * card and the choice (1-based), for the card-specific rules (TARGETS, REPLACE_TENANT, REVEALS).
 */
export function translateEffects(
  effect: Record<string, unknown>,
  ctx: { card?: string; choice?: number } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const contract: Record<string, unknown> = {}
  const deferred: DeferredEffects = { keys: [], steps: [] }
  const defer = (key: string, step: string) => {
    deferred.keys.push(key)
    if (!deferred.steps.includes(step)) deferred.steps.push(step)
  }
  const choice = ctx.choice ?? 1
  for (const [key, value] of Object.entries(effect)) {
    const route = EFFECT_MAP[key]
    if (!route) throw new Error(`events_act3.json: unknown effect "${key}"`)
    // "-X" MW goes with the sale of a stabilised site (cash "+ev_stabilized*k"): nothing of its own.
    if (
      key === 'mw' &&
      value === '-X' &&
      /ev_stabilized/.test(String(effect.cash))
    )
      continue
    if ('defer' in route) {
      defer(key, route.defer)
      continue
    }
    const n = plainNumber(value)
    if (key in CONTRACT_KEYS) {
      if (key === 'term') {
        if (value === 'spot' || value === '1yr') contract.term = value
        else defer(key, 'question')
      } else if (n === null) defer(key, 'question')
      else contract[CONTRACT_KEYS[key]] = n
      continue
    }
    switch (key) {
      case 'cash':
        if (n !== null) {
          out.cash = ((out.cash as number | undefined) ?? 0) + n
          break
        }
        {
          const s = String(value)
          const known = CASH_FORMULAS.find((f) => f.re.test(s))
          if (known)
            Object.assign(out, known.to(Number(s.match(known.re)![1] ?? 1)))
          else
            defer(
              key,
              CASH_FORMULA_STEPS.find((f) => f.re.test(s))?.step ?? 'question',
            )
        }
        break
      case 'tenant_slots':
        if (n === null) defer(key, 'question')
        else out.extra_shell_offers = n
        break
      case 'idle_mw':
        out.idle_old_asics = true
        break
      case 'mining_revenue_mult':
        if (n === null) defer(key, 'question')
        else
          out.hashrate_mult = {
            mult: n,
            scope: 'fleet',
            weeks:
              BALANCE.weeksPerQuarter * BALANCE.act3.cards.miningRevenueQuarters,
          }
        break
      case 'debt_reduce':
        if (n === null) defer(key, 'question')
        else out.debt_reduce = n
        break
      case 'debt_maturity_years':
        if (n === null) defer(key, 'question')
        else out.debt_maturity_years = n
        break
      case 'reveals': {
        const indicator = ctx.card ? REVEALS[ctx.card] : undefined
        if (indicator) out.free_read = indicator
        else defer(key, 'question')
        break
      }
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
  if (Object.keys(contract).length > 0) {
    contract.target = targetOf(ctx.card, choice)
    if (ctx.card && REPLACE_TENANT.includes(`${ctx.card}.c${choice}`))
      contract.replaceTenant = true
    out.contract = contract
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
    effects: translateEffects(ch.effect, { card: c.id, choice: i + 1 }),
    // M14.2: the authored effect as written (a deferred choice keeps its values here), which the move log
    // classifies when the player picks it; and whether it is a distressed purchase. No scenario or role.
    act3Effect: Object.fromEntries(
      Object.entries(ch.effect).filter(([k]) => MOVE_EFFECT_KEYS.includes(k)),
    ),
    ...(DISTRESSED_BUY.includes(`${c.id}.c${i + 1}`)
      ? { act3Distressed: true }
      : {}),
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
