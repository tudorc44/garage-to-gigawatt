// The whole game lives in one plain GameState object: no classes, no functions, so it
// can be copied, compared, saved as JSON and replayed. Systems read and update it.
import { BALANCE, CONTENT } from '../content/index.ts'
import type { MessageKey, MessageParams } from '../i18n/t.ts'
import type { SiteHeat } from './systems/heat.ts'
import type { PowerNegotiation } from './systems/negotiation.ts'
import type { InvestorPitch, PitchWalkaway } from './systems/pitch.ts'
import type { MarketRead } from './systems/readMarket.ts'
import { emptyEventState, type EventState } from './systems/eventEffects.ts'
import type { PlannedWave, WaveDamage } from './systems/failureWave.ts'

/**
 * plan → live → report, each quarter. After 2022Q3's report: merge (the Merge decision) →
 * chapter (the Act I chapter report) → intro (Act II's intro, act 2, still 2022Q3) → 2022Q4 plan.
 * After 2026Q4's report: chapter (act 2), the end of the game. gameover = bust (either act).
 */
export type Phase =
  'plan' | 'live' | 'report' | 'merge' | 'chapter' | 'intro' | 'gameover'
export type Coin = 'BTC' | 'ETH'
export type Condition = 'new' | 'used'

export interface Site {
  id: string
  /** Site tier id from sites.json, e.g. "garage" or "warehouse". */
  tier: string
  /** Quarter index when the site is energized. Before that it's still being built. */
  readyQuarter: number
  /** Scouted offers vary around the tier's numbers; these are this site's actual terms. */
  rentUsdQ: number
  powerPriceMult: number
  /** Hidden flaw id (sites.json flaws), revealed once built. null = no flaw. */
  flaw: string | null
  /** Heat 50 rate hike: power price multiplier for this quarter (heat.json rate_hike), if any. */
  surcharge?: number
  /** The site's power contract (every tier but the garage, from when it's powered). */
  contract?: PowerContract
  /** rate_class flaw, set by its event card: power × this until the next contract renewal. */
  rateMult?: number
  /** Transformer upgrade under way: the flaw clears when this quarter starts. */
  upgradeReadyQuarter?: number
  /** Phased sites (Texas): the quarter each started phase is energized (phase 1 = readyQuarter). */
  phases?: number[]
  /** Phased sites: what each phase costs (a share of the site's full build cost). */
  phaseCapexUsd?: number
  /** Act II region tag (market_quarterly_act2 power columns). Act I sites use their tier's (balance.ts). */
  region?: string
  /** Act II: kW left idle by a defaulted hosting client, which can be re-let with no conversion cost. */
  hostingReletKw?: number
  /** Act II: kW sold with a live project (they belong to the buyer and leave the site's capacity). */
  soldKw?: number
}

export type ContractType = 'fixed' | 'index'

/** A power contract: a locked price per kWh for a term (it replaces the normal price path). */
export interface PowerContract {
  type: ContractType
  /** $/kWh, locked for the term. For index contracts this is the base price. */
  price: number
  startQuarter: number
  /** The quarter the term runs out: a renewal is due in that quarter's Plan phase. */
  endQuarter: number
  /** Index contracts: this quarter's random move (the paid price = price × indexMult). */
  indexMult?: number
}

/** A batch of identical machines bought together and placed at one site. */
export interface MachineLot {
  id: string
  model: string
  siteId: string
  condition: Condition
  count: number
  /** How many of the `count` units are broken and not hashing until repaired. */
  failed: number
  /** Quarter index when the lot starts earning (the quarter after delivery). */
  earnsFromQuarter: number
  /** Act II: the last quarter the batch ran at least one week (for the reservation on switched-off MW). */
  lastRanQuarter?: number
}

