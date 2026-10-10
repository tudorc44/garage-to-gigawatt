// Special sites (M35.3, doc 38 §4.4-4.6, E-D3, E-D5): cheap hydro allocations (a Washington PUD county, an upstate New
// York muni, Québec hosting), Iceland, and flare-gas pads. Designed values, to verify before the content pack (doc 38
// §8 Q1-Q3). The hydro counties take one new allocation a quarter; the 2017Q4 application flood brings a moratorium
// from 2018Q1 for 4-6 quarters, then a crypto tariff on new load (+60-100%) and +30% on existing contracts at renewal.
// Iceland freezes new allocations in 2018Q1 for 2 quarters and from 2021Q4 for good. A flare pad is mining only: its
// well declines after a year, and it can move to a new well. Rolls use their own substreams ("energy:hydro", …).
import { BALANCE, CONTENT, actLastQuarter } from '../../content/index.ts'
import { ENERGY, SPECIAL_SITE_KINDS, type SpecialSiteKind } from '../../content/energyContent.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream, uniform } from '../rng.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { addGrievance } from './heat.ts'
import { addSite, siteParams } from './siteSerials.ts'
import { book, roundCash } from '../ledger.ts'
import { capacityKw, topTierIndex } from './sites.ts'

const S = ENERGY.special_sites
const label = (q: number) => CONTENT.quarters[q]
const qIndex = (id: string) => CONTENT.quarters.indexOf(id)
const perQuarter = (pYear: number) => 1 - (1 - pYear) ** 0.25

/** The hydro moratorium, drawn once per game from the seed: its first quarter, its end, and the new-load tariff. */
export function hydroMoratorium(state: GameState): { from: number; until: number; tariffMult: number } {
  const h = S.queues.hydro
  const r = substream(state.seed, 'energy:hydro')
  const length = randomInt(r, ...h.moratorium_quarters)
  const tariffMult = Math.round(uniform(r, ...h.tariff_new_load_mult) * 100) / 100
  const from = qIndex(h.moratorium_from)
  return { from, until: from + length, tariffMult }
}

/** True when Iceland takes no new allocations in this quarter. */
function icelandFrozen(quarter: number): boolean {
  return S.queues.iceland.freezes.some((f) => {
    const from = qIndex(f.from)
    return from >= 0 && quarter >= from && quarter < from + f.quarters
  })
}

export type SpecialStatus = 'open' | 'moratorium' | 'frozen' | 'queue_full' | 'closed' | 'not_yet'

/** Where a special kind stands this quarter. */
export function specialStatus(state: GameState, kind: SpecialSiteKind): SpecialStatus {
  const k = ENERGY.specialKinds[kind]
  const q = label(state.quarter)
  if (q < k.from) return 'not_yet'
  if (q > k.until) return 'closed'
  if (k.queue === 'hydro') {
    const m = hydroMoratorium(state)
    if (state.quarter >= m.from && state.quarter < m.until) return 'moratorium'
  }
  if (k.queue === 'iceland' && icelandFrozen(state.quarter)) return 'frozen'
  if (k.queue) {
    const perQ = S.queues[k.queue].per_quarter
    const taken = state.sites.filter(
      (s) => s.special && ENERGY.specialKinds[s.special].queue === k.queue && s.acquiredQuarter === state.quarter,
    ).length
    if (taken >= perQ) return 'queue_full'
  }
  return 'open'
}

/** The new-load tariff a hydro site leased now pays (1 before the moratorium ends). */
export function newLoadTariff(state: GameState, kind: SpecialSiteKind): number {
  if (ENERGY.specialKinds[kind].queue !== 'hydro') return 1
  const m = hydroMoratorium(state)
  return state.quarter >= m.until ? m.tariffMult : 1
}

/** What leasing (or, for a flare pad, building) a special site costs now. */
export function specialCostUsd(kind: SpecialSiteKind): number {
  const k = ENERGY.specialKinds[kind]
  return kind === 'flare' ? (k.genset_usd_kw ?? 0) * k.kw : (k.capex_usd ?? 0)
}

/** The kinds the player can see: from a warehouse up (requires_tier_index), in the acts they're offered. */
export function specialKindsOnOffer(state: GameState): SpecialSiteKind[] {
  if (state.act < 1 || state.act > 2) return []
  if (topTierIndex(state) < S.requires_tier_index) return []
  return SPECIAL_SITE_KINDS.filter((k) => {
    const s = specialStatus(state, k)
    return s !== 'not_yet' && s !== 'closed'
  })
}

export function leaseSpecialBlocker(state: GameState, kind: SpecialSiteKind): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!SPECIAL_SITE_KINDS.includes(kind)) return { key: 'error.bad_choice' }
  if (!specialKindsOnOffer(state).includes(kind)) return { key: 'error.special_not_offered' }
  const status = specialStatus(state, kind)
  if (status !== 'open') return { key: `error.special_${status}` }
  // (Like building any site: the build's Bandwidth. Mine, reversible.)
  const bw = BALANCE.bandwidth.build
  if (state.bandwidth < bw) return { key: 'error.no_bandwidth', params: { needed: bw, have: state.bandwidth } }
  const cost = specialCostUsd(kind)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

