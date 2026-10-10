// Act IV's orbital blocks in operation (M29.4; doc 33 §6.5, §7, §8.3, §11.3, §14.2). A block launched at the end of
// quarter q climbs through q+1 and goes live in q+2; it then earns each quarter (an orbital shell its tenant's rent per
// MW-year, a cloud its GPU-hours) until its true useful life runs out (hidden: the screens show the design life and the
// fleet telemetry). Live blocks face debris (a quarterly chance from their shell's congestion), the cascade when the busy
// shell closes, conjunction alerts and the solar storm. Late blocks pay their tenant 3% of the contract's yearly value a
// quarter. A block can be sold. The books: orbital revenue and costs are EBITDA, valued at the market's space multiple.
import { BALANCE, CONTENT, actLastQuarter } from '../../content/index.ts'
import { ORBIT, shell, tenantType } from '../../content/orbitContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book, bookSplit } from '../ledger.ts'
import { chance, random, randomInt, substream } from '../rng.ts'
import { act4SeedOf, inActIV, logEntry, type GameState, type OrbitalBlock } from '../state.ts'
import { trueReliability, TELEMETRY } from './fleetReliability.ts'
import {
  annualValueUsd,
  licensedMw,
  linkUnits,
  orbitBlock,
  orbitOf,
  orbitRow,
  usedLicenceMw,
} from './orbit.ts'
import { insuranceQuote, insuredNow, settleOrbitLoss } from './orbitLaunch.ts'
import { repayFromProceeds } from './orbitCapital.ts'
import { staffEffect, staffNumber } from './hires.ts'

const SAT = ORBIT.satellites
const DEB = ORBIT.shells.debris
const INS = ORBIT.insurance
const TEN = ORBIT.tenants
const W = (id: string) => CONTENT.wildcardsIv.wildcards.find((w) => w.id === id)!.effect

/** The orbital alerts (doc 33 §14.2) and their choices; the first is the default. */
export const ORBIT_ALERTS = {
  orbit_conjunction: ['manoeuvre', 'accept'],
  orbit_storm: ['safe_mode', 'ride'],
} as const
export type OrbitAlertId = keyof typeof ORBIT_ALERTS
export const isOrbitAlert = (id: string): id is OrbitAlertId => id in ORBIT_ALERTS

/** Live blocks (earning this quarter). */
const liveBlocks = (state: GameState) => (state.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live')

/** The sum of 12 uniform rolls minus 6: a standard normal value from + − only (replays never differ by browser). */
function normal(r: ReturnType<typeof substream>): number {
  let z = -6
  for (let i = 0; i < 12; i++) z += random(r)
  return z
}

// ---------- the start of a quarter ----------

/** Climbing blocks go live (their true life starts counting); blocks at the end of their life deorbit; terms end. */
export function startQuarterOrbitLive(state: GameState): void {
  if (!state.act4Orbit || !state.futureId) return
  const life = trueReliability(state.futureId).lifeYears
  for (const b of state.act4Orbit.blocks) {
    if (b.stage === 'climbing' && b.liveQuarter !== null && b.liveQuarter <= state.quarter) {
      b.stage = 'live'
      b.retireQuarter = b.liveQuarter + Math.round(life * 4)
      if (b.insured && b.insured.untilQuarter === null) b.insured.untilQuarter = b.liveQuarter + 3
      if (b.tenant && b.tenant !== 'spot') b.tenant.endQuarter = b.liveQuarter + b.tenant.termQuarters
      logEntry(state, 'log.orbit.live', { n: b.n, mw: b.mw })
    }
    if (b.stage === 'live' && b.retireQuarter !== null && b.retireQuarter <= state.quarter) {
      b.stage = 'retired'
      logEntry(state, 'log.orbit.retired', { n: b.n })
      continue
    }
    if (b.stage === 'live' && b.tenant && b.tenant !== 'spot' && b.tenant.endQuarter !== null && b.tenant.endQuarter <= state.quarter) {
      logEntry(state, 'log.orbit.term_ended', { n: b.n, tenantName: tenantType(b.tenant.type).name })
      b.tenant = 'spot'
    }
  }
}

// ---------- the alerts (planned at the end of the Plan phase, fired in their week) ----------

/** Plans the quarter's orbit alerts: a conjunction per live block by its shell's congestion; the storm in its quarter. */
export function planOrbitAlerts(state: GameState): void {
  const orbit = state.act4Orbit
  if (!orbit || !inActIV(state)) return
  orbit.planned = []
  const row = orbitRow(state)
  for (const b of liveBlocks(state)) {
    const r = substream(act4SeedOf(state), `orbit_conjunction:${b.id}:${state.quarter}`)
    const congestion = row[shell(b.shell).congestion_column]
    if (chance(r, Math.min(1, DEB.conjunction_alert_chance_per_congestion_point * congestion)))
      orbit.planned.push({ week: randomInt(r, 1, BALANCE.weeksPerQuarter - 2), kind: 'orbit_conjunction', blockId: b.id })
  }
  const storm = state.act4Wildcards?.find((w) => w.id === 'solar_storm' && w.quarter === state.quarter)
  if (storm && orbit.blocks.some((b) => b.stage === 'live' || b.stage === 'climbing')) {
    const r = substream(act4SeedOf(state), `orbit_storm:${state.quarter}`)
    orbit.planned.push({ week: randomInt(r, 1, BALANCE.weeksPerQuarter - 2), kind: 'orbit_storm' })
  }
  orbit.planned.sort((a, b) => a.week - b.week)
}

/** In the live quarter: an orbit alert due this week pauses the quarter (or, past the alert limit, takes its default). */
export function checkOrbitAlerts(state: GameState): void {
  const orbit = state.act4Orbit
  if (!orbit || orbit.planned.length === 0 || state.interrupt) return
  const due = orbit.planned.find((p) => p.week <= state.week)
  if (!due) return
  orbit.planned.splice(orbit.planned.indexOf(due), 1)
  if (due.kind === 'orbit_storm') stormHitsClimbing(state)
  state.interrupt = { id: due.kind, week: state.week, coin: 'BTC', changePct: 0, ...(due.blockId ? { orbitBlockId: due.blockId } : {}) }
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) {
    resolveOrbitAlert(state, ORBIT_ALERTS[due.kind][0])
    return
  }
  state.interruptsThisQuarter++
}

