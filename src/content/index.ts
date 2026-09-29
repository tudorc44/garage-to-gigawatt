// Loads the content files, checks them against the schemas, and reshapes them for the sim.
// Act I's files plus Act II's (the timeline runs 2017Q1 → 2026Q4). Any problem stops the game
// with a list of what's wrong, where.
import type { z } from 'zod'
import machinesRaw from './machines.json' with { type: 'json' }
import sitesRaw from './sites.json' with { type: 'json' }
import interruptsRaw from './interrupts.json' with { type: 'json' }
import marketRaw from './market_weekly.json' with { type: 'json' }
import marketAct2Raw from './market_weekly_act2.json' with { type: 'json' }
import marketPrologueRaw from './market_weekly_prologue.json' with { type: 'json' }
import marketQuarterlyAct2Raw from './market_quarterly_act2.json' with { type: 'json' }
import capitalRaw from './capital.json' with { type: 'json' }
import capitalAct2Raw from './capital_act2.json' with { type: 'json' }
import conversionsRaw from './conversions.json' with { type: 'json' }
import tenantsRaw from './tenants.json' with { type: 'json' }
import gpusRaw from './gpus.json' with { type: 'json' }
import interruptsAct2Raw from './interrupts_act2.json' with { type: 'json' }
import lendersRaw from './lenders.json' with { type: 'json' }
import regionsRaw from './regions.json' with { type: 'json' }
import sitesAct2Raw from './sites_act2.json' with { type: 'json' }
import rivalsAct2Raw from './rivals_act2.json' with { type: 'json' }
import machinesPrologueRaw from './machines_prologue.json' with { type: 'json' }
import prologueRaw from './prologue.json' with { type: 'json' }
import eventsPrologueRaw from './events_prologue.json' with { type: 'json' }
import hiresAct2Raw from './hires_act2.json' with { type: 'json' }
import signalsS0Raw from './signals_s0.json' with { type: 'json' }
import signalsS1Raw from './signals_s1.json' with { type: 'json' }
import signalsS2Raw from './signals_s2.json' with { type: 'json' }
import signalsS3Raw from './signals_s3.json' with { type: 'json' }
import marketS0Raw from './market_s0.json' with { type: 'json' }
import marketS1Raw from './market_s1.json' with { type: 'json' }
import marketS2Raw from './market_s2.json' with { type: 'json' }
import marketS3Raw from './market_s3.json' with { type: 'json' }
import marketWeeklyS0Raw from './market_weekly_s0.json' with { type: 'json' }
import marketWeeklyS1Raw from './market_weekly_s1.json' with { type: 'json' }
import marketWeeklyS2Raw from './market_weekly_s2.json' with { type: 'json' }
import marketWeeklyS3Raw from './market_weekly_s3.json' with { type: 'json' }
import eventsAct2Raw from './events_act2.json' with { type: 'json' }
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
  gpuFailureWaveSchema,
  gpusFileSchema,
  interruptsAct2FileSchema,
  lendersFileSchema,
  pilotClusterSchema,
  spotShockSchema,
  curtailmentAiSchema,
  gridUpgradeSchema,
  onSiteGasSchema,
  regionsFileSchema,
  sitesAct2FileSchema,
  tenantsFileSchema,
  curtailmentRulesSchema,
  heatFileSchema,
  hiresFileSchema,
  hiresAct2FileSchema,
  eventsAct2FileSchema,
  failureWaveRulesSchema,
  mergeFileSchema,
  eventsFileSchema,
  readMarketSchema,
  interruptsFileSchema,
  machinesFileSchema,
  marketAct2Schema,
  marketAct3Schema,
  marketQuarterlyAct2Schema,
  marketQuarterlyAct3Schema,
  marketSchema,
  SCENARIO_IDS,
  signalsFileSchema,
  type SignalIndicator,
  type MarketQuarterAct3Row,
  type ScenarioId,
  negotiationRulesSchema,
  rivalsFileSchema,
  rivalsAct2FileSchema,
  machinesPrologueFileSchema,
  prologueFileSchema,
  eventsPrologueFileSchema,
  type PrologueCardFile,
  type PrologueRules,
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
  type MarketEffect,
  type Interrupt,
  type LadderStep,
  type Machine,
  type MarketWeek,
  type MarketWeekAct1,
  type MarketWeekAct2,
  type MarketWeekAct3,
  type MarketQuarterAct2Row,
  type NegotiationRules,
  type PitchRules,
  type Rival,
  type RivalAct2,
  type RegionPolicy,
  type RegionRaw,
  type SiteCategory,
  type SiteTier,
} from './schemas.ts'

export { BALANCE }
export { SCENARIO_IDS }
export {
  SIGNAL_IDS,
  type SignalId,
  type SignalIndicator,
  type SignalPoint,
} from './schemas.ts'
export type {
  ScenarioId,
  MarketEffect,
  RegionPolicy,
  SiteCategory,
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
  RivalAct2,
  SiteTier,
}

/** Where an act sits on the game's timeline (quarter indexes, inclusive). */
export interface ActSpan {
  /**
   * 0 = the prologue (Alpha 0.3, quarter indices −32 … −1), 1 = Act I, 2 = Act II, 3 = Act III
   * (M11.3: 2027Q1–2030Q4, indices 40–55; unreachable from play).
   */
  act: 0 | 1 | 2 | 3
  firstQuarter: number
  lastQuarter: number
}

