// Act III's renewal wall (M12.2; doc 27 §6, D5, F-1, F-2). A tenant contract reaching its end quarter
// (the last quarter served; a holdover's in 2027Q1) opens a renewal in that quarter's Plan phase:
// 1. the walk roll (its own stream "act3_renewal"): the scenario's walk chance at renewal for the
//    tenant's type, doubled (capped) for a tenant in distress;
// 2. otherwise an offer keyed to the tenant's own rate (F-1): a shell lease at Band(q) low + (high −
//    low) × a position by tenant type; a GPU contract at its GPU index ratio, clamped into Band(q);
//    and the offered term;
// 3. the player accepts (0 BW), counters (Act II's tenant negotiation, 2 BW, limit Band high), or
//    re-lets (a shell by RFP, 1 BW) / lets a GPU contract go to spot (0 BW).
// Undecided, the default (accept) applies. It is all settled at the end of that quarter; the new term
// starts next quarter. A walked shell tenant goes to the re-let path (no Bandwidth: the tenant left); a
// walked GPU contract to spot. A re-let's MW earn nothing for 2 quarters, then a tenant of the same
// card signs at the lapsed rent × that quarter's RFP midpoint (F-2) for the offered shell term.
// Only this quarter's market columns are read, and only once a renewal opens (no offer is known early).
import { BALANCE, CONTENT, actFirstQuarter } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, substream } from '../rng.ts'
import {
  inActIII,
  logEntry,
  projectGone,
  type GameState,
  type Project,
  type Renewal,
} from '../state.ts'
import { contractEndQuarter, reopenerEligible } from './calendar.ts'
import {
  gpuRenewalIndex,
  offeredTermYears,
  renewalBand,
  rfpMid,
  walkProbAtRenewal,
} from './leaseIndex.ts'
import { scenarioOf } from './market.ts'
import { annualRentUsd, contractQuarters, tenantCard } from './projects.ts'

const R = BALANCE.act3.renewals

export function openRenewal(
  state: GameState,
  projectId: string,
): Renewal | undefined {
  return state.act3Renewals?.find((r) => r.projectId === projectId)
}

/** The walk chance at renewal for this contract now. */
export function renewalWalkChance(state: GameState, p: Project): number {
  const t = p.tenant!
  const type = tenantCard(t.card)!.type
  const base = walkProbAtRenewal(state.quarter, scenarioOf(state), type)
  return t.distressedQuarter !== undefined
    ? Math.min(R.distressWalkCap, base * R.distressWalkMult)
    : base
}

/** The renewal offer for this contract now (F-1: a multiple of its own rate), or null without data. */
export function renewalOffer(
  state: GameState,
  p: Project,
): { mult: number; termQuarters: number } | null {
  const t = p.tenant!
  const scenario = scenarioOf(state)
  const band = renewalBand(state.quarter, scenario)
  if (!band) return null
  if (t.gpu) {
    const first = actFirstQuarter(3)
    const base = t.signedQuarter < first ? first : t.signedQuarter
    const now = gpuRenewalIndex(state.quarter, scenario, p.gpu ?? 'h100')
    const then = gpuRenewalIndex(base, scenario, p.gpu ?? 'h100')
    const ratio = now !== null && then ? now / then : 1
    const mult = Math.min(band.hi, Math.max(band.lo, ratio))
    const years = offeredTermYears(state.quarter, scenario, 'gpu') ?? 1
    return { mult, termQuarters: years * 4 }
  }
  const position = R.positionByType[tenantCard(t.card)!.type] ?? 0
  const mult = band.lo + (band.hi - band.lo) * position
  const years = offeredTermYears(state.quarter, scenario, 'shell') ?? 1
  return { mult, termQuarters: years * 4 }
}

/**
 * At the start of an Act III Plan phase: a renewal opens for each live contract whose term ends this
 * quarter or has already ended (a holdover). The walk is rolled now; the offer is made now.
 */
