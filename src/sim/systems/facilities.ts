// Act II debt secured on a project (scope 0.2 §2.7; doc 18 §7.1, §7.4): project debt and the
// GPU-backed DDTL. The player switches each on in the Deal builder before the build starts; it
// then takes the most the lender allows (its share of cost, trimmed so the projected DSCR stays at
// 1.12× or more), drawn when the build starts. While building, the interest is capitalised: added
// to the loan, with no cash paid (owner, M7.0 answer A1b); once live, equal principal each quarter
// over the contract's term (capitalised interest included) plus interest, paid at quarter end. Two
// quarters in a row unpaid: the lender forecloses on the project (it and its MW go).
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  logEntry,
  projectGone,
  type Facility,
  type GameState,
  type Project,
} from '../state.ts'
import { covenantBreached, inAct2Rules } from '../state.ts'
import {
  ddtlRate,
  isInvestmentGrade,
  projectDebtRate,
  ratingRank,
  sofr,
} from './finance.ts'
import { spreadCut } from './hires.ts'
import {
  companyServiceDue,
  isCompanyFacility,
  serviceCompanyFacility,
} from './corporateDebt.ts'
import { scenarioOf } from './market.ts'
import { debtFrozen } from './eventEffects.ts'
import {
  contractQuarters,
  getProject,
  projectCapex,
  projectedReturn,
  remainingContractUsd,
  tenantCard,
} from './projects.ts'

/** The debt a project can carry (the company-level kinds are corporateDebt.ts's). */
export type DebtKind = 'project_debt' | 'ddtl'

/** The tenant's rating as lenders read it, or null with no tenant. */
function tenantRating(p: Project): string | null {
  return p.tenant ? tenantCard(p.tenant.card)!.rating : null
}

/**
 * An AI-lab tenant rated below BBB with no backstop (owner, M7.0 answer A7): project debt at 50% of
 * cost, at the project-debt rate + 3 points. AI labs rated BBB or better keep the normal bands.
 */
export function subBbbAiLab(p: Project): boolean {
  if (!p.tenant || p.backstop) return false
  const card = tenantCard(p.tenant.card)
  return (
    card?.type === 'ai_lab' &&
    ratingRank(card.rating) < ratingRank(BALANCE.finance.projectDebtMinRating)
  )
}