/** The storm costs blocks still climbing to their orbit a share of their capacity (their launch cover pays). */
function stormHitsClimbing(state: GameState): void {
  const share = Number(W('solar_storm').climbing_loss_share)
  for (const b of state.act4Orbit!.blocks.filter((x) => x.stage === 'climbing')) {
    const lossUsd = b.capexSpentUsd * b.capacity * share
    b.capacity *= 1 - share
    const payoutUsd = settleOrbitLoss(state, b, lossUsd, share)
    logEntry(state, 'log.orbit.storm_climbing', { n: b.n, lossUsd, payoutUsd }, state.week + 1)
  }
}

export const orbitAlertChoices = (state: GameState): string[] =>
  state.interrupt && isOrbitAlert(state.interrupt.id) ? [...ORBIT_ALERTS[state.interrupt.id]] : []

export const orbitAlertDefault = (state: GameState): string => ORBIT_ALERTS[state.interrupt!.id as OrbitAlertId][0]

/** Applies a choice. Conjunction: manoeuvre (a quarter of life) or accept the risk. Storm: safe mode or ride it out. */
export function resolveOrbitAlert(state: GameState, choice: string): Message | undefined {
  const active = state.interrupt!
  if (!orbitAlertChoices(state).includes(choice)) return { key: 'error.bad_choice' }
  const week = active.week + 1
  if (active.id === 'orbit_conjunction') {
    const b = orbitBlock(state, active.orbitBlockId!)!
    if (choice === 'manoeuvre') {
      if (b.retireQuarter !== null) b.retireQuarter -= DEB.manoeuvre_life_quarters
      logEntry(state, 'log.orbit.manoeuvre', { n: b.n }, week)
    } else {
      const r = substream(act4SeedOf(state), `orbit_accept:${b.id}:${state.quarter}`)
      if (chance(r, DEB.conjunction_accept_hit_share)) debrisHit(state, b, week)
      else logEntry(state, 'log.orbit.accept_missed', { n: b.n }, week)
    }
  } else if (choice === 'safe_mode') {
    orbitOf(state).safeModeQuarter = state.quarter
    logEntry(state, 'log.orbit.safe_mode', { weeks: Number(W('solar_storm').safe_mode_weeks) }, week)
  } else {
    const share = Number(W('solar_storm').ride_gpu_loss_share)
    for (const b of liveBlocks(state)) b.capacity *= 1 - share
    logEntry(state, 'log.orbit.rode_storm', { lossPct: share }, week)
  }
  state.interrupt = null
}

