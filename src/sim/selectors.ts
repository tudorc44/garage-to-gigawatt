// Read-only views of the game state for the UI. These functions change nothing;
// they answer display questions ("what does a GPU rig earn per day at this site?")
// using the same rules the sim uses, so no game rules have to live in src/ui/.
import {
  BALANCE,
  CONTENT,
  actLastQuarter,
  type MarketWeek,
} from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import type {
  QuarterReport,
  Coin,
  GameState,
  MachineLot,
  Site,
  PowerContract,
} from './state.ts'
import { repairCostPerUnit, saleValueUsd } from './systems/machines.ts'
import { eraMultiple } from './systems/valuation.ts'
import {
  coinPrice,
  getModel,
  leadTimeQuarters,
  marketWeek,
  previousMarketWeek,
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
import { buyPriceNow } from './systems/eventEffects.ts'
import { eventBodyKey } from './systems/events.ts'
import {
  constructionLoanUsd,
  gpuKwLeft,
  nextPhase,
  constructionDebtUsd,
  transformerUpgrade,
} from './systems/construction.ts'
import {
  activeRivals,
  rivalSnapshot,
  upcomingRivals,
  yourRank,
} from './systems/rivals.ts'
import {
  buildQuartersFor,
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
  tierIndex,
  topTierIndex,
  usedKw,
} from './systems/sites.ts'
import { treasuryValueUsd } from './systems/treasury.ts'
import { bandwidthForQuarter } from './systems/bandwidth.ts'
import { getStep, raiseBandwidth, unmetRequirement } from './systems/capital.ts'
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

/** The five hires as the People dialog shows them: on staff or not, pay, and what's blocking. */
export function hireViews(state: GameState) {
  return CONTENT.hires.list.map((h) => ({
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
  const title = bust
    ? CONTENT.merge.bustTitle
    : (CONTENT.merge.titleBands.find((b) => netWorthUsd >= b.min)?.title ??
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
    rank: reports.length > 0 ? yourRank(state, reports.length - 1) : null,
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
 * The last report's valuation, piece by piece (review A5): run-rate EBITDA × the era multiple,
 * plus cash and treasury (pledged coins included), minus debt. null before the first report.
 */
export function valuationBreakdown(state: GameState) {
  const r = state.reports.at(-1)
  if (!r) return null
  const multiple = eraMultiple(CONTENT.quarters.indexOf(r.quarter))
  const enterpriseUsd = Math.max(0, r.ebitdaUsd * 4) * multiple
  return {
    quarter: r.quarter,
    ebitdaUsd: r.ebitdaUsd,
    multiple,
    enterpriseUsd,
    cashUsd: r.cash,
    treasuryUsd: r.valuationUsd - enterpriseUsd - r.cash + r.debtUsd,
    debtUsd: r.debtUsd,
    valuationUsd: r.valuationUsd,
  }
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
