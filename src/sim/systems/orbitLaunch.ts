// Act IV's launch manifests and insurance (M29.3; doc 33 §8, IV-D14, IV-D15). A block's Launch slot is one booking: a
// provider, a target quarter 2-6 ahead and the $/kg locked at booking, with a 15% deposit (refundable only after the
// provider slips). The build starts at the end of the Plan phase once all three slots are filled and a licence has room;
// the launch is tried at the end of its quarter: a grounding, a closed shell, a provider slip or (in a tight quarter)
// the dominant launcher's bump moves it a quarter; otherwise the rest is paid and the launch can fail (seeded, by the
// provider's maturity). Insurance covers launch and the first year in orbit, capped by the market's capacity; a big
// loss hardens the market. (Live operation, debris and the alerts are in orbitOps.ts.)
import { CONTENT, actLastQuarter } from '../../content/index.ts'
import { ORBIT, PROVIDER_IDS, provider, shell, type ProviderId } from '../../content/orbitContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { chance, substream } from '../rng.ts'
import { act4SeedOf, inActIV, logEntry, type GameState, type OrbitalBlock } from '../state.ts'
import { licenceRoom, orbitBlock, orbitOf, orbitRow } from './orbit.ts'
import { wildcardFiredIv } from './wildcardsIv.ts'
import { buildCostMult, debtAfterLoss, ownShare, payCapex, repayFromProceeds } from './orbitCapital.ts'
import { staffEffect, staffNumber } from './hires.ts'

const L = ORBIT.launch
const SAT = ORBIT.satellites
const INS = ORBIT.insurance

/** The calendar year (fractional) of a quarter index, for the providers' failure curves. */
function yearOf(quarter: number): number {
  const label = CONTENT.quarters[quarter] ?? '2031Q1'
  return Number(label.slice(0, 4)) + (Number(label.slice(5)) - 1) / 4
}

/** A provider's launch failure chance (a share) in a quarter: its by-year curve, interpolated, flat beyond its ends. */
export function launchFailureShare(id: ProviderId, quarter: number): number {
  const points = Object.entries(provider(id).failure_pct_by_year)
    .map(([y, pct]) => [Number(y), pct] as const)
    .sort((a, b) => a[0] - b[0])
  const y = yearOf(quarter)
  if (y <= points[0][0]) return points[0][1] / 100
  for (let i = 1; i < points.length; i++) {
    const [y1, p1] = points[i]
    const [y0, p0] = points[i - 1]
    if (y <= y1) return (p0 + ((p1 - p0) * (y - y0)) / (y1 - y0)) / 100
  }
  return points[points.length - 1][1] / 100
}

/** The $/kg a booking made now locks: the market's LEO price × the provider's multiplier × the shell's. */
export function launchPriceUsdKg(state: GameState, id: ProviderId, shellId: OrbitalBlock['shell']): number {
  // (M31.4: the Launch Procurement Lead negotiates 10% off)
  return (
    orbitRow(state).launch_usd_kg_leo *
    provider(id).price_mult *
    shell(shellId).launch_mult *
    staffNumber(state, 'launch_price_mult', 1)
  )
}

/** Tonnes you already have booked to launch in a quarter (any provider). */
export function bookedTonnes(state: GameState, quarter: number, except?: string): number {
  return (state.act4Orbit?.blocks ?? [])
    .filter((b) => b.id !== except && b.launch?.quarter === quarter && b.stage !== 'climbing' && b.stage !== 'live')
    .reduce((t, b) => t + b.massT, 0)
}

/** Third-party launch slots in a quarter (tonnes), from the market row. */
export const slotsTonnes = (state: GameState, quarter: number): number =>
  orbitRow(state, Math.min(quarter, actLastQuarter(4))).launch_slots_t_q

export const LAUNCH_BOOKING_BANDWIDTH = 1
/** A block launched at the end of quarter q climbs through q+1 and is live from q+2. */
export const LIVE_AFTER_LAUNCH = 2

export function bookLaunchBlocker(
  state: GameState,
  blockId: string,
  id: ProviderId,
  quarter: number,
): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const block = orbitBlock(state, blockId)
  if (!block || !PROVIDER_IDS.includes(id)) return { key: 'error.orbit_bad_block' }
  if (block.stage !== 'proposed') return { key: 'error.orbit_not_proposed' }
  if (block.launch) return { key: 'error.orbit_slot_filled' }
  const p = provider(id)
  if (p.needs !== null) return { key: 'error.orbit_provider_needs_partner' }
  const [lo, hi] = L.lead_quarters
  if (quarter < state.quarter + lo || quarter > state.quarter + hi || quarter > actLastQuarter(4))
    return { key: 'error.orbit_launch_window', params: { lo, hi } }
  if (p.max_tonnes_per_booking !== null && block.massT > p.max_tonnes_per_booking)
    return { key: 'error.orbit_launch_too_heavy', params: { max: p.max_tonnes_per_booking } }
  const free = slotsTonnes(state, quarter) - bookedTonnes(state, quarter, blockId)
  if (block.massT > free) return { key: 'error.orbit_launch_no_slots', params: { free: Math.max(0, Math.floor(free)) } }
  if (state.bandwidth < LAUNCH_BOOKING_BANDWIDTH)
    return { key: 'error.no_bandwidth', params: { needed: LAUNCH_BOOKING_BANDWIDTH, have: state.bandwidth } }
  const depositUsd = launchDepositUsd(state, block, id)
  if (state.cash < depositUsd) return { key: 'error.no_cash', params: { costUsd: depositUsd, cashUsd: state.cash } }
}