/** An equipment loan, secured on machines, repaid in equal weekly slices plus interest. */
export interface EquipmentLoan {
  /** Amount borrowed. */
  amountUsd: number
  /** Still owed. */
  balanceUsd: number
  /** Yearly interest rate, fixed when the loan was taken. */
  apr: number
  /** Principal repaid each week (amount ÷ weeks in the loan's term, in cents). */
  weeklyPrincipalUsd: number
  /** Weekly payments still to make; the last one clears whatever is left. */
  weeksLeft: number
  /** Quarter index when it was taken. */
  takenQuarter: number
}

/** A crypto-backed loan: coins pledged from the treasury, interest paid weekly, no fixed term. */
export interface CryptoLoan {
  /** The pledged coin. */
  coin: Coin
  /** Coins held by the lender until the loan is repaid. */
  collateral: number
  /** Still owed. */
  balanceUsd: number
  /** Yearly interest rate. */
  apr: number
  takenQuarter: number
}

/** A site offer revealed by scouting. Its flaw stays hidden until the player builds it. */
export interface SiteOffer {
  id: string
  tier: string
  rentUsdQ: number
  capexUsd: number
  powerPriceMult: number
  flaw: string | null
}

/** What a project turns its MW into (scope 0.2 §2.4–2.5). */
export type ProjectKind = 'shell' | 'cloud' | 'pilot'

/** A tenant's offer on a shell project: a tenants.json card and the ready-by window it drew. */
export interface TenantOffer {
  id: string
  card: string
  /** Quarters after signing by which the project must be live (take-or-pay). */
  readyByQuarters: number
  /** A GPU contract offer (an AI cloud): its term, and the ready-by buffer after the planned go-live. */
  gpu?: { termYears: number; bufferQuarters: number }
}

/**
 * The tenant a project signed: a shell's lease (terms from its card) or a cloud's GPU contract
 * (`gpu`: take-or-pay on all its GPUs at a $/GPU-hr locked at signing, for a term in quarters).
 */
export interface ProjectTenant {
  card: string
  signedQuarter: number
  readyByQuarter: number
  gpu?: { gpus: number; priceUsdHr: number; termQuarters: number }
  /** Quarters the project has been late so far (liquidated damages each). */
  lateQuarters: number
  /** The 2-quarters-late walk-away roll has happened. */
  walkRolled: boolean
  /** Prepayment still to be set off against rent. */
  prepaymentLeftUsd: number
  /** Quarters of the term already served (live). */
  servedQuarters: number
}

/**
 * A project (Act II, scope 0.2 §2.5): converts `kw` of one site to an AI shell lease, an AI
 * cloud (your GPUs, on spot) or a pilot cluster. Proposed (filling its slots) → building → live
 * → sold. Its kW are taken at the site from the moment it's opened.
 */
export interface Project {
  id: string
  /** 1, 2, 3 … for the name ("Warehouse AI 2"). */
  n: number
  siteId: string
  kw: number
  kind: ProjectKind
  /** GPU generation (cloud and pilot), or null for a shell. */
  gpu: string | null
  openedQuarter: number
  /**
   * 'sold': sold with its MW (they leave the site); 'ended': its GPUs sold, its MW idle again;
   * 'foreclosed': the lender took it and its MW (2 quarters of missed debt service).
   */
  stage: 'proposed' | 'building' | 'live' | 'sold' | 'ended' | 'foreclosed'
  /** Tenant offers (shell projects). */
  offers: TenantOffer[]
  tenant: ProjectTenant | null
  /** Cloud projects: sell capacity on the spot market (the only tenant option so far). */
  spot: boolean
  /** The capital slot: closed with own cash covering whatever the chosen debt doesn't. */
  capital: 'cash' | null
  /** Debt chosen for the build (Act II capital, M4): drawn when it starts. Missing = none. */
  debt?: { projectDebt: boolean; ddtl: boolean }
  /** Capex committed and paid at the start of the build (after any tenant capex credit). */
  capexUsd: number
  /** The GPUs' share of it (insured each year). */
  gpuCapexUsd: number
  gpuCount: number
  startQuarter: number | null
  /** The quarter it goes live (moves with delays and GPU waits). */
  readyQuarter: number | null
  soldQuarter: number | null
}

