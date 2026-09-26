// Investor pitches (capital.json › pitch, design thread 26 Sep 2026). Instead of taking a
// round's fixed offer you pay Bandwidth to haggle over the pre-money valuation: the amount
// raised stays fixed, so a higher valuation means giving away a smaller share.
// The investor opens at the round's pre_money_usd (lower after walk-aways) and has a hidden
// limit, the highest valuation it will sign: opening × U(limit_range) × (1 + hire_shift).
// Each round you counter with a valuation:
//   at or under the limit → signed at your valuation;
//   within lowball_margin above it → the investor comes back halfway between its offer and limit;
//   further above (overreaching) → walkaway_chance that it walks away, else it comes back halfway.
// When the limit is below the opening the investor holds at the opening (accepting stays safe).
// After `rounds` counters their offer is final. A walk-away (either side) closes the round for
// lockout_quarters and reopens it at the opening − walkaway_penalty, stacking to the max; a deal
// resets it. Bandwidth is spent either way. The rolls use their own stream.
import { CONTENT, type LadderStep } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { substream, uniform } from '../rng.ts'
import { logEntry, type GameState } from '../state.ts'
import { completeRaise, getStep, raiseBlocker } from './capital.ts'
import { pitchShift } from './hires.ts'

export interface InvestorPitch {
  /** The funding round (capital.json ladder id). */
  id: string
  /** The round's fixed amount in dollars. */
  amountUsd: number
  openingUsd: number
  /** The investor's current offer (pre-money valuation). */
  offerUsd: number
  /** Hidden: the highest valuation the investor will sign. The UI must never show it. */
  limitUsd: number
  /** Counters made so far. */
  round: number
  /** Rounds are used up: only accepting the last offer or walking away is left. */
  final: boolean
  /** Each counter and what the investor did. */
  history: { counterUsd: number; reply: 'counter' | 'deal' | 'walked' }[]
  /** Position of this pitch's own random stream. */
  rng: number
  /** The BD Lead's raise of the limit, fixed when the pitch started (0 without). */
  shift: number
}

/** A round's walk-away record: the opening discount and the first quarter it reopens. */
export interface PitchWalkaway {
  penalty: number
  reopensQuarter: number
}

export function canPitch(id: string): boolean {
  return CONTENT.pitch.appliesTo.includes(id)
}

/** The investor's opening valuation for a round now, after any walk-away penalty. */
export function openingPreMoneyUsd(state: GameState, id: string): number {
  const step = getStep(id)!
  const penalty = state.pitchWalkaways[id]?.penalty ?? 0
  return step.pre_money_usd! * (1 - penalty)
}

/** Share of the company the round's fixed amount buys at this pre-money valuation. */
export function dilutionAt(step: LadderStep, preMoneyUsd: number): number {
  return step.amount_usd / (preMoneyUsd + step.amount_usd)
}

/**
 * True if walking away now would end the round for good: the lockout runs past the round's
 * window, so the UI warns before a counter or a walk-out (warn_if_lockout_exceeds_window).
 */
export function walkawayEndsRound(state: GameState, id: string): boolean {
  const step = getStep(id)
  if (!step || !CONTENT.pitch.warnIfLockoutExceedsWindow) return false
  const last = CONTENT.quarters.indexOf(step.window[1])
  return state.quarter + CONTENT.pitch.lockoutQuarters > last
}

/** Why a pitch can't start now, or undefined. Checks only. */
export function pitchBlocker(
  state: GameState,
  id: string,
): Message | undefined {
  if (!canPitch(id)) return { key: 'error.cant_pitch', params: { round: id } }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (state.negotiation) return { key: 'error.negotiation_open' }
  const blocked = raiseBlocker(state, id)
  if (blocked && blocked.key !== 'error.no_bandwidth') return blocked
  const bw = CONTENT.pitch.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
}

/** Starts the pitch: Bandwidth spent, opening valuation on the table, hidden limit drawn. */
export function startPitch(state: GameState, id: string): void {
  const rules = CONTENT.pitch
  const step = getStep(id)!
  const r = substream(state.seed, `pitch:${state.quarter}:${id}`)
  const opening = openingPreMoneyUsd(state, id)
  const shift = pitchShift(state)
  const limit = opening * uniform(r, ...rules.limitRange) * (1 + shift)
  state.bandwidth -= rules.bandwidth
  state.pitch = {
    id,
    amountUsd: step.amount_usd,
    openingUsd: opening,
    offerUsd: opening,
    limitUsd: limit,
    round: 0,
    final: false,
    history: [],
    rng: r.rng,
    shift,
  }
  logEntry(state, 'log.pitch_started', {
    round: id,
    amountUsd: step.amount_usd,
    openingUsd: opening,
  })
}

