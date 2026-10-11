// Act V's grid queue (M53; doc 43 §8 with §0.4, §0.9 items 7 and 16; plants_v.json `queue`). Every grid request waiting
// to be energized in Act V is a queue position (a project's grid power add): its wait is the future's regional
// `grid_wait_q_<pjm|ercot|other>` × U(0.8, 1.2) (Act IV's spread); it holds a $50/kW security (a deposit, returned at
// energisation, kept on a withdrawal); a quarter after the request its study names an upgrade bill (the region's median
// × U(0.6, 1.4), or a $400-600/kW tail one time in five). Paying the bill buys no speed, but an unpaid bill holds
// energisation. Speed comes only from co-location (a venture's delivered MW, as since M36) or V2's fast lane (from its
// trigger: connect in `fast_lane_q`, accepting curtailment up to 180 hours a year for −0.5% output, on 24 hours' notice;
// the MW are enrolled as curtailable and earn V2's flex payment). A position moves only with its site: selling a site's
// power sells its free energized MW at the powered value and its positions at the queue premium. Positions carried in
// from Act IV are adopted at the first Act V quarter's end, without a security (mine, reversible). Not hidden: every
// number is a market column or the position's own draw.
import { BALANCE, CONTENT, act5Row, actFirstQuarter, type PowerRegion } from '../../content/index.ts'
import { PLANTS } from '../../content/plantsContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { chance, substream, uniform } from '../rng.ts'
import {
  act5SeedOf,
  inActV,
  logEntry,
  projectGone,
  roundCents,
  type GameState,
  type PowerAdd,
  type Project,
  type Site,
} from '../state.ts'
import { logAct5Move } from './act5Moves.ts'
import { scenarioOf } from './market.ts'
import { projectBuildQuarters, saleValueUsd, sellProject } from './projects.ts'
import { repayProjectFacilities } from './facilities.ts'
import { poweredKw, regionOf, usedKw } from './sites.ts'
import { enrolBlocker, enrollableKw } from './flex.ts'

const Q = PLANTS.queue
const B = BALANCE.act5.queueBill

/** The queue's region for a power region (PJM and Ohio → PJM; ERCOT; everything else → other). */
export const queueRegion = (region: PowerRegion) => Q.region_map[region] ?? 'other'

// (the wait itself is drawn where every grid request's is: power.ts's gridQuarterRange reads the regional column)

/** A site's pending grid power adds (positions, adopted or not yet). */
function pendingGrid(state: GameState, site: Site): PowerAdd[] {
  return (site.powerAdds ?? []).filter(
    (a) => a.source === 'grid' && !a.card && !a.ppaId && a.readyQuarter !== null && a.readyQuarter > state.quarter,
  )
}

/** The study's bill, $/kW, on the position's own stream. */
function drawBillUsdKw(state: GameState, site: Site, add: PowerAdd): number {
  const r = substream(act5SeedOf(state), `queue_study:${add.projectId}`)
  const region = regionOf(site) ?? 'ercot'
  const col = (Q.upgrade_bill.median_col[queueRegion(region) === 'pjm' ? 'pjm' : queueRegion(region) === 'ercot' ? 'ercot' : 'other'] ??
    'upgrade_usd_kw_median_pjm') as 'upgrade_usd_kw_median_pjm' | 'upgrade_usd_kw_median_ercot'
  const median = Number(act5Row(state.quarter, scenarioOf(state))?.[col] ?? 0)
  return roundCents(chance(r, B.tailChance) ? uniform(r, B.tailUsdKw[0], B.tailUsdKw[1]) : median * uniform(r, B.spread[0], B.spread[1]))
}

const projectOf = (state: GameState, add: PowerAdd) => state.projects.find((p) => p.id === add.projectId)

/** Keeps a project's go-live in step with its power (build end vs the position's energisation). */
function syncProject(state: GameState, p: Project | undefined, add: PowerAdd): void {
  if (!p || p.startQuarter === undefined || p.startQuarter === null) return
  p.readyQuarter = Math.max(p.startQuarter + projectBuildQuarters(state, p), add.readyQuarter!)
}

