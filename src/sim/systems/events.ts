// Event cards (events.json, scope §2.10; design thread 26 Sep 2026). Reigns-style cards that
// pause the live quarter:
// - Scripted cards come in their historical week when their `requires` holds. They don't count
//   toward the 3-interrupt cap.
// - Random cards: one roll per quarter from random_start (random_chance), a random week, picked
//   by weight among the cards whose trigger holds, each at most once per game, counted toward the
//   cap (a full cap means no random card that quarter). Two cards skip the roll and take the
//   quarter's random slot when their condition is first met: the Heat 70 moratorium and the
//   rate_class flaw's rate hike (which, if the cap is full, comes in week 1 of next quarter).
// Rolls use their own streams ("events:<quarter>", "event_roll:…"), so other systems are unchanged.
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  type EventCard,
  type EventChoice,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, random, substream, uniform } from '../rng.ts'
import {
  logEntry,
  projectGone,
  roundCents,
  type GameState,
  type Site,
} from '../state.ts'
import { getStep, unmetRequirement } from './capital.ts'
import { absWeek, aiDemandDelta } from './eventEffects.ts'
import type { ScheduledEvent } from './eventEffects.ts'
import { addGrievance, siteHeatValue } from './heat.ts'
import { addMachines, removeMachines, saleValueUsd } from './machines.ts'
import { buyPrice, coinPrice, getModel, marketWeek } from './market.ts'
import { backstopBlocker, jvBlocker, setJv, takeBackstop } from './partners.ts'
import {
  neocloudUsdHr,
  projectedReturn,
  slipProject,
  tenantCard,
  tenantWalks,
} from './projects.ts'
import { capacityKw, isReady, regionOf, tierIndex, usedKw } from './sites.ts'
import { moratoriumRegion } from './anger.ts'
import { sellTreasury } from './treasury.ts'

const W = BALANCE.weeksPerQuarter

export function getCard(id: string): EventCard | undefined {
  return CONTENT.events.byId[id]
}

// ---------- conditions and sites ----------

function label(state: GameState): string {
  return CONTENT.quarters[state.quarter]
}

function units(state: GameState, siteId?: string): number {
  return state.machines
    .filter((l) => !siteId || l.siteId === siteId)
    .reduce((n, l) => n + l.count, 0)
}

/** Energized capacity not used by any machine, in kW. */
export function spareKw(state: GameState): number {
  return state.sites
    .filter((s) => isReady(s, state.quarter))
    .reduce((kw, s) => kw + Math.max(0, capacityKw(s) - usedKw(state, s.id)), 0)
}

const isNewAsic = (l: { condition?: unknown; model?: unknown }) =>
  l.condition === 'new' && getModel(String(l.model))?.coin === 'BTC'

/** New BTC machines that don't earn yet (bought this quarter, or still in delivery). */
function undeliveredAsics(state: GameState) {
  return state.machines.filter(
    (l) => isNewAsic(l) && l.earnsFromQuarter > state.quarter,
  )
}

/** What this quarter's Plan phase spent on new BTC machines. */
function newAsicSpendUsd(state: GameState): number {
  return state.log
    .filter(
      (e) =>
        e.quarter === state.quarter &&
        e.key === 'log.bought' &&
        isNewAsic(e.params ?? {}),
    )
    .reduce((sum, e) => sum + Number(e.params?.costUsd ?? 0), 0)
}

const landlordSite = (s: GameState) =>
  s.sites.find(
    (x) =>
      x.flaw === 'landlord_sale' &&
      ['small_unit', 'warehouse'].includes(x.tier) &&
      s.quarter >= x.readyQuarter + 2,
  )
const rateClassSite = (s: GameState) =>
  s.sites.find(
    (x) =>
      x.flaw === 'rate_class' &&
      s.quarter >= x.readyQuarter + 4 &&
      x.rateMult === undefined &&
      !s.events.fired.includes(`utility_rate_hike:${x.id}`),
  )
