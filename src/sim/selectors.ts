// Read-only views of the game state for the UI. These functions change nothing;
// they answer display questions ("what does a GPU rig earn per day at this site?")
// using the same rules the sim uses, so no game rules have to live in src/ui/.
import {
  BALANCE,
  CONTENT,
  POWER_REGIONS,
  act2Quarter,
  actLastQuarter,
  quarterInputs,
  type MarketWeek,
  type PowerRegion,
  type RegionPolicy,
} from '../content/index.ts'
import type { Message, MessageKey } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import type {
  QuarterReport,
  Coin,
  GameState,
  MachineLot,
  Site,
  SiteOffer,
  PowerContract,
} from './state.ts'
import { inAct2Rules, inActIII } from './state.ts'
import { buildCalendar } from './systems/calendar.ts'
import { SIGNAL_READ_BANDWIDTH, readSignalBlocker } from './systems/signals.ts'
import {
  repairAllCost,
  repairCostPerUnit,
  saleValueUsd,
} from './systems/machines.ts'
import { valuationSplit } from './systems/valuation.ts'
import {
  coinPrice,
  getModel,
  leadTimeQuarters,
  marketWeek,
  previousMarketWeek,
  scenarioOf,
  revenuePerUnitDay,
} from './systems/market.ts'
import {
  collateralUsd,
  debtUsd,
  equipmentTerms,
  maxEquipmentLoanUsd,
} from './systems/loans.ts'
import {
  collateralNeeded,
  collateralValueUsd,
  cryptoLoanOffered,
  defaultLockQuarters,
  ltv,
  marginCallOptions,
  maxCryptoLoanUsd,
} from './systems/cryptoLoan.ts'
import {
  complaintPayGrievance,
  complaintPayUsd,
  growthMult,
  hottestSite,
  isShutDown,
  mitigationCostUsd,
  outreachCostUsd,
  siteHeatValue,
  underMoratorium,
} from './systems/heat.ts'
import {
  contractTypes,
  openingOfferUsdKwh,
  renewalDue,
} from './systems/contracts.ts'
import { availableChoices, defaultChoice } from './systems/interrupts.ts'
import { counterRisk } from './systems/negotiation.ts'
import { readMarketBlocker } from './systems/readMarket.ts'
import { rushRepairUsd } from './systems/failureWave.ts'
import { waveCostUsd } from './systems/gpuWave.ts'
import { bridgeSchedule } from './systems/lifeline.ts'
import { runway } from './systems/runway.ts'
import {
  annualRentUsd,
  backlogUsd,
  gpuWaitQuarters,
  knowHow,
  projectEventCostUsd,
  tenantCard,
} from './systems/projects.ts'
import { renewalBlocker } from './systems/renewals.ts'
import { buyPriceNow } from './systems/eventEffects.ts'
import { eventBodyKey } from './systems/events.ts'
import { lifelineTerms } from './systems/lifeline.ts'
import { angerHeat, regionAnger, regionMoratoriumOn } from './systems/anger.ts'
import {
  DEAL_NEGOTIATION,
  dealNegotiationBlocker,
  dealNegotiationCard,
} from './systems/dealNegotiation.ts'
import { debtOffer } from './systems/facilities.ts'
import { dealView as dealViewOf } from './projectViews.ts'
import {
  fleetBlocker,
  fleetOffer,
  fleetUnitsFor,
  rigResaleMult,
} from './systems/headStarts.ts'
import {
  extraQueueQuarters,
  gridUpgradesHalted,
  regionPowerAdderUsdKwh,
} from './systems/regions.ts'
import {
  constructionLoanUsd,
  gpuKwLeft,
  nextPhase,
  constructionDebtUsd,
  transformerUpgrade,
} from './systems/construction.ts'
import {
  activeRivals,
  leagueTable,
  rivalMoves,
  rivalSnapshot,
  upcomingRivals,
  yourRank,
} from './systems/rivals.ts'
import { mwByUse as mwByUseOf } from './systems/mwUse.ts'
import {
  allHires,
  buildQuartersFor,
  isAct2Hire,
  isHired,
  readMarketBandwidth,
  revealsFlaws,
  salaryUsdQ,
  severanceUsd,
} from './systems/hires.ts'
import {
  canPitch,
  dilutionAt,
  openingPreMoneyUsd,
  pitchCounterRisk,
  walkawayEndsRound,
} from './systems/pitch.ts'
import { isEarning } from './systems/mining.ts'
import {
  normalPriceUsdKwh,
  baseCapexUsd,
  capacityKw,
  getTier,
  isReady,
  leavingTerms,
  poweredKw,
  powerPriceUsdKwh,
  regionOf,
  tierIndex,
  topTierIndex,
  usedKw,
} from './systems/sites.ts'
import { treasuryValueUsd } from './systems/treasury.ts'
import { bandwidthForQuarter } from './systems/bandwidth.ts'
import { getStep, raiseBandwidth, unmetRequirement } from './systems/capital.ts'
export { upcomingRivals } from './systems/rivals.ts'
export { mwByUse, siteMwByUse, MW_USES, type MwUse } from './systems/mwUse.ts'
export {
  backlogView,
  dealCapitalView,
  debtStackView,
  equityView,
  ratingView,
} from './capitalViews.ts'
export {
  PROJECT_COLUMNS,
  dealView,
  openProjectView,
  projectsView,
  type ProjectCardView,
  type ProjectColumn,
} from './projectViews.ts'
import {
  convertibleKw,
  endHostingFeeUsd,
  hostingBlocker,
  hostingCostUsd,
  hostingRateUsdKwh,
  quarterFeesUsd,
  reletKw,
} from './systems/hosting.ts'
import { auctionWindow, lotValueUsd } from './systems/auctions.ts'

/** Would this action be allowed right now? Returns the reason if not. */
export function whyNot(state: GameState, action: Action): Message | null {
  const r = applyAction(state, action)
  return r.ok ? null : r.error
}

export function quarterName(quarter: number): string {
  return CONTENT.quarters[quarter] ?? ''
}

/** The turn within the current act and the act's length: Act I 1–23, Act II 1–17 (2022Q4 = 1). */
export function actTurn(state: GameState): { turn: number; turns: number } {
  const span = CONTENT.acts.find((a) => a.act === state.act)!
  return {
    turn: state.quarter - span.firstQuarter + 1,
    turns: span.lastQuarter - span.firstQuarter + 1,
  }
}

/** The market week the player is looking at: week 1 in the Plan phase, the last played week in the live quarter. */
export function currentMarket(state: GameState): MarketWeek {
  const w = Math.min(Math.max(state.week - 1, 0), BALANCE.weeksPerQuarter - 1)
  return marketWeek(
    state.quarter,
    state.phase === 'plan' ? 0 : w,
    scenarioOf(state),
  )
}

/** Price change of each coin vs the week before the one on screen. */
export function priceChanges(state: GameState): {
  btc: number
  eth: number
  since: string | null
} {
  const w = currentMarket(state)
  const weekIdx = state.phase === 'plan' ? 0 : Math.max(state.week - 1, 0)
  const prev = previousMarketWeek(state.quarter, weekIdx, scenarioOf(state))
  if (!prev) return { btc: 0, eth: 0, since: null }
  return {
    btc: w.btc_usd / prev.btc_usd - 1,
    eth: w.eth_usd / prev.eth_usd - 1,
    since: prev.week,
  }
}

/** The 13 weeks before now plus now (for "last 13 weeks" sparklines). */
export function recentMarket(state: GameState, weeks = 13): MarketWeek[] {
  const flat = CONTENT.market.flat()
  const idx =
    state.quarter * BALANCE.weeksPerQuarter +
    (state.phase === 'plan' ? 0 : Math.max(state.week - 1, 0))
  return flat.slice(Math.max(0, idx - weeks), idx + 1)
}

export function treasuryValue(state: GameState): number {
  return treasuryValueUsd(state, currentMarket(state))
}

/** Daily profit of one healthy unit at a site, at this week's prices. */
export function dailyProfitPerUnit(
  state: GameState,
  modelId: string,
  site: Site,
): number {
  const model = getModel(modelId)!
  const w = currentMarket(state)
  return (
    revenuePerUnitDay(model, w) -
    model.power_kw *
      24 *
      powerPriceUsdKwh(site, state.quarter, scenarioOf(state))
  )
}

/** The cheapest-power energized site: where the dashboard quotes machine profits. */
export function bestSite(state: GameState): Site {
  const ready = state.sites.filter((s) => isReady(s, state.quarter))
  return ready.reduce((a, b) =>
    powerPriceUsdKwh(b, state.quarter, scenarioOf(state)) <
    powerPriceUsdKwh(a, state.quarter, scenarioOf(state))
      ? b
      : a,
  )
}

export interface MachineOffer {
  id: string
  coin: Coin
  hashrate: number
  powerKw: number
  availableFrom: string
  isOut: boolean
  newPriceUsd?: number
  usedPriceUsd?: number
  /** Quarter label when a unit bought now starts earning. */
  earnsFromNew?: string
  earnsFromUsed?: string
  dailyProfitUsd: number
}

