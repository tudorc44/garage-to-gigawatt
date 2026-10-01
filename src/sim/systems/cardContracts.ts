// Act III's step-4 card effects (M12.3; the design thread's M12.3 spec, parts B and C). The card engine
// (events.ts) hands each wired effect here:
// - `contract`: rent_index, term, term_years, term_add_years, walk_prob / tenant_walk_chance,
//   tenant_revenue_mult, rfp_weeks and recovery, on the card's target contract(s) (pickTargets);
// - the rest: extra shell offers, idling the old ASICs, a debt buy-back and a maturity extension, a
//   free Signals read, cash paid at a quarter's end, the backstop payout, a stabilised site's sale.
// A card that finds no fitting target changes nothing and logs it.
import { BALANCE, CONTENT, type SignalId } from '../../content/index.ts'
import type { ContractTarget } from '../../content/act3Cards.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, type RngHolder } from '../rng.ts'
import { logEntry, projectGone, type GameState, type Project } from '../state.ts'
import { contractEndQuarter } from './calendar.ts'
import { rfpMid } from './leaseIndex.ts'
import { getModel, scenarioOf } from './market.ts'
import {
  annualRentUsd,
  contractQuarters,
  tenantCard,
} from './projects.ts'
import { endContractAtQuarterEnd } from './renewals.ts'
import { shellTierRentMult } from './density.ts'
import { forcedProjectSale } from './rescue.ts'

const C = BALANCE.act3.cards

/** A card's contract effect, as act3Cards.ts writes it. */
export interface ContractEffect {
  target: ContractTarget
  rentIndex?: number
  term?: 'spot' | '1yr'
  termYears?: number
  termAddYears?: number
  walkProb?: number
  revenueMult?: number
  rfpWeeks?: number
  recovery?: number
  replaceTenant?: boolean
}

/** A contract's rent a year as signed now (before any distress haircut). */
function yearlyRateUsd(p: Project): number {
  const t = p.tenant!
  if (t.gpu) return t.gpu.gpus * t.gpu.priceUsdHr * 24 * 365
  return annualRentUsd(tenantCard(t.card)!, p.kw) * (t.priceMult ?? 1)
}

/** Credit rank for "best tenant": hyperscaler > neocloud > AI lab. */
function creditRank(p: Project): number {
  const type = tenantCard(p.tenant!.card)?.type
  return type === 'hyperscaler'
    ? 3
    : type === 'neocloud_sub_tenant'
      ? 2
      : type === 'ai_lab'
        ? 1
        : 0
}

/** Signed contracts a card can act on (a rolling spot lease is not one). */
function contracts(state: GameState): Project[] {
  return state.projects.filter(
    (p) => p.tenant && !projectGone(p) && !p.tenant.rolling,
  )
}

const byRent = (a: Project, b: Project) => yearlyRateUsd(b) - yearlyRateUsd(a)

/** The card's target contracts (the design thread's rules; ties: the larger rent). */
export function pickTargets(
  state: GameState,
  target: ContractTarget,
): Project[] {
  const all = contracts(state)
  switch (target) {
    case 'soonest': {
      const end = (p: Project) => contractEndQuarter(state, p) ?? Infinity
      return [...all].sort((a, b) => end(a) - end(b) || byRent(a, b)).slice(0, 1)
    }
    case 'best':
      return [...all]
        .sort((a, b) => creditRank(b) - creditRank(a) || byRent(a, b))
        .slice(0, 1)
    case 'distressed': {
      const type = (p: Project) => tenantCard(p.tenant!.card)?.type
      const pools = [
        all.filter((p) => p.tenant!.distressedQuarter !== undefined),
        all.filter((p) => type(p) === 'ai_lab'),
        all.filter((p) => type(p) !== 'hyperscaler'),
      ]
      const pool = pools.find((x) => x.length > 0) ?? []
      return [...pool].sort(byRent).slice(0, 1)
    }
    case 'all_shell':
      return all.filter((p) => !p.tenant!.gpu)
    case 'uncontracted':
      return state.projects.filter(
        (p) =>
          p.kind === 'shell' &&
          p.stage === 'live' &&
          !p.tenant &&
          !p.pendingRelet,
      )
    case 'largest':
      return [...all].sort(byRent).slice(0, 1)
  }
}