export function openRenewals(state: GameState): void {
  if (!inActIII(state) || !state.scenarioId) return
  state.act3Renewals ??= []
  const label = CONTENT.quarters[state.quarter]
  for (const p of state.projects) {
    const t = p.tenant
    if (!t || projectGone(p) || p.stage !== 'live') continue
    // A rolling spot lease (a card's term "spot") reprices each quarter instead (repriceRolling).
    if (t.rolling || openRenewal(state, p.id)) continue
    const end = contractEndQuarter(state, p)
    if (end === null || end > state.quarter) continue
    const walked = chance(
      substream(state.seed, `act3_renewal:${label}:${p.id}`),
      renewalWalkChance(state, p),
    )
    const renewal: Renewal = {
      projectId: p.id,
      kind: t.gpu ? 'gpu' : 'shell',
      openedQuarter: state.quarter,
      walked,
      offer: walked ? null : renewalOffer(state, p),
      choice: null,
    }
    state.act3Renewals.push(renewal)
    logEntry(state, walked ? 'log.renewal_walk' : 'log.renewal_offer', {
      n: p.n,
      tenant: t.card,
      multPct: renewal.offer ? renewal.offer.mult - 1 : 0,
      years: renewal.offer ? renewal.offer.termQuarters / 4 : 0,
    })
  }
}

/** Why this renewal can't be answered like this now, or undefined. */
export function renewalBlocker(
  state: GameState,
  projectId: string,
  choice: 'accept' | 'relet',
): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const r = openRenewal(state, projectId)
  if (!r) return { key: 'error.no_renewal' }
  if (r.walked) return { key: 'error.renewal_walked' }
  if (r.choice === choice) return { key: 'error.renewal_chosen' }
  // A reopener the player started can't be turned into a re-let: the fee is paid, and backing out
  // (a failed counter) keeps the old lease (mine, reversible).
  if (choice === 'relet' && r.cause === 'reopener' && r.by === 'player')
    return { key: 'error.reopener_no_relet' }
  if (
    choice === 'relet' &&
    r.kind === 'shell' &&
    state.bandwidth < R.reletBandwidth
  )
    return {
      key: 'error.no_bandwidth',
      params: { needed: R.reletBandwidth, have: state.bandwidth },
    }
  return undefined
}

/**
 * Why a walked shell's MW can't be kept empty now, or undefined (M13.2; the wireframe README's conflict
 * 6): only a shell whose tenant is leaving (a walk at the roll, a failed counter, or a card), in the Plan
 * phase, once.
 */
export function keepEmptyBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const r = openRenewal(state, projectId)
  if (!r) return { key: 'error.no_renewal' }
  if (!r.walked || r.kind !== 'shell') return { key: 'error.not_walked' }
  if (r.cause === 'reopener' && r.by === 'player')
    return { key: 'error.not_walked' }
  if (r.keepEmpty) return { key: 'error.renewal_chosen' }
  return undefined
}

/** Cancels the automatic re-let of a walked shell (0 BW; assumes the blocker passed). */
export function keepEmpty(state: GameState, projectId: string): void {
  openRenewal(state, projectId)!.keepEmpty = true
}

/** Records the player's answer (assumes the blocker passed); a shell re-let costs its Bandwidth now. */
export function chooseRenewal(
  state: GameState,
  projectId: string,
  choice: 'accept' | 'relet',
): void {
  const r = openRenewal(state, projectId)!
  if (choice === 'relet' && r.kind === 'shell')
    state.bandwidth -= R.reletBandwidth
  // Choosing accept after a paid re-let doesn't refund it (mine): the RFP was already started.
  r.choice = choice
  delete r.counterMult
}

/** A lease's rent a year before any card haircut on this term (tenant_revenue_mult is for this term only). */
export function baseRentUsd(p: Project): number {
  const t = p.tenant!
  return (
    (annualRentUsd(tenantCard(t.card)!, p.kw) * (t.priceMult ?? 1)) /
    (t.revenueMult ?? 1)
  )
}

/**
 * Starts the re-let by RFP on a shell whose tenant leaves at the end of this quarter: its MW earn
 * nothing for 2 quarters (a card's rfp_weeks: its own count), then a tenant of the same card signs.
 */
function startRelet(
  state: GameState,
  p: Project,
  opts: { emptyQuarters?: number; rentMult?: number } = {},
): void {
  const t = p.tenant!
  const lapsedRentUsd = baseRentUsd(p)
  p.tenant = null
  p.offers = []
  p.emptyUntil = state.quarter + (opts.emptyQuarters ?? R.reletEmptyQuarters)
  p.pendingRelet = {
    card: t.card,
    lapsedRentUsd,
    ...(opts.rentMult !== undefined ? { rentMult: opts.rentMult } : {}),
  }
  logEntry(state, 'log.renewal_relet', {
    n: p.n,
    tenant: t.card,
    quarter: CONTENT.quarters[p.emptyUntil + 1] ?? '—',
  })
}

/** A GPU contract that isn't renewed: its GPUs go to spot (Act II's rule at term end). */
function toSpot(state: GameState, p: Project): void {
  const t = p.tenant!
  logEntry(state, 'log.gpu_contract_ended', { n: p.n, tenant: t.card })
  p.tenant = null
  p.spot = true
}