/** The deposit a booking takes now: 15% of the launch's whole price. */
export const launchDepositUsd = (state: GameState, block: OrbitalBlock, id: ProviderId): number =>
  L.deposit_share * block.massT * 1000 * launchPriceUsdKg(state, id, block.shell)

/** Books the block's launch (its tenant's due quarter becomes the quarter after it). */
export function bookLaunch(state: GameState, blockId: string, id: ProviderId, quarter: number): void {
  const block = orbitBlock(state, blockId)!
  const depositUsd = launchDepositUsd(state, block, id)
  state.bandwidth -= LAUNCH_BOOKING_BANDWIDTH
  book(state, 'orbit_capex', -depositUsd, { block: blockId })
  block.launch = { provider: id, quarter, priceUsdKg: launchPriceUsdKg(state, id, block.shell), depositUsd, slips: 0 }
  if (block.tenant && block.tenant !== 'spot' && block.tenant.dueQuarter === null)
    block.tenant.dueQuarter = quarter + LIVE_AFTER_LAUNCH
  logEntry(state, 'log.orbit.launch_booked', {
    n: block.n,
    providerName: id,
    quarter: CONTENT.quarters[quarter],
    depositUsd,
  })
}

export function cancelLaunchBlocker(state: GameState, blockId: string): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const block = orbitBlock(state, blockId)
  if (!block || !block.launch) return { key: 'error.orbit_bad_block' }
  if (block.stage !== 'proposed') return { key: 'error.orbit_not_proposed' }
}

/** Gives up a booking (to rebook elsewhere): the deposit comes back only if the provider slipped it. */
export function cancelLaunch(state: GameState, blockId: string): void {
  const block = orbitBlock(state, blockId)!
  const refundUsd = block.launch!.slips > 0 ? block.launch!.depositUsd : 0
  book(state, 'orbit_capex', refundUsd, { block: blockId })
  block.launch = null
  block.insured = null
  logEntry(state, 'log.orbit.launch_cancelled', { n: block.n, refundUsd })
}

// ---------- the build ----------

/** Whether the chip export clampdown applies to this quarter's orbital cloud capex (outside an exempt registry). */
export function clampdownActive(state: GameState, quarter = state.quarter): boolean {
  const d = state.act4Wildcards?.find((w) => w.id === 'chip_export_clampdown')
  if (!d || quarter < d.quarter) return false
  const w = CONTENT.wildcardsIv.wildcards.find((x) => x.id === 'chip_export_clampdown')!
  return quarter < d.quarter + Number(w.effect.duration_quarters)
}

/** The build's cost now: the platform (mass × the market's build $/kg) plus, for a cloud, the GPUs with spares. */
export function buildCostUsd(state: GameState, block: OrbitalBlock): number {
  // (M31.2: export credit builds at the partner's manufacturer, +10%)
  const platform = block.massT * 1000 * orbitRow(state).sat_build_usd_kg * buildCostMult(block)
  if (block.kind === 'shell') return platform
  const exempt = ORBIT.licences.registries.find((r) => r.id === orbitOf(state).registry)!.clampdown_exempt
  const mult = clampdownActive(state) && !exempt ? ORBIT.licences.clampdown.cloud_capex_mult : 1
  return platform + block.mw * SAT.gpus.usd_per_mw * (1 + SAT.gpus.spares_share) * mult
}

/** The launch's whole price at its locked $/kg. */
export const launchCostUsd = (block: OrbitalBlock): number => (block.launch ? block.massT * 1000 * block.launch.priceUsdKg : 0)

/** What a block will have cost by launch (build at today's prices + the launch): the insured value before launch. */
export const blockValueUsd = (state: GameState, block: OrbitalBlock): number =>
  block.stage === 'proposed' ? buildCostUsd(state, block) + launchCostUsd(block) : block.capexSpentUsd + launchCostUsd(block) - block.launch!.depositUsd

/**
 * At the end of the Plan phase: each proposed block with all three slots filled and licence room starts its build,
 * paid from cash now (the Capital slot is own cash in M29). The launch can't be before the build is done.
 */
