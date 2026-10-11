// Act V's wildcards (M56.2; doc 43 §6.6 with §0.4, V-D11; wildcards_v.json from doc 47). At the Act IV → V boundary 2 of
// the 5 are drawn on their own stream (`act5_wildcards`), each with a quarter drawn uniformly in its window (and, where
// the file says "drawn", its region or length). A drawn wildcard fires once, at the start of its quarter, with a news
// line, and its effect runs for its quarters. They don't depend on the future, and the upcoming ones are never shown.
// The effects, on the systems that already exist (mine, reversible, each where the game has a hook):
// - Q-Day scare: Bitcoin ×0.6 for 2 quarters, read as mining revenue ×0.6 (a hashrate modifier: revenue ∝ hashrate ×
//   price) and the treasury's mark ×0.6; then the post-quantum migration: a week of mining down and the $250K cost of
//   moving the treasury.
// - Fusion "net electric": the multiples ×1.1 for 2 quarters, then ×0.95 for 2 (the lasting enterprise-value multiplier,
//   which carries the space and AI multiples alike; no fusion output, the honesty rule).
// - Dry year: pumped storage (the game's hydro) in one region, nordics or arizona, at ×0.75 for 4 quarters.
// - Large-load moratorium: in one region with your sites, no new grid connection or expansion of 50 MW or more for 2-8
//   quarters (positions already energised are safe).
// - Transformer shortage: for 4 quarters, a grid request started then waits 2 more quarters, 4 one time in 2.5.
import { z } from 'zod'
import raw from '../../content/wildcards_v.json' with { type: 'json' }
import { BALANCE, quarterIndex, type PowerRegion } from '../../content/index.ts'
import type { Message, MessageKey } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { chance, randomInt, substream } from '../rng.ts'
import { act5SeedOf, inActV, logEntry, type GameState, type Site } from '../state.ts'
import { regionOf } from './sites.ts'

export const WILDCARD_IDS_V = [
  'q_day_scare',
  'fusion_net_electric',
  'dry_year',
  'large_load_moratorium',
  'transformer_shortage',
] as const
export type WildcardIdV = (typeof WILDCARD_IDS_V)[number]

const num = z.number()
const FILE = z
  .object({
    _meta: z.object({ draw: z.number().int().positive() }),
    wildcards: z
      .array(
        z.object({
          id: z.enum(WILDCARD_IDS_V),
          window: z.tuple([z.string(), z.string()]),
          effect: z.record(z.string(), z.unknown()),
        }),
      )
      .length(WILDCARD_IDS_V.length),
  })
  .parse(raw)
const card = (id: WildcardIdV) => FILE.wildcards.find((w) => w.id === id)!
const eff = (id: WildcardIdV) => card(id).effect as Record<string, unknown>

/** A drawn Act V wildcard: when it fires, and the region or length the file draws. */
export interface DrawnWildcardV {
  id: WildcardIdV
  quarter: number
  fired: boolean
  region?: string
  quarters?: number
}

const LOG: Record<WildcardIdV, MessageKey> = {
  q_day_scare: 'log.wildcard_v.q_day_scare',
  fusion_net_electric: 'log.wildcard_v.fusion_net_electric',
  dry_year: 'log.wildcard_v.dry_year',
  large_load_moratorium: 'log.wildcard_v.large_load_moratorium',
  transformer_shortage: 'log.wildcard_v.transformer_shortage',
}

/** Draws 2 of the 5 and their quarters (at the Act IV → V boundary). */
export function drawWildcardsV(state: GameState): DrawnWildcardV[] {
  const r = substream(act5SeedOf(state), 'act5_wildcards')
  const left = [...FILE.wildcards]
  const out: DrawnWildcardV[] = []
  for (let i = 0; i < FILE._meta.draw && left.length > 0; i++) {
    const w = left.splice(randomInt(r, 0, left.length - 1), 1)[0]
    out.push({ id: w.id, quarter: randomInt(r, quarterIndex(w.window[0])!, quarterIndex(w.window[1])!), fired: false })
  }
  return out
}

/** Every region your sites are in (the moratorium's draw). */
const yourRegions = (state: GameState) =>
  [...new Set(state.sites.filter((s) => s.tier !== 'garage').map((s) => regionOf(s)).filter(Boolean))] as string[]

