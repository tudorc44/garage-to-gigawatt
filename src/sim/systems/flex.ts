// Act V's flex payment (M52.5; doc 43 §0.9 item 8; plants_v.json `queue.flex_payment`): from V2's trigger, enrolled
// curtailable MW earn the PJM capacity price × `flex_capacity_rating` each day (0.5 in V2 from its trigger; the column is
// blank otherwise, so nothing is paid). Enrolled MW, per site (mine, reversible): the load enrolled as curtailable in
// Act V (`flexKw`, which the queue's fast lane sets), plus a Texas demand-response site's curtailable MW (doc 38 §4.7:
// the miners, plus the AI MW a utility battery covers). Paid as a grid credit at each quarter's end. Not hidden: the
// rating is a market column read for the current quarter only.
import { act5Row } from '../../content/index.ts'
import { book } from '../ledger.ts'
import type { Message } from '../../i18n/t.ts'
import { inActV, logEntry, type GameState, type Site } from '../state.ts'
import { usedKw } from './sites.ts'
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

// ---------- M58.3 (doc 43 §0.15 fix 3): enrol existing load as curtailable ----------
// Offered in every future from 2036Q1 (offering it only in V2 would reveal V2). A site's load already running (AI halls,
// miners, hosting, homed blocks) is enrolled whole (mine, reversible: per site, all of its load not yet enrolled; no
// un-enrolling). It earns the flex payment above where `flex_capacity_rating` > 0, and gives up 0.5% of the enrolled
// share's AI revenue, minus the energy not bought (queue.ts › fastLaneEffectUsd, which reads every site's flexKw).

/** A site's load not yet enrolled, kW. */
export function enrollableKw(state: GameState, site: Site): number {
  return Math.max(0, usedKw(state, site.id) - (site.flexKw ?? 0))
}

/** Why this site's load can't be enrolled now, or undefined. */
export function enrolBlocker(state: GameState, siteId: string): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!inActV(state) || !site) return { key: 'error.flex_enrol_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (enrollableKw(state, site) <= 0) return { key: 'error.flex_enrol_none' }
  if (state.bandwidth < 1) return { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } }
}

/** Enrols up to `kw` (default all) of the site's running load as curtailable; returns the kW enrolled. */
export function enrolFlexible(state: GameState, siteId: string, kw = Infinity): number {
  const site = state.sites.find((s) => s.id === siteId)!
  const add = Math.min(kw, enrollableKw(state, site))
  if (add <= 0) return 0
  site.flexKw = (site.flexKw ?? 0) + add
  logEntry(state, 'log.flex.enrolled', { kwKw: add, tier: site.tier, serial: site.serial ?? 0 })
  return add
}