export function startOrbitalBuilds(state: GameState): void {
  for (const b of state.act4Orbit?.blocks ?? []) {
    if (b.stage !== 'proposed' || !b.launch || b.tenant === null || b.capital === null) continue
    if (!licenceRoom(state, b)) {
      logEntry(state, 'log.orbit.build_no_licence', { n: b.n })
      continue
    }
    const costUsd = buildCostUsd(state, b)
    // (M31.2) the lender's draw or the partner's share pays part of it; the rest is your cash
    const mineUsd = costUsd * ownShare(state, b, 'build')
    if (state.cash < mineUsd) {
      logEntry(state, 'log.orbit.build_no_cash', { n: b.n, costUsd: mineUsd })
      continue
    }
    payCapex(state, b, costUsd, 'build')
    b.capexSpentUsd += costUsd + b.launch.depositUsd
    b.stage = 'building'
    b.buildDoneQuarter = state.quarter + SAT.build_quarters
    logEntry(state, 'log.orbit.build_started', { n: b.n, costUsd, quarter: CONTENT.quarters[b.buildDoneQuarter] ?? '—' })
    if (b.launch.quarter < b.buildDoneQuarter) {
      b.launch.quarter = b.buildDoneQuarter
      logEntry(state, 'log.orbit.launch_waits_build', { n: b.n, quarter: CONTENT.quarters[b.launch.quarter] ?? '—' })
    }
  }
}

/** At the start of a quarter: builds that are done wait for their launch. */
export function startQuarterOrbitBuilds(state: GameState): void {
  for (const b of state.act4Orbit?.blocks ?? [])
    if (b.stage === 'building' && b.buildDoneQuarter !== null && b.buildDoneQuarter <= state.quarter)
      b.stage = 'awaiting_launch'
}

// ---------- insurance ----------

export const hardMarket = (state: GameState, quarter = state.quarter): boolean =>
  (state.act4Orbit?.hardMarketUntil ?? -1) >= quarter

/** The most cover one launch can buy this quarter (the market's capacity, less in a hard market). */
export function insuranceCapacityUsd(state: GameState): number {
  // (M31.4: the Chief Risk Officer reaches 25% more capacity)
  return (
    orbitRow(state).insurance_capacity_usd_m *
    1e6 *
    (hardMarket(state) ? INS.hard_market.capacity_mult : 1) *
    staffNumber(state, 'insurance_capacity_mult', 1)
  )
}

/** What insuring this block now would cover and cost (launch + first year before launch; a year's renewal in orbit). */
export function insuranceQuote(state: GameState, block: OrbitalBlock): { coverUsd: number; premiumUsd: number; ratePct: number } | null {
  const row = orbitRow(state)
  // (M31.4: the Chief Risk Officer cuts premiums 20%)
  const mult = (hardMarket(state) ? INS.hard_market.rate_mult : 1) * staffNumber(state, 'insurance_premium_mult', 1)
  if (block.stage === 'proposed' || block.stage === 'building' || block.stage === 'awaiting_launch') {
    if (!block.launch || block.insured) return null
    const young = launchFailureShare(block.launch.provider, block.launch.quarter) * 100 >= INS.young_vehicle_failure_pct_at_least
    const ratePct = (young ? row.insurance_rate_young_pct : row.insurance_rate_mature_pct) * mult
    const coverUsd = Math.min(blockValueUsd(state, block), insuranceCapacityUsd(state))
    return { coverUsd, premiumUsd: (coverUsd * ratePct) / 100, ratePct }
  }
  if (block.stage === 'live') {
    if (block.insured && (block.insured.untilQuarter === null || block.insured.untilQuarter >= state.quarter)) return null
    const ratePct = row.insurance_rate_inorbit_pct * mult
    const coverUsd = Math.min(block.capexSpentUsd * block.capacity, insuranceCapacityUsd(state))
    return { coverUsd, premiumUsd: (coverUsd * ratePct) / 100, ratePct }
  }
  return null
}

export function buyInsuranceBlocker(state: GameState, blockId: string): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const block = orbitBlock(state, blockId)
  if (!block) return { key: 'error.orbit_bad_block' }
  const q = insuranceQuote(state, block)
  if (!q || q.coverUsd <= 0) return { key: 'error.orbit_no_insurance' }
  if (state.cash < q.premiumUsd) return { key: 'error.no_cash', params: { costUsd: q.premiumUsd, cashUsd: state.cash } }
}

