// Act II debt secured on a project (scope 0.2 §2.7; doc 18 §7.1, §7.4): project debt and the
// GPU-backed DDTL. The player switches each on in the Deal builder before the build starts; it
// then takes the most the lender allows (its share of cost, trimmed so the projected DSCR stays at
// 1.12× or more), drawn when the build starts. Interest only while building, then equal principal
// each quarter over the contract's term; paid at quarter end. Two quarters in a row unpaid: the
// lender forecloses on the project (it and its MW go).
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  logEntry,
  type Facility,
  type GameState,
  type Project,
} from '../state.ts'
import {
  ddtlRate,
  isInvestmentGrade,
  projectDebtRate,
  ratingRank,
  sofr,
} from './finance.ts'
import { spreadCut } from './hires.ts'
import { debtFrozen } from './eventEffects.ts'
import {
  contractQuarters,
  getProject,
  projectCapex,
  projectedReturn,
  tenantCard,
} from './projects.ts'

export type DebtKind = Facility['kind']

/** The tenant's rating as lenders read it, or null with no tenant. */
function tenantRating(p: Project): string | null {
  return p.tenant ? tenantCard(p.tenant.card)!.rating : null
}

/** Why this kind of debt can't go on this project (now), or undefined if it can. */
export function debtBlocker(
  state: GameState,
  p: Project,
  kind: DebtKind,
): Message | undefined {
  if (state.act !== 2) return { key: 'error.act2_only' }
  const f = CONTENT.finance
  const from = kind === 'project_debt' ? f.projectDebt.from : f.ddtl.from
  if (CONTENT.quarters[state.quarter] < from)
    return { key: 'error.debt_early', params: { quarter: from } }
  // The SVB freeze stops new debt only: debt already arranged on a project can still draw (owner,
  // 28 Sep 2026).
  const arranged = kind === 'project_debt' ? p.debt?.projectDebt : p.debt?.ddtl
  if (debtFrozen(state) && !arranged) return { key: 'error.debt_frozen' }
  if (p.stage !== 'proposed') return { key: 'error.project_started' }
  if (p.debt?.walkedQuarter?.[kind] === state.quarter)
    return { key: 'error.lender_walked' }
  const rating = tenantRating(p)
  if (kind === 'project_debt') {
    if (p.kind === 'pilot') return { key: 'error.debt_no_tenant' }
    // A backstopped tenant is bankable (M4.6, mine).
    if (
      rating === null ||
      (!p.backstop &&
        ratingRank(rating) < ratingRank(BALANCE.finance.projectDebtMinRating))
    )
      return { key: 'error.debt_needs_bbb' }
    return undefined
  }
  if (!p.tenant?.gpu || rating === null || ratingRank(rating) < 0)
    return { key: 'error.ddtl_needs_contract' }
  return undefined
}

/** One kind of debt as the lender would size and price it today, or its blocker. */
export interface DebtOffer {
  kind: DebtKind
  blocker: Message | null
  /** The most it lends, before the DSCR trim: its share × the cost it finances. */
  capUsd: number
  share: number
  apr: number
  tenorQuarters: number
  rating: string
}

/**
 * A kind of debt's rate before any negotiation: project debt at the quarter's rate; a DDTL at its
 * spread by tenant credit, less the Capital Markets Lead's cut (M5.7), plus a card's widening (M5.8).
 */
export function lenderAprUsual(
  state: GameState,
  kind: DebtKind,
  ig: boolean,
): number {
  if (kind === 'project_debt') return projectDebtRate(state.quarter)
  return (
    ddtlRate(state.quarter, ig) -
    Math.min(
      spreadCut(state),
      ddtlRate(state.quarter, ig) - sofr(state.quarter),
    ) +
    state.events.spreadAddBps / 10_000
  )
}

