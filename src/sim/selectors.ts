// Read-only views of the game state for the UI. These functions change nothing;
// they answer display questions ("what does a GPU rig earn per day at this site?")
// using the same rules the sim uses, so no game rules have to live in src/ui/.
import { BALANCE, CONTENT, type MarketWeek } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import type {
  Coin,
  GameState,
  MachineLot,
  Site,
  PowerContract,
} from './state.ts'
import { repairCostPerUnit, saleValueUsd } from './systems/machines.ts'
import {
  buyPrice,
  coinPrice,
  getModel,
  leadTimeQuarters,
  marketWeek,
  previousMarketWeek,
  revenuePerUnitDay,
} from './systems/market.ts'
import {
  collateralUsd,
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
  powerPriceUsdKwh,
  tierIndex,
  topTierIndex,
  usedKw,
} from './systems/sites.ts'
import { treasuryValueUsd } from './systems/treasury.ts'
import { bandwidthForQuarter } from './systems/bandwidth.ts'
import { getStep, raiseBandwidth } from './systems/capital.ts'
export { upcomingRivals } from './systems/rivals.ts'
import { auctionWindow, lotValueUsd } from './systems/auctions.ts'

/** Would this action be allowed right now? Returns the reason if not. */
export function whyNot(state: GameState, action: Action): Message | null {
  const r = applyAction(state, action)
  return r.ok ? null : r.error
}

export function quarterName(quarter: number): string {
  return CONTENT.quarters[quarter] ?? ''
}

/** The market week the player is looking at: week 1 in the Plan phase, the last played week in the live quarter. */
export function currentMarket(state: GameState): MarketWeek {
  const w = Math.min(Math.max(state.week - 1, 0), BALANCE.weeksPerQuarter - 1)
  return marketWeek(state.quarter, state.phase === 'plan' ? 0 : w)
}

/** Price change of each coin vs the week before the one on screen. */
export function priceChanges(state: GameState): {
  btc: number
  eth: number
  since: string | null
} {
  const w = currentMarket(state)
  const weekIdx = state.phase === 'plan' ? 0 : Math.max(state.week - 1, 0)
  const prev = previousMarketWeek(state.quarter, weekIdx)
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
    model.power_kw * 24 * powerPriceUsdKwh(site, state.quarter)
  )
}

/** The cheapest-power energized site: where the dashboard quotes machine profits. */
export function bestSite(state: GameState): Site {
  const ready = state.sites.filter((s) => isReady(s, state.quarter))
  return ready.reduce((a, b) =>
    powerPriceUsdKwh(b, state.quarter) < powerPriceUsdKwh(a, state.quarter)
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
    const newPriceUsd = buyPrice(m, state.quarter, 'new')
    const usedPriceUsd = buyPrice(m, state.quarter, 'used')
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
}

export function siteViews(state: GameState): SiteView[] {
  return state.sites.map((site) => ({
    site,
    rung: tierIndex(site.tier) + 1,
    capacityKw: capacityKw(site),
    usedKw: usedKw(state, site.id),
    powerUsdKwh: powerPriceUsdKwh(site, state.quarter),
    ready: isReady(site, state.quarter),
    readyQuarter: quarterName(site.readyQuarter) || 'after Act I',
    leaving: tierIndex(site.tier) > 0 ? leavingTerms(state, site) : undefined,
    heat: siteHeatValue(state, site.id),
    rateHike: site.surcharge ?? null,
    moratorium: underMoratorium(state, site.id),
    shutDown: isShutDown(state, site.id),
    contract: site.contract ?? null,
    renewalDue: renewalDue(state, site),
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
      sellValueUsd: saleValueUsd(lot, lot.count, state.quarter),
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
      buildQuarters: tier.build_quarters,
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

export type RoundStatus = 'open' | 'done' | 'closed' | 'not_yet' | 'locked' | 'lost'

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
    bandwidth: raiseBandwidth(step),
    pitchBandwidth: CONTENT.pitch.bandwidth,
    lockoutQuarters: CONTENT.pitch.lockoutQuarters,
    walkawayPenalty: CONTENT.pitch.walkawayPenalty,
    /** Walking away from a pitch now would end the round for good. */
    lastChance: canPitch(id) && walkawayEndsRound(state, id),
    from,
    to,
    status,
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
    if (e.key.startsWith('log.pitch_') && e.key !== 'log.pitch_started' && e.params?.round === id)
      return e
  }
  return null
}

/** The equipment loan as the Plan screen shows it: this quarter's terms, how much you could borrow, the loan you have. */
export function equipmentLoanView(state: GameState) {
  const terms = equipmentTerms(state.quarter)
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
          powerPriceUsdKwh(x, state.quarter) -
          powerPriceUsdKwh(y, state.quarter),
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
        normalUsdKwh: normalPriceUsdKwh(site, state.quarter, type),
        openingUsdKwh: openingOfferUsdKwh(site, state.quarter, type),
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
    normalUsdKwh: normalPriceUsdKwh(site, state.quarter, n.contractType),
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

/** Uri: the storm price per kWh index contracts pay on their firm load (shocks.json). */
export const URI_STORM_PRICE =
  CONTENT.shocks.find((sh) => sh.id === 'uri')?.stormPriceUsdKwh ?? 0
