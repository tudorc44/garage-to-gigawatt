// The kW the mining club's machines draw (M70.4). Apart from club.ts so that setup.ts (which counts a site's load) can read it
// without importing the club system.
import { CONTENT } from '../../content/index.ts'
import type { GameState } from '../state.ts'
import { getModel } from '../systems/market.ts'
import type { Club } from './types.ts'

/** The kW the club's machines draw (Teo's GPUs, the ASICs, the box shares). */
export function clubKw(club: Club): number {
  const box = CONTENT.prologue.club?.boxVendor.power_kw_share.value ?? 0
  return club.lots.reduce((kw, l) => kw + l.count * (l.kind === 'box' ? box : (getModel(l.model)?.power_kw ?? 0)), 0)
}

/** The kW the club puts on one of your sites (household patience reads this through siteLoadKw): none unless it runs in your place. */
export function clubHostKw(s: GameState, siteId: string): number {
  const c = s.prologue?.club
  return c && c.hosting === 'your_place' && c.hostSiteId === siteId ? clubKw(c) : 0
}