/** A debris strike: the block loses a share of its capacity; in-orbit cover pays its share. */
function debrisHit(state: GameState, b: OrbitalBlock, week: number | null = null): void {
  const share = DEB.loss_capacity_share
  const lossUsd = b.capexSpentUsd * b.capacity * share
  b.capacity *= 1 - share
  const payoutUsd = settleOrbitLoss(state, b, lossUsd, share)
  logEntry(state, 'log.orbit.debris', { n: b.n, lossUsd, payoutUsd }, week)
}

// ---------- the end of a quarter ----------

/** One live block's revenue for the quarter (before any prepayment is credited). */
export function blockRevenueUsd(state: GameState, b: OrbitalBlock, linkShare: number): number {
  const row = orbitRow(state)
  const t = b.tenant
  let yearly: number
  if (b.kind === 'shell') {
    yearly = t && t !== 'spot' ? t.price * b.mw : row.orbital_shell_rent_usd_mw_yr * SAT.spot_shell_rent_share * b.mw
  } else {
    const contracted = t && t !== 'spot'
    const price = contracted ? t.price : row.orbital_gpu_usd_hr
    const util = contracted ? SAT.utilisation.contracted : SAT.utilisation.spot
    yearly = price * SAT.gpus.gpus_per_mw * b.mw * 8760 * util * Math.min(1, b.gpuHealth)
  }
  const safeMode = orbitOf(state).safeModeQuarter === state.quarter
  const weeks = BALANCE.weeksPerQuarter
  const safeShare = safeMode ? 1 - Number(W('solar_storm').safe_mode_weeks) / weeks : 1
  // (M31.2) a co-funding partner takes its share of the revenue
  return (yearly / 4) * b.capacity * linkShare * safeShare * (1 - (b.cofundShare ?? 0))
}

/** Link units an interactive tenant needs on this block. */
export const linkUnitsNeeded = (b: OrbitalBlock): number =>
  b.tenant && b.tenant !== 'spot' && tenantType(b.tenant.type).workload === 'interactive'
    ? TEN.links.units_per_mw_interactive * b.mw
    : 0

/** The share of each live block's interactive work your link units carry (filled in block order). */
export function linkShares(state: GameState): Map<string, number> {
  let left = linkUnits(state)
  const shares = new Map<string, number>()
  for (const b of liveBlocks(state)) {
    const need = linkUnitsNeeded(b)
    if (need === 0) {
      shares.set(b.id, 1)
      continue
    }
    const got = Math.min(need, left)
    left -= got
    shares.set(b.id, got / need)
  }
  return shares
}

/**
 * At the end of a quarter: live blocks earn and pay their running costs; late blocks pay their tenants; telemetry,
 * GPU wear and debris are rolled; the cascade strikes the busy shell when it closes; the licence milestone is checked.
 */
