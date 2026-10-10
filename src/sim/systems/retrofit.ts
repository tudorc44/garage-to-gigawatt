// Retrofits and GPU changes (Act III, M16.3; doc 27 D1–D3, the design thread's step-5 spec).
// - RETROFIT (1 BW): a live hall goes one tier up, low → mid ($1.5M/MW, 10 weeks) or mid → top (the quarter's
//   mid→top $/MW from the scenario CSV, 26 weeks), paid now from cash. A leased shell keeps its tenant, who
//   pays no rent during the work; the term doesn't change and the new tier's rent multiple applies from its
//   next renewal or re-let.
// - REFIT_GPUS (1 BW): a live cloud or pilot with no GPU contract swaps its GPUs for a generation that fits its
//   tier: the old ones sell at the GPU sale value, the new ones cost GPUs per MW × MW × the unit price (with
//   Act II's know-how multiplier), and the difference is paid now from cash. The new generation's lead time is
//   the downtime.
// Both: the hall earns a share of each quarter while the work runs (density.ts › downtimeShare), and the change
// applies from the first quarter after the last one the work touches. Mine, reversible: the new GPUs are in
// place (and earn) at once, so a quarter the work only partly covers earns at their rate.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inAct3Rules, logEntry, logQuarterLabel, type GameState, type Project } from '../state.ts'
import {
  downtimeDoneQuarter,
  fits,
  midToTopUsdMw,
  nextTier,
} from './density.ts'
import { contractEndQuarter } from './calendar.ts'
import { gpuPriceMultNow } from './eventEffects.ts'
import { scenarioOf } from './market.ts'
import {
  availableGpus,
  getProject,
  gpuGeneration,
  gpuLeadTimeWeeks,
  gpuPriceUsd,
  gpuResidualUsd,
  knowHow,
  newestGpu,
  ownedShareOut,
} from './projects.ts'
import { exportLeadWeeks } from './exportRule.ts'

const D = BALANCE.act3.density
const G = () => CONTENT.act3Gpus

/** A retrofit one tier up from this hall's tier: the target, its cost now and its weeks (null at the top). */
export function retrofitPlan(
  state: GameState,
  p: Pick<Project, 'tier' | 'kw'>,
): { to: 'mid' | 'top'; costUsd: number; weeks: number } | null {
  const to = p.tier ? nextTier(p.tier) : null
  if (to === null || to === 'low') return null
  const mw = p.kw / 1000
  return to === 'mid'
    ? { to, costUsd: G().lowToMid.retrofitUsdMw * mw, weeks: G().lowToMid.weeks }
    : { to, costUsd: midToTopUsdMw(state) * mw, weeks: G().midToTopWeeks }
}

/** Why a project can't change now (both actions): not Act III, not the Plan phase, building, not live, in downtime, a GPU contract. */
function changeBlocker(
  state: GameState,
  p: Project | undefined,
): Message | undefined {
  if (!inAct3Rules(state)) return { key: 'error.act3_only' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage === 'building' || p.stage === 'proposed')
    return { key: 'error.retrofit_building' }
  if (p.stage !== 'live') return { key: 'error.hall_not_live' }
  if (p.downtime) return { key: 'error.downtime_running' }
  if (p.tenant?.gpu) {
    const end = contractEndQuarter(state, p)
    return {
      key: 'error.gpu_contract_until',
      params: { quarter: end !== null ? logQuarterLabel(state, end) : '—' },
    }
  }
  return undefined
}

/** Why this hall can't be retrofitted now, or undefined. */
export function retrofitBlocker(
  state: GameState,
  projectId: string,
  /** A card's retrofit pays its own way and costs no Bandwidth (M16.4). */
  opts: { free?: boolean } = {},
): Message | undefined {
  const p = getProject(state, projectId)
  const blocked = changeBlocker(state, p)
  if (blocked) return blocked
  const plan = retrofitPlan(state, p!)
  if (!plan) return { key: 'error.no_higher_tier' }
  if (opts.free) return undefined
  if (state.bandwidth < D.retrofitBw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: D.retrofitBw, have: state.bandwidth },
    }
  const costUsd = Math.round(plan.costUsd)
  if (state.cash < costUsd)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
  return undefined
}

/**
 * Starts a retrofit (assumes the blocker passed): pays `costUsd` (default: the plan's) and 1 BW (none for a
 * card), and the downtime begins this quarter.
 */
