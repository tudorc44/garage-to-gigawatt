// Act III's leverage covenant (M18.13, DT; designed numbers in BALANCE.act3.covenant). Lenders test company LTV
// (everything owed ÷ the quarter's valuation) at each Act III quarter end against a limit of max(75%, the LTV the
// company entered Act III with + 5 points): carried debt was signed at the entry level, so a company that enters
// highly levered isn't in breach on day one.
//
// A breach: no new debt (project debt, DDTLs, equipment loans, a card's corporate facility; the standby can still be
// drawn, though it can't cure: the cash it brings is owed too); each later quarter end sweeps 50% of the quarter's
// positive operating cash flow (EBITDA less interest) to prepay debt, highest rate first. LTV must be back to the
// limit − 10 points by the end of the 2nd quarter after the breach (repay, raise or sell, at normal prices). If it
// isn't, forced sales run (the rescue's × 0.85: live shells at their cap-rate value, then clouds and pilots at their
// GPUs' residual value, smallest first), their proceeds repaying debt, until it is. If even that falls short, the
// lenders call what's left: it's paid from cash, and the existing rescue and game-over rules follow.
// None of these are the player's moves: nothing here is logged to act3Moves.
import { BALANCE } from '../../content/index.ts'
import {
  inAct3Rules,
  logEntry,
  type GameState,
  type Project,
  type QuarterReport,
} from '../state.ts'
import { logQuarterLabel } from '../state.ts'
import { debtUsd } from './loans.ts'
import { repayProjectFacilities } from './facilities.ts'
import {
  gpuResidualUsd,
  ownedShareOut,
  saleValueUsd,
} from './projects.ts'
import { ebitdaUsd } from './valuation.ts'

const C = () => BALANCE.act3.covenant

/** The company's covenant limit: max(75%, its LTV at Act III entry + 5 points). */
export function covenantLimit(state: GameState): number {
  const e = state.act3Entry
  const entryLtv = e ? e.debtUsd / Math.max(1, e.valuationUsd) : 0
  return Math.max(C().floorLtv, entryLtv + C().entryHeadroom)
}

/** The LTV a breach must get back to: the limit − 10 points. */
export function covenantCureLtv(state: GameState): number {
  return covenantLimit(state) - C().cureMargin
}

/** Company LTV: everything owed ÷ a valuation (the last quarter report's by default). */
export function companyLtv(state: GameState, valuationUsd?: number): number {
  const v = valuationUsd ?? state.reports.at(-1)?.valuationUsd ?? 0
  const debt = debtUsd(state)
  if (debt <= 0) return 0
  return v > 0 ? debt / v : Infinity
}

/**
 * Prepays up to `usd` of debt from cash, highest rate first: facilities (project and company) and the equipment loan.
 * A facility paid off is removed. Returns what was paid.
 */
export function prepayDebt(state: GameState, usd: number): number {
  let left = Math.min(usd, Math.max(0, state.cash))
  const loans: { apr: number; pay: (x: number) => number }[] = [
    ...state.facilities.map((f) => ({
      apr: f.apr,
      pay: (x: number) => {
        const paid = Math.min(x, f.balanceUsd)
        f.balanceUsd -= paid
        if (f.balanceUsd <= 0.005)
          state.facilities = state.facilities.filter((y) => y !== f)
        return paid
      },
    })),
  ]
  const eq = state.equipmentLoan
  if (eq)
    loans.push({
      apr: eq.apr,
      pay: (x: number) => {
        const paid = Math.min(x, eq.balanceUsd)
        eq.balanceUsd -= paid
        if (eq.balanceUsd <= 0.005) state.equipmentLoan = null
        return paid
      },
    })
  let total = 0
  for (const l of loans.sort((a, b) => b.apr - a.apr)) {
    if (left <= 0) break
    const paid = l.pay(left)
    left -= paid
    total += paid
  }
  state.cash -= total
  return total
}

/**
 * Before the quarter report, while a breach found at an earlier quarter end is open: the cash sweep, 50% of the
 * quarter's positive operating cash flow (EBITDA less interest) to prepay debt. Returns what was swept.
 */
export function covenantSweep(state: GameState): number {
  const b = state.covenantBreach
  if (!inAct3Rules(state) || !b || state.quarter <= b.fromQuarter) return 0
  const st = state.quarterStats
  const flow = Math.max(0, ebitdaUsd(st) - st.interestUsd)
  const usd = prepayDebt(state, C().sweepShare * flow)
  if (usd > 0) logEntry(state, 'log.covenant_sweep', { amountUsd: usd })
  return usd
}