/**
 * At each Act V quarter's end: adopts new positions (security now; the study a quarter later), logs studies that came
 * in, holds energisation behind an unpaid bill, and returns securities at energisation. (The fast lane's output loss and
 * energy saving are fastLaneEffectUsd's, booked by the quarter's end.)
 */
export function endQuarterQueue(state: GameState): void {
  if (!inActV(state)) return
  const first = actFirstQuarter(5)
  for (const site of state.sites) {
    for (const add of site.powerAdds ?? []) {
      if (add.source !== 'grid' || add.card || add.ppaId || add.readyQuarter === null) continue
      const pos = add.position
      if (!pos) {
        if (add.readyQuarter <= state.quarter) continue
        const p = projectOf(state, add)
        const requested = p?.startQuarter ?? state.quarter
        const securityUsd = requested >= first ? roundCents(Q.security_usd_kw * add.kw) : 0
        if (securityUsd > 0) book(state, 'prepayments', -securityUsd, { site: site.id, project: add.projectId })
        add.position = {
          requestQuarter: requested,
          securityUsd,
          studyQuarter: state.quarter + B.studyQuarters,
          billUsdKw: drawBillUsdKw(state, site, add),
        }
        continue
      }
      if (pos.studyQuarter === state.quarter + 1)
        logEntry(state, 'log.queue.study', { n: projectOf(state, add)?.n ?? 0, usdKw: Math.round(pos.billUsdKw) })
      // energising next quarter: an unpaid bill holds it (a quarter at a time); a paid one returns the security
      if (add.readyQuarter === state.quarter + 1) {
        if (!pos.billPaid) {
          add.readyQuarter += 1
          syncProject(state, projectOf(state, add), add)
          if (!pos.heldLogged) logEntry(state, 'log.queue.held', { n: projectOf(state, add)?.n ?? 0 })
          pos.heldLogged = true
        } else if (pos.securityUsd > 0) {
          book(state, 'prepayments', pos.securityUsd, { site: site.id, project: add.projectId })
          pos.securityUsd = 0
        }
      }
    }
  }
}

/**
 * The fast lane's −0.5% output this quarter (doc 43 §0.14 item 4): 0.5% of the enrolled share of your load's AI revenue
 * is lost, and 0.5% of its energy cost is saved (the curtailed energy isn't bought). Returns both, $.
 */
export function fastLaneEffectUsd(state: GameState): { lossUsd: number; savingUsd: number } {
  const flexKw = state.sites.reduce((a, s) => a + (s.flexKw ?? 0), 0)
  if (flexKw <= 0) return { lossUsd: 0, savingUsd: 0 }
  const used = state.sites.reduce((a, s) => a + usedKw(state, s.id), 0)
  const share = used > 0 ? Math.min(1, flexKw / used) : 0
  const k = Q.fast_lane.output_loss * share
  return {
    lossUsd: roundCents(k * state.quarterStats.aiRevenueUsd),
    savingUsd: roundCents(k * state.quarterStats.powerCostUsd),
  }
}

// ---------- the Plan phase's actions ----------

function findPosition(state: GameState, projectId: string): { site: Site; add: PowerAdd } | null {
  for (const site of state.sites) {
    const add = (site.powerAdds ?? []).find((a) => a.projectId === projectId && a.position)
    if (add) return { site, add }
  }
  return null
}

const bw = (state: GameState): Message | undefined =>
  state.bandwidth < 1 ? { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } } : undefined