/**
 * At the end of the quarter the renewals opened in: each is settled. A walk (at the roll or in round 3
 * of a counter) or a re-let: the shell goes to the re-let path, the GPU contract to spot. Otherwise
 * (accepted, or undecided: the default) the tenant signs at the offer (or the counter won): its rate ×
 * the multiple, the new term from next quarter, and a clean slate (a distressed tenant is no longer).
 */
export function resolveRenewals(state: GameState): void {
  const open = state.act3Renewals ?? []
  if (open.length === 0) return
  for (const r of open) {
    const p = state.projects.find((x) => x.id === r.projectId)
    if (!p || !p.tenant || projectGone(p)) continue
    const t = p.tenant
    // A reopener the player started and then backed out of (a failed counter): the lease runs on at
    // its old rent; the fee stays paid.
    if (r.cause === 'reopener' && r.by === 'player' && r.walked) {
      logEntry(state, 'log.reopener_kept', { n: p.n, tenant: t.card })
      continue
    }
    // A walked shell the player keeps empty (M13.2): the tenant leaves; no re-let RFP runs. Its MW are
    // uncontracted and get fresh offers like any unsigned shell.
    if (r.walked && r.keepEmpty && r.kind === 'shell') {
      p.tenant = null
      p.offers = []
      logEntry(state, 'log.renewal_kept_empty', { n: p.n, tenant: t.card })
      continue
    }
    if (r.walked || r.choice === 'relet' || !r.offer) {
      if (r.kind === 'shell')
        startRelet(state, p, {
          ...(r.reletEmptyQuarters !== undefined
            ? { emptyQuarters: r.reletEmptyQuarters }
            : {}),
          ...(r.reletRentMult !== undefined
            ? { rentMult: r.reletRentMult }
            : {}),
        })
      else toSpot(state, p)
      continue
    }
    const mult = r.counterMult ?? r.offer.mult
    // A card's haircut on the old term (tenant_revenue_mult) doesn't carry into the new one.
    const haircut = t.revenueMult ?? 1
    delete t.revenueMult
    if (t.gpu) {
      t.gpu.priceUsdHr *= mult / haircut
      t.gpu.termQuarters = r.offer.termQuarters
    } else {
      t.priceMult = ((t.priceMult ?? 1) / haircut) * mult
      t.termQuarters = r.offer.termQuarters
    }
    t.servedQuarters = 0
    t.signedQuarter = state.quarter
    delete t.distressedQuarter
    logEntry(state, 'log.renewal_signed', {
      n: p.n,
      tenant: t.card,
      multPct: mult - 1,
      years: contractQuarters(p) / 4,
    })
  }
  state.act3Renewals = []
}

/**
 * At the start of a quarter: a re-let RFP whose empty quarters are over signs its new tenant (the same
 * card) at the lapsed rent × this quarter's RFP midpoint, for the offered shell term.
 */
export function completeRelets(state: GameState): void {
  if (!inActIII(state)) return
  const scenario = scenarioOf(state)
  for (const p of state.projects) {
    const pending = p.pendingRelet
    if (!pending || projectGone(p) || p.tenant) continue
    if (p.emptyUntil !== undefined && state.quarter <= p.emptyUntil) continue
    const card = tenantCard(pending.card)!
    const mid = rfpMid(state.quarter, scenario) ?? 1
    const years = offeredTermYears(state.quarter, scenario, 'shell') ?? 1
    const rentUsd = pending.lapsedRentUsd * mid * (pending.rentMult ?? 1)
    p.tenant = {
      card: card.id,
      signedQuarter: state.quarter,
      readyByQuarter: state.quarter,
      lateQuarters: 0,
      walkRolled: true,
      prepaymentLeftUsd: 0,
      servedQuarters: 0,
      priceMult: rentUsd / annualRentUsd(card, p.kw),
      termQuarters: years * 4,
    }
    p.offers = []
    delete p.pendingRelet
    logEntry(state, 'log.relet_signed', {
      n: p.n,
      tenant: card.id,
      rentUsd,
      years,
    })
  }
}

// ---------- the reopener clause (M12.3; F-2, doc 27 §6) ----------

const RO = BALANCE.act3.reopener

/** Half of one quarter's current rent: what the party that reopens pays the other (DT). */
export function reopenerFeeUsd(p: Project): number {
  const t = p.tenant!
  return Math.round(
    (RO.feeShareOfQuarterRent *
      annualRentUsd(tenantCard(t.card)!, p.kw) *
      (t.priceMult ?? 1)) /
      4,
  )
}