export function machineMarket(state: GameState): MachineOffer[] {
  const site = bestSite(state)
  return CONTENT.machines.map((m) => {
    const isOut = CONTENT.quarters[state.quarter] >= m.available_from
    const earns = (c: 'new' | 'used') =>
      quarterName(state.quarter + leadTimeQuarters(m, state.quarter, c) + 1) ||
      'after Act I'
    const newPriceUsd = buyPriceNow(state, m, 'new')
    const usedPriceUsd = buyPriceNow(state, m, 'used')
    return {
      id: m.id,
      coin: m.coin,
      hashrate: m.hashrate,
      powerKw: m.power_kw,
      availableFrom: m.available_from,
      isOut,
      newPriceUsd,
      usedPriceUsd,
      earnsFromNew: newPriceUsd === undefined ? undefined : earns('new'),
      earnsFromUsed: usedPriceUsd === undefined ? undefined : earns('used'),
      dailyProfitUsd: dailyProfitPerUnit(state, m.id, site),
    }
  })
}

export interface SiteView {
  site: Site
  /** 1-based rung on the ladder. */
  rung: number
  capacityKw: number
  usedKw: number
  powerUsdKwh: number
  ready: boolean
  readyQuarter: string
  /** What leaving costs (undefined for the garage, which can't be left). */
  leaving?: { penaltyUsd: number; units: number; machinesUsd: number }
  /** Community Heat now (0–100). */
  heat: number
  /** Heat effects in force: the rate-hike multiplier (or null), moratorium, shutdown. */
  rateHike: number | null
  moratorium: boolean
  shutDown: boolean
  /** The site's power contract, if it has one, and whether its renewal is due now. */
  contract: PowerContract | null
  renewalDue: boolean
  phases: {
    started: number
    powered: number
    of: number
    nextReady: string
  } | null
}

export function siteViews(state: GameState): SiteView[] {
  return state.sites.map((site) => ({
    site,
    rung: tierIndex(site.tier) + 1,
    capacityKw: capacityKw(site),
    usedKw: usedKw(state, site.id),
    powerUsdKwh: powerPriceUsdKwh(site, state.quarter, scenarioOf(state)),
    ready: isReady(site, state.quarter),
    readyQuarter: quarterName(site.readyQuarter) || 'after Act I',
    leaving: tierIndex(site.tier) > 0 ? leavingTerms(state, site) : undefined,
    heat: siteHeatValue(state, site.id),
    rateHike: site.surcharge ?? null,
    moratorium: underMoratorium(state, site.id),
    shutDown: isShutDown(state, site.id),
    contract: site.contract ?? null,
    renewalDue: renewalDue(state, site),
    /** Phased sites (Texas): phases started, powered, of how many, and when the latest powers on. */
    phases: site.phases
      ? {
          started: site.phases.length,
          powered: site.phases.filter((q) => q <= state.quarter).length,
          of: getTier(site.tier)!.phases!.count,
          nextReady: quarterName(Math.max(...site.phases)),
        }
      : null,
  }))
}

export type LotStatus = 'running' | 'switched_off' | 'arriving' | 'broken'

export interface LotView {
  lot: MachineLot
  coin: Coin
  /** Per unit: MH/s for ETH machines, TH/s for BTC machines. */
  hashrateEach: number
  powerKwEach: number
  working: number
  status: LotStatus
  earnsFrom: string
  dailyProfitEachUsd: number
  repairCostUsd: number
  sellValueUsd: number
}

export function lotViews(state: GameState): LotView[] {
  return state.machines.map((lot) => {
    const model = getModel(lot.model)!
    const site = state.sites.find((s) => s.id === lot.siteId)!
    const working = lot.count - lot.failed
    const profit = dailyProfitPerUnit(state, lot.model, site)
    const status: LotStatus = !isEarning(state, lot)
      ? 'arriving'
      : working === 0
        ? 'broken'
        : profit < 0
          ? 'switched_off'
          : 'running'
    return {
      lot,
      coin: model.coin,
      hashrateEach: model.hashrate,
      powerKwEach: model.power_kw,
      working,
      status,
      earnsFrom:
        quarterName(Math.max(lot.earnsFromQuarter, site.readyQuarter)) ||
        'after Act I',
      dailyProfitEachUsd: profit,
      repairCostUsd: lot.failed * repairCostPerUnit(lot.model),
      sellValueUsd:
        saleValueUsd(lot, lot.count, state.quarter, scenarioOf(state)) *
        rigResaleMult(state, lot),
    }
  })
}

export type RungStatus = 'owned' | 'building' | 'build' | 'scout' | 'locked'

export interface LadderRung {
  tier: string
  capacityKw: number
  capexUsd: number
  buildQuarters: number
  status: RungStatus
  /** For locked rungs: the quarter it opens, or the rung that must come first. */
  opensIn?: string
  needsTier?: string
}

export function siteLadder(state: GameState): LadderRung[] {
  const top = topTierIndex(state)
  const direct = BALANCE.sites.noScoutingNeeded as readonly string[]
  return CONTENT.siteTiers.map((tier, i) => {
    const owned = state.sites.filter((s) => s.tier === tier.id)
    const base = {
      tier: tier.id,
      capacityKw: tier.capacity_kw,
      capexUsd: baseCapexUsd(tier),
      buildQuarters: buildQuartersFor(state, tier),
    }
    if (owned.some((s) => isReady(s, state.quarter))) {
      return { ...base, status: 'owned' }
    }
    if (owned.length > 0) return { ...base, status: 'building' }
    if (
      tier.available_from &&
      CONTENT.quarters[state.quarter] < tier.available_from
    ) {
      return { ...base, status: 'locked', opensIn: tier.available_from }
    }
    if (i > top + 1) {
      return {
        ...base,
        status: 'locked',
        needsTier: CONTENT.siteTiers[i - 1].id,
      }
    }
    return { ...base, status: direct.includes(tier.id) ? 'build' : 'scout' }
  })
}

/** Average weekly price of a coin over a quarter (for the report chart). */
export function averagePrice(quarter: number, coin: Coin): number {
  const weeks = CONTENT.market[quarter]
  return weeks.reduce((sum, w) => sum + coinPrice(w, coin), 0) / weeks.length
}

/** Bandwidth cost of each action that costs Bandwidth. */
export const BANDWIDTH_COST = {
  scout: BALANCE.bandwidth.scout,
  build: BALANCE.bandwidth.build,
}

/** Max interrupts in one quarter (for "Interrupts this quarter: 2 of 3"). */
export const MAX_INTERRUPTS = CONTENT.interrupts.maxPerQuarter

export function getTierInfo(id: string) {
  return getTier(id)
}

/**
 * "Fix all (N machines · $X)" on the Dashboard (M6.1): shown whenever a machine is broken; null
 * otherwise. `blocker` says why it can't be done now (not enough cash: no partial repair).
 */
export function repairAllView(state: GameState) {
  const v = repairAllCost(state)
  if (v.units === 0) return null
  const r = applyAction(state, { type: 'REPAIR_ALL' })
  return { ...v, cashUsd: state.cash, blocker: r.ok ? null : r.error }
}

/** The full Bandwidth for this quarter (what a new quarter starts with; the console's g2g.bandwidth()). */
export function bandwidthMax(state: GameState): number {
  return bandwidthForQuarter(state)
}

/** Bandwidth this quarter started with (for "2 of 3 left" pips). */
export function bandwidthTotal(state: GameState): number {
  return Math.max(state.bandwidth, bandwidthForQuarter(state))
}

/** The most recent quarter report, if any. */
export function lastReport(state: GameState) {
  return state.reports.at(-1)
}

/** Weekly move that sets off a price alert (content value, for the event card's footnote). */
export const PRICE_ALERT_THRESHOLD = BALANCE.priceAlert.threshold

/** Choice ids of the active interrupt, with the default marked. */
export function interruptChoices(
  state: GameState,
): { id: string; isDefault: boolean }[] {
  const active = state.interrupt
  if (!active) return []
  const fallback = defaultChoice(state)
  return availableChoices(state).map((id) => ({
    id,
    isDefault: id === fallback,
  }))
}

export type RoundStatus =
  'open' | 'done' | 'closed' | 'not_yet' | 'locked' | 'lost'

/** A funding round's offer and whether it can be taken this quarter (window and once-only). */
export function fundingRound(state: GameState, id: string) {
  const step = getStep(id)!
  const q = CONTENT.quarters[state.quarter]
  const [from, to] = step.window
  const walked = state.pitchWalkaways[id]
  // After a walk-away: shut this quarter; gone for good if it reopens after the window.
  const reopens = walked ? (CONTENT.quarters[walked.reopensQuarter] ?? '') : ''
  const lockedNow = !!walked && state.quarter < walked.reopensQuarter
  const status: RoundStatus = state.raisesDone.includes(id)
    ? 'done'
    : q > to
      ? 'closed'
      : q < from
        ? 'not_yet'
        : lockedNow
          ? !reopens || reopens > to
            ? 'lost'
            : 'locked'
          : 'open'
  const pitchable = canPitch(id)
  const preMoneyUsd = pitchable ? openingPreMoneyUsd(state, id) : undefined
  return {
    id,
    amountUsd: step.amount_usd,
    /** At the investor's opening terms now (a walk-away lowers the valuation). */
    dilution:
      preMoneyUsd !== undefined && walked
        ? dilutionAt(step, preMoneyUsd)
        : step.dilution,
    preMoneyUsd,
    /** How much a walk-away took off the opening valuation (0–0.2). */
    penalty: walked?.penalty ?? 0,
    reopens,
    pitchable,
    /** A pitch for this round is in progress. */
    pitching: state.pitch?.id === id,
    bandwidth: raiseBandwidth(step, state),
    pitchBandwidth: CONTENT.pitch.bandwidth,
    lockoutQuarters: CONTENT.pitch.lockoutQuarters,
    walkawayPenalty: CONTENT.pitch.walkawayPenalty,
    /** Walking away from a pitch now would end the round for good. */
    lastChance: canPitch(id) && walkawayEndsRound(state, id),
    from,
    to,
    status,
    /** What the round still needs (a site size, total MW, EBITDA), while it's open. */
    requirement: status === 'open' ? unmetRequirement(state, step) : undefined,
  }
}

