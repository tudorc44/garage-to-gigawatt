// Loads the Act I content files, checks them against the schemas, and reshapes them
// for the sim. Any problem stops the game with a list of what's wrong, where.
import type { z } from 'zod'
import machinesRaw from './machines.json' with { type: 'json' }
import sitesRaw from './sites.json' with { type: 'json' }
import interruptsRaw from './interrupts.json' with { type: 'json' }
import marketRaw from './market_weekly.json' with { type: 'json' }
import { BALANCE } from './balance.ts'
import {
  interruptsFileSchema,
  machinesFileSchema,
  marketSchema,
  sitesFileSchema,
  type Flaw,
  type Interrupt,
  type Machine,
  type MarketWeek,
  type SiteTier,
} from './schemas.ts'

export { BALANCE }
export type { Flaw, Interrupt, Machine, MarketWeek, SiteTier }

export interface Content {
  /** Every quarter of Act I in order: "2017Q1" … "2022Q3". */
  quarters: string[]
  /** market[quarterIndex][week]: exactly 13 weeks per quarter. */
  market: MarketWeek[][]
  machines: Machine[]
  siteTiers: SiteTier[]
  flaws: Record<string, Flaw>
  interrupts: { maxPerQuarter: number; byId: Record<string, Interrupt> }
}

export interface RawContent {
  machines: unknown
  sites: unknown
  interrupts: unknown
  market: unknown
}

export class ContentError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(
      `Content files have ${problems.length} problem(s):\n- ${problems.join('\n- ')}`,
    )
    this.name = 'ContentError'
    this.problems = problems
  }
}

/** Checks raw file data and builds a Content object. Throws ContentError on any problem. */
export function parseContent(raw: RawContent): Content {
  const problems: string[] = []

  function check<S extends z.ZodType>(file: string, schema: S, data: unknown) {
    const result = schema.safeParse(data)
    if (result.success) return result.data as z.output<S>
    for (const issue of result.error.issues) {
      problems.push(
        `${file} › ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
    }
    return undefined
  }

  const machinesFile = check('machines.json', machinesFileSchema, raw.machines)
  const sitesFile = check('sites.json', sitesFileSchema, raw.sites)
  const interruptsFile = check(
    'interrupts.json',
    interruptsFileSchema,
    raw.interrupts,
  )
  const marketRows = check('market_weekly', marketSchema, raw.market)

  if (!machinesFile || !sitesFile || !interruptsFile || !marketRows) {
    throw new ContentError(problems)
  }

  // Market: group the weeks by quarter and make every quarter exactly 13 weeks long.
  // Calendar quarters have 12–14 Mondays; a 14th week is skipped, a missing 13th repeats week 12.
  const quarters: string[] = []
  const market: MarketWeek[][] = []
  for (const row of marketRows) {
    if (quarters.at(-1) !== row.quarter) {
      if (quarters.includes(row.quarter)) {
        problems.push(
          `market_weekly › week ${row.week}: quarter ${row.quarter} appears twice`,
        )
      }
      quarters.push(row.quarter)
      market.push([])
    }
    market.at(-1)!.push(row)
  }
  const perQuarter = BALANCE.weeksPerQuarter
  market.forEach((weeks, i) => {
    if (weeks.length < perQuarter - 1 || weeks.length > perQuarter + 1) {
      problems.push(
        `market_weekly › ${quarters[i]}: has ${weeks.length} weeks, expected 12–14`,
      )
    }
    market[i] = Array.from(
      { length: perQuarter },
      (_, w) => weeks[Math.min(w, weeks.length - 1)],
    )
  })
  quarters.slice(1).forEach((q, i) => {
    if (q !== nextQuarter(quarters[i])) {
      problems.push(
        `market_weekly: ${quarters[i]} is followed by ${q}, expected ${nextQuarter(quarters[i])}`,
      )
    }
  })
  const lastQuarter = quarters.at(-1)!

  // Machines: prices must exist for every quarter the machine can be bought or sold.
  for (const m of machinesFile.models) {
    for (const q of quarterRange(m.available_from, lastQuarter)) {
      if (m.price_used[q] === undefined)
        problems.push(`machines.json › ${m.id}: no price_used for ${q}`)
    }
    for (const q of quarterRange(
      m.available_from,
      m.retail_new_ends ?? lastQuarter,
    )) {
      if (m.price_new[q] === undefined)
        problems.push(`machines.json › ${m.id}: no price_new for ${q}`)
    }
  }

  // Sites: every flaw must exist, and every year of the act needs a power price.
  const years = [...new Set(quarters.map((q) => q.slice(0, 4)))]
  for (const t of sitesFile.tiers) {
    for (const f of t.possible_flaws) {
      if (!sitesFile.flaws[f])
        problems.push(`sites.json › ${t.id}: unknown flaw "${f}"`)
    }
    if (t.power_path) {
      for (const y of years) {
        if (t.power_path[y] === undefined)
          problems.push(`sites.json › ${t.id}: no power_path for ${y}`)
      }
    }
  }
  for (const id of [
    BALANCE.startSite,
    BALANCE.bandwidth.bonusSiteTier,
    ...BALANCE.sites.noScoutingNeeded,
  ]) {
    if (!sitesFile.tiers.some((t) => t.id === id))
      problems.push(`balance.ts: unknown site tier "${id}"`)
  }

  const byId = Object.fromEntries(
    interruptsFile.interrupts.map((i) => [i.id, i]),
  )
  const repairCosts = byId.failure_wave?.repair_cost_usd ?? {}
  for (const m of machinesFile.models) {
    if (repairCosts[m.id] === undefined) {
      problems.push(
        `interrupts.json › failure_wave: no repair_cost_usd for ${m.id}`,
      )
    }
  }
  if (!byId.price_alert)
    problems.push('interrupts.json: missing the "price_alert" interrupt')

  if (problems.length > 0) throw new ContentError(problems)

  return {
    quarters,
    market,
    machines: machinesFile.models,
    siteTiers: sitesFile.tiers,
    flaws: sitesFile.flaws,
    interrupts: { maxPerQuarter: interruptsFile.max_per_quarter, byId },
  }
}

export function nextQuarter(q: string): string {
  const year = Number(q.slice(0, 4))
  const n = Number(q.slice(5))
  return n === 4 ? `${year + 1}Q1` : `${year}Q${n + 1}`
}

/** All quarters from `from` to `to`, inclusive. */
export function quarterRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let q = from; q <= to; q = nextQuarter(q)) out.push(q)
  return out
}

/** The game's content, checked once when this module is first imported. */
export const CONTENT: Content = parseContent({
  machines: machinesRaw,
  sites: sitesRaw,
  interrupts: interruptsRaw,
  market: marketRaw,
})
