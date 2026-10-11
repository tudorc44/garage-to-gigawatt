// Act V's event cards in play (M58.4; doc 43 §0.15 fix 4, events_v.json, doc 47 README "Card effects"). The deck
// (content/act5Cards.ts) holds 8 cards per future and 11 shared ones as engine cards; this system schedules them and
// carries out a choice's authored effect through the same systems as the Plan's Act V actions.
// Scheduling (each in week 2 of its quarter, like Acts III-IV's): a fixed-quarter card in its quarter, in its own future
// or every future. Of the interrupt cards, a plant trip fires 15% a quarter per operating plant (at most once a plant in
// 8 quarters) and a transformer delay 10% a quarter per position due within 2 quarters (BALANCE.act5.cards). The venture
// cash call is the Plan's call dialog (doc 38; an unanswered call dilutes), and the end-of-life cards are the Orbit page's
// end-of-life panel (M56.3, with §0.15 fix 5's bodies): neither fires a second time as an interrupt (mine, reversible).
// A choice's effect runs as the matching Plan action would, without its Bandwidth (a card names its own cost); a card's
// reading sign is logged as a move: the systems' own move where they log one, else the move of the same meaning and sign
// (CARD_MOVE; a test checks every signed choice against reading_score_v.json's table). Nothing here reads a hidden file:
// the deck filter reads the future, as Act IV's does.
import { BALANCE, CONTENT, act5Row, actFirstQuarter, type EventCard } from '../../content/index.ts'
import type { Act5CardEffect } from '../../content/act5Cards.ts'
import { book, oneOffCategory } from '../ledger.ts'
import { chance, substream } from '../rng.ts'
import { act5SeedOf, inActV, logEntry, roundCents, type Act5MoveKind, type GameState } from '../state.ts'
import { idleOldAsics } from './cardContracts.ts'
import { equityBlocker, raiseEquity } from './equity.ts'
import { enrolFlexible, enrollableKw } from './flex.ts'
import { logAct5Move } from './act5Moves.ts'
import { scenarioOf } from './market.ts'
import {
  contractPlantOutput,
  fundBidUsd,
  fundSaleBlocker,
  isPlant,
  outputContractBlocker,
  plantQuarter,
  sellPlantStake,
} from './plants.ts'
import { gridQuarterRange } from './power.ts'
import {
  delayPosition,
  fastLaneBlocker,
  payUpgrade,
  payUpgradeBlocker,
  queueView,
  sellSiteBlocker,
  sellWholeSite,
  takeFastLane,
  wholeSiteSale,
  withdrawBlocker,
  withdrawPosition,
} from './queue.ts'
import { renewalOffer } from './renewals.ts'
import { contractEndQuarter } from './calendar.ts'
import { machinesKw, poweredKw, regionOf } from './sites.ts'
import { answerCall, commitFollowOn, followOnBlocker, stakeMarkUsd } from './ventures.ts'
import { PLANTS } from '../../content/plantsContent.ts'

const K = BALANCE.act5.cards

/** The move a card choice logs when its effect logs none itself, by the effect key that carries its meaning. */
export const CARD_MOVE: [key: string, kind: Act5MoveKind][] = [
  ['lease_lock_offer', 'blend_and_extend_long'],
  ['offer:site_bid', 'sell_site_with_position'],
  ['offer:site_buy', 'buy_site_with_position'],
  ['offer:fund_bid', 'sell_plant_stake_to_fund'],
  ['contract_output', 'contract_plant_output'],
  ['flex_enrol_mw', 'enrol_flexible'],
  ['flex_capacity_bid', 'enrol_flexible'],
  ['fast_lane_apply', 'take_fast_lane'],
  ['pay_upgrade', 'pay_network_upgrade'],
  ['own_positions_wait_q', 'pay_network_upgrade'],
  ['gas_wait_cut_q', 'commit_new_firm_asset'],
  ['follow_on', 'commit_follow_on_unit'],
  // (mine, reversible: repaying plant debt early de-risks the stake, as a contract does)
  ['plant_debt_prepay_share', 'contract_plant_output'],
  ['equity_window', 'equity_raise'],
]