/** Why the study's bill can't be paid now, or undefined. */
export function payUpgradeBlocker(state: GameState, projectId: string): Message | undefined {
  if (!inActV(state)) return { key: 'error.queue_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const f = findPosition(state, projectId)
  if (!f || f.add.readyQuarter! <= state.quarter) return { key: 'error.queue_none' }
  if (f.add.position!.studyQuarter > state.quarter) return { key: 'error.queue_no_study' }
  if (f.add.position!.billPaid) return { key: 'error.queue_paid' }
  const cost = roundCents(f.add.position!.billUsdKw * f.add.kw)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
  return bw(state)
}

/** Pays the upgrade bill (1 Bandwidth): the position keeps its place; no speed. */
export function payUpgrade(state: GameState, projectId: string): void {
  const { site, add } = findPosition(state, projectId)!
  const cost = roundCents(add.position!.billUsdKw * add.kw)
  state.bandwidth -= 1
  add.position!.billPaid = true
  book(state, 'site_builds', -cost, { site: site.id, project: projectId })
  logEntry(state, 'log.queue.paid', { n: projectOf(state, add)?.n ?? 0, costUsd: cost })
}

/** Why the position can't be withdrawn now, or undefined (a project carrying debt can't be dropped: mine). */
export function withdrawBlocker(state: GameState, projectId: string): Message | undefined {
  if (!inActV(state)) return { key: 'error.queue_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const f = findPosition(state, projectId)
  if (!f || f.add.readyQuarter! <= state.quarter) return { key: 'error.queue_none' }
  const p = projectOf(state, f.add)
  if (p && (p.tenant || (state.facilities ?? []).some((x) => x.projectId === p.id))) return { key: 'error.queue_committed' }
}

/**
 * Withdraws the position (doc 43 §8.2: free, refunds nothing; scores 0, §0.9 item 7): the grid add and its security go;
 * the project that waited on it ends, its capex sunk.
 */
export function withdrawPosition(state: GameState, projectId: string): void {
  const { site, add } = findPosition(state, projectId)!
  site.powerAdds = (site.powerAdds ?? []).filter((a) => a !== add)
  if (site.powerAdds.length === 0) delete site.powerAdds
  const p = projectOf(state, add)
  if (p && !projectGone(p)) {
    p.stage = 'ended'
    p.soldQuarter = state.quarter
  }
  logEntry(state, 'log.queue.withdrawn', { n: p?.n ?? 0, securityUsd: add.position!.securityUsd })
}

/** V2's fast lane after its trigger: the column's quarters to connect (null: not on offer now). */
export function fastLaneQuarters(state: GameState): number | null {
  const row = act5Row(state.quarter, scenarioOf(state)) as Record<string, unknown> | undefined
  const q = row?.[Q.fast_lane.col]
  return typeof q === 'number' && q > 0 ? q : null
}

/** Why the position can't take the fast lane now, or undefined. */
export function fastLaneBlocker(state: GameState, projectId: string): Message | undefined {
  if (!inActV(state)) return { key: 'error.queue_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (fastLaneQuarters(state) === null) return { key: 'error.queue_no_fast_lane' }
  const f = findPosition(state, projectId)
  if (!f || f.add.readyQuarter! <= state.quarter) return { key: 'error.queue_none' }
  if (f.add.position!.fastLane) return { key: 'error.queue_fast_already' }
  return bw(state)
}

/** Takes the fast lane (1 Bandwidth): connect within the column's quarters; the MW enrol as curtailable. */
export function takeFastLane(state: GameState, projectId: string): void {
  const { site, add } = findPosition(state, projectId)!
  state.bandwidth -= 1
  add.position!.fastLane = true
  add.readyQuarter = Math.min(add.readyQuarter!, state.quarter + fastLaneQuarters(state)!)
  syncProject(state, projectOf(state, add), add)
  site.flexKw = (site.flexKw ?? 0) + add.kw
  logEntry(state, 'log.queue.fast_lane', { n: projectOf(state, add)?.n ?? 0, quarter: CONTENT.quarters[add.readyQuarter] })
}

/** What selling a site's power fetches now: free energized MW at the powered value, positions at the queue premium. */
export function sitePowerSale(state: GameState, site: Site) {
  const row = act5Row(state.quarter, scenarioOf(state))
  const freeKw = Math.max(0, poweredKw(site, state.quarter) - usedKw(state, site.id))
  const positions = pendingGrid(state, site).filter((a) => a.position)
  const posKw = positions.reduce((s, a) => s + a.kw, 0)
  const capexUsd = positions.reduce((s, a) => s + (projectOf(state, a)?.capexUsd ?? 0), 0)
  const securityUsd = positions.reduce((s, a) => s + a.position!.securityUsd, 0)
  const freeUsd = (freeKw / 1000) * (row?.powered_value_usd_mw ?? 0)
  const positionsUsd = posKw * (row?.queue_premium_usd_kw ?? 0) + capexUsd + securityUsd
  return { freeKw, posKw, positions, freeUsd, positionsUsd, totalUsd: roundCents(freeUsd + positionsUsd) }
}

/** Why the site's power can't be sold now, or undefined. */
export function sellSitePowerBlocker(state: GameState, siteId: string): Message | undefined {
  if (!inActV(state)) return { key: 'error.queue_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  const sale = sitePowerSale(state, site)
  if (sale.totalUsd <= 0) return { key: 'error.queue_nothing_to_sell' }
  for (const a of sale.positions) {
    const p = projectOf(state, a)
    if (p && (p.tenant || (state.facilities ?? []).some((x) => x.projectId === p.id))) return { key: 'error.queue_committed' }
  }
  return bw(state)
}

/**
 * Sells the site's power (1 Bandwidth; doc 43 §0.2 and §8.2): its free energized MW at the powered value and its
 * positions with their half-built halls (at the queue premium plus the capex spent and the security: mine). The site's
 * leased halls are sold with PROJECT_SELL, as before. Returns whether a position went (the move's kind).
 */
export function sellSitePower(state: GameState, siteId: string, whole = false): boolean {
  const site = state.sites.find((s) => s.id === siteId)!
  const sale = sitePowerSale(state, site)
  if (!whole) state.bandwidth -= 1
  if (sale.totalUsd <= 0) return false
  site.soldKw = (site.soldKw ?? 0) + sale.freeKw
  for (const a of sale.positions) {
    const p = projectOf(state, a)
    if (p) {
      p.stage = 'sold'
      p.soldQuarter = state.quarter
    }
  }
  if (sale.positions.length) {
    site.powerAdds = (site.powerAdds ?? []).filter((a) => !sale.positions.includes(a))
    if (site.powerAdds.length === 0) delete site.powerAdds
  }
  book(state, 'asset_sales', sale.totalUsd, { site: site.id })
  logEntry(state, 'log.queue.site_sold', { mw: Math.round((sale.freeKw + sale.posKw) / 100) / 10, priceUsd: sale.totalUsd })
  // the move (doc 43 §6.7, §0.2): with a position, or free MW only (both −1); a whole-site sale logs its own
  if (!whole) logAct5Move(state, sale.positions.length > 0 ? 'sell_site_with_position' : 'sell_site_free_mw')
  return sale.positions.length > 0
}

// ---------- the whole-site sale (doc 43 §0.14 item 8) ----------

/** The leased halls a whole-site sale takes: live shells with a tenant (PROJECT_SELL's). */
function leasedHalls(state: GameState, siteId: string) {
  return state.projects.filter((p) => p.siteId === siteId && p.stage === 'live' && p.kind === 'shell' && p.tenant)
}

/**
 * What selling the whole site fetches: its pieces at their own prices (doc 43 §0.14 item 8, no new pricing rule): each
 * leased hall at its lease-sale value (PROJECT_SELL's), and its free energized MW and queue positions (M53's site power
 * sale). Anything else on the site (your own GPU halls, hosting, machines) stays.
 */
export function wholeSiteSale(state: GameState, site: Site) {
  const halls = leasedHalls(state, site.id)
  const leasesUsd = halls.reduce((a, p) => a + Math.round(saleValueUsd(state, p)), 0)
  const power = sitePowerSale(state, site)
  return { halls: halls.length, leasesUsd, powerUsd: power.totalUsd, positions: power.positions.length, totalUsd: leasesUsd + power.totalUsd }
}

export function sellSiteBlocker(state: GameState, siteId: string): Message | undefined {
  if (!inActV(state)) return { key: 'error.queue_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  const sale = wholeSiteSale(state, site)
  if (sale.totalUsd <= 0) return { key: 'error.queue_nothing_to_sell' }
  for (const a of sitePowerSale(state, site).positions) {
    const p = projectOf(state, a)
    if (p && (p.tenant || (state.facilities ?? []).some((x) => x.projectId === p.id))) return { key: 'error.queue_committed' }
  }
  const need = BALANCE.projects.bandwidth.sell
  if (state.bandwidth < need) return { key: 'error.no_bandwidth', params: { needed: need, have: state.bandwidth } }
}

/** Sells the whole site (one sale's Bandwidth): its leased halls, then its free MW and positions. One −1 move. */
export function sellWholeSite(state: GameState, siteId: string): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const before = wholeSiteSale(state, site)
  for (const p of leasedHalls(state, siteId)) {
    sellProject(state, p.id, false)
    repayProjectFacilities(state, p.id)
  }
  const withPosition = sellSitePower(state, siteId, true)
  state.bandwidth -= BALANCE.projects.bandwidth.sell
  logEntry(state, 'log.queue.whole_site_sold', { n: before.halls, priceUsd: before.totalUsd })
  logAct5Move(state, withPosition ? 'sell_site_with_position' : 'sell_site_free_mw')
}

/** The Queue panel's rows: every position you hold, and each site's co-located MW (a venture's, no wait). */
export function queueView(state: GameState) {
  if (!inActV(state)) return null
  const positions = state.sites.flatMap((site) =>
    pendingGrid(state, site)
      .filter((a) => a.position)
      .map((a) => {
        const pos = a.position!
        const p = projectOf(state, a)
        return {
          projectId: a.projectId,
          n: p?.n ?? 0,
          siteId: site.id,
          region: queueRegion(regionOf(site) ?? 'ercot'),
          kw: a.kw,
          requestQuarter: CONTENT.quarters[pos.requestQuarter],
          expectedQuarter: CONTENT.quarters[a.readyQuarter!] ?? null,
          securityUsd: pos.securityUsd,
          billUsdKw: pos.studyQuarter <= state.quarter ? pos.billUsdKw : null,
          billUsd: pos.studyQuarter <= state.quarter ? roundCents(pos.billUsdKw * a.kw) : null,
          billPaid: pos.billPaid ?? false,
          fastLane: pos.fastLane ?? false,
          payBlocked: payUpgradeBlocker(state, a.projectId) ?? null,
          withdrawBlocked: withdrawBlocker(state, a.projectId) ?? null,
          fastBlocked: fastLaneBlocker(state, a.projectId) ?? null,
        }
      }),
  )
  const sites = state.sites
    .filter((s) => s.tier !== 'garage')
    .map((s) => {
      const sale = sitePowerSale(state, s)
      return {
        siteId: s.id,
        colocatedKw: s.ventureKw ?? 0,
        freeKw: sale.freeKw,
        saleUsd: sale.totalUsd,
        saleBlocked: sellSitePowerBlocker(state, s.id) ?? null,
        wholeUsd: wholeSiteSale(state, s).totalUsd,
        wholeHalls: wholeSiteSale(state, s).halls,
        wholeBlocked: sellSiteBlocker(state, s.id) ?? null,
        // (M58.3: its running load enrolled as curtailable, and what's left to enrol)
        flexKw: s.flexKw ?? 0,
        enrollableKw: enrollableKw(state, s),
        enrolBlocked: enrolBlocker(state, s.id) ?? null,
      }
    })
  return { positions, sites, fastLaneQuarters: fastLaneQuarters(state) }
}

/** Moves a waiting position's energisation by `quarters` (never before next quarter); its hall's go-live follows. */
export function delayPosition(state: GameState, projectId: string, quarters: number): void {
  const f = findPosition(state, projectId)
  if (!f || f.add.readyQuarter === null || f.add.readyQuarter === undefined) return
  f.add.readyQuarter = Math.max(state.quarter + 1, f.add.readyQuarter + quarters)
  syncProject(state, projectOf(state, f.add), f.add)
}