const moratoriumSite = (s: GameState) =>
  [...s.sites]
    .sort((a, b) => siteHeatValue(s, b.id) - siteHeatValue(s, a.id))
    .find((x) => siteHeatValue(s, x.id) >= CONTENT.heat.moratoriumAt)
const theftSite = (s: GameState) => {
  const card = getCard('rig_theft')
  const minUnits = (card?.type === 'random' && card.min_units) || 4
  return s.events.flags.includes('security')
    ? undefined
    : s.sites
        .filter((x) => ['garage', 'small_unit'].includes(x.tier))
        .sort((a, b) => units(s, b.id) - units(s, a.id))
        .find((x) => units(s, x.id) >= minUnits)
}
const ipoEligible = (s: GameState) => {
  const step = getStep('ipo_spac')
  if (!step || s.raisesDone.includes('ipo_spac')) return false
  const [from, to] = step.window
  return label(s) >= from && label(s) <= to && !unmetRequirement(s, step)
}
const mostMachines = (s: GameState) =>
  [...s.sites].sort((a, b) => units(s, b.id) - units(s, a.id))[0]
/** Sites of 1 MW and more (warehouse tier and up) that are powered. */
const bigSites = (s: GameState) =>
  s.sites.filter(
    (x) => tierIndex(x.tier) >= tierIndex('warehouse') && isReady(x, s.quarter),
  )

const CONDITIONS: Record<string, (s: GameState, card?: EventCard) => boolean> =
  {
    owns_s9: (s) => s.machines.some((l) => l.model === 's9'),
    ipo_eligible: ipoEligible,
    not_ipo_eligible: (s) => !ipoEligible(s),
    spare_mw: (s) => spareKw(s) >= 1000,
    has_crypto_loan: (s) => s.cryptoLoan !== null,
    machines_30: (s) => units(s) >= 30,
    landlord_site: (s) => landlordSite(s) !== undefined,
    bought_new_asics: (s) => newAsicSpendUsd(s) > 0,
    heat_70: (s) => moratoriumSite(s) !== undefined,
    theft_site: (s) => theftSite(s) !== undefined,
    bought_used: (s) =>
      s.log.some(
        (e) =>
          e.quarter === s.quarter &&
          e.key === 'log.bought' &&
          e.params?.condition === 'used',
      ),
    rate_class_due: (s) => rateClassSite(s) !== undefined,
    q3_big_site: (s) =>
      label(s).endsWith('Q3') && bigSites(s).some((x) => units(s, x.id) > 0),
    ff_winter: (s) =>
      s.raisesDone.includes('friends_family') &&
      CONTENT.events.winterQuarters.includes(label(s)),
    tax_quarter: (s, card) =>
      card?.type === 'random' && (card.quarters ?? []).includes(label(s)),
    // Act II (events_act2.json, M5.8)
    first_ai_deal: (s) => s.firstAiDealQuarter !== null,
    site_pjm: (s) => sitesIn(s, ['pjm']).length > 0,
    site_pjm_ohio_georgia: (s) =>
      sitesIn(s, ['pjm', 'ohio', 'georgia']).length > 0,
    site_pjm_ohio: (s) => sitesIn(s, ['pjm', 'ohio']).length > 0,
    anger_high: (s) => moratoriumRegion(s) !== undefined,
    backstop_eligible: (s) => backstopProject(s) !== undefined,
    jv_eligible: (s) => jvProject(s) !== undefined,
    big_cluster: (s) =>
      liveClusters(s).some(
        (p) => p.gpuCount >= BALANCE.act2Events.bigClusterGpus,
      ),
    ai_lab_tenant: (s) => aiLabProjects(s).length > 0,
    building_project: (s) => s.projects.some((p) => p.stage === 'building'),
    has_treasury: (s) => s.treasury.BTC + s.treasury.ETH > 0,
    spot_cluster: (s) => liveClusters(s).some((p) => !p.tenant?.gpu),
    gpu_cluster: (s) => liveClusters(s).length > 0,
    mining: (s) => s.machines.some((l) => getModel(l.model)?.coin === 'BTC'),
    always: () => true,
  }