/** The move kind for one choice's effect (or null: the effect has no signed meaning). */
export function cardMoveKind(effect: Record<string, unknown>): Act5MoveKind | null {
  for (const [key, kind] of CARD_MOVE) {
    const [k, sub] = key.split(':')
    if (!(k in effect)) continue
    if (sub && (effect[k] as { kind?: string })?.kind !== sub) continue
    return kind
  }
  return null
}

const authored = (c: EventCard): Act5CardEffect => (c.choices[0].effects as { act5_card: Act5CardEffect }).act5_card

// ---------- scheduling (at END_PLAN) ----------

/** Plans this quarter's Act V cards (replaces the other acts' deck in Act V). */
export function scheduleAct5Cards(state: GameState): void {
  if (!inActV(state)) return
  const ev = state.events
  const q = state.quarter
  state.act5CardTargets = {}
  for (const card of CONTENT.events.cards) {
    if (card.act !== 5 || !card.act5Window) continue
    if (card.futureV && card.futureV !== 'all' && card.futureV !== state.vFutureId) continue
    const [from, to] = card.act5Window
    if (q < from || q > to) continue
    const a = authored(card)
    const week = card.weekIndex! + 1
    if (card.act5Role === 'orbit') continue
    if (card.act5Role === 'interrupt') {
      const target = interruptTarget(state, a)
      if (!target) continue
      state.act5CardTargets[card.id] = target
      ev.queue.push({ id: card.id, week, random: false })
      continue
    }
    if (q === from) ev.queue.push({ id: card.id, week, random: false })
  }
}

/** The interrupt's subject this quarter (a plant or a position), or null: it doesn't fire. */
function interruptTarget(state: GameState, a: Act5CardEffect): string | null {
  const q = state.quarter
  const label = CONTENT.quarters[q]
  if ('plant_event' in a.effect) {
    for (const v of (state.ventures ?? []).filter((x) => x.stake > 0 && isPlant(state, x))) {
      const last = state.act5Trips?.[v.id]
      if (last !== undefined && q - last < K.tripGapQuarters) continue
      if (!chance(substream(act5SeedOf(state), `act5_trip:${label}:${v.id}`), K.tripChance)) continue
      ;(state.act5Trips ??= {})[v.id] = q
      return v.id
    }
    return null
  }
  if ('position_delay_q' in a.effect) {
    for (const p of queueView(state)?.positions ?? []) {
      const ready = state.sites.flatMap((s) => s.powerAdds ?? []).find((x) => x.projectId === p.projectId)?.readyQuarter
      if (ready === null || ready === undefined || ready - q > K.transformerWithinQuarters) continue
      if (chance(substream(act5SeedOf(state), `act5_transformer:${label}:${p.projectId}`), K.transformerChance)) return p.projectId
    }
    return null
  }
  // (the venture cash call is the Plan's call dialog: mine, reversible)
  return null
}

// ---------- a choice's effect ----------

/** Runs `fn` as a Plan-phase action would (its blockers see a Plan with Bandwidth), then restores phase and Bandwidth. */
function asPlan(state: GameState, fn: () => void): void {
  const phase = state.phase
  const bw = state.bandwidth
  state.phase = 'plan'
  state.bandwidth = 99
  try {
    fn()
  } finally {
    state.phase = phase
    state.bandwidth = bw
  }
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null)