/** The investor pitch in progress, as the pitch panel shows it (never the hidden limit). */
export function pitchView(state: GameState) {
  const p = state.pitch
  if (!p) return null
  const step = getStep(p.id)!
  return {
    id: p.id,
    amountUsd: p.amountUsd,
    round: p.round,
    rounds: CONTENT.pitch.rounds,
    final: p.final,
    openingUsd: p.openingUsd,
    offerUsd: p.offerUsd,
    history: p.history.map((h) => ({ counterUsd: h.counterUsd })),
    walkawayChance: CONTENT.pitch.walkawayChance,
    ...pitchSlider(p.openingUsd, p.offerUsd),
    /** Walking away (or being walked out on) ends the round for good. */
    lastChance: walkawayEndsRound(state, p.id),
    /** Share given up and founder stake after, at a pre-money valuation. */
    terms: (preMoneyUsd: number) => {
      const dilution = dilutionAt(step, preMoneyUsd)
      return { dilution, stakeAfter: state.founderStake * (1 - dilution) }
    },
    risk: (preMoneyUsd: number) => pitchCounterRisk(state, preMoneyUsd),
  }
}

/** The counter slider: from the current offer up to 1.5× the opening, in round steps. */
function pitchSlider(openingUsd: number, offerUsd: number) {
  const step = 10_000 * Math.max(1, Math.round(openingUsd / 6_000_000))
  const snap = (v: number) => Math.round(v / step) * step
  const min = Math.ceil(offerUsd / step) * step
  const max = snap(openingUsd * 1.5)
  return {
    sliderStepUsd: step,
    sliderMinUsd: min,
    sliderMaxUsd: max,
    /** Where the slider starts: 10% above their offer. */
    defaultCounterUsd: Math.min(max, Math.max(min, snap(offerUsd * 1.1))),
  }
}

/** How this quarter's pitch for a round ended (the log line), if it ended this quarter. */
export function pitchResult(state: GameState, id: string) {
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i]
    if (e.quarter !== state.quarter) return null
    if (
      e.key.startsWith('log.pitch_') &&
      e.key !== 'log.pitch_started' &&
      e.params?.round === id
    )
      return e
  }
  return null
}

/** The equipment loan as the Plan screen shows it: this quarter's terms, how much you could borrow, the loan you have. */
export function equipmentLoanView(state: GameState) {
  const terms = equipmentTerms(state)
  return {
    /** undefined once lenders stop offering (after 2022Q2). */
    terms,
    collateralUsd: collateralUsd(state),
    maxUsd: maxEquipmentLoanUsd(state),
    loan: state.equipmentLoan,
    bandwidth: BALANCE.bandwidth.loan,
    /** Last quarter any lender offers one (capital.json), e.g. "2022Q2". */
    offeredUntil: CONTENT.equipmentLoans.at(-1)?.availableUntil ?? '',
    /** First quarter's payment for a loan of `amountUsd`: 1/term of the principal plus a quarter's interest. */
    quarterlyPaymentUsd: (amountUsd: number) =>
      terms ? amountUsd / terms.tenorQuarters + (amountUsd * terms.apr) / 4 : 0,
  }
}

/** The treasury as the sell dialog shows it: coins held and their value at this week's price. */
export function treasuryHoldings(state: GameState) {
  const w = currentMarket(state)
  return (['BTC', 'ETH'] as const).map((coin) => ({
    coin,
    amount: state.treasury[coin],
    valueUsd: state.treasury[coin] * coinPrice(w, coin),
  }))
}

export const SELL_TREASURY_BANDWIDTH = BALANCE.bandwidth.sellTreasury

/** The crypto-backed loan as the Plan screen shows it. */
export function cryptoLoanView(state: GameState) {
  const terms = CONTENT.cryptoLoan
  const w = currentMarket(state)
  const loan = state.cryptoLoan
  /** Coin price at which a loan of `balanceUsd` on `collateral` coins reaches `level` LTV. */
  const priceAt = (balanceUsd: number, collateral: number, level: number) =>
    collateral > 0 ? balanceUsd / (level * collateral) : 0
  return {
    terms,
    offered: cryptoLoanOffered(state.quarter),
    bandwidth: BALANCE.bandwidth.loan,
    loan,
    ltvNow: ltv(state, w),
    collateralUsd: collateralValueUsd(state, w),
    marginCallPrice: loan
      ? priceAt(loan.balanceUsd, loan.collateral, terms.marginCallLtv)
      : 0,
    liquidationPrice: loan
      ? priceAt(loan.balanceUsd, loan.collateral, terms.liquidationLtv)
      : 0,
    maxUsd: (coin: Coin) => maxCryptoLoanUsd(state, coin),
    /** For a new loan: coins pledged, and the prices where it gets a margin call / is liquidated. */
    preview: (coin: Coin, amountUsd: number) => {
      const collateral = collateralNeeded(state, coin, amountUsd)
      return {
        collateral,
        marginCallPrice: priceAt(amountUsd, collateral, terms.marginCallLtv),
        liquidationPrice: priceAt(amountUsd, collateral, terms.liquidationLtv),
        price: coinPrice(w, coin),
      }
    },
  }
}

/** The margin call card: the loan, its LTV, and what each answer would cost. null if none is pending. */
export function marginCallView(state: GameState) {
  const options = marginCallOptions(state)
  const loan = state.cryptoLoan
  if (!options || !loan || !state.interrupt) return null
  return {
    coin: loan.coin,
    ltv: state.interrupt.ltv ?? 0,
    target: CONTENT.cryptoLoan.ltvMax,
    liquidationLtv: CONTENT.cryptoLoan.liquidationLtv,
    balanceUsd: loan.balanceUsd,
    options,
    lockQuarters: defaultLockQuarters(),
  }
}

export interface AuctionView {
  /** The lot on offer this Plan phase, or null. */
  lot: {
    model: string
    count: number
    unitListUsd: number
    valueUsd: number
    reserveUsd: number
    neededKw: number
    /** Rivals bidding (their bids stay sealed). */
    bidders: string[]
  } | null
  bandwidth: number
  /** Sites with room for the whole lot, cheapest power first. */
  sitesWithRoom: Site[]
  /** Profit per unit per day at the given site at today's prices. */
  dailyProfitUsd: (site: Site) => number
  /** No lot: is this quarter in an auction window? If not, when does the next one open? */
  inWindow: boolean
  nextWindow: string | null
}

export function auctionView(state: GameState): AuctionView {
  const a = state.auction
  const model = a ? getModel(a.model)! : undefined
  const neededKw = a && model ? model.power_kw * a.count : 0
  const next = CONTENT.auction.windows.find(
    (w) => w.from > CONTENT.quarters[state.quarter],
  )
  return {
    lot:
      a && model
        ? {
            model: a.model,
            count: a.count,
            unitListUsd: a.unitListUsd,
            valueUsd: lotValueUsd(a),
            reserveUsd: a.reserveUsd,
            neededKw,
            bidders: a.bids.map((b) => b.rival),
          }
        : null,
    bandwidth: CONTENT.auction.bandwidth,
    sitesWithRoom: state.sites
      .filter((s) => capacityKw(s) - usedKw(state, s.id) + 1e-9 >= neededKw)
      .sort(
        (x, y) =>
          powerPriceUsdKwh(x, state.quarter, scenarioOf(state)) -
          powerPriceUsdKwh(y, state.quarter, scenarioOf(state)),
      ),
    dailyProfitUsd: (site) =>
      a ? dailyProfitPerUnit(state, a.model, site) : 0,
    inWindow: auctionWindow(state.quarter) !== undefined,
    nextWindow: next?.from ?? null,
  }
}

/** Heat thresholds from heat.json, low to high: complaints, rate hike, moratorium, shutdown. */
export const HEAT_MARKS = [
  CONTENT.heat.complaintAt,
  CONTENT.heat.rateHike.at,
  CONTENT.heat.moratoriumAt,
  CONTENT.heat.shutdown.at,
] as const

/** Colour band 1–5 for a Heat value (design system: heat-1 … heat-5 by threshold). */
export function heatBand(heat: number): 1 | 2 | 3 | 4 | 5 {
  return (1 + HEAT_MARKS.filter((m) => heat >= m).length) as 1 | 2 | 3 | 4 | 5
}

/** The hottest site, for the top bar: its tier and Heat. */
export function topHeat(state: GameState): { tier: string; heat: number } {
  const h = hottestSite(state)
  return { tier: h.site.tier, heat: h.value }
}

/** Every site's Heat and what outreach / noise mitigation would cost there (Community dialog). */
export function communityView(state: GameState) {
  const rules = CONTENT.heat
  return {
    outreachBandwidth: rules.outreach.bandwidth,
    outreachGrievance: rules.outreach.grievance,
    mitigationBandwidth: rules.mitigation.bandwidth,
    mitigationBase: rules.mitigation.heatBase,
    sites: state.sites.map((site) => {
      const h = state.siteHeat[site.id]
      return {
        site,
        heat: h?.value ?? 0,
        outreachUsd: outreachCostUsd(site),
        outreachDone: h?.outreachQuarter === state.quarter,
        mitigationUsd: mitigationCostUsd(site),
        mitigated: h?.mitigated ?? false,
      }
    }),
  }
}