/** Buys the quoted cover (0 Bandwidth): to a year after going live, or a year from now in orbit. */
export function buyInsurance(state: GameState, blockId: string): void {
  const block = orbitBlock(state, blockId)!
  const q = insuranceQuote(state, block)!
  book(state, 'insurance', -q.premiumUsd, { block: blockId, biz: 'orbit' })
  ;(state.quarterStats.orbitCostUsd ??= 0)
  state.quarterStats.orbitCostUsd += q.premiumUsd
  block.insured = { coverUsd: q.coverUsd, untilQuarter: block.stage === 'live' ? state.quarter + 3 : null }
  logEntry(state, 'log.orbit.insured', { n: block.n, coverUsd: q.coverUsd, premiumUsd: q.premiumUsd })
}

/** Whether a block's cover is in force this quarter. */
export const insuredNow = (state: GameState, block: OrbitalBlock): boolean =>
  block.insured !== null && (block.insured.untilQuarter === null || block.insured.untilQuarter >= state.quarter)

/** An insured loss: the payout (capped by the cover); a loss over the trigger hardens the market. */
export function settleOrbitLoss(state: GameState, block: OrbitalBlock, lossUsd: number, coverShare = 1): number {
  const payoutUsd = insuredNow(state, block) ? Math.min(lossUsd, block.insured!.coverUsd * coverShare) : 0
  book(state, 'one_offs', payoutUsd, { block: block.id, biz: 'orbit' })
  if (lossUsd >= INS.hard_market.trigger_loss_usd) {
    orbitOf(state).hardMarketUntil = state.quarter + INS.hard_market.quarters
    logEntry(state, 'log.orbit.hard_market', { lossUsd })
  }
  return payoutUsd
}

// ---------- the launch, at the end of its quarter ----------

const slipReason = (state: GameState, b: OrbitalBlock, roll: ReturnType<typeof substream>) => {
  const grounded = state.act4Wildcards?.some((w) => w.id === 'launch_grounding' && w.quarter === state.quarter)
  if (grounded && b.launch!.provider === 'pallas' && wildcardFiredIv(state, 'launch_grounding')) return 'grounded'
  const sh = shell(b.shell)
  if (sh.closed_column && orbitRow(state)[sh.closed_column] === 1) return 'closed'
  const p = provider(b.launch!.provider)
  if (chance(roll, p.slip_pct / 100)) return 'slipped'
  // (M31.4: the Launch Procurement Lead's priority: never bumped)
  if (
    p.bump_pct_when_tight > 0 &&
    slotsTonnes(state, state.quarter) < L.tight_below_slots_t_q &&
    chance(roll, p.bump_pct_when_tight / 100) &&
    staffEffect(state, 'no_bumps') !== true
  )
    return 'bumped'
  return null
}

/** At the end of a quarter: each built block due to launch now either slips a quarter, launches, or is lost. */
export function endQuarterLaunches(state: GameState): void {
  if (!inActIV(state)) return
  for (const b of state.act4Orbit?.blocks ?? []) {
    if (b.stage !== 'awaiting_launch' || !b.launch || b.launch.quarter !== state.quarter) continue
    const roll = substream(act4SeedOf(state), `orbit_launch:${b.id}:${state.quarter}:${b.lostLaunches}`)
    const why = slipReason(state, b, roll)
    if (why) {
      b.launch.quarter++
      b.launch.slips++
      logEntry(state, 'log.orbit.launch_slip', { n: b.n, slipReason: why, quarter: CONTENT.quarters[b.launch.quarter] ?? '—' })
      continue
    }
    const restUsd = launchCostUsd(b) - b.launch.depositUsd
    payCapex(state, b, restUsd, 'launch')
    b.capexSpentUsd += restUsd
    if (chance(roll, launchFailureShare(b.launch.provider, state.quarter))) {
      const lossUsd = b.capexSpentUsd
      const payoutUsd = settleOrbitLoss(state, b, lossUsd)
      // (M31.2) the insurance proceeds repay the block's lender first
      const keptUsd = repayFromProceeds(state, b, payoutUsd)
      book(state, 'debt_repaid', -(payoutUsd - keptUsd))
      debtAfterLoss(state, b)
      logEntry(state, 'log.orbit.launch_failed', { n: b.n, providerName: b.launch.provider, lossUsd, payoutUsd })
      b.stage = 'proposed'
      b.launch = null
      b.insured = null
      b.capexSpentUsd = 0
      b.buildDoneQuarter = null
      b.capacity = 1
      b.gpuHealth = b.kind === 'cloud' ? 1 + SAT.gpus.spares_share : 1
      b.lostLaunches++
      continue
    }
    // It climbs to its orbit through the next quarter and goes live the quarter after (open → live in 4-6 quarters).
    b.stage = 'climbing'
    b.liveQuarter = state.quarter + LIVE_AFTER_LAUNCH
    logEntry(state, 'log.orbit.launched', {
      n: b.n,
      providerName: b.launch.provider,
      quarter: CONTENT.quarters[b.liveQuarter] ?? '—',
    })
  }
}
