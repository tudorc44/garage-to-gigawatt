// Read-only views of Act II capital for the UI (scope 0.2 §2.2, §2.7; wireframes A2-07 Capital and
// A2-05's capital rows). Re-exported by selectors.ts. No game rules here: the numbers come from
// systems/finance.ts, facilities.ts, equity.ts, partners.ts and rating.ts.
import { BALANCE, CONTENT, type LeverageBand } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import { projectGone, type GameState, type Project } from './state.ts'
import {
  debtOffer,
  debtPlan,
  serviceDueUsd,
  type DebtKind,
} from './systems/facilities.ts'
import {
  equityBlocker,
  equityPreMoneyUsd,
  equityRaiseUsd,
  isPublic,
  signedThisQuarterUsd,
} from './systems/equity.ts'
import { equipmentTerms, ratingLoanBand } from './systems/loans.ts'
import { backstopWarrants } from './systems/partners.ts'
import {
  backlogWeight,
  getProject,
  projectCapex,
  projectedReturn,
  remainingContractUsd,
  tenantCard,
} from './systems/projects.ts'
import { leverageBand, notch, ratingInputs } from './systems/rating.ts'

/** A quarter index as a label, also past the game's last quarter (a loan's maturity in 2034). */
const label = (q: number | null | undefined) => {
  if (q === null || q === undefined) return ''
  const first = CONTENT.quarters[0]
  const i = Number(first.slice(5)) - 1 + q
  return `${Number(first.slice(0, 4)) + Math.floor(i / 4)}Q${(i % 4) + 1}`
}

function whyNot(state: GameState, action: Action): Message | null {
  const r = applyAction(state, action)
  return r.ok ? null : r.error
}

/** The debt/EBITDA thresholds between the matrix's bands. */
const BAND_EDGES: Record<
  LeverageBand,
  { up: number | null; down: number | null }
> = {
  lt2: { up: null, down: 2 },
  from2to4: { up: 2, down: 4 },
  from4to6: { up: 4, down: 6 },
  gt6: { up: 6, down: null },
}
const BANDS: LeverageBand[] = ['lt2', 'from2to4', 'from4to6', 'gt6']

/**
 * The credit rating card (A2-07): the rating, its three inputs, and what one band of leverage
 * either way would make it. null before the first Act II quarter end.
 */
export function ratingView(state: GameState) {
  const report = state.reports.at(-1)
  if (state.act !== 2 || !report || state.creditRating === null) return null
  const inputs = ratingInputs(state, report)
  const matrix = CONTENT.finance.rating.matrix
  const i = BANDS.indexOf(inputs.band)
  const shift = inputs.shortRunway ? CONTENT.finance.rating.runwayNotches : 0
  const at = (band: LeverageBand) => notch(matrix[band][inputs.quality], shift)
  const edges = BAND_EDGES[inputs.band]
  const band = ratingLoanBand(state.creditRating)
  return {
    rating: state.creditRating,
    scale: CONTENT.finance.rating,
    inputs,
    up:
      edges.up !== null ? { rating: at(BANDS[i - 1]), belowX: edges.up } : null,
    down:
      edges.down !== null
        ? { rating: at(BANDS[i + 1]), aboveX: edges.down }
        : null,
    scaleList: (BALANCE.finance.ratingScale as readonly string[]).filter(
      (r) => r !== 'A',
    ),
    /** The equipment loan's terms by rating band (the only corporate debt), and the one you're in. */
    loanBands: BALANCE.finance.equipmentLoan.bands.map((b) => ({
      ...b,
      current: b === band,
    })),
  }
}