/** What each kind of debt would lend on this project (before the DSCR trim). */
export function debtOffer(
  state: GameState,
  p: Project,
  kind: DebtKind,
): DebtOffer {
  const cost = projectCapex(state, p)
  const rating = tenantRating(p) ?? ''
  const ig = isInvestmentGrade(rating)
  const strong = !!p.backstop || ratingRank(rating) >= ratingRank('A')
  const f = CONTENT.finance
  // Project debt's loan-to-cost by tenant band (owner, 28 Sep 2026), never below lenders.json's.
  const ltc = BALANCE.finance.projectDebtLtc
  const share =
    kind === 'project_debt'
      ? strong
        ? Math.max(f.projectDebt.ltv[1], ltc.strong)
        : Math.max(f.projectDebt.ltv[0], ltc.bbb)
      : ig
        ? BALANCE.finance.ddtl.advance.ig
        : BALANCE.finance.ddtl.advance.other
  const base = kind === 'project_debt' ? cost.totalUsd : cost.gpuUsd
  return {
    kind,
    blocker: debtBlocker(state, p, kind) ?? null,
    capUsd: base * share,
    share,
    apr: lenderAprUsual(state, kind, ig) - (p.debt?.aprCut?.[kind] ?? 0),
    tenorQuarters: Math.max(1, contractQuarters(p)),
    // Secured debt on a strong tenant rates A even when the company doesn't (doc 18 §7.2).
    rating: strong ? 'A' : (rating.split(/[\s/(]/)[0] ?? ''),
  }
}

/** A year of debt service on `amount`: interest plus principal over the tenor. */
function yearlyServicePerDollar(o: DebtOffer): number {
  return o.apr + 4 / o.tenorQuarters
}

/**
 * The debt this project would draw if it started now: each kind the player switched on and the
 * lender allows, project debt first, each trimmed so the projected DSCR (a year's EBITDA ÷ a year
 * of debt service) stays at the covenant's 1.12× or more. Never more than the capex.
 */
export function debtPlan(state: GameState, p: Project) {
  const ebitda = Math.max(0, projectedReturn(state, p).ebitdaUsd ?? 0)
  const capex = projectCapex(state, p).totalUsd
  let serviceLeft = ebitda / BALANCE.finance.dscrMin
  let capexLeft = capex
  const draws: { offer: DebtOffer; amountUsd: number }[] = []
  for (const kind of ['project_debt', 'ddtl'] as const) {
    const on = kind === 'project_debt' ? p.debt?.projectDebt : p.debt?.ddtl
    const offer = debtOffer(state, p, kind)
    if (!on || offer.blocker) continue
    const byDscr = serviceLeft / yearlyServicePerDollar(offer)
    const amountUsd = Math.max(
      0,
      Math.floor(Math.min(offer.capUsd, byDscr, capexLeft)),
    )
    if (amountUsd <= 0) continue
    serviceLeft -= amountUsd * yearlyServicePerDollar(offer)
    capexLeft -= amountUsd
    draws.push({ offer, amountUsd })
  }
  const totalUsd = draws.reduce((a, d) => a + d.amountUsd, 0)
  const serviceUsd = draws.reduce(
    (a, d) => a + d.amountUsd * yearlyServicePerDollar(d.offer),
    0,
  )
  return {
    draws,
    totalUsd,
    /** Own cash the build still needs. */
    equityUsd: capex - totalUsd,
    /** Projected DSCR, or null with no debt. */
    dscr: serviceUsd > 0 ? ebitda / serviceUsd : null,
  }
}

/** Switches one kind of debt on or off for a proposed project (0 Bandwidth). */
export function setProjectDebt(
  state: GameState,
  projectId: string,
  kind: DebtKind,
  on: boolean,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (on) {
    const blocker = debtBlocker(state, p, kind)
    if (blocker) return blocker
  } else if (p.stage !== 'proposed') return { key: 'error.project_started' }
  const debt = p.debt ?? { projectDebt: false, ddtl: false }
  if (kind === 'project_debt') debt.projectDebt = on
  else debt.ddtl = on
  p.debt = debt
  return undefined
}

/**
 * At the start of a build: draws the debt planned just before it started (debtPlan, computed while
 * the project was still proposed): cash in, one facility per kind.
 */
export function drawFacilities(
  state: GameState,
  projectId: string,
  plan: ReturnType<typeof debtPlan>,
): void {
  const p = getProject(state, projectId)!
  for (const { offer, amountUsd } of plan.draws) {
    const n = state.facilities.reduce(
      (m, f) => Math.max(m, Number(f.id.split('-')[1])),
      0,
    )
    state.facilities.push({
      id: `facility-${n + 1}`,
      kind: offer.kind,
      projectId,
      amountUsd,
      balanceUsd: amountUsd,
      apr: offer.apr,
      tenorQuarters: offer.tenorQuarters,
      drawnQuarter: state.quarter,
      missedQuarters: 0,
      rating: offer.rating,
    })
    state.cash += amountUsd
    logEntry(state, 'log.debt_drawn', {
      n: p.n,
      debt: offer.kind,
      amountUsd,
      aprPct: offer.apr,
    })
  }
}

/** This quarter's debt service on a facility: interest, plus principal once its project is live. */
export function serviceDueUsd(state: GameState, f: Facility) {
  const p = getProject(state, f.projectId)
  const interestUsd = (f.balanceUsd * f.apr) / 4
  const principalUsd =
    p?.stage === 'live'
      ? Math.min(f.balanceUsd, f.amountUsd / f.tenorQuarters)
      : 0
  return { interestUsd, principalUsd }
}

/**
 * At quarter end, before the cash check: each facility's debt service is paid if the cash covers
 * it. If not, the quarter is missed and its interest is added to what's owed; the second missed
 * quarter in a row forecloses the project. Returns what was paid.
 */
export function serviceFacilities(state: GameState): {
  interestUsd: number
  principalUsd: number
} {
  const paid = { interestUsd: 0, principalUsd: 0 }
  for (const f of [...state.facilities]) {
    const due = serviceDueUsd(state, f)
    const total = due.interestUsd + due.principalUsd
    if (state.cash >= total) {
      state.cash -= total
      f.balanceUsd -= due.principalUsd
      f.missedQuarters = 0
      paid.interestUsd += due.interestUsd
      paid.principalUsd += due.principalUsd
      if (f.balanceUsd <= 0.005) {
        state.facilities = state.facilities.filter((x) => x !== f)
        logEntry(state, 'log.debt_paid_off', {
          n: getProject(state, f.projectId)?.n ?? 0,
          debt: f.kind,
        })
      }
      continue
    }
    f.missedQuarters++
    f.balanceUsd += due.interestUsd
    const p = getProject(state, f.projectId)
    logEntry(state, 'log.debt_missed', {
      n: p?.n ?? 0,
      debt: f.kind,
      dueUsd: total,
      missed: f.missedQuarters,
    })
    if (p && f.missedQuarters >= BALANCE.finance.foreclosureMissedQuarters)
      foreclose(state, p)
  }
  return paid
}

/** The lender takes the project: it, its MW and its debt leave the company. */
function foreclose(state: GameState, p: Project): void {
  const site = state.sites.find((s) => s.id === p.siteId)
  if (site) site.soldKw = (site.soldKw ?? 0) + p.kw
  const debtUsd = state.facilities
    .filter((f) => f.projectId === p.id)
    .reduce((a, f) => a + f.balanceUsd, 0)
  state.facilities = state.facilities.filter((f) => f.projectId !== p.id)
  p.stage = 'foreclosed'
  p.soldQuarter = state.quarter
  logEntry(state, 'log.project_foreclosed', {
    n: p.n,
    tier: site?.tier ?? '',
    debtUsd,
  })
}

/** When a project is sold (or its GPUs are): what it still owes is repaid from the cash. */
export function repayProjectFacilities(
  state: GameState,
  projectId: string,
): number {
  const owed = state.facilities
    .filter((f) => f.projectId === projectId)
    .reduce((a, f) => a + f.balanceUsd, 0)
  state.facilities = state.facilities.filter((f) => f.projectId !== projectId)
  state.cash -= owed
  return owed
}

/** What's still owed on project facilities. */
export function facilitiesDebtUsd(state: GameState): number {
  return state.facilities.reduce((a, f) => a + f.balanceUsd, 0)
}