// ---------- Act II helpers (M5.8) ----------

/** Sites with power in these regions. */
function sitesIn(s: GameState, regions: string[]): Site[] {
  return s.sites.filter((x) => regions.includes(regionOf(x) ?? ''))
}
const liveClusters = (s: GameState) =>
  s.projects.filter((p) => p.stage === 'live' && p.kind !== 'shell')
const aiLabProjects = (s: GameState) =>
  s.projects.filter(
    (p) =>
      !projectGone(p) &&
      p.tenant &&
      tenantCard(p.tenant.card)?.type === 'ai_lab',
  )
/** The first project a backstop could go on now (Bandwidth aside: a card's offer costs none). */
const backstopProject = (s: GameState) =>
  s.projects.find((p) => !backstopBlocker({ ...s, bandwidth: 99 }, p.id))
/** The first proposed project a JV partner could come into now (Bandwidth aside). */
const jvProject = (s: GameState) =>
  s.projects.find(
    (p) =>
      !p.jv &&
      !jvBlocker({ ...s, bandwidth: 99 }, p.id, BALANCE.act2Events.jvShare),
  )

const SITES: Record<string, (s: GameState) => Site | undefined> = {
  most_machines: mostMachines,
  landlord_site: landlordSite,
  moratorium_site: moratoriumSite,
  theft_site: theftSite,
  rate_class_site: rateClassSite,
  pjm_site: (s) => sitesIn(s, ['pjm'])[0],
  anger_site: (s) => {
    const region = moratoriumRegion(s)
    return region ? sitesIn(s, [region])[0] : undefined
  },
}

function holds(state: GameState, cond: string | undefined, card?: EventCard) {
  return !cond || CONDITIONS[cond](state, card)
}

/** A random card's own quarter window (events.json `window`), if it has one. */
function inWindow(state: GameState, card: EventCard): boolean {
  if (card.type !== 'random' || !card.window) return true
  const [from, to] = card.window
  return label(state) >= from && label(state) <= to
}

/**
 * A random card's weight now: garage_weight_mult applies when its site is the garage; Act II's
 * weight_by_ai_demand scales it by the AI demand index ÷ 50 (the tenant RFP, busiest 2024–25).
 */
function cardWeight(state: GameState, card: EventCard): number {
  if (card.type !== 'random') return 0
  if (card.weight_by_ai_demand) {
    const index =
      (act2Quarter(state.quarter)?.aiDemandIndex ?? 0) +
      aiDemandDelta(state.quarter)
    return (card.weight * Math.max(0, index)) / 50
  }
  const mult = card.garage_weight_mult
  if (mult === undefined || !card.site) return card.weight
  return SITES[card.site](state)?.tier === 'garage'
    ? card.weight * mult
    : card.weight
}

/** Which text the card on screen shows: its body, or its news text (news_unless fails). */
export function eventBodyKey(state: GameState): 'body' | 'body_news' {
  const card = getCard(state.interrupt?.event ?? '')
  return card?.news_unless && !holds(state, card.news_unless, card)
    ? 'body_news'
    : 'body'
}

// ---------- scheduling (at END_PLAN) ----------

function schedule(
  state: GameState,
  card: EventCard,
  week: number,
  random: boolean,
) {
  const site = card.site ? SITES[card.site](state) : undefined
  if (card.site && !site) return
  state.events.queue.push({ id: card.id, week, random, siteId: site?.id })
}

