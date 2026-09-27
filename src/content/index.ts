// Loads the content files, checks them against the schemas, and reshapes them for the sim.
// Act I's files plus Act II's (the timeline runs 2017Q1 → 2026Q4). Any problem stops the game
// with a list of what's wrong, where.
import type { z } from 'zod'
import machinesRaw from './machines.json' with { type: 'json' }
import sitesRaw from './sites.json' with { type: 'json' }
import interruptsRaw from './interrupts.json' with { type: 'json' }
import marketRaw from './market_weekly.json' with { type: 'json' }
import marketAct2Raw from './market_weekly_act2.json' with { type: 'json' }
import marketQuarterlyAct2Raw from './market_quarterly_act2.json' with { type: 'json' }
import capitalRaw from './capital.json' with { type: 'json' }
import capitalAct2Raw from './capital_act2.json' with { type: 'json' }
import conversionsRaw from './conversions.json' with { type: 'json' }
import tenantsRaw from './tenants.json' with { type: 'json' }
import gpusRaw from './gpus.json' with { type: 'json' }
import interruptsAct2Raw from './interrupts_act2.json' with { type: 'json' }
import rivalsRaw from './rivals.json' with { type: 'json' }
import heatRaw from './heat.json' with { type: 'json' }
import shocksRaw from './shocks.json' with { type: 'json' }
import hiresRaw from './hires.json' with { type: 'json' }
import mergeRaw from './merge.json' with { type: 'json' }
import eventsRaw from './events.json' with { type: 'json' }
import { BALANCE } from './balance.ts'
import {
  auctionRulesSchema,
  capitalAct2FileSchema,
  capitalFileSchema,
  constructionDelaySchema,
  conversionsFileSchema,
  flatCapexSchema,
  gpuAllocationSchema,
  gpusFileSchema,
  interruptsAct2FileSchema,
  pilotClusterSchema,
  tenantsFileSchema,
  curtailmentRulesSchema,
  heatFileSchema,
  hiresFileSchema,
  failureWaveRulesSchema,
  mergeFileSchema,
  eventsFileSchema,
  readMarketSchema,
  interruptsFileSchema,
  machinesFileSchema,
  marketAct2Schema,
  marketQuarterlyAct2Schema,
  marketSchema,
  negotiationRulesSchema,
  rivalsFileSchema,
  shocksFileSchema,
  sitesFileSchema,
  type AuctionRules,
  type ConstructionLoanTerms,
  type CryptoLoanTerms,
  type CurtailmentRules,
  type EquipmentLoanTerms,
  type Flaw,
  type HeatRules,
  type Hire,
  type HiresRules,
  type MergeRules,
  type ReadMarketRules,
  type FailureWaveRules,
  type EventCardRaw,
  type EventChoice,
  type Interrupt,
  type LadderStep,
  type Machine,
  type MarketWeek,
  type MarketWeekAct1,
  type MarketWeekAct2,
  type MarketQuarterAct2Row,
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
  ConstructionLoanTerms,
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

/** Where an act sits on the game's timeline (quarter indexes, inclusive). */
export interface ActSpan {
  act: 1 | 2
  firstQuarter: number
  lastQuarter: number
}

/** A tenant type (tenants.json); each has its own walk-away chance at 2 quarters late. */
export type TenantType = 'hyperscaler' | 'ai_lab' | 'neocloud_sub_tenant'

/** A tenant card a shell project can sign (tenants.json › tenant_cards). */
export interface TenantCard {
  id: string
  type: TenantType
  rating: string
  priceUsdMwYr: number
  termYears: number
  /** Share of the whole contract value paid up front at signing. */
  prepaymentShare: number
  /** The ready-by quarter is drawn in this window after signing (quarters). */
  readyBy: [number, number]
  /** Capex the tenant funds, per MW (the CoreWeave-style anchor). */
  capexCreditUsdMw: number
  /** Only at this GPU know-how level (the overflow tenant: 3). */
  needsKnowHow?: number
  /** Only for sites in this region. */
  regionLock?: string
}

/** A GPU generation a full-stack project can buy (gpus.json, per-unit GPUs in Alpha 0.2). */
export interface GpuGeneration {
  id: 'h100' | 'h200' | 'b200'
  from: string
  gpusPerMw: number
}

export interface ProjectRules {
  tenantCards: TenantCard[]
  walkChanceLate2q: Record<TenantType, number>
  /** Liquidated damages per late quarter, as a share of the annual contract value. */
  latePenaltyShareYr: number
  retrofit: { buildQuarters: number }
  fullStack: { extraBuildQuarters: number }
  pilot: {
    kwMin: number
    kwMax: number
    kwStep: number
    from: string
    buildQuarters: number
    gpu: GpuGeneration['id']
    utilisationBase: number
    utilisationBonusByKnowHow: Record<string, number>
  }
  gpus: GpuGeneration[]
  /** Cap rates (%) by year / quarter key, and the 2026Q4 aftershock (doc 18 §7.3). */
  capRates: {
    hyperscale: Record<string, number>
    shell: Record<string, number>
  }
  /** Backlog weights (shares of remaining take-or-pay revenue, doc 18 §8). */
  backlogWeights: { a: number; bbb: number; below: number; spot: number }
  delay: {
    chance: number
    accelerateShareOfCapex: number
    contractorBandwidthNext: number
    contractorNoSlipChance: number
    default: string
  }
  allocationChance: number
}

/** The six Act II region tags' power price columns (market_quarterly_act2). */
export const POWER_REGIONS = [
  'ercot',
  'pjm',
  'ohio',
  'georgia',
  'arizona',
  'nordics',
] as const
export type PowerRegion = (typeof POWER_REGIONS)[number]

/**
 * One Act II quarter's market (market_quarterly_act2, scope 0.2 §2.3). Prices are null before the
 * product exists (no H100 rental before 2023Q3, no B200 before 2025Q1 …).
 */
export interface Act2Quarter {
  quarter: string
  /** GPU rental, $ per GPU-hour. */
  gpuRentalUsdHr: {
    h100: {
      hyperscaler: number | null
      neocloud: number | null
      spot: number | null
      contract1y: number | null
    }
    a100Hyperscaler: number | null
    h200: { hyperscaler: number | null; neocloud: number | null }
    b200: { hyperscaler: number | null; neocloud: number | null }
    gb200Blended: number | null
  }
  /** GPU purchase prices, $: per unit, the 8-GPU H100 system, the GB200 NVL72 rack. */
  gpuPurchaseUsd: {
    h100: number | null
    h100Hgx8: number | null
    h200: number | null
    b200: number | null
    gb200Rack: number | null
  }
  /** Build cost per MW by conversion (the quarterly series of conversions.json). */
  capexUsdMw: {
    gpuHallToHosting: number
    retrofitShell: number
    greenfieldShell: number
    fullstackIncremental: number
  }
  sofrPct: number
  hySpreadBps: number
  /** EV/EBITDA multiples (capital_act2.json, doc 18 §8), interpolated between the anchor quarters. */
  multiple: { mining: number; aiInfra: number }
  /** GPU-backed DDTL spread (null before the first DDTL, 2023Q3). */
  ddtlSpreadBps: number | null
  capRateHyperscalePct: number
  /** EV per MW benchmarks, $M (the sanity check of doc 18 §8). */
  evPerMwUsdM: {
    mining: number
    aiAnnounced: number | null
    aiStabilized: number | null
  }
  powerUsdKwh: Record<PowerRegion, number>
  pjmCapacityUsdMwDay: number
  hyperscalerCapexUsdBnQ: number
  /** 0–100: drives RFP frequency and quality. */
  aiDemandIndex: number
  estimate: boolean
}

export interface Content {
  /** Every quarter of the game in order: Act I "2017Q1" … "2022Q3", then Act II "2022Q4" … "2026Q4". */
  quarters: string[]
  /** market[quarterIndex][week]: exactly 13 weeks per quarter. */
  market: MarketWeek[][]
  /** The acts, in order. Act I's last quarter (2022Q3) is where the Merge decision comes. */
  acts: ActSpan[]
  /** Act II's quarterly market, in quarter order (index 0 = 2022Q4). See act2Quarter(). */
  act2Market: Act2Quarter[]
  /** Hosting (scope 0.2 §2.4): the same-site conversion and the all-in rate by year. */
  hosting: {
    /** conversions.json › mining_to_hosting_same_site. */
    conversionCapexUsdMw: number
    /** Build quarters after the order quarter (0: live next quarter). */
    buildQuarters: number
    /** tenants.json › hosting_market_2022_2024.rate_usd_kwh, by year. */
    rateUsdKwhByYear: Record<string, number>
  }
  /** Projects (Act II, scope 0.2 §2.5): what the Act II content files say about them. */
  projects: ProjectRules
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
  /** The Texas construction loan (capital.json › loans.construction). */
  constructionLoan: ConstructionLoanTerms
  /** The 2020Q4–2022Q1 GPU shortage (machines.json › gpu_cap). */
  gpuCap: {
    window: [string, string]
    kwPerQuarter: number
    usedPriceMinNewMult: number
  }
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
  /** The failure wave (interrupts.json › failure_wave). */
  failureWave: FailureWaveRules
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
  marketAct2: unknown
  marketQuarterlyAct2: unknown
  capital: unknown
  capitalAct2: unknown
  conversions: unknown
  tenants: unknown
  gpus: unknown
  interruptsAct2: unknown
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
  const marketAct2Rows = check(
    'market_weekly_act2',
    marketAct2Schema,
    raw.marketAct2,
  )
  const marketQuarterlyAct2Rows = check(
    'market_quarterly_act2',
    marketQuarterlyAct2Schema,
    raw.marketQuarterlyAct2,
  )
  const capitalFile = check('capital.json', capitalFileSchema, raw.capital)
  const capitalAct2File = check(
    'capital_act2.json',
    capitalAct2FileSchema,
    raw.capitalAct2,
  )
  const conversionsFile = check(
    'conversions.json',
    conversionsFileSchema,
    raw.conversions,
  )
  const tenantsFile = check('tenants.json', tenantsFileSchema, raw.tenants)
  const gpusFile = check('gpus.json', gpusFileSchema, raw.gpus)
  const interruptsAct2File = check(
    'interrupts_act2.json',
    interruptsAct2FileSchema,
    raw.interruptsAct2,
  )
  const act2Interrupt = (id: string) =>
    interruptsAct2File?.new_interrupts.find((i) => i.id === id)
  const delayRules = check(
    'interrupts_act2.json › construction_delay',
    constructionDelaySchema,
    act2Interrupt('construction_delay'),
  )
  const allocationRules = check(
    'interrupts_act2.json › gpu_allocation',
    gpuAllocationSchema,
    act2Interrupt('gpu_allocation'),
  )
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
  const failureWave = check(
    'interrupts.json › failure_wave',
    failureWaveRulesSchema,
    rawInterrupt('failure_wave'),
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
    !marketAct2Rows ||
    !marketQuarterlyAct2Rows ||
    !capitalFile ||
    !capitalAct2File ||
    !conversionsFile ||
    !tenantsFile ||
    !gpusFile ||
    !delayRules ||
    !allocationRules ||
    !rivalsFile ||
    !auction ||
    !curtailment ||
    !heat ||
    !hires ||
    !merge ||
    !eventsFile ||
    !readMarket ||
    !failureWave ||
    !negotiation ||
    !shocksFile
  ) {
    throw new ContentError(problems)
  }

  // Market: group each act's weeks by quarter and make every quarter exactly 13 weeks long.
  // Calendar quarters have 12–14 Mondays; a missing 13th week repeats week 12. A 14th week is
  // dropped: in Act I the last one (as it always was, so Act I plays exactly as before); in
  // Act II an earlier one, because Act II's last week of each quarter holds the real quarter close.
  const quarters: string[] = []
  const market: MarketWeek[][] = []
  const acts: ActSpan[] = []
  const perQuarter = BALANCE.weeksPerQuarter
  function addAct(
    act: ActSpan['act'],
    file: string,
    rows: MarketWeek[],
    keepLastWeek: boolean,
  ) {
    const firstQuarter = quarters.length
    const actQuarters: string[] = []
    const actWeeks: MarketWeek[][] = []
    for (const row of rows) {
      if (actQuarters.at(-1) !== row.quarter) {
        if (
          actQuarters.includes(row.quarter) ||
          quarters.includes(row.quarter)
        ) {
          problems.push(
            `${file} › week ${row.week}: quarter ${row.quarter} appears twice`,
          )
        }
        actQuarters.push(row.quarter)
        actWeeks.push([])
      }
      actWeeks.at(-1)!.push(row)
    }
    actWeeks.forEach((weeks, i) => {
      if (weeks.length < perQuarter - 1 || weeks.length > perQuarter + 1) {
        problems.push(
          `${file} › ${actQuarters[i]}: has ${weeks.length} weeks, expected 12–14`,
        )
      }
      const kept =
        keepLastWeek && weeks.length > perQuarter
          ? [...weeks.slice(0, perQuarter - 1), weeks.at(-1)!]
          : weeks
      market.push(
        Array.from(
          { length: perQuarter },
          (_, w) => kept[Math.min(w, kept.length - 1)],
        ),
      )
    })
    quarters.push(...actQuarters)
    acts.push({ act, firstQuarter, lastQuarter: quarters.length - 1 })
  }
  addAct(1, 'market_weekly', marketRows.map(act1Week), false)
  addAct(2, 'market_weekly_act2', marketAct2Rows.map(act2Week), true)
  quarters.slice(1).forEach((q, i) => {
    if (q !== nextQuarter(quarters[i])) {
      problems.push(
        `market: ${quarters[i]} is followed by ${q}, expected ${nextQuarter(quarters[i])}`,
      )
    }
  })
  // Act I's content (machines, power paths, multiples, loans, rivals, auctions) only has to
  // cover Act I's quarters. What the sim uses after 2022Q3 comes in the Act II steps.
  const act1Quarters = quarters.slice(0, acts[0].lastQuarter + 1)
  const lastQuarter = act1Quarters.at(-1)!

  // Act II's quarterly market: one row per Act II quarter, in order, and its BTC and ETH closes
  // must be the last week of the quarter in the weekly file (both come from the same closes).
  const act2Quarters = quarters.slice(acts[1].firstQuarter)
  const rowQuarters = marketQuarterlyAct2Rows.map((r) => r.quarter)
  if (rowQuarters.join() !== act2Quarters.join()) {
    problems.push(
      `market_quarterly_act2: has ${rowQuarters.join(', ')}; expected Act II's ${act2Quarters.join(', ')}`,
    )
  } else {
    marketQuarterlyAct2Rows.forEach((r, i) => {
      const last = market[acts[1].firstQuarter + i].at(-1)!
      if (r.btc_usd_close !== last.btc_usd || r.eth_usd_close !== last.eth_usd)
        problems.push(
          `market_quarterly_act2 › ${r.quarter}: closes (BTC ${r.btc_usd_close}, ETH ${r.eth_usd_close}) don't match the weekly file's last week (BTC ${last.btc_usd}, ETH ${last.eth_usd})`,
        )
    })
  }
  // Act II multiples: every anchor must be an Act II quarter, and the first and last Act II
  // quarters must be anchors, so every quarter in between can be interpolated.
  const multiples = capitalAct2File.era_multiple_ev_ebitda
  const interpolated = {
    mining: interpolate('mining', multiples.mining),
    aiInfra: interpolate('ai_infra', multiples.ai_infra),
  }
  function interpolate(field: string, anchors: Record<string, number>) {
    const at = Object.entries(anchors)
      .map(([q, v]) => ({ i: act2Quarters.indexOf(q), q, v }))
      .sort((a, b) => a.i - b.i)
    for (const a of at)
      if (a.i < 0)
        problems.push(
          `capital_act2.json › era_multiple_ev_ebitda.${field}: ${a.q} isn't an Act II quarter`,
        )
    const inside = at.filter((a) => a.i >= 0)
    if (inside[0]?.i !== 0 || inside.at(-1)?.i !== act2Quarters.length - 1) {
      problems.push(
        `capital_act2.json › era_multiple_ev_ebitda.${field}: needs a value for ${act2Quarters[0]} and ${act2Quarters.at(-1)}`,
      )
      return act2Quarters.map(() => 0)
    }
    return act2Quarters.map((_, i) => {
      const next = inside.findIndex((a) => a.i >= i)
      const b = inside[next]
      if (b.i === i) return b.v
      const a = inside[next - 1]
      return a.v + ((b.v - a.v) * (i - a.i)) / (b.i - a.i)
    })
  }
  // Hosting: the same-site conversion's flat cost, and a rate for Act II's first year at least.
  const hostingConversion = conversionsFile.conversions.find(
    (c) => c.id === 'mining_to_hosting_same_site',
  )
  const hostingCapex = flatCapexSchema.safeParse(
    hostingConversion?.capex_usd_mw,
  )
  if (!hostingConversion || !hostingCapex.success)
    problems.push(
      'conversions.json: needs mining_to_hosting_same_site with a capex_usd_mw { value }',
    )
  const hostingRates = tenantsFile.hosting_market_2022_2024.rate_usd_kwh
  const firstAct2Year = act2Quarters[0].slice(0, 4)
  if (hostingRates[firstAct2Year] === undefined)
    problems.push(
      `tenants.json › hosting_market_2022_2024.rate_usd_kwh: no rate for ${firstAct2Year}`,
    )
  const hosting: Content['hosting'] = {
    conversionCapexUsdMw: hostingCapex.success ? hostingCapex.data.value : 0,
    buildQuarters: hostingConversion?.build_quarters ?? 0,
    rateUsdKwhByYear: hostingRates,
  }

  // Act II regions for Act I sites (balance.ts act2Regions): known tiers and region columns only.
  for (const [tier, region] of Object.entries(BALANCE.act2Regions.byTier)) {
    if (!sitesFile.tiers.some((t) => t.id === tier))
      problems.push(`balance.ts › act2Regions: unknown site tier "${tier}"`)
    if (!(POWER_REGIONS as readonly string[]).includes(region))
      problems.push(`balance.ts › act2Regions: unknown region "${region}"`)
  }
  for (const tier of BALANCE.act2Regions.premiumTiers) {
    const t = sitesFile.tiers.find((x) => x.id === tier)
    if (!t?.power_path?.[firstAct2Year])
      problems.push(
        `balance.ts › act2Regions: premium tier "${tier}" needs a ${firstAct2Year} power_path`,
      )
  }

  const act2Market = marketQuarterlyAct2Rows.map((r, i) =>
    act2QuarterOf(r, {
      mining: interpolated.mining[i] ?? 0,
      aiInfra: interpolated.aiInfra[i] ?? 0,
    }),
  )

  // Projects (scope 0.2 §2.5): tenant cards, build times, the pilot, GPUs, cap rates, backlog
  // weights and the delay / allocation rules, from the Act II content files.
  const conversion = (id: string) =>
    conversionsFile.conversions.find((c) => c.id === id) as
      Record<string, unknown> | undefined
  const retrofit = conversion('mining_or_idle_to_ai_shell_retrofit')
  const shellToFull = conversion('shell_to_fullstack')
  const pilotRaw = check(
    'conversions.json › pilot_cluster',
    pilotClusterSchema,
    conversion('pilot_cluster'),
  )
  if (typeof retrofit?.build_quarters !== 'number')
    problems.push(
      'conversions.json: needs mining_or_idle_to_ai_shell_retrofit with build_quarters',
    )
  if (typeof shellToFull?.build_quarters_additional !== 'number')
    problems.push(
      'conversions.json: needs shell_to_fullstack with build_quarters_additional',
    )
  const tenantCards: TenantCard[] = tenantsFile.tenant_cards.flatMap((c) =>
    c.type === 'spot' || c.price_usd_mw_yr === undefined
      ? []
      : [
          {
            id: c.id,
            type: c.type,
            rating: c.credit_rating,
            priceUsdMwYr: c.price_usd_mw_yr,
            termYears: c.term_years,
            prepaymentShare: c.prepayment_pct / 100,
            readyBy: c.ready_by_window_quarters,
            capexCreditUsdMw: c.capex_credit_cap_usd_mw ?? 0,
            needsKnowHow: /level (\d)/.exec(c.unlock ?? '')?.[1]
              ? Number(/level (\d)/.exec(c.unlock!)![1])
              : undefined,
            regionLock: c.region_lock,
          },
        ],
  )
  const gpus: GpuGeneration[] = gpusFile.generations.flatMap((g) =>
    g.in_alpha_0_2 &&
    (g.id === 'h100' || g.id === 'h200' || g.id === 'b200') &&
    g.gpus_per_mw_it_load
      ? [
          {
            id: g.id,
            from: g.available_from.slice(0, 6),
            gpusPerMw: g.gpus_per_mw_it_load.value,
          },
        ]
      : [],
  )
  const delayChoice = (id: string) =>
    delayRules.choices.find((c) => c.id === id)
  for (const id of ['accelerate', 'accept_slip', 'change_contractor'])
    if (!delayChoice(id))
      problems.push(
        `interrupts_act2.json › construction_delay: needs a "${id}" choice`,
      )
  const weights = capitalAct2File.backlog_weight_pct_of_remaining_revenue
  const projects: ProjectRules = {
    tenantCards,
    walkChanceLate2q: tenantsFile.take_or_pay_terms.walk_chance_late_2q,
    latePenaltyShareYr:
      tenantsFile.take_or_pay_terms
        .penalty_pct_of_annual_contract_per_quarter_late.value / 100,
    retrofit: { buildQuarters: Number(retrofit?.build_quarters ?? 0) },
    fullStack: {
      extraBuildQuarters: Number(shellToFull?.build_quarters_additional ?? 0),
    },
    pilot: {
      kwMin: (pilotRaw?.mw_min ?? 0) * 1000,
      kwMax: (pilotRaw?.mw_max ?? 0) * 1000,
      kwStep: (pilotRaw?.mw_step ?? 0) * 1000,
      from: pilotRaw?.available_from ?? act2Quarters[0],
      buildQuarters: pilotRaw?.build_quarters ?? 1,
      gpu: pilotRaw?.gpu ?? 'h100',
      utilisationBase: pilotRaw?.revenue.utilisation_base ?? 0,
      utilisationBonusByKnowHow:
        pilotRaw?.revenue.utilisation_bonus_by_know_how ?? {},
    },
    gpus,
    capRates: {
      hyperscale: capitalAct2File.cap_rate_pct.hyperscale_nnn_100mw_plus,
      shell: capitalAct2File.cap_rate_pct.powered_shell_stabilized,
    },
    backlogWeights: {
      a: weights.a_aa_tenant / 100,
      bbb: weights.bbb_tenant / 100,
      below: weights.ai_lab_tenant / 100,
      spot: weights.spot / 100,
    },
    delay: {
      chance: delayRules.chance_pct.value / 100,
      accelerateShareOfCapex:
        (delayChoice('accelerate')?.cost_pct_of_capex ?? 0) / 100,
      contractorBandwidthNext:
        delayChoice('change_contractor')?.bandwidth_next_quarter ?? 0,
      contractorNoSlipChance:
        delayChoice('change_contractor')?.no_slip_chance ?? 0,
      default: delayRules.default,
    },
    allocationChance: allocationRules.chance_pct / 100,
  }
  if (!gpus.some((g) => g.id === projects.pilot.gpu))
    problems.push(
      `conversions.json › pilot_cluster: GPU "${projects.pilot.gpu}" isn't a per-unit GPU in gpus.json`,
    )

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
    // Act II prices (owner B7): the used/new ratio comes from a model and quarter with both.
    const from = m.act2_price?.used_ratio_from
    if (from) {
      const src = machinesFile.models.find((x) => x.id === from.model)
      if (
        !src ||
        src.price_new[from.quarter] === undefined ||
        src.price_used[from.quarter] === undefined
      )
        problems.push(
          `machines.json › ${m.id}.act2_price: ${from.model} has no new and used price in ${from.quarter}`,
        )
    }
  }

  // Sites: every flaw must exist, and every year of Act I needs a power price.
  const years = [...new Set(act1Quarters.map((q) => q.slice(0, 4)))]
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

  for (const q of act1Quarters) {
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
  for (const year of new Set(act1Quarters.map((q) => Number(q.slice(0, 4))))) {
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
        if (!act1Quarters.includes(q))
          problems.push(`rivals.json › ${r.id}.${field}: ${q} is outside Act I`)
      }
    }
  }
  for (const win of auction.windows) {
    if (!act1Quarters.includes(win.from) || !act1Quarters.includes(win.to)) {
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
    acts,
    act2Market,
    hosting,
    projects,
    machines: machinesFile.models,
    siteTiers: sitesFile.tiers,
    flaws: sitesFile.flaws,
    interrupts: { maxPerQuarter: interruptsFile.max_per_quarter, byId },
    eraMultiple: capitalFile.era_multiple_ev_ebitda,
    ladder: Object.fromEntries(capitalFile.ladder.map((s) => [s.id, s])),
    pitch: capitalFile.pitch,
    equipmentLoans: capitalFile.loans.equipment,
    constructionLoan: capitalFile.loans.construction,
    gpuCap: {
      window: machinesFile.gpu_cap.window,
      kwPerQuarter: machinesFile.gpu_cap.kw_per_quarter,
      usedPriceMinNewMult: machinesFile.gpu_cap.used_price_min_new_mult,
    },
    cryptoLoan: capitalFile.loans.game_crypto_loan,
    rivals: rivalsFile.rivals,
    auction,
    curtailment,
    heat,
    hires,
    readMarket,
    failureWave,
    merge,
    events,
    negotiation,
    shocks,
  }
}

