// Read-only views of the game state for the UI. These functions change nothing;
// they answer display questions ("what does a GPU rig earn per day at this site?")
// using the same rules the sim uses, so no game rules have to live in src/ui/.
import { BALANCE, CONTENT, type MarketWeek } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import type { Coin, GameState, MachineLot, Site } from './state.ts'
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
import { isEarning } from './systems/mining.ts'
import {
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
  const def = CONTENT.interrupts.byId[active.id]
  return (def.choices ?? []).map((c) => ({
    id: c.id,
    isDefault: c.id === def.default,
  }))
}

export type RoundStatus = 'open' | 'done' | 'closed' | 'not_yet'

/** A funding round's offer and whether it can be taken this quarter (window and once-only). */
export function fundingRound(state: GameState, id: string) {
  const step = getStep(id)!
  const q = CONTENT.quarters[state.quarter]
  const [from, to] = step.window
  const status: RoundStatus = state.raisesDone.includes(id)
    ? 'done'
    : q > to
      ? 'closed'
      : q < from
        ? 'not_yet'
        : 'open'
  return {
    id,
    amountUsd: step.amount_usd,
    dilution: step.dilution,
    bandwidth: raiseBandwidth(step),
    from,
    to,
    status,
  }
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
