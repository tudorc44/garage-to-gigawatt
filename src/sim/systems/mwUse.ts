// MW by use (Act II, scope 0.2 §2.2 and §2.4; wireframes A2-03, A2-06): every kW at a site is in
// exactly one use. Mining = your machines; hosting = rented to another miner's ASICs; AI shell and
// AI cloud come with projects (M3); building = not energized yet, or being converted; idle = the rest.
import { BALANCE, act2Quarter } from '../../content/index.ts'
import { projectGone, type GameState, type Site } from '../state.ts'
import {
  capacityKw,
  machinesKw,
  powerAddsKw,
  poweredKw,
  powerPriceUsdKwh,
  regionOf,
} from './sites.ts'

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
  // Projects (Act II): live ones are AI shell or AI cloud; building ones are under construction;
  // proposed ones hold their kW but use them for nothing yet (idle).
  let projectBuilding = 0
  for (const p of state.projects) {
    if (p.siteId !== site.id || projectGone(p)) continue
    if (p.stage === 'live') {
      if (p.kind === 'shell') out.aiShell += p.kw
      else out.aiCloud += p.kw
    } else if (p.stage === 'building' && !pendingPower(site, p.id, quarter))
      projectBuilding += p.kw
  }
  const ai = out.aiShell + out.aiCloud
  const projectConverting = Math.min(
    projectBuilding,
    Math.max(0, energized - out.hosting - converting - ai),
  )
  out.mining = Math.min(
    machinesKw(state, site.id),
    Math.max(0, energized - out.hosting - converting - ai - projectConverting),
  )
  out.building = total - energized + converting + projectConverting
  out.idle =
    energized - out.hosting - converting - ai - projectConverting - out.mining
  return out
}

/** Whether a project's own new power (grid upgrade, gas) isn't energized yet in `quarter`. */
function pendingPower(site: Site, projectId: string, quarter: number): boolean {
  const add = site.powerAdds?.find((a) => a.projectId === projectId)
  return !!add && (add.readyQuarter === null || add.readyQuarter > quarter)
}

/**
 * One week of the power reservation (Act II, owner decision A2): idle and under-construction kW
 * pay a share of their full-load power cost at the site's current price; a quarter is
 * hoursPerQuarter hours, spread over its weeks. New power still waiting for its grid upgrade or gas
 * plant isn't reserved yet (mine). The garage (household power) pays none. Cash goes out here; the
 * dollars are returned.
 */
export function payReservationWeek(state: GameState): number {
  if (!act2Quarter(state.quarter)) return 0
  const { share, hoursPerQuarter } = BALANCE.powerReservation
  const hours = hoursPerQuarter / BALANCE.weeksPerQuarter
  let usd = 0
  for (const site of state.sites) {
    if (!regionOf(site)) continue
    const u = siteMwByUse(state, site, state.quarter)
    const pending = powerAddsKw(site) - powerAddsKw(site, state.quarter)
    usd +=
      Math.max(0, u.idle + u.building - pending) *
      hours *
      powerPriceUsdKwh(site, state.quarter) *
      share
  }
  state.cash -= usd
  return usd
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
