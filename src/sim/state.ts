// The whole game lives in one plain GameState object: no classes, no functions, so it
// can be copied, compared, saved as JSON and replayed. Systems read and update it.
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  FUTURE_IDS,
  type FutureId,
  type ScenarioId,
  type SignalId,
  type SignalIdIv,
  type WildcardIdIv,
} from '../content/index.ts'
import { random, substream } from './rng.ts'
import { enterAct3 } from './systems/act3Entry.ts'
import { enterAct4 } from './systems/act4Entry.ts'
import type { MessageKey, MessageParams } from '../i18n/t.ts'
import type { LunarClaimantId, LunarSiteId, OfftakeBuyerId } from '../content/moonContent.ts'
import type { SiteHeat } from './systems/heat.ts'
import type { PowerNegotiation } from './systems/negotiation.ts'
import type { DealNegotiation } from './systems/dealNegotiation.ts'
import type { PrologueCarry, PrologueState } from './prologue/types.ts'
import type { InvestorPitch, PitchWalkaway } from './systems/pitch.ts'
import type { MarketRead } from './systems/readMarket.ts'
import { emptyEventState, type EventState } from './systems/eventEffects.ts'
import type { PlannedWave, WaveDamage } from './systems/failureWave.ts'
import type { MwByUse } from './systems/mwUse.ts'

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
  /**
   * M33.1 (doc 35): its number among the sites of its type ("Own site 3"), set when it's acquired and never changed
   * or reused (systems/siteSerials.ts). Missing only in saves and presets from before M33, numbered when loaded.
   */
  serial?: number
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
  /** Act II scouted sites: their category (sites_act2.json) and size, which replaces the tier's. */
  category?: string
  kw?: number
  /**
   * Act II: new power added for a project (its Power slot: a grid upgrade or on-site gas). Part of
   * the site's capacity from the project's opening; energized from readyQuarter (set when its
   * build starts; null before).
   */
  powerAdds?: PowerAdd[]
  /** Act II card (the PJM shock): power × mult from…until (quarter indexes, both included). */
  eventPowerMult?: { mult: number; from: number; until: number }
}

/** Power added to a site for one project (M5.6). */
export interface PowerAdd {
  projectId: string
  kw: number
  source: PowerSource
  readyQuarter: number | null
  /** On-site gas at a site with the air-permit flaw: its lawsuit was rolled (M6.0j). */
  lawsuitRolled?: boolean
  /**
   * Act III (M16.4, a card's capex_mw): MW a card's new hall brings with it, energized at once (no queue, no
   * power cost); they leave if the proposal is cancelled.
   */
  card?: boolean
  /** Act III (M17.5): MW a card's PPA brought to the site (sh_2), held by that PPA, not a project. */
  ppaId?: string
}

/** Where a project's power comes from beyond the site's existing MW (scope 0.2 §2.5, A2-05). */
export type PowerSource = 'grid' | 'gas' | 'nuclear'

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
  /** Act II, the gpu_cloud head start: GPU rigs rented out as a legacy cloud instead of mining. */
  legacyCloud?: boolean
  /** Act III (M12.3, a card's idle_mw): switched off (no power, no revenue) until the player turns it back on. */
  idle?: boolean
}

/**
 * How the company entered Act III (M11.4b, doc 27 D17), measured at the end of 2026Q4. The chapter
 * report's growth and the reading score use it later. It holds nothing about the scenario.
 */
export interface Act3Entry {
  /** The first Act III quarter ("2027Q1"). */
  quarter: string
  valuationUsd: number
  /** Founder stake × valuation (never below 0). */
  founderNetWorthUsd: number
  cashUsd: number
  /** Everything owed: the equipment and construction loans, a bridge loan, a crypto loan, facilities. */
  debtUsd: number
  energizedMw: number
  /** MW under contract: hosting, AI shells and AI clouds live at the end of 2026Q4. */
  contractedMw: number
  creditRating: string | null
}

/** Act IV (M27.2): the company as it entered Act IV, measured at 2030Q4 (the same fields as Act III's entry). */
export type Act4Entry = Act3Entry

/**
 * Act IV (M29.2, doc 33 §7): an orbital compute block, a project card with three slots (Launch, Tenant, Capital). A
 * block is many satellites; the game never counts them. Its true remaining life (`retireQuarter`) is sim-internal: the
 * screens show the design life and the telemetry, never the truth.
 */
export interface OrbitalBlock {
  id: string
  /** Its number on screen ("Block 3"). */
  n: number
  kind: 'shell' | 'cloud'
  mw: number
  shell: 'sso' | 'high_leo' | 'high_orbit'
  gen: 'gen31' | 'gen33' | 'gen35'
  stage: 'proposed' | 'building' | 'awaiting_launch' | 'climbing' | 'live' | 'retired' | 'sold'
  openedQuarter: number
  /** Whole mass to launch, tonnes (the generation's t/MW × MW × the shell's shielding). */
  massT: number
  /** The Launch slot: provider, target quarter, the $/kg locked at booking, the deposit paid, slips so far. */
  launch: {
    provider: 'pallas' | 'northgate' | 'kestrel' | 'sovereign'
    quarter: number
    priceUsdKg: number
    depositUsd: number
    slips: number
  } | null
  /** The Tenant slot: a contract (locked price, term, the quarter it should go live) or spot. */
  tenant:
    | {
        type: 'sovereign' | 'frontier_lab' | 'inference_platform' | 'eo_processor'
        /** Orbital shell: rent $ per MW-year. Orbital cloud: $ per GPU-hour. */
        price: number
        termQuarters: number
        signedQuarter: number
        /** The quarter it should go live (take-or-pay lateness after it), set with the booking. */
        dueQuarter: number | null
        /** The quarter its term ends (set when it goes live). */
        endQuarter: number | null
        prepaidLeftUsd: number
      }
    | 'spot'
    | null
  /** The tenant offers on the table this Plan phase. */
  offers: { type: 'sovereign' | 'frontier_lab' | 'inference_platform' | 'eo_processor'; price: number; termQuarters: number }[]
  /** The Capital slot (M29: own cash; M31.2: export credit, project debt, sovereign co-funding). */
  capital: 'cash' | 'export_credit' | 'project_debt' | 'co_funding' | null
  /** Co-funding (M31.2): the partner's share of the block's revenue. */
  cofundShare?: number
  buildDoneQuarter: number | null
  liveQuarter: number | null
  /** Sim-internal: the quarter it deorbits (live quarter + the future's true useful life). */
  retireQuarter: number | null
  /** Structural capacity share (debris, the cascade, storms). */
  capacity: number
  /** Cloud: working GPUs as a share of the block's need (1 + spares at launch; failures wear it down). */
  gpuHealth: number
  /** Insurance cover: bought before launch it runs to a year after going live (`untilQuarter` null until then). */
  insured: { coverUsd: number; untilQuarter: number | null } | null
  /** The current build's capex paid so far (build + launch), $. A lost launch writes it off. */
  capexSpentUsd: number
  /** Fleet telemetry: the failures it reported, as a yearly %, per live quarter (doc 33 §6.5). */
  telemetry: { quarter: number; failurePctYr: number }[]
  lostLaunches: number
  /** Its EBITDA in the last quarter it was live (what a buyer values). */
  lastEbitdaUsd?: number
}

