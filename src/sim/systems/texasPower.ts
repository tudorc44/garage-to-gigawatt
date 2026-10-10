// Texas flexibility (M35.4, doc 38 §4.7, E-D6; M39.1, doc 41): a site in ERCOT on a fixed contract can enrol its
// curtailable MW in demand response (a yearly credit paid whether or not the grid calls, by the summer's type) and, on a
// fixed-price contract, earn the resale of that power too, paid with it; and opt into 4CP (lose 1.5% of Q3's output, a
// flat saving per MW off next year's power). Curtailable means miners: GPU and hosting MW never earn, unless a utility
// battery covers the AI load (the battery is the bridge). A grid call is Act I's curtailment alert; refusing it while
// enrolled forfeits that year's credit. A payment over $30M starts a backlash.
import { CONTENT } from '../../content/index.ts'
import { ENERGY, energyYear } from '../../content/energyContent.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, projectGone, roundCents, type GameState, type Site } from '../state.ts'
import { bessMw } from './energyAssets.ts'
import { addGrievance } from './heat.ts'
import { getModel } from './market.ts'
import { regionOf } from './sites.ts'
import { siteParams } from './siteSerials.ts'

const T = ENERGY.texas
const label = (q: number) => CONTENT.quarters[q]
const yearOf = (q: number) => label(q).slice(0, 4)

/** Why a site can't enrol in demand response or 4CP now, or undefined (doc 38 §4.7's requirement). */
export function texasBlocker(state: GameState, site: Site): Message | undefined {
  if (label(state.quarter) < T.from) return { key: 'error.texas_not_yet' }
  if (regionOf(site) !== 'ercot' || site.special) return { key: 'error.texas_not_ercot' }
  if (site.contract?.type !== T.contract) return { key: 'error.texas_needs_fixed' }
}

export interface TexasChoice {
  siteId: string
  enrolled?: boolean
  fourCp?: boolean
}

export function setTexasBlocker(state: GameState, c: TexasChoice): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const site = state.sites.find((s) => s.id === c.siteId)
  if (!site) return { key: 'error.unknown_site' }
  // Leaving a programme is always allowed; joining needs the requirement.
  if (c.enrolled === true || c.fourCp === true) {
    const blocked = texasBlocker(state, site)
    if (blocked) return blocked
  }
  // 4CP means shedding load at the peaks: AI halls can't, unless a battery carries them (doc 38 §4.8 (1)).
  if (c.fourCp === true && !aiCovered(state, site)) return { key: 'error.texas_ai_needs_battery' }
}

/** True when the site's live AI MW (if any) are covered by its utility battery. */
export const aiCovered = (state: GameState, site: Site) => aiMw(state, site) <= bessMw(site, state.quarter) + 1e-9

/** Enrols in (or leaves) demand response, and opts into (or out of) 4CP. */
export function setTexas(state: GameState, c: TexasChoice): void {
  const site = state.sites.find((s) => s.id === c.siteId)!
  const dr = (site.dr ??= { enrolled: false, fourCp: false })
  if (c.enrolled !== undefined && c.enrolled !== dr.enrolled) {
    dr.enrolled = c.enrolled
    logEntry(state, c.enrolled ? 'log.texas.enrolled' : 'log.texas.left', { ...siteParams(site) })
  }
  if (c.fourCp !== undefined && c.fourCp !== dr.fourCp) {
    dr.fourCp = c.fourCp
    logEntry(state, c.fourCp ? 'log.texas.four_cp_on' : 'log.texas.four_cp_off', { ...siteParams(site) })
  }
}

/** MW of working miners placed at the site (what demand response can switch off). */
export function minerMw(state: GameState, site: Site): number {
  return (
    state.machines
      .filter((l) => l.siteId === site.id && !l.legacyCloud && state.quarter >= l.earnsFromQuarter)
      .reduce((kw, l) => kw + (l.count - l.failed) * getModel(l.model)!.power_kw, 0) / 1000
  )
}

/** MW of live AI projects at the site. */
export function aiMw(state: GameState, site: Site): number {
  return (
    state.projects
      .filter((p) => p.siteId === site.id && p.stage === 'live' && !projectGone(p))
      .reduce((kw, p) => kw + p.kw, 0) / 1000
  )
}

/** Curtailable MW (doc 38 §4.7): the miners, plus the AI MW a utility battery covers. Hosting never counts. */
export function curtailableMw(state: GameState, site: Site): number {
  return minerMw(state, site) + Math.min(bessMw(site, state.quarter), aiMw(state, site))
}

/** The year's summer type (market_energy.csv texas_summer; "normal" when blank). */
export const summerOf = (year: string) => energyYear(Number(year)).texas_summer || 'normal'

/** The demand-response credit a site earns for a whole year at this summer's rate, $ (shown on the card before it's paid). */
export function drCreditUsd(state: GameState, site: Site, summer = summerOf(yearOf(state.quarter))): number {
  return curtailableMw(state, site) * T.dr_usd_mw_yr[summer]
}