/** The neighbour complaint card: the site, its Heat, and what each answer does. */
export function complaintView(state: GameState) {
  const siteId = state.interrupt?.siteId
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return null
  const heat = siteHeatValue(state, site.id)
  const ignore = CONTENT.heat.ignoreComplaint * growthMult(site)
  return {
    tier: site.tier,
    heat,
    payUsd: complaintPayUsd(),
    payGrievance: complaintPayGrievance(),
    wallsUsd: mitigationCostUsd(site),
    wallsBase: CONTENT.heat.mitigation.heatBase,
    ignoreGrievance: ignore,
    heatAfterIgnore: Math.min(100, heat + ignore),
    complaintAt: CONTENT.heat.complaintAt,
  }
}

/** Grievance added at the Texas site by "keep mining" in a curtailment (heat.json). */
export const KEEP_MINING_GRIEVANCE = CONTENT.heat.keepMining

/** Power contract renewals due this Plan phase, with the utility's opening offer per contract type. */
export function renewalViews(state: GameState) {
  return state.sites
    .filter((site) => renewalDue(state, site))
    .map((site) => ({
      site,
      current: site.contract!,
      options: contractTypes(site).map((type) => ({
        type,
        normalUsdKwh: normalPriceUsdKwh(
          site,
          state.quarter,
          type,
          scenarioOf(state),
        ),
        openingUsdKwh: openingOfferUsdKwh(
          site,
          state.quarter,
          type,
          scenarioOf(state),
        ),
      })),
      openingMult: CONTENT.negotiation.openingMult,
      terms: CONTENT.negotiation.terms,
      longTermMult: CONTENT.negotiation.longTermLimitMult,
      bandwidth: CONTENT.negotiation.bandwidth,
    }))
}

/** The next power contract to come up for renewal (for the locked row), or null. */
export function nextRenewal(
  state: GameState,
): { tier: string; quarter: string } | null {
  const next = state.sites
    .filter((s) => s.contract)
    .sort((a, b) => a.contract!.endQuarter - b.contract!.endQuarter)[0]
  return next
    ? {
        tier: next.tier,
        quarter: CONTENT.quarters[next.contract!.endQuarter] ?? '',
      }
    : null
}

/** The negotiation in progress, as the bargaining panel shows it (never the hidden limit). */
export function negotiationView(state: GameState) {
  const n = state.negotiation
  if (!n) return null
  const site = state.sites.find((x) => x.id === n.siteId)!
  return {
    tier: site.tier,
    contractType: n.contractType,
    term: n.term,
    round: n.round,
    rounds: CONTENT.negotiation.rounds,
    final: n.final,
    openingUsdKwh: n.openingUsdKwh,
    offerUsdKwh: n.offerUsdKwh,
    normalUsdKwh: normalPriceUsdKwh(
      site,
      state.quarter,
      n.contractType,
      scenarioOf(state),
    ),
    history: n.history.map((h) => ({ counterUsdKwh: h.counterUsdKwh })),
    walkawayChance: CONTENT.negotiation.walkawayChance,
    risk: (priceUsdKwh: number) => counterRisk(state, priceUsdKwh),
  }
}

/** How this quarter's negotiation at a site ended (the log line), if it ended this quarter. */
export function negotiationResult(state: GameState, tier: string) {
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i]
    if (e.quarter !== state.quarter) return null
    if (
      (e.key === 'log.negotiation_deal' ||
        e.key === 'log.negotiation_they_walked' ||
        e.key === 'log.negotiation_you_walked') &&
      e.params?.tier === tier
    )
      return e
  }
  return null
}

/** Act II spot alerts: how many quarters "lock" fixes the spot capacity's price for. */
export const SPOT_LOCK_QUARTERS = BALANCE.act2Spot.lockQuarters

/** Uri: the storm price per kWh index contracts pay on their firm load (shocks.json). */
export const URI_STORM_PRICE =
  CONTENT.shocks.find((sh) => sh.id === 'uri')?.stormPriceUsdKwh ?? 0

/** The hires as the People dialog shows them (Act II adds two): on staff or not, pay, and what's blocking. */
export function hireViews(state: GameState) {
  return allHires()
    .filter((h) => inAct2Rules(state) || !isAct2Hire(h.id))
    .map((h) => ({
      id: h.id,
      name: h.name,
      bio: h.bio,
      hired: isHired(state, h.id),
      salaryUsdQ: salaryUsdQ(h, state.quarter),
      severanceUsd: severanceUsd(h, state.quarter),
      bandwidth: CONTENT.hires.bandwidth,
    }))
}

/** Scouted offers show their hidden flaw (BD Lead on staff). */
export function offerFlawsVisible(state: GameState): boolean {
  return revealsFlaws(state)
}

/** Read the market's Bandwidth cost now (0 with the Trader). */
export function readMarketCost(state: GameState): number {
  return readMarketBandwidth(state)
}

/** Read the market as the Plan and Live screens show it: its cost, and this quarter's read. */
export function marketReadView(state: GameState) {
  const read =
    state.marketRead?.quarter === state.quarter ? state.marketRead.reads : null
  return {
    bandwidth: readMarketBandwidth(state),
    read,
    /** Why it can't be read now (null when it can, or when it's already read). */
    blocked: read ? null : (readMarketBlocker(state) ?? null),
    accuracy: CONTENT.readMarket.accuracy,
    upThreshold: CONTENT.readMarket.upThreshold,
    downThreshold: CONTENT.readMarket.downThreshold,
  }
}

/**
 * Act III's Signals panel (M11.2; no screen yet): the six indicators in file order, or null outside
 * Act III / without a scenario. Each has its label, what a high value means, the current quarter's
 * displayed value and arrow, the displayed history of PAST Act III quarters, and the sharp range only
 * for quarters the player has read that indicator. Never a future quarter, never a hidden field.
 */
export function signalsPanel(state: GameState) {
  if (!inActIII(state) || !state.scenarioId) return null
  const now = CONTENT.quarters[state.quarter]
  const reads = state.act3SignalReads ?? []
  return {
    quarter: now,
    cost: SIGNAL_READ_BANDWIDTH,
    /** The indicator read this quarter, or null. */
    readThisQuarter: reads.find((r) => r.quarter === now)?.indicator ?? null,
    /** Why a read is blocked right now (null when it can be made, or was already made). */
    blocked: reads.some((r) => r.quarter === now)
      ? null
      : (readSignalBlocker(state, 'revenue_gap') ?? null),
    indicators: CONTENT.signals[state.scenarioId].map((ind) => {
      const current = ind.series.find((p) => p.quarter === now)
      return {
        id: ind.id,
        label: ind.label,
        higherMeans: ind.higher_means,
        current: current
          ? { displayed: current.displayed, arrow: current.arrow }
          : null,
        history: ind.series
          .filter((p) => p.quarter < now)
          .map((p) => ({
            quarter: p.quarter,
            displayed: p.displayed,
            arrow: p.arrow,
          })),
        reads: reads
          .filter((r) => r.indicator === ind.id)
          .flatMap((r) => {
            const p = ind.series.find((x) => x.quarter === r.quarter)
            return p ? [{ quarter: p.quarter, ...p.sharp }] : []
          }),
      }
    }),
  }
}

/** Energized capacity and what the machines there draw, in kW (sites that are built and powered). */
function energizedKw(state: GameState): { totalKw: number; usedKw: number } {
  let totalKw = 0
  let used = 0
  for (const site of state.sites) {
    if (!isReady(site, state.quarter)) continue
    totalKw += capacityKw(site)
    used += usedKw(state, site.id)
  }
  return { totalKw, usedKw: Math.min(used, totalKw) }
}

/**
 * The Act II intro (wireframe A2-02): what the company carries over from Act I, as it is
 * (doc 18 §2.1). Sites with their energized MW, cash, debt, the coin treasury (at the last
 * week of 2022Q3), the fleet and its installed hashrate (working units), and the founder's stake.
 */
export function carryOver(state: GameState) {
  const q = Math.min(state.quarter, actLastQuarter(1))
  const w = marketWeek(q, BALANCE.weeksPerQuarter - 1)
  const sites = state.sites.map((site) => ({
    id: site.id,
    tier: site.tier,
    energizedKw: poweredKw(site, q),
  }))
  let asics = 0
  let gpus = 0
  let btcThs = 0
  for (const lot of state.machines) {
    const model = getModel(lot.model)!
    if (model.coin === 'BTC') {
      asics += lot.count
      btcThs += (lot.count - lot.failed) * model.hashrate
    } else gpus += lot.count
  }
  return {
    sites,
    energizedKw: sites.reduce((kw, s) => kw + s.energizedKw, 0),
    cashUsd: state.cash,
    debtUsd: debtUsd(state),
    treasury: state.treasury,
    treasuryUsd: treasuryValueUsd(state, w),
    asics,
    gpus,
    btcThs,
    founderStake: state.founderStake,
    mergeChoice: state.mergeChoice,
    /** The Merge head start as applied at the act boundary (null before it), and its terms. */
    headStart: state.act2Entry,
    /** The lifeline card's terms while it's on offer (below the floor), else null. */
    lifeline:
      state.act2Entry?.lifeline === 'offered' ? lifelineTerms(state) : null,
    headStartTerms: {
      leanPct: 1 - BALANCE.headStarts.leanOps.powerMult,
      leanQuarters: BALANCE.headStarts.leanOps.quarters,
      usdHr: BALANCE.headStarts.legacyCloud.usdPerGpuHr,
      utilPct: BALANCE.headStarts.legacyCloud.utilisation,
      tenantsFrom: BALANCE.headStarts.gpuCloudTenantsFrom,
      tenantsLater: BALANCE.projects.tenantsFrom,
      rateCents: BALANCE.headStarts.hostingRateUsdKwh * 100,
      termQuarters: BALANCE.hosting.termQuarters,
      discountPct: CONTENT.projects.shellReady.capexDiscount,
      cloudOfferFrom: BALANCE.headStarts.guaranteedOffer.gpu_cloud.from,
      shellOfferFrom: BALANCE.headStarts.guaranteedOffer.hosting.from,
      fleetQuarter: BALANCE.headStarts.distressedFleet.quarter,
      fleetKw: BALANCE.headStarts.distressedFleet.maxKw,
      fleetPct: BALANCE.headStarts.distressedFleet.priceShareOfNew,
      premiumPct: BALANCE.headStarts.holdAndWait.resalePremium,
      premiumFrom: BALANCE.headStarts.holdAndWait.premiumQuarters[0],
      premiumTo: BALANCE.headStarts.holdAndWait.premiumQuarters[1],
    },
  }
}