/** One Act V card choice: its effects, then its reading sign as a move (unless a system logged one). */
export function applyAct5Card(state: GameState, cardId: string, e: Act5CardEffect, weekNo: number): void {
  const before = state.act5Moves?.length ?? 0
  const target = state.act5CardTargets?.[cardId]
  const ef = e.effect
  const q = state.quarter
  for (const [key, value] of Object.entries(ef)) {
    switch (key) {
      case 'cash': {
        const n = num(value)
        const usd =
          n ??
          (value === '-plant_mw*2000'
            ? -((state.ventures ?? []).find((v) => v.id === target)?.mw ?? 0) * 2000
            : value === '-position_kw*20'
              ? -(state.sites.flatMap((s) => s.powerAdds ?? []).find((x) => x.projectId === target)?.kw ?? 0) * 20
              : 0)
        if (usd !== 0) book(state, oneOffCategory(usd), roundCents(usd))
        break
      }
      case 'bandwidth':
        break // after the effects (below)
      case 'idle_mw':
        idleOldAsics(state, weekNo)
        break
      case 'flex_enrol_mw':
        if (value === 'miners') {
          for (const s of state.sites) if (machinesKw(state, s.id) > 0) enrolFlexible(state, s.id, machinesKw(state, s.id))
        } else {
          const site = [...state.sites].sort((a, b) => enrollableKw(state, b) - enrollableKw(state, a))[0]
          if (site) enrolFlexible(state, site.id, (num(value) ?? 0) * 1000)
        }
        break
      case 'smr_licence_quarters': {
        // the licensing clock: SMR licences still under review shorten (never before next quarter: mine, reversible)
        const d = num(value) ?? 0
        for (const v of state.ventures ?? []) {
          if (v.type !== 'smr' || v.stage !== 'licensing') continue
          const shift = Math.max(d, q + 1 - v.licenceEnd)
          v.licenceEnd += shift
          v.buildStart += shift
          v.buildEnd += shift
          v.codQuarter += shift
        }
        break
      }
      case 'plant_event': {
        // a trip: the plant's lost weeks of output, your share, as an energy cost (mine, reversible)
        const v = (state.ventures ?? []).find((x) => x.id === target)
        const weeks = num((value as { weeks?: unknown }).weeks) ?? 0
        if (v && weeks > 0) {
          const lost = roundCents(v.stake * Math.max(0, plantQuarter(state, v).energyUsd) * (weeks / BALANCE.weeksPerQuarter))
          if (lost > 0) book(state, 'energy_opex', -lost, { venture: v.id })
          logEntry(state, 'log.plant.trip', { ventureType: v.type, weeks })
        }
        break
      }
      case 'venture_call': {
        const v = (state.ventures ?? []).find((x) => x.call)
        if (v) answerCall(state, v.id, String(value))
        break
      }
      case 'position_delay_q':
        if (target) delayPosition(state, target, num(value) ?? 0)
        break
      case 'offer':
        applyOffer(state, value as { kind: string; premium_mult?: number; bid_mult?: number })
        break
      case 'lease_lock_offer':
        lockLeases(state, value as { years: number; rent_index?: number })
        break
      case 'gas_wait_cut_q':
        state.act5GasWaitCutQ = num(value) ?? 0
        break
      case 'pc_cost':
        if (state.politicalCapital !== undefined) state.politicalCapital = Math.max(0, state.politicalCapital - (num(value) ?? 0))
        break
      case 'own_positions_wait_q':
        for (const p of queueView(state)?.positions ?? []) delayPosition(state, p.projectId, num(value) ?? 0)
        break
      case 'contract_output': {
        const share = Math.min(PLANTS.finance.contract_output.max_share, num((value as { share?: unknown }).share) ?? 0)
        for (const v of (state.ventures ?? []).filter((x) => x.stake > 0 && isPlant(state, x)))
          asPlan(state, () => {
            if (!outputContractBlocker(state, v.id, share)) contractPlantOutput(state, v.id, share)
          })
        break
      }
      case 'fast_lane_apply':
        for (const p of queueView(state)?.positions ?? [])
          asPlan(state, () => {
            if (!fastLaneBlocker(state, p.projectId)) takeFastLane(state, p.projectId)
          })
        break
      case 'pay_upgrade':
        for (const p of queueView(state)?.positions ?? [])
          asPlan(state, () => {
            if (!payUpgradeBlocker(state, p.projectId)) payUpgrade(state, p.projectId)
          })
        break
      case 'withdraw_position': {
        const p = [...(queueView(state)?.positions ?? [])].filter((x) => !x.billPaid).sort((a, b) => (b.billUsd ?? 0) - (a.billUsd ?? 0))[0]
        if (p)
          asPlan(state, () => {
            if (!withdrawBlocker(state, p.projectId)) withdrawPosition(state, p.projectId)
          })
        break
      }
      case 'follow_on': {
        const discount = num((value as { extra_discount_on_terms?: unknown }).extra_discount_on_terms) ?? 0
        for (const type of ['smr', 'egs'] as const) {
          const j = { type, stake: 0.1, offtake: 0, prepay: 0 }
          let done = false
          asPlan(state, () => {
            if (followOnBlocker(state, j)) return
            const cashBefore = state.cash
            const v = commitFollowOn(state, j)
            // the discount on its terms: that share of the buy-in back (mine, reversible)
            const rebate = roundCents((cashBefore - state.cash) * discount)
            if (rebate > 0) {
              book(state, 'venture_calls', rebate, { venture: v.id })
              v.paidUsd -= rebate
            }
            done = true
          })
          if (done) break
        }
        break
      }
      case 'plant_debt_prepay_share': {
        const share = num(value) ?? 0
        for (const v of state.ventures ?? []) {
          if (!v.plantDebt) continue
          const pay = roundCents(Math.min(Math.max(0, state.cash), v.plantDebt.principalUsd * share))
          if (pay <= 0) continue
          book(state, 'debt_repaid', -pay, { venture: v.id })
          v.plantDebt.principalUsd = roundCents(v.plantDebt.principalUsd - pay)
        }
        break
      }
      case 'equity_window':
        asPlan(state, () => {
          if (!equityBlocker(state, EQUITY_WINDOW_DILUTION)) raiseEquity(state, EQUITY_WINDOW_DILUTION)
        })
        break
      case 'orbit_booking':
        // reserving replacement launch slots: the reservation is noted; no launch system takes it yet (mine, reversible)
        state.act5LaunchReserved = true
        break
      // (labels and screens: the credit cliff while credits are unmodelled, the flex study, the flex capacity bid
      // (the flex payment already runs on every enrolled MW), "open the exit dialog", an end-of-life choice)
      case 'clean_credit_new_starts':
      case 'flex_study':
      case 'flex_capacity_bid':
      case 'open':
      case 'orbit':
        break
    }
  }
  const bw = num(ef.bandwidth)
  if (bw !== null) state.bandwidth = Math.max(0, state.bandwidth + bw)
  // the choice's reading sign, unless one of its systems logged its own move
  if (e.sign !== 0 && (state.act5Moves?.length ?? 0) === before) {
    const kind = cardMoveKind(ef)
    if (kind) logAct5Move(state, kind)
  }
}

