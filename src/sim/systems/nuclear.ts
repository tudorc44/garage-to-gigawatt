// Nuclear PPAs (Act III, M17.2; doc 27 D7, nuclear.json, the design thread's step-6 spec). A third new-power
// source in a project's Power slot, from 2027Q3, at sites in PJM, Ohio, Georgia and the Nordics:
// - the price is the scenario's nuclear_ppa_usd_mwh in the quarter it's signed (the build start), fixed for
//   15 years (60 quarters, past 2030Q4); no capex and no grid queue: the power is energized 8 weeks after the
//   build starts, so it never delays the project beyond its build;
// - take-or-pay 90%: from the project's ready quarter, each quarter the host pays price × max(used MW, 0.9 ×
//   contracted MW) × 2,190 h. Used MW (M17.8 E): the site's loads (miners, hosting, live projects) use its other
//   power first and the PPA MW last;
// - every load pays the market price weekly (capacity charge included) and a shell tenant reimburses it; at the
//   quarter's end the PPA refunds that market price on the used MW, so used MW cost the PPA price (M17.8);
// - unused paid-for MW (0.9 × contracted − used) are resold at 0.9 × the region's energy price (M17.8 C);
// - M18.0 (DT): PPA power also pays Act II's regional adder (PJM +$11, Ohio and Georgia +$5 per MWh), and a cloud's
//   cooling overhead (× PUE) counts in its draw, so it's PPA power while the draw stays within the contract;
// - tenant pull: one more shell offer, hyperscaler leases × 1.03; Ratepayer Anger −5 in each region with one;
// - it can't be cancelled; it goes with its project when sold or foreclosed; if the project ends it stays on the
//   site at take-or-pay until a new project there uses it. No mark-to-market in the valuation (DT).
import {
  BALANCE,
  CONTENT,
  actFirstQuarter,
  quarterInputs,
  type PowerRegion,
  type ScenarioId,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  inActIII,
  logEntry,
  projectGone,
  type GameState,
  type Ppa,
  type Project,
  type Site,
} from '../state.ts'
import { downtimeShare } from './density.ts'
import { regionPowerAdderUsdKwh } from './regions.ts'
import { getModel, scenarioOf } from './market.ts'
import {
  isReady,
  powerPriceUsdKwh,
  poweredKw,
  regionCapacityChargeUsdKwh,
  regionOf,
} from './sites.ts'

const N = BALANCE.act3.nuclear

/** This quarter's PPA price, $/MWh, or null when none is offered (before 2027Q3, outside Act III). */
export function nuclearPriceUsdMwh(
  state: GameState,
  quarter = state.quarter,
): number | null {
  if (!inActIII(state)) return null
  return quarterInputs(quarter, scenarioOf(state))?.act3?.nuclearPpaUsdMwh ?? null
}

/** Whether a region can sign a PPA (nuclear.json's eligibility). */
export function nuclearRegion(region: PowerRegion | undefined): boolean {
  return !!region && CONTENT.act3Nuclear.regions.includes(region)
}

/** Why a PPA can't power a project at this site now, or undefined. */
export function nuclearBlocker(
  state: GameState,
  site: Site,
): Message | undefined {
  const from = CONTENT.act3Nuclear.unlockQuarter
  if (
    !inActIII(state) ||
    CONTENT.quarters[state.quarter] < from ||
    nuclearPriceUsdMwh(state) === null
  )
    return { key: 'error.nuclear_early', params: { quarter: from } }
  if (!nuclearRegion(regionOf(site))) return { key: 'error.nuclear_region' }
  return undefined
}

/** Quarters from a build start until the PPA's power is energized: 8 weeks of commissioning, at least 1. */
export function nuclearPowerQuarters(): number {
  return Math.max(1, Math.ceil(N.commissioningWeeks / BALANCE.weeksPerQuarter))
}

/** A PPA that still holds (signed, not past its term, its project not sold or foreclosed). */
function holds(state: GameState, x: Ppa, quarter: number): boolean {
  if (quarter < x.signedQuarter || quarter > x.endQuarter) return false
  const p = x.projectId
    ? state.projects.find((y) => y.id === x.projectId)
    : undefined
  return !p || (p.stage !== 'sold' && p.stage !== 'foreclosed')
}