/**
 * Act II debt secured on one project (scope 0.2 §2.7, doc 18 §7.1): project debt (a share of capex,
 * needs a tenant rated ≥ BBB) or a GPU-backed DDTL (a share of GPU cost, needs a GPU contract).
 * Drawn when the build starts; interest only while building, then equal principal each quarter
 * over the tenor; serviced at quarter end. Two missed quarters in a row: the lender forecloses.
 */
export interface Facility {
  id: string
  kind: 'project_debt' | 'ddtl'
  projectId: string
  amountUsd: number
  balanceUsd: number
  /** Yearly rate, fixed when drawn. */
  apr: number
  /** Quarters of principal payments once the project is live (the contract's term). */
  tenorQuarters: number
  drawnQuarter: number
  /** Quarters in a row whose debt service went unpaid. */
  missedQuarters: number
  /** The rating the debt carries at project level ("A" on a strong tenant, doc 18 §7.2). */
  rating: string
}

/** A project that no longer holds its MW or earns: sold, or ended by selling its GPUs. */
export const projectGone = (p: Project) =>
  p.stage === 'sold' || p.stage === 'ended' || p.stage === 'foreclosed'

/** A construction delay or GPU allocation alert planned for this quarter (like the failure wave). */
export interface PlannedProjectEvent {
  projectId: string
  kind: 'construction_delay' | 'gpu_allocation'
  /** Week number (1–13): the check happens after this week is played. */
  week: number
}

/**
 * Hosting (Act II, scope 0.2 §2.4): MW at one of your sites rented to another miner's ASICs. The
 * client pays an all-in rate per kWh its machines use (power passed through); you pay the site's
 * power. Converted from mining MW on the same site, live from the quarter after the order.
 */
export interface HostingContract {
  id: string
  siteId: string
  kw: number
  /** The first quarter the hosted machines run (and pay); until then the MW are being converted. */
  readyQuarter: number
  /** All-in $/kWh, fixed for the term (the rate of the year it was signed). */
  rateUsdKwh: number
  /** The last quarter of the current term; it renews at the then-current rate after it. */
  termEndQuarter: number
}

/** A distressed lot up for a sealed-bid auction this Plan phase (interrupts.json › distressed_auction). */
export interface Auction {
  model: string
  /** Used units in the lot. */
  count: number
  /** The used price per unit this quarter ("list"). */
  unitListUsd: number
  /** Lowest bid accepted, for the whole lot. */
  reserveUsd: number
  /** The rivals' sealed bids for the whole lot. Hidden from the player until the auction closes. */
  bids: { rival: string; bidUsd: number }[]
}