/** Sets a contract's quarters left from now (the term becomes quarters served + left). */
function setQuartersLeft(p: Project, left: number): void {
  const t = p.tenant!
  const term = t.servedQuarters + left
  if (t.gpu) t.gpu.termQuarters = term
  else t.termQuarters = term
}

/** Multiplies a contract's rate: a shell's rent multiple, or a GPU contract's $/GPU-hr. */
function scaleRate(p: Project, x: number): void {
  const t = p.tenant!
  if (t.gpu) t.gpu.priceUsdHr *= x
  else t.priceMult = (t.priceMult ?? 1) * x
}

/** The rent a distressed contract won't pay over its next `quarters` quarters (0 when not distressed). */
export function shortfallUsd(p: Project, quarters: number): number {
  const t = p.tenant
  if (!t || t.distressedQuarter === undefined) return 0
  const left = Math.max(0, contractQuarters(p) - t.servedQuarters)
  const paid = BALANCE.projects.aiLabDistress.paymentMult
  return (yearlyRateUsd(p) * (1 - paid) * Math.min(quarters, left)) / 4
}

/** An open renewal on a contract a card now reprices or re-terms is closed: the card's terms stand. */
function closeRenewal(state: GameState, p: Project): void {
  if (!state.act3Renewals) return
  state.act3Renewals = state.act3Renewals.filter((r) => r.projectId !== p.id)
}

/** A card's contract effect on its target(s). `r` is the card's own random stream. */
export function applyContractEffect(
  state: GameState,
  e: ContractEffect,
  r: RngHolder,
  weekNo: number,
): void {
  const targets = pickTargets(state, e.target)
  if (targets.length === 0) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  if (e.target === 'uncontracted') {
    for (const p of targets) spotLease(state, p, e, weekNo)
    return
  }
  for (const p of targets) {
    const t = p.tenant!
    const params = { n: p.n, tenant: t.card }
    // A walk (one roll now) ends the contract at quarter end; nothing else of the choice applies to it.
    if (e.walkProb !== undefined && chance(r, e.walkProb)) {
      endContractAtQuarterEnd(state, p)
      logEntry(state, 'log.card_walk', params, weekNo)
      continue
    }
    // A re-let the card chose: the tenant leaves at quarter end; the RFP runs n weeks (whole quarters).
    if (e.rfpWeeks !== undefined) {
      endContractAtQuarterEnd(state, p, {
        emptyQuarters: Math.ceil(e.rfpWeeks / BALANCE.weeksPerQuarter),
        ...(e.rentIndex !== undefined ? { rentMult: e.rentIndex } : {}),
      })
      logEntry(state, 'log.card_relet', params, weekNo)
      continue
    }
    closeRenewal(state, p)
    if (e.replaceTenant) {
      // A new tenant of the same card now, at the old rent (before this term's haircut) × x.
      scaleRate(p, 1 / (t.revenueMult ?? 1))
      delete t.revenueMult
      delete t.distressedQuarter
      t.prepaymentLeftUsd = 0
      if (e.rentIndex !== undefined) scaleRate(p, e.rentIndex)
      logEntry(
        state,
        'log.card_replaced',
        { ...params, multPct: (e.rentIndex ?? 1) - 1 },
        weekNo,
      )
    } else {
      if (e.rentIndex !== undefined) scaleRate(p, e.rentIndex)
      if (e.revenueMult !== undefined) {
        scaleRate(p, e.revenueMult)
        t.revenueMult = (t.revenueMult ?? 1) * e.revenueMult
      }
    }
    const left = () => contractQuarters(p) - t.servedQuarters
    if (e.term === '1yr') setQuartersLeft(p, C.minTermQuarters)
    if (e.termYears !== undefined)
      setQuartersLeft(
        p,
        e.termYears > 0
          ? e.termYears * 4
          : Math.max(C.minTermQuarters, left() + e.termYears * 4),
      )
    if (e.termAddYears !== undefined)
      setQuartersLeft(p, left() + e.termAddYears * 4)
    if (
      !e.replaceTenant &&
      (e.rentIndex !== undefined ||
        e.revenueMult !== undefined ||
        e.term !== undefined ||
        e.termYears !== undefined ||
        e.termAddYears !== undefined)
    )
      logEntry(
        state,
        'log.card_contract',
        {
          ...params,
          multPct: (e.rentIndex ?? 1) * (e.revenueMult ?? 1) - 1,
          years: left() / 4,
        },
        weekNo,
      )
    if (e.recovery !== undefined) {
      const usd = Math.round(e.recovery * shortfallUsd(p, C.shortfallQuarters))
      const quarter = state.quarter + C.recoveryPaidAfterQuarters
      ;(state.act3Payouts ??= []).push({ quarter, usd, reason: 'recovery' })
      logEntry(
        state,
        'log.card_recovery',
        { ...params, amountUsd: usd, quarter: CONTENT.quarters[quarter] ?? '—' },
        weekNo,
      )
    }
  }
}

