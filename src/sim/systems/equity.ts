// Act II equity (scope 0.2 §2.7; doc 18 §7.1): a private equity raise, or an at-the-market offering
// once the company is public. Priced at the valuation now (the pre-money): the last quarter report's,
// plus what this quarter's signed contracts add at once (owner decision on the M4 questions). The
// player picks the dilution between lenders.json's 8% and 30% (owner, M7.0 answer A1a) and raises
// pre-money × d ÷ (1 − d), so the new shares are exactly d of the company after the raise. 1 Bandwidth
// each; up to 2 a quarter, both priced the same way.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inActII, logEntry, type GameState } from '../state.ts'
import { contractWeight, remainingContractUsd } from './projects.ts'
import { aiEbitdaUsd } from './valuation.ts'
import { auditEquityMult } from './eventEffects.ts'

/** The raisesDone entries that mark this quarter's equity raises ("equity-2024Q1", "equity-2024Q1#2"). */
const marker = (quarter: number) => `equity-${CONTENT.quarters[quarter]}`

/** Equity raises done this quarter. */
export function raisesThisQuarter(state: GameState): number {
  const m = marker(state.quarter)
  return state.raisesDone.filter((x) => x === m || x.startsWith(`${m}#`))
    .length
}

/** The dilution range of one raise: lenders.json's bottom, the owner's 30% top. */
export function dilutionRange(): [number, number] {
  return [CONTENT.finance.equity.dilution[0], BALANCE.finance.equity.maxDilution]
}

/** Public once the IPO / SPAC round is done: the raise is an at-the-market offering. */
export function isPublic(state: GameState): boolean {
  return state.raisesDone.includes('ipo_spac')
}

/**
 * What signing this quarter adds to the last report's valuation: each contract signed this quarter
 * at its backlog weight, and the pivot premium on the last report's mining EBITDA if the first AI
 * deal was signed this quarter (the report didn't have it yet).
 */
export function signedThisQuarterUsd(state: GameState): {
  backlogUsd: number
  pivotUsd: number
} {
  const backlogUsd = state.projects
    .filter((p) => p.tenant?.signedQuarter === state.quarter)
    .reduce((sum, p) => sum + remainingContractUsd(p) * contractWeight(p), 0)
  const report = state.reports.at(-1)
  const pivotUsd =
    report && state.firstAiDealQuarter === state.quarter
      ? Math.max(0, (report.ebitdaUsd - aiEbitdaUsd(report)) * 4) *
        BALANCE.projects.pivotPremium
      : 0
  return { backlogUsd, pivotUsd }
}

/** The pre-money valuation an equity raise is priced at now: the last report's, plus this quarter's signings. */
export function equityPreMoneyUsd(state: GameState): number {
  const report = state.reports.at(-1)
  if (!report) return 0
  const added = signedThisQuarterUsd(state)
  // An audit that found aggressive depreciation prices equity 10% lower for 2 quarters (M6.0k).
  return (
    Math.max(0, report.valuationUsd + added.backlogUsd + added.pivotUsd) *
    auditEquityMult(state)
  )
}

/** What raising at `dilution` brings in now. */
export function equityRaiseUsd(state: GameState, dilution: number): number {
  return Math.floor((equityPreMoneyUsd(state) * dilution) / (1 - dilution))
}

/** Why an equity raise at `dilution` can't happen now, or undefined if it can. */
export function equityBlocker(
  state: GameState,
  dilution: number,
): Message | undefined {
  if (!inActII(state)) return { key: 'error.act2_only' }
  const [lo, hi] = dilutionRange()
  if (!(dilution >= lo - 1e-9 && dilution <= hi + 1e-9))
    return {
      key: 'error.equity_dilution',
      params: { minPct: lo, maxPct: hi },
    }
  if (equityPreMoneyUsd(state) <= 0) return { key: 'error.equity_no_value' }
  if (raisesThisQuarter(state) >= BALANCE.finance.equity.raisesPerQuarter)
    return {
      key: 'error.equity_once',
      params: { n: BALANCE.finance.equity.raisesPerQuarter },
    }
  const need = BALANCE.finance.bandwidth.equity
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/** Raises equity at `dilution` (assumes equityBlocker passed): cash in, founder diluted. */
export function raiseEquity(state: GameState, dilution: number): void {
  const amountUsd = equityRaiseUsd(state, dilution)
  state.cash += amountUsd
  state.founderStake *= 1 - dilution
  state.bandwidth -= BALANCE.finance.bandwidth.equity
  const done = raisesThisQuarter(state)
  state.raisesDone.push(
    done === 0 ? marker(state.quarter) : `${marker(state.quarter)}#${done + 1}`,
  )
  logEntry(state, isPublic(state) ? 'log.atm_raised' : 'log.equity_raised', {
    amountUsd,
    dilutionPct: dilution,
    stakePct: state.founderStake,
  })
}