/** The PPAs that hold now. */
export function activePpas(state: GameState, quarter = state.quarter): Ppa[] {
  return (state.ppas ?? []).filter((x) => holds(state, x, quarter))
}

/** The PPA a project draws on (attached to it and holding), or undefined. */
export function ppaOf(state: GameState, p: Pick<Project, 'id'>): Ppa | undefined {
  return activePpas(state).find((x) => x.projectId === p.id)
}

/** Whether a project runs on (or will run on) nuclear PPA power. */
export function hasPpa(state: GameState, p: Project): boolean {
  return p.power === 'nuclear' || !!ppaOf(state, p)
}

/**
 * The power price a cloud's or pilot's projection uses, $/kWh: the PPA's price on the MW it covers, the site's
 * market price on the rest (a proposed project with a nuclear Power slot: this quarter's PPA price). The weekly
 * cost itself is at the market price; the PPA settles the difference at the quarter's end (M17.8).
 */
export function projectPowerUsdKwh(
  state: GameState,
  p: Project,
  site: Site,
  quarter = state.quarter,
): number {
  const market = powerPriceUsdKwh(site, quarter, scenarioOf(state))
  const x = ppaOf(state, p)
  // (M18.0: the PPA pays the region's adder on top; its MW cover the cooling overhead too, × PUE)
  const adder = ppaAdderUsdMwh(site, quarter) / 1000
  // a proposed project with a nuclear Power slot: priced at this quarter's PPA price on its own MW
  const now = !x && p.power === 'nuclear' ? nuclearPriceUsdMwh(state, quarter) : null
  const ppaKw = x?.kw ?? (now !== null ? p.kw : 0)
  const priceUsdMwh = x?.priceUsdMwh ?? now
  if (priceUsdMwh == null || p.kw <= 0) return market
  const drawKw = p.kw * (p.kind === 'shell' ? 1 : BALANCE.projects.cloudPue)
  const covered = Math.min(drawKw, ppaKw) / drawKw
  return covered * (priceUsdMwh / 1000 + adder) + (1 - covered) * market
}

/** A quarter's label, past the game's timeline too (a PPA ends in 2042): counted on from 2027Q1. */
export function quarterLabelBeyond(quarter: number): string {
  const known = CONTENT.quarters[quarter]
  if (known) return known
  const n = quarter - actFirstQuarter(3)
  return `${2027 + Math.floor(n / 4)}Q${(n % 4) + 1}`
}

/** Signs a project's PPA at its build start: this quarter's price, take-or-pay from its ready quarter. */
export function signProjectPpa(state: GameState, p: Project): Ppa {
  const x: Ppa = {
    id: `ppa-${state.nextId++}`,
    siteId: p.siteId,
    kw: p.kw,
    priceUsdMwh: nuclearPriceUsdMwh(state)!,
    signedQuarter: state.quarter,
    fromQuarter: p.readyQuarter ?? state.quarter + 1,
    endQuarter: state.quarter + CONTENT.act3Nuclear.termQuarters - 1,
    projectId: p.id,
  }
  ;(state.ppas ??= []).push(x)
  logEntry(state, 'log.ppa_signed', {
    n: p.n,
    projectKw: x.kw,
    usdMwh: x.priceUsdMwh,
    quarter: quarterLabelBeyond(x.endQuarter),
  })
  return x
}

/** A new project on existing MW at a site with a free PPA (stranded, or its project ended) takes it. */
export function attachFreePpa(state: GameState, p: Project): void {
  if (p.power) return
  const free = activePpas(state).find((x) => {
    if (x.siteId !== p.siteId) return false
    if (!x.projectId) return true
    return state.projects.find((y) => y.id === x.projectId)?.stage === 'ended'
  })
  if (free) free.projectId = p.id
}

/**
 * kW drawn at a site this quarter (M17.8): its earning machines, its live hosting, and its live projects (a shell
 * only with a tenant), each × the share of the quarter it runs.
 */