export interface GameState {
  /** Save-format version (save.ts SAVE_VERSION). Older saves are migrated step by step when loaded. */
  version: 2
  /** The act being played: 1 = Act I (2017Q1–2022Q3), 2 = Act II (2022Q4–2026Q4). */
  act: 1 | 2
  seed: number
  /** Current position of the seeded RNG (see rng.ts). */
  rng: number
  phase: Phase
  /** 0 = 2017Q1 … 22 = 2022Q3 (end of Act I) … 39 = 2026Q4; CONTENT.quarters[quarter] gives the label. */
  quarter: number
  /** Weeks already played in this quarter's live phase (0–13). */
  week: number
  /** Dollars. Rounded to cents once per week. */
  cash: number
  bandwidth: number
  /** Share of each week's mined coins kept in the treasury (0–1), per coin. The rest is sold. */
  hodlPct: Record<Coin, number>
  treasury: Record<Coin, number>
  /** Founder's share of the company (1 = 100%); each raise dilutes it. */
  founderStake: number
  /** Funding rounds already taken (capital.json ladder ids). */
  raisesDone: string[]
  sites: Site[]
  machines: MachineLot[]
  siteOffers: SiteOffer[]
  /** The one equipment loan you can have at a time, or null. */
  equipmentLoan: EquipmentLoan | null
  /** Texas construction loans, one per financed phase (same payment shape as the equipment loan). */
  constructionLoans: EquipmentLoan[]
  /** Hosting contracts at your sites (Act II). */
  hosting: HostingContract[]
  /** Projects (Act II): AI shells, AI clouds and pilot clusters. */
  projects: Project[]
  /** This quarter's planned construction delay / GPU allocation checks. */
  projectEvents: PlannedProjectEvent[]
  /** The quarter the first AI deal was signed (the pivot premium), or null. */
  firstAiDealQuarter: number | null
  /** Act II debt secured on a project: project debt and GPU-backed DDTLs. */
  facilities: Facility[]
  /** The one crypto-backed loan you can have at a time, or null. */
  cryptoLoan: CryptoLoan | null
  /** Community Heat per site id (see systems/heat.ts). */
  siteHeat: Record<string, SiteHeat>
  /** A power contract negotiation in progress (Plan phase only), or null. */
  negotiation: PowerNegotiation | null
  /** An investor pitch in progress (Plan phase only), or null. */
  pitch: InvestorPitch | null
  /** Funding rounds an investor walked away from (or you did): opening discount and lockout. */
  pitchWalkaways: Record<string, PitchWalkaway>
  /** People on staff: hires.json id → quarter index they were hired. */
  staff: Record<string, number>
  /** When each person was last let go (quarter index): no rehiring in that quarter. */
  firedQuarter: Record<string, number>
  /** The last Read the market (its quarter and the hint per coin), or null. */
  marketRead: MarketRead | null
  /** The Merge decision (merge.json choice id) once made, or null. */
  mergeChoice: string | null
  /** Event cards: what's due, what's been played, and their lasting effects. */
  events: EventState
  /** This quarter's failure-wave rolls, one per site (drawn when the Plan phase ends). */
  failureWaves: PlannedWave[]
  /** A neighbour complaint due this quarter (after week `week`, 1–13) or carried over; null = none. */
  complaint: { siteId: string; week: number } | null
  /** An agreed grid curtailment: the week (0–12) the Texas machines go offline, and the credit. */
  curtailment: { week: number; creditUsd: number } | null
  /** A distressed auction open this Plan phase, or null. */
  auction: Auction | null
  /** After a margin-call default: no loans until this quarter index. null = not locked. */
  loansLockedUntil: number | null
  /** Counter for making unique ids ("site-3", "lot-7"). */
  nextId: number
  /** An alert waiting for the player's answer; the live quarter is paused while it's set. */
  interrupt: ActiveInterrupt | null
  interruptsThisQuarter: number
  /** Running totals for the quarter being played. */
  quarterStats: QuarterStats
  /** One report per finished quarter. */
  reports: QuarterReport[]
  /** What happened, as message keys for the UI: purchases, alerts, failures, forced sales… */
  log: LogEntry[]
}

export interface LogEntry {
  quarter: number
  /** 1–13 during the live quarter; null for Plan-phase and quarter-end entries. */
  week: number | null
  key: MessageKey
  params?: MessageParams
}

export interface ActiveInterrupt {
  /** Interrupt id from interrupts.json, e.g. "price_alert". */
  id: string
  /** Index of the week (0–12) the alert fired in. */
  week: number
  coin: Coin
  /** The weekly price move that set it off, e.g. -0.27. */
  changePct: number
  /** Margin call only: the loan-to-value that triggered it. */
  ltv?: number
  /** Curtailment only: the grid's offer for taking the Texas machines offline next week. */
  curtail?: CurtailOffer
  /** Neighbour complaint (and site-bound event cards): the site it's about. */
  siteId?: string
  /** Event cards only: the events.json card id. */
  event?: string
  /** Failure wave only: the units it broke, per batch. */
  wave?: WaveDamage
  /** Construction delay and GPU allocation (Act II): the project it's about. */
  projectId?: string
}