/** Act IV (M29.2): a constellation licence in one shell (doc 33 §7.3). */
export interface OrbitalLicence {
  shell: OrbitalBlock['shell']
  filedQuarter: number
  approvedQuarter: number
  filedMw: number
  /** Political capital fast-tracked it (once per licence). */
  fastTracked?: boolean
  /** Its deployment milestone was checked (and the licence shrunk if missed). */
  milestoneChecked?: boolean
}

/** Act IV (M29.2): the act's orbital business (absent before Act IV and until the first orbital action). */
export interface Act4Orbit {
  blocks: OrbitalBlock[]
  licences: OrbitalLicence[]
  registry: 'accords' | 'neutral'
  /** Link units rented from ground-station networks, and optical ground stations at your own sites. */
  linksRented: number
  stations: { id: string; siteId: string; readyQuarter: number; units: number }[]
  /** After a big industry loss the insurance market hardens until this quarter (doc 33 §8.3). */
  hardMarketUntil: number | null
  /** The cascade has hit the busy shell (once). */
  cascadeDone: boolean
  /** This quarter's planned orbit alerts (planned at END_PLAN). */
  planned: { week: number; kind: 'orbit_conjunction' | 'orbit_storm'; blockId?: string }[]
  /** Safe mode was chosen in a storm this quarter (live blocks lose 3 weeks' revenue). */
  safeModeQuarter: number | null
  nextN: number
  /** M31.2: loans on orbital blocks (export credit, project debt). */
  debts?: OrbitalDebt[]
  /** M31.5: you bought Orrery Compute's blocks at its auction. */
  orreryBought?: boolean
}

/** Act IV (M31.2): a loan on an orbital block (doc 33 §11.1). Interest joins it during the build; repaid once live. */
export interface OrbitalDebt {
  id: string
  blockId: string
  n: number
  kind: 'export_credit' | 'project_debt'
  apr: number
  /** The most it lends (a share of the block's capex), drawn as the capex is paid. */
  limitUsd: number
  balanceUsd: number
  tenorQuarters: number
  /** Repaying: the block is live (or was lost); before that interest is added to the loan. */
  amortizing: boolean
  paidQuarters: number
  /** Project debt's insurance covenant: a breach's cure runs to this quarter, or null. */
  cureUntil: number | null
  /** Repaid, called or settled: no longer owed. */
  closed?: boolean
}

/** Act IV (M30.2): one lunar site you've claimed (doc 33 §9). Every step is a project card: no mining minigame. */
export interface LunarClaim {
  site: LunarSiteId
  claimedQuarter: number
  /** The claim holds only once you land hardware by this quarter (doc 33 §9.1). */
  landBy: number
  status: 'claimed' | 'held' | 'lost' | 'withdrawn' | 'sold'
  landedQuarter: number | null
  /** After a dispute settled by sharing: the other claimant, and your share of the resource. */
  sharedWith?: LunarClaimantId
  /** A claimant who gave way (you held, aligned with its bloc, or landed first). */
  beatenClaimant?: LunarClaimantId
  /** Prospect reports (doc 33 §9.2): your estimates of the site's resource, newest last. Never the truth. */
  reports: { quarter: number; step: 'first' | 'second' | 'pilot'; estimateT: number; lowT: number; highT: number }[]
  /** Power on the site (M30.4): a solar array, a leased reactor. */
  solar: { kwe: number; readyQuarter: number } | null
  reactor: { kwe: number; readyQuarter: number } | null
  /** The pilot plant (M30.4): water processed so far (t), availability (dust), quarters run. */
  pilot: {
    decidedQuarter: number
    readyQuarter: number
    capexUsd: number
    availability: number
    maintained: boolean
    runQuarters: number
    processedT: number
  } | null
  /** The production decision (M30.4): capex drawn over the build; first output always after 2035. */
  production: { decidedQuarter: number; capexUsd: number; drawnUsd: number; firstOutputQuarter: number } | null
}

/** Act IV (M30.3): a prospecting mission on its way to a claimed site. */
export interface LunarMission {
  id: string
  site: LunarSiteId
  launchedQuarter: number
  arrivalQuarter: number
  costUsd: number
  status: 'en_route' | 'landed' | 'lost'
  aborts: number
}

/** Act IV (M30.4): a lunar offtake contract (water at the surface, tonnes a year at a locked $/kg). */
export interface LunarOfftake {
  id: string
  buyer: OfftakeBuyerId
  volumeTYr: number
  priceUsdKg: number
  startQuarter: number
  endQuarter: number
  prepaidLeftUsd: number
  deliveredT: number
}

/** Act IV (M30.2): the act's lunar programme (absent until the first lunar action). */
export interface Act4Moon {
  claims: LunarClaim[]
  missions: LunarMission[]
  /** Open disputes: another claimant on one of your sites, waiting for your answer (doc 33 §9.1). */
  disputes: { site: LunarSiteId; claimant: LunarClaimantId; raisedQuarter: number }[]
  offtakes: LunarOfftake[]
  /** This quarter's offtake offers (M30.4). */
  offers: { buyer: OfftakeBuyerId; volumeTYr: number; priceUsdKg: number; termQuarters: number }[]
  /** The quarter a 1 MWe contract for after 2035 was signed (the production decision needs it), or null. */
  megawattQuarter: number | null
  /** The bloc you've aligned with (a dispute, a reactor lease), or null. */
  alignedBloc: 'accords' | 'station' | null
  /** The Flag on the Pole: extraction frozen through this quarter for operators outside the bloc partnership. */
  freezeUntil: number | null
  /** This quarter's planned lunar alerts. */
  planned: { week: number; kind: 'lunar_landing' | 'lunar_dust'; missionId?: string; site?: LunarSiteId }[]
  nextId: number
  /** M31.3: this quarter's agency task order on offer ($), and accepted funding waiting for your next mission. */
  taskOrderUsd?: number | null
  missionCreditUsd?: number
}

