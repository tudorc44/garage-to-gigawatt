// Read-only views of a site's energy options (M35, doc 38 §4) for the site card's Power options dialog and the Plan's
// special sites: what's built, what can be built and its honest numbers (capex, build time, payback), Texas's
// programmes and a flare pad's well. The UI shows these; it never works out a rule itself.
import { CONTENT } from '../content/index.ts'
import { ENERGY, type EnergyKind, type SpecialSiteKind } from '../content/energyContent.ts'
import type { Message } from '../i18n/t.ts'
import type { EnergyAsset, GameState } from './state.ts'
import {
  bessHours,
  buildCostUsd,
  buildEnergyBlocker,
  buildQuarters,
  capacityFactor,
  effectiveUsdMwh,
  energyChoices,
  isOwnedKind,
  paybackYears,
  repairCostUsd,
  windRevealed,
} from './systems/energy.ts'
import { firmKw, flareOutput } from './systems/energyAssets.ts'
import {
  hydroMoratorium,
  leaseSpecialBlocker,
  newLoadTariff,
  relocateBlocker,
  relocateCostUsd,
  specialCostUsd,
  specialKindsOnOffer,
  specialStatus,
  type SpecialStatus,
} from './systems/specialSites.ts'
import { normalPriceUsdKwh } from './systems/sites.ts'
import { aiMw, curtailableMw, drCreditUsd, setTexasBlocker, summerOf, texasBlocker } from './systems/texasPower.ts'
import { bessMw } from './systems/energyAssets.ts'

export interface EnergyAssetRow {
  id: string
  kind: EnergyKind
  /** kW of power (a home battery: its blocks instead). */
  kw: number
  blocks?: number
  hours?: number
  status: 'building' | 'working' | 'broken'
  /** The quarter it works from ("2018Q2"). */
  readyQuarter: string
  capexUsd: number
  /** A generator's capacity factor as shown: small wind's pitched figure until its first report, then the real one. */
  cf: number | null
  cfPitched: boolean
  paybackYears: number | null
  repairUsd: number | null
}

export interface EnergyQuote {
  size: number
  hours?: number
  capexUsd: number
  buildQuarters: number
  /** Years to pay back from the bill offset at today's price and load; null if it never does or earns otherwise. */
  paybackYears: number | null
  effectiveUsdMwh: number | null
  blocked?: Message
}

export interface EnergyChoiceView {
  kind: EnergyKind
  /** Owned kinds are sized in kW (a home battery in blocks), the rest in MW. */
  unit: 'kw' | 'blocks' | 'mw'
  blocked?: Message
  quotes: EnergyQuote[]
}

export interface TexasView {
  blocked?: Message
  enrolled: boolean
  fourCp: boolean
  curtailableMw: number
  aiMw: number
  bessMw: number
  /** The year's credit at this summer's rate (and the year's summer type when it's known). */
  creditUsd: number
  summer: string
  discountYear: string | null
  forfeited: boolean
  fourCpBlocked?: Message
}

export interface FlareView {
  outputShare: number
  /** While it moves to a new well: the quarter it's back ("2023Q3"); null otherwise. */
  movingUntil: string | null
  relocateUsd: number
  relocateBlocked?: Message
}

export interface EnergyCardView {
  assets: EnergyAssetRow[]
  choices: EnergyChoiceView[]
  texas: TexasView | null
  flare: FlareView | null
  /** kW of firm power from renewables with storage (working now). */
  firmKw: number
}

function assetRow(state: GameState, siteId: string, a: EnergyAsset): EnergyAssetRow {
  const site = state.sites.find((s) => s.id === siteId)!
  const generator = a.kind === 'rooftop_solar' || a.kind === 'small_wind' || a.kind === 'btm_solar' || a.kind === 'btm_wind'
  const pitched = a.kind === 'small_wind' && !windRevealed(state, a)
  return {
    id: a.id,
    kind: a.kind,
    kw: a.kw,
    ...(a.blocks !== undefined ? { blocks: a.blocks } : {}),
    ...(a.hours !== undefined ? { hours: a.hours } : {}),
    status: a.readyQuarter > state.quarter ? 'building' : a.broken ? 'broken' : 'working',
    readyQuarter: CONTENT.quarters[a.readyQuarter] ?? CONTENT.quarters.at(-1)!,
    capexUsd: a.capexUsd,
    cf: generator ? (pitched ? ENERGY.owned.small_wind.cf_pitched : capacityFactor(site, a)) : null,
    cfPitched: pitched,
    paybackYears: paybackYears(state, site, a),
    repairUsd: a.broken ? repairCostUsd(a) : null,
  }
}

