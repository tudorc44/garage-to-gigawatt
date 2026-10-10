// Act IV's orbital capital (M31.2; doc 33 §11.1, §11.4, IV-D23). The block's Capital slot: own cash; an export-credit
// loan (80% of the build at 5% fixed, interest added during the build, repaid over 28 quarters from going live; the
// partner's manufacturer adds 10% to the build and its registry is required); orbital project debt (60% of capex at
// SOFR + a spread by tenant, only with a take-or-pay tenant, and the insurance covenant: cover ≥ 50% of the drawn debt,
// a breach cured within 2 quarters or the loan is called); sovereign co-funding (the partner pays 30% of capex for 30% of
// the revenue and its strings). Debt is drawn as the capex is paid and serviced at the quarter's end.
import { ORBIT } from '../../content/orbitContent.ts'
import { MONEY } from '../../content/moneyContent.ts'
import type { Message } from '../../i18n/t.ts'
import { inActIV, logEntry, type GameState, type OrbitalBlock, type OrbitalDebt } from '../state.ts'
import { sofr } from './finance.ts'
import { scenarioOf } from './market.ts'
import { moonOf } from './moon.ts'
import { orbitBlock, orbitOf } from './orbit.ts'

const C = MONEY.capital
export const CAPITAL_KINDS = ['cash', 'export_credit', 'project_debt', 'co_funding'] as const
export type CapitalKind = (typeof CAPITAL_KINDS)[number]

/** The co-funding partner: the Accords bloc's programme under its registry, the Station partnership's otherwise. */
export const cofundBloc = (state: GameState): 'accords' | 'station' =>
  orbitOf(state).registry === 'accords' ? 'accords' : 'station'

/** The rate a loan of this kind would carry now (export credit fixed; project debt SOFR + the tenant's spread). */
export function debtApr(state: GameState, b: OrbitalBlock, kind: 'export_credit' | 'project_debt'): number {
  if (kind === 'export_credit') return C.export_credit.apr
  const t = b.tenant && b.tenant !== 'spot' ? b.tenant.type : 'eo_processor'
  return sofr(state.quarter, scenarioOf(state)) + C.project_debt.spread_bps[t] / 10_000
}

export function capitalBlocker(state: GameState, b: OrbitalBlock, kind: CapitalKind): Message | undefined {
  if (kind === 'export_credit' && orbitOf(state).registry !== C.export_credit.registry)
    return { key: 'error.orbit_eca_registry' }
  if (kind === 'project_debt' && (!b.tenant || b.tenant === 'spot')) return { key: 'error.orbit_debt_needs_tenant' }
  if (kind === 'co_funding') {
    const aligned = state.act4Moon?.alignedBloc
    if (aligned && aligned !== cofundBloc(state)) return { key: 'error.moon_other_bloc' }
  }
}

/** Fills the Capital slot (the Bandwidth is paid by the caller); co-funding brings its bloc's strings. */
export function setCapital(state: GameState, b: OrbitalBlock, kind: CapitalKind): void {
  b.capital = kind
  if (kind === 'co_funding') {
    b.cofundShare = C.co_funding.revenue_share
    moonOf(state).alignedBloc = cofundBloc(state)
  }
  if (kind === 'export_credit' || kind === 'project_debt') newDebt(state, b, kind)
  logEntry(state, 'log.orbit.capital', { n: b.n, capital: kind })
}

/** A new loan on a block (when the slot is filled, and again for a rebuild after a lost launch). */
function newDebt(state: GameState, b: OrbitalBlock, kind: 'export_credit' | 'project_debt'): OrbitalDebt {
  const o = orbitOf(state)
  o.debts ??= []
  const d: OrbitalDebt = {
    id: `od${b.n}.${o.debts.filter((x) => x.blockId === b.id).length + 1}`,
    blockId: b.id,
    n: b.n,
    kind,
    apr: debtApr(state, b, kind),
    limitUsd: 0,
    balanceUsd: 0,
    tenorQuarters:
      kind === 'export_credit'
        ? C.export_credit.tenor_quarters
        : b.tenant && b.tenant !== 'spot'
          ? b.tenant.termQuarters
          : 12,
    amortizing: false,
    paidQuarters: 0,
    cureUntil: null,
  }
  o.debts.push(d)
  return d
}

/** A lost launch: the block's loan stops waiting for it and is repaid from now on (a rebuild borrows afresh). */
export function debtAfterLoss(state: GameState, b: OrbitalBlock): void {
  const d = blockDebt(state, b.id)
  if (d) d.amortizing = true
}

export const blockDebt = (state: GameState, blockId: string): OrbitalDebt | undefined =>
  state.act4Orbit?.debts?.find((d) => d.blockId === blockId && !d.closed)

/** The loan drawing for a block's capex now: its open one still being built against, or a fresh one. */
function drawingDebt(state: GameState, b: OrbitalBlock): OrbitalDebt | undefined {
  if (b.capital !== 'export_credit' && b.capital !== 'project_debt') return undefined
  const d = state.act4Orbit?.debts?.find((x) => x.blockId === b.id && !x.closed && !x.amortizing)
  return d ?? newDebt(state, b, b.capital)
}

