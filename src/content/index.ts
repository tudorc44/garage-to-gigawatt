// Loads the Act I content files, checks them against the schemas, and reshapes them
// for the sim. Any problem stops the game with a list of what's wrong, where.
import type { z } from 'zod'
import machinesRaw from './machines.json' with { type: 'json' }
import sitesRaw from './sites.json' with { type: 'json' }
import interruptsRaw from './interrupts.json' with { type: 'json' }
import marketRaw from './market_weekly.json' with { type: 'json' }
import capitalRaw from './capital.json' with { type: 'json' }
import rivalsRaw from './rivals.json' with { type: 'json' }
import heatRaw from './heat.json' with { type: 'json' }
import shocksRaw from './shocks.json' with { type: 'json' }
import hiresRaw from './hires.json' with { type: 'json' }
import mergeRaw from './merge.json' with { type: 'json' }
import eventsRaw from './events.json' with { type: 'json' }
import { BALANCE } from './balance.ts'
import {
  auctionRulesSchema,
  capitalFileSchema,
  curtailmentRulesSchema,
  heatFileSchema,
  hiresFileSchema,
  mergeFileSchema,
  eventsFileSchema,
  readMarketSchema,
  interruptsFileSchema,
  machinesFileSchema,
  marketSchema,
  negotiationRulesSchema,
  rivalsFileSchema,
  shocksFileSchema,
  sitesFileSchema,
  type AuctionRules,
  type CryptoLoanTerms,
  type CurtailmentRules,
  type EquipmentLoanTerms,
  type Flaw,
  type HeatRules,
  type Hire,
  type HiresRules,
  type MergeRules,
  type ReadMarketRules,
  type EventCardRaw,
  type EventChoice,
  type Interrupt,
  type LadderStep,
  type Machine,
  type MarketWeek,
  type NegotiationRules,
  type PitchRules,
  type Rival,
  type SiteTier,
} from './schemas.ts'

export { BALANCE }
export type {
  NegotiationRules,
  PitchRules,
  HeatRules,
  Hire,
  HiresRules,
  MergeRules,
  ReadMarketRules,
  EventChoice,
  AuctionRules,
  CryptoLoanTerms,
  CurtailmentRules,
  EquipmentLoanTerms,
  Flaw,
  Interrupt,
  LadderStep,
  Machine,
  MarketWeek,
  Rival,
  SiteTier,
}

export interface Content {
  /** Every quarter of Act I in order: "2017Q1" … "2022Q3". */
  quarters: string[]
  /** market[quarterIndex][week]: exactly 13 weeks per quarter. */
  market: MarketWeek[][]
  machines: Machine[]
  siteTiers: SiteTier[]
  flaws: Record<string, Flaw>
  interrupts: { maxPerQuarter: number; byId: Record<string, Interrupt> }
  /** EV / EBITDA multiple by quarter label. */
  eraMultiple: Record<string, number>
  /** Funding ladder rungs, by id. */
  ladder: Record<string, LadderStep>
  /** Investor pitch rules (capital.json › pitch). */
  pitch: PitchRules
  /** Equipment loan terms by era (fromYear–toYear). */
  equipmentLoans: EquipmentLoanTerms[]
  /** The crypto-backed loan's terms. */
  cryptoLoan: CryptoLoanTerms
  /** Distressed auction rules (interrupts.json › distressed_auction). */
  auction: AuctionRules
  /** Grid curtailment rules (interrupts.json › curtailment). */
  curtailment: CurtailmentRules
  /** The 4 scripted rivals, in file order. */
  rivals: Rival[]
  /** Community Heat rules (heat.json). */
  heat: HeatRules
  /** The 5 hires and the hiring rules (hires.json). */
  hires: HiresRules
  /** Read the market (interrupts.json › read_market). */
  readMarket: ReadMarketRules
  /** The Merge decision and the chapter score (merge.json). */
  merge: MergeRules
  /** Event cards (events.json), with scripted weeks resolved to week indexes. */
  events: EventRules
  /** Power contract renewals (interrupts.json › negotiation). */
  negotiation: NegotiationRules
  /** Market shocks on fixed dates (shocks.json), with the week resolved to a week index. */
  shocks: Shock[]
}

export type EventCard = EventCardRaw & {
  /** Scripted cards: quarter index and week index (0–12) of the card. */
  quarterIndex?: number
  weekIndex?: number
}