/** The debt stack (A2-07): every loan, with its rate, maturity and (project debt) DSCR status. */
export function debtStackView(state: GameState) {
  const rows: {
    kind:
      | 'project_debt'
      | 'ddtl'
      | 'equipment'
      | 'construction'
      | 'bridge'
      | 'crypto'
    projectN: number | null
    balanceUsd: number
    amountUsd: number
    apr: number
    maturity: string
    /** Project debt: its DSCR (a year's projected EBITDA ÷ a year's service), status and rating. */
    dscr: number | null
    status: 'ok' | 'watch' | 'breach' | 'building' | null
    rating: string | null
    missed: number
  }[] = []
  for (const f of state.facilities) {
    const p = getProject(state, f.projectId)
    const live = p?.stage === 'live'
    const due = serviceDueUsd(state, f)
    const yearly = (due.interestUsd + due.principalUsd) * 4
    const ebitda = p ? (projectedReturn(state, p).ebitdaUsd ?? 0) : 0
    const dscr = live && yearly > 0 ? ebitda / yearly : null
    const min = BALANCE.finance.dscrMin
    rows.push({
      kind: f.kind,
      projectN: p?.n ?? null,
      balanceUsd: f.balanceUsd,
      amountUsd: f.amountUsd,
      apr: f.apr,
      maturity: label((p?.readyQuarter ?? f.drawnQuarter) + f.tenorQuarters),
      dscr,
      status: !live
        ? 'building'
        : dscr === null
          ? null
          : dscr < min
            ? 'breach'
            : dscr < min + 0.15
              ? 'watch'
              : 'ok',
      rating: f.rating,
      missed: f.missedQuarters,
    })
  }
  const eq = state.equipmentLoan
  if (eq)
    rows.push({
      kind: 'equipment',
      projectN: null,
      balanceUsd: eq.balanceUsd,
      amountUsd: eq.amountUsd,
      apr: eq.apr,
      maturity: label(
        state.quarter + Math.ceil(eq.weeksLeft / BALANCE.weeksPerQuarter),
      ),
      dscr: null,
      status: null,
      rating: null,
      missed: 0,
    })
  for (const l of state.constructionLoans)
    rows.push({
      kind: 'construction',
      projectN: null,
      balanceUsd: l.balanceUsd,
      amountUsd: l.amountUsd,
      apr: l.apr,
      maturity: label(
        state.quarter + Math.ceil(l.weeksLeft / BALANCE.weeksPerQuarter),
      ),
      dscr: null,
      status: null,
      rating: null,
      missed: 0,
    })
  // The lifeline's bridge loan (M5.2): only when there is one.
  const bridge = state.bridgeLoan
  if (bridge)
    rows.push({
      kind: 'bridge',
      projectN: null,
      balanceUsd: bridge.balanceUsd,
      amountUsd: bridge.amountUsd,
      apr: bridge.apr,
      maturity: label(bridge.dueQuarter),
      dscr: null,
      status: null,
      rating: null,
      missed: 0,
    })
  if (state.cryptoLoan)
    rows.push({
      kind: 'crypto',
      projectN: null,
      balanceUsd: state.cryptoLoan.balanceUsd,
      amountUsd: state.cryptoLoan.balanceUsd,
      apr: state.cryptoLoan.apr,
      maturity: '',
      dscr: null,
      status: null,
      rating: null,
      missed: 0,
    })
  return {
    rows,
    totalUsd: rows.reduce((a, r) => a + r.balanceUsd, 0),
    equipmentOffered: !!equipmentTerms(state),
    dscrMin: BALANCE.finance.dscrMin,
    /** Paying the bridge off early: why not now (null if it can be), when there is one. */
    bridgeRepay: bridge ? whyNot(state, { type: 'REPAY_BRIDGE_LOAN' }) : null,
  }
}

/** Backlog by tenant (A2-07): each contract's remaining value, its weight and what the valuation counts. */
export function backlogView(state: GameState) {
  const rows = state.projects
    .filter((p) => p.tenant && !projectGone(p) && remainingContractUsd(p) > 0)
    .map((p) => {
      const card = tenantCard(p.tenant!.card)!
      const weight = p.backstop
        ? BALANCE.finance.backstopBacklogWeight
        : backlogWeight(card.rating)
      const remainingUsd = remainingContractUsd(p)
      return {
        projectN: p.n,
        tenant: card.id,
        type: card.type,
        rating: card.rating,
        backstopped: !!p.backstop,
        remainingUsd,
        weight,
        countedUsd: remainingUsd * weight,
      }
    })
  return {
    rows,
    totalUsd: rows.reduce((a, r) => a + r.remainingUsd, 0),
    countedUsd: rows.reduce((a, r) => a + r.countedUsd, 0),
  }
}