/** An Act I market row as the sim sees it: no Act II columns. */
function act1Week(row: MarketWeekAct1): MarketWeek {
  return {
    ...row,
    asic_price_usd_th_old: null,
    asic_price_usd_th_mid: null,
    asic_price_usd_th_new: null,
    asic_price_usd_th_latest: null,
    gpu_h100_hyperscaler_usd_hr: null,
    gpu_h100_neocloud_usd_hr: null,
    gpu_h100_spot_usd_hr: null,
    estimate: null,
  }
}

/** An Act II market row: no ETH mining after the Merge, so ETH mining revenue is 0 and the
 * ETH network columns (which Act II's file doesn't have) are null. */
function act2Week(row: MarketWeekAct2): MarketWeek {
  return {
    ...row,
    eth_hashrate_THs: null,
    eth_blocks_day: null,
    eth_block_reward: null,
    eth_rev_usd_mh_day: 0,
  }
}

/** A market_quarterly_act2 row, reshaped for the sim. */
function act2QuarterOf(
  r: MarketQuarterAct2Row,
  multiple: Act2Quarter['multiple'],
): Act2Quarter {
  return {
    quarter: r.quarter,
    multiple,
    gpuRentalUsdHr: {
      h100: {
        hyperscaler: r.gpu_h100_hyperscaler_usd_hr,
        neocloud: r.gpu_h100_neocloud_usd_hr,
        spot: r.gpu_h100_spot_usd_hr,
        contract1y: r.gpu_h100_1yr_contract_usd_hr,
      },
      a100Hyperscaler: r.gpu_a100_hyperscaler_usd_hr,
      h200: {
        hyperscaler: r.gpu_h200_hyperscaler_usd_hr,
        neocloud: r.gpu_h200_neocloud_usd_hr,
      },
      b200: {
        hyperscaler: r.gpu_b200_hyperscaler_usd_hr,
        neocloud: r.gpu_b200_neocloud_usd_hr,
      },
      gb200Blended: r.gpu_gb200nvl72_blended_usd_hr,
    },
    gpuPurchaseUsd: {
      h100: r.h100_unit_purchase_usd,
      h100Hgx8: r.h100_hgx8_system_usd,
      h200: r.h200_unit_purchase_usd,
      b200: r.b200_unit_purchase_usd,
      gb200Rack: r.gb200_nvl72_rack_usd,
    },
    capexUsdMw: {
      gpuHallToHosting: r.capex_hosting_usd_mw,
      retrofitShell: r.capex_retrofit_shell_usd_mw,
      greenfieldShell: r.capex_greenfield_shell_usd_mw,
      fullstackIncremental: r.capex_fullstack_incremental_usd_mw,
    },
    sofrPct: r.sofr_pct,
    hySpreadBps: r.hy_spread_bps,
    ddtlSpreadBps: r.ddtl_spread_bps,
    capRateHyperscalePct: r.cap_rate_hyperscale_pct,
    evPerMwUsdM: {
      mining: r.ev_per_mw_mining_usd_m,
      aiAnnounced: r.ev_per_mw_ai_announced_usd_m,
      aiStabilized: r.ev_per_mw_ai_stabilized_usd_m,
    },
    powerUsdKwh: {
      ercot: r.power_usd_kwh_ercot,
      pjm: r.power_usd_kwh_pjm,
      ohio: r.power_usd_kwh_ohio,
      georgia: r.power_usd_kwh_georgia,
      arizona: r.power_usd_kwh_arizona,
      nordics: r.power_usd_kwh_nordics,
    },
    pjmCapacityUsdMwDay: r.pjm_capacity_price_usd_mwday,
    hyperscalerCapexUsdBnQ: r.hyperscaler_capex_usd_bn_q,
    aiDemandIndex: r.ai_demand_index_0_100,
    estimate: r.estimate,
  }
}

