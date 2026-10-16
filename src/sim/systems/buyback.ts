// Buying back shares (M79.2; doc 62 v1.0 §2), Act I. Before an IPO you can offer to buy part of one round's stake at the last valuation
// x 1.2 (one offer a quarter, 1 Bandwidth); the investor may refuse (30% base, +20 points when bitcoin is up over 50% on a year ago,
// -20 when it is down over 30%), drawn from `substream(seed, "buyback:<n>")`, so no other draw moves. Accepted: the company pays, the
// founder's stake rises, the round's stake falls (a whole round bought back closes it). After an IPO the open market sells up to 10% of
// the company a calendar year at the valuation (1 Bandwidth in each quarter you buy). With a loan outstanding a buy-back may not take
// cash below the next two quarters of its payments. Nothing here runs, and no state is written, in a game that never buys back.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { book, roundCash } from '../ledger.ts'
import { random, substream } from '../rng.ts'
import { logEntry, roundCents, type GameState } from '../state.ts'
import { isPublic } from './equity.ts'
import { marketWeek } from './market.ts'

const B = () => CONTENT.buyback

/** The company's value the offers are priced on: the last report's (the figure the Capital screen shows). */
export const buybackValuationUsd = (state: GameState): number => Math.max(0, state.reports.at(-1)?.valuationUsd ?? 0)

/**
 * Each round's stake in the company now, from the raises in the log (each later round dilutes the earlier ones), scaled so that
 * all investors together hold what the founder does not (rescues, warrants and events fold in proportionally).
 */
function derivedStakes(state: GameState): Record<string, number> {
  const w: Record<string, number> = {}
  for (const e of state.log) {
    if (e.key !== 'log.raised') continue
    const d = Number(e.params?.dilutionPct)
    const id = String(e.params?.round)
    if (!(d > 0)) continue
    for (const k of Object.keys(w)) w[k] *= 1 - d
    w[id] = d
  }
  return w
}

function normalised(stakes: Record<string, number>, founderStake: number): Record<string, number> {
  const sum = Object.values(stakes).reduce((n, x) => n + x, 0)
  const target = Math.max(0, 1 - founderStake)
  if (sum <= 0) return { ...stakes }
  return Object.fromEntries(Object.entries(stakes).map(([k, v]) => [k, (v * target) / sum]))
}

/** Each investor round's share of the whole company now (0 for a closed round). */
export function roundStakes(state: GameState): Record<string, number> {
  return normalised(state.buyback?.stakes ?? derivedStakes(state), state.founderStake)
}

/** Which way the market leans: a boom (bitcoin up over 50% on a year ago), a downturn (down over 30%) or neither. */
export function buybackClimate(state: GameState): 'boom' | 'downturn' | 'neutral' {
  try {
    const now = marketWeek(state.quarter, 0, null).btc_usd
    const before = marketWeek(state.quarter - 4, 0, null).btc_usd
    if (!(before > 0) || !(now > 0)) return 'neutral'
    const change = now / before - 1
    if (change > B().refusal.boom_btc_up) return 'boom'
    if (change < -B().refusal.downturn_btc_down) return 'downturn'
  } catch {
    // (no market a year back: the first year of Act I)
  }
  return 'neutral'
}

/** The chance an investor refuses an offer now. */
export function refusalChance(state: GameState): number {
  const r = B().refusal
  const c = buybackClimate(state)
  return Math.min(1, Math.max(0, r.base + (c === 'boom' ? r.boom_add : c === 'downturn' ? r.downturn_add : 0)))
}

/** What the next `quarters` quarters of loan payments come to (equipment, construction and crypto loans; an upper bound). */
export function loanPaymentsUsd(state: GameState, quarters: number): number {
  const W = BALANCE.weeksPerQuarter
  let total = 0
  for (const l of [...(state.equipmentLoan ? [state.equipmentLoan] : []), ...state.constructionLoans]) {
    const weeks = Math.min(Math.ceil(quarters * W), l.weeksLeft)
    total += Math.min(weeks * l.weeklyPrincipalUsd, l.balanceUsd) + (l.balanceUsd * l.apr * weeks) / (4 * W)
  }
  if (state.cryptoLoan) total += (state.cryptoLoan.balanceUsd * state.cryptoLoan.apr * Math.ceil(quarters * W)) / (4 * W)
  return roundCents(total)
}

function floorBlocker(state: GameState, costUsd: number): Message | undefined {
  const owed = loanPaymentsUsd(state, B().loan_floor_quarters)
  if (owed > 0 && state.cash - costUsd < owed)
    return { key: 'error.buyback_floor', params: { floorUsd: owed, cashUsd: state.cash } }
}

const calendarYear = (state: GameState): number => Number(CONTENT.quarters[state.quarter].slice(0, 4))

function record(state: GameState) {
  return (state.buyback ??= { stakes: normalised(derivedStakes(state), state.founderStake), draws: 0, closed: [], ipoBought: {} })
}