/** The space window's raise (mine, reversible: a 10% dilution, the smallest the raise allows). */
const EQUITY_WINDOW_DILUTION = 0.1

/** A buyer's or a seller's offer (doc 47 README): the whole-site sale, a fund's bid, or a queue-holding site bought. */
function applyOffer(state: GameState, o: { kind: string; premium_mult?: number; bid_mult?: number }): void {
  if (o.kind === 'site_bid') {
    // the site that fetches most (mine, reversible), at its whole-site value × the premium
    const best = state.sites
      .map((s) => ({ s, usd: wholeSiteSale(state, s).totalUsd }))
      .filter((x) => x.usd > 0)
      .sort((a, b) => b.usd - a.usd)
      .find((x) => {
        let ok = false
        asPlan(state, () => (ok = !sellSiteBlocker(state, x.s.id)))
        return ok
      })
    if (!best) return
    asPlan(state, () => sellWholeSite(state, best.s.id))
    const extra = roundCents(best.usd * ((o.premium_mult ?? 1) - 1))
    if (extra !== 0) book(state, 'asset_sales', extra, { site: best.s.id })
    return
  }
  if (o.kind === 'fund_bid') {
    // the stake that fetches most (mine, reversible)
    const v = (state.ventures ?? [])
      .filter((x) => x.stake > 0)
      .sort((a, b) => fundBidUsd(state, b, 1, stakeMarkUsd(b)) - fundBidUsd(state, a, 1, stakeMarkUsd(a)))[0]
    if (!v) return
    let usd = 0
    asPlan(state, () => {
      if (fundSaleBlocker(state, v.id, 1)) return
      usd = fundBidUsd(state, v, 1, stakeMarkUsd(v))
      sellPlantStake(state, v.id, 1, stakeMarkUsd(v))
    })
    const extra = roundCents(usd * ((o.bid_mult ?? 1) - 1))
    if (extra !== 0) book(state, 'asset_sales', extra, { venture: v.id })
    return
  }
  if (o.kind === 'site_buy') {
    // a queue-holding site: a 20 MW grid position at your biggest site, at the queue premium × the premium (mine)
    const site = [...state.sites].filter((s) => s.tier !== 'garage').sort((a, b) => poweredKw(b, state.quarter) - poweredKw(a, state.quarter))[0]
    const premium = act5Row(state.quarter, scenarioOf(state))?.queue_premium_usd_kw ?? 0
    const kw = K.boughtPositionMw * 1000
    const cost = roundCents(kw * premium * (o.premium_mult ?? 1))
    if (!site || state.cash < cost) return
    const region = regionOf(site)
    const wait = region ? gridQuarterRange(state, region)[0] : 8
    book(state, 'site_builds', -cost, { site: site.id })
    ;(site.powerAdds ??= []).push({ projectId: `bought-${state.quarter}`, kw, source: 'grid', readyQuarter: state.quarter + wait })
    logEntry(state, 'log.queue.bought', { kwKw: kw, tier: site.tier, serial: site.serial ?? 0, costUsd: cost })
  }
}