export function siteDrawKw(state: GameState, site: Site, quarter = state.quarter): number {
  let kw = 0
  if (isReady(site, quarter))
    for (const lot of state.machines)
      if (
        lot.siteId === site.id &&
        !lot.idle &&
        !lot.legacyCloud &&
        quarter >= lot.earnsFromQuarter
      )
        kw += (lot.count - lot.failed) * getModel(lot.model)!.power_kw
  for (const h of state.hosting)
    if (h.siteId === site.id && h.readyQuarter <= quarter) kw += h.kw
  for (const p of state.projects) {
    if (p.siteId !== site.id || p.stage !== 'live' || projectGone(p)) continue
    if (p.kind === 'shell' && !p.tenant) continue
    // (M18.0, DT answer 3: a cloud or pilot draws its cooling overhead too, × PUE)
    const pue = p.kind === 'shell' ? 1 : BALANCE.projects.cloudPue
    kw += p.kw * pue * downtimeShare(p, quarter)
  }
  return kw
}

/**
 * Act II's regional power adder at a PPA's site, $/MWh (M18.0, DT answer 2): a policy charge on data-centre load,
 * so PPA power pays it on top of its price (and the shell tenant's market reimbursement already includes it).
 */
export function ppaAdderUsdMwh(site: Site | undefined, quarter: number): number {
  return site ? regionPowerAdderUsdKwh(regionOf(site), quarter) * 1000 : 0
}

/**
 * Each PPA's kW in use at a site this quarter (M17.8 E, answer 3): every load at the site (miners included) uses
 * the site's other power first and the PPA MW last: used PPA kW = min(contracted, max(0, drawn − non-PPA
 * energized)), shared out in the order the PPAs were signed.
 */
function sitePpaUseKw(state: GameState, siteId: string, quarter: number): Map<string, number> {
  const out = new Map<string, number>()
  const site = state.sites.find((s) => s.id === siteId)
  const ppas = activePpas(state, quarter).filter(
    (x) => x.siteId === siteId && quarter >= x.fromQuarter,
  )
  if (!site || ppas.length === 0) return out
  const ppaKw = ppas.reduce((kw, x) => kw + x.kw, 0)
  const otherKw = Math.max(0, poweredKw(site, quarter) - ppaKw)
  let spill = Math.max(0, siteDrawKw(state, site, quarter) - otherKw)
  for (const x of ppas) {
    const used = Math.min(x.kw, spill)
    out.set(x.id, used)
    spill -= used
  }
  return out
}

/** The kW of a PPA in use this quarter (its site's loads, after the site's other power). */
export function ppaUsedKw(state: GameState, x: Ppa, quarter = state.quarter): number {
  return sitePpaUseKw(state, x.siteId, quarter).get(x.id) ?? 0
}

/**
 * The price unused take-or-pay power is resold at, $/MWh (M17.8 C, DT): 0.9 × the region's energy price that
 * quarter (the scenario's power_usd_kwh_<region>, without the capacity charge). 0 without a region.
 */
export function ppaResaleUsdMwh(
  state: GameState,
  site: Site,
  quarter = state.quarter,
): number {
  const region = regionOf(site)
  const energy = region
    ? quarterInputs(quarter, scenarioOf(state))?.powerUsdKwh[region]
    : undefined
  return energy === undefined ? 0 : N.resaleShare * energy * 1000
}

/**
 * What a PPA costs the host this quarter, net (M17.8): take-or-pay on max(used, 90% of contracted), less the
 * market price (capacity charge included) already paid on the used MW (every load pays the market weekly; a shell
 * tenant reimburses it), less the unused paid-for MW resold. So used MW cost the PPA price, and unused ones the gap
 * between it and the resale price.
 */