/**
 * M39.1 (doc 41): the resale of a fixed-price site's curtailed power, $ a year at this summer's rate (paid with the DR
 * credit; 0 on a floating contract, which has no fixed price to sell back).
 */
export function resaleUsd(state: GameState, site: Site, summer = summerOf(yearOf(state.quarter))): number {
  if (site.contract?.type !== T.resale_contract) return 0
  return curtailableMw(state, site) * T.resale_usd_mw_yr[summer]
}

/** M39.1: 4CP's flat saving per enrolled MW for a year's power, $ per MW-yr (doc 40 §Q4). */
export function fourCpSavingUsdMwYr(year: string): number {
  return T.four_cp.saving_usd_mw_yr.filter((s) => s.from <= year).at(-1)?.usd ?? 0
}

/** Refusing a grid call while enrolled forfeits the year's credit (doc 38 §4.7, mine). */
export function forfeitOnRefusal(state: GameState): void {
  if (!T.refusal_forfeits_year) return
  for (const site of state.sites)
    if (site.dr?.enrolled) {
      site.dr.forfeitYear = yearOf(state.quarter)
      logEntry(state, 'log.texas.forfeit', { ...siteParams(site) })
    }
}

/** What Texas pays at a quarter's end: each site's DR credit and resale (both at Q3's end), and its 4CP saving. */
export interface TexasQuarter {
  /** DR credits plus resale, $ (the energy revenue line of the report). */
  revenueUsd: number
  /** Per site: the DR credit (grid_credits) and the resale (energy_income). */
  drUsd: { siteId: string; usd: number }[]
  resaleUsd: { siteId: string; usd: number }[]
  /** Per site: this quarter's 4CP saving, $ (a negative power cost; already taken off the quarter's power cost). */
  fourCpUsd: { siteId: string; usd: number }[]
}

/**
 * At a quarter's end: a site in its 4CP year saves a quarter of that year's saving off its power. At Q3's end (the
 * summer is over): every enrolled site is paid its credit for the year, unless it refused a call, and a fixed-price site
 * its resale too; a 4CP site's next year's saving is set; a payment over the backlash line adds Heat at every ERCOT site
 * and, in Act III and IV, Ratepayer Anger.
 */
export function endQuarterTexas(state: GameState): TexasQuarter {
  const out: TexasQuarter = { revenueUsd: 0, drUsd: [], resaleUsd: [], fourCpUsd: [] }
  const year = yearOf(state.quarter)
  // M39.1 (doc 41): 4CP is a flat saving on the enrolled MW, a quarter of it each quarter of the next year.
  for (const site of state.sites) {
    const dr = site.dr
    if (!dr?.fourCpSavingUsd || dr.discountYear !== year) continue
    const usd = roundCents(dr.fourCpSavingUsd / 4)
    if (usd <= 0) continue
    out.fourCpUsd.push({ siteId: site.id, usd })
    state.quarterStats.powerCostUsd -= usd
  }
  const q = label(state.quarter)
  if (!q.endsWith(`Q${T.dr_paid_quarter_of_year}`)) return out
  const summer = summerOf(year)
  for (const site of state.sites) {
    const dr = site.dr
    if (!dr) continue
    if (dr.enrolled) {
      if (dr.forfeitYear === year) logEntry(state, 'log.texas.forfeited', { ...siteParams(site) })
      else {
        const credit = roundCents(drCreditUsd(state, site, summer))
        const resale = roundCents(resaleUsd(state, site, summer))
        if (credit > 0) out.drUsd.push({ siteId: site.id, usd: credit })
        if (resale > 0) out.resaleUsd.push({ siteId: site.id, usd: resale })
        if (credit + resale > 0) {
          out.revenueUsd += credit + resale
          logEntry(state, 'log.texas.credit', { ...siteParams(site), creditUsd: credit, resaleUsd: resale, summer })
        }
      }
    }
    if (dr.fourCp && aiCovered(state, site)) {
      dr.discountYear = String(Number(year) + 1)
      dr.fourCpSavingUsd = roundCents(curtailableMw(state, site) * fourCpSavingUsdMwYr(dr.discountYear))
      logEntry(state, 'log.texas.four_cp_set', { ...siteParams(site), year: dr.discountYear, savingUsd: dr.fourCpSavingUsd })
    } else if (dr.fourCp) logEntry(state, 'log.texas.four_cp_missed', { ...siteParams(site) })
  }
  if (out.revenueUsd > T.backlash.payment_usd) {
    for (const site of state.sites) if (regionOf(site) === 'ercot') addGrievance(state, site.id, T.backlash.heat)
    if (state.act >= 3) state.angerAdj = (state.angerAdj ?? 0) + T.backlash.anger
    logEntry(state, 'log.texas.backlash', { creditUsd: out.revenueUsd })
  }
  return out
}