/** Signs at this valuation: money in, stake diluted, walk-away penalty cleared. */
function deal(state: GameState, preMoneyUsd: number): void {
  const p = state.pitch!
  const step = getStep(p.id)!
  logEntry(state, 'log.pitch_deal', {
    round: p.id,
    preMoneyUsd,
    openingUsd: p.openingUsd,
  })
  delete state.pitchWalkaways[p.id]
  state.pitch = null
  completeRaise(state, p.id, dilutionAt(step, preMoneyUsd), 0)
}

/** No deal: the round closes for the lockout and reopens with a lower opening. */
function walkAway(state: GameState, by: 'you' | 'investor'): void {
  const rules = CONTENT.pitch
  const p = state.pitch!
  state.pitch = null
  if (by === 'you' && !rules.playerWalkoutPenalized) {
    logEntry(state, 'log.pitch_you_walked_free', { round: p.id })
    return
  }
  const before = state.pitchWalkaways[p.id]?.penalty ?? 0
  const penalty = Math.min(
    rules.walkawayPenaltyMax,
    before + rules.walkawayPenalty,
  )
  const reopensQuarter = state.quarter + rules.lockoutQuarters
  state.pitchWalkaways[p.id] = { penalty, reopensQuarter }
  const step = getStep(p.id)!
  const reopens = CONTENT.quarters[reopensQuarter]
  const lost = !reopens || reopens > step.window[1]
  const who = by === 'you' ? 'you' : 'they'
  logEntry(
    state,
    lost ? `log.pitch_${who}_walked_lost` : `log.pitch_${who}_walked`,
    lost
      ? { round: p.id }
      : {
          round: p.id,
          reopens,
          openingUsd: step.pre_money_usd! * (1 - penalty),
        },
  )
}

/** One round: your counter-offer, a pre-money valuation in dollars. */
export function pitchCounter(
  state: GameState,
  preMoneyUsd: number,
): Message | undefined {
  const p = state.pitch
  if (!p) return { key: 'error.no_pitch' }
  if (p.final) return { key: 'error.negotiation_final' }
  if (!(preMoneyUsd > 0)) return { key: 'error.bad_amount' }
  const rules = CONTENT.pitch
  p.round++
  // Asking for less than they offer is just taking their offer.
  if (preMoneyUsd <= p.offerUsd) {
    p.history.push({ counterUsd: preMoneyUsd, reply: 'deal' })
    deal(state, p.offerUsd)
    return
  }
  if (preMoneyUsd <= p.limitUsd) {
    p.history.push({ counterUsd: preMoneyUsd, reply: 'deal' })
    deal(state, preMoneyUsd)
    return
  }
  const overreach = preMoneyUsd > p.limitUsd * (1 + rules.lowballMargin)
  if (overreach) {
    const r = { rng: p.rng }
    const walks = uniform(r, 0, 1) < rules.walkawayChance
    p.rng = r.rng
    if (walks) {
      p.history.push({ counterUsd: preMoneyUsd, reply: 'walked' })
      walkAway(state, 'investor')
      return
    }
  }
  // Halfway toward the limit; when the limit is below the offer, they hold (hold_at_opening).
  p.offerUsd = Math.max(p.offerUsd, (p.offerUsd + p.limitUsd) / 2)
  p.history.push({ counterUsd: preMoneyUsd, reply: 'counter' })
  if (p.round >= rules.rounds) p.final = true
}

/** Take the investor's current offer. */
export function pitchAccept(state: GameState): Message | undefined {
  if (!state.pitch) return { key: 'error.no_pitch' }
  deal(state, state.pitch.offerUsd)
}

/** Walk out of the pitch: the round closes for the lockout, and reopens lower. */
export function pitchWalk(state: GameState): Message | undefined {
  if (!state.pitch) return { key: 'error.no_pitch' }
  walkAway(state, 'you')
}

/**
 * Walk-away risk of a counter, from the public rules only (never the hidden limit): the limit
 * lies between the lowest and highest it could be, so a counter is "none" if it can't be an
 * overreach, "high" if it must be one, and "possible" in between.
 */
export function pitchCounterRisk(
  state: GameState,
  preMoneyUsd: number,
): 'none' | 'possible' | 'high' {
  const p = state.pitch
  if (!p) return 'none'
  const rules = CONTENT.pitch
  const edge = (m: number) =>
    p.openingUsd * m * (1 + p.shift) * (1 + rules.lowballMargin)
  if (preMoneyUsd <= edge(rules.limitRange[0])) return 'none'
  if (preMoneyUsd > edge(rules.limitRange[1])) return 'high'
  return 'possible'
}