/**
 * Act IV's end record (M27.5: the walking skeleton's fields), stored once when the last quarter (2035Q4) is done or the
 * game is over in Act IV. Built only by systems/act4End.ts; M32 adds the reveal (the future, the lunar grade), the
 * reading score and the titles. The chapter report and the campaign finale read it.
 */
export interface Act4End {
  futureId: FutureId
  /** The last quarter played ("2035Q4", or the game-over quarter). */
  endQuarter: string
  gameOver: boolean
  /** Founder stake × the last report's valuation (never below 0), and its multiple on the Act IV entry. */
  founderNetWorthUsd: number
  growthMultiple: number | null
  // ---- M32.1: the reveal (absent on a record built before M32: the chapter report rebuilds it) ----
  /** The future's name, its trigger quarter, its decoy window, and the reads you made. */
  futureName?: string
  triggerQuarter?: string
  triggerQ?: number
  decoy?: { indicator: string; quarters: string[]; fromQ: number; toQ: number }
  signalReads?: { quarter: string; indicator: string }[]
  /** The lunar grade, and per site of yours your last estimate against the truth. */
  lunar?: {
    grade: 'rich' | 'patchy' | 'dry'
    sites: { site: string; status: string; estimateT: number | null; category: string; truthT: number }[]
  }
  /** The orbital fleet's true reliability in this future, against what your telemetry averaged. */
  fleet?: { failurePctYr: number; lifeYears: number; telemetryAvgPctYr: number | null }
  reading?: { score: number | null; base: number; penalty: number; perQuarter: { q: number; stance: number; ideal: number; weight: number; value: number }[] }
  moves?: { q: number; kind: Act4MoveKind; sign: number; mark: 'match' | 'opposite' | 'decoy' | 'neutral' }[]
  careerTitleId?: string
  readingTitleId?: string | null
  /** Where your megawatts ended up: earthbound, orbital, cislunar, selenian. */
  frontierTitleId?: string
  rivalFates?: { rival: string; valueUsd: number | null; failed: boolean }[]
}

/** Act IV (M32.1, doc 33 §6.7): one logged move; q is the Act IV quarter index (0–19). */
export interface Act4Move {
  q: number
  kind: Act4MoveKind
}
/** Moves scored on orbital exposure (+1 adds it, −1 reduces it), and moves logged for the timeline only (0). */
export type Act4MoveKind =
  | 'orbit_commit'
  | 'orbit_debt'
  | 'launch_booking'
  | 'orbit_buy'
  | 'orbit_insure'
  | 'orbit_sale'
  | 'orbit_presale'
  | 'launch_cancel'
  | 'equity_raise'
  | 'ground_move'
  | 'lunar_move'

/**
 * The Act III scenario reveal (M11.3), stored once when the last quarter is done: which scenario the
 * player was in, when its trigger hit, what the decoy was, and what they read. No score yet.
 */
export interface Act3End {
  scenarioId: ScenarioId
  scenarioName: string
  triggerQuarter: string
  /** The false alarm: its indicator, quarters, and (M15.3) the window as Act III quarter indices. */
  decoy: { indicator: SignalId; quarters: string[]; fromQ: number; toQ: number }
  signalReads: { quarter: string; indicator: SignalId }[]
  /**
   * Each rival's scripted fate in this scenario (M11.5b), in file order: shown only in the reveal. `withheld`
   * (M15.3): flagged for the D15 review and not cleared, so the screen shows "Fate withheld pending review".
   */
  rivalFates: { rival: string; name: string; fate: string; withheld: boolean }[]
  /** M14.4: the trigger quarter as an Act III quarter index (0–15). */
  triggerQ: number
  /** M15.3: the trigger as a quarter index and its card's engine id (its title is in en.json under that id). */
  trigger: { q: number; cardId: string }
  /** M15.3: each logged move with its sign and its mark against the scenario (hidden file read here only). */
  moves: {
    q: number
    kind: Act3MoveKind
    sign: number
    mark: 'match' | 'opposite' | 'decoy' | 'neutral'
  }[]
  /** M14.4: the reading score (numbers only; readingScore.ts). score null = no weighted quarter. */
  reading: {
    score: number | null
    base: number
    penalty: number
    perQuarter: {
      q: number
      stance: number
      ideal: number
      weight: number
      value: number
    }[]
  }
  /** M14.4: the career title (Act II's valuation bands, or "bust") and the reading title (null with no score). */
  careerTitleId: string
  readingTitleId: string | null
}

/**
 * How the company entered Act II (scope 0.2 §2.10): the Merge choice's head start, applied at the
 * act boundary (doc 18 §2.3), and what it did.
 */
export interface Act2Entry {
  /** The Merge choice (merge.json id) whose head start applies. */
  headStart: string
  /** sell_gpus_keep_btc: the 2023Q1 distressed fleet was bought (it's one-off). */
  fleetBought?: boolean
  /** GPU rigs sold at the boundary (sell_gpus_keep_btc; hosting: those converted), and for how much. */
  gpuRigsSold: number
  gpuSaleUsd: number
  /** gpu_cloud: GPU rigs kept as a legacy cloud (its know-how and early tenants need at least one). */
  legacyGpuRigs: number
  /** hosting: kW of GPU halls now hosting, what converting them cost, and the sites (shell-ready). */
  hostedKw: number
  conversionUsd: number
  shellReadySites: string[]
  /**
   * The distressed lifeline (scope 0.2 §2.10): null when the company is above the floor; offered at
   * the act boundary, then taken (the site and the bridge loan) or passed as Act II begins.
   */
  lifeline: 'offered' | 'taken' | 'passed' | null
}

/** The lifeline's bridge loan: interest each week, the whole principal at the end of its term. */
export interface BridgeLoan {
  amountUsd: number
  balanceUsd: number
  apr: number
  takenQuarter: number
  /** The quarter at whose end the principal is due. */
  dueQuarter: number
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
  /** Act II offers: the category (sites_act2.json), size, region and quarters until it has power. */
  category?: string
  kw?: number
  region?: string
  readyQuarters?: number
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
  /** Its price × this, once negotiated up (M6.0i); missing = the card's price. */
  priceMult?: number
  /** The quarter it was negotiated and not signed (no second try that quarter). */
  negotiatedQuarter?: number
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
  /** A shell lease's rent × this, negotiated before signing (M6.0i); missing = the card's rent. */
  priceMult?: number
  /** An AI-lab tenant in distress from this quarter (M7.0, A3): it pays half for the rest of the term. */
  distressedQuarter?: number
  /** A renewed or re-let shell lease's own term in quarters (Act III, M12.2); missing = its card's. */
  termQuarters?: number
  /**
   * Act III (M12.3, a card's tenant_revenue_mult): a haircut on the rate for the rest of this term only.
   * It is already in priceMult / priceUsdHr; a renewal or a re-let divides it back out.
   */
  revenueMult?: number
  /** Act III (M12.3, a card's term "spot"): a rolling 1-quarter lease, repriced each quarter at the new-lease reference. */
  rolling?: boolean
  /** Act III (M12.3): the quarter this lease was last reopened (the tenant reopens at most once in 4 quarters). */
  reopenedQuarter?: number
  /** Act III (M12.4): the quarter a blend-and-extend offer was last made on this lease. */
  blendOfferedQuarter?: number
}