export interface EventRules {
  randomChance: number
  /** First quarter index with random cards. */
  randomStart: number
  /** Week numbers (1–13) a random card can come after. */
  randomWeeks: [number, number]
  winterQuarters: string[]
  cards: EventCard[]
  byId: Record<string, EventCard>
}

export interface Shock {
  id: string
  /** Quarter index and first week index (0–12) of the shock. */
  quarter: number
  week: number
  weeks: number
  /** Index contracts that keep mining pay this per kWh on their firm load during the shock. */
  stormPriceUsdKwh: number
  /** Whether broken machines count in the firm load (undelivered ones never do). */
  firmLoadIncludesBroken: boolean
}

export interface RawContent {
  machines: unknown
  sites: unknown
  interrupts: unknown
  market: unknown
  capital: unknown
  rivals: unknown
  heat: unknown
  shocks: unknown
  hires: unknown
  merge: unknown
  events: unknown
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
  const capitalFile = check('capital.json', capitalFileSchema, raw.capital)
  const rivalsFile = check('rivals.json', rivalsFileSchema, raw.rivals)
  const heat = check('heat.json', heatFileSchema, raw.heat)
  const hires = check('hires.json', hiresFileSchema, raw.hires)
  const merge = check('merge.json', mergeFileSchema, raw.merge)
  const eventsFile = check('events.json', eventsFileSchema, raw.events)
  const shocksFile = check('shocks.json', shocksFileSchema, raw.shocks)
  const rawInterrupt = (id: string) =>
    (
      raw.interrupts as { interrupts?: { id?: string }[] } | undefined
    )?.interrupts?.find((i) => i.id === id)
  const auction = check(
    'interrupts.json › distressed_auction',
    auctionRulesSchema,
    rawInterrupt('distressed_auction'),
  )
  const curtailment = check(
    'interrupts.json › curtailment',
    curtailmentRulesSchema,
    rawInterrupt('curtailment'),
  )
  const readMarket = check(
    'interrupts.json › read_market',
    readMarketSchema,
    rawInterrupt('read_market'),
  )
  const negotiation = check(
    'interrupts.json › negotiation',
    negotiationRulesSchema,
    rawInterrupt('negotiation'),
  )

