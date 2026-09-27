// Act II regions (scope 0.2 §2.6; doc 18 §6; regions.json): each site's region tag carries a Heat
// modifier, a grid queue and policy events. A policy applies from its quarter on:
// - power_adder_usd_kwh: added to the region's power price (Virginia's large-load tax, 2026Q3);
// - heat_delta (national): added to every site's Heat (the 2026Q1 blocked-projects wave);
// - no_grid_upgrades_quarters: no new grid upgrades there for that long (ERCOT's halt, 2026Q3);
// - queue_quarters: extra quarters on a region's grid-upgrade queue (PJM +4 from 2026Q1);
// - direct_curtailment_from / min_kw: the grid can curtail big sites directly (ERCOT SB6).
// Pure lookups on content; the systems that use them are sites (power), heat, grid upgrades and
// curtailment.
import {
  CONTENT,
  act2Quarter,
  type PowerRegion,
  type Region,
  type RegionPolicy,
} from '../../content/index.ts'

export function getRegion(id: PowerRegion): Region {
  return CONTENT.regions[id]
}

const label = (quarter: number) => CONTENT.quarters[quarter] ?? ''

/** A region's policies in force in `quarter` (from their quarter on), oldest first. */
export function activePolicies(
  region: PowerRegion,
  quarter: number,
): RegionPolicy[] {
  return getRegion(region).policies.filter((p) => p.quarter <= label(quarter))
}

/** National policies in force in `quarter`. */
export function activeNationalPolicies(quarter: number): RegionPolicy[] {
  return CONTENT.nationalPolicies.filter((p) => p.quarter <= label(quarter))
}

/** Extra $/kWh on the region's power in `quarter` (a large-load tax). */
export function regionPowerAdderUsdKwh(
  region: PowerRegion | undefined,
  quarter: number,
): number {
  if (!region || !act2Quarter(quarter)) return 0
  return activePolicies(region, quarter).reduce(
    (sum, p) => sum + (p.effect.power_adder_usd_kwh ?? 0),
    0,
  )
}

/** A site's Heat multiplier in its region (doc 18 §6); 1 in Act I and without a region. */
export function regionHeatMult(
  region: PowerRegion | undefined,
  quarter: number,
): number {
  return region && act2Quarter(quarter) ? getRegion(region).heat_modifier : 1
}

/** Heat added to every site by national policies in force (Act II). */
export function nationalHeatDelta(quarter: number): number {
  if (!act2Quarter(quarter)) return 0
  return activeNationalPolicies(quarter).reduce(
    (sum, p) => sum + (p.effect.heat_delta ?? 0),
    0,
  )
}

/** Whether new grid upgrades are halted in the region in `quarter` (ERCOT, 2026Q3–Q4). */
export function gridUpgradesHalted(
  region: PowerRegion,
  quarter: number,
): boolean {
  const q = label(quarter)
  return getRegion(region).policies.some((p) => {
    const n = p.effect.no_grid_upgrades_quarters
    if (!n) return false
    const from = CONTENT.quarters.indexOf(p.quarter)
    return q >= p.quarter && quarter < from + n
  })
}

/** Extra quarters on the region's grid-upgrade queue from policies in force (PJM +4 from 2026Q1). */
export function extraQueueQuarters(
  region: PowerRegion,
  quarter: number,
): number {
  return [
    ...activePolicies(region, quarter),
    ...activeNationalPolicies(quarter),
  ].reduce((sum, p) => sum + (p.effect.queue_quarters?.[region] ?? 0), 0)
}

/** SB6: from its quarter, the grid can curtail sites of min_kw and up directly (null before). */
export function directCurtailment(
  region: PowerRegion,
  quarter: number,
): { minKw: number } | null {
  for (const p of getRegion(region).policies) {
    const from = p.effect.direct_curtailment_from
    if (from && label(quarter) >= from) return { minKw: p.effect.min_kw ?? 0 }
  }
  return null
}
