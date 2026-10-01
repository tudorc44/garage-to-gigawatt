// Nuclear PPAs (Act III, M17.2; doc 27 D7, nuclear.json, the design thread's step-6 spec). A third new-power
// source in a project's Power slot, from 2027Q3, at sites in PJM, Ohio, Georgia and the Nordics:
// - the price is the scenario's nuclear_ppa_usd_mwh in the quarter it's signed (the build start), fixed for
//   15 years (60 quarters, past 2030Q4); no capex and no grid queue: the power is energized 8 weeks after the
//   build starts, so it never delays the project beyond its build;
// - take-or-pay 90%: from the project's ready quarter, each quarter the host pays price × max(used MW, 0.9 ×
//   contracted MW) × 2,190 h. Used MW = the project's MW while it's live and earning (0 while it's empty,
//   ended or retrofitting);
// - a cloud's power on those MW costs the PPA price instead of the site's (× PUE, weekly, as today); a shell
//   tenant reimburses the host at the site's market price for its used MW, so a leased PPA hall earns
//   (market − PPA) × used MWh a quarter;
// - tenant pull: one more shell offer, hyperscaler leases × 1.03; Ratepayer Anger −5 in each region with one;
// - it can't be cancelled; it goes with its project when sold or foreclosed; if the project ends it stays on the
//   site at take-or-pay until a new project there uses it. No mark-to-market in the valuation (DT).
import {
  BALANCE,
  CONTENT,
  actFirstQuarter,
  quarterInputs,
  type PowerRegion,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  inActIII,
  logEntry,
  type GameState,
  type Ppa,
  type Project,
  type Site,
} from '../state.ts'
import { downtimeShare } from './density.ts'
import { scenarioOf } from './market.ts'
import { powerPriceUsdKwh, regionOf } from './sites.ts'

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
 * The power price a cloud or pilot pays, $/kWh: the PPA's price on the MW it covers from its first quarter,
 * the site's market price on the rest.
 */
export function projectPowerUsdKwh(
  state: GameState,
  p: Project,
  site: Site,
  quarter = state.quarter,
): number {
  const market = powerPriceUsdKwh(site, quarter, scenarioOf(state))
  const x = ppaOf(state, p)
  // (a proposed project with a nuclear Power slot: priced at this quarter's PPA price, for its projection)
  if (!x && p.power === 'nuclear') {
    const now = nuclearPriceUsdMwh(state, quarter)
    return now === null ? market : now / 1000
  }
  if (!x || quarter < x.fromQuarter || p.kw <= 0) return market
  const covered = Math.min(p.kw, x.kw) / p.kw
  return covered * (x.priceUsdMwh / 1000) + (1 - covered) * market
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

/** The MW a PPA's project is using this quarter: its MW while live and earning, else 0. */
export function ppaUsedKw(state: GameState, x: Ppa, quarter = state.quarter): number {
  const p = x.projectId
    ? state.projects.find((y) => y.id === x.projectId)
    : undefined
  if (!p || p.stage !== 'live' || downtimeShare(p, quarter) < 1) return 0
  if (p.kind === 'shell' && !p.tenant) return 0
  return Math.min(p.kw, x.kw)
}

/**
 * What a PPA costs the host this quarter, net: take-or-pay on max(used, 90% of contracted), less what a cloud
 * already paid weekly on its used MW, less what a shell tenant reimburses at the market price.
 */
export function ppaQuarterNetUsd(
  state: GameState,
  x: Ppa,
  quarter = state.quarter,
): { netUsd: number; usedKw: number; billUsd: number } {
  if (quarter < x.fromQuarter || !holds(state, x, quarter))
    return { netUsd: 0, usedKw: 0, billUsd: 0 }
  const h = N.hoursPerQuarter
  const usedKw = ppaUsedKw(state, x, quarter)
  const usedMw = usedKw / 1000
  const floorMw = (N.takeOrPayShare * x.kw) / 1000
  const billUsd = x.priceUsdMwh * Math.max(usedMw, floorMw) * h
  const p = x.projectId
    ? state.projects.find((y) => y.id === x.projectId)
    : undefined
  const site = state.sites.find((s) => s.id === x.siteId)
  let netUsd = billUsd
  if (p && usedKw > 0 && p.kind !== 'shell')
    // a cloud paid its used MW at the PPA price every week (× PUE); the top-up is the unused floor
    netUsd = x.priceUsdMwh * Math.max(0, floorMw - usedMw) * h
  else if (p && usedKw > 0 && site)
    netUsd =
      billUsd -
      powerPriceUsdKwh(site, quarter, scenarioOf(state)) * 1000 * usedMw * h
  return { netUsd, usedKw, billUsd }
}

/** At the end of an Act III quarter: every PPA's take-or-pay is settled (in the AI costs, so in EBITDA). */
export function settlePpas(state: GameState): number {
  if (!state.ppas?.length) return 0
  let usd = 0
  for (const x of activePpas(state)) usd += ppaQuarterNetUsd(state, x).netUsd
  // PPAs that went with their project (sold, foreclosed) or ran out are dropped.
  state.ppas = state.ppas.filter(
    (x) => holds(state, x, state.quarter) || state.quarter < x.signedQuarter,
  )
  if (usd !== 0) {
    state.cash -= usd
    state.quarterStats.aiCostUsd += usd
    logEntry(state, 'log.ppa_bill', { costUsd: usd })
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

/** One quarter of the PPAs' savings against the market: Σ max(0, market − PPA) × used MW × 2,190 h (ppa_savings). */
export function ppaSavingsUsd(state: GameState): number {
  return activePpas(state).reduce((sum, x) => {
    const site = state.sites.find((s) => s.id === x.siteId)
    if (!site) return sum
    const market = powerPriceUsdKwh(site, state.quarter, scenarioOf(state)) * 1000
    return (
      sum +
      Math.max(0, market - x.priceUsdMwh) *
        (ppaUsedKw(state, x) / 1000) *
        N.hoursPerQuarter
    )
  }, 0)
}