/** Plans this quarter's cards when the Plan phase ends (each act plays its own deck). */
export function scheduleEvents(state: GameState): void {
  const ev = state.events
  ev.queue = []
  const deck = CONTENT.events.cards.filter((c) => c.act === state.act)
  // Scripted: their own week, when `requires` holds.
  for (const card of deck) {
    if (card.type !== 'scripted' || card.quarterIndex !== state.quarter)
      continue
    if (!holds(state, card.requires, card)) continue
    schedule(state, card, card.weekIndex! + 1, false)
  }
  const rules = state.act === 2 ? CONTENT.events.act2 : CONTENT.events
  if (state.quarter < rules.randomStart) return
  const r = substream(state.seed, `events:${state.quarter}`)
  const [w0, w1] = rules.randomWeeks
  // A card deferred from last quarter (cap was full) takes the slot, in week 1.
  if (ev.deferred) {
    ev.queue.push({ ...ev.deferred, week: 1 })
    ev.deferred = null
    ev.eligibleQuarters++
    return
  }
  // Cards that skip the roll when their condition is first met.
  for (const card of deck) {
    if (card.type !== 'random' || !card.bypass_random_roll) continue
    if (
      ev.fired.includes(card.id) ||
      !inWindow(state, card) ||
      !holds(state, card.trigger, card)
    )
      continue
    schedule(state, card, randomInt(r, w0, w1), true)
    if (ev.queue.some((q) => q.random)) {
      ev.eligibleQuarters++
      return
    }
  }
  const eligible = deck.filter(
    (c) =>
      c.type === 'random' &&
      !c.bypass_random_roll &&
      !ev.fired.includes(c.id) &&
      inWindow(state, c) &&
      holds(state, c.trigger, c) &&
      holds(state, c.requires, c),
  )
  const total = eligible.reduce((w, c) => w + cardWeight(state, c), 0)
  if (total <= 0) return
  ev.eligibleQuarters++
  if (uniform(r, 0, 1) >= rules.randomChance) return
  let roll = uniform(r, 0, total)
  const card =
    eligible.find((c) => (roll -= cardWeight(state, c)) < 0) ?? eligible.at(-1)!
  schedule(state, card, randomInt(r, w0, w1), true)
}

/** Key under which a played card is remembered (the rate hike: once per site). */
function firedKey(e: ScheduledEvent): string {
  return e.id === 'utility_rate_hike' ? `${e.id}:${e.siteId}` : e.id
}

/**
 * After a week is played: the first due card pauses the quarter. Another alert showing →
 * next week. A random card with the 3 interrupts used up is dropped for this quarter (the rate
 * hike waits for next quarter instead).
 */
export function checkEvents(state: GameState): void {
  const ev = state.events
  const weekNo = state.week + 1
  while (!state.interrupt) {
    const i = ev.queue.findIndex((e) => e.week <= weekNo)
    if (i < 0) return
    const e = ev.queue.splice(i, 1)[0]
    if (e.siteId && !state.sites.some((s) => s.id === e.siteId)) continue
    if (e.random) {
      if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) {
        const card = getCard(e.id)
        if (card?.type === 'random' && card.defer_if_cap_full) ev.deferred = e
        continue
      }
      state.interruptsThisQuarter++
      ev.fired.push(firedKey(e))
    }
    state.interrupt = {
      id: 'event',
      event: e.id,
      week: state.week,
      coin: 'BTC',
      changePct: 0,
      siteId: e.siteId,
    }
  }
}

// ---------- choices ----------

/** Can this choice be picked now (its `requires`, and room for any machine it adds)? */
function choiceOpen(state: GameState, c: EventChoice): boolean {
  if (!holds(state, c.requires)) return false
  const buy = c.effects.buy_machine as BuyMachine | undefined
  if (buy && !siteWithRoom(state, buy.model, buy.count)) return false
  return true
}

export function eventChoices(state: GameState): string[] {
  const card = getCard(state.interrupt?.event ?? '')
  return card
    ? card.choices.filter((c) => choiceOpen(state, c)).map((c) => c.id)
    : []
}

export function defaultEventChoice(state: GameState): string {
  const card = getCard(state.interrupt!.event!)!
  const open = eventChoices(state)
  return open.includes(card.default) ? card.default : (open[0] ?? card.default)
}

interface BuyMachine {
  model: string
  condition: 'new' | 'used'
  count: number
  price_mult: number
}

