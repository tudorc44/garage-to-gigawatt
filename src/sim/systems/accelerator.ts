// The accelerator venture (M54; doc 43 §0.10 with §0.12, doc 49; venture_accelerator.json from tools/act5/chips.py):
// Halyard Silicon designs an AI chip, Halyard Bowline, on its own calendar from 2032Q1, whether or not you join (as the
// energy ventures since M36.10). Its draws are one set per game on `substream(act4Seed, "accelerator")`: a slip that
// scales every phase (median ×1.30, σ 0.30, floor 0.9, cap 2.5), respins at first silicon (0.5, then 0.2; 1-2 quarters
// each), the realised cost (the "semiconductor" class), the foundry's allocation at volume (35%: half the units for 4
// quarters) and the buy-out multiples; each quarter before volume one hazard roll (`accelerator:q<n>`): cancelled,
// acquired at a gain, or acquired at a loss (the calibrated rates). The schedule mirrors the generator's simulation, so
// P(volume within 8 years) is the file's 0.30 (a test plays 2,000 games).
//
// Your roles (offered in Act IV, from 2032Q1, until volume): a stake (10/20/30/49% × the $800M pitch), paid-in as doc
// 38's ventures; cash calls in thirds at tape-out, first silicon and volume ((m − 1) × pitch × stake), plus 5% of the
// pitch × stake per respin (pay, dilute or walk; dilute is the default); the milestone mark until volume (×1.25 per
// milestone, ×0.8 per slip); after volume, the chip company's earnings (units × price × the year's EBITDA share × 4 ×
// the chip multiple; the first 4 quarters at least the mark at volume). A buyer at a gain pays the mark × 1.5-3.0: only
// the 49% lead stake may vote against it (doc 43 §0.12); a buyer at a loss pays paid-in × 0.3-0.9; a cancellation is a
// write-off. An allocation reservation (a 10% deposit for 10% off, or 20% for 15%, on 5, 10 or 25 MW of chips) is
// credited at delivery, lost on a cancellation, refunded on a sale. Halyard Bowline goes on sale in Act V from
// max(volume + 1, 2036Q1), if it ships; the market's accelerator columns are read only from then (masked before).
// HIDDEN: the draws. Views show only what has happened (a milestone reached, a call made); no screen reads the draws.
import { CONTENT, act5Row, actFirstQuarter, type MarketKey } from '../../content/index.ts'
import { ACCELERATOR as A, ACCEL_PITCH_Q as PQ } from '../../content/acceleratorContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book, roundCash } from '../ledger.ts'
import { chance, random, substream, uniform } from '../rng.ts'
import { act4SeedOf, inActIV, inActV, logEntry, roundCents, type Accelerator, type GameState } from '../state.ts'
import { scenarioOf } from './market.ts'
import { lognormal } from './overrun.ts'

const start = () => CONTENT.quarters.indexOf(A.from)
const pitchedVolume = () => CONTENT.quarters.indexOf(A.pitch.volume)
const H = A.hazard_per_year_before_volume

/** The developer's hidden draws for this game (quarter indexes absolute). */
export interface AcceleratorDraws {
  tape: number
  sil: number
  respins: number[]
  qual: number
  vol: number
  m: number
  foundryCapped: boolean
  gainMult: number
  lossMult: number
}

