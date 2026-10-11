// Act III's lease market (M12, D16 step 4; doc 27 §6, D5, F-1, F-2): the one place that reads the
// scenario files' renewal, RFP and walk columns, always for the quarter asked (the current one: no
// system asks for a later quarter). Nothing here knows the scenario's name or phase.
import {
  quarterRow,
  type CarriedQuarterRow,
  type MarketKey,
} from '../../content/index.ts'
import { scarcityRentFactor } from './scarcity.ts'

// (M27.3: Act IV's rows carry the same columns; quarterRow reads either act through the state's market key.)
function row(
  quarter: number,
  scenario: MarketKey | null | undefined,
): CarriedQuarterRow | null {
  if (!scenario) return null
  return quarterRow(quarter, scenario) ?? null
}

/** The RFP midpoint (the new-lease index): the mean of rfp_new_lease_index_low and _high. */
export function rfpMid(
  quarter: number,
  scenario: MarketKey | null | undefined,
): number | null {
  const r = row(quarter, scenario)
  if (!r) return null
  const lo = r.rfp_new_lease_index_low
  const hi = r.rfp_new_lease_index_high
  // (M52.1: in Act V × the scarcity index, doc 43 §0.2; 1 before)
  return lo === null || hi === null ? null : ((lo + hi) / 2) * scarcityRentFactor(quarter, scenario)
}

/** Band(q): doc 27's D5 renewal band, [renewal_shell_index_low, renewal_shell_index_high]. */
export function renewalBand(
  quarter: number,
  scenario: MarketKey | null | undefined,
): { lo: number; hi: number } | null {
  const r = row(quarter, scenario)
  if (!r) return null
  const lo = r.renewal_shell_index_low
  const hi = r.renewal_shell_index_high
  if (lo === null || hi === null) return null
  // (M52.1: in Act V the renewal band × the scarcity index, doc 43 §0.2)
  const s = scarcityRentFactor(quarter, scenario)
  return { lo: lo * s, hi: hi * s }
}

/** The offered renewal term in years: a shell's rounded to the nearest year; a GPU contract's
 * rounded half up to the engine's GPU terms (1, 2 or 3 years). */
export function offeredTermYears(
  quarter: number,
  scenario: MarketKey | null | undefined,
  kind: 'shell' | 'gpu',
): number | null {
  const r = row(quarter, scenario)
  if (!r) return null
  if (kind === 'shell') {
    const y = r.renewal_offer_term_years_shell
    return y === null ? null : Math.max(1, Math.round(y))
  }
  const y = r.renewal_offer_term_years_gpu
  return y === null ? null : Math.min(3, Math.max(1, Math.floor(y + 0.5)))
}

/** The chance a tenant walks at renewal: the hyperscaler column, or the other one for neoclouds and labs. */
export function walkProbAtRenewal(
  quarter: number,
  scenario: MarketKey | null | undefined,
  tenantType: string,
): number {
  const r = row(quarter, scenario)
  if (!r) return 0
  return (
    (tenantType === 'hyperscaler'
      ? r.tenant_walk_prob_at_renewal_hyperscaler
      : r.tenant_walk_prob_at_renewal_nonhyperscaler) ?? 0
  )
}

/**
 * The GPU renewal index vs 2025Q4 for a generation: H100 for H100/H200, B200 for B200/GB200 (M16.1: and for
 * Rubin and Rubin Ultra, which use the B200's rent channels).
 */
export function gpuRenewalIndex(
  quarter: number,
  scenario: MarketKey | null | undefined,
  gpu: string,
): number | null {
  const r = row(quarter, scenario)
  if (!r) return null
  const index =
    gpu === 'b200' ||
    gpu === 'gb200' ||
    gpu === 'rubin_nvl144' ||
    gpu === 'rubin_ultra' ||
    gpu === 'gen2037'
      ? r.renewal_b200_gpu_index_vs_2025q4
      : r.renewal_h100_gpu_index_vs_2025q4
  // (M52.1: in Act V × the scarcity index, doc 43 §0.2)
  return index === null ? null : index * scarcityRentFactor(quarter, scenario)
}