/** Act II's market for a quarter index, or undefined in Act I. */
export function act2Quarter(quarter: number): Act2Quarter | undefined {
  return CONTENT.act2Market[quarter - CONTENT.acts[1].firstQuarter]
}

/** The act a quarter index belongs to (quarters past the end count as the last act). */
export function actOfQuarter(quarter: number): ActSpan['act'] {
  return (
    CONTENT.acts.find((a) => quarter <= a.lastQuarter) ?? CONTENT.acts.at(-1)!
  ).act
}

/** The last quarter index of an act (Act I: 2022Q3). */
export function actLastQuarter(act: ActSpan['act']): number {
  return CONTENT.acts.find((a) => a.act === act)!.lastQuarter
}

/**
 * The quarter label to read an Act I content value with (a price, a power path, a multiple,
 * a rival's numbers). Act I's files have no values after 2022Q3, so from 2022Q4 on the value
 * of 2022Q3 holds, until Act II content replaces it. Dated windows ("open until 2022Q2")
 * compare the real quarter instead, so they stay closed.
 */
export function act1ValueQuarter(quarter: number): string {
  return CONTENT.quarters[Math.min(quarter, actLastQuarter(1))]
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
  marketAct2: marketAct2Raw,
  marketQuarterlyAct2: marketQuarterlyAct2Raw,
  capital: capitalRaw,
  capitalAct2: capitalAct2Raw,
  conversions: conversionsRaw,
  tenants: tenantsRaw,
  gpus: gpusRaw,
  interruptsAct2: interruptsAct2Raw,
  rivals: rivalsRaw,
  heat: heatRaw,
  hires: hiresRaw,
  merge: mergeRaw,
  events: eventsRaw,
  shocks: shocksRaw,
})
