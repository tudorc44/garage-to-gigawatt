// Capital: the funding ladder (capital.json). A raise is money in, founder stake down, once
// per game, inside its window. The rounds in capital.json › pitch can also be negotiated
// (systems/pitch.ts); taking the offer takes the investor's opening valuation.
import { BALANCE, CONTENT, type LadderStep } from '../../content/index.ts'
import { book } from '../ledger.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type GameState } from '../state.ts'
import { capacityKw, isReady } from './sites.ts'

export function getStep(id: string): LadderStep | undefined {
  return CONTENT.ladder[id]
}

export function raiseBandwidth(step: LadderStep, state?: GameState): number {
  const card = state?.events.ipoBandwidth
  if (card && step.id === 'ipo_spac' && state!.quarter <= card.until)
    return card.bw
  return step.bandwidth ?? BALANCE.capital.raiseBandwidth
}

/**
 * `requires` from capital.json. min_mw means a site of at least that capacity that is
 * built and powered (energized), whether or not machines are running on it.
 * Capacity is the site's usable capacity (after an undersized-transformer flaw).
 */
export function unmetRequirement(
  state: GameState,
  step: LadderStep,
): Message | undefined {
  const req = step.requires
  if (!req) return
  // The seed (owner, 28 Sep 2026, answer 17): quarters in which you mined anything, at any site.
  if (req.min_quarters_operated !== undefined) {
    const operated = state.reports.filter((r) => r.revenueUsd > 0).length
    if (operated < req.min_quarters_operated)
      return {
        key: 'error.raise_needs_operation',
        params: { n: req.min_quarters_operated },
      }
  }
  if (req.min_mw !== undefined) {
    const needKw = req.min_mw * 1000
    const has = state.sites.some(
      (s) => isReady(s, state.quarter) && capacityKw(s) >= needKw,
    )
    if (!has)
      return { key: 'error.raise_needs_site', params: { neededKw: needKw } }
  }
  if (req.min_total_mw !== undefined) {
    const haveKw = state.sites
      .filter((s) => isReady(s, state.quarter))
      .reduce((kw, s) => kw + capacityKw(s), 0)
    if (haveKw < req.min_total_mw * 1000 - 1e-9)
      return {
        key: 'error.raise_needs_total_mw',
        params: {
          round: step.id,
          neededKw: req.min_total_mw * 1000,
          haveKw,
        },
      }
  }
  if (req.min_ebitda_usd_q !== undefined) {
    const last = state.reports.at(-1)?.ebitdaUsd ?? 0
    if (last < req.min_ebitda_usd_q) {
      return {
        key: 'error.raise_needs_ebitda',
        params: { neededUsd: req.min_ebitda_usd_q },
      }
    }
  }
}

/** Why this round can't be raised now, or undefined if it can. Checks, doesn't change anything. */
export function raiseBlocker(
  state: GameState,
  id: string,
): Message | undefined {
  const step = getStep(id)
  if (!step || !BALANCE.capital.openRounds.includes(id)) {
    return { key: 'error.round_not_available', params: { round: id } }
  }
  if (state.raisesDone.includes(id))
    return { key: 'error.raise_done', params: { round: id } }
  if (state.pitch) return { key: 'error.pitch_open' }
  const walked = state.pitchWalkaways[id]
  if (walked && state.quarter < walked.reopensQuarter) {
    const reopens = CONTENT.quarters[walked.reopensQuarter]
    return reopens && reopens <= step.window[1]
      ? { key: 'error.pitch_locked', params: { round: id, reopens } }
      : { key: 'error.pitch_lost', params: { round: id } }
  }
  const q = CONTENT.quarters[state.quarter]
  const [from, to] = step.window
  if (q < from || q > to) {
    return { key: 'error.raise_window', params: { round: id, from, to } }
  }
  const unmet = unmetRequirement(state, step)
  if (unmet) return unmet
  const bw = raiseBandwidth(step, state)
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
}

/** Takes the round at the investor's opening terms. Call raiseBlocker first. */
export function takeRaise(state: GameState, id: string): void {
  const step = getStep(id)!
  // A pitched round after a walk-away: the opening valuation is lower, so the share is bigger.
  const penalty = state.pitchWalkaways[id]?.penalty ?? 0
  const dilution =
    penalty > 0 && step.pre_money_usd !== undefined
      ? step.amount_usd / (step.pre_money_usd * (1 - penalty) + step.amount_usd)
      : step.dilution
  delete state.pitchWalkaways[id]
  completeRaise(state, id, dilution, raiseBandwidth(step, state))
}

/** Money in, stake diluted by `dilution`, Bandwidth spent, round marked as raised. */
export function completeRaise(
  state: GameState,
  id: string,
  dilution: number,
  bandwidth: number,
): void {
  const step = getStep(id)!
  state.bandwidth -= bandwidth
  book(state, 'equity_raised', step.amount_usd)
  state.founderStake *= 1 - dilution
  state.raisesDone.push(id)
  logEntry(state, 'log.raised', {
    round: id,
    amountUsd: step.amount_usd,
    dilutionPct: dilution,
    stakePct: state.founderStake,
  })
}