export function endQuarterOrbit(state: GameState): void {
  const orbit = state.act4Orbit
  if (!orbit || !inActIV(state) || !state.futureId) return
  const st = state.quarterStats
  st.orbitRevenueUsd ??= 0
  st.orbitCostUsd ??= 0
  const row = orbitRow(state)
  const truth = trueReliability(state.futureId)
  const shares = linkShares(state)
  for (const b of liveBlocks(state)) {
    const revenueUsd = blockRevenueUsd(state, b, shares.get(b.id) ?? 1)
    // M34.1 (owner, 9 Oct 2026, 1a): in-orbit cover is a running cost orbit pays and the ground doesn't. Once the launch
    // year's cover ends it renews quarter by quarter (the in-orbit rate on the block's value, to the market's capacity),
    // charged with the running costs.
    const quote = insuranceQuote(state, b)
    const premiumQUsd = quote && quote.coverUsd > 0 ? quote.premiumUsd / 4 : 0
    if (quote && premiumQUsd > 0) b.insured = { coverUsd: quote.coverUsd, untilQuarter: state.quarter }
    const opsUsd = (SAT.ops_usd_mw_yr * b.mw) / 4 + premiumQUsd
    let cashUsd = revenueUsd
    let usedUsd = 0
    if (b.tenant && b.tenant !== 'spot' && b.tenant.prepaidLeftUsd > 0) {
      const used = Math.min(b.tenant.prepaidLeftUsd, revenueUsd)
      b.tenant.prepaidLeftUsd -= used
      cashUsd -= used
      usedUsd = used
    }
    const ref = { block: b.id }
    // (the revenue counts in full; the part a prepayment covers comes off the prepayment)
    bookSplit(state, cashUsd - opsUsd, [
      ['orbit_revenue', revenueUsd, ref],
      ['prepayments', -usedUsd, { ...ref, biz: 'orbit' }],
      ['orbit_opex', -(opsUsd - premiumQUsd), ref],
      ['insurance', -premiumQUsd, { ...ref, biz: 'orbit' }],
    ])
    st.orbitRevenueUsd += revenueUsd
    st.orbitCostUsd += opsUsd
    b.lastEbitdaUsd = revenueUsd - opsUsd
    // Telemetry: this quarter's failures as a yearly rate, the truth plus noise (smaller blocks read noisier).
    const r = substream(act4SeedOf(state), `orbit_ops:${b.id}:${state.quarter}`)
    // (M31.4: the Space Operations Chief cuts failures 25% and halves the telemetry's noise)
    const chief = staffEffect(state, 'orbit_failure_mult') !== undefined
    const failureShareYr = truth.failureShareYr * staffNumber(state, 'orbit_failure_mult', 1)
    const sd = TELEMETRY.noiseSdPctPoints * Math.sqrt(10 / b.mw) * (chief ? TELEMETRY.spaceOpsNoiseMult : 1)
    b.telemetry.push({
      quarter: state.quarter,
      failurePctYr: Math.max(0, failureShareYr * 100 + normal(r) * sd),
    })
    if (b.kind === 'cloud') b.gpuHealth *= 1 - failureShareYr / 4
    // Debris: a quarterly chance from the shell's congestion.
    const congestion = row[shell(b.shell).congestion_column]
    const p = (DEB.base_loss_pct_q / 100) * (congestion / DEB.reference_congestion) ** DEB.exponent
    if (chance(r, Math.min(1, p))) debrisHit(state, b)
  }
  // Lateness: a contracted block that isn't live by its due quarter pays its tenant each quarter.
  for (const b of orbit.blocks) {
    const t = b.tenant
    if (!t || t === 'spot' || t.dueQuarter === null || b.stage === 'live' || b.stage === 'retired' || b.stage === 'sold')
      continue
    if (state.quarter < t.dueQuarter) continue
    const penaltyUsd = TEN.late_penalty_share_of_acv * annualValueUsd(b.kind, b.mw, t.price)
    book(state, 'one_offs', -penaltyUsd, { block: b.id, biz: 'orbit' })
    st.orbitCostUsd += penaltyUsd
    logEntry(state, 'log.orbit.late', { n: b.n, penaltyUsd })
  }
  // Link units rented.
  const linkRentUsd = (orbit.linksRented * TEN.links.rent_unit_usd_yr) / 4
  book(state, 'orbit_opex', -linkRentUsd)
  st.orbitCostUsd += linkRentUsd
  // The cascade: when the busy shell closes, its live blocks lose a large share (once).
  if (!orbit.cascadeDone && row.sso_closed === 1) {
    orbit.cascadeDone = true
    const share = DEB.cascade_capacity_loss_share
    for (const b of liveBlocks(state).filter((x) => x.shell === 'sso')) {
      const lossUsd = b.capexSpentUsd * b.capacity * share
      b.capacity *= 1 - share
      const payoutUsd = settleOrbitLoss(state, b, lossUsd, share)
      logEntry(state, 'log.orbit.cascade', { n: b.n, lossUsd, payoutUsd })
    }
    // M34.1 (owner, 9 Oct 2026, 1c): the cascade hardens the insurance market for the rebuild, whoever lost what:
    // from now until a year after the shell reopens (mine, reversible: "applies to the rebuild").
    let reopen = state.quarter
    while (reopen < actLastQuarter(4) && orbitRow(state, reopen).sso_closed === 1) reopen++
    orbit.hardMarketUntil = Math.max(
      orbit.hardMarketUntil ?? -1,
      reopen + INS.hard_market.quarters - 1,
    )
    logEntry(state, 'log.orbit.hard_market_cascade', {
      quarter: CONTENT.quarters[orbit.hardMarketUntil] ?? '',
    })
  }
  checkLicenceMilestone(state)
}