/** Why this kind of debt can't go on this project (now), or undefined if it can. */
export function debtBlocker(
  state: GameState,
  p: Project,
  kind: DebtKind,
): Message | undefined {
  if (!inAct2Rules(state)) return { key: 'error.act2_only' }
  const f = CONTENT.finance
  const from = kind === 'project_debt' ? f.projectDebt.from : f.ddtl.from
  if (CONTENT.quarters[state.quarter] < from)
    return { key: 'error.debt_early', params: { quarter: from } }
  // The SVB freeze stops new debt only: debt already arranged on a project can still draw (owner,
  // 28 Sep 2026).
  const arranged = kind === 'project_debt' ? p.debt?.projectDebt : p.debt?.ddtl
  if (debtFrozen(state) && !arranged) return { key: 'error.debt_frozen' }
  // Act III (M18.13): a covenant breach bars new debt (arranged debt still draws).
  if (covenantBreached(state) && !arranged)
    return { key: 'error.covenant_breach' }
  if (p.stage !== 'proposed') return { key: 'error.project_started' }
  if (p.debt?.walkedQuarter?.[kind] === state.quarter)
    return { key: 'error.lender_walked' }
  const rating = tenantRating(p)
  if (kind === 'project_debt') {
    if (p.kind === 'pilot') return { key: 'error.debt_no_tenant' }
    // A backstopped tenant is bankable (M4.6, mine); so is an AI lab below BBB, at 50% (M7.0, A7).
    if (
      rating === null ||
      (!p.backstop &&
        !subBbbAiLab(p) &&
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
  const sc = scenarioOf(state)
  if (kind === 'project_debt') return projectDebtRate(state.quarter, sc)
  return (
    ddtlRate(state.quarter, ig, sc) -
    Math.min(
      spreadCut(state),
      ddtlRate(state.quarter, ig, sc) - sofr(state.quarter, sc),
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
  const aiLab = kind === 'project_debt' && subBbbAiLab(p)
  const share =
    kind === 'project_debt'
      ? strong
        ? Math.max(f.projectDebt.ltv[1], ltc.strong)
        : aiLab
          ? ltc.aiLab
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
    apr:
      lenderAprUsual(state, kind, ig) +
      (aiLab ? BALANCE.finance.aiLabProjectDebtSpreadAdd : 0) -
      (p.debt?.aprCut?.[kind] ?? 0),
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

/** How a project's capital slot was just filled (M8.7d): own cash, one of the two debts, a JV partner, a backstop. */
export type CapitalKind = 'cash' | DebtKind | 'jv' | 'backstop'

/**
 * Writes the quarter report's "capital slot filled" line for a project (read-only: it only reads the
 * project and the debt plan). The amount is what the choice means now: own cash = the equity the build
 * still needs after debt and any JV share; a debt = what it would draw; a JV = its share of that
 * equity; a backstop = the lease share it guarantees. Equity raises are company-level and have their
 * own line (`log.equity_raised`).
 */
export function logProjectCapital(
  state: GameState,
  p: Project,
  kind: CapitalKind,
): void {
  const plan = debtPlan(state, p)
  const jvShare = p.jv?.share ?? 0
  const amountUsd =
    kind === 'cash'
      ? plan.equityUsd * (1 - jvShare)
      : kind === 'jv'
        ? plan.equityUsd * jvShare
        : kind === 'backstop'
          ? (p.backstop?.leaseShare ?? 0) * remainingContractUsd(p)
          : (plan.draws.find((d) => d.offer.kind === kind)?.amountUsd ?? 0)
  logEntry(state, `log.project_capital_${kind}`, { n: p.n, amountUsd })
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

/**
 * This quarter's debt service on a facility, in cash: once its project is live, interest plus
 * principal; while it builds, nothing (the interest is capitalised: `capitalisedUsd`).
 */
export function serviceDueUsd(state: GameState, f: Facility) {
  // (M18.1: a company facility pays its interest each quarter and its principal as a bullet)
  if (isCompanyFacility(f))
    return { ...companyServiceDue(f, state.quarter), capitalisedUsd: 0 }
  const p = getProject(state, f.projectId)
  const live = p?.stage === 'live'
  const interest = (f.balanceUsd * f.apr) / 4
  return {
    interestUsd: live ? interest : 0,
    principalUsd: live
      ? Math.min(f.balanceUsd, f.amountUsd / f.tenorQuarters)
      : 0,
    capitalisedUsd: live ? 0 : interest,
  }
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
    // Act III (M18.1, M18.2): a company facility is paid even into negative cash (the liquidity path follows).
    if (isCompanyFacility(f)) {
      const due = serviceCompanyFacility(state, f)
      paid.interestUsd += due.interestUsd
      paid.principalUsd += due.principalUsd
      continue
    }
    const due = serviceDueUsd(state, f)
    // Interest during construction joins the loan (and its principal, repaid once live).
    if (due.capitalisedUsd > 0) {
      f.balanceUsd += due.capitalisedUsd
      f.amountUsd += due.capitalisedUsd
      continue
    }
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

// ---------- the lender cure (Act III, M18.11, DT) ----------

/**
 * A GPU contract walked on a project with a DDTL: the lender gives 2 quarters (designed) to sign a new GPU contract on
 * the project or repay the DDTL in full, by the end of the 2nd quarter after the walk. Debt service goes on meanwhile.
 */
export function startLenderCure(state: GameState, p: Project): void {
  const untilQuarter = state.quarter + BALANCE.act3.lenderCure.quarters
  p.lenderCure = { untilQuarter }
  logEntry(state, 'log.lender_cure_started', {
    n: p.n,
    quarter: CONTENT.quarters[untilQuarter] ?? '—',
  })
}

/** At a quarter's end: each open cure is cured (a new GPU contract, or no DDTL left), or at its deadline forecloses. */
export function settleLenderCures(state: GameState): void {
  for (const p of state.projects) {
    if (!p.lenderCure) continue
    const ddtl = state.facilities.some((f) => f.projectId === p.id && f.kind === 'ddtl')
    if (projectGone(p) || !ddtl || p.tenant?.gpu) {
      delete p.lenderCure
      if (!projectGone(p)) logEntry(state, 'log.lender_cure_done', { n: p.n })
      continue
    }
    if (state.quarter >= p.lenderCure.untilQuarter) {
      delete p.lenderCure
      logEntry(state, 'log.lender_cure_foreclosed', { n: p.n })
      foreclose(state, p)
    }
  }
}

/** Why the DDTL under a lender cure can't be repaid now, or undefined. */
export function cureRepayBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p?.lenderCure) return { key: 'error.no_lender_cure' }
  const owed = state.facilities
    .filter((f) => f.projectId === projectId && f.kind === 'ddtl')
    .reduce((a, f) => a + f.balanceUsd, 0)
  if (state.cash < owed)
    return { key: 'error.no_cash', params: { costUsd: owed, cashUsd: state.cash } }
  return undefined
}

/** Repays the DDTL under a lender cure in full (0 Bandwidth; assumes the blocker passed). */
export function repayCureDdtl(state: GameState, projectId: string): void {
  const owed = state.facilities
    .filter((f) => f.projectId === projectId && f.kind === 'ddtl')
    .reduce((a, f) => a + f.balanceUsd, 0)
  state.facilities = state.facilities.filter(
    (f) => !(f.projectId === projectId && f.kind === 'ddtl'),
  )
  state.cash -= owed
  logEntry(state, 'log.debt_paid_off', { n: getProject(state, projectId)!.n, debt: 'ddtl' })
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