/**
 * term "spot" on uncontracted MW: a rolling 1-quarter lease with the best tenant on offer, at the
 * new-lease reference (the card rent × the RFP midpoint), × rent_index for this first quarter only.
 */
function spotLease(
  state: GameState,
  p: Project,
  e: ContractEffect,
  weekNo: number,
): void {
  const card = p.offers
    .map((o) => tenantCard(o.card))
    .filter((c) => c !== undefined)
    .sort((a, b) => b.priceUsdMwYr - a.priceUsdMwYr)[0]
  const mid = rfpMid(state.quarter, scenarioOf(state))
  if (!card || mid === null) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  // M16.2 (mine, reversible): a new lease, so × the hall's tier multiple from 2027Q3.
  const priceMult = mid * (e.rentIndex ?? 1) * shellTierRentMult(state, p)
  p.tenant = {
    card: card.id,
    signedQuarter: state.quarter,
    readyByQuarter: state.quarter,
    lateQuarters: 0,
    walkRolled: true,
    prepaymentLeftUsd: 0,
    servedQuarters: 0,
    priceMult,
    termQuarters: 1,
    ...(e.term === 'spot' ? { rolling: true } : {}),
  }
  p.offers = []
  if (state.firstAiDealQuarter === null) state.firstAiDealQuarter = state.quarter
  logEntry(
    state,
    'log.card_spot_lease',
    { n: p.n, tenant: card.id, rentUsd: annualRentUsd(card, p.kw) * priceMult },
    weekNo,
  )
}

// ---------- the other step-4 effects ----------

/** tenant_slots: n more shell offers in every draw for the next 4 quarters. */
export function extraShellOffers(state: GameState, n: number): void {
  state.events.extraShellOffers = {
    from: state.quarter + 1,
    until: state.quarter + C.tenantSlotsQuarters,
    n,
  }
}

/** idle_mw: the mining machines in the old ASIC price tier switch off. Returns the MW. */
export function idleOldAsics(state: GameState, weekNo: number): number {
  let kw = 0
  for (const lot of state.machines) {
    const model = getModel(lot.model)
    if (lot.idle || model?.act2_price?.tier !== C.idleTier) continue
    lot.idle = true
    kw += lot.count * model.power_kw
  }
  if (kw === 0) logEntry(state, 'log.card_no_target', {}, weekNo)
  else logEntry(state, 'log.card_idle', { mw: kw / 1000 }, weekNo)
  return kw / 1000
}

/** The player turns idled machines back on (Plan phase, 0 Bandwidth). */
export function resumeIdleBlocker(state: GameState): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!state.machines.some((l) => l.idle)) return { key: 'error.nothing_idle' }
  return undefined
}

export function resumeIdle(state: GameState): void {
  let kw = 0
  for (const lot of state.machines) {
    if (!lot.idle) continue
    delete lot.idle
    kw += lot.count * getModel(lot.model)!.power_kw
  }
  logEntry(state, 'log.machines_resumed', { mw: kw / 1000 })
}