/**
 * A tenant or lender negotiation in progress (M6.0i) as the Deal builder shows it, or null: what is
 * being bargained over, the card's terms, their current offer and your asks so far. Never the limit.
 * A tenant's values are price multiples of the card (1.05 = +5%); a lender's are rate cuts (0.005).
 */
export function dealNegotiationView(state: GameState) {
  const n = state.dealNegotiation
  if (!n) return null
  const p = state.projects.find((x) => x.id === n.projectId)
  if (!p) return null
  const card = dealNegotiationCard(state)
  const offer = card ? p.offers.find((o) => o.id === n.offerId) : undefined
  const offerView = offer
    ? dealViewOf(state, p.id)?.offers.find((o) => o.offer.id === offer.id)
    : undefined
  const debtApr =
    n.side === 'lender' && n.debt
      ? debtOffer(state, p, n.debt).apr + (p.debt?.aprCut?.[n.debt] ?? 0)
      : null
  return {
    projectId: p.id,
    side: n.side,
    card,
    debt: n.debt ?? null,
    /** The card's yearly contract (tenant) or rate (lender), before negotiating. */
    baseAnnualUsd: offerView?.annualUsd ?? null,
    baseApr: debtApr,
    offer: n.offer,
    round: n.round,
    rounds: DEAL_NEGOTIATION.rounds,
    final: n.final,
    history: n.history,
  }
}

/**
 * sell_gpus_keep_btc's 2023Q1 distressed fleet (owner, 28 Sep 2026), while it's on offer: the offer
 * and, for each site but the garage, how many units fit and why it can't be bought there. Else null.
 */
export function fleetOfferView(state: GameState) {
  const offer = fleetOffer(state)
  if (!offer || state.phase !== 'plan') return null
  return {
    ...offer,
    sites: state.sites
      .filter((s) => s.tier !== BALANCE.startSite)
      .map((s) => ({
        siteId: s.id,
        tier: s.tier,
        units: fleetUnitsFor(state, s.id),
        costUsd: fleetUnitsFor(state, s.id) * offer.unitUsd,
        blocker: fleetBlocker(state, s.id) ?? null,
      })),
  }
}

/**
 * The region panel (Act II, wireframe A2-06; scope 0.2 §2.6): for each of the six regions, its power
 * price now and a year on (with any policy charge), grid queue, Heat and anger modifiers, its policy
 * events (in force or still to come), whether grid upgrades are halted, and your sites there. Then
 * the national policies. Ratepayer Anger (0–100) with the Heat it adds there and any moratorium.
 */
export function regionsView(state: GameState) {
  const q = state.quarter
  const now = CONTENT.quarters[q]
  const next = Math.min(q + 4, CONTENT.quarters.length - 1)
  const price = (id: PowerRegion, quarter: number) =>
    (inputsAt(state, quarter)?.powerUsdKwh[id] ?? 0) +
    regionPowerAdderUsdKwh(id, quarter)
  const policy = (p: RegionPolicy) => ({
    id: p.id,
    quarter: p.quarter,
    active: p.quarter <= now,
    /** Whether it changes numbers in the game (else it's news only, for now). */
    hasEffect: Object.keys(p.effect).length > 0,
  })
  const regions = POWER_REGIONS.map((id) => {
    const r = CONTENT.regions[id]
    const sites = state.sites.filter((s) => regionOf(s) === id)
    return {
      id,
      powerUsdKwh: price(id, q),
      powerNextYearUsdKwh: price(id, next),
      queueMonths: r.queue_months,
      heatMult: r.heat_modifier,
      angerMult: r.anger_modifier,
      anger: regionAnger(state, id),
      angerHeat: angerHeat(state, id),
      angerMoratoriumAt: BALANCE.act2Regions.anger.moratoriumAt,
      moratorium: regionMoratoriumOn(state, id),
      policies: r.policies.map(policy),
      gridUpgradesHalted: gridUpgradesHalted(id, q),
      extraQueueQuarters: extraQueueQuarters(id, q),
      siteCount: sites.length,
      energizedKw: sites.reduce((kw, s) => kw + poweredKw(s, q), 0),
    }
  })
  const biggest = [...regions].sort((a, b) => b.energizedKw - a.energizedKw)[0]
  return {
    regions,
    national: CONTENT.nationalPolicies.map(policy),
    /** The region of your biggest site (the one to show first). */
    home: biggest.id,
  }
}

/** An Act II site offer as the offers dialog shows it (A2-06's scouting drawer), or null for an Act I offer. */
export function act2OfferView(state: GameState, o: SiteOffer) {
  if (!o.category || !o.region || !o.kw) return null
  const ready = state.quarter + (o.readyQuarters ?? 1)
  return {
    category: o.category,
    kw: o.kw,
    region: o.region,
    /** The quarter it has power, or null if that's after the end of Act II. */
    readyQuarter: CONTENT.quarters[ready] ?? null,
    perMwUsd: o.capexUsd / (o.kw / 1000),
    powerUsdKwh:
      (inputsAt(state, state.quarter)?.powerUsdKwh[o.region as PowerRegion] ??
        0) + regionPowerAdderUsdKwh(o.region as PowerRegion, state.quarter),
  }
}

/**
 * The Merge screen: the four choices (with a note when one doesn't fit your company) and what
 * you're holding: GPUs and their resale value at the game's 2022Q3 used prices, BTC hashrate,
 * energized MW used vs idle.
 */
export function mergeView(state: GameState) {
  const gpuLots = state.machines.filter(
    (l) => getModel(l.model)!.coin === 'ETH',
  )
  const gpus = gpuLots.reduce((n, l) => n + l.count, 0)
  const last = actLastQuarter(1)
  const gpuResaleUsd = gpuLots.reduce(
    (sum, l) => sum + saleValueUsd(l, l.count, last),
    0,
  )
  const sites = state.sites.some((s) => s.tier !== BALANCE.startSite)
  const { totalKw, usedKw: used } = energizedKw(state)
  return {
    gpus,
    gpuResaleUsd,
    btcThs: state.reports.at(-1)?.hashrate.BTC ?? 0,
    energizedKw: totalKw,
    usedKw: used,
    idleKw: totalKw - used,
    choices: CONTENT.merge.choices.map((c) => ({
      id: c.id,
      text: c.text,
      act2Preview: c.act2Preview,
      /** The 2019 GPU-cloud rumour, if you made a note of it (gpu_cloud only). */
      insight:
        c.id === 'gpu_cloud' && state.events.flags.includes('cloud_insight'),
      /** Set when the choice is about something you don't have. */
      note:
        c.appliesIf === 'gpus' && gpus === 0
          ? ('ui.merge.no_gpus' as const)
          : c.appliesIf === 'sites' && !sites
            ? ('ui.merge.no_sites' as const)
            : null,
    })),
  }
}

/** Your league rank with your value scaled (a prologue start ranked by its growth multiple). */
function scaledRank(
  state: GameState,
  reportIndex: number,
  scale: number,
): { rank: number; of: number } {
  const rows = leagueTable(state, reportIndex)
    .filter((r) => r.valueUsd !== null)
    .map((r) => ({
      id: r.id,
      value: r.id === 'you' ? r.valueUsd! * scale : r.valueUsd!,
    }))
    .sort((a, b) => b.value - a.value)
  return { rank: rows.findIndex((r) => r.id === 'you') + 1, of: rows.length }
}

/**
 * The chapter report (end of Act I, or a bust): the score (founder net worth = stake × the last
 * valuation, the peak, the league rank) with its title, the career curve, and the raw facts for
 * the key moments. The UI turns the facts into text.
 */