/** Leases a hydro or Iceland allocation, or builds a flare pad (doc 38 §4.4-4.6). */
export function leaseSpecial(state: GameState, kind: SpecialSiteKind): void {
  const k = ENERGY.specialKinds[kind]
  const cost = specialCostUsd(kind)
  const tier = CONTENT.siteTiers.find((t) => t.id === k.tier)!
  const site: Site = {
    id: `site-${state.nextId++}`,
    tier: tier.id,
    readyQuarter: state.quarter + k.build_quarters,
    rentUsdQ: k.rent_usd_q,
    powerPriceMult: 1,
    flaw: null,
    special: kind,
    kw: k.kw,
  }
  if (kind === 'iceland') site.region = 'nordics'
  const tariff = newLoadTariff(state, kind)
  if (tariff !== 1) site.tariffMult = tariff
  if (kind === 'flare') site.flare = { wellQuarter: site.readyQuarter }
  addSite(state, site)
  state.bandwidth -= BALANCE.bandwidth.build
  book(state, 'site_builds', -cost, { site: site.id })
  roundCash(state)
  if (kind === 'flare') addGrievance(state, site.id, S.flare.heat_once)
  logEntry(state, 'log.special.leased', { ...siteParams(site), costUsd: cost })
}

/** A flare pad moves to a new well (doc 38 §4.6): a quarter offline, the mobilisation fee and 10% wear. */
export function relocateCostUsd(site: Site): number {
  const f = S.flare
  const kw = capacityKw(site)
  return roundCents(kw * f.relocate_usd_kw + kw * (ENERGY.specialKinds.flare.genset_usd_kw ?? 0) * f.relocate_wear_share)
}

export function relocateBlocker(state: GameState, siteId: string): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site?.flare) return { key: 'error.bad_choice' }
  if (site.flare.relocatingUntil !== undefined && state.quarter < site.flare.relocatingUntil)
    return { key: 'error.flare_relocating' }
  if (state.quarter < site.readyQuarter) return { key: 'error.flare_relocating' }
  const cost = relocateCostUsd(site)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

export function relocate(state: GameState, siteId: string): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const cost = relocateCostUsd(site)
  const f = S.flare
  book(state, 'site_builds', -cost, { site: siteId })
  roundCash(state)
  site.flare = { wellQuarter: state.quarter + f.relocate_downtime_quarters, relocatingUntil: state.quarter + f.relocate_downtime_quarters }
  logEntry(state, 'log.special.relocated', { ...siteParams(site), costUsd: cost })
}

/**
 * At a quarter's end: the hydro flood's news (2017Q4) and, when the moratorium ends, the existing hydro sites' +30%
 * from their next renewal; a muni's town hall; a flare pad's genset failure (a week off next quarter) and accident.
 */
export function endQuarterSpecialSites(state: GameState): void {
  const specials = state.sites.filter((s) => s.special)
  if (specials.length === 0) return
  const h = S.queues.hydro
  const m = hydroMoratorium(state)
  const hydro = specials.filter((s) => ENERGY.specialKinds[s.special!].queue === 'hydro')
  if (label(state.quarter) === h.flood_quarter && hydro.length > 0)
    logEntry(state, 'log.special.flood', { quarters: m.until - m.from })
  if (state.quarter + 1 === m.until && hydro.length > 0) {
    for (const site of hydro)
      if (site.tariffMult === undefined) site.tariffMult = h.tariff_existing_mult
    logEntry(state, 'log.special.tariff', { pct: Math.round((m.tariffMult - 1) * 100) })
  }
  const r = substream(state.seed, `energy:special:${state.quarter}`)
  for (const site of specials) {
    const k = ENERGY.specialKinds[site.special!]
    if (state.quarter < site.readyQuarter) continue
    if (k.town_hall_per_year && chance(r, perQuarter(k.town_hall_per_year))) {
      addGrievance(state, site.id, k.town_hall_heat ?? 0)
      logEntry(state, 'log.special.town_hall', { ...siteParams(site) })
    }
    if (site.flare && state.quarter < actLastQuarter(2)) {
      if (chance(r, S.flare.genset_fail_per_quarter)) {
        site.flare.offlineQuarter = state.quarter + 1
        logEntry(state, 'log.special.genset', { ...siteParams(site) })
      }
      if (chance(r, perQuarter(S.flare.accident_per_year))) {
        book(state, 'one_offs', -S.flare.accident_usd, { site: site.id })
        roundCash(state)
        addGrievance(state, site.id, S.flare.accident_heat)
        logEntry(state, 'log.special.accident', { ...siteParams(site), costUsd: S.flare.accident_usd })
      }
    }
  }
}