/** debt_reduce: the largest project debt or DDTL balance comes down by the amount (not below 0). */
export function reduceDebt(
  state: GameState,
  amountUsd: number,
  weekNo: number,
): void {
  // (project debt or DDTL only: a company facility isn't a project's)
  const f = state.facilities
    .filter((x) => x.kind === 'project_debt' || x.kind === 'ddtl')
    .sort((a, b) => b.balanceUsd - a.balanceUsd)[0]
  if (!f) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const cut = Math.min(f.balanceUsd, amountUsd)
  f.balanceUsd -= cut
  const n = state.projects.find((p) => p.id === f.projectId)?.n ?? 0
  if (f.balanceUsd <= 0.005)
    state.facilities = state.facilities.filter((x) => x !== f)
  logEntry(state, 'log.card_debt_reduced', { n, amountUsd: cut }, weekNo)
}

/**
 * debt_maturity_years: the largest project debt facility runs n more years; what's left is re-spread
 * in equal payments over the quarters it had left plus 4n.
 */
export function extendMaturity(
  state: GameState,
  years: number,
  weekNo: number,
): void {
  const f = state.facilities
    .filter((x) => x.kind === 'project_debt')
    .sort((a, b) => b.balanceUsd - a.balanceUsd)[0]
  if (!f) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const perQuarter = f.amountUsd / f.tenorQuarters
  const left = Math.ceil(f.balanceUsd / perQuarter - 1e-9)
  f.amountUsd = f.balanceUsd
  f.tenorQuarters = left + years * 4
  const n = state.projects.find((p) => p.id === f.projectId)?.n ?? 0
  logEntry(
    state,
    'log.card_maturity',
    { n, years, quarters: f.tenorQuarters },
    weekNo,
  )
}

/** reveals: a free Signals read of one indicator this quarter (the choice's Bandwidth is its cost). */
export function freeRead(
  state: GameState,
  indicator: SignalId,
  weekNo: number,
): void {
  if (!state.scenarioId) return
  ;(state.act3SignalReads ??= []).push({
    quarter: CONTENT.quarters[state.quarter],
    indicator,
  })
  const label = CONTENT.signals[state.scenarioId].find(
    (i) => i.id === indicator,
  )!.label
  logEntry(state, 'log.signal_read', { indicator: label }, weekNo)
}

/** cash "+revenue_this_quarter*k": k × this quarter's total revenue, paid at its end. */
export function revenueShareAtEnd(state: GameState, share: number): void {
  ;(state.act3Payouts ??= []).push({
    quarter: state.quarter,
    revenueShare: share,
    reason: 'revenue_share',
  })
}

/**
 * cash "+backstop_amount": the rent the distressed tenants of backstopped projects won't pay over the
 * next 4 quarters, paid now (0 if none).
 */
export function backstopPayout(state: GameState, weekNo: number): number {
  const usd = Math.round(
    state.projects
      .filter((p) => p.backstop && !projectGone(p))
      .reduce((sum, p) => sum + shortfallUsd(p, C.shortfallQuarters), 0),
  )
  state.cash += usd
  logEntry(state, 'log.card_backstop', { amountUsd: usd }, weekNo)
  return usd
}

/** cash "+ev_stabilized*k" with mw "-X": the smallest live contracted shell is sold at k × its value. */
export function sellSmallestShell(
  state: GameState,
  mult: number,
  weekNo: number,
): void {
  const p = state.projects
    .filter((x) => x.stage === 'live' && x.kind === 'shell' && x.tenant)
    .sort((a, b) => a.kw - b.kw || a.n - b.n)[0]
  if (!p) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const priceUsd = forcedProjectSale(state, p, mult)
  logEntry(state, 'log.card_project_sold', { n: p.n, priceUsd }, weekNo)
}

/** At the end of a quarter: card cash due now (a recovery, or a share of this quarter's revenue). */
export function payAct3Payouts(state: GameState): void {
  const due = state.act3Payouts?.filter((x) => x.quarter === state.quarter)
  if (!due?.length) return
  const st = state.quarterStats
  const revenueUsd = st.revenueUsd + st.hostingFeesUsd + st.aiRevenueUsd
  for (const x of due) {
    const usd = Math.round(x.usd ?? (x.revenueShare ?? 0) * revenueUsd)
    state.cash += usd
    logEntry(state, `log.card_payout_${x.reason}`, { amountUsd: usd })
  }
  state.act3Payouts = state.act3Payouts!.filter(
    (x) => x.quarter !== state.quarter,
  )
}
