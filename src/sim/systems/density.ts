// Hall density tiers (Act III, M16.2; doc 27 D1–D3, the design thread's step-5 spec). Every project is a hall
// with a tier: low (air-cooled, 40–60 kW a rack), mid (liquid, ~125 kW) or top (~600 kW, 800V DC). A GPU
// generation needs a tier (BALANCE.act3.density.genTier) and fits any hall of that tier or denser. A shell's
// new lease, re-let and renewal offer are × its tier's rent multiple from 2027Q3. Act I and II projects have
// no tier (the field is missing), so nothing here changes them.
import {
  BALANCE,
  CONTENT,
  quarterInputs,
  type DensityTier,
} from '../../content/index.ts'
import {
  inActIII,
  logEntry,
  projectGone,
  type GameState,
  type Project,
} from '../state.ts'
import { scenarioOf } from './market.ts'

const D = BALANCE.act3.density
export const TIERS: readonly DensityTier[] = ['low', 'mid', 'top']
const rank = (t: DensityTier) => TIERS.indexOf(t)

/** The tier a GPU generation needs (low for anything unlisted). */
export function gpuTier(gpu: string | null | undefined): DensityTier {
  return (gpu && D.genTier[gpu]) || 'low'
}

/** Whether a GPU generation fits a hall of this tier: denser halls host older chips. */
export function fits(gpu: string, tier: DensityTier): boolean {
  return rank(gpuTier(gpu)) <= rank(tier)
}

/** The denser of two tiers. */
export function maxTier(a: DensityTier, b: DensityTier): DensityTier {
  return rank(a) >= rank(b) ? a : b
}

/** The tier one up, or null at the top. */
export function nextTier(t: DensityTier): DensityTier | null {
  return TIERS[rank(t) + 1] ?? null
}

/**
 * A new Act III hall's tier (DT): mid, or the GPU's tier if denser (Rubin Ultra: top), or top when the
 * player ticks "Build to top tier". No new low-tier halls in Act III.
 */
export function newHallTier(
  gpu: string | null | undefined,
  topTier: boolean,
): DensityTier {
  return topTier ? 'top' : maxTier('mid', gpuTier(gpu))
}

/**
 * A project carried into Act III (DT): one still proposed or building is mid; a live cloud or pilot takes its
 * GPU's tier; a live shell is mid if its build started in 2025Q1 or later, else low. Gone projects get none.
 */
export function carriedTier(p: Project): DensityTier | undefined {
  if (projectGone(p)) return undefined
  if (p.stage === 'proposed' || p.stage === 'building') return 'mid'
  if (p.kind !== 'shell') return gpuTier(p.gpu)
  const start = p.startQuarter === null ? '' : CONTENT.quarters[p.startQuarter]
  return start && start >= D.carriedShellMidFrom ? 'mid' : 'low'
}

/** Gives every carried project without a tier its tier (at the Act III boundary, and for old Act III saves). */
export function assignCarriedTiers(state: GameState): void {
  for (const p of state.projects) {
    if (p.tier) continue
    const tier = carriedTier(p)
    if (tier) p.tier = tier
  }
}

/** Whether "Build to top tier" can be ticked now (Act III, from 2027Q3). */
export function topBuildOpen(state: GameState): boolean {
  return (
    inActIII(state) && CONTENT.quarters[state.quarter] >= D.topNewBuildFrom
  )
}

/** This quarter's mid→top retrofit, $ per MW (the scenario CSV), or 0 without one. */
export function midToTopUsdMw(state: GameState, quarter = state.quarter): number {
  if (!inActIII(state)) return 0
  return quarterInputs(quarter, scenarioOf(state))?.act3?.midToTopUsdMw ?? 0
}

/** "Build to top tier" on a new hall: 0.6 × this quarter's mid→top $/MW × MW (designed). */
export function topBuildExtraUsd(
  state: GameState,
  kw: number,
  quarter = state.quarter,
): number {
  return D.topNewBuildRetrofitShare * midToTopUsdMw(state, quarter) * (kw / 1000)
}

/** Whether a proposed project is being built to top tier now (its build costs more and takes longer). */
export function buildsToTop(
  state: GameState,
  p: Pick<Project, 'tier'> & { stage?: Project['stage'] },
): boolean {
  return inActIII(state) && p.tier === 'top' && p.stage !== 'live'
}

// ---------- downtime (M16.3: a retrofit or a GPU change) ----------

/**
 * The share of `quarter` a hall in downtime earns (DT): with w weeks counted from the start of the quarter
 * the work began, quarter k = 0, 1, 2 … earns clamp(1 − (w − 13k) / 13, 0, 1). 1 with no downtime.
 */
export function downtimeShare(p: Project, quarter: number): number {
  const d = p.downtime
  if (!d) return 1
  const k = quarter - d.fromQuarter
  if (k < 0) return 1
  const W = BALANCE.weeksPerQuarter
  return Math.min(1, Math.max(0, 1 - (d.weeks - W * k) / W))
}

/** The first quarter after the last one a downtime touches: the change applies from then. */
export function downtimeDoneQuarter(d: NonNullable<Project['downtime']>): number {
  return d.fromQuarter + Math.ceil(d.weeks / BALANCE.weeksPerQuarter)
}

/** At the start of a quarter: a finished retrofit's hall takes its new tier; any finished downtime ends. */
export function finishDowntimes(state: GameState): void {
  for (const p of state.projects) {
    const d = p.downtime
    if (!d || state.quarter < downtimeDoneQuarter(d)) continue
    if (d.toTier) p.tier = d.toTier
    delete p.downtime
    logEntry(state, `log.${d.kind}_done`, {
      n: p.n,
      density: p.tier ?? '',
      gpu: p.gpu ?? '',
    })
  }
}

/**
 * A shell's rent multiple by its hall's tier (DT, from 2027Q3): applied to a new lease, a re-let and a renewal
 * offer, after the Band clamp. 1 outside Act III, before 2027Q3, or for a project without a tier.
 */
export function shellTierRentMult(
  state: GameState,
  p: Pick<Project, 'tier' | 'kind'>,
): number {
  if (!inActIII(state) || p.kind !== 'shell' || !p.tier) return 1
  if (CONTENT.quarters[state.quarter] < D.shellTierRentFrom) return 1
  return D.shellTierRentMult[p.tier]
}