/** A forced sale's price and the value it gives up (shells: cap-rate value; clouds and pilots: GPU residual). */
function forcedSaleOf(state: GameState, p: Project) {
  const mult = BALANCE.finance.rescue.saleMult
  const fairUsd =
    p.kind === 'shell'
      ? saleValueUsd(state, p)
      : gpuResidualUsd(p, state.quarter) * (1 - ownedShareOut(p))
  return { fairUsd, priceUsd: Math.round(fairUsd * mult) }
}

/**
 * Forced sales until LTV ≤ the cure level: live shells first, then clouds and pilots, smallest first, each sale's
 * net proceeds prepaying debt. Valuation after a sale is estimated as the valuation less what the sale gave up
 * (fair value − price); the next quarter's test uses the real one. Returns the estimated LTV after.
 */
function covenantForcedSales(state: GameState, valuationUsd: number): number {
  const cure = covenantCureLtv(state)
  let v = valuationUsd
  const order = (p: Project) => (p.kind === 'shell' ? 0 : 1)
  const candidates = state.projects
    .filter(
      (p) =>
        p.stage === 'live' &&
        (p.kind === 'shell' ? !!p.tenant : p.gpuCapexUsd > 0),
    )
    .sort((a, b) => order(a) - order(b) || a.kw - b.kw || a.n - b.n)
  for (const p of candidates) {
    if (companyLtv(state, v) <= cure) break
    const { fairUsd, priceUsd } = forcedSaleOf(state, p)
    if (priceUsd <= 0) continue
    if (p.kind === 'shell') {
      const site = state.sites.find((s) => s.id === p.siteId)
      if (site) site.soldKw = (site.soldKw ?? 0) + p.kw
      p.stage = 'sold'
    } else p.stage = 'ended'
    p.soldQuarter = state.quarter
    const cashBefore = state.cash
    state.cash += priceUsd
    repayProjectFacilities(state, p.id)
    // the rest of the proceeds repay other debt
    prepayDebt(state, Math.max(0, state.cash - Math.max(0, cashBefore)))
    v -= fairUsd - priceUsd
    logEntry(state, 'log.covenant_forced_sale', { n: p.n, priceUsd })
  }
  return companyLtv(state, v)
}

/**
 * After the quarter report: the covenant test. Opens a breach above the limit; settles an open one (cured, or at its
 * deadline forced sales and, if they fall short, the lenders call the rest). Fills `report.covenant`.
 */
export function testCovenant(state: GameState, report: QuarterReport): void {
  if (!inAct3Rules(state)) return
  const limit = covenantLimit(state)
  const cure = covenantCureLtv(state)
  const ltv = companyLtv(state, report.valuationUsd)
  const b = state.covenantBreach
  if (b) {
    if (ltv <= cure) {
      logEntry(state, 'log.covenant_cured', { ltvPct: ltv })
      delete state.covenantBreach
    } else if (state.quarter >= b.untilQuarter) {
      const after = covenantForcedSales(state, report.valuationUsd)
      if (after > cure) {
        // the lenders call what's left: paid from cash; short, the rescue and game-over rules follow
        const called = () =>
          state.facilities.reduce((a, f) => a + f.balanceUsd, 0) +
          (state.equipmentLoan?.balanceUsd ?? 0)
        const calledUsd = called()
        prepayDebt(state, calledUsd)
        const unpaid = called()
        state.facilities = []
        state.equipmentLoan = null
        state.cash -= unpaid
        logEntry(state, 'log.covenant_called', { debtUsd: calledUsd })
      } else logEntry(state, 'log.covenant_cured', { ltvPct: after })
      delete state.covenantBreach
      report.cash = state.cash
    }
  } else if (ltv > limit) {
    state.covenantBreach = {
      fromQuarter: state.quarter,
      untilQuarter: state.quarter + C().cureQuarters,
    }
    logEntry(state, 'log.covenant_breach', {
      ltvPct: ltv,
      limitPct: limit,
      curePct: cure,
      quarter: logQuarterLabel(state, state.covenantBreach.untilQuarter, ''),
    })
  }
  report.covenant = {
    ltv,
    limit,
    cureLtv: cure,
    ...(state.covenantBreach
      ? { untilQuarter: state.covenantBreach.untilQuarter }
      : {}),
  }
}