/** What curtailing the Texas site for one week pays (review A8), fixed when the grid asks. */
export interface CurtailOffer {
  /** Power of the Texas machines that would be mining, in MW. */
  mw: number
  /** What they would earn that week. */
  forgoneUsd: number
  /** max(credit per MW × MW, multiple × forgone revenue). */
  creditUsd: number
  /** Uri only: the storm charge an index contract pays if you keep mining (firm load). */
  stormUsd?: number
}

export interface QuarterStats {
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  coinsMined: Record<Coin, number>
  powerByCoin: Record<Coin, number>
  /** Mining revenue minus power cost, by site tier (sim report: where EBITDA comes from). */
  marginByTier: Record<string, number>
  failures: number
  /** Dollars raised by selling treasury coins in alerts. */
  treasurySoldUsd: number
  priceAlerts: number
  marginCalls: number
  /** Dollars received for mined coins sold as they were mined. */
  soldUsd: number
  /** Paid by the grid for curtailing (counts toward EBITDA). */
  gridCreditsUsd: number
  /** Hosting clients' fees (Act II; counts toward EBITDA; their power is in the power cost). */
  hostingFeesUsd: number
  /** Act II power reservation on idle and under-construction MW (also in the power cost). */
  reservationUsd: number
  /** Act II live AI projects: tenant rent and GPU-hour sales (counts toward EBITDA). */
  aiRevenueUsd: number
  /** Their running costs: shell opex, cloud power and GPU insurance (counted in EBITDA). */
  aiCostUsd: number
  /** Take-or-pay damages paid for late projects (counted in EBITDA). */
  lateDamagesUsd: number
  /** Extra power paid this quarter because of Heat rate hikes. */
  rateHikeUsd: number
  /** Winter Storm Uri's storm power charge (index contracts that kept mining). */
  stormChargeUsd: number
  /** Staff salaries paid this quarter (counted in EBITDA). */
  salariesUsd: number
  /** Loan interest and principal paid this quarter. */
  interestUsd: number
  principalUsd: number
  /** Cash and treasury value when the live quarter started (after Plan-phase spending). */
  startCash: number
  startTreasuryUsd: number
  /** One summary per week played so far this quarter. */
  weeks: WeekSummary[]
}

export interface WeekSummary {
  /** 1–13 */
  week: number
  date: string
  btcUsd: number
  ethUsd: number
  revenueUsd: number
  powerCostUsd: number
  rentUsd: number
  failures: number
  /** Batches that switched themselves off this week (revenue below power cost). */
  batchesOff: number
  coinsMined: Record<Coin, number>
  /** A price alert fired this week. */
  priceAlert: boolean
  cash: number
}

export interface QuarterReport {
  quarter: string
  /** Healthy, earning hashrate at quarter end: BTC in TH/s, ETH in MH/s. */
  hashrate: Record<Coin, number>
  revenueUsd: number
  /** Mining revenue minus power cost, by site tier. */
  marginByTier: Record<string, number>
  powerCostUsd: number
  rentUsd: number
  coinsMined: Record<Coin, number>
  /** Power cost per coin mined, or null if none was mined. */
  costPerCoinUsd: Record<Coin, number | null>
  failures: number
  brokenUnits: number
  treasury: Record<Coin, number>
  treasuryValueUsd: number
  cash: number
  /** Revenue − power − rent for the quarter. */
  ebitdaUsd: number
  founderStake: number
  /** Company valuation (review A5), after any forced sales. */
  valuationUsd: number
  priceAlerts: number
  marginCalls: number
  startCash: number
  startTreasuryUsd: number
  soldUsd: number
  treasurySoldUsd: number
  /** Paid by the grid for curtailing. */
  gridCreditsUsd: number
  /** Hosting clients' fees (Act II). */
  hostingFeesUsd: number
  /** Act II power reservation on idle and under-construction MW (included in the power cost). */
  reservationUsd: number
  /** Act II AI projects: revenue, running costs and take-or-pay damages. */
  aiRevenueUsd: number
  aiCostUsd: number
  lateDamagesUsd: number
  /** The valuation's Act II parts at quarter end: projects under construction (capex spent), the
   *  remaining contracted revenue (unweighted, as the top bar shows it) and its credit-weighted value. */
  constructionUsd: number
  backlogUsd: number
  weightedBacklogUsd: number
  /** Extra power paid this quarter because of Heat rate hikes. */
  rateHikeUsd: number
  /** Winter Storm Uri's storm power charge (index contracts that kept mining). */
  stormChargeUsd: number
  /** Staff salaries paid this quarter. */
  salariesUsd: number
  interestUsd: number
  principalUsd: number
  /** Loans still owed at quarter end (subtracted from the valuation). */
  debtUsd: number
  /** The hottest site's Heat at quarter end, and its tier. */
  heat: number
  heatTier: string
  /** Filled when cash went below zero and assets had to be sold. */
  forcedSale: { treasuryUsd: number; machinesUsd: number; units: number } | null
}