/** Locks every shell lease ending within 4 quarters at today's market rent (± rent_index) for `years` from now. */
function lockLeases(state: GameState, o: { years: number; rent_index?: number }): void {
  const q = state.quarter
  let n = 0
  for (const p of state.projects) {
    const t = p.tenant
    if (!t || t.gpu || p.stage !== 'live' || t.rolling) continue
    const end = contractEndQuarter(state, p)
    if (end === null || end > q + 4) continue
    const offer = renewalOffer(state, p)
    if (!offer) continue
    t.priceMult = (t.priceMult ?? 1) * offer.mult * (1 + (o.rent_index ?? 0))
    t.termQuarters = o.years * 4
    t.servedQuarters = 0
    t.signedQuarter = q
    state.act3Renewals = (state.act3Renewals ?? []).filter((r) => r.projectId !== p.id)
    n++
  }
  logEntry(state, 'log.lease.locked', { n, years: o.years })
}

/** The quarter the future's trigger card plays (its window's first), or null. Not hidden: the card plays in that quarter. */
export function triggerQuarterV(state: GameState): number | null {
  const card = CONTENT.events.cards.find(
    (c) => c.act === 5 && c.act5Role === 'trigger' && c.futureV === state.vFutureId,
  )
  return card?.act5Window?.[0] ?? null
}

/** §0.15 fix 5: the end-of-life card's body: neutral before the future's trigger has played, the future's own after. */
export function eolBodyKey(state: GameState): string {
  const trig = triggerQuarterV(state)
  const card = CONTENT.events.cards.find((c) => c.act === 5 && c.act5Role === 'orbit' && c.futureV === state.vFutureId)
  return card && trig !== null && state.quarter > trig ? `event.${card.id}.body` : 'ui.orbit_eol.neutral_body'
}

export const ACT5_FIRST = () => actFirstQuarter(5)