export function startRetrofit(
  state: GameState,
  projectId: string,
  opts: { costUsd?: number; free?: boolean } = {},
): void {
  const p = getProject(state, projectId)!
  const plan = retrofitPlan(state, p)!
  const costUsd = Math.round(opts.costUsd ?? plan.costUsd)
  state.cash -= costUsd
  if (!opts.free) state.bandwidth -= D.retrofitBw
  p.downtime = {
    kind: 'retrofit',
    fromQuarter: state.quarter,
    weeks: plan.weeks,
    toTier: plan.to,
  }
  logEntry(state, 'log.retrofit_started', {
    n: p.n,
    density: plan.to,
    costUsd,
    quarter: logQuarterLabel(state, downtimeDoneQuarter(p.downtime)),
  })
}

/** A GPU change on this hall to `gpu` now: what the new GPUs cost, what the old ones sell for, the net, the weeks. */
export function refitPlan(
  state: GameState,
  p: Project,
  gpu: string,
): {
  count: number
  unitUsd: number
  newUsd: number
  saleUsd: number
  netUsd: number
  weeks: number
} | null {
  const gen = gpuGeneration(gpu)
  const unitUsd = gpuPriceUsd(gpu, state.quarter, scenarioOf(state))
  if (!gen || unitUsd === undefined) return null
  const count = Math.round(gen.gpusPerMw * (p.kw / 1000))
  const knowHowMult =
    p.kind === 'cloud' && knowHow(state) === 0
      ? BALANCE.projects.knowHowZero.costMult
      : 1
  const newUsd = count * unitUsd * knowHowMult * gpuPriceMultNow(state, state.quarter)
  // Mine, reversible: a JV partner takes its share of the sale and pays its share of the new GPUs.
  const ours = 1 - ownedShareOut(p)
  const saleUsd = Math.round(gpuResidualUsd(p, state.quarter) * ours)
  return {
    count,
    unitUsd,
    newUsd,
    saleUsd,
    netUsd: Math.round(newUsd * ours) - saleUsd,
    // (M17.4: the export rule adds 3 weeks to the newest generation, unless you pre-bought)
    weeks:
      gpuLeadTimeWeeks(gpu, state.quarter, scenarioOf(state)) +
      (gpu === newestGpu(state.quarter, scenarioOf(state))
        ? exportLeadWeeks(state)
        : 0),
  }
}

/** The generations a live cloud or pilot could change to now: on sale, fitting its tier, not its own. */
export function refitChoices(state: GameState, p: Project): string[] {
  return availableGpus(state.quarter, scenarioOf(state))
    .map((g) => g.id)
    .filter((g) => g !== p.gpu && p.tier !== undefined && fits(g, p.tier))
}

/** Why this cloud or pilot can't change its GPUs to `gpu` now, or undefined. */
export function refitBlocker(
  state: GameState,
  projectId: string,
  gpu: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (p && p.kind === 'shell') return { key: 'error.refit_shell' }
  const blocked = changeBlocker(state, p)
  if (blocked) return blocked
  if (gpu === p!.gpu) return { key: 'error.refit_same_gpu' }
  if (
    !availableGpus(state.quarter, scenarioOf(state)).some((g) => g.id === gpu)
  )
    return { key: 'error.gpu_not_available', params: { gpu } }
  if (!p!.tier || !fits(gpu, p!.tier))
    return {
      key: 'error.gpu_too_dense',
      params: { gpu, density: p!.tier ?? 'low' },
    }
  if (state.bandwidth < D.refitBw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: D.refitBw, have: state.bandwidth },
    }
  const plan = refitPlan(state, p!, gpu)!
  if (state.cash < plan.netUsd)
    return {
      key: 'error.no_cash',
      params: { costUsd: plan.netUsd, cashUsd: state.cash },
    }
  return undefined
}

/** Changes the GPUs (assumes the blocker passed): the net is paid, the new GPUs are in, the downtime begins. */
export function refitGpus(
  state: GameState,
  projectId: string,
  gpu: string,
): void {
  const p = getProject(state, projectId)!
  const plan = refitPlan(state, p, gpu)!
  state.cash -= plan.netUsd
  state.bandwidth -= D.refitBw
  const newCapexUsd = Math.round(plan.newUsd)
  p.capexUsd += newCapexUsd - p.gpuCapexUsd
  p.gpu = gpu
  p.gpuCount = plan.count
  p.gpuCapexUsd = newCapexUsd
  p.gpuDeliveredQuarter = state.quarter
  // The old GPUs' failures and spot lock go with them.
  delete p.gpuOut
  delete p.spotLock
  p.downtime = { kind: 'refit', fromQuarter: state.quarter, weeks: plan.weeks }
  logEntry(state, 'log.refit_started', {
    n: p.n,
    gpu,
    count: plan.count,
    costUsd: plan.netUsd,
    quarter: logQuarterLabel(state, downtimeDoneQuarter(p.downtime)),
  })
}