/** At the start of an Act V quarter: the wildcards due now fire (their news and their effects). */
export function fireWildcardsV(state: GameState): void {
  if (!inActV(state)) return
  for (const d of state.act5Wildcards ?? []) {
    // the fusion headline's second half: ×0.95 for 2 quarters after its 2 at ×1.1
    if (d.id === 'fusion_net_electric' && d.fired && state.quarter === d.quarter + Number((eff(d.id) as { quarters: number }).quarters)) {
      const then = eff(d.id).then as { ai_mult: number; quarters: number }
      state.events.valuationMult = { mult: then.ai_mult, until: state.quarter + then.quarters - 1 }
    }
    if (d.id === 'q_day_scare' && d.fired && state.quarter === d.quarter + Number(eff(d.id).quarters)) migrate(state)
    if (d.fired || d.quarter !== state.quarter) continue
    d.fired = true
    const e = eff(d.id)
    const r = substream(act5SeedOf(state), `act5_wildcard:${d.id}`)
    const weeks = BALANCE.weeksPerQuarter
    const from = state.quarter * weeks
    switch (d.id) {
      case 'q_day_scare':
        state.events.modifiers.push({
          kind: 'hashrate',
          siteIds: null,
          mult: num.parse(e.btc_price_mult),
          from,
          to: from + num.parse(e.quarters) * weeks - 1,
        })
        break
      case 'fusion_net_electric':
        state.events.valuationMult = { mult: num.parse(e.ai_mult), until: state.quarter + num.parse(e.quarters) - 1 }
        break
      case 'dry_year': {
        const regions = ['nordics', 'arizona']
        d.region = regions[randomInt(r, 0, regions.length - 1)]
        d.quarters = num.parse(e.quarters)
        break
      }
      case 'large_load_moratorium': {
        const regions = yourRegions(state)
        const [lo, hi] = e.quarters as [number, number]
        d.region = regions.length ? regions[randomInt(r, 0, regions.length - 1)] : undefined
        d.quarters = randomInt(r, lo, hi)
        break
      }
      case 'transformer_shortage':
        d.quarters = num.parse(e.lasts_quarters)
        break
    }
    logEntry(state, LOG[d.id], d.region ? { region: d.region, quarters: d.quarters ?? 0 } : { quarters: d.quarters ?? 0 })
  }
}

/** The Q-Day migration: a week of mining down and the treasury's move. */
function migrate(state: GameState): void {
  const m = eff('q_day_scare').migration as { mining_downtime_weeks: number; treasury_move_cost_usd: number }
  const from = state.quarter * BALANCE.weeksPerQuarter
  state.events.modifiers.push({ kind: 'hashrate', siteIds: null, mult: 0, from, to: from + m.mining_downtime_weeks - 1 })
  if (state.treasury.BTC > 0 || state.treasury.ETH > 0) book(state, 'one_offs', -m.treasury_move_cost_usd)
  logEntry(state, 'log.wildcard_v.migration')
}

const live = (state: GameState, id: WildcardIdV, quarter = state.quarter) =>
  (state.act5Wildcards ?? []).find((d) => d.id === id && d.fired && quarter >= d.quarter && quarter < d.quarter + (d.quarters ?? 0))

/** The treasury's mark while the Q-Day scare lasts (×0.6), else 1. */
export function qDayTreasuryMult(state: GameState): number {
  const d = (state.act5Wildcards ?? []).find((x) => x.id === 'q_day_scare' && x.fired)
  if (!d || !inActV(state)) return 1
  const e = eff('q_day_scare')
  return state.quarter >= d.quarter && state.quarter < d.quarter + num.parse(e.quarters) ? num.parse(e.btc_price_mult) : 1
}

/** Pumped storage's output factor in a region now (the dry year's ×0.75, else 1). */
export function dryYearMult(state: GameState, region: string): number {
  const d = live(state, 'dry_year')
  return d && d.region === region ? num.parse(eff('dry_year').hydro_pumped_output_mult) : 1
}

/** Why a new grid connection of `kw` at this site can't start now (the moratorium), or undefined. */
export function moratoriumBlocker(state: GameState, site: Site, kw: number): Message | undefined {
  if (!inActV(state)) return
  const d = live(state, 'large_load_moratorium')
  if (!d || d.region !== regionOf(site)) return
  if (kw >= num.parse(eff('large_load_moratorium').min_load_mw) * 1000)
    return { key: 'error.wildcard_v.moratorium', params: { region: d.region as PowerRegion } }
}

/** Extra quarters on a grid request started now (the transformer shortage), on the request's own stream. */
export function transformerDelayQuarters(state: GameState, requestId: string): number {
  if (!inActV(state) || !live(state, 'transformer_shortage')) return 0
  const e = eff('transformer_shortage')
  const r = substream(act5SeedOf(state), `transformer:${requestId}`)
  return chance(r, num.parse(e.long_delay_share)) ? num.parse(e.long_delay_quarters) : num.parse(e.delay_quarters)
}