/** One set per game (doc 49: "one slip draw per game"). Pure. */
export function acceleratorDraws(state: Pick<GameState, 'seed' | 'act4Seed'>): AcceleratorDraws {
  const r = substream(act4SeedOf(state as GameState), 'accelerator')
  const s = A.slip
  const k = Math.min(s.cap, Math.max(s.floor, lognormal(r, s.median, s.sigma)))
  const s0 = start()
  const tape = s0 + Math.round(PQ.tape_out * k)
  const sil = tape + PQ.first_silicon
  const respins: number[] = []
  const pick = () => A.respin.delay_q[Math.floor(random(r) * A.respin.delay_q.length)]
  if (chance(r, A.respin.chance)) {
    respins.push(pick())
    if (chance(r, A.respin.second_chance)) respins.push(pick())
  }
  const rs = respins.reduce((a, b) => a + b, 0)
  const qual = sil + rs + Math.round(PQ.qualification * k)
  const vol = sil + rs + Math.round((PQ.qualification + PQ.volume) * k)
  const o = A.overrun_class
  const m = lognormal(r, o.median, o.sigma, o.cap)
  return {
    tape,
    sil,
    respins,
    qual,
    vol,
    m,
    foundryCapped: chance(r, A.foundry_allocation.chance_at_volume),
    gainMult: uniform(r, ...A.acquisition.gain.stake_paid_mark_mult),
    lossMult: uniform(r, ...A.acquisition.loss.stake_paid_paid_in_mult),
  }
}

export type AcceleratorOutcome = 'cancelled' | 'acquired_gain' | 'acquired_loss'

/** The hazard roll at the end of quarter `q` (before volume): an outcome or null. */
function hazardAt(state: GameState, q: number): AcceleratorOutcome | null {
  const x = random(substream(act4SeedOf(state), `accelerator:q${q}`))
  if (x < H.cancel / 4) return 'cancelled'
  if (x < (H.cancel + H.acquired_gain) / 4) return 'acquired_gain'
  if (x < (H.cancel + H.acquired_gain + H.acquired_loss) / 4) return 'acquired_loss'
  return null
}

/**
 * The developer's project as it stands at the start of quarter `upTo` (default: now): replayed from its draws, the
 * hazard rolls, and the buy-outs your 49% stake voted down. Pure.
 */
export function acceleratorFate(
  state: GameState,
  upTo = state.quarter,
): { outcome: AcceleratorOutcome | null; endQuarter: number | null; volume: boolean; draws: AcceleratorDraws } {
  const d = acceleratorDraws(state)
  const blocked = state.accelerator?.blockedQuarters ?? []
  for (let q = start(); q < upTo; q++) {
    if (q >= d.vol) return { outcome: null, endQuarter: null, volume: true, draws: d }
    const h = hazardAt(state, q)
    if (h && !(h === 'acquired_gain' && blocked.includes(q))) return { outcome: h, endQuarter: q, volume: false, draws: d }
  }
  return { outcome: null, endQuarter: null, volume: upTo > d.vol, draws: d }
}

/** The quarter Halyard Bowline goes on sale in this game (max(volume + 1, 2036Q1)), or null if it never ships. */
export function bowlineFrom(state: GameState): number | null {
  const fate = acceleratorFate(state, actFirstQuarter(5) + 20)
  if (!fate.volume) return null
  return Math.max(fate.draws.vol + 1, actFirstQuarter(5))
}

/** Whether Halyard Bowline is on sale now (Act V only; never before max(volume + 1, 2036Q1)). */
export function bowlineOnSale(state: GameState, quarter = state.quarter): boolean {
  if (!inActV(state)) return false
  const from = bowlineFrom(state)
  if (from === null || quarter < from) return false
  // reached volume and not ended before this quarter (an end after volume doesn't happen: hazards stop at volume)
  return true
}

// ---------- the offer and your roles ----------

/** Whether the developer takes money now: Act IV from its start, before volume and any end. */
export function acceleratorOpen(state: GameState): boolean {
  if (!inActIV(state) || state.quarter < start()) return false
  const f = acceleratorFate(state)
  return f.outcome === null && !f.volume
}

export const acceleratorBuyInUsd = (stake: number) => roundCents(stake * A.pitch.budget_usd)

