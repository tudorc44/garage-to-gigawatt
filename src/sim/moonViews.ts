// Read-only views of Act IV's Moon for the UI (M30.5; doc 33 §17: A4-06 Moon, A4-07 the prospect report). No game rules
// here: every number comes from systems/moon*.ts. Nothing here reads the hidden geology: a site shows your estimates
// (prospect reports and their category), the water a pilot has processed, and nothing else about the grade.
import { CONTENT, act4Row } from '../content/index.ts'
import { LUNAR_SITE_IDS, MOON, lunarSite, type LunarSiteId } from '../content/moonContent.ts'
import type { Message } from '../i18n/t.ts'
import { inActIV, type GameState, type LunarClaim } from './state.ts'
import { scenarioOf } from './systems/market.ts'
import {
  DISPUTE_CHOICES,
  blocOf,
  claimOf,
  claimSiteBlocker,
  estimateT,
  landingChance,
  missionCostUsd,
  otherClaims,
  resolveDisputeBlocker,
  resourceCategory,
  resourceShare,
  rivalOn,
  sendMissionBlocker,
} from './systems/moon.ts'
import {
  arrangedKwe,
  buildSolarBlocker,
  effectiveKwe,
  frozen,
  leaseReactorBlocker,
  lunarUnitUsd,
  maintainBlocker,
  megawattBlocker,
  offtakeLeftUsd,
  pilotBlocker,
  pilotCostUsd,
  productionBlocker,
  reactorFrom,
  signOfftakeBlocker,
  siteValueUsd,
  solarCostUsd,
} from './systems/moonOps.ts'

const label = (q: number | null | undefined) => (q === null || q === undefined ? null : (CONTENT.quarters[q] ?? null))
const orNull = (m: Message | undefined): Message | null => m ?? null

/** One site's row on the map and its programme card (A4-06). */
function siteView(state: GameState, site: LunarSiteId) {
  const s = lunarSite(site)
  const c: LunarClaim | undefined = claimOf(state, site)
  const past = state.act4Moon?.claims.find((x) => x.site === site && (x.status === 'lost' || x.status === 'withdrawn'))
  const rival = rivalOn(state, site)
  const mission = state.act4Moon?.missions.find((m) => m.site === site && m.status === 'en_route')
  return {
    site,
    illumination: s.illumination,
    iceAccess: s.ice_access,
    maxKwe: s.max_kwe,
    blocInterest: s.bloc_interest,
    yours: c
      ? {
          status: c.status,
          landByLabel: label(c.landBy),
          landedLabel: label(c.landedQuarter),
          sharedWith: c.sharedWith ?? null,
          category: resourceCategory(c),
          estimateT: estimateT(c) * resourceShare(c),
          reports: c.reports.map((r) => ({ ...r, label: label(r.quarter)! })),
          solar: c.solar ? { kwe: c.solar.kwe, readyLabel: label(c.solar.readyQuarter) } : null,
          reactor: c.reactor ? { kwe: c.reactor.kwe, readyLabel: label(c.reactor.readyQuarter) } : null,
          arrangedKwe: arrangedKwe(c),
          deliveredKwe: effectiveKwe(c, state.quarter),
          pilot: c.pilot
            ? {
                readyLabel: label(c.pilot.readyQuarter),
                running: c.pilot.readyQuarter <= state.quarter,
                availability: c.pilot.availability,
                maintained: c.pilot.maintained,
                processedT: c.pilot.processedT,
                frozen: frozen(state),
              }
            : null,
          production: c.production
            ? { drawnUsd: c.production.drawnUsd, capexUsd: c.production.capexUsd }
            : null,
          valueUsd: siteValueUsd(state, c),
        }
      : null,
    lost: !c && past ? past.status : null,
    rival: rival ? { claimant: rival.claimant, landed: rival.landed, claimLabel: rival.claim } : null,
    mission: mission ? { arrivalLabel: label(mission.arrivalQuarter)!, costUsd: mission.costUsd } : null,
    claimWhy: orNull(claimSiteBlocker(state, site)),
    missionWhy: orNull(sendMissionBlocker(state, site)),
    solarOptions: MOON.power.solar.sizes_kwe
      .filter((k) => k <= s.max_kwe)
      .map((kwe) => ({ kwe, costUsd: solarCostUsd(state, kwe), why: orNull(buildSolarBlocker(state, site, kwe)) })),
    reactorWhy: orNull(leaseReactorBlocker(state, site)),
    pilotWhy: orNull(pilotBlocker(state, site)),
    maintainWhy: orNull(maintainBlocker(state, site)),
    productionWhy: orNull(productionBlocker(state, site)),
  }
}
export type SiteView = ReturnType<typeof siteView>

/** The Moon screen (A4-06). Null outside Act IV. */
export function moonView(state: GameState) {
  if (!inActIV(state)) return null
  const moon = state.act4Moon
  const row = act4Row(state.quarter, scenarioOf(state))
  const reactorQ = reactorFrom(state)
  return {
    sites: LUNAR_SITE_IDS.map((id) => siteView(state, id)),
    disputes: (moon?.disputes ?? []).map((d) => ({
      ...d,
      raisedLabel: label(d.raisedQuarter)!,
      bloc: blocOf(d.claimant),
      choices: DISPUTE_CHOICES.map((choice) => ({ choice, why: orNull(resolveDisputeBlocker(state, d.site, choice)) })),
    })),
    otherClaims: otherClaims(state).map((c) => ({ ...c })),
    offers: (moon?.offers ?? []).map((o, i) => ({ ...o, index: i, why: orNull(signOfftakeBlocker(state, i)) })),
    offtakes: (moon?.offtakes ?? []).map((o) => ({
      ...o,
      endLabel: label(o.endQuarter)!,
      leftUsd: offtakeLeftUsd(state, o),
      live: o.endQuarter > state.quarter,
    })),
    megawatt: { signedLabel: label(moon?.megawattQuarter), why: orNull(megawattBlocker(state)), feeUsd: MOON.power.megawatt_contract.fee_usd },
    alignedBloc: moon?.alignedBloc ?? null,
    frozenUntil: frozen(state) ? label(moon!.freezeUntil) : null,
    costs: {
      claimFeeUsd: MOON.claim.fee_usd,
      claimPc: MOON.claim.pc,
      landWithin: MOON.claim.land_within_quarters,
      missionUsd: missionCostUsd(state),
      missionLead: MOON.mission.lead_quarters,
      landingChance: landingChance(state),
      pilotUsd: pilotCostUsd(state),
      pilotMinKwe: MOON.pilot.min_kwe,
      productionUsd: MOON.production.capex_usd,
      reactorFromLabel: label(reactorQ) ?? null,
      deliveryUsdKg: row.lunar_delivery_usd_kg,
      surfaceUsdKg: row.lunar_offtake_surface_usd_kg,
      valueUsdT: row.lunar_value_usd_t,
    },
    lunarUnitUsd: lunarUnitUsd(state),
  }
}
export type MoonView = NonNullable<ReturnType<typeof moonView>>

/** A4-07: one site's prospect reports, for the modal. */
export function prospectReportView(state: GameState, site: LunarSiteId) {
  const c = claimOf(state, site) ?? state.act4Moon?.claims.find((x) => x.site === site)
  if (!c) return null
  return {
    site,
    category: resourceCategory(c),
    reports: c.reports.map((r) => ({ ...r, label: label(r.quarter)! })),
    share: resourceShare(c),
    inferredT: MOON.inferred_t_per_site,
    confidence: MOON.category_confidence,
  }
}
