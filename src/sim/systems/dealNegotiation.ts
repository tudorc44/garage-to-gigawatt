// Tenant and lender negotiation (Act II; interrupts_act2.json › tenant_lender_negotiation; wireframe
// A2-05's "Negotiate · 2 BW"; owner, 28 Sep 2026, M5 answer 8). Instead of accepting a tenant's offer
// or a lender's rate, you pay 2 Bandwidth and bargain for up to 3 rounds, like the Act I power
// negotiation, from the card's terms:
// - a tenant: you ask for a higher price; its hidden limit is the card price + 5% (hyperscaler),
//   8% (neocloud) or 12% (AI lab);
// - a lender (project debt or a DDTL): you ask for a lower rate; its hidden limit is its rate − 0.75
//   point, never below SOFR + 1.5%.
// Each counter: at or inside their current offer → signed at their offer; inside the limit → signed
// at yours; past it → they come back halfway toward their limit, except in round 3, when there's a
// 15% chance they walk: the offer is gone for this quarter (a tenant's offer is withdrawn; that
// lender's debt is off until next quarter). After 3 rounds: take their last offer or walk away (the
// card's terms stay on the table, but no second negotiation on it this quarter).
//
// All values are kept on one "better for you is higher" scale: a tenant's price multiple (1 = the
// card) and a lender's rate cut (0 = the card).
import { BALANCE } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { substream, uniform } from '../rng.ts'
import {
  inAct2Rules,
  logEntry,
  type GameState,
  type Project,
} from '../state.ts'
import {
  debtBlocker,
  debtOffer,
  setProjectDebt,
  type DebtKind,
} from './facilities.ts'
import { sofr } from './finance.ts'
import { scenarioOf } from './market.ts'
import { getProject, signTenant, tenantCard } from './projects.ts'
import { renewalBand } from './leaseIndex.ts'
import { shellTierRentMult } from './density.ts'
import { openRenewal } from './renewals.ts'

const N = BALANCE.finance.dealNegotiation

export interface DealNegotiation {
  projectId: string
  /** 'renewal' (Act III, M12.2): a counter on a renewal offer, as a multiple of the current rate. */
  side: 'tenant' | 'lender' | 'renewal'
  /** The tenant offer bargained over (side 'tenant'). */
  offerId?: string
  /** The debt bargained over (side 'lender'). */
  debt?: DebtKind
  /** On the "higher is better for you" scale: a price multiple (tenant) or a rate cut (lender). */
  opening: number
  offer: number
  /** Hidden: the most they will give. The UI must never show it. */
  limit: number
  round: number
  final: boolean
  history: { ask: number; reply: 'counter' | 'deal' | 'walked' }[]
  rng: number
}

/** Where a negotiation would start: its side, target and the limit, or a blocker. */
function terms(
  state: GameState,
  p: Project,
  target: Target,
): { limit: number; opening?: number } | Message {
  // Act III renewal (M12.2): opening = the offer's multiple, hidden limit = Band high (both × the
  // contract's current rate).
  if (target.renewal) {
    const r = openRenewal(state, p.id)
    if (!r) return { key: 'error.no_tenant_renewal' }
    if (r.walked || !r.offer) return { key: 'error.renewal_walked' }
    if (r.negotiated) return { key: 'error.negotiated_already' }
    const band = renewalBand(state.quarter, scenarioOf(state))
    if (!band) return { key: 'error.no_tenant_renewal' }
    // M16.2 (mine, reversible): a shell's limit takes its hall's tier multiple, like its offer.
    const hi = band.hi * shellTierRentMult(state, p)
    return { limit: Math.max(hi, r.offer.mult), opening: r.offer.mult }
  }
  if (target.offerId) {
    if (p.tenant) return { key: 'error.tenant_signed' }
    const o = p.offers.find((x) => x.id === target.offerId)
    const card = o && tenantCard(o.card)
    if (!o || !card) return { key: 'error.unknown_offer' }
    if (o.negotiatedQuarter === state.quarter)
      return { key: 'error.negotiated_already' }
    return { limit: 1 + (N.tenantLimitByType[card.type] ?? 0) }
  }
  const kind = target.debt
  if (!kind) return { key: 'error.bad_choice' }
  const blocked = debtBlocker(state, p, kind)
  if (blocked) return blocked
  if (p.debt?.negotiatedQuarter?.[kind] === state.quarter)
    return { key: 'error.negotiated_already' }
  // The lender's usual rate for this project (before any cut already won).
  const usual = debtOffer(state, p, kind).apr + (p.debt?.aprCut?.[kind] ?? 0)
  const room =
    usual - (sofr(state.quarter, scenarioOf(state)) + N.lenderFloorOverSofr)
  const limit = Math.max(0, Math.min(N.lenderCut, room))
  if (limit <= 0) return { key: 'error.lender_no_room' }
  return { limit }
}