export function acceleratorJoinBlocker(state: GameState, stake: number): Message | undefined {
  if (!acceleratorOpen(state)) return { key: 'error.accel_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if ((state.accelerator?.stake ?? 0) > 0 || state.accelerator?.walked) return { key: 'error.venture_joined' }
  if (!A.equity_shares.includes(stake)) return { key: 'error.bad_choice' }
  const cost = acceleratorBuyInUsd(stake)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

function record(state: GameState): Accelerator {
  return (state.accelerator ??= {
    stake: 0,
    paidUsd: 0,
    callsPaidUsd: 0,
    milestones: 0,
    slips: 0,
    call: null,
    blockedQuarters: [],
  })
}

/** Buys the stake: stake × the pitched budget (as ventures.json). */
export function joinAccelerator(state: GameState, stake: number): void {
  const a = record(state)
  const usd = acceleratorBuyInUsd(stake)
  a.stake = stake
  a.stakeAtJoin = stake
  a.buyInUsd = usd
  a.paidUsd = usd
  a.joinedQuarter = state.quarter
  book(state, 'venture_calls', -usd, { venture: 'accelerator' })
  roundCash(state)
  logEntry(state, 'log.accel.joined', { costUsd: usd, pct: Math.round(stake * 100) })
}

/** The reservation's deposit for `mw` at menu tier `tier`: deposit share × MW × GPUs/MW × the chip's price at signing. */
export function reservationDepositUsd(state: GameState, mw: number, tier: number): number {
  const price = bowlinePriceUsd(state.quarter, scenarioOf(state), true) ?? 0
  return roundCents(A.allocation_reservation.menu[tier].deposit_share * mw * bowlineGpusPerMw() * price)
}

export function reserveBlocker(state: GameState, mw: number, tier: number): Message | undefined {
  if (!acceleratorOpen(state)) return { key: 'error.accel_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  // (doc 49's card opens the reservation at tape-out: from then until volume)
  if (state.quarter < acceleratorDraws(state).tape) return { key: 'error.accel_no_reservation_yet' }
  if (state.accelerator?.reservation) return { key: 'error.accel_reserved' }
  if (!A.allocation_reservation.reserved_mw.includes(mw) || !A.allocation_reservation.menu[tier]) return { key: 'error.bad_choice' }
  const cost = reservationDepositUsd(state, mw, tier)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

export function reserveChips(state: GameState, mw: number, tier: number): void {
  const a = record(state)
  const usd = reservationDepositUsd(state, mw, tier)
  a.reservation = { mw, tier, depositUsd: usd, discount: A.allocation_reservation.menu[tier].discount, status: 'waiting', usedMw: 0 }
  book(state, 'prepayments', -usd, { venture: 'accelerator' })
  roundCash(state)
  logEntry(state, 'log.accel.reserved', { mw, costUsd: usd })
}

/** Answers the pending call: pay, dilute (the stake falls pro rata, as doc 38) or walk (written off). */
export function acceleratorCallBlocker(state: GameState, choice: string): Message | undefined {
  const c = state.accelerator?.call
  if (!c) return { key: 'error.bad_choice' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (choice === 'pay' && state.cash < c.dueUsd) return { key: 'error.no_cash', params: { costUsd: c.dueUsd, cashUsd: state.cash } }
  if (choice !== 'pay' && choice !== 'dilute' && choice !== 'walk') return { key: 'error.bad_choice' }
}

export function answerAcceleratorCall(state: GameState, choice: 'pay' | 'dilute' | 'walk'): void {
  const a = state.accelerator!
  const c = a.call!
  if (choice === 'pay') {
    book(state, 'venture_calls', -c.dueUsd, { venture: 'accelerator' })
    roundCash(state)
    a.paidUsd = roundCents(a.paidUsd + c.dueUsd)
    a.callsPaidUsd = roundCents(a.callsPaidUsd + c.dueUsd)
  } else if (choice === 'dilute') {
    a.stake = a.paidUsd + c.dueUsd > 0 ? (a.stake * a.paidUsd) / (a.paidUsd + c.dueUsd) : 0
  } else {
    a.stake = 0
    a.walked = true
  }
  logEntry(state, 'log.accel.call_answered', { ventureChoice: choice, costUsd: choice === 'pay' ? c.dueUsd : 0 })
  a.call = null
}

/** The 49% stake's vote on a buyer at a gain: sell (the default) or block. */
export function saleVoteBlocker(state: GameState, choice: string): Message | undefined {
  const a = state.accelerator
  if (!a?.saleOffer) return { key: 'error.bad_choice' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (choice === 'block' && a.stake < A.acquisition.gain.player_can_block_with_stake_ge) return { key: 'error.accel_block_needs_lead' }
  if (choice !== 'sell' && choice !== 'block') return { key: 'error.bad_choice' }
}

export function answerSaleVote(state: GameState, choice: 'sell' | 'block'): void {
  const a = state.accelerator!
  const offer = a.saleOffer!
  if (choice === 'block') {
    a.blockedQuarters.push(offer.quarter)
    logEntry(state, 'log.accel.blocked')
  } else sellToBuyer(state, offer.priceUsd)
  delete a.saleOffer
}

/** Unanswered decisions take their defaults at the end of the Plan (a call: dilute; a buyer: sell). */
export function settleAccelerator(state: GameState): void {
  const a = state.accelerator
  if (a?.call) answerAcceleratorCall(state, 'dilute')
  if (a?.saleOffer) answerSaleVote(state, 'sell')
}

function sellToBuyer(state: GameState, priceUsd: number): void {
  const a = state.accelerator!
  if (priceUsd > 0) book(state, 'asset_sales', priceUsd, { venture: 'accelerator' })
  refundReservation(state)
  a.stake = 0
  a.ended = 'acquired_gain'
  roundCash(state)
  logEntry(state, 'log.accel.sold', { priceUsd })
}

function refundReservation(state: GameState): void {
  const res = state.accelerator?.reservation
  if (res && res.status === 'waiting') {
    book(state, 'prepayments', res.depositUsd, { venture: 'accelerator' })
    res.status = 'refunded'
  }
}

// ---------- value ----------

/** Your stake's milestone mark: the buy-in scaled by dilution × 1.25 per milestone × 0.8 per slip, plus calls paid. */
export function acceleratorMarkUsd(a: Accelerator): number {
  if (a.stake <= 0 || !a.buyInUsd) return 0
  const share = a.stakeAtJoin && a.stakeAtJoin > 0 ? a.stake / a.stakeAtJoin : 1
  return a.buyInUsd * share * A.marks.milestone_mult ** a.milestones * A.marks.slip_mult ** a.slips + a.callsPaidUsd
}

/** The chip company's market row: Act V's own; in Act IV (an early volume), 2036Q1's common baseline (doc 49 assumption 1). */
function chipRow(state: GameState, quarter: number) {
  const key = inActV(state) ? scenarioOf(state) : null
  return act5Row(inActV(state) ? quarter : actFirstQuarter(5), key ?? ('s0.f1.v1' as MarketKey))
}

/** The developer's EBITDA this quarter after volume, $ (units × price × the year's share; the foundry cap halves units). */
export function acceleratorEbitdaUsd(state: GameState, quarter = state.quarter): number {
  const d = acceleratorDraws(state)
  if (quarter < d.vol) return 0
  const row = chipRow(state, quarter)
  if (!row) return 0
  const since = quarter - d.vol
  const ramp = A.after_volume.units_ramp_by_quarter_since_volume
  const shares = A.after_volume.ebitda_share_of_price_by_year_since_volume
  const capped = d.foundryCapped && since < A.foundry_allocation.quarters ? A.foundry_allocation.units_cap_share : 1
  const units = (row.accel_units_full_ramp_q ?? 0) * ramp[Math.min(since, ramp.length - 1)] * capped
  return units * (row.accel_unit_purchase_usd ?? 0) * shares[Math.min(Math.floor(since / 4), shares.length - 1)]
}

/**
 * Your part's value now (a valuation part, with the energy ventures'): the stake, plus a reservation's deposit at cost
 * while it can still be credited or refunded (as the energy ventures' prepayments).
 */
export function acceleratorValueUsd(state: GameState): number {
  const a = state.accelerator
  if (!a) return 0
  const res = a.reservation
  const deposit = res && (res.status === 'waiting' || res.status === 'delivered') ? res.depositUsd : 0
  return deposit + acceleratorStakeValueUsd(state)
}

/** Your stake's value now: the mark before volume; after, the earnings value (the first 4 quarters at least the mark). */
export function acceleratorStakeValueUsd(state: GameState): number {
  const a = state.accelerator
  if (!a || a.stake <= 0 || a.ended) return 0
  const d = acceleratorDraws(state)
  if (state.quarter < d.vol) return acceleratorMarkUsd(a)
  const row = chipRow(state, state.quarter)
  const earnings = a.stake * acceleratorEbitdaUsd(state) * 4 * (row?.chip_ev_ebitda_mult ?? 0)
  return state.quarter - d.vol < 4 ? Math.max(a.markAtVolumeUsd ?? 0, earnings) : earnings
}

// ---------- Halyard Bowline, the GPU (Act V, once on sale) ----------

const BOWLINE = () => CONTENT.bowline
export const bowlineGpusPerMw = () => BOWLINE()?.gpusPerMw ?? 0

/** Bowline's unit price this quarter (its accelerator column; `signing` reads it for a reservation before it's on sale). */
export function bowlinePriceUsd(quarter: number, scenario: MarketKey | null | undefined, signing = false): number | undefined {
  const row = signing ? act5Row(actFirstQuarter(5), 's0.f1.v1') : act5Row(quarter, scenario)
  return row?.accel_unit_purchase_usd ?? undefined
}

// ---------- the quarter's end ----------

/** At each quarter's end (Acts IV-V, only with a stake or a reservation): milestones, calls, slips, the outcome. */
export function endQuarterAccelerator(state: GameState): void {
  const a = state.accelerator
  if (!a || a.ended || !(inActIV(state) || inActV(state))) return
  const q = state.quarter
  const d = acceleratorDraws(state)
  const held = a.stake > 0
  const budget = A.pitch.budget_usd
  const tranche = () => roundCents((a.stake * Math.max(0, d.m - 1) * budget) / 3)
  const call = (dueUsd: number) => {
    if (dueUsd <= 0 || !held) return
    if (a.call) answerAcceleratorCall(state, 'dilute')
    a.call = { dueUsd: roundCents(dueUsd) }
    logEntry(state, 'log.accel.call', { costUsd: roundCents(dueUsd) })
  }
  // before volume: this quarter's hazard (the same roll the replay uses)
  if (q < d.vol && q >= start()) {
    const h = hazardAt(state, q)
    if (h === 'cancelled') {
      a.ended = 'cancelled'
      a.stake = 0
      a.call = null
      if (a.reservation?.status === 'waiting') a.reservation.status = 'lost'
      logEntry(state, 'log.accel.cancelled')
      return
    }
    if (h === 'acquired_loss') {
      const usd = held ? roundCents(a.paidUsd * d.lossMult) : 0
      if (usd > 0) book(state, 'asset_sales', usd, { venture: 'accelerator' })
      refundReservation(state)
      a.ended = 'acquired_loss'
      a.stake = 0
      a.call = null
      roundCash(state)
      logEntry(state, 'log.accel.sold_loss', { priceUsd: usd })
      return
    }
    if (h === 'acquired_gain' && !a.blockedQuarters.includes(q)) {
      const priceUsd = roundCents(acceleratorMarkUsd(a) * d.gainMult)
      if (a.stake >= A.acquisition.gain.player_can_block_with_stake_ge) {
        a.saleOffer = { quarter: q, priceUsd }
        logEntry(state, 'log.accel.offer', { priceUsd })
      } else sellToBuyer(state, priceUsd)
      return
    }
  }
  // milestones reached at this quarter's end (visible from the next)
  const next = q + 1
  if (next === d.tape) {
    a.milestones += held ? 1 : 0
    logEntry(state, 'log.accel.tape_out')
    call(tranche())
  }
  if (next === d.sil) {
    a.milestones += held ? 1 : 0
    if (d.respins.length) {
      a.slips += held ? d.respins.length : 0
      logEntry(state, 'log.accel.respin', { quarters: d.respins.reduce((x, y) => x + y, 0) })
      call(tranche() + d.respins.length * A.respin.cash_call_share_of_pitch * budget * a.stake)
    } else {
      logEntry(state, 'log.accel.first_silicon')
      call(tranche())
    }
  }
  if (next === d.qual) {
    a.milestones += held ? 1 : 0
    logEntry(state, 'log.accel.qualified')
  }
  if (next === d.vol) {
    a.milestones += held ? 1 : 0
    call(tranche())
    a.markAtVolumeUsd = acceleratorMarkUsd(a)
    logEntry(state, d.foundryCapped ? 'log.accel.volume_capped' : 'log.accel.volume')
    if (a.reservation?.status === 'waiting') {
      a.reservation.status = 'delivered'
      a.reservation.deliveredQuarter = Math.max(next, actFirstQuarter(5))
      logEntry(state, 'log.accel.delivered', { mw: a.reservation.mw, pct: Math.round(a.reservation.discount * 100) })
    }
  }
  // a full year past the pitched volume without it: a slip (doc 49's marks)
  if (held && next < d.vol && next > pitchedVolume() && (next - pitchedVolume()) % 4 === 0) a.slips += 1
  // a delivered reservation not taken within its window lapses (the deposit is lost)
  const res = a.reservation
  if (res?.status === 'delivered' && res.deliveredQuarter !== undefined && next >= res.deliveredQuarter + A.allocation_reservation.must_take_delivery_within_q) {
    res.status = 'expired'
    logEntry(state, 'log.accel.expired')
  }
}

/**
 * A delivered reservation's discount on Bowline GPUs for a project of `mw`: the share of the order it covers ×
 * the discount, and the deposit credited (doc 49: "credited against the purchase"). Mine, reversible: one order uses it.
 */
export function reservationTerms(state: GameState, gpu: string): { discount: number; creditUsd: number } {
  const res = state.accelerator?.reservation
  if (gpu !== 'bowline' || !res || res.status !== 'delivered') return { discount: 0, creditUsd: 0 }
  return { discount: res.discount, creditUsd: res.depositUsd }
}

/** Marks the reservation as used by an order. */
export function useReservation(state: GameState): void {
  const res = state.accelerator?.reservation
  if (res?.status === 'delivered') res.status = 'used'
}

/** What the Ventures page shows (public facts only: nothing of the draws). */
export function acceleratorView(state: GameState) {
  if (!(inActIV(state) || inActV(state)) || state.quarter < start()) return null
  const a = state.accelerator
  const open = acceleratorOpen(state)
  return {
    open,
    pitchUsd: A.pitch.budget_usd,
    pitchedVolume: A.pitch.volume,
    pVolume: A.targets.p_volume_within_8_years,
    shares: A.equity_shares.map((s) => ({ stake: s, buyInUsd: acceleratorBuyInUsd(s), blocked: acceleratorJoinBlocker(state, s) ?? null })),
    stake: a?.stake ?? 0,
    valueUsd: acceleratorStakeValueUsd(state),
    milestones: a?.milestones ?? 0,
    slips: a?.slips ?? 0,
    ended: a?.ended ?? null,
    call: a?.call ?? null,
    saleOffer: a?.saleOffer ?? null,
    reservation: a?.reservation ?? null,
    reserveMenu: A.allocation_reservation.menu.flatMap((m, tier) =>
      A.allocation_reservation.reserved_mw.map((mw) => ({
        tier,
        mw,
        depositPct: Math.round(m.deposit_share * 100),
        discountPct: Math.round(m.discount * 100),
        depositUsd: reservationDepositUsd(state, mw, tier),
        blocked: reserveBlocker(state, mw, tier) ?? null,
      })),
    ),
    canBlock: (a?.stake ?? 0) >= A.acquisition.gain.player_can_block_with_stake_ge,
    bowlineOnSale: bowlineOnSale(state),
  }
}