export function chapterReport(state: GameState) {
  const bust = state.phase === 'gameover'
  const reports = state.reports
  const last = reports.at(-1)
  const finalValuationUsd = last?.valuationUsd ?? state.cash
  const netWorthUsd = Math.max(0, state.founderStake * finalValuationUsd)
  // A prologue start (Alpha 0.3 §2.12, P0-17) is scored by its growth multiple: title and rank
  // go by what a $10K start would have reached with the same multiple.
  const startUsd = state.prologueCarry?.startNetWorthUsd
  const growthMultiple =
    startUsd !== undefined && startUsd > 0 ? netWorthUsd / startUsd : null
  const scale = growthMultiple !== null ? BALANCE.startCash / startUsd! : 1
  const scoredUsd = netWorthUsd * scale
  const title = bust
    ? CONTENT.merge.bustTitle
    : (CONTENT.merge.titleBands.find((b) => scoredUsd >= b.min)?.title ??
      CONTENT.merge.titleBands.at(-1)!.title)
  const peak = reports.reduce<QuarterReport | undefined>(
    (a, b) => (!a || b.valuationUsd > a.valuationUsd ? b : a),
    undefined,
  )
  const byEbitda = [...reports].sort((a, b) => b.ebitdaUsd - a.ebitdaUsd)
  const logOf = (key: string) => state.log.filter((e) => e.key === key)
  const uri = CONTENT.shocks.find((sh) => sh.id === 'uri')
  const uriEntry = uri
    ? state.log.find(
        (e) =>
          e.quarter === uri.quarter &&
          e.week === uri.week &&
          (e.key === 'log.curtail_agreed' || e.key === 'log.curtail_declined'),
      )
    : undefined
  // Rivals: everyone with numbers at the end of Act I reached the Merge; anyone in the game
  // earlier who has none by then dropped out.
  const endQuarter = actLastQuarter(1)
  const reached = activeRivals(endQuarter).map((r) => r.id)
  const dropped = CONTENT.rivals
    .filter(
      (r) =>
        !reached.includes(r.id) &&
        CONTENT.quarters.some((_, q) => rivalSnapshot(r, q) !== null),
    )
    .map((r) => r.id)
  return {
    bust,
    title,
    netWorthUsd,
    finalValuationUsd,
    founderStake: state.founderStake,
    peak: peak
      ? { valuationUsd: peak.valuationUsd, quarter: peak.quarter }
      : null,
    rank:
      reports.length === 0
        ? null
        : growthMultiple === null
          ? yourRank(state, reports.length - 1)
          : scaledRank(state, reports.length - 1, scale),
    /** A prologue start: the start wealth and the growth multiple on it (else null). */
    growth:
      growthMultiple === null
        ? null
        : { startUsd: startUsd!, multiple: growthMultiple },
    curve: reports.map((r) => ({
      quarter: r.quarter,
      valuationUsd: r.valuationUsd,
    })),
    quartersPlayed: reports.length,
    mergeChoice: state.mergeChoice
      ? (CONTENT.merge.choices.find((c) => c.id === state.mergeChoice) ?? null)
      : null,
    moments: {
      raised: logOf('log.raised').map((e) => ({
        round: String(e.params?.round),
        quarter: CONTENT.quarters[e.quarter],
        amountUsd: Number(e.params?.amountUsd),
      })),
      sites: logOf('log.site_ready').map((e) => ({
        tier: String(e.params?.tier),
        quarter: CONTENT.quarters[e.quarter],
      })),
      best: byEbitda[0]
        ? { quarter: byEbitda[0].quarter, ebitdaUsd: byEbitda[0].ebitdaUsd }
        : null,
      worst: byEbitda.at(-1)
        ? {
            quarter: byEbitda.at(-1)!.quarter,
            ebitdaUsd: byEbitda.at(-1)!.ebitdaUsd,
          }
        : null,
      forcedSales: reports.filter((r) => r.forcedSale).map((r) => r.quarter),
      marginCalls: reports.reduce((n, r) => n + r.marginCalls, 0),
      marginDefaults: logOf('log.margin_default').length,
      uri: uriEntry
        ? uriEntry.key === 'log.curtail_agreed'
          ? ('curtailed' as const)
          : ('mined' as const)
        : null,
      rivalsReached: reached,
      rivalsDropped: dropped,
    },
  }
}

/**
 * Why an Act II game ended (wireframe A2-10, the foreclosure variant; scope 0.2 §2.7, M6.4), or null
 * if it hasn't. 'foreclosure' when lenders foreclosed on projects in the last 4 quarters (the debt
 * default rules as built: 2 missed quarters on a project → the lender takes it); 'debt' when debt
 * service went unpaid in the final quarter; otherwise 'cash' (below zero after every forced sale).
 */
export function gameOverView(state: GameState) {
  if (state.phase !== 'gameover' || !inAct2Rules(state)) return null
  const recent = state.quarter - 3
  const foreclosed = state.log
    .filter((e) => e.key === 'log.project_foreclosed' && e.quarter >= recent)
    .map((e) => ({
      n: Number(e.params?.n),
      quarter: CONTENT.quarters[e.quarter],
      debtUsd: Number(e.params?.debtUsd),
    }))
  const missed = state.log.filter(
    (e) => e.key === 'log.debt_missed' && e.quarter === state.quarter,
  )
  return {
    cause:
      foreclosed.length > 0
        ? ('foreclosure' as const)
        : missed.length > 0
          ? ('debt' as const)
          : ('cash' as const),
    foreclosed,
    foreclosedDebtUsd: foreclosed.reduce((a, f) => a + f.debtUsd, 0),
    missed: missed.map((e) => Number(e.params?.n)),
    shortUsd: Math.max(0, -state.cash),
  }
}

/**
 * The Act II chapter report (wireframe A2-09; scope 0.2 §2.13), at the end of 2026Q4 or on a bust in
 * Act II: the title by end valuation, the score (founder net worth, peak valuation, league rank),
 * the career curve from 2017, the 2026Q4 valuation broken into its parts, and the act's key
 * moments. Game over adds its cause (M6.4).
 */
export function act2ChapterView(state: GameState) {
  const bust = state.phase === 'gameover'
  const reports = state.reports
  const last = reports.at(-1)
  const finalValuationUsd = last?.valuationUsd ?? 0
  const netWorthUsd = Math.max(0, state.founderStake * finalValuationUsd)
  const C = BALANCE.act2Chapter
  const title = bust
    ? 'bust'
    : C.titleBands.find((b) => finalValuationUsd >= b.min)!.id
  const peak = reports.reduce<QuarterReport | undefined>(
    (a, b) => (!a || b.valuationUsd > a.valuationUsd ? b : a),
    undefined,
  )
  const act2From = CONTENT.acts[1].firstQuarter
  const act2Log = state.log.filter((e) => e.quarter >= act2From)
  const count = (...keys: string[]) =>
    act2Log.filter((e) => keys.includes(e.key)).length
  const firstOf = (key: string) => {
    const e = act2Log.find((x) => x.key === key)
    return e ? CONTENT.quarters[e.quarter] : null
  }
  const at = (label: string) => reports.find((r) => r.quarter === label)
  const halving = CONTENT.quarters.indexOf(C.halvingQuarter)
  const before = at(CONTENT.quarters[halving - 1])
  const after = at(C.halvingQuarter)
  const signed = act2Log.filter((e) => e.key === 'log.tenant_signed')
  const biggest = signed.reduce<(typeof signed)[number] | undefined>(
    (a, b) =>
      !a || Number(b.params?.rentUsd) > Number(a.params?.rentUsd) ? b : a,
    undefined,
  )
  const split = last
    ? valuationSplit(last, state.firstAiDealQuarter, scenarioOf(state))
    : null
  return {
    bust,
    title,
    netWorthUsd,
    finalValuationUsd,
    founderStake: state.founderStake,
    peak: peak
      ? { valuationUsd: peak.valuationUsd, quarter: peak.quarter }
      : null,
    rank: last ? yourRank(state, reports.length - 1) : null,
    curve: reports.map((r) => ({
      quarter: r.quarter,
      valuationUsd: r.valuationUsd,
    })),
    breakdown:
      split && last
        ? {
            quarter: last.quarter,
            miningEvUsd: split.miningEvUsd,
            aiEvUsd: split.aiEvUsd,
            backlogUsd: split.weightedBacklogUsd,
            constructionUsd: split.constructionUsd,
            cashUsd: last.cash,
            treasuryUsd: split.treasuryUsd,
            debtUsd: last.debtUsd,
          }
        : null,
    moments: {
      headStart: state.act2Entry?.headStart ?? null,
      lifeline: state.act2Entry?.lifeline === 'taken',
      projectsLive: count('log.project_live'),
      firstLive: firstOf('log.project_live'),
      tenantsSigned: signed.length,
      biggestTenant: biggest
        ? {
            tenant: String(biggest.params?.tenant),
            rentUsd: Number(biggest.params?.rentUsd),
            quarter: CONTENT.quarters[biggest.quarter],
          }
        : null,
      delays: count(
        'log.project_slipped',
        'log.project_slipped_silent',
        'log.project_slipped_contractor',
        'log.project_slipped_event',
      ),
      foreclosures: count('log.project_foreclosed'),
      sold: count('log.project_sold'),
      halving:
        before && after && before.revenueUsd > 0
          ? { miningChangePct: after.revenueUsd / before.revenueUsd - 1 }
          : null,
      priceReset: C.priceResetQuarter,
    },
  }
}

/**
 * The event card on screen: its id, site, and per choice what it would do to cash and machine
 * count right now (a dry run of the answer; lasting effects are described by the card's hints).
 */
