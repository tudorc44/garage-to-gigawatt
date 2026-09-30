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
import { contractEndQuarter } from './calendar.ts'
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
    if (openRenewal(state, p.id)) continue
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

/** Starts the re-let by RFP on a shell whose tenant leaves at the end of this quarter. */
function startRelet(state: GameState, p: Project): void {
  const t = p.tenant!
  const lapsedRentUsd =
    annualRentUsd(tenantCard(t.card)!, p.kw) * (t.priceMult ?? 1)
  p.tenant = null
  p.offers = []
  p.emptyUntil = state.quarter + R.reletEmptyQuarters
  p.pendingRelet = { card: t.card, lapsedRentUsd }
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
    if (r.walked || r.choice === 'relet' || !r.offer) {
      if (r.kind === 'shell') startRelet(state, p)
      else toSpot(state, p)
      continue
    }
    const mult = r.counterMult ?? r.offer.mult
    if (t.gpu) {
      t.gpu.priceUsdHr *= mult
      t.gpu.termQuarters = r.offer.termQuarters
    } else {
      t.priceMult = (t.priceMult ?? 1) * mult
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
    const rentUsd = pending.lapsedRentUsd * mid
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