function siteWithRoom(state: GameState, modelId: string, count: number) {
  const kw = getModel(modelId)!.power_kw * count
  return state.sites.find(
    (s) =>
      isReady(s, state.quarter) &&
      capacityKw(s) - usedKw(state, s.id) >= kw - 1e-9,
  )
}

type Until = { weeks?: number; until?: 'quarter_end' }
type Scoped = Until & { mult: number; scope: 'site' | 'big_sites' | 'fleet' }

/** Absolute week span of an effect that starts next week. */
function span(state: GameState, u: Until): { from: number; to: number } {
  const from = absWeek(state)
  const to =
    u.until === 'quarter_end'
      ? state.quarter * W + W - 1
      : from + (u.weeks ?? W) - 1
  return { from, to }
}

function scopeSites(state: GameState, scope: Scoped['scope'], siteId?: string) {
  if (scope === 'fleet') return null
  if (scope === 'site') return siteId ? [siteId] : null
  return bigSites(state).map((s) => s.id)
}

/** The Plan-phase changes for next quarter (created on first use). */
function nextPlan(state: GameState) {
  const q = state.quarter + 1
  if (state.events.plan?.quarter !== q) {
    state.events.plan = {
      quarter: q,
      priceMult: 1,
      usedDiscount: 0,
      openBuy: false,
      guaranteedAuction: false,
    }
  }
  return state.events.plan!
}

/** EBITDA of the last 4 quarter reports, at least 0 (tax_surprise). */
function taxBaseUsd(state: GameState): number {
  return Math.max(
    0,
    state.reports.slice(-4).reduce((sum, r) => sum + r.ebitdaUsd, 0),
  )
}