/** One Act III market scenario: 16 quarters (2027Q1–2030Q4), each with its quarterly row and 13 weeks. */
export interface Act3Scenario {
  /** The quarterly market file, one row per quarter. */
  quarterly: MarketQuarterAct3Row[]
  /**
   * The same rows in Act II's shape (M11.4a), with the era multiples read from the file's own
   * mining and ai_infra columns (rebased at the boundary). Read through quarterInputs().
   */
  inputs: Act2Quarter[]
  /** weeks[n][week]: n = 0 is the first Act III quarter (2027Q1); exactly 13 weeks each. */
  weeks: MarketWeek[][]
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
  /** A shell at a site that hosts (the Merge "hosting" head start): conversions.json › hosting_to_ai_shell. */
  shellReady: { capexDiscount: number; quarterDiscount: number }
  /**
   * New power for a project (the Power slot beyond existing MW; conversions.json): a grid upgrade
   * (a cost per MW, a queue in quarters by region) or on-site gas (a cost per MW, a build, Heat).
   */
  power: {
    grid: {
      capexUsdMw: number
      quartersByRegion: Record<PowerRegion, [number, number]>
    }
    gas: { capexUsdMw: number; buildQuarters: number; heatDelta: number }
  }
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
  /** A random spot price shock's chance per quarter after the scripted one (interrupts_act2.json). */
  spotShockChance: number
  /** An AI site's SLA credit when it curtails, as a share of a month's charge. */
  slaPenaltyShareMonth: number
  /** The GPU failure wave (interrupts_act2.json › gpu_failure_wave, M8.4). */
  gpuWave: {
    chance: number
    minGpus: number
    failedShareRange: readonly [number, number]
    replaceUsdPerGpu: number
    slaCreditMult: number
  }
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

/** An Act II region (regions.json): its queue, Heat and anger modifiers and policy events, in date order. */
export type Region = Omit<RegionRaw, 'id'> & { id: PowerRegion }

export type BacklogQuality = 'weak' | 'mixed' | 'strong'
export type LeverageBand = 'lt2' | 'from2to4' | 'from4to6' | 'gt6'

/** lenders.json, turned into what the sim needs. Shares are fractions (0.6, not 60). */
export interface FinanceRules {
  projectDebt: {
    from: string
    /** Share of capex it can fund: [low, high] (doc 18 §7.1: 60–75%). */
    ltv: [number, number]
    /** Yearly rate (fraction) by Act II quarter index, from the anchors, held before and after. */
    rateByQuarter: number[]
  }
  /** The spread comes from the market file's ddtl_spread_bps (doc 18's 2026 split is in balance.ts). */
  ddtl: { from: string }
  equity: { dilution: [number, number] }
  jv: { from: string; funds: [number, number]; takes: [number, number] }
  backstop: { equity: [number, number] }
  rating: {
    matrix: Record<LeverageBand, Record<BacklogQuality, string>>
    min: string
    max: string
    runwayQuarters: number
    runwayNotches: number
  }
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
  /**
   * Act III's four market scenarios (M11.1). Read only by a state in Act III that has a scenario id
   * (marketWeek's optional argument); nothing else reads them yet.
   */
  act3Scenarios: Record<ScenarioId, Act3Scenario>
  /**
   * Act III's authored Signals (M11.2), by scenario: the six indicators in file order, runtime fields
   * only. The hidden authoring fields are never loaded here (see signalsHidden.ts).
   */
  signals: Record<ScenarioId, SignalIndicator[]>
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
  /** Act II capital (scope 0.2 §2.2, §2.7; doc 18 §7): lenders.json, per Act II quarter where it varies. */
  finance: FinanceRules
  /** The distressed lifeline (capital_act2.json › lifeline_card_final_numbers; scope 0.2 §2.10). */
  lifeline: {
    siteKw: number
    priceUsd: number
    /** The bridge loan's yearly rate (a fraction) and term. */
    apr: number
    tenorQuarters: number
    /** The bridge is sized so cash also reaches this. */
    cashFloorUsd: number
  }
  /** The standalone preset's balance sheet (capital_act2.json › standalone_preset_final_numbers). */
  preset: { cashUsd: number; equipmentDebtUsd: number; founderStake: number }
  /** The six Act II regions (regions.json), by the market file's region id, and the national policies. */
  regions: Record<PowerRegion, Region>
  nationalPolicies: RegionPolicy[]
  /** Act II scouting (sites_act2.json): the site categories and their hidden flaws. */
  act2Sites: { categories: SiteCategory[]; flaws: Record<string, Flaw> }
  /**
   * Act II hires (hires_act2.json): each hire's yearly salary per Act II quarter (index 0 = 2022Q4,
   * interpolated between the anchors, held at the ends), by game hire id; and the new hires.
   */
  hiresAct2: { salaryYr: Record<string, number[]>; newHires: Hire[] }
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
  /** The 5 Act II rivals (rivals_act2.json), in file order: they replace Act I's from 2022Q4. */
  act2Rivals: RivalAct2[]
  /**
   * The prologue (Alpha 0.3, Act 0): its machine ladder (machines_prologue.json, found by getModel
   * but not in `machines`, so Act I's lists never show them) and its rules (prologue.json).
   */
  prologue: {
    machines: Machine[]
    rules: PrologueRules
    /** The prologue's 24 cards (events_prologue.json) and its random-card engine. */
    events: {
      random_chance_per_quarter: number
      random_start: string
      random_week_range: [number, number]
      cards: PrologueCard[]
    }
  }
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
  /** The act whose deck it's in: events.json is Act I's, events_act2.json Act II's. */
  act: 1 | 2
}

/** A prologue card (events_prologue.json); scripted ones carry their quarter and week index. */
export type PrologueCard = PrologueCardFile & {
  quarterIndex?: number
  weekIndex?: number
}

/** One act's random-card settings. */
export interface RandomCardRules {
  randomChance: number
  /** First quarter index with random cards. */
  randomStart: number
  /** Week numbers (1–13) a random card can come after. */
  randomWeeks: [number, number]
}

export interface EventRules extends RandomCardRules {
  /** Act II's own random-card settings (events_act2.json); the top-level ones are Act I's. */
  act2: RandomCardRules
  winterQuarters: string[]
  cards: EventCard[]
  byId: Record<string, EventCard>
  /** The Act II timeline's market effects (events_act2.json › market_effects). */
  marketEffects: MarketEffect[]
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
  marketPrologue: unknown
  /** The four Act III scenarios' market files (M11.1): quarterly (market_sN) and weekly. */
  act3Scenarios: Record<ScenarioId, { quarterly: unknown; weekly: unknown }>
  /** The four Act III signals files (M11.2), by scenario. */
  signals: Record<ScenarioId, unknown>
  capital: unknown
  capitalAct2: unknown
  conversions: unknown
  tenants: unknown
  gpus: unknown
  interruptsAct2: unknown
  lenders: unknown
  regions: unknown
  sitesAct2: unknown
  hiresAct2: unknown
  eventsAct2: unknown
  rivals: unknown
  rivalsAct2: unknown
  machinesPrologue: unknown
  prologue: unknown
  eventsPrologue: unknown
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
  // The prologue's market (Alpha 0.3 §2.1): Act I's columns; before ETH exists (2015-07-27) its
  // cells are empty in the file and 0 here ("no ETH yet": no price, nothing to mine).
  const prologueRows = check(
    'market_weekly_prologue',
    marketSchema,
    Array.isArray(raw.marketPrologue)
      ? (raw.marketPrologue as Record<string, unknown>[]).map((r) => ({
          ...r,
          eth_usd: r.eth_usd ?? 0,
          eth_hashrate_THs: r.eth_hashrate_THs ?? 0,
          eth_blocks_day: r.eth_blocks_day ?? 0,
          eth_block_reward: r.eth_block_reward ?? 0,
          eth_rev_usd_mh_day: r.eth_rev_usd_mh_day ?? 0,
        }))
      : raw.marketPrologue,
  )
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
  const lendersFile = check('lenders.json', lendersFileSchema, raw.lenders)
  const regionsFile = check('regions.json', regionsFileSchema, raw.regions)
  const sitesAct2File = check(
    'sites_act2.json',
    sitesAct2FileSchema,
    raw.sitesAct2,
  )
  const hiresAct2File = check(
    'hires_act2.json',
    hiresAct2FileSchema,
    raw.hiresAct2,
  )
  const eventsAct2File = check(
    'events_act2.json',
    eventsAct2FileSchema,
    raw.eventsAct2,
  )
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
  const spotShockRules = check(
    'interrupts_act2.json › spot_price_shock',
    spotShockSchema,
    act2Interrupt('spot_price_shock'),
  )
  const curtailAiRules = check(
    'interrupts_act2.json › curtailment_ai_sites',
    curtailmentAiSchema,
    interruptsAct2File?.updated_interrupts.find(
      (i) => i.id === 'curtailment_ai_sites',
    ),
  )
  const gpuWaveRules = check(
    'interrupts_act2.json › gpu_failure_wave',
    gpuFailureWaveSchema,
    interruptsAct2File?.updated_interrupts.find(
      (i) => i.id === 'gpu_failure_wave',
    ),
  )
  const rivalsFile = check('rivals.json', rivalsFileSchema, raw.rivals)
  const rivalsAct2File = check(
    'rivals_act2.json',
    rivalsAct2FileSchema,
    raw.rivalsAct2,
  )
  const machinesPrologueFile = check(
    'machines_prologue.json',
    machinesPrologueFileSchema,
    raw.machinesPrologue,
  )
  const prologueFile = check('prologue.json', prologueFileSchema, raw.prologue)
  const eventsPrologueFile = check(
    'events_prologue.json',
    eventsPrologueFileSchema,
    raw.eventsPrologue,
  )
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
    !prologueRows ||
    !marketAct2Rows ||
    !marketQuarterlyAct2Rows ||
    !capitalFile ||
    !capitalAct2File ||
    !conversionsFile ||
    !tenantsFile ||
    !gpusFile ||
    !lendersFile ||
    !regionsFile ||
    !sitesAct2File ||
    !hiresAct2File ||
    !eventsAct2File ||
    !delayRules ||
    !allocationRules ||
    !spotShockRules ||
    !curtailAiRules ||
    !gpuWaveRules ||
    !rivalsFile ||
    !rivalsAct2File ||
    !machinesPrologueFile ||
    !prologueFile ||
    !eventsPrologueFile ||
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
  // The prologue (Act 0, Alpha 0.3): 2009Q1–2016Q4 at quarter indices −32 … −1, set as properties
  // of the same arrays, so every Act I and Act II index (and every save and golden) stays as it was.
  // `quarters.indexOf` and loops over the arrays don't see them; use prologueQuarter() for a label.
  {
    const labels: string[] = []
    const weeks: MarketWeek[][] = []
    for (const row of prologueRows.map(act1Week)) {
      if (labels.at(-1) !== row.quarter) {
        labels.push(row.quarter)
        weeks.push([])
      }
      weeks.at(-1)!.push(row)
    }
    if (labels.at(-1) && nextQuarter(labels.at(-1)!) !== quarters[0])
      problems.push(
        `market_weekly_prologue: ends ${labels.at(-1)}, expected the quarter before ${quarters[0]}`,
      )
    labels.forEach((label, i) => {
      const q = i - labels.length
      const w = weeks[i]
      if (w.length < perQuarter - 1 || w.length > perQuarter + 1)
        problems.push(
          `market_weekly_prologue › ${label}: has ${w.length} weeks, expected 12–14`,
        )
      // A 14th week is dropped like Act I's (its last); a 12-week quarter repeats week 12.
      ;(quarters as unknown as Record<number, string>)[q] = label
      ;(market as unknown as Record<number, MarketWeek[]>)[q] = Array.from(
        { length: perQuarter },
        (_, k) => w[Math.min(k, w.length - 1)],
      )
    })
    acts.push({
      act: 0,
      firstQuarter: -labels.length,
      lastQuarter: -1,
    })
  }
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
  // Act II capital (lenders.json): rate and spread anchors held before the first and after the last.
  const held = (anchors: Record<string, number>) => {
    const at = Object.entries(anchors)
      .map(([q, v]) => ({ i: act2Quarters.indexOf(q), v }))
      .filter((a) => a.i >= 0)
      .sort((a, b) => a.i - b.i)
    return act2Quarters.map((_, i) => {
      const next = at.findIndex((a) => a.i >= i)
      if (next < 0) return at.at(-1)?.v ?? 0
      const b = at[next]
      if (b.i === i || next === 0) return b.v
      const a = at[next - 1]
      return a.v + ((b.v - a.v) * (i - a.i)) / (b.i - a.i)
    })
  }
  const [projectDebt, ddtl, equityAtm, jv, backstop] = lendersFile.instruments
  const pct = ([a, b]: [number, number]): [number, number] => [a / 100, b / 100]
  const mapping = lendersFile.credit_rating_mapping
  const cells = (c: {
    weak_backlog: string
    mixed_backlog: string
    strong_backlog: string
  }) => ({
    weak: c.weak_backlog,
    mixed: c.mixed_backlog,
    strong: c.strong_backlog,
  })
  const finance: FinanceRules = {
    projectDebt: {
      from: projectDebt.available_from,
      ltv: pct(projectDebt.ltv_max_pct.value),
      rateByQuarter: held(projectDebt.rate_pct).map((r) => r / 100),
    },
    ddtl: { from: ddtl.available_from },
    equity: { dilution: pct(equityAtm.dilution_pct.value) },
    jv: {
      from: jv.available_from,
      funds: pct(jv.funds_pct_of_equity),
      takes: pct(jv.takes_pct_of_project),
    },
    backstop: { equity: pct(backstop.takes_pct_equity) },
    rating: {
      matrix: {
        lt2: cells(mapping.matrix.debt_to_ebitda_lt_2x),
        from2to4: cells(mapping.matrix.debt_to_ebitda_2_4x),
        from4to6: cells(mapping.matrix.debt_to_ebitda_4_6x),
        gt6: cells(mapping.matrix.debt_to_ebitda_gt_6x),
      },
      min: mapping.corporate_rating_range.min,
      max: mapping.corporate_rating_range.max,
      runwayQuarters: mapping.runway_notch.cash_runway_quarters_below,
      runwayNotches: mapping.runway_notch.notches,
    },
  }
  const scale = BALANCE.finance.ratingScale as readonly string[]
  for (const r of [
    finance.rating.min,
    finance.rating.max,
    ...Object.values(finance.rating.matrix).flatMap((c) => Object.values(c)),
  ])
    if (!scale.includes(r))
      problems.push(
        `lenders.json › credit_rating_mapping: "${r}" isn't on the rating scale (balance.ts › finance.ratingScale)`,
      )
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