/** The price of `share` of a round's stake in a private offer. */
export function offerPriceUsd(state: GameState, round: string, share: number): number {
  return roundCents(buybackValuationUsd(state) * B().valuation_mult * (roundStakes(state)[round] ?? 0) * share)
}

export function buybackOfferBlocker(state: GameState, round: string, share: number): Message | undefined {
  if (state.act !== 1) return { key: 'error.buyback_act1' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (isPublic(state)) return { key: 'error.buyback_public' }
  const stake = roundStakes(state)[round] ?? 0
  if (!state.raisesDone.includes(round) || round === 'savings' || round === 'ipo_spac' || state.buyback?.closed.includes(round) || !(stake > 1e-9))
    return { key: 'error.buyback_no_round' }
  if (!(share > 0 && share <= 1)) return { key: 'error.bad_choice' }
  if (state.buyback?.lastOffer === state.quarter) return { key: 'error.buyback_once' }
  if (!(buybackValuationUsd(state) > 0)) return { key: 'error.buyback_no_value' }
  const bw = B().bandwidth
  if (state.bandwidth < bw) return { key: 'error.no_bandwidth', params: { needed: bw, have: state.bandwidth } }
  const cost = offerPriceUsd(state, round, share)
  if (cost > state.cash) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
  return floorBlocker(state, cost)
}

/** Makes the offer: the Bandwidth is spent; the investor accepts or refuses (the draw). */
export function offerBuyback(state: GameState, round: string, share: number): void {
  const bb = record(state)
  state.bandwidth -= B().bandwidth
  bb.lastOffer = state.quarter
  const chance = refusalChance(state)
  const refused = random(substream(state.seed, `buyback:${bb.draws++}`)) < chance
  if (refused) {
    bb.last = { quarter: state.quarter, round, accepted: false }
    logEntry(state, 'log.buyback_refused', { round })
    return
  }
  const stakes = roundStakes(state)
  const moved = stakes[round] * share
  const cost = offerPriceUsd(state, round, share)
  book(state, 'share_buybacks', -cost)
  roundCash(state)
  bb.stakes = { ...stakes, [round]: stakes[round] - moved }
  state.founderStake = Math.min(1, state.founderStake + moved)
  if (share >= 1 - 1e-9) {
    bb.closed.push(round)
    delete bb.stakes[round]
  }
  bb.last = { quarter: state.quarter, round, accepted: true }
  logEntry(state, 'log.buyback_accepted', { round, costUsd: cost, stakePct: state.founderStake })
}

/** How much of the company the open market can still sell you this calendar year (after an IPO). */
export function publicRoomPct(state: GameState): number {
  const used = state.buyback?.ipoBought[calendarYear(state)] ?? 0
  const held = roundStakes(state).ipo_spac ?? 0
  return Math.max(0, Math.min(B().public_cap_per_year - used, held))
}

export function buybackMarketBlocker(state: GameState, pct: number): Message | undefined {
  if (state.act !== 1) return { key: 'error.buyback_act1' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!isPublic(state)) return { key: 'error.buyback_not_public' }
  if (!(pct > 0) || pct > publicRoomPct(state) + 1e-9) return { key: 'error.buyback_cap', params: { roomPct: publicRoomPct(state) } }
  if (!(buybackValuationUsd(state) > 0)) return { key: 'error.buyback_no_value' }
  const bw = state.buyback?.marketQuarter === state.quarter ? 0 : B().bandwidth
  if (state.bandwidth < bw) return { key: 'error.no_bandwidth', params: { needed: bw, have: state.bandwidth } }
  const cost = roundCents(buybackValuationUsd(state) * pct)
  if (cost > state.cash) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
  return floorBlocker(state, cost)
}

/** Buys `pct` of the company on the open market at the valuation: no refusal. */
export function buybackMarket(state: GameState, pct: number): void {
  const bb = record(state)
  if (bb.marketQuarter !== state.quarter) {
    state.bandwidth -= B().bandwidth
    bb.marketQuarter = state.quarter
  }
  const cost = roundCents(buybackValuationUsd(state) * pct)
  const stakes = roundStakes(state)
  book(state, 'share_buybacks', -cost)
  roundCash(state)
  bb.stakes = { ...stakes, ipo_spac: Math.max(0, (stakes.ipo_spac ?? 0) - pct) }
  state.founderStake = Math.min(1, state.founderStake + pct)
  const year = calendarYear(state)
  bb.ipoBought[year] = (bb.ipoBought[year] ?? 0) + pct
  logEntry(state, 'log.buyback_market', { costUsd: cost, pct, stakePct: state.founderStake })
}

/** Called when a round closes: investors already tracked are diluted by it, and the new round's stake is its dilution. */
export function noteRaise(state: GameState, id: string, dilution: number): void {
  const bb = state.buyback
  if (!bb) return
  for (const k of Object.keys(bb.stakes)) bb.stakes[k] *= 1 - dilution
  bb.stakes[id] = dilution
}