/** What a negotiation is about: a tenant offer, a debt, or (Act III) the project's open renewal. */
interface Target {
  offerId?: string
  debt?: DebtKind
  renewal?: boolean
}

/** Why a negotiation can't start on this offer or debt now, or undefined if it can. */
export function dealNegotiationBlocker(
  state: GameState,
  projectId: string,
  target: Target,
): Message | undefined {
  if (!inAct2Rules(state)) return { key: 'error.act2_only' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (state.negotiation || state.dealNegotiation)
    return { key: 'error.negotiation_open' }
  if (state.pitch) return { key: 'error.pitch_open' }
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  const t = terms(state, p, target)
  if ('key' in t) return t
  if (state.bandwidth < N.bandwidth)
    return {
      key: 'error.no_bandwidth',
      params: { needed: N.bandwidth, have: state.bandwidth },
    }
  return undefined
}

/** Starts bargaining (assumes the blocker passed): 2 Bandwidth, the card's terms on the table. */
export function startDealNegotiation(
  state: GameState,
  projectId: string,
  target: Target,
): void {
  const p = getProject(state, projectId)!
  const t = terms(state, p, target) as { limit: number; opening?: number }
  const limit = t.limit
  const side = target.renewal ? 'renewal' : target.offerId ? 'tenant' : 'lender'
  const opening = t.opening ?? (side === 'tenant' ? 1 : 0)
  if (side === 'renewal') openRenewal(state, projectId)!.negotiated = true
  state.bandwidth -= N.bandwidth
  state.dealNegotiation = {
    projectId,
    side,
    ...(target.offerId ? { offerId: target.offerId } : {}),
    ...(target.debt ? { debt: target.debt } : {}),
    opening,
    offer: opening,
    limit,
    round: 0,
    final: false,
    history: [],
    rng: substream(
      state.seed,
      `deal_negotiation:${state.quarter}:${projectId}:${target.offerId ?? target.debt ?? 'renewal'}`,
    ).rng,
  }
  logEntry(state, 'log.deal_negotiation_started', {
    n: p.n,
    side: side === 'lender' ? 'lender' : 'tenant',
  })
}

/** Signs at `value` (a price multiple or a rate cut) and closes the negotiation. */
function deal(state: GameState, value: number): void {
  const n = state.dealNegotiation!
  const p = getProject(state, n.projectId)!
  state.dealNegotiation = null
  // A renewal counter won: the tenant will sign at this multiple of its rate at quarter end.
  if (n.side === 'renewal') {
    const r = openRenewal(state, p.id)!
    r.choice = 'accept'
    r.counterMult = value
    logEntry(state, 'log.deal_negotiation_tenant', {
      n: p.n,
      gainPct: value / r.offer!.mult - 1,
    })
    return
  }
  if (n.side === 'tenant') {
    const o = p.offers.find((x) => x.id === n.offerId)!
    o.priceMult = value
    logEntry(state, 'log.deal_negotiation_tenant', {
      n: p.n,
      gainPct: value - 1,
    })
    signTenant(state, p.id, o.id)
    return
  }
  const kind = n.debt!
  const debt = p.debt ?? { projectDebt: false, ddtl: false }
  debt.aprCut = { ...debt.aprCut, [kind]: value }
  p.debt = debt
  setProjectDebt(state, p.id, kind, true)
  logEntry(state, 'log.deal_negotiation_lender', {
    n: p.n,
    debt: kind,
    cutPct: value,
  })
}

/** Nobody signed. They walked: the offer is gone this quarter. You walked: the card's terms stand. */
function walkAway(state: GameState, by: 'you' | 'them'): void {
  const n = state.dealNegotiation!
  const p = getProject(state, n.projectId)!
  state.dealNegotiation = null
  if (n.side === 'renewal') {
    // They walked (round 3): the tenant leaves at term end. You walked: the offer stands (the default).
    if (by === 'them') {
      const r = openRenewal(state, p.id)!
      r.walked = true
      r.choice = null
      delete r.counterMult
    }
  } else if (n.side === 'tenant') {
    if (by === 'them') p.offers = p.offers.filter((o) => o.id !== n.offerId)
    else {
      const o = p.offers.find((x) => x.id === n.offerId)
      if (o) o.negotiatedQuarter = state.quarter
    }
  } else {
    const kind = n.debt!
    const debt = p.debt ?? { projectDebt: false, ddtl: false }
    debt.negotiatedQuarter = {
      ...debt.negotiatedQuarter,
      [kind]: state.quarter,
    }
    if (by === 'them') {
      debt.walkedQuarter = { ...debt.walkedQuarter, [kind]: state.quarter }
      if (kind === 'project_debt') debt.projectDebt = false
      else debt.ddtl = false
    }
    p.debt = debt
  }
  logEntry(
    state,
    by === 'you'
      ? 'log.deal_negotiation_you_walked'
      : 'log.deal_negotiation_they_walked',
    { n: p.n, side: n.side === 'lender' ? 'lender' : 'tenant' },
  )
}

/** One round: your ask (a price multiple for a tenant, a rate cut for a lender). */
export function dealCounter(
  state: GameState,
  ask: number,
): Message | undefined {
  const n = state.dealNegotiation
  if (!n) return { key: 'error.no_negotiation' }
  if (n.final) return { key: 'error.negotiation_final' }
  if (!Number.isFinite(ask) || ask < n.opening)
    return { key: 'error.bad_amount' }
  n.round++
  if (ask <= n.offer) {
    n.history.push({ ask, reply: 'deal' })
    deal(state, n.offer)
    return
  }
  if (ask <= n.limit + 1e-12) {
    n.history.push({ ask, reply: 'deal' })
    deal(state, ask)
    return
  }
  if (n.round >= N.rounds) {
    const r = { rng: n.rng }
    const walks = uniform(r, 0, 1) < N.walkChanceLastRound
    n.rng = r.rng
    if (walks) {
      n.history.push({ ask, reply: 'walked' })
      walkAway(state, 'them')
      return
    }
  }
  n.offer = (n.offer + n.limit) / 2
  n.history.push({ ask, reply: 'counter' })
  if (n.round >= N.rounds) n.final = true
}

/** Take their current offer. */
export function dealAccept(state: GameState): Message | undefined {
  if (!state.dealNegotiation) return { key: 'error.no_negotiation' }
  deal(state, state.dealNegotiation.offer)
}

/** Walk away: the card's terms stay on the table (no second negotiation this quarter). */
export function dealWalk(state: GameState): Message | undefined {
  if (!state.dealNegotiation) return { key: 'error.no_negotiation' }
  walkAway(state, 'you')
}

/** Card id of a tenant negotiation's offer, for the UI (null for a lender). */
export function dealNegotiationCard(state: GameState): string | null {
  const n = state.dealNegotiation
  if (!n || n.side !== 'tenant') return null
  const p = getProject(state, n.projectId)
  return p?.offers.find((o) => o.id === n.offerId)?.card ?? null
}

export const DEAL_NEGOTIATION = { bandwidth: N.bandwidth, rounds: N.rounds }