  // Regions (regions.json): exactly the market file's six, policies inside Act II, known regions.
  const regions = {} as Record<PowerRegion, Region>
  for (const r of regionsFile.regions) {
    if (!(POWER_REGIONS as readonly string[]).includes(r.id)) {
      problems.push(
        `regions.json › ${r.id}: not a market region (${POWER_REGIONS.join(', ')})`,
      )
      continue
    }
    regions[r.id as PowerRegion] = {
      ...r,
      id: r.id as PowerRegion,
      policies: [...r.policies].sort((a, b) =>
        a.quarter < b.quarter ? -1 : 1,
      ),
    }
  }
  for (const id of POWER_REGIONS)
    if (!regions[id]) problems.push(`regions.json: no region "${id}"`)
  const allPolicies = [
    ...regionsFile.regions.flatMap((r) => r.policies),
    ...regionsFile.national,
  ]
  for (const p of allPolicies) {
    if (!act2Quarters.includes(p.quarter))
      problems.push(
        `regions.json › ${p.id}: ${p.quarter} isn't an Act II quarter`,
      )
    for (const region of Object.keys(p.effect.queue_quarters ?? {}))
      if (!(POWER_REGIONS as readonly string[]).includes(region))
        problems.push(`regions.json › ${p.id}: unknown region "${region}"`)
  }