export function eventCardView(state: GameState) {
  const alert = state.interrupt
  if (alert?.id !== 'event' || !alert.event) return null
  const units = (s: GameState) => s.machines.reduce((n, l) => n + l.count, 0)
  const def = defaultChoice(state)
  return {
    id: alert.event,
    type: CONTENT.events.byId[alert.event]?.type ?? 'random',
    /** The card's text: its story, or its news version (events.json news_unless). */
    bodyKey: eventBodyKey(state),
    week: alert.week,
    siteTier: state.sites.find((x) => x.id === alert.siteId)?.tier ?? null,
    choices: availableChoices(state).map((id) => {
      const r = applyAction(state, { type: 'RESOLVE_INTERRUPT', choice: id })
      return {
        id,
        isDefault: id === def,
        cashDeltaUsd: r.ok ? r.state.cash - state.cash : 0,
        unitsDelta: r.ok ? units(r.state) - units(state) : 0,
      }
    }),
  }
}

/** An event card last quarter asked for this Plan phase to open on the Buy dialog. */
export function planOpensOnBuy(state: GameState): boolean {
  const p = state.events.plan
  return state.phase === 'plan' && p?.quarter === state.quarter && p.openBuy
}

/** The failure-wave alert: where, how many units broke, and the rush repair's price. */
export function failureWaveView(state: GameState) {
  const a = state.interrupt
  if (a?.id !== 'failure_wave') return null
  const site = state.sites.find((x) => x.id === a.siteId)
  return {
    tier: site?.tier ?? '',
    week: a.week,
    units: (a.wave ?? []).reduce((n, d) => n + d.units, 0),
    rushUsd: rushRepairUsd(state),
    rushMult: CONTENT.failureWave.rushCostMult,
  }
}

/**
 * GPU know-how for the Act II dashboard (M8.5): the level (0–3), how it rises and what each level
 * does, all read from the code and content so a tooltip can't disagree with the rules: the
 * thresholds (a live cluster, two, `knowHowThreeKw` of live full stack), a pilot's utilisation
 * bonus (conversions.json), the cards that open at a level (tenants.json), and know-how 0's
 * handicap (balance). null in Act I.
 */
export function knowHowView(state: GameState) {
  if (!inAct2Rules(state)) return null
  const b = BALANCE.projects
  const pilot = CONTENT.projects.pilot
  const levels = [0, 1, 2, 3].map((level) => ({
    level,
    utilisationBonus: pilot.utilisationBonusByKnowHow[String(level)] ?? 0,
    overflowCards: CONTENT.projects.tenantCards.filter(
      (c) => (c.needsKnowHow ?? 0) === level && level > 0,
    ).length,
    costMult: level === 0 ? b.knowHowZero.costMult : 1,
    extraWaitQuarters: level === 0 ? b.knowHowZero.extraWaitQuarters : 0,
  }))
  return {
    level: knowHow(state),
    max: 3,
    threeKw: b.knowHowThreeKw,
    utilisationBase: pilot.utilisationBase,
    levels,
  }
}

/**
 * The lifeline bridge's payments for the Plan and Capital screens (M8.7f): this quarter's and next
 * quarter's, interest-only or amortising, the quarters left, and whether your cash covers each.
 * null without a bridge.
 */
export function bridgePaymentView(state: GameState) {
  const s = bridgeSchedule(state)
  if (!s) return null
  return {
    ...s,
    /** How many quarters the bridge is interest only (for the tooltip), from the balance file. */
    interestOnlyQuarters: BALANCE.lifeline.bridgeInterestOnlyQuarters,
    cashUsd: state.cash,
    coversNow: state.cash >= s.now.totalUsd,
    coversNext: s.next === null || state.cash >= s.next.totalUsd,
    /** Next quarter's payment is bigger than this one's (interest-only turning to amortising). */
    stepsUp: s.next !== null && s.next.totalUsd > s.now.totalUsd,
  }
}

/**
 * The cash runway for the Dashboard, the Plan screen and the Capital screen (M9.0): quarters of cash at
 * last quarter's EBITDA less the debt payments already fixed for the coming quarter, with the items
 * for the tooltip. The rating's "short runway" rule reads the same number. null before the first
 * Act II report.
 */
export function runwayView(state: GameState) {
  const report = state.reports.at(-1)
  if (!inAct2Rules(state) || !report) return null
  const r = runway(state, report)
  const shortBelow = CONTENT.finance.rating.runwayQuarters
  return {
    ...r,
    shortBelow,
    short: r.quarters !== null && r.quarters < shortBelow,
  }
}

/** The GPU failure-wave alert (M8.4): which project, how many GPUs failed, and the price of each choice. */
export function gpuWaveView(state: GameState) {
  const a = state.interrupt
  if (a?.id !== 'gpu_failure_wave') return null
  const p = state.projects.find((x) => x.id === a.projectId)
  if (!p) return null
  const gpus = a.gpus ?? 0
  return {
    week: a.week,
    n: p.n,
    tier: state.sites.find((x) => x.id === p.siteId)?.tier ?? '',
    gpus,
    clusterGpus: p.gpuCount,
    replaceUsd: waveCostUsd(gpus),
    contracted: !!p.tenant?.gpu,
    slaMult: CONTENT.projects.gpuWave.slaCreditMult,
  }
}

/** The Act II project alert (construction delay or GPU allocation): which project, what paying costs. */
export function projectAlertView(state: GameState) {
  const a = state.interrupt
  if (a?.id !== 'construction_delay' && a?.id !== 'gpu_allocation') return null
  const p = state.projects.find((x) => x.id === a.projectId)
  if (!p) return null
  return {
    kind: a.id,
    week: a.week,
    n: p.n,
    kw: p.kw,
    tier: state.sites.find((x) => x.id === p.siteId)?.tier ?? '',
    costUsd: projectEventCostUsd(state),
    waitQuarters: gpuWaitQuarters(state, p),
  }
}

/**
 * The last report's valuation, piece by piece (review A5): run-rate EBITDA × the era multiple,
 * plus cash and treasury (pledged coins included), minus debt; in Act II also the AI units at
 * their own multiple, projects under construction and the weighted backlog (scope 0.2 §2.8).
 * null before the first report.
 */
export function valuationBreakdown(state: GameState) {
  const r = state.reports.at(-1)
  if (!r) return null
  const v = valuationSplit(r, state.firstAiDealQuarter, scenarioOf(state))
  return {
    quarter: r.quarter,
    ebitdaUsd: r.ebitdaUsd - v.aiEbitdaUsd,
    multiple: v.miningMultiple,
    enterpriseUsd: v.miningEvUsd,
    aiEbitdaUsd: v.aiEbitdaUsd,
    aiMultiple: v.aiMultiple,
    aiEnterpriseUsd: v.aiEvUsd,
    constructionUsd: v.constructionUsd,
    weightedBacklogUsd: v.weightedBacklogUsd,
    cashUsd: r.cash,
    treasuryUsd: v.treasuryUsd,
    debtUsd: r.debtUsd,
    valuationUsd: r.valuationUsd,
  }
}

/** Act II's league scale for you: MW in AI (live and building projects) and in mining (M6.2). */
export function leagueScaleView(state: GameState) {
  const u = mwByUseOf(state, state.quarter)
  return { aiKw: u.aiShell + u.aiCloud, miningKw: u.mining + u.hosting }
}

/** Log lines that are project milestones: started, a slot filled (power, tenant, capital), delayed, live, sold, foreclosed. */
const PROJECT_MILESTONE_KEYS: MessageKey[] = [
  // The Power and Capital slots (M8.7d); equity is raised by the company, so its line has no project name.
  'log.project_power_existing',
  'log.project_power_grid',
  'log.project_power_gas',
  'log.project_capital_cash',
  'log.project_capital_project_debt',
  'log.project_capital_ddtl',
  'log.project_capital_jv',
  'log.project_capital_backstop',
  'log.equity_raised',
  'log.project_started',
  'log.project_live',
  // (A tenant signing fills the Tenant slot, but it is listed once, under "tenants signed or lost".)
  'log.project_late',
  'log.project_slipped',
  'log.project_slipped_event',
  'log.project_slipped_silent',
  'log.project_slipped_contractor',
  'log.project_gpu_wait',
  'log.project_gpu_wait_silent',
  'log.project_sold',
  'log.project_foreclosed',
]

/** Log lines about tenants: signed, walked away, in distress, let go, a GPU contract ended. */
const TENANT_EVENT_KEYS: MessageKey[] = [
  'log.tenant_signed',
  'log.gpu_contract_signed',
  'log.tenant_walked',
  'log.tenant_distress',
  'log.tenant_terminated',
  'log.gpu_contract_ended',
]

/**
 * What the Act II quarter report adds (scope 0.2 §2.14 item 9, M8.3): MW by use before and after
 * (the previous report's, kept in the report history), the backlog change, the credit rating change
 * with its reason, the project milestones and the tenants signed or lost, from this quarter's log.
 * null in Act I, or for a report saved before these existed.
 */
export function act2ReportView(state: GameState) {
  const r = state.reports.at(-1)
  if (!inAct2Rules(state) || !r?.mwByUseKw) return null
  const prev = state.reports.at(-2)
  const inQuarter = (keys: MessageKey[]) =>
    state.log.filter((e) => e.quarter === state.quarter && keys.includes(e.key))
  return {
    use: r.mwByUseKw,
    prevUse: prev?.mwByUseKw ?? null,
    backlogUsd: r.backlogUsd,
    weightedBacklogUsd: r.weightedBacklogUsd,
    prevBacklogUsd: prev?.backlogUsd ?? null,
    rating: r.creditRating ?? null,
    prevRating: prev?.creditRating ?? null,
    /** The inputs behind the rating: debt / EBITDA, backlog quality, a short runway, card notches. */
    ratingWhy: r.ratingWhy ?? null,
    milestones: inQuarter(PROJECT_MILESTONE_KEYS),
    tenants: inQuarter(TENANT_EVENT_KEYS),
  }
}

