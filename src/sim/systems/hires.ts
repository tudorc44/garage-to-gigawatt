// Hires (hires.json, design thread 26 Sep 2026): five named people, at most one of each.
// Hiring costs Bandwidth and needs a quarter's salary in cash; the salary is paid weekly and
// counts in EBITDA. Firing is free in Bandwidth but costs severance, and the same person can't
// be rehired in the quarter they were fired. Each hire's effects are keys in hires.json:
//   failure_mult (Ops), read_market_bw + margin_warning_weeks (Trader), scout_extra_offers +
//   reveal_flaws (BD Lead, plus the investor pitch shift), build_quarters + power_negotiation_bonus
//   (Ex-Utility), bandwidth (Chief of Staff, from the quarter after hiring).
import {
  BALANCE,
  CONTENT,
  type Hire,
  type SiteTier,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type GameState } from '../state.ts'

export function getHire(id: string): Hire | undefined {
  return CONTENT.hires.list.find((h) => h.id === id)
}

export function isHired(state: GameState, id: string): boolean {
  return state.staff[id] !== undefined
}

function staffHires(state: GameState): Hire[] {
  return CONTENT.hires.list.filter((h) => isHired(state, h.id))
}

/**
 * Quarterly salary in a quarter: the yearly salary ÷ 4, straight line from the 2017 to the
 * 2021 value by year, then the 2021 value × salary_2022_mult in 2022.
 */
export function salaryUsdQ(hire: Hire, quarter: number): number {
  const year = Number(CONTENT.quarters[quarter].slice(0, 4))
  const { '2017': from, '2021': to } = hire.salary_usd_year
  const yearly =
    year >= 2022
      ? to * CONTENT.hires.salary2022Mult
      : from + ((to - from) * (Math.max(2017, year) - 2017)) / 4
  return yearly / 4
}

/** Severance for firing now: severance_quarters of this quarter's salary. */
export function severanceUsd(hire: Hire, quarter: number): number {
  return salaryUsdQ(hire, quarter) * CONTENT.hires.severanceQuarters
}

/** Pays one week of every salary. Returns the dollars paid. */
export function paySalariesWeek(state: GameState): number {
  const usd = staffHires(state).reduce(
    (sum, h) => sum + salaryUsdQ(h, state.quarter) / BALANCE.weeksPerQuarter,
    0,
  )
  state.cash -= usd
  return usd
}

// ---------- effects ----------

function numberEffect(h: Hire, key: string): number | undefined {
  const v = h.effect[key]
  return typeof v === 'number' ? v : undefined
}

/** Ops Manager: failure chance × this (1 with nobody on staff). */
export function failureMult(state: GameState): number {
  return staffHires(state).reduce(
    (m, h) => m * (numberEffect(h, 'failure_mult') ?? 1),
    1,
  )
}

/** BD Lead: extra offers per scouting. */
export function extraScoutOffers(state: GameState): number {
  return staffHires(state).reduce(
    (n, h) => n + (numberEffect(h, 'scout_extra_offers') ?? 0),
    0,
  )
}

/** BD Lead: scouted offers show their hidden flaw. */
export function revealsFlaws(state: GameState): boolean {
  return staffHires(state).some((h) => h.effect.reveal_flaws === true)
}

/** Chief of Staff: extra Bandwidth, only from the quarter after hiring. */
export function bandwidthBonus(state: GameState): number {
  return staffHires(state)
    .filter((h) => state.staff[h.id] < state.quarter)
    .reduce((n, h) => n + (numberEffect(h, 'bandwidth') ?? 0), 0)
}

/**
 * Ex-Utility Exec: a tier's build time with the staff you have. The cut never takes a build
 * below build_quarters_min, and builds already that short are unchanged (no instant builds).
 */
export function buildQuartersFor(state: GameState, tier: SiteTier): number {
  const base = tier.build_quarters
  let cut = 0
  let min = 0
  for (const h of staffHires(state)) {
    cut += numberEffect(h, 'build_quarters') ?? 0
    min = Math.max(min, numberEffect(h, 'build_quarters_min') ?? 0)
  }
  if (cut === 0 || base <= min) return base
  return Math.max(min, base + cut)
}

/** Ex-Utility Exec: how far the utility's hidden limit moves in your favour (0–1). */
export function powerNegotiationShift(state: GameState): number {
  return staffHires(state).some(
    (h) => numberEffect(h, 'power_negotiation_bonus') !== undefined,
  )
    ? CONTENT.negotiation.hireShift
    : 0
}

/** BD Lead (capital.json pitch hire_shift_source): how far the investor's limit rises. */
export function pitchShift(state: GameState): number {
  return isHired(state, CONTENT.pitch.hireShiftSource)
    ? CONTENT.pitch.hireShift
    : 0
}

/** Trader: Read the market costs this much Bandwidth. */
export function readMarketBandwidth(state: GameState): number {
  return staffHires(state).some(
    (h) => numberEffect(h, 'read_market_bw') !== undefined,
  )
    ? CONTENT.readMarket.bandwidthWithTrader
    : CONTENT.readMarket.bandwidth
}

/** Trader: the LTV warning becomes an alert that pauses the live quarter. */
export function marginWarningAlert(state: GameState): boolean {
  return staffHires(state).some(
    (h) => numberEffect(h, 'margin_warning_weeks') !== undefined,
  )
}

// ---------- actions ----------

/** Why this person can't be hired now, or undefined. Checks only. */
export function hireBlocker(state: GameState, id: string): Message | undefined {
  const hire = getHire(id)
  if (!hire) return { key: 'error.unknown_hire' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (isHired(state, id))
    return { key: 'error.already_hired', params: { hire: id } }
  if (
    !CONTENT.hires.rehireSameQuarter &&
    state.firedQuarter[id] === state.quarter
  )
    return { key: 'error.rehire_same_quarter', params: { hire: id } }
  const bw = CONTENT.hires.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  const needUsd =
    salaryUsdQ(hire, state.quarter) * CONTENT.hires.hireCashQuarters
  if (state.cash < needUsd)
    return {
      key: 'error.hire_needs_cash',
      params: { neededUsd: needUsd, hire: id },
    }
}

export function hire(state: GameState, id: string): void {
  const h = getHire(id)!
  state.bandwidth -= CONTENT.hires.bandwidth
  state.staff[id] = state.quarter
  logEntry(state, 'log.hired', {
    hire: id,
    salaryUsd: salaryUsdQ(h, state.quarter),
  })
}

/** Why this person can't be let go now, or undefined. Checks only. */
export function fireBlocker(state: GameState, id: string): Message | undefined {
  const h = getHire(id)
  if (!h) return { key: 'error.unknown_hire' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!isHired(state, id))
    return { key: 'error.not_hired', params: { hire: id } }
  const costUsd = severanceUsd(h, state.quarter)
  if (state.cash < costUsd)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
}

export function fire(state: GameState, id: string): void {
  const h = getHire(id)!
  const severance = severanceUsd(h, state.quarter)
  state.cash -= severance
  delete state.staff[id]
  state.firedQuarter[id] = state.quarter
  logEntry(state, 'log.fired', { hire: id, severanceUsd: severance })
}