/**
 * Reopens a lease: the fee changes hands, then M12.2's renewal runs at once in this Plan phase (the
 * offer from Band(q) and the tenant's position, the offered shell term; no walk roll, except in a
 * counter's round 3). It settles at the end of the quarter like any renewal.
 */
function openReopener(
  state: GameState,
  p: Project,
  by: 'tenant' | 'player',
): void {
  const t = p.tenant!
  const feeUsd = reopenerFeeUsd(p)
  state.cash += by === 'tenant' ? feeUsd : -feeUsd
  t.reopenedQuarter = state.quarter
  const offer = renewalOffer(state, p)
  ;(state.act3Renewals ??= []).push({
    projectId: p.id,
    kind: 'shell',
    openedQuarter: state.quarter,
    walked: false,
    offer,
    choice: null,
    cause: 'reopener',
    by,
  })
  logEntry(state, `log.reopener_${by}`, {
    n: p.n,
    tenant: t.card,
    feeUsd,
    multPct: offer ? offer.mult - 1 : 0,
    years: offer ? offer.termQuarters / 4 : 0,
  })
}

/**
 * At the start of an Act III Plan phase (after the renewals open): when Band high(q) is under 0.90 (the
 * market at least 10% below the lease), each eligible tenant reopens, at most once in 4 quarters.
 */
export function openTenantReopeners(state: GameState): void {
  if (!inActIII(state) || !state.scenarioId) return
  const band = renewalBand(state.quarter, scenarioOf(state))
  if (!band || band.hi >= RO.tenantTriggerBandHigh) return
  for (const p of state.projects) {
    if (!reopenerEligible(state, p)) continue
    const last = p.tenant!.reopenedQuarter
    if (last !== undefined && state.quarter - last < RO.tenantEveryQuarters)
      continue
    openReopener(state, p, 'tenant')
  }
}

/** Why the player can't reopen this lease now, or undefined. */
export function playerReopenBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const p = state.projects.find((x) => x.id === projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (!reopenerEligible(state, p)) return { key: 'error.reopener_not_eligible' }
  if (state.bandwidth < RO.playerBandwidth)
    return {
      key: 'error.no_bandwidth',
      params: { needed: RO.playerBandwidth, have: state.bandwidth },
    }
  const feeUsd = reopenerFeeUsd(p)
  if (state.cash < feeUsd)
    return { key: 'error.no_cash', params: { costUsd: feeUsd, cashUsd: state.cash } }
  return undefined
}

/** The player reopens a lease (1 BW and the fee; assumes the blocker passed). */
export function playerReopen(state: GameState, projectId: string): void {
  const p = state.projects.find((x) => x.id === projectId)!
  state.bandwidth -= RO.playerBandwidth
  openReopener(state, p, 'player')
}

// ---------- contracts an event card changes (M12.3) ----------

/**
 * A card ends a contract at the end of this quarter (a walk, or a re-let it chose): a shell goes to the
 * re-let path at no Bandwidth (a card's rfp_weeks and rent_index can set its gap and rent); a GPU
 * contract goes to spot. An open renewal on it becomes this.
 */
export function endContractAtQuarterEnd(
  state: GameState,
  p: Project,
  opts: { emptyQuarters?: number; rentMult?: number } = {},
): void {
  const list = (state.act3Renewals ??= [])
  let r = openRenewal(state, p.id)
  if (!r) {
    r = {
      projectId: p.id,
      kind: p.tenant!.gpu ? 'gpu' : 'shell',
      openedQuarter: state.quarter,
      walked: true,
      offer: null,
      choice: null,
    }
    list.push(r)
  }
  r.walked = true
  r.offer = null
  r.choice = null
  r.cause = 'card'
  delete r.by
  delete r.counterMult
  if (opts.emptyQuarters !== undefined)
    r.reletEmptyQuarters = opts.emptyQuarters
  if (opts.rentMult !== undefined) r.reletRentMult = opts.rentMult
}

/**
 * At the start of a quarter: a rolling spot lease (a card's term "spot") reprices at this quarter's
 * new-lease reference (the card rent × the RFP midpoint) for one more quarter.
 */
export function repriceRolling(state: GameState): void {
  if (!inActIII(state)) return
  const mid = rfpMid(state.quarter, scenarioOf(state))
  if (mid === null) return
  for (const p of state.projects) {
    const t = p.tenant
    if (!t?.rolling || projectGone(p)) continue
    t.priceMult = mid
    t.servedQuarters = 0
    delete t.revenueMult
  }
}