/** The deployment milestone (simplified FCC rules): too little of a shell's licensed MW live by the date halves it. */
function checkLicenceMilestone(state: GameState): void {
  const m = ORBIT.licences.milestones
  if (state.quarter !== CONTENT.quarters.indexOf(m.due)) return
  for (const id of new Set(state.act4Orbit!.licences.map((l) => l.shell))) {
    const licensed = licensedMw(state, id)
    const live = liveBlocks(state).filter((b) => b.shell === id).reduce((mw, b) => mw + b.mw, 0)
    if (licensed === 0 || live >= m.share_live * licensed) continue
    // M34.1 (owner, 9 Oct 2026, 2c): the cut shrinks the undeployed authorisation, never below the MW in use (as the
    // real milestone rules do); it still leaves no room for new builds.
    const inUse = usedLicenceMw(state, id)
    const open = state.act4Orbit!.licences.filter((x) => x.shell === id && !x.milestoneChecked)
    const approved = open.filter((l) => l.approvedQuarter <= state.quarter)
    const openMw = approved.reduce((mw, l) => mw + l.filedMw, 0)
    const keptMw = licensed - openMw
    const cutTo = Math.max(openMw * (1 - m.shrink_share), inUse - keptMw)
    const factor = openMw > 0 ? Math.min(1, cutTo / openMw) : 1
    for (const l of open) {
      // (a filing still pending is cut as before; nothing of it is in use)
      l.filedMw *= approved.includes(l) ? factor : 1 - m.shrink_share
      l.milestoneChecked = true
    }
    logEntry(state, 'log.orbit.milestone_missed', {
      shellName: id,
      licensedKw: licensedMw(state, id) * 1000,
      inUseKw: inUse * 1000,
    })
  }
}

// ---------- selling a block (1 Bandwidth) ----------

export const ORBIT_SALE_BANDWIDTH = 1

/**
 * M34.1 (owner, 9 Oct 2026, 2b): the quarterly EBITDA a block is priced on: its last booked quarter's, or before its first
 * one, its contracted run-rate (this quarter's revenue at its tenant's price, or spot, less its running cost). A new block
 * is never worth $0, so a forced sale in distress doesn't give it away.
 */
export function blockPricingEbitdaUsd(state: GameState, b: OrbitalBlock): number {
  if (b.lastEbitdaUsd !== undefined) return b.lastEbitdaUsd
  return blockRevenueUsd(state, b, linkShares(state).get(b.id) ?? 1) - (SAT.ops_usd_mw_yr * b.mw) / 4
}

/** What a buyer pays for a live block now: its run-rate EBITDA × the space multiple, at a quick sale's discount. */
export function blockSaleUsd(state: GameState, b: OrbitalBlock): number {
  return Math.max(
    0,
    blockPricingEbitdaUsd(state, b) * 4 * orbitRow(state).space_ev_ebitda_mult * SAT.sale_share_of_value,
  )
}

export function sellOrbitalBlockBlocker(state: GameState, blockId: string): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const b = orbitBlock(state, blockId)
  if (!b || b.stage !== 'live') return { key: 'error.orbit_not_live' }
  if (state.bandwidth < ORBIT_SALE_BANDWIDTH)
    return { key: 'error.no_bandwidth', params: { needed: ORBIT_SALE_BANDWIDTH, have: state.bandwidth } }
}

/** Sells a live block: the cash now; its tenant, its licence MW and its future go with it. */
export function sellOrbitalBlock(state: GameState, blockId: string): void {
  const b = orbitBlock(state, blockId)!
  const priceUsd = blockSaleUsd(state, b)
  state.bandwidth -= ORBIT_SALE_BANDWIDTH
  // (M31.2) the proceeds repay the block's lender first
  const netUsd = repayFromProceeds(state, b, priceUsd)
  bookSplit(state, netUsd, [
    ['asset_sales', priceUsd, { block: b.id, biz: 'orbit' }],
    ['debt_repaid', -(priceUsd - netUsd)],
  ])
  b.stage = 'sold'
  logEntry(state, 'log.orbit.sold', { n: b.n, priceUsd })
}

// ---------- valuation (doc 33 §11.3) ----------

/** Orbital blocks being built, awaiting launch or climbing, at the capex spent so far (the construction term). */
export function orbitConstructionUsd(state: GameState): number {
  return (state.act4Orbit?.blocks ?? [])
    .filter((b) => b.stage === 'building' || b.stage === 'awaiting_launch' || b.stage === 'climbing')
    // (a co-funding partner owns its share)
    .reduce((usd, b) => usd + b.capexSpentUsd * b.capacity * (1 - (b.cofundShare ?? 0)), 0)
}

/** The market's space multiple this quarter (the orbital unit's EV/EBITDA). */
export const spaceMultiple = (state: GameState): number => orbitRow(state).space_ev_ebitda_mult

/** Whether a block is insured now (for the screens). */
export const blockInsuredNow = insuredNow