export function emptyQuarterStats(): QuarterStats {
  return {
    revenueUsd: 0,
    powerCostUsd: 0,
    rentUsd: 0,
    coinsMined: { BTC: 0, ETH: 0 },
    powerByCoin: { BTC: 0, ETH: 0 },
    marginByTier: {},
    failures: 0,
    treasurySoldUsd: 0,
    priceAlerts: 0,
    marginCalls: 0,
    soldUsd: 0,
    gridCreditsUsd: 0,
    hostingFeesUsd: 0,
    reservationUsd: 0,
    aiRevenueUsd: 0,
    aiCostUsd: 0,
    lateDamagesUsd: 0,
    rateHikeUsd: 0,
    stormChargeUsd: 0,
    salariesUsd: 0,
    interestUsd: 0,
    principalUsd: 0,
    startCash: 0,
    startTreasuryUsd: 0,
    weeks: [],
  }
}

/** Adds a line to the game log. */
export function logEntry(
  state: GameState,
  key: MessageKey,
  params?: MessageParams,
  week: number | null = null,
): void {
  state.log.push({ quarter: state.quarter, week, key, params })
}

/** Money is kept in plain dollars and rounded to cents once per week. */
export function roundCents(usd: number): number {
  return Math.round(usd * 100) / 100
}

export function newGame(seed: number): GameState {
  const start = CONTENT.siteTiers.find((t) => t.id === BALANCE.startSite)!
  return {
    version: 2,
    act: 1,
    seed,
    rng: seed | 0,
    phase: 'plan',
    quarter: 0,
    week: 0,
    cash: BALANCE.startCash,
    bandwidth: BALANCE.bandwidth.perQuarter,
    hodlPct: { BTC: 0, ETH: 0 },
    treasury: { BTC: 0, ETH: 0 },
    founderStake: 1,
    raisesDone: [],
    sites: [
      {
        id: 'site-1',
        tier: start.id,
        readyQuarter: 0,
        rentUsdQ: start.rent_usd_q,
        powerPriceMult: 1,
        flaw: null,
      },
    ],
    machines: [],
    siteOffers: [],
    equipmentLoan: null,
    constructionLoans: [],
    hosting: [],
    projects: [],
    projectEvents: [],
    firstAiDealQuarter: null,
    facilities: [],
    cryptoLoan: null,
    auction: null,
    curtailment: null,
    complaint: null,
    negotiation: null,
    pitch: null,
    pitchWalkaways: {},
    staff: {},
    firedQuarter: {},
    marketRead: null,
    mergeChoice: null,
    events: emptyEventState(),
    failureWaves: [],
    siteHeat: {
      'site-1': {
        value: start.heat_base,
        load: 0,
        grievance: 0,
        mitigated: false,
        outreachQuarter: null,
        shutdownSince: null,
      },
    },
    loansLockedUntil: null,
    nextId: 2,
    interrupt: null,
    interruptsThisQuarter: 0,
    quarterStats: emptyQuarterStats(),
    reports: [],
    log: [],
  }
}

/** The quarter's label, e.g. "2017Q1". */
export function quarterLabel(state: GameState): string {
  return CONTENT.quarters[state.quarter]
}