/**
 * An Act III contract renewal (M12.2, doc 27 §6): opened in the Plan phase of a contract's end quarter
 * (a holdover's in 2027Q1), settled at the end of that quarter. The tenant may walk (rolled when it
 * opens); otherwise it offers a multiple of its own current rate and a new term.
 */
export interface Renewal {
  projectId: string
  kind: 'shell' | 'gpu'
  openedQuarter: number
  /** The tenant leaves at term end (at the roll, or on a failed counter in round 3). */
  walked: boolean
  /** The offer: a multiple of the current rent or $/GPU-hr, and the new term. null when walked at the roll. */
  offer: { mult: number; termQuarters: number } | null
  /** The player's answer; null = the default (accept) at quarter end. */
  choice: 'accept' | 'relet' | null
  /** A counter won in negotiation: the multiple signed instead of the offer's. */
  counterMult?: number
  /** Negotiated this quarter already (no second try). */
  negotiated?: boolean
  /**
   * Why it opened (M12.3): missing = the term ended; 'reopener' = the reopener clause, triggered `by` the
   * tenant or the player; 'card' = an event card ended the contract at quarter end (always walked).
   */
  cause?: 'reopener' | 'card'
  by?: 'tenant' | 'player'
  /** A card's re-let (rfp_weeks, rent_index): its own empty quarters and a multiple on the re-let rent. */
  reletEmptyQuarters?: number
  reletRentMult?: number
  /** M13.2: a walked shell's MW are kept empty (no automatic re-let); the Deal builder can let them later. */
  keepEmpty?: boolean
}

/**
 * A nuclear PPA (Act III, M17.2; nuclear.json): `kw` contracted at a fixed $/MWh for 60 quarters, take-or-pay
 * 90% from `fromQuarter`. It serves the project it's attached to; with none (a stranded PPA) it stays on the
 * site at take-or-pay until a new project on that site uses it.
 */
export interface Ppa {
  id: string
  siteId: string
  kw: number
  priceUsdMwh: number
  signedQuarter: number
  /** Take-or-pay runs from this quarter (the project's ready quarter, or next quarter for a card's PPA). */
  fromQuarter: number
  /** Its last quarter (signed + 60 − 1). */
  endQuarter: number
  projectId: string | null
}

export type WildcardId =
  | 'wc_grid_event'
  | 'wc_export_control'
  | 'wc_water_moratorium'
  | 'wc_ai_lab_breakup'

/** A wildcard drawn at the Act III boundary (M17.4): it fires in `quarter` if it has a target then. */
export interface Act3Wildcard {
  id: WildcardId
  quarter: number
  status: 'pending' | 'fired' | 'skipped'
  choice?: 'c1' | 'c2'
}

/** The Government section's bookkeeping (M17.3). */
export interface Act3Gov {
  /** Lobbying started this quarter: its gain (and Anger change) lands at the quarter's end. */
  pending: { id: string; pc: number; anger: number }[]
  /** The quarter each lobbying action or spend card was last used. */
  lastUsed: Record<string, number>
  /** Once per act: the coalition membership, the grid-support grant. */
  once: string[]
  /**
   * The water moratorium's pause, which "Block the moratorium" can end. Without `kind`: a building project's ready
   * quarter moved `quarters` later. M17.8: 'start', a proposed project can't start, or 'site', no new project can
   * open at the site, through `untilQuarter`.
   */
  pause?: {
    projectId?: string
    siteId?: string
    quarters: number
    kind?: 'start' | 'site'
    untilQuarter?: number
  }
}

/** One logged Act III move (M14.2; the kinds are in systems/act3Moves.ts). */
export interface Act3Move {
  /** The Act III quarter index (0 = 2027Q1 … 15 = 2030Q4) when the action applied. */
  q: number
  kind: Act3MoveKind
}

export type Act3MoveKind =
  | 'project_commit'
  | 'debt_draw'
  | 'site_buy'
  | 'gpu_buy'
  | 'blend_extend'
  | 'gpu_contract_long'
  | 'card_lengthen'
  | 'distressed_buy'
  | 'sale_voluntary'
  | 'debt_repay'
  | 'card_shorten'
  | 'equity_raise'
  // M15.0 (the design thread's A1, A3, A5)
  | 'asic_buy'
  | 'retrofit'
  | 'power_lock'
  | 'hedge'
  // M16.0 (DT): a card that slips or speeds up a build; a revolver drawn only to hold the cash
  | 'project_delay'
  | 'project_accelerate'
  | 'cash_reserve'

/**
 * An Act III blend-and-extend offer (M12.4, DT): a shell tenant with more than 8 quarters left offers to
 * add `extendQuarters` to its lease at one blended rent for the whole remaining + extended term.
 */