export function ppaQuarterNetUsd(
  state: GameState,
  x: Ppa,
  quarter = state.quarter,
): { netUsd: number; usedKw: number; billUsd: number; unusedKw: number; resoldUsd: number } {
  if (quarter < x.fromQuarter || !holds(state, x, quarter))
    return { netUsd: 0, usedKw: 0, billUsd: 0, unusedKw: 0, resoldUsd: 0 }
  const h = N.hoursPerQuarter
  const usedKw = ppaUsedKw(state, x, quarter)
  const usedMw = usedKw / 1000
  const floorMw = (N.takeOrPayShare * x.kw) / 1000
  const site = state.sites.find((s) => s.id === x.siteId)
  const billUsd =
    (x.priceUsdMwh + ppaAdderUsdMwh(site, quarter)) * Math.max(usedMw, floorMw) * h
  const unusedMw = Math.max(0, floorMw - usedMw)
  const resoldUsd = site ? unusedMw * ppaResaleUsdMwh(state, site, quarter) * h : 0
  const paidUsd = site
    ? powerPriceUsdKwh(site, quarter, scenarioOf(state)) * 1000 * usedMw * h
    : 0
  return {
    netUsd: billUsd - paidUsd - resoldUsd,
    usedKw,
    billUsd,
    unusedKw: unusedMw * 1000,
    resoldUsd,
  }
}

/**
 * A PPA signed in `signed` against a region's market at `at` (M17.8, the sim's spread table): the scenario's
 * energy price plus the capacity charge, less the PPA price locked when signed, $/MWh. Positive: the PPA is
 * cheaper. (Act II's regional policy adders, also in the game's market price, are left out, as in the spec.)
 */
export function lockedSpreadUsdMwh(
  scenario: ScenarioId,
  region: PowerRegion,
  signed: number,
  at: number,
): number | null {
  const locked = quarterInputs(signed, scenario)?.act3?.nuclearPpaUsdMwh
  const energy = quarterInputs(at, scenario)?.powerUsdKwh[region]
  if (locked == null || energy === undefined) return null
  return (energy + regionCapacityChargeUsdKwh(region, at, scenario)) * 1000 - locked
}

/**
 * At the end of an Act III quarter: every PPA's take-or-pay is settled (in the AI costs, so in EBITDA), the unused
 * power's resale on its own report line.
 */
export function settlePpas(state: GameState): number {
  if (!state.ppas?.length) return 0
  let usd = 0
  let resoldUsd = 0
  let unusedKw = 0
  for (const x of activePpas(state)) {
    const q = ppaQuarterNetUsd(state, x)
    usd += q.netUsd
    resoldUsd += q.resoldUsd
    unusedKw += q.unusedKw
  }
  // PPAs that went with their project (sold, foreclosed) or ran out are dropped.
  state.ppas = state.ppas.filter(
    (x) => holds(state, x, state.quarter) || state.quarter < x.signedQuarter,
  )
  if (usd !== 0) {
    state.cash -= usd
    state.quarterStats.aiCostUsd += usd
    logEntry(state, 'log.ppa_bill', { costUsd: usd + resoldUsd })
    if (resoldUsd > 0)
      logEntry(state, 'log.ppa_resold', { amountUsd: resoldUsd, unusedKw })
  }
  return usd
}

/** The regions where you hold a PPA now (Anger −5 in each, once per region). */
export function ppaRegions(state: GameState, quarter = state.quarter): PowerRegion[] {
  const out = new Set<PowerRegion>()
  for (const x of activePpas(state, quarter)) {
    const site = state.sites.find((s) => s.id === x.siteId)
    const region = site ? regionOf(site) : undefined
    if (region) out.add(region)
  }
  return [...out]
}

/**
 * One quarter of the PPAs' savings against the market: Σ max(0, market − (PPA + the region's adder)) × used MW ×
 * 2,190 h (ppa_savings).
 */
export function ppaSavingsUsd(state: GameState): number {
  return activePpas(state).reduce((sum, x) => {
    const site = state.sites.find((s) => s.id === x.siteId)
    if (!site) return sum
    const market = powerPriceUsdKwh(site, state.quarter, scenarioOf(state)) * 1000
    const paid = x.priceUsdMwh + ppaAdderUsdMwh(site, state.quarter)
    return (
      sum +
      Math.max(0, market - paid) *
        (ppaUsedKw(state, x) / 1000) *
        N.hoursPerQuarter
    )
  }, 0)
}
