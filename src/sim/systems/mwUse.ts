// MW by use (Act II, scope 0.2 §2.2 and §2.4; wireframes A2-03, A2-06): every kW at a site is in
// exactly one use. Mining = your machines; hosting = rented to another miner's ASICs; AI shell and
// AI cloud come with projects (M3); building = not energized yet, or being converted; idle = the rest.
import type { GameState, Site } from '../state.ts'
import { capacityKw, machinesKw, poweredKw } from './sites.ts'

export const MW_USES = [
  'mining',
  'hosting',
  'aiShell',
  'aiCloud',
  'building',
  'idle',
] as const
export type MwUse = (typeof MW_USES)[number]
export type MwByUse = Record<MwUse, number>

export const emptyMwByUse = (): MwByUse => ({
  mining: 0,
  hosting: 0,
  aiShell: 0,
  aiCloud: 0,
  building: 0,
  idle: 0,
})

/**
 * kW by use at one site in a quarter. They add up to the site's capacity (built or building).
 * Machines only count as mining on energized kW not taken by hosting; ones bought ahead for
 * capacity still being built wait (as mining does: they earn nothing until it's powered).
 */
export function siteMwByUse(
  state: GameState,
  site: Site,
  quarter: number,
): MwByUse {
  const out = emptyMwByUse()
  const total = capacityKw(site)
  const energized = poweredKw(site, quarter)
  let hostingLive = 0
  let hostingPending = 0
  for (const h of state.hosting) {
    if (h.siteId !== site.id) continue
    if (h.readyQuarter <= quarter) hostingLive += h.kw
    else hostingPending += h.kw
  }
  out.hosting = Math.min(hostingLive, energized)
  const converting = Math.min(hostingPending, energized - out.hosting)
  out.mining = Math.min(
    machinesKw(state, site.id),
    energized - out.hosting - converting,
  )
  out.building = total - energized + converting
  out.idle = energized - out.hosting - converting - out.mining
  return out
}

/** kW by use across all your sites. */
export function mwByUse(state: GameState, quarter: number): MwByUse {
  const out = emptyMwByUse()
  for (const site of state.sites) {
    const s = siteMwByUse(state, site, quarter)
    for (const use of MW_USES) out[use] += s[use]
  }
  return out
}
