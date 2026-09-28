// Act II partners (scope 0.2 §2.7, doc 18 §7.1): the big-tech backstop (2025Q3+, tenants rated BB
// or lower) and the JV partner (2025Q1+, projects of 100 MW or more). The scope's cut order: the JV
// first, the backstop second, if they get expensive.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  logEntry,
  projectGone,
  type GameState,
  type Project,
} from '../state.ts'
import { inActII } from '../state.ts'
import { ratingRank } from './finance.ts'
import { getProject, remainingContractUsd, tenantCard } from './projects.ts'

// ---------- the big-tech backstop ----------

/** The warrants a backstop would take now: its value ÷ the company's, within 3–6%. */
export function backstopWarrants(state: GameState, p: Project): number {
  const f = BALANCE.finance
  const guaranteedUsd = f.backstopLeaseShare * remainingContractUsd(p)
  const valuation = Math.max(1, state.reports.at(-1)?.valuationUsd ?? 0)
  const [lo, hi] = CONTENT.finance.backstop.equity
  return Math.min(
    hi,
    Math.max(lo, (f.backstopWarrantValueShare * guaranteedUsd) / valuation),
  )
}

/** Why a backstop can't go on this project now, or undefined if it can. */
export function backstopBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  if (!inActII(state)) return { key: 'error.act2_only' }
  const from = BALANCE.finance.backstopFrom
  if (CONTENT.quarters[state.quarter] < from)
    return { key: 'error.debt_early', params: { quarter: from } }
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind !== 'shell' || !p.tenant || projectGone(p))
    return { key: 'error.backstop_lease' }
  if (p.backstop) return { key: 'error.backstop_done' }
  if (ratingRank(tenantCard(p.tenant.card)!.rating) > ratingRank('BB'))
    return { key: 'error.backstop_rating' }
  const need = BALANCE.finance.bandwidth.backstop
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/**
 * A big tech guarantees part of the lease and takes warrants in the company (assumes
 * backstopBlocker passed). The tenant then counts as strong for backlog, rating and project debt,
 * and doesn't walk (mine, reversible).
 */
export function takeBackstop(state: GameState, projectId: string): void {
  const p = getProject(state, projectId)!
  const warrantsShare = backstopWarrants(state, p)
  p.backstop = {
    leaseShare: BALANCE.finance.backstopLeaseShare,
    warrantsShare,
    quarter: state.quarter,
  }
  state.founderStake *= 1 - warrantsShare
  state.bandwidth -= BALANCE.finance.bandwidth.backstop
  logEntry(state, 'log.backstop_taken', {
    n: p.n,
    tenant: p.tenant!.card,
    guaranteedUsd: p.backstop.leaseShare * remainingContractUsd(p),
    warrantsPct: warrantsShare,
    stakePct: state.founderStake,
  })
}

// ---------- the JV partner ----------

/** Why a JV partner can't come into this project at `share`, or undefined if it can. */
export function jvBlocker(
  state: GameState,
  projectId: string,
  share: number,
): Message | undefined {
  if (!inActII(state)) return { key: 'error.act2_only' }
  const jv = CONTENT.finance.jv
  if (CONTENT.quarters[state.quarter] < jv.from)
    return { key: 'error.debt_early', params: { quarter: jv.from } }
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage !== 'proposed') return { key: 'error.project_started' }
  if (p.kw < BALANCE.projects.hyperscaleKw)
    return {
      key: 'error.jv_size',
      params: { minKw: BALANCE.projects.hyperscaleKw },
    }
  // One share for both sides (mine): it has to fit what the partner funds and what it takes.
  const lo = Math.max(jv.funds[0], jv.takes[0])
  const hi = Math.min(jv.funds[1], jv.takes[1])
  if (!(share >= lo - 1e-9 && share <= hi + 1e-9))
    return { key: 'error.jv_share', params: { minPct: lo, maxPct: hi } }
  const need = BALANCE.finance.bandwidth.jv
  if (!p.jv && state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/** Brings a JV partner into a proposed project (assumes jvBlocker passed); changing the share is free. */
export function setJv(
  state: GameState,
  projectId: string,
  share: number,
): void {
  const p = getProject(state, projectId)!
  if (!p.jv) state.bandwidth -= BALANCE.finance.bandwidth.jv
  p.jv = { share, fundedUsd: 0 }
}

/** At the start of a build: the partner pays its share of the equity (capex less debt). */
export function fundJv(state: GameState, projectId: string, equityUsd: number) {
  const p = getProject(state, projectId)!
  if (!p.jv) return
  p.jv.fundedUsd = Math.round(p.jv.share * Math.max(0, equityUsd))
  state.cash += p.jv.fundedUsd
  logEntry(state, 'log.jv_funded', {
    n: p.n,
    amountUsd: p.jv.fundedUsd,
    sharePct: p.jv.share,
  })
}