export interface BlendOffer {
  projectId: string
  openedQuarter: number
  /** The new rent as a multiple of the current one: (R + E × Band mid) / (R + E). */
  mult: number
  extendQuarters: number
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
  /** Its Power slot: new power (a grid upgrade or on-site gas); missing = the site's existing MW. */
  power?: PowerSource
  openedQuarter: number
  /**
   * 'sold': sold with its MW (they leave the site); 'ended': its GPUs sold, its MW idle again;
   * 'foreclosed': the lender took it and its MW (2 quarters of missed debt service).
   */
  stage: 'proposed' | 'building' | 'live' | 'sold' | 'ended' | 'foreclosed'
  /** Tenant offers (shell projects). */
  offers: TenantOffer[]
  tenant: ProjectTenant | null
  /**
   * Act III re-let by RFP (M12.2): after `emptyUntil`, a new tenant with this card signs at the lapsed
   * rent × that quarter's RFP midpoint. Missing = no RFP running.
   */
  pendingRelet?: { card: string; lapsedRentUsd: number; rentMult?: number }
  /** A distressed tenant was let go (M7.0, A3): no new offers until after this quarter. */
  emptyUntil?: number
  /** Cloud projects: sell capacity on the spot market (the only tenant option so far). */
  spot: boolean
  /**
   * GPUs out after a failure wave you ran short on (M8.4): they earn nothing through `untilQuarter`
   * (a contracted tenant gets an SLA credit), and `costUsd` to replace them is paid at that quarter's end.
   */
  gpuOut?: { gpus: number; untilQuarter: number; costUsd: number }
  /**
   * A spot cluster's capacity locked at a price after a spot price shock (M5.8): every GPU earns
   * usdHr until (and including) that quarter, whatever the utilisation.
   */
  spotLock?: { usdHr: number; until: number }
  /** The capital slot: closed with own cash covering whatever the chosen debt doesn't. */
  capital: 'cash' | null
  /** Debt chosen for the build (Act II capital, M4): drawn when it starts. Missing = none. */
  debt?: {
    projectDebt: boolean
    ddtl: boolean
    /** A lender's rate cut won by negotiating (M6.0i), a fraction a year, by kind. */
    aprCut?: Partial<Record<'project_debt' | 'ddtl', number>>
    /** The quarter a lender walked away from a negotiation, or you did (no second try then), by kind. */
    negotiatedQuarter?: Partial<Record<'project_debt' | 'ddtl', number>>
    /** The quarter a lender walked away (that debt is off for the quarter), by kind. */
    walkedQuarter?: Partial<Record<'project_debt' | 'ddtl', number>>
  }
  /** A big-tech backstop on the lease (M4.6): the share it guarantees and the warrants it took. */
  backstop?: { leaseShare: number; warrantsShare: number; quarter: number }
  /**
   * A JV partner (M4.6): funds `share` of the build's equity (capex less debt) and takes the same
   * share of the project's earnings, backlog and sale proceeds. `fundedUsd` once the build starts.
   */
  jv?: { share: number; fundedUsd: number }
  /**
   * Act III (M16.2): the hall's density tier (systems/density.ts): which GPU generations fit, and a shell's
   * rent multiple. Missing in Act I and II.
   */
  tier?: 'low' | 'mid' | 'top'
  /**
   * Act III (M16.3): a retrofit or GPU change under way. From `fromQuarter` the hall earns a share of each
   * quarter (the downtime rule) for `weeks`; a retrofit's new tier applies once it's done.
   */
  downtime?: {
    kind: 'retrofit' | 'refit'
    fromQuarter: number
    weeks: number
    toTier?: 'low' | 'mid' | 'top'
  }
  /** Act III (M16.4, a card's capex_mw): a new hall on greenfield, priced at the greenfield shell $/MW. */
  greenfield?: boolean
  /** Act III (M16.3): the quarter its GPUs were last changed (their resale ages from then); missing = readyQuarter. */
  gpuDeliveredQuarter?: number
  /**
   * Act III (M18.11): its GPU contract walked with a DDTL on it: re-contract or repay the DDTL by the end of
   * `untilQuarter`, else the lender forecloses. Absent otherwise.
   */
  lenderCure?: { untilQuarter: number }
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
  /**
   * Act III (M18.1, M18.2): 'corporate' (a card's corporate facility) and 'standby' (a draw on the standby liquidity
   * facility) are secured on the company: no project (`projectId` ''), interest each quarter, a bullet at `dueQuarter`.
   */
  kind: 'project_debt' | 'ddtl' | 'corporate' | 'standby'
  projectId: string
  /** Corporate and standby draws: the quarter the principal is due (a bullet). */
  dueQuarter?: number
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

/**
 * Whether an act number is Act II. Every "is this Act II?" check goes through here (M9.1), so a later
 * act can extend the rule in one place. Today it is exactly `act === 2`: no behaviour change.
 */
export const isActII = (act: unknown): boolean => act === 2

/** Whether a game (or none: null) is in Act II. */
export const inActII = (
  state: Pick<GameState, 'act'> | null | undefined,
): boolean => isActII(state?.act)

/**
 * Whether Act II's business rules apply in a game (M11.4c): Act II, and Act III, which runs the same
 * systems on its scenario's market. The gate for every Act II system that runs on in Act III; a system
 * that stays Act II-only keeps inActII. Each gate's answer is in dev-notes.
 */
export const inAct2Rules = (
  state: Pick<GameState, 'act'> | null | undefined,
): boolean => state?.act === 2 || state?.act === 3 || state?.act === 4

/**
 * Whether an act number is Act III (M10.1: the walking skeleton only, no Act III game rules yet).
 * Every "is this Act III?" check goes through here, the same pattern as isActII.
 */
export const isActIII = (act: unknown): boolean => act === 3

/** Whether a game (or none: null) is in Act III. */
export const inActIII = (
  state: Pick<GameState, 'act'> | null | undefined,
): boolean => isActIII(state?.act)

/**
 * Whether an act number is Act IV (M27.2, doc 33: 2031Q1–2035Q4). Every "is this Act IV?" check goes through here,
 * the same pattern as isActII and isActIII.
 */
export const isActIV = (act: unknown): boolean => act === 4

/** Whether a game (or none: null) is in Act IV. */
export const inActIV = (
  state: Pick<GameState, 'act'> | null | undefined,
): boolean => isActIV(state?.act)

/**
 * Whether Act III's business rules apply in a game (M27.2, doc 33 §3.1 and §10): Act III, and Act IV, which runs
 * Act III's ground systems (renewals, density, nuclear PPAs, political capital, the covenant, the standby facility) on
 * its own market. The gate for every Act III system that runs on in Act IV; a system that stays Act III-only keeps
 * inActIII. Each gate's answer is in dev-notes (M27.5).
 */
export const inAct3Rules = (
  state: Pick<GameState, 'act'> | null | undefined,
): boolean => state?.act === 3 || state?.act === 4

/** Act III (M18.13): whether a leverage-covenant breach is open, which bars new debt (systems/covenant.ts). Act IV
 *  continues the covenant (doc 33 §3.2, §11.4). */
export const covenantBreached = (
  state: Pick<GameState, 'act' | 'covenantBreach'>,
): boolean => inAct3Rules(state) && state.covenantBreach !== undefined

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
  version: 5
  /**
   * The act being played: 0 = the prologue (2009Q1–2016Q4, quarter indices −32 … −1), 1 = Act I
   * (2017Q1–2022Q3, 0–22), 2 = Act II (2022Q4–2026Q4, 23–39), 3 = Act III (2027Q1–2030Q4, 40–55),
   * 4 = Act IV (2031Q1–2035Q4, 56–75; M27).
   */
  act: 0 | 1 | 2 | 3 | 4
  /** The prologue's own state: only a prologue start has it (Alpha 0.3). */
  prologue?: PrologueState
  /** What a prologue start brought into Act I (its net worth for the growth multiple, custody). */
  prologueCarry?: PrologueCarry
  /**
   * Act I's liquidity brake for a prologue start (P5.0, P1): this week's coin sales so far and the
   * coins still waiting to sell (unfilled orders carry over). Only prologue starts have it.
   */
  act1Liquidity?: { week: number; soldUsd: number; queue: Record<Coin, number> }
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
  /** M33.1: the highest number ever given per site type (category or tier), so a left site's number isn't reused. */
  siteSerials?: Record<string, number>
  machines: MachineLot[]
  siteOffers: SiteOffer[]
  /** The one equipment loan you can have at a time, or null. */
  equipmentLoan: EquipmentLoan | null
  /** Texas construction loans, one per financed phase (same payment shape as the equipment loan). */
  constructionLoans: EquipmentLoan[]
  /** Act II: the lifeline's bridge loan, or null. */
  bridgeLoan: BridgeLoan | null
  /** Hosting contracts at your sites (Act II). */
  hosting: HostingContract[]
  /** Projects (Act II): AI shells, AI clouds and pilot clusters. */
  projects: Project[]
  /** This quarter's planned construction delay / GPU allocation checks. */
  projectEvents: PlannedProjectEvent[]
  /** Act II: a random spot price shock due this quarter, after week `week` (1–13), or null. */
  spotShock: { week: number } | null
  /** The quarter the first AI deal was signed (the pivot premium), or null. */
  firstAiDealQuarter: number | null
  /** Act II debt secured on a project: project debt and GPU-backed DDTLs. */
  facilities: Facility[]
  /** Act II corporate credit rating (CCC− to BBB), set at each Act II quarter end; null before. */
  creditRating: string | null
  /** The one crypto-backed loan you can have at a time, or null. */
  cryptoLoan: CryptoLoan | null
  /** Community Heat per site id (see systems/heat.ts). */
  siteHeat: Record<string, SiteHeat>
  /** A power contract negotiation in progress (Plan phase only), or null. */
  negotiation: PowerNegotiation | null
  /** Act II: a tenant or lender negotiation in progress (Plan phase only); missing = none (M6.0i). */
  dealNegotiation?: DealNegotiation | null
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
  /** Act II: the head start (and lifeline) set at the act boundary; null in Act I. */
  act2Entry: Act2Entry | null
  /**
   * Act III (M11.1): which market scenario (s0–s3) this game plays, drawn once at the Act II→III
   * boundary (drawScenario). Absent on every Act I and Act II game; every Act III game has one. Only
   * marketWeek's optional argument ever reads it.
   */
  scenarioId?: ScenarioId
  /** M13.1: a tester forced the scenario (test builds only); the top bar says so. Absent otherwise. */
  scenarioForced?: true
  /** M20.2: entered from a test build's quick-start company; the production build refuses its saves. Absent otherwise. */
  act3QuickStart?: true
  /**
   * M18.4: a Scenario Mode run (A3-12): the player chose the scenario openly. The top bar tags it, and the chapter
   * report labels the reading score "scenario known". Absent otherwise.
   */
  scenarioMode?: true
  /**
   * Act III (M11.2): the log of Read the market (Signals) reads, one indicator per quarter at most.
   * Absent in the prologue, Act I and Act II; toAct3() starts it empty.
   */
  act3SignalReads?: { quarter: string; indicator: SignalId }[]
  /** Act III (M11.4b): the company as it entered Act III. Absent in every other act. */
  act3Entry?: Act3Entry
  /** Act III (M12.2): the renewals open this quarter. Absent in every other act. */
  act3Renewals?: Renewal[]
  /**
   * Act III (M14.2): the player's big moves, one entry per action that applied in Act III (q = the Act III
   * quarter index 0–15). It holds no scenario information; the reading score reads it at the end.
   */
  act3Moves?: Act3Move[]
  /**
   * Act III (M12.4): this Plan phase's blend-and-extend offers (a lease's anniversary quarter). Ignored,
   * they lapse. Absent until the first offer.
   */
  act3BlendOffers?: BlendOffer[]
  /**
   * Act III (M12.3): card cash paid at the end of a quarter: a fixed amount, or a share of that quarter's
   * total revenue. Absent in every other act.
   */
  act3Payouts?: {
    quarter: number
    usd?: number
    revenueShare?: number
    reason: 'recovery' | 'revenue_share'
  }[]
  /**
   * Act III (M11.3): the scenario reveal, stored when the last quarter (2030Q4) is done and the game
   * reaches the chapter phase. Absent until then, and in every other act.
   */
  act3End?: Act3End
  /** Act III (M17.2): nuclear PPAs signed (systems/nuclear.ts). Absent until the first. */
  ppas?: Ppa[]
  /** Act III (M17.3): political capital, 0–100 (40 at entry). Absent in every other act. */
  politicalCapital?: number
  /** Act III (M17.3): the company-wide Anger adjustment, −20…+20, added to every region's Anger. */
  angerAdj?: number
  /** Act III (M17.3): the Government section's bookkeeping (lobbying under way, cooldowns, one-offs). */
  act3Gov?: Act3Gov
  /** M18.3: the salt for Act III's own random streams (act3SeedOf); absent = the game's seed. Set by tools only. */
  act3Seed?: number
  /**
   * Act III (M18.2): the standby liquidity facility while it holds (systems/corporateDebt.ts): its size, spread locked
   * at arranging, and the last quarter it can be drawn. Its draws are `facilities` of kind 'standby'. Absent otherwise.
   */
  act3Standby?: {
    arrangedQuarter: number
    sizeUsd: number
    spreadBps: number
    untilQuarter: number
  }
  /**
   * Act III (M18.13): an open leverage-covenant breach (systems/covenant.ts): the quarter it was found and the last
   * quarter end by which LTV must be back to the cure level. Absent when there is none.
   */
  covenantBreach?: { fromQuarter: number; untilQuarter: number }
  /**
   * M19: the Community Relations Manager's yearly Community Deal (systems/communityDeal.ts): the first quarter the next
   * offer may come, and this Plan phase's offer (its site and cost). Absent while she isn't on staff.
   */
  communityDeal?: {
    nextQuarter: number
    offer?: { siteId: string; costUsd: number }
  }
  /** Act III (M17.4): the two wildcards drawn at entry, with the quarter each fires in. */
  act3Wildcards?: Act3Wildcard[]
  /** Act III (M17.4): a wildcard on the Plan screen waiting for an answer (its default applies at END_PLAN). */
  act3WildcardOpen?: { id: WildcardId; projectId?: string; siteId?: string } | null
  /** Act III (M17.4): the export rule wildcard's effects while they last. */
  act3ExportRule?: { from: number; until: number; exempt: boolean }
  /**
   * Act IV (M27.4, doc 33 §6.1): which of the four futures (f1–f4) this game plays, drawn once at the Act III → IV
   * boundary on its own substream of `act4Seed`. Absent before Act IV. Like `scenarioId`, nothing a screen shows during
   * play reads it (the leak guard); the market reads it through `scenarioOf`.
   */
  futureId?: FutureId
  /** Act IV (M27.6): a tester forced the future (test builds only, `?future=`); the top bar says so. Absent otherwise. */
  futureForced?: true
  /** Act IV (M27.6): entered from a test build's quick-start company; the production build refuses its saves. */
  act4QuickStart?: true
  /** Act IV (M27.2): the salt for Act IV's own random streams (act4SeedOf); absent = the game's seed. */
  act4Seed?: number
  /** Act IV (M27.4): the company as it entered Act IV (shaped like `act3Entry`; the growth multiple and the finale). */
  act4Entry?: Act4Entry
  /** Act IV (M27.5): the end record, stored at 2035Q4's end (or a game over in Act IV). Absent until then. */
  act4End?: Act4End
  /**
   * Act IV (M28.3, doc 33 §6.4): the act's lunar grade, drawn at the boundary (systems/lunarGeology.ts). HIDDEN, like
   * `futureId`: no screen during play reads it (only prospect estimates, M30); the chapter report reveals it.
   */
  lunarGrade?: 'rich' | 'patchy' | 'dry'
  /** Act IV (M29.2): the orbital business (blocks, licences, links, insurance market). Absent until first used. */
  act4Orbit?: Act4Orbit
  /** Act IV (M30.2): the lunar programme (claims, missions, disputes, power, plants, offtake). Absent until first used. */
  act4Moon?: Act4Moon
  /** Act IV (M32.1): the move log the reading score reads at the end of the act. */
  act4Moves?: Act4Move[]
  /** Act IV (M32.4): started at Act IV from a preset ("Start at Act IV"): the preset's id. Absent otherwise. */
  act4Preset?: string
  /** Act IV (M32.4): Scenario Mode: the player chose the future. Absent otherwise. */
  act4ScenarioMode?: true
  /** Act IV (M28.5): the two wildcards drawn at entry, each with the quarter it fires in (never shown in advance). */
  act4Wildcards?: { id: WildcardIdIv; quarter: number; fired: boolean }[]
  /** Act IV (M28.2): the log of Read the market (Signals) reads, one indicator per quarter at most. */
  act4SignalReads?: { quarter: string; indicator: SignalIdIv }[]
  /** Started from the standalone preset ("Start at Act II"): no Act I career behind it. */
  preset: boolean
  /** Event cards: what's due, what's been played, and their lasting effects. */
  events: EventState
  /** This quarter's failure-wave rolls, one per site (drawn when the Plan phase ends). */
  failureWaves: PlannedWave[]
  /** A neighbour complaint due this quarter (after week `week`, 1–13) or carried over; null = none. */
  complaint: { siteId: string; week: number } | null
  /**
   * An agreed grid curtailment: the week (0–12) the Texas machines go offline, the credit, and (Act
   * II) the SLA credit owed to AI tenants at those sites.
   */
  curtailment: { week: number; creditUsd: number; slaUsd?: number } | null
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
  /** Act IV orbit alerts (M29.4): the orbital block it's about. */
  orbitBlockId?: string
  /** Act IV lunar alerts (M30.3-4): the mission or the lunar site it's about. */
  lunarMissionId?: string
  lunarSite?: string
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
  /** Construction delay, GPU allocation and the GPU failure wave (Act II): the project it's about. */
  projectId?: string
  /** GPU failure wave only: how many GPUs failed. */
  gpus?: number
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
  /** Act II: live AI MW at the curtailed sites, and the SLA credit their tenants get for the week. */
  aiMw?: number
  slaUsd?: number
  /** Act II, SB6: a big ERCOT site the grid curtails directly (no choice). */
  forced?: boolean
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
  /** The part of the AI margin valued at the contracted multiple floor (M6.0b); missing = 0. */
  aiFloorEbitdaUsd?: number
  /** Take-or-pay damages paid for late projects (counted in EBITDA). */
  lateDamagesUsd: number
  /** Act IV (M29): orbital blocks' revenue, and their running costs (ops, links, insurance, lateness); in EBITDA. */
  orbitRevenueUsd?: number
  orbitCostUsd?: number
  /** Act IV (M30): lunar sales (offtake deliveries) and running costs (maintenance, repairs, the reactor lease); in
   *  EBITDA without a multiple (the resource term already values the deposit, doc 33 §11.3). */
  moonRevenueUsd?: number
  moonCostUsd?: number
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
  /** The part of the AI EBITDA valued at the contracted multiple floor (M6.0b); missing = 0. */
  aiFloorEbitdaUsd?: number
  lateDamagesUsd: number
  /** Act IV (M29.4): the orbital unit: revenue, costs, EBITDA and the space multiple it was valued at. */
  orbitRevenueUsd?: number
  orbitCostUsd?: number
  orbitEbitdaUsd?: number
  orbitMultiple?: number
  /** Act IV (M30.4): lunar sales, costs, their EBITDA (no multiple) and the lunar unit's value. */
  moonRevenueUsd?: number
  moonCostUsd?: number
  moonEbitdaUsd?: number
  lunarUsd?: number
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
  /** Act III (M17.3): political capital at the quarter's end. Absent in every other act. */
  politicalCapital?: number
  /**
   * Act III (M18.13): the leverage covenant at quarter end: LTV (debt ÷ valuation), the limit, the cure level, and the
   * breach's deadline when one is open. Absent in every other act.
   */
  covenant?: { ltv: number; limit: number; cureLtv: number; untilQuarter?: number }
  /** Act II: the credit rating at quarter end (absent in Act I). */
  creditRating?: string
  /** Act II: what the rating rests on (M8.3): debt ÷ yearly EBITDA, its band, backlog quality, runway, card notches. */
  ratingWhy?: {
    debtToEbitda: number | null
    band: string
    quality: string
    shortRunway: boolean
    eventNotches: number
  }
  /** Act II: kW by use at quarter end (absent in Act I and in older saves). */
  mwByUseKw?: MwByUse
  /** Act II: a card's premium on the operating value that quarter (absent when there's none). */
  evMult?: number
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

/**
 * The scenario a game gets at the Act II→III boundary (doc 27 D2: S0 25%, S1 30%, S2 25%, S3 20%).
 * Its own substream(seed, "act3_scenario"), so it never moves the main RNG and no earlier act's game
 * changes. The same seed always draws the same scenario.
 */
/**
 * The seed every act3_* substream is keyed on (M18.3): `act3Seed` when a harness sets one (the anchor runs play one
 * preset under many Act III seeds), else the game's seed, so existing games and goldens never change.
 */
export function act3SeedOf(state: Pick<GameState, 'seed' | 'act3Seed'>): number {
  return state.act3Seed ?? state.seed
}

/**
 * The seed every act4_* substream is keyed on (M27.2): `act4Seed` when a harness sets one, else the game's seed. New
 * Act IV randomness only ever draws from substreams of this, so no earlier act's game changes.
 */
export function act4SeedOf(state: Pick<GameState, 'seed' | 'act4Seed'>): number {
  return state.act4Seed ?? state.seed
}

export function drawScenario(seed: number): ScenarioId {
  const weights = BALANCE.act3.scenarioWeightsPct
  const roll = random(substream(seed, 'act3_scenario')) * 100
  let acc = 0
  for (const id of SCENARIO_IDS) {
    acc += weights[id]
    if (roll < acc) return id
  }
  return SCENARIO_IDS[SCENARIO_IDS.length - 1]
}

/**
 * The Act II→III boundary: enters Act III on the seed's drawn scenario (M11.1), applying the D17
 * carry-over and drops (enterAct3, M11.4b). `options.scenario` forces a scenario: for tests and
 * tools only. Never called by the reducer or any UI (a test greps src/ for that), so Act III stays
 * unreachable from play.
 */
export function toAct3(
  state: GameState,
  /** `forced`: a tester chose the scenario (a test build's ?scenario); marked on the state for the top bar. */
  options: {
    scenario?: ScenarioId
    forced?: boolean
    act3Seed?: number
    /** M18.4: Scenario Mode: the player's chosen scenario, played openly. */
    scenarioMode?: boolean
    /** M20.2: a test build's quick-start company (marked so production refuses its saves). */
    quickStart?: boolean
  } = {},
): GameState {
  // (M18.3: a harness may salt Act III's own randomness; set before the entry draws the wildcards)
  const base =
    options.act3Seed === undefined ? state : { ...state, act3Seed: options.act3Seed }
  const s = enterAct3(base, options.scenario ?? drawScenario(act3SeedOf(base)))
  // M18.8 (DT): a different act3Seed also re-seeds the main RNG, so a harness's runs from one company truly differ;
  // with the default (act3Seed = the game's seed) nothing changes.
  if (options.act3Seed !== undefined && options.act3Seed !== state.seed)
    s.rng = substream(options.act3Seed, 'act3_main').rng
  if (options.forced && options.scenario) s.scenarioForced = true
  if (options.scenarioMode && options.scenario) s.scenarioMode = true
  if (options.quickStart) s.act3QuickStart = true
  return s
}

/**
 * The future a game gets at the Act III → IV boundary (doc 33 §6.1, IV-D8: f1 25%, f2 30%, f3 20%, f4 25% ⚙). Its own
 * substream(act4Seed, "act4_future"), so it never moves the main RNG and no earlier act's game changes.
 */
export function drawFuture(seed: number): FutureId {
  const weights = BALANCE.act4.futureWeightsPct
  const roll = random(substream(seed, 'act4_future')) * 100
  let acc = 0
  for (const id of FUTURE_IDS) {
    acc += weights[id]
    if (roll < acc) return id
  }
  return FUTURE_IDS[FUTURE_IDS.length - 1]
}

/**
 * The Act III → IV boundary (M27.4): enters Act IV on the seed's drawn future, applying doc 33 §3.1–3.2's carry-over
 * and drops (enterAct4). `options.future` forces a future: for tests, tools, a test build's `?future=` and Scenario Mode.
 */
export function toAct4(
  state: GameState,
  options: {
    future?: FutureId
    /** A tester chose the future (a test build's ?future=); marked on the state for the top bar. */
    forced?: boolean
    act4Seed?: number
    /** A test build's quick-start company (marked so production refuses its saves). */
    quickStart?: boolean
    /** M32.4: Scenario Mode: the player chose `future` openly (the finale says "scenario known"). */
    scenarioMode?: boolean
    /** M32.4: "Start at Act IV": the preset's id. */
    preset?: string
  } = {},
): GameState {
  const base = options.act4Seed === undefined ? state : { ...state, act4Seed: options.act4Seed }
  const s = enterAct4(base, options.future ?? drawFuture(act4SeedOf(base)))
  // A harness's different act4Seed also re-seeds the main RNG (as act3Seed does); the default changes nothing.
  if (options.act4Seed !== undefined && options.act4Seed !== state.seed)
    s.rng = substream(options.act4Seed, 'act4_main').rng
  if (options.forced && options.future) s.futureForced = true
  if (options.quickStart) s.act4QuickStart = true
  if (options.scenarioMode && options.future) s.act4ScenarioMode = true
  if (options.preset) s.act4Preset = options.preset
  return s
}

export function newGame(seed: number): GameState {
  const start = CONTENT.siteTiers.find((t) => t.id === BALANCE.startSite)!
  return {
    version: 5,
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
        serial: 1,
        readyQuarter: 0,
        rentUsdQ: start.rent_usd_q,
        powerPriceMult: 1,
        flaw: null,
      },
    ],
    siteSerials: { [start.id]: 1 },
    machines: [],
    siteOffers: [],
    equipmentLoan: null,
    constructionLoans: [],
    bridgeLoan: null,
    hosting: [],
    projects: [],
    projectEvents: [],
    spotShock: null,
    firstAiDealQuarter: null,
    facilities: [],
    creditRating: null,
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
    act2Entry: null,
    preset: false,
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

/**
 * A quarter's label for a log line or a stored message (M27.3). An Act I–III game keeps its logs exactly as they were
 * before Act IV's quarters joined the timeline: a quarter past 2030Q4 has no label there (`fallback`, "—"), as it had
 * none then. An Act IV game labels every quarter to 2035Q4. (Screens may show the real label; only stored text keeps
 * the old rule, so no Act I–III golden or sim output changes.)
 */
export function logQuarterLabel(
  state: Pick<GameState, 'act'>,
  quarter: number,
  fallback = '—',
): string {
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  if (state.act !== 4 && quarter > act3.lastQuarter) return fallback
  return CONTENT.quarters[quarter] ?? fallback
}