/** Plays the chosen answer to the card on screen and clears it. */
export function resolveEvent(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  const card = getCard(active.event ?? '')
  const choice = card?.choices.find((c) => c.id === choiceId)
  if (!card || !choice || !eventChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const w = marketWeek(state.quarter, active.week)
  const site = state.sites.find((s) => s.id === active.siteId)
  const r = substream(state.seed, `event_roll:${state.quarter}:${card.id}`)
  const cashBefore = state.cash
  const weekNo = active.week + 1
  const ev = state.events
  for (const [key, value] of Object.entries(choice.effects)) {
    const v = value as never
    switch (key) {
      case 'cash':
        state.cash += Number(value)
        break
      case 'buy_machine': {
        const b = v as BuyMachine
        const price = buyPrice(getModel(b.model)!, state.quarter, b.condition)
        const target = siteWithRoom(state, b.model, b.count)!
        state.cash -= (price ?? 0) * b.price_mult * b.count
        addMachines(state, b.model, b.condition, b.count, target.id)
        break
      }
      case 'lock_new_gpus_quarters':
        ev.gpuLockQuarter = state.quarter + Number(value)
        break
      case 'sell_treasury_pct':
        state.quarterStats.treasurySoldUsd += sellTreasury(
          state,
          Number(value),
          w,
        )
        break
      case 'plan_new_price_mult':
        nextPlan(state).priceMult *= Number(value)
        break
      case 'plan_used_discount':
        nextPlan(state).usedDiscount = Number(value)
        break
      case 'open_buy':
        nextPlan(state).openBuy = true
        break
      case 'guarantee_auction':
        nextPlan(state).guaranteedAuction = true
        break
      case 'mothball': {
        // Every machine off, rent × rent_mult, until the end of next quarter ("until spring").
        const from = absWeek(state)
        const to = (state.quarter + 1) * W + W - 1
        const rentMult = (v as { rent_mult: number }).rent_mult
        ev.modifiers.push(
          { kind: 'hashrate', siteIds: null, mult: 0, from, to },
          { kind: 'rent', siteIds: null, mult: rentMult, from, to },
        )
        break
      }
      case 'sell_machines_pct':
        for (const lot of [...state.machines]) {
          const n = Math.floor(lot.count * Number(value))
          if (n > 0) state.cash += removeMachines(state, lot, n)
        }
        break
      case 'flag':
        if (!ev.flags.includes(String(value))) ev.flags.push(String(value))
        break
      case 'sell_model':
        for (const lot of state.machines.filter((l) => l.model === value))
          state.cash += removeMachines(state, lot, lot.count)
        break
      case 'ipo_bandwidth': {
        const x = v as { bw: number; until: string }
        ev.ipoBandwidth = { bw: x.bw, until: CONTENT.quarters.indexOf(x.until) }
        break
      }
      case 'rent_racks': {
        const x = v as { per_mw: number; max_mw: number }
        state.cash += x.per_mw * Math.min(spareKw(state) / 1000, x.max_mw)
        break
      }
      case 'repay_crypto_from_collateral': {
        const loan = state.cryptoLoan
        if (!loan) break
        const price = coinPrice(w, loan.coin)
        const sold = Math.min(loan.collateral, loan.balanceUsd / price)
        state.cash -= Math.max(0, loan.balanceUsd - sold * price)
        state.treasury[loan.coin] += loan.collateral - sold
        state.cryptoLoan = null
        break
      }
      case 'margin_stress': {
        const x = v as { call_ltv: number; liquidation_ltv: number }
        ev.marginStress = {
          quarter: state.quarter,
          callLtv: x.call_ltv,
          liquidationLtv: x.liquidation_ltv,
        }
        break
      }
      case 'grievance':
        addGrievance(state, site?.id ?? mostMachines(state).id, Number(value))
        break
      case 'hashrate_mult':
      case 'failure_mult': {
        const x = v as Scoped
        ev.modifiers.push({
          kind: key === 'hashrate_mult' ? 'hashrate' : 'failure',
          siteIds: scopeSites(state, x.scope, site?.id),
          mult: x.mult,
          ...span(state, x),
        })
        break
      }
      case 'fire_rebuild': {
        const x = v as { min_usd: number; fleet_used_value_pct: number }
        const fleet = state.machines.reduce(
          (sum, l) => sum + saleValueUsd(l, l.count, state.quarter),
          0,
        )
        state.cash -= Math.max(x.min_usd, x.fleet_used_value_pct * fleet)
        break
      }
      case 'cash_rent_quarters':
        state.cash += Number(value) * (site?.rentUsdQ ?? 0)
        break
      case 'rent_zero':
        if (site) site.rentUsdQ = 0
        break
      case 'tariff_pay_pct':
        state.cash -= newAsicSpendUsd(state) * Number(value)
        break
      case 'tariff_delay_quarters':
        for (const lot of undeliveredAsics(state))
          lot.earnsFromQuarter += Number(value)
        break
      case 'lawyer': {
        const x = v as { success_p: number; waiver_quarters: number }
        const won = random(r) < x.success_p
        if (won && site)
          ev.moratoriumWaiver[site.id] = state.quarter + x.waiver_quarters - 1
        logEntry(
          state,
          won ? 'log.event_lawyer_won' : 'log.event_lawyer_lost',
          {
            tier: site?.tier ?? '',
          },
          weekNo,
        )
        break
      }
      case 'lose_machines': {
        // A quarter of that site's units (at least 1, at most `max`).
        const x = v as { share: number; max: number }
        let left = Math.max(
          1,
          Math.min(x.max, Math.round(units(state, site?.id) * x.share)),
        )
        const lots = state.machines
          .filter((l) => l.siteId === site?.id)
          .sort(
            (a, b) => getModel(a.model)!.power_kw - getModel(b.model)!.power_kw,
          )
        for (const lot of lots) {
          if (left <= 0) break
          const n = Math.min(left, lot.count)
          removeMachines(state, lot, n) // no payment: stolen
          left -= n
        }
        break
      }
      case 'scam': {
        const x = v as {
          deposit_pct: number
          success_p: number
          discount: number
        }
        const usedSpend = state.log
          .filter(
            (e) =>
              e.quarter === state.quarter &&
              e.key === 'log.bought' &&
              e.params?.condition === 'used',
          )
          .reduce((sum, e) => sum + Number(e.params?.costUsd ?? 0), 0)
        const deposit = x.deposit_pct * usedSpend
        state.cash -= deposit
        const real = random(r) < x.success_p
        if (real) nextPlan(state).usedDiscount = x.discount
        logEntry(
          state,
          real ? 'log.event_scam_real' : 'log.event_scam_lost',
          {
            depositUsd: deposit,
          },
          weekNo,
        )
        break
      }
      case 'rate_class':
        if (site) site.rateMult = (v as { mult: number }).mult
        break
      case 'bandwidth_next':
        ev.bandwidthNext += Number(value)
        break
      case 'run_hot':
        ev.runHotQuarter = state.quarter
        break
      case 'chillers': {
        const x = v as { usd: number; per_mw: number }
        const mw = bigSites(state).reduce((m, s) => m + capacityKw(s) / 1000, 0)
        state.cash -= x.usd * Math.max(1, mw / x.per_mw)
        break
      }
      case 'stake_points':
        state.founderStake = Math.min(1, state.founderStake + Number(value))
        break
      case 'tax':
        state.cash -= (v as { pct: number }).pct * taxBaseUsd(state)
        break
      case 'tax_plan': {
        const x = v as {
          now_pct: number
          per_quarter_pct: number
          quarters: number
        }
        const base = taxBaseUsd(state)
        state.cash -= x.now_pct * base
        if (base > 0)
          ev.taxPlan = {
            amountUsd: x.per_quarter_pct * base,
            quartersLeft: x.quarters,
          }
        break
      }
      // ---------- Act II (M5.8) ----------
      case 'credit_notch': {
        const x = v as { notches: number; quarters: number }
        ev.creditNotch = {
          notches: x.notches,
          until: state.quarter + x.quarters - 1,
        }
        break
      }
      case 'cash_revenue_share':
        // A share of this quarter's mining revenue so far (the Ordinals fee spike).
        state.cash += state.quarterStats.revenueUsd * Number(value)
        break
      case 'valuation_mult': {
        const x = v as { mult: number; quarters: number }
        ev.valuationMult = {
          mult: x.mult,
          until: state.quarter + x.quarters - 1,
        }
        break
      }
      case 'region_power_mult': {
        // From next quarter, at your sites in those regions.
        const x = v as { regions: string[]; mult: number; quarters: number }
        for (const s of sitesIn(state, x.regions))
          s.eventPowerMult = {
            mult: x.mult,
            from: state.quarter + 1,
            until: state.quarter + x.quarters,
          }
        break
      }
      case 'region_grievance': {
        const x = v as { regions: string[]; value: number }
        for (const s of sitesIn(state, x.regions))
          addGrievance(state, s.id, x.value)
        break
      }
      case 'all_sites_grievance':
        for (const s of state.sites)
          if (s.tier !== BALANCE.startSite)
            addGrievance(state, s.id, Number(value))
        break
      case 'plan_gpu_price_mult': {
        const plan = nextPlan(state)
        plan.gpuPriceMult = (plan.gpuPriceMult ?? 1) * Number(value)
        break
      }
      case 'delay_marginal_project': {
        // The building project with the lowest projected return.
        const building = state.projects.filter((p) => p.stage === 'building')
        const irr = (p: (typeof building)[number]) =>
          projectedReturn(state, p).irr ?? -Infinity
        const marginal = [...building].sort((a, b) => irr(a) - irr(b))[0]
        if (marginal) slipProject(state, marginal, Number(value))
        break
      }
      case 'region_moratorium': {
        // ec21: no new projects at your sites in the card's region, from now for that many quarters.
        const region = site ? regionOf(site) : undefined
        if (region)
          ev.regionMoratorium = {
            region,
            until: state.quarter + Number(value) - 1,
          }
        break
      }
      case 'delay_building_projects':
        for (const p of state.projects.filter((x) => x.stage === 'building'))
          slipProject(state, p, Number(value))
        break
      case 'spot_price_mult': {
        const x = v as Until & { mult: number }
        ev.modifiers.push({
          kind: 'spot',
          siteIds: null,
          mult: x.mult,
          ...span(state, x),
        })
        break
      }
      case 'lock_spot': {
        // Each live cluster on spot locks its capacity at the shocked price for a while.
        const x = v as { price_mult: number; quarters: number }
        for (const p of liveClusters(state))
          if (!p.tenant?.gpu)
            p.spotLock = {
              usdHr: (neocloudUsdHr(p.gpu!, state.quarter) ?? 0) * x.price_mult,
              until: state.quarter + x.quarters - 1,
            }
        break
      }
      case 'take_backstop': {
        // The card's offer costs no Bandwidth.
        const p = backstopProject(state)
        if (p) {
          takeBackstop(state, p.id)
          state.bandwidth += BALANCE.finance.bandwidth.backstop
        }
        break
      }
      case 'take_jv': {
        const p = jvProject(state)
        if (p) {
          setJv(state, p.id, Number(value))
          state.bandwidth += BALANCE.finance.bandwidth.jv
        }
        break
      }
      case 'ebitda_mult': {
        const x = v as { mult: number; quarters: number }
        ev.ebitdaMult = { mult: x.mult, until: state.quarter + x.quarters - 1 }
        break
      }
      case 'gpu_repair': {
        // Replace the failed share of the big clusters' GPUs (most incidents are short).
        const x = v as {
          share: [number, number]
          usd_per_gpu: number
          cost_share: number
        }
        const gpus = liveClusters(state).reduce((n, p) => n + p.gpuCount, 0)
        const failed = Math.round(gpus * uniform(r, x.share[0], x.share[1]))
        state.cash -= failed * x.usd_per_gpu * x.cost_share
        break
      }
      case 'gpu_degraded': {
        // Until the end of the last of those quarters (this one counts).
        const x = v as { mult: number; quarters: number }
        ev.modifiers.push({
          kind: 'utilisation',
          siteIds: null,
          mult: x.mult,
          from: absWeek(state),
          to: (state.quarter + x.quarters) * W - 1,
        })
        break
      }
      case 'debt_spread_add':
        ev.spreadAddBps += Number(value)
        break
      case 'ai_lab_revenue_mult':
        ev.aiLabRevenueMult *= Number(value)
        break
      case 'ai_lab_walk_chance':
        for (const p of aiLabProjects(state))
          if (random(r) < Number(value)) tenantWalks(state, p)
        break
      case 'extra_tenant_offers':
        ev.extraOffers = { quarter: state.quarter + 1, n: Number(value) }
        break
      default:
        throw new Error(`Event effect "${key}" is not implemented`)
    }
  }
  state.cash = roundCents(state.cash)
  const cashUsd = state.cash - cashBefore
  logEntry(
    state,
    cashUsd !== 0 ? 'log.event_choice_cash' : 'log.event_choice',
    {
      eventTitle: `${card.id}.title`,
      eventChoice: `${card.id}.choice.${choiceId}`,
      cashUsd,
    },
    weekNo,
  )
  state.interrupt = null
}

/** At the start of a quarter: Bandwidth taken by last quarter's cards, tax instalments. */
export function startQuarterEvents(state: GameState): void {
  const ev = state.events
  ev.queue = []
  if (ev.bandwidthNext !== 0) {
    state.bandwidth = Math.max(0, state.bandwidth + ev.bandwidthNext)
    ev.bandwidthNext = 0
  }
  if (ev.taxPlan) {
    state.cash -= ev.taxPlan.amountUsd
    logEntry(state, 'log.event_tax_instalment', {
      amountUsd: ev.taxPlan.amountUsd,
    })
    ev.taxPlan.quartersLeft--
    if (ev.taxPlan.quartersLeft <= 0) ev.taxPlan = null
  }
  // Drop spent modifiers so saves stay small.
  const now = state.quarter * W
  ev.modifiers = ev.modifiers.filter((m) => m.to >= now)
}