  // Act II hires (hires_act2.json): salaries for every Act I hire, and the new hires' effects.
  const salaryYr: Record<string, number[]> = {}
  const newHires: Hire[] = []
  const act1HireIds = hires.list.map((h) => h.id)
  for (const h of hiresAct2File.hires) {
    if (!h.in_alpha_0_2) continue
    const id = BALANCE.act2Hires.idMap[h.id] ?? h.id
    const anchors = Object.fromEntries(
      Object.entries(h.salary_usd_yr).filter(
        (e): e is [string, number] =>
          /^\d{4}Q[1-4]$/.test(e[0]) && typeof e[1] === 'number',
      ),
    )
    salaryYr[id] = held(anchors)
    if (act1HireIds.includes(id)) continue
    const effect = BALANCE.act2Hires.effects[id]
    if (!effect)
      problems.push(`balance.ts › act2Hires.effects: no effect for "${id}"`)
    newHires.push({
      id,
      name: '',
      bio: '',
      salary_usd_year: { '2017': 0, '2021': 0 },
      effect: effect ?? {},
    })
  }
  for (const id of act1HireIds)
    if (!salaryYr[id])
      problems.push(
        `hires_act2.json: no Act II salary for the Act I hire "${id}"`,
      )

  // Act II scouting (sites_act2.json): windows inside Act II, every hidden flaw defined.
  for (const c of sitesAct2File.site_categories) {
    for (const q of c.window)
      if (!act2Quarters.includes(q))
        problems.push(`sites_act2.json › ${c.id}: ${q} isn't an Act II quarter`)
    for (const f of c.hidden_flaws)
      if (!sitesAct2File.flaws[f])
        problems.push(`sites_act2.json › ${c.id}: unknown flaw "${f}"`)
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
  const hostingToShell = conversion('hosting_to_ai_shell')
  if (
    typeof hostingToShell?.capex_usd_mw_discount_pct !== 'number' ||
    typeof hostingToShell.build_quarters_discount !== 'number'
  )
    problems.push(
      'conversions.json: needs hosting_to_ai_shell with capex_usd_mw_discount_pct and build_quarters_discount',
    )
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
  // New power (conversions.json › grid_upgrade, on_site_gas): regions keyed by the pack's region ids.
  const gridRaw = gridUpgradeSchema.safeParse(
    (conversionsFile as Record<string, unknown>).grid_upgrade,
  )
  const gasRaw = onSiteGasSchema.safeParse(
    (conversionsFile as Record<string, unknown>).on_site_gas,
  )
  if (!gridRaw.success)
    problems.push(
      'conversions.json › grid_upgrade: needs capex_usd_mw { value } and build_quarters_by_region',
    )
  if (!gasRaw.success)
    problems.push(
      'conversions.json › on_site_gas: needs capex_usd_mw { value }, build_quarters and heat_delta',
    )
  const quartersByRegion = {} as Record<PowerRegion, [number, number]>
  for (const id of POWER_REGIONS) {
    const packId = regionsFile.regions.find((r) => r.id === id)?.pack_id ?? id
    const q = gridRaw.data?.build_quarters_by_region[packId]
    if (!q && gridRaw.success)
      problems.push(
        `conversions.json › grid_upgrade.build_quarters_by_region: no "${packId}"`,
      )
    quartersByRegion[id] = q?.value ?? [0, 0]
  }
  const power: ProjectRules['power'] = {
    grid: {
      capexUsdMw: gridRaw.data?.capex_usd_mw.value ?? 0,
      quartersByRegion,
    },
    gas: {
      capexUsdMw: gasRaw.data?.capex_usd_mw.value ?? 0,
      buildQuarters: gasRaw.data?.build_quarters ?? 0,
      heatDelta: gasRaw.data?.heat_delta ?? 0,
    },
  }
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
    shellReady: {
      capexDiscount:
        Number(hostingToShell?.capex_usd_mw_discount_pct ?? 0) / 100,
      quarterDiscount: Number(hostingToShell?.build_quarters_discount ?? 0),
    },
    power,
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
    spotShockChance: spotShockRules.chance_pct_random / 100,
    slaPenaltyShareMonth: curtailAiRules.sla_penalty_pct_mrc.value / 100,
    gpuWave: {
      chance: gpuWaveRules.chance_pct / 100,
      minGpus: gpuWaveRules.min_gpus,
      failedShareRange: gpuWaveRules.failed_share_range,
      replaceUsdPerGpu: gpuWaveRules.replace_cost_usd_per_gpu,
      slaCreditMult: gpuWaveRules.sla_credit_mult,
    },
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

  const toCard =
    (file: string, act: 1 | 2) =>
    (e: EventCardRaw): EventCard => {
      if (e.type !== 'scripted') return { ...e, act }
      const qi = quarters.indexOf(e.quarter)
      const wi = qi < 0 ? -1 : market[qi].findIndex((w) => w.week === e.week_of)
      if (wi < 0)
        problems.push(
          `${file} › ${e.id}: week ${e.week_of} isn't a week of ${e.quarter}`,
        )
      if (qi >= 0 && actOf(qi) !== act)
        problems.push(`${file} › ${e.id}: ${e.quarter} isn't in Act ${act}`)
      return { ...e, quarterIndex: qi, weekIndex: wi, act }
    }
  const actOf = (qi: number) => (qi <= acts[0].lastQuarter ? 1 : 2)
  const cards: EventCard[] = [
    ...eventsFile.events.map(toCard('events.json', 1)),
    ...eventsAct2File.events.map(toCard('events_act2.json', 2)),
  ]
  const seen = new Set<string>()
  for (const c of cards) {
    if (seen.has(c.id)) problems.push(`events: card id "${c.id}" appears twice`)
    seen.add(c.id)
  }
  for (const m of eventsAct2File.market_effects)
    if (!act2Quarters.includes(m.from))
      problems.push(
        `events_act2.json › market_effects.${m.id}: ${m.from} isn't an Act II quarter`,
      )
  const events: EventRules = {
    randomChance: eventsFile.engine.random_chance_per_quarter,
    randomStart: quarters.indexOf(eventsFile.engine.random_start),
    randomWeeks: eventsFile.engine.random_week_range,
    act2: {
      randomChance: eventsAct2File.engine.random_chance_per_quarter,
      randomStart: quarters.indexOf(eventsAct2File.engine.random_start),
      randomWeeks: eventsAct2File.engine.random_week_range,
    },
    winterQuarters: eventsFile.market_phases.winter,
    cards,
    byId: Object.fromEntries(cards.map((c) => [c.id, c])),
    marketEffects: eventsAct2File.market_effects,
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

  // The prologue's cards: a scripted card's quarter and week as indices (the prologue's quarters
  // are the negative indices of `quarters`).
  const prologueQuarterIndex = (label: string) => {
    for (let q = -1; quarters[q] !== undefined; q--)
      if (quarters[q] === label) return q
    return undefined
  }
  const prologueEvents = {
    ...eventsPrologueFile.engine,
    cards: eventsPrologueFile.cards.map((c): PrologueCard => {
      if (c.type !== 'scripted') return c
      const qi = prologueQuarterIndex(c.quarter ?? '')
      const wi =
        qi === undefined
          ? -1
          : market[qi].findIndex((w) => w.week === c.week_of)
      if (wi < 0)
        problems.push(
          `events_prologue.json › ${c.id}: week ${c.week_of} isn't a week of ${c.quarter}`,
        )
      return { ...c, quarterIndex: qi, weekIndex: wi }
    }),
  }

  // Act III's four market scenarios (M11.1): validated like Act I/II's files, then kept apart from the
  // shared `market` array (a scenario is read only through marketWeek's optional argument, so every
  // Act I/II quarter index and read is untouched). Scenario quarter n sits at timeline index
  // (first Act III quarter + n).
  const act3Scenarios = {} as Record<ScenarioId, Act3Scenario>
  {
    const lastReal = market[acts[1].lastQuarter].at(-1)!
    const firstLabel = nextQuarter(quarters[acts[1].lastQuarter])
    for (const id of SCENARIO_IDS) {
      const raw3 = raw.act3Scenarios[id]
      const weeklyFile = `market_weekly_${id}`
      const quarterlyFile = `market_${id}`
      const weekly = check(weeklyFile, marketAct3Schema, raw3.weekly)
      const quarterly = check(
        quarterlyFile,
        marketQuarterlyAct3Schema,
        raw3.quarterly,
      )
      if (!weekly || !quarterly) continue
      const labels: string[] = []
      const weeks: MarketWeek[][] = []
      for (const row of weekly) {
        if (row.scenario !== id)
          problems.push(
            `${weeklyFile} › week ${row.week}: scenario is ${row.scenario}, expected ${id}`,
          )
        if (labels.at(-1) !== row.quarter) {
          if (labels.includes(row.quarter))
            problems.push(
              `${weeklyFile} › week ${row.week}: quarter ${row.quarter} appears twice`,
            )
          labels.push(row.quarter)
          weeks.push([])
        }
        weeks.at(-1)!.push(act3Week(row, lastReal))
      }
      labels.forEach((label, i) => {
        const expected = i === 0 ? firstLabel : nextQuarter(labels[i - 1])
        if (label !== expected)
          problems.push(
            `${weeklyFile} › ${label}: expected ${expected} (quarters run on from 2026Q4 with no gap)`,
          )
        if (weeks[i].length !== perQuarter)
          problems.push(
            `${weeklyFile} › ${label}: has ${weeks[i].length} weeks, expected exactly ${perQuarter}`,
          )
      })
      if (quarterly.map((r) => r.quarter).join() !== labels.join())
        problems.push(
          `${quarterlyFile}: quarters (${quarterly.map((r) => r.quarter).join(', ')}) don't match ${weeklyFile}'s (${labels.join(', ')})`,
        )
      else
        quarterly.forEach((r, i) => {
          if (r.scenario !== id)
            problems.push(
              `${quarterlyFile} › ${r.quarter}: scenario is ${r.scenario}, expected ${id}`,
            )
          // The quarter's close is its last week's, as in Act II.
          const last = weeks[i].at(-1)!
          if (Math.abs(r.btc_usd_close - last.btc_usd) > 0.01)
            problems.push(
              `${quarterlyFile} › ${r.quarter}: BTC close ${r.btc_usd_close} doesn't match ${weeklyFile}'s last week (${last.btc_usd})`,
            )
        })
      act3Scenarios[id] = {
        quarterly,
        weeks,
        inputs: quarterly.map((r) =>
          act2QuarterOf(r, {
            mining: r.mining_ev_ebitda_mult,
            aiInfra: r.ai_infra_ev_ebitda_mult,
          }),
        ),
      }
    }
    // Act III's timeline (M11.3): the scenario files' 16 quarters (2027Q1–2030Q4), appended last, after
    // every Act II check above that assumes Act II's 17 real quarters end the timeline (mine, reversible:
    // this keeps indices 0–39 untouched). All four scenarios share one calendar, so s0's labels are the
    // timeline and the others must match. The timeline holds labels only: `market` has no Act III
    // weeks, so Act III prices exist only inside a scenario (marketWeek's scenario argument; reading an
    // Act III week without one throws).
    const labels = act3Scenarios.s0?.quarterly.map((r) => r.quarter) ?? []
    for (const id of SCENARIO_IDS) {
      const own = act3Scenarios[id]?.quarterly.map((r) => r.quarter) ?? []
      if (own.join() !== labels.join())
        problems.push(
          `market_${id}: quarters (${own.join(', ')}) differ from market_s0's (${labels.join(', ')})`,
        )
    }
    acts.push({
      act: 3,
      firstQuarter: quarters.length,
      lastQuarter: quarters.length + labels.length - 1,
    })
    quarters.push(...labels)
  }
  // Act III's Signals (M11.2): runtime fields only; each file's scenario must be the one it is filed under.
  const signals = {} as Record<ScenarioId, SignalIndicator[]>
  for (const id of SCENARIO_IDS) {
    const file = check(`signals_${id}.json`, signalsFileSchema, raw.signals[id])
    if (!file) continue
    if (file.scenario !== id)
      problems.push(
        `signals_${id}.json › scenario: is ${file.scenario}, expected ${id}`,
      )
    signals[id] = file.indicators
  }
  // The same sequential check as above, re-run now Act III is appended (it ran earlier, before this
  // addition, so it never saw quarters 40–55): catches a gap in Act III's labels like any other act's.
  quarters.slice(1).forEach((q, i) => {
    if (q !== nextQuarter(quarters[i])) {
      problems.push(
        `market: ${quarters[i]} is followed by ${q}, expected ${nextQuarter(quarters[i])}`,
      )
    }
  })

  if (problems.length > 0) throw new ContentError(problems)

  return {
    quarters,
    market,
    acts,
    act2Market,
    act3Scenarios,
    signals,
    hosting,
    projects,
    finance,
    lifeline: {
      siteKw: capitalAct2File.lifeline_card_final_numbers.site_mw * 1000,
      priceUsd: capitalAct2File.lifeline_card_final_numbers.price_usd.value,
      apr:
        capitalAct2File.lifeline_card_final_numbers.bridge_loan_apr_pct / 100,
      tenorQuarters:
        capitalAct2File.lifeline_card_final_numbers.bridge_loan_tenor_quarters,
      cashFloorUsd:
        capitalAct2File.lifeline_card_final_numbers.cash_floor_reached_usd,
    },
    preset: {
      cashUsd: capitalAct2File.standalone_preset_final_numbers.cash_usd,
      equipmentDebtUsd:
        capitalAct2File.standalone_preset_final_numbers.equipment_debt_usd,
      founderStake:
        capitalAct2File.standalone_preset_final_numbers.founder_stake_pct / 100,
    },
    regions,
    nationalPolicies: regionsFile.national,
    hiresAct2: { salaryYr, newHires },
    act2Sites: {
      categories: sitesAct2File.site_categories,
      flaws: Object.fromEntries(
        Object.entries(sitesAct2File.flaws).map(([id, f]) => [
          id,
          { label: id, effect: f.effect, basis: f.basis } as Flaw,
        ]),
      ),
    },
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
    act2Rivals: rivalsAct2File.rivals,
    prologue: {
      machines: machinesPrologueFile.models,
      rules: prologueFile,
      events: prologueEvents,
    },
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

/**
 * An Act III scenario week, shaped like Act II's: no ETH mining (revenue 0, network columns null).
 * The scenario files carry no ETH price, so it holds at Act II's last week's (mine, reversible: keeps
 * an ETH treasury from being valued at $0; nothing mines or buys ETH in Act III).
 */
function act3Week(row: MarketWeekAct3, lastAct2: MarketWeek): MarketWeek {
  return {
    week: row.week,
    quarter: row.quarter,
    btc_usd: row.btc_usd,
    eth_usd: lastAct2.eth_usd,
    btc_difficulty_T: row.btc_difficulty_T,
    btc_hashrate_EHs: row.btc_hashrate_EHs,
    btc_block_subsidy: row.btc_block_subsidy,
    btc_fee_share: row.btc_fee_share,
    btc_hashprice_usd_th_day: row.btc_hashprice_usd_th_day,
    btc_hashprice_usd_ph_day: row.btc_hashprice_usd_ph_day,
    eth_hashrate_THs: null,
    eth_blocks_day: null,
    eth_block_reward: null,
    eth_rev_usd_mh_day: 0,
    asic_price_usd_th_old: row.asic_price_usd_th_old,
    asic_price_usd_th_mid: row.asic_price_usd_th_mid,
    asic_price_usd_th_new: row.asic_price_usd_th_new,
    asic_price_usd_th_latest: row.asic_price_usd_th_latest,
    gpu_h100_hyperscaler_usd_hr: row.gpu_h100_hyperscaler_usd_hr,
    gpu_h100_neocloud_usd_hr: row.gpu_h100_neocloud_usd_hr,
    gpu_h100_spot_usd_hr: row.gpu_h100_spot_usd_hr,
    estimate: row.estimate,
  }
}

/** A market_quarterly_act2 row, reshaped for the sim. */
function act2QuarterOf(
  // Act II's rows and Act III's scenario rows share every column this reads (the BTC and ETH closes are not read).
  r: Omit<MarketQuarterAct2Row, 'btc_usd_close' | 'eth_usd_close'>,
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

/**
 * A quarter's market inputs in Act II's shape, in both acts (M11.4a). In Act II (and Act I) this is
 * exactly act2Quarter(quarter). In Act III, with the drawn scenario, it is that scenario's
 * market_sN.csv row for the quarter (multiples from its rebased columns). An Act III quarter
 * without a scenario throws, like marketWeek. No system reads this for Act III yet (M11.4c).
 */
export function quarterInputs(
  quarter: number,
  scenario?: ScenarioId | null,
): Act2Quarter | undefined {
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  if (quarter < act3.firstQuarter || quarter > act3.lastQuarter)
    return act2Quarter(quarter)
  if (!scenario)
    throw new RangeError(
      `Quarter ${quarter} is in Act III, whose market inputs are read only through a scenario (none given)`,
    )
  return CONTENT.act3Scenarios[scenario].inputs[quarter - act3.firstQuarter]
}

/**
 * Whether a quarter is an Act II quarter (M9.1): the yes/no form of act2Quarter(), for the checks that
 * only ask "is this Act II?" and read none of its data.
 */
export function isActIIQuarter(quarter: number): boolean {
  return act2Quarter(quarter) !== undefined
}

/**
 * Whether Act II's business rules apply in a quarter (M11.4c): Act II's quarters and Act III's. The
 * gate for every Act II system that runs on in Act III ("same rules where Act II is silent", doc 27
 * §2); its data comes from quarterInputs(). Systems that stay Act II-only keep isActIIQuarter.
 */
export function isAct2RulesQuarter(quarter: number): boolean {
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  return (
    isActIIQuarter(quarter) ||
    (quarter >= act3.firstQuarter && quarter <= act3.lastQuarter)
  )
}

/** The act a quarter index belongs to (quarters past the end count as the last act). */
export function actOfQuarter(quarter: number): ActSpan['act'] {
  if (quarter < 0) return 0
  return (
    CONTENT.acts.find((a) => a.act !== 0 && quarter <= a.lastQuarter) ??
    CONTENT.acts.at(-1)!
  ).act
}

/** The label of any quarter index, the prologue's negative ones included ('' outside the timeline). */
export function quarterLabel(quarter: number): string {
  return CONTENT.quarters[quarter] ?? ''
}

/** The index of a quarter label, the prologue's included (−1 … −32), or undefined if unknown. */
export function quarterIndex(label: string): number | undefined {
  const i = CONTENT.quarters.indexOf(label)
  if (i >= 0) return i
  const p = CONTENT.acts.find((a) => a.act === 0)
  if (!p) return undefined
  for (let q = p.firstQuarter; q <= p.lastQuarter; q++)
    if (CONTENT.quarters[q] === label) return q
  return undefined
}

/** The first quarter index of an act (the prologue: −32, 2009Q1). */
export function actFirstQuarter(act: ActSpan['act']): number {
  return CONTENT.acts.find((a) => a.act === act)!.firstQuarter
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
  marketPrologue: marketPrologueRaw,
  act3Scenarios: {
    s0: { quarterly: marketS0Raw, weekly: marketWeeklyS0Raw },
    s1: { quarterly: marketS1Raw, weekly: marketWeeklyS1Raw },
    s2: { quarterly: marketS2Raw, weekly: marketWeeklyS2Raw },
    s3: { quarterly: marketS3Raw, weekly: marketWeeklyS3Raw },
  },
  signals: {
    s0: signalsS0Raw,
    s1: signalsS1Raw,
    s2: signalsS2Raw,
    s3: signalsS3Raw,
  },
  capital: capitalRaw,
  capitalAct2: capitalAct2Raw,
  conversions: conversionsRaw,
  tenants: tenantsRaw,
  gpus: gpusRaw,
  interruptsAct2: interruptsAct2Raw,
  lenders: lendersRaw,
  regions: regionsRaw,
  sitesAct2: sitesAct2Raw,
  hiresAct2: hiresAct2Raw,
  eventsAct2: eventsAct2Raw,
  rivals: rivalsRaw,
  rivalsAct2: rivalsAct2Raw,
  machinesPrologue: machinesPrologueRaw,
  prologue: prologueRaw,
  eventsPrologue: eventsPrologueRaw,
  heat: heatRaw,
  hires: hiresRaw,
  merge: mergeRaw,
  events: eventsRaw,
  shocks: shocksRaw,
})