  if (
    !machinesFile ||
    !sitesFile ||
    !interruptsFile ||
    !marketRows ||
    !capitalFile ||
    !rivalsFile ||
    !auction ||
    !curtailment ||
    !heat ||
    !hires ||
    !merge ||
    !eventsFile ||
    !readMarket ||
    !negotiation ||
    !shocksFile
  ) {
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

  for (const q of quarters) {
    if (capitalFile.era_multiple_ev_ebitda[q] === undefined) {
      problems.push(
        `capital.json › era_multiple_ev_ebitda: no multiple for ${q}`,
      )
    }
  }

  if (!hires.list.some((h) => h.id === capitalFile.pitch.hireShiftSource)) {
    problems.push(
      `capital.json › pitch: unknown hire_shift_source "${capitalFile.pitch.hireShiftSource}"`,
    )
  }
  for (const h of hires.list) {
    const bonus = h.effect.power_negotiation_bonus
    if (bonus !== undefined && bonus !== negotiation.hireShift) {
      problems.push(
        `hires.json › ${h.id}: power_negotiation_bonus ${String(bonus)} doesn't match interrupts.json negotiation hire_shift ${negotiation.hireShift}`,
      )
    }
  }

  for (const id of capitalFile.pitch.appliesTo) {
    const step = capitalFile.ladder.find((s) => s.id === id)
    if (!step) {
      problems.push(`capital.json › pitch: unknown funding round "${id}"`)
    } else if (step.pre_money_usd === undefined) {
      problems.push(`capital.json › pitch: "${id}" has no pre_money_usd`)
    } else {
      const implied = step.amount_usd / (step.pre_money_usd + step.amount_usd)
      if (Math.abs(implied - step.dilution) > 1e-9) {
        problems.push(
          `capital.json › ${id}: dilution ${step.dilution} doesn't match amount / (pre-money + amount) = ${implied}`,
        )
      }
    }
  }

  for (const id of BALANCE.capital.openRounds) {
    if (!capitalFile.ladder.some((s) => s.id === id)) {
      problems.push(`balance.ts: unknown funding round "${id}"`)
    }
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
  for (const year of new Set(quarters.map((q) => Number(q.slice(0, 4))))) {
    const eras = capitalFile.loans.equipment.filter(
      (e) => e.fromYear <= year && year <= e.toYear,
    )
    if (eras.length !== 1) {
      problems.push(
        `capital.json › loans.equipment: ${year} is covered by ${eras.length} eras (needs exactly 1)`,
      )
    }
  }
  for (const r of rivalsFile.rivals) {
    for (const [field, series] of Object.entries({
      hashrate_ehs: r.hashrate_ehs,
      mw: r.mw,
      mcap_musd: r.mcap_musd,
    })) {
      for (const q of Object.keys(series)) {
        if (!quarters.includes(q))
          problems.push(`rivals.json › ${r.id}.${field}: ${q} is outside Act I`)
      }
    }
  }
  for (const win of auction.windows) {
    if (!quarters.includes(win.from) || !quarters.includes(win.to)) {
      problems.push(
        `interrupts.json › distressed_auction: window ${win.from}–${win.to} is outside Act I`,
      )
      continue
    }
    for (const id of win.models) {
      const m = machinesFile.models.find((x) => x.id === id)
      if (!m) {
        problems.push(
          `interrupts.json › distressed_auction: unknown machine "${id}"`,
        )
        continue
      }
      for (const q of quarterRange(win.from, win.to)) {
        if (m.price_used[q] === undefined)
          problems.push(
            `interrupts.json › distressed_auction: ${id} has no used price in ${q}`,
          )
      }
    }
  }
  if (auction.rivalBidders[1] > rivalsFile.rivals.length) {
    problems.push(
      'interrupts.json › distressed_auction: more rival bidders than rivals',
    )
  }
  if (!sitesFile.tiers.some((t) => t.id === curtailment.siteTier)) {
    problems.push(
      `interrupts.json › curtailment: unknown site tier "${curtailment.siteTier}"`,
    )
  }
  if (!byId.price_alert)
    problems.push('interrupts.json: missing the "price_alert" interrupt')

  const cards: EventCard[] = eventsFile.events.map((e) => {
    if (e.type !== 'scripted') return e
    const qi = quarters.indexOf(e.quarter)
    const wi = qi < 0 ? -1 : market[qi].findIndex((w) => w.week === e.week_of)
    if (wi < 0)
      problems.push(
        `events.json › ${e.id}: week ${e.week_of} isn't a week of ${e.quarter}`,
      )
    return { ...e, quarterIndex: qi, weekIndex: wi }
  })
  const events: EventRules = {
    randomChance: eventsFile.engine.random_chance_per_quarter,
    randomStart: quarters.indexOf(eventsFile.engine.random_start),
    randomWeeks: eventsFile.engine.random_week_range,
    winterQuarters: eventsFile.market_phases.winter,
    cards,
    byId: Object.fromEntries(cards.map((c) => [c.id, c])),
  }

  const shocks: Shock[] = []
  for (const sh of shocksFile.shocks) {
    const qi = quarters.indexOf(sh.quarter)
    const wi = qi < 0 ? -1 : market[qi].findIndex((w) => w.week === sh.week_of)
    if (wi < 0) {
      problems.push(
        `shocks.json › ${sh.id}: week ${sh.week_of} isn't a week of ${sh.quarter}`,
      )
      continue
    }
    shocks.push({
      id: sh.id,
      quarter: qi,
      week: wi,
      weeks: sh.weeks,
      stormPriceUsdKwh: sh.storm_price_per_kwh,
      firmLoadIncludesBroken: sh.firm_load_includes.includes('broken'),
    })
  }

  if (problems.length > 0) throw new ContentError(problems)

  return {
    quarters,
    market,
    machines: machinesFile.models,
    siteTiers: sitesFile.tiers,
    flaws: sitesFile.flaws,
    interrupts: { maxPerQuarter: interruptsFile.max_per_quarter, byId },
    eraMultiple: capitalFile.era_multiple_ev_ebitda,
    ladder: Object.fromEntries(capitalFile.ladder.map((s) => [s.id, s])),
    pitch: capitalFile.pitch,
    equipmentLoans: capitalFile.loans.equipment,
    cryptoLoan: capitalFile.loans.game_crypto_loan,
    rivals: rivalsFile.rivals,
    auction,
    curtailment,
    heat,
    hires,
    readMarket,
    merge,
    events,
    negotiation,
    shocks,
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
  capital: capitalRaw,
  rivals: rivalsRaw,
  heat: heatRaw,
  hires: hiresRaw,
  merge: mergeRaw,
  events: eventsRaw,
  shocks: shocksRaw,
})