/** The Act II rivals' key moves in a quarter, for the quarter report (M6.2). */
export function rivalMovesView(quarter: number) {
  return rivalMoves(quarter)
}

/** Rivals not in the game yet, and when each one arrives. */
export function upcomingRivalsView(state: GameState) {
  return upcomingRivals(state.quarter)
}

/** Sites whose flaw can be fixed (the transformer upgrade): its price, and when it's done if under way. */
export function transformerViews(state: GameState) {
  return state.sites.flatMap((site) => {
    const u = transformerUpgrade(site)
    return u ? [{ site, ...u, readyQuarter: site.upgradeReadyQuarter }] : []
  })
}

/** Construction loans owed, and what a financed Texas phase would cost you. */
export function constructionLoanView(state: GameState) {
  const terms = CONTENT.constructionLoan
  const phaseCost = (tier: string, capexUsd: number) => {
    const rules = getTier(tier)?.phases
    return rules ? Math.round(capexUsd * rules.cost_share) : capexUsd
  }
  return {
    owedUsd: constructionDebtUsd(state),
    loans: state.constructionLoans.length,
    tier: terms.tier,
    /**
     * An offer's first build: phase 1 for a phased tier (Texas), with and without the loan
     * (financed is null if the tier can't take the loan).
     */
    firstBuild: (offer: { tier: string; capexUsd: number }) => {
      const costUsd = phaseCost(offer.tier, offer.capexUsd)
      const phases = getTier(offer.tier)?.phases
      const loanUsd = constructionLoanUsd(costUsd)
      return {
        costUsd,
        phase: phases ? { n: 1, of: phases.count, kw: phases.kw } : null,
        financed:
          offer.tier === terms.tier
            ? { loanUsd, cashUsd: costUsd - loanUsd }
            : null,
      }
    },
  }
}

/** Phased sites (Texas): phases built and powered, and the next phase's cost and loan. */
export function phaseViews(state: GameState) {
  return state.sites.flatMap((site) => {
    const next = nextPhase(state, site)
    if (!next || !site.phases) return []
    const loanUsd = constructionLoanUsd(next.costUsd)
    return [
      {
        site,
        started: site.phases.length,
        powered: site.phases.filter((q) => q <= state.quarter).length,
        of: next.of,
        /** When the latest phase powers on (a quarter label). */
        nextReady: quarterName(Math.max(...site.phases)),
        next: next.n <= next.of ? { ...next, loanUsd } : null,
      },
    ]
  })
}

/** kW of this machine you may still buy this quarter (the GPU shortage cap), or Infinity. */
export function buyCapKw(state: GameState, modelId: string): number {
  return getModel(modelId)?.coin === 'ETH' ? gpuKwLeft(state) : Infinity
}

// ---------- Act II (wireframe A2-03) ----------

/**
 * The Act II dashboard's market (A2-03): the H100 spot price this week and its change since the
 * week before (null before a GPU rental market exists, 2023Q3), the quarter's H100 1-year contract
 * and neocloud prices, and the AI demand index now and last quarter. undefined in Act I.
 */
/**
 * The market inputs for a quarter as this game sees them: Act II's, or (Act III) its scenario's. A
 * quarter past the game's own act reads as undefined, as it always did in Act II (never throws).
 */
function inputsAt(state: GameState, quarter: number) {
  const scenario = scenarioOf(state)
  return scenario ? quarterInputs(quarter, scenario) : act2Quarter(quarter)
}

export function act2MarketView(state: GameState) {
  const q = inputsAt(state, state.quarter)
  if (!q) return undefined
  const w = currentMarket(state)
  const prev = previousMarketWeek(
    state.quarter,
    state.phase === 'plan' ? 0 : Math.max(state.week - 1, 0),
    scenarioOf(state),
  )
  const spot = w.gpu_h100_spot_usd_hr
  const prevSpot = prev?.gpu_h100_spot_usd_hr ?? null
  return {
    h100SpotUsdHr: spot,
    h100SpotChange:
      spot !== null && prevSpot !== null && prevSpot > 0
        ? spot / prevSpot - 1
        : null,
    h100Contract1yUsdHr: q.gpuRentalUsdHr.h100.contract1y,
    h100NeocloudUsdHr: q.gpuRentalUsdHr.h100.neocloud,
    aiDemandIndex: q.aiDemandIndex,
    aiDemandPrev: inputsAt(state, state.quarter - 1)?.aiDemandIndex ?? null,
  }
}

/**
 * Credit rating and contracted backlog (scope 0.2 §2.2). The backlog is the remaining contracted
 * revenue, unweighted (§2.8). The rating is set at each Act II quarter end (null = "not rated" yet).
 */
export function ratingBacklogView(state: GameState) {
  return { rating: state.creditRating ?? null, backlogUsd: backlogUsd(state) }
}

/**
 * The hosting dialog (scope 0.2 §2.4): per site, the free energized kW you could convert, the rate
 * clients would pay (the year they move in), the site's power price, and a quarter's margin per
 * MW at those prices; then your contracts, with what ending each would cost now.
 */
/**
 * The contract calendar (M12.1): every signed tenant contract with its end quarter (the last quarter
 * served), soonest first, labelled for display. Only this quarter's market is read (the new-lease
 * reference rent and the 1-year GPU rate); no renewal offer shows before it is made.
 */
export function contractCalendar(state: GameState) {
  return buildCalendar(state).map((e) => ({
    ...e,
    endQuarterLabel:
      e.endQuarter === null ? null : (CONTENT.quarters[e.endQuarter] ?? null),
  }))
}

/**
 * Renewals due (M12.2): the renewals open this quarter, each with the tenant's answer (it walks, or its
 * offer as a multiple of the current rate and the new term), the choice that will apply (undecided =
 * accept), and what each answer costs in Bandwidth. Only opened renewals are listed: no offer shows
 * before its renewal opens.
 */
export function renewalsDue(state: GameState) {
  return (state.act3Renewals ?? []).flatMap((r) => {
    const p = state.projects.find((x) => x.id === r.projectId)
    if (!p?.tenant) return []
    const t = p.tenant
    const card = tenantCard(t.card)!
    const rent = annualRentUsd(card, p.kw) * (t.priceMult ?? 1)
    const rate = t.gpu ? t.gpu.priceUsdHr : rent
    const mult = r.counterMult ?? r.offer?.mult ?? null
    return [
      {
        projectId: p.id,
        projectN: p.n,
        card: t.card,
        tenantType: card.type,
        kind: r.kind,
        walked: r.walked,
        /** The rent a year (shell) or $/GPU-hr (GPU) now. */
        currentRate: rate,
        offer: r.offer
          ? {
              mult: r.offer.mult,
              rate: rate * r.offer.mult,
              termYears: r.offer.termQuarters / 4,
            }
          : null,
        /** A counter won in negotiation, as a multiple of the current rate. */
        counterMult: r.counterMult ?? null,
        /** What applies at quarter end if nothing else is chosen. */
        choice: r.walked ? ('walk' as const) : (r.choice ?? 'accept'),
        signsAt: r.walked || r.choice === 'relet' ? null : mult,
        cost: {
          accept: 0,
          counter: DEAL_NEGOTIATION.bandwidth,
          relet: r.kind === 'shell' ? BALANCE.act3.renewals.reletBandwidth : 0,
        },
        blocked: {
          accept: renewalBlocker(state, p.id, 'accept') ?? null,
          relet: renewalBlocker(state, p.id, 'relet') ?? null,
          counter:
            dealNegotiationBlocker(state, p.id, { renewal: true }) ?? null,
        },
      },
    ]
  })
}

export function hostingView(state: GameState) {
  const nextQ = Math.min(state.quarter + 1, CONTENT.quarters.length - 1)
  const hoursQ = 24 * 7 * BALANCE.weeksPerQuarter
  const sites = state.sites
    .filter((site) => site.tier !== BALANCE.startSite)
    .map((site) => {
      const rateUsdKwh = hostingRateUsdKwh(
        nextQ,
        regionOf(site),
        scenarioOf(state),
      )
      const powerUsdKwh = powerPriceUsdKwh(site, nextQ, scenarioOf(state))
      const freeKw = convertibleKw(state, site.id)
      return {
        site,
        freeKw,
        /** Of the free kW, those a defaulted client left: re-let for free, live at once. */
        reletKw: reletKw(state, site.id),
        rateUsdKwh,
        powerUsdKwh,
        costPerMwUsd: hostingCostUsd(1000),
        /** Fees minus power for 1 MW over a quarter, at next quarter's prices. */
        marginPerMwQUsd: 1000 * hoursQ * (rateUsdKwh - powerUsdKwh),
        blocker: hostingBlocker(state, site.id, Math.max(1, freeKw)),
      }
    })
  const contracts = state.hosting.map((h) => ({
    contract: h,
    tier: state.sites.find((x) => x.id === h.siteId)?.tier ?? '',
    live: h.readyQuarter <= state.quarter,
    readyQuarter: quarterName(h.readyQuarter),
    termEnd: quarterName(h.termEndQuarter),
    quarterFeesUsd: quarterFeesUsd(h),
    endFeeUsd: endHostingFeeUsd(state, h),
  }))
  return {
    sites,
    contracts,
    bandwidth: BALANCE.hosting.bandwidth,
    termQuarters: BALANCE.hosting.termQuarters,
  }
}
