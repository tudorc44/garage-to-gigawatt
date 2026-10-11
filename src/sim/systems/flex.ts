// Act V's flex payment (M52.5; doc 43 §0.9 item 8; plants_v.json `queue.flex_payment`): from V2's trigger, enrolled
// curtailable MW earn the PJM capacity price × `flex_capacity_rating` each day (0.5 in V2 from its trigger; the column is
// blank otherwise, so nothing is paid). Enrolled MW, per site (mine, reversible): the load enrolled as curtailable in
// Act V (`flexKw`, which the queue's fast lane sets), plus a Texas demand-response site's curtailable MW (doc 38 §4.7:
// the miners, plus the AI MW a utility battery covers). Paid as a grid credit at each quarter's end. Not hidden: the
// rating is a market column read for the current quarter only.
import { act5Row } from '../../content/index.ts'
import { book } from '../ledger.ts'
import { inActV, type GameState, type Site } from '../state.ts'
import { scenarioOf } from './market.ts'
import { curtailableMw } from './texasPower.ts'

const DAYS_Q = 91.25

/** This quarter's flex payment per site, $ (none outside Act V or while the rating is blank). */
export function flexPayments(state: GameState): { siteId: string; usd: number }[] {
  if (!inActV(state)) return []
  const row = act5Row(state.quarter, scenarioOf(state))
  const rating = row?.flex_capacity_rating
  if (!row || !rating) return []
  return state.sites
    .map((s) => ({ siteId: s.id, usd: flexMw(state, s) * row.pjm_capacity_price_usd_mwday * rating * DAYS_Q }))
    .filter((x) => x.usd > 0)
}

/** A site's MW enrolled as curtailable: its Act V enrolment plus a Texas DR site's curtailable MW. */
export function flexMw(state: GameState, site: Site): number {
  return (site.flexKw ?? 0) / 1000 + (site.dr?.enrolled ? curtailableMw(state, site) : 0)
}

/** At a quarter's end: books the flex payments as grid credits; returns their total (energy revenue, as Texas's DR). */
export function payFlex(state: GameState): number {
  let total = 0
  for (const x of flexPayments(state)) {
    book(state, 'grid_credits', x.usd, { site: x.siteId })
    total += x.usd
  }
  return total
}