/** The build-cost multiplier the Capital slot brings (export credit: the partner's manufacturer). */
export const buildCostMult = (b: OrbitalBlock): number =>
  b.capital === 'export_credit' ? C.export_credit.build_cost_mult : 1

/**
 * Who pays a capex bill (the build, or the launch's rest): the share the lender or partner pays, drawn now; the rest is
 * your cash. Returns what comes out of your cash.
 */
export function payCapex(state: GameState, b: OrbitalBlock, usd: number, part: 'build' | 'launch'): number {
  let theirs = 0
  if (b.capital === 'co_funding') theirs = usd * C.co_funding.share_of_capex
  const d = drawingDebt(state, b)
  if (d) {
    const share =
      d.kind === 'export_credit' ? (part === 'build' ? C.export_credit.share_of_build : 0) : C.project_debt.share_of_capex
    const draw = usd * share
    d.limitUsd += draw
    d.balanceUsd += draw
    theirs += draw
  }
  const mine = usd - theirs
  state.cash -= mine
  return mine
}

/** Insurance proceeds go to the block's lender first (a lost launch): returns what's left for you. */
export function repayFromProceeds(state: GameState, b: OrbitalBlock, usd: number): number {
  const d = blockDebt(state, b.id)
  if (!d) return usd
  const repay = Math.min(d.balanceUsd, usd)
  d.balanceUsd -= repay
  if (d.balanceUsd <= 0.005) closeDebt(state, d)
  return usd - repay
}

function closeDebt(state: GameState, d: OrbitalDebt): void {
  d.balanceUsd = 0
  d.closed = true
  logEntry(state, 'log.orbit.debt_paid_off', { n: d.n })
}

/** Orbital debt outstanding (part of the company's debt). */
export const orbitalDebtUsd = (state: GameState): number =>
  (state.act4Orbit?.debts ?? []).filter((d) => !d.closed).reduce((usd, d) => usd + d.balanceUsd, 0)

/**
 * At the end of a quarter: loans on blocks still being built add their interest; loans on live (or lost) blocks are
 * repaid in equal principal over their tenor with interest; project debt's insurance covenant is tested (a breach opens a
 * 2-quarter cure; uncured, the lender calls the loan).
 */
export function serviceOrbitalDebt(state: GameState): { interestUsd: number; principalUsd: number } {
  const paid = { interestUsd: 0, principalUsd: 0 }
  const o = state.act4Orbit
  if (!o?.debts || !inActIV(state)) return paid
  for (const d of o.debts.filter((x) => !x.closed && x.balanceUsd > 0)) {
    const b = orbitBlock(state, d.blockId)
    if (!d.amortizing && (!b || b.stage === 'live' || b.stage === 'retired' || b.stage === 'sold')) d.amortizing = true
    const interest = (d.balanceUsd * d.apr) / 4
    if (!d.amortizing) {
      d.balanceUsd += interest
      continue
    }
    const left = Math.max(1, d.tenorQuarters - d.paidQuarters)
    const principal = d.balanceUsd / left
    state.cash -= interest + principal
    d.balanceUsd -= principal
    d.paidQuarters++
    paid.interestUsd += interest
    paid.principalUsd += principal
    if (d.balanceUsd <= 0.005) closeDebt(state, d)
    else if (d.kind === 'project_debt' && b) testInsuranceCovenant(state, d, b)
  }
  return paid
}

/** Project debt needs insured value ≥ 50% of the drawn debt (doc 33 §11.4). */
function testInsuranceCovenant(state: GameState, d: OrbitalDebt, b: OrbitalBlock): void {
  const cover =
    b.insured && (b.insured.untilQuarter === null || b.insured.untilQuarter >= state.quarter) ? b.insured.coverUsd : 0
  const ok = cover >= ORBIT.insurance.lender_cover_min_share * d.balanceUsd
  if (ok) {
    if (d.cureUntil !== null) logEntry(state, 'log.orbit.covenant_cured', { n: d.n })
    d.cureUntil = null
    return
  }
  if (d.cureUntil === null) {
    d.cureUntil = state.quarter + C.project_debt.cure_quarters
    logEntry(state, 'log.orbit.covenant_breach', { n: d.n })
    return
  }
  if (state.quarter >= d.cureUntil) {
    // the lender calls the loan: paid from cash now (short of cash, the rescue and the game-over rules follow)
    const calledUsd = d.balanceUsd
    state.cash -= calledUsd
    logEntry(state, 'log.orbit.debt_called', { n: d.n, debtUsd: calledUsd })
    closeDebt(state, d)
  }
}

/** The share of a capex bill that comes out of your cash (the rest: the lender's draw or the partner's share). */
export function ownShare(_state: GameState, b: OrbitalBlock, part: 'build' | 'launch'): number {
  let theirs = b.capital === 'co_funding' ? C.co_funding.share_of_capex : 0
  if (b.capital === 'export_credit' && part === 'build') theirs += C.export_credit.share_of_build
  if (b.capital === 'project_debt') theirs += C.project_debt.share_of_capex
  return Math.max(0, 1 - theirs)
}