/** A site's energy card, or null for an unknown site. */
export function energyCardView(state: GameState, siteId: string): EnergyCardView | null {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return null
  const choices: EnergyChoiceView[] = energyChoices(state, site).map((c) => {
    const unit = c.kind === 'home_battery' ? 'blocks' : isOwnedKind(c.kind) ? 'kw' : 'mw'
    const hoursList = c.kind === 'bess' ? bessHours(state) : [undefined]
    const quotes: EnergyQuote[] = []
    for (const size of c.sizes)
      for (const hours of hoursList) {
        const capex = buildCostUsd(state, site, c.kind, size, hours)
        if (capex === null) continue
        const kw = unit === 'kw' ? size : unit === 'mw' ? size * 1000 : 0
        const trial: EnergyAsset = {
          id: 'quote',
          kind: c.kind,
          kw,
          capexUsd: capex,
          builtQuarter: state.quarter,
          readyQuarter: state.quarter + buildQuarters(c.kind),
        }
        const blocked = buildEnergyBlocker(state, { siteId, kind: c.kind, size, hours })
        quotes.push({
          size,
          ...(hours !== undefined ? { hours } : {}),
          capexUsd: capex,
          buildQuarters: buildQuarters(c.kind),
          paybackYears: paybackYears(state, site, trial),
          effectiveUsdMwh: effectiveUsdMwh(site, trial),
          ...(blocked ? { blocked } : {}),
        })
      }
    return { kind: c.kind, unit, ...(c.blocked ? { blocked: c.blocked } : {}), quotes }
  })
  const year = CONTENT.quarters[state.quarter].slice(0, 4)
  const texasWhy = texasBlocker(state, site)
  const texas: TexasView | null =
    texasWhy?.key === 'error.texas_not_ercot' || texasWhy?.key === 'error.texas_not_yet'
      ? null
      : {
          ...(texasWhy ? { blocked: texasWhy } : {}),
          enrolled: site.dr?.enrolled ?? false,
          fourCp: site.dr?.fourCp ?? false,
          curtailableMw: curtailableMw(state, site),
          aiMw: aiMw(state, site),
          bessMw: bessMw(site, state.quarter),
          creditUsd: drCreditUsd(state, site),
          summer: summerOf(year),
          discountYear: site.dr?.discountYear ?? null,
          forfeited: site.dr?.forfeitYear === year,
          ...(() => {
            const b = site.dr?.fourCp ? undefined : setTexasBlocker(state, { siteId, fourCp: true })
            return b ? { fourCpBlocked: b } : {}
          })(),
        }
  const flare: FlareView | null = site.flare
    ? {
        outputShare: flareOutput(site, state.quarter),
        movingUntil:
          site.flare.relocatingUntil !== undefined && site.flare.relocatingUntil > state.quarter
            ? CONTENT.quarters[site.flare.relocatingUntil]
            : null,
        relocateUsd: relocateCostUsd(site),
        ...(() => {
          const b = relocateBlocker(state, siteId)
          return b ? { relocateBlocked: b } : {}
        })(),
      }
    : null
  return {
    assets: (site.energy ?? []).map((a) => assetRow(state, siteId, a)),
    choices,
    texas,
    flare,
    firmKw: firmKw(site, state.quarter),
  }
}

export interface SpecialSiteRow {
  kind: SpecialSiteKind
  status: SpecialStatus
  kw: number
  priceUsdKwh: number
  costUsd: number
  rentUsdQ: number
  buildQuarters: number
  /** For a hydro kind: the moratorium's end (known once it has begun) and the tariff on new load after it. */
  moratoriumUntil: number | null
  blocked?: Message
}

/** The special sites on offer to the player now (the Plan's to-do), with their terms. */
export function specialSitesView(state: GameState): SpecialSiteRow[] {
  return specialKindsOnOffer(state).map((kind) => {
    const k = ENERGY.specialKinds[kind]
    const probe = {
      id: 'probe',
      tier: k.tier,
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
      special: kind,
      tariffMult: newLoadTariff(state, kind),
    }
    const m = k.queue === 'hydro' ? hydroMoratorium(state) : null
    const blocked = leaseSpecialBlocker(state, kind)
    return {
      kind,
      status: specialStatus(state, kind),
      kw: k.kw,
      priceUsdKwh: normalPriceUsdKwh(probe, state.quarter),
      costUsd: specialCostUsd(kind),
      rentUsdQ: k.rent_usd_q,
      buildQuarters: k.build_quarters,
      moratoriumUntil: m && state.quarter >= m.from ? m.until : null,
      ...(blocked ? { blocked } : {}),
    }
  })
}
