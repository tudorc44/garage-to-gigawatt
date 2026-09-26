// Capital: the funding ladder (capital.json). A raise is a fixed offer for now (no
// negotiation): money in, founder stake down, once per game, inside its window.
import { BALANCE, CONTENT, type LadderStep } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type GameState } from '../state.ts'
import { capacityKw, isReady } from './sites.ts'

export function getStep(id: string): LadderStep | undefined {
  return CONTENT.ladder[id]
}

export function raiseBandwidth(step: LadderStep): number {
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
  if (req.min_mw !== undefined) {
    const needKw = req.min_mw * 1000
    const has = state.sites.some(
      (s) => isReady(s, state.quarter) && capacityKw(s) >= needKw,
    )
    if (!has)
      return { key: 'error.raise_needs_site', params: { neededKw: needKw } }
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
  const q = CONTENT.quarters[state.quarter]
  const [from, to] = step.window
  if (q < from || q > to) {
    return { key: 'error.raise_window', params: { round: id, from, to } }
  }
  const unmet = unmetRequirement(state, step)
  if (unmet) return unmet
  const bw = raiseBandwidth(step)
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
}

/** Takes the round: cash in, stake diluted, Bandwidth spent. Call raiseBlocker first. */
export function takeRaise(state: GameState, id: string): void {
  const step = getStep(id)!
  state.bandwidth -= raiseBandwidth(step)
  state.cash += step.amount_usd
  state.founderStake *= 1 - step.dilution
  state.raisesDone.push(id)
  logEntry(state, 'log.raised', {
    round: id,
    amountUsd: step.amount_usd,
    dilutionPct: step.dilution,
    stakePct: state.founderStake,
  })
}