/** The equity panel (A2-07): the cap table, and the raise at a few dilutions, priced now. */
export function equityView(state: GameState) {
  const pre = equityPreMoneyUsd(state)
  const [lo, hi] = CONTENT.finance.equity.dilution
  const options = [lo, 0.12, 0.16, hi].map((dilution) => ({
    dilution,
    amountUsd: equityRaiseUsd(state, dilution),
    stakeAfter: state.founderStake * (1 - dilution),
    blocker: equityBlocker(state, dilution) ?? null,
  }))
  const signed = signedThisQuarterUsd(state)
  return {
    founderStake: state.founderStake,
    founderValueUsd: pre * state.founderStake,
    preMoneyUsd: pre,
    /** What this quarter's signings add to the last report's valuation (backlog + pivot premium). */
    signedUsd: signed.backlogUsd + signed.pivotUsd,
    public: isPublic(state),
    bandwidth: BALANCE.finance.bandwidth.equity,
    options,
  }
}

/**
 * The Deal builder's capital rows (A2-05) for one project: each instrument with its amount, rate
 * and requirement (the reason it can't be used, if so); the plan the build would draw; the JV and
 * backstop; and the rating it would give, with the debt added, before the project earns.
 */
export function dealCapitalView(state: GameState, p: Project) {
  const plan = debtPlan(state, p)
  const capex = projectCapex(state, p).totalUsd
  const row = (kind: DebtKind) => {
    const o = debtOffer(state, p, kind)
    const on = kind === 'project_debt' ? !!p.debt?.projectDebt : !!p.debt?.ddtl
    const drawn = plan.draws.find((d) => d.offer.kind === kind)?.amountUsd ?? 0
    return {
      kind,
      on,
      blocker: o.blocker,
      capUsd: o.capUsd,
      share: o.share,
      apr: o.apr,
      tenorQuarters: o.tenorQuarters,
      rating: o.rating,
      amountUsd: drawn,
      toggle: whyNot(state, {
        type: 'PROJECT_DEBT',
        projectId: p.id,
        debt: kind,
        on: !on,
      }),
    }
  }
  const jvShares = [0.5, 0.65, 0.8]
  const jvUsd = p.jv ? p.jv.share * plan.equityUsd : 0
  const eqTerms = equipmentTerms(state)
  // The rating if this debt were on the books now, with this quarter's EBITDA (mine: a preview).
  const report = state.reports.at(-1)
  let ratingAfter: string | null = null
  if (report && state.creditRating !== null && plan.totalUsd > 0) {
    const inputs = ratingInputs(state, report)
    const band = leverageBand(
      inputs.debtUsd + plan.totalUsd,
      report.ebitdaUsd * 4,
    )
    ratingAfter = notch(
      CONTENT.finance.rating.matrix[band][inputs.quality],
      inputs.shortRunway ? CONTENT.finance.rating.runwayNotches : 0,
    )
  }
  return {
    capexUsd: capex,
    projectDebt: row('project_debt'),
    ddtl: row('ddtl'),
    equipment:
      p.kind === 'shell' || !eqTerms
        ? null
        : { apr: eqTerms.apr, ltv: eqTerms.ltv },
    jv: {
      share: p.jv?.share ?? null,
      fundsUsd: jvUsd,
      options: jvShares.map((share) => ({
        share,
        blocker: whyNot(state, { type: 'PROJECT_JV', projectId: p.id, share }),
      })),
    },
    backstop: p.backstop
      ? { taken: true as const, warrantsShare: p.backstop.warrantsShare }
      : {
          taken: false as const,
          warrantsShare: p.tenant ? backstopWarrants(state, p) : 0,
          blocker: whyNot(state, { type: 'PROJECT_BACKSTOP', projectId: p.id }),
        },
    debtUsd: plan.totalUsd,
    ownCashUsd: Math.max(0, plan.equityUsd - jvUsd),
    dscr: plan.dscr,
    dscrMin: BALANCE.finance.dscrMin,
    ratingBefore: state.creditRating,
    ratingAfter,
  }
}
