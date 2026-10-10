// Act IV's lunar operations (M30.4; doc 33 §9.3-9.7, §11.2-11.3). Power on a held site (a solar array sized to the
// ridge, output × its illumination; a leased reactor not before 2034, later if the Reactor Delay wildcard fires), the
// pilot plant (needs an indicated resource and 100 kWe; 7 quarters; output = 1.2 t of water a year per kWe × 0.3 × the
// grade × ice access × availability; measured after two quarters running; dust wears it down unless maintained),
// offtake contracts that buy its water, the production decision (needs measured and a 1 MWe contract; capex drawn over
// the build; first output 20-32 quarters later, always after 2035), the Flag on the Pole (extraction frozen outside the
// Station partnership). The books: lunar sales and costs in EBITDA without a multiple; the lunar unit valued on your
// estimates (never the truth), with plants under construction at capex spent and the offtake backlog.
import { CONTENT, act4Row } from '../../content/index.ts'
import { MOON, lunarSite, type LunarSiteId } from '../../content/moonContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book, bookSplit } from '../ledger.ts'
import { pick, randomInt, substream, uniform } from '../rng.ts'
import { act4SeedOf, inActIV, logEntry, type GameState, type LunarClaim } from '../state.ts'
import { pilotGradeFactor } from './lunarGeology.ts'
import { scenarioOf } from './market.ts'
import {
  addReport,
  claimOf,
  estimateT,
  missionCostUsd,
  moonOf,
  resourceCategory,
  resourceShare,
} from './moon.ts'
import { MONEY } from '../../content/moneyContent.ts'
import { wildcardFiredIv } from './wildcardsIv.ts'
import { staffNumber } from './hires.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)
const row = (state: GameState) => act4Row(state.quarter, scenarioOf(state))
const P = MOON.power
const PILOT = MOON.pilot

function planBlocker(state: GameState): Message | undefined {
  if (!inActIV(state)) return { key: 'error.moon_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
}
const bwShort = (state: GameState, needed: number): Message | undefined =>
  state.bandwidth < needed ? { key: 'error.no_bandwidth', params: { needed, have: state.bandwidth } } : undefined
const cashShort = (state: GameState, costUsd: number): Message | undefined =>
  state.cash < costUsd ? { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } } : undefined

/** A site you hold (landed), or the reason you can't build there. */
function heldClaim(state: GameState, site: LunarSiteId): LunarClaim | Message {
  const c = claimOf(state, site)
  if (!c || c.status !== 'held') return { key: 'error.moon_not_held' }
  return c
}

// ---------- power (doc 33 §9.3) ----------

/** A solar array's cost now: its delivered mass at the market's Earth-to-surface price, plus the hardware. */
export const solarCostUsd = (state: GameState, kwe: number): number =>
  kwe * (P.solar.kg_per_kwe * row(state).lunar_delivery_usd_kg + P.solar.hardware_usd_per_kwe)

export function buildSolarBlocker(state: GameState, site: LunarSiteId, kwe: number): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  const c = heldClaim(state, site)
  if ('key' in c) return c
  if (c.solar) return { key: 'error.moon_solar_exists' }
  if (!P.solar.sizes_kwe.includes(kwe) || kwe > lunarSite(site).max_kwe) return { key: 'error.moon_bad_size' }
  return bwShort(state, P.solar.bandwidth) ?? cashShort(state, solarCostUsd(state, kwe))
}

export function buildSolar(state: GameState, site: LunarSiteId, kwe: number): void {
  const costUsd = solarCostUsd(state, kwe)
  state.bandwidth -= P.solar.bandwidth
  book(state, 'lunar_capex', -costUsd)
  const c = claimOf(state, site)!
  c.solar = { kwe, readyQuarter: state.quarter + P.solar.build_quarters }
  logEntry(state, 'log.moon.solar', { lunarSite: site, kwe, costUsd })
}

/** The first quarter a reactor can be leased (2034Q1; 2036Q1 once the Reactor Delay wildcard has fired). */
export function reactorFrom(state: GameState): number {
  if (wildcardFiredIv(state, 'reactor_delay')) {
    const w = CONTENT.wildcardsIv.wildcards.find((x) => x.id === 'reactor_delay')!
    return afterAct(String(w.effect.reactor_from))
  }
  return afterAct(P.reactor.from)
}
/** A quarter's index, or past the act's last quarter when the label lies beyond it (2036Q1: never in the act). */
const afterAct = (label: string): number => {
  const q = Q(label)
  return q >= 0 ? q : Number.MAX_SAFE_INTEGER
}

export function leaseReactorBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  const c = heldClaim(state, site)
  if ('key' in c) return c
  if (c.reactor) return { key: 'error.moon_reactor_exists' }
  const from = reactorFrom(state)
  if (state.quarter < from)
    return { key: 'error.moon_reactor_later', params: { quarter: CONTENT.quarters[from] ?? t2036() } }
  const aligned = state.act4Moon!.alignedBloc
  if (aligned && aligned !== P.reactor.bloc) return { key: 'error.moon_other_bloc' }
  return bwShort(state, P.reactor.bandwidth) ?? cashShort(state, P.reactor.setup_usd)
}

/** The Reactor Delay's quarter label (from its wildcard entry). */
const t2036 = () => String(CONTENT.wildcardsIv.wildcards.find((x) => x.id === 'reactor_delay')!.effect.reactor_from)

/** Leases a bloc programme's fission unit: its strings (alignment with that bloc), set-up now, a lease each quarter. */
export function leaseReactor(state: GameState, site: LunarSiteId): void {
  state.bandwidth -= P.reactor.bandwidth
  book(state, 'lunar_capex', -P.reactor.setup_usd)
  moonOf(state).alignedBloc = P.reactor.bloc
  claimOf(state, site)!.reactor = { kwe: P.reactor.kwe, readyQuarter: state.quarter + 1 }
  logEntry(state, 'log.moon.reactor', { lunarSite: site, costUsd: P.reactor.setup_usd })
}

/** Power arranged on a site (nameplate kWe, built or building): what the pilot decision checks. */
export const arrangedKwe = (c: LunarClaim): number => (c.solar?.kwe ?? 0) + (c.reactor?.kwe ?? 0)

/** Power delivered on a site this quarter (kWe): ready solar × the site's illumination, plus a ready reactor. */
export function effectiveKwe(c: LunarClaim, quarter: number): number {
  const solar = c.solar && c.solar.readyQuarter <= quarter ? c.solar.kwe * lunarSite(c.site).illumination : 0
  const reactor = c.reactor && c.reactor.readyQuarter <= quarter ? c.reactor.kwe : 0
  return solar + reactor
}

export function megawattBlocker(state: GameState): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  const m = P.megawatt_contract
  if (state.act4Moon?.megawattQuarter !== null && state.act4Moon?.megawattQuarter !== undefined)
    return { key: 'error.moon_megawatt_done' }
  if (state.quarter < Q(m.from)) return { key: 'error.moon_reactor_later', params: { quarter: m.from } }
  return bwShort(state, m.bandwidth) ?? cashShort(state, m.fee_usd)
}

/** Contracts a megawatt of lunar power for delivery after 2035 (the production decision needs it). */
export function signMegawatt(state: GameState): void {
  const m = P.megawatt_contract
  state.bandwidth -= m.bandwidth
  book(state, 'lunar_opex', -m.fee_usd)
  moonOf(state).megawattQuarter = state.quarter
  logEntry(state, 'log.moon.megawatt', { costUsd: m.fee_usd })
}

// ---------- the pilot plant (doc 33 §9.4) ----------

/** The pilot's capex now: a base plus its delivered mass. */
export const pilotCostUsd = (state: GameState): number =>
  PILOT.base_usd + PILOT.mass_t * 1000 * row(state).lunar_delivery_usd_kg

export function pilotBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  const c = heldClaim(state, site)
  if ('key' in c) return c
  if (c.pilot) return { key: 'error.moon_pilot_exists' }
  if (resourceCategory(c) === 'inferred') return { key: 'error.moon_needs_indicated' }
  if (arrangedKwe(c) < PILOT.min_kwe) return { key: 'error.moon_needs_power', params: { kwe: PILOT.min_kwe } }
  return bwShort(state, PILOT.bandwidth) ?? cashShort(state, pilotCostUsd(state))
}

/** A pilot's build time now (the Lunar Programme Director takes a quarter off). */
export const pilotQuarters = (state: GameState): number =>
  PILOT.build_quarters - staffNumber(state, 'pilot_quarters_cut', 0)

export function decidePilot(state: GameState, site: LunarSiteId): void {
  const capexUsd = pilotCostUsd(state)
  state.bandwidth -= PILOT.bandwidth
  book(state, 'lunar_capex', -capexUsd)
  claimOf(state, site)!.pilot = {
    decidedQuarter: state.quarter,
    readyQuarter: state.quarter + pilotQuarters(state),
    capexUsd,
    availability: 1,
    maintained: false,
    runQuarters: 0,
    processedT: 0,
  }
  logEntry(state, 'log.moon.pilot', {
    lunarSite: site,
    costUsd: capexUsd,
    quarter: CONTENT.quarters[state.quarter + pilotQuarters(state)] ?? '—',
  })
}

export function maintainBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  if (!claimOf(state, site)?.pilot) return { key: 'error.moon_no_pilot' }
}

/** A maintenance crew (or robotic servicing) keeps the dust at bay, for a fee each quarter. */
export function setMaintenance(state: GameState, site: LunarSiteId, on: boolean): void {
  claimOf(state, site)!.pilot!.maintained = on
}

/** Whether extraction is frozen for you this quarter (the Flag on the Pole, outside the Station partnership). */
export const frozen = (state: GameState, quarter = state.quarter): boolean =>
  (state.act4Moon?.freezeUntil ?? -1) >= quarter && state.act4Moon?.alignedBloc !== 'station'

/** A pilot's water processed this quarter (t). Sim-internal (it reads the grade); the screens show what it processed. */
function pilotOutputT(state: GameState, c: LunarClaim): number {
  const p = c.pilot!
  if (p.readyQuarter > state.quarter || frozen(state)) return 0
  const yearly =
    PILOT.t_water_per_kwe_yr *
    effectiveKwe(c, state.quarter) *
    PILOT.efficiency *
    pilotGradeFactor(state.lunarGrade ?? 'patchy') *
    lunarSite(c.site).ice_access *
    p.availability *
    resourceShare(c)
  return yearly / 4
}

// ---------- the production decision (doc 33 §9.5) ----------

export function productionBlocker(state: GameState, site: LunarSiteId): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  const c = heldClaim(state, site)
  if ('key' in c) return c
  if (c.production) return { key: 'error.moon_production_exists' }
  if (resourceCategory(c) !== 'measured') return { key: 'error.moon_needs_measured' }
  if (state.act4Moon!.megawattQuarter === null) return { key: 'error.moon_needs_megawatt' }
  return bwShort(state, MOON.production.bandwidth)
}

/** Decides a production plant: capex drawn over its build; first output 20-32 quarters on (never inside the act). */
export function decideProduction(state: GameState, site: LunarSiteId): void {
  const [lo, hi] = MOON.production.first_output_quarters
  const lead = randomInt(substream(act4SeedOf(state), `act4_lunar_production:${site}`), lo, hi)
  state.bandwidth -= MOON.production.bandwidth
  claimOf(state, site)!.production = {
    decidedQuarter: state.quarter,
    capexUsd: MOON.production.capex_usd,
    drawnUsd: 0,
    firstOutputQuarter: state.quarter + lead,
  }
  logEntry(state, 'log.moon.production', { lunarSite: site, costUsd: MOON.production.capex_usd })
}

// ---------- offtake (doc 33 §9.6, §11.2) ----------

export function signOfftakeBlocker(state: GameState, offer: number): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  if (!state.act4Moon?.offers[offer]) return { key: 'error.moon_no_offer' }
  return bwShort(state, MOON.offtake.bandwidth)
}

/** Signs an offtake contract: its price locked, a share of a year prepaid now (credited against deliveries). */
export function signOfftake(state: GameState, offer: number): void {
  const moon = moonOf(state)
  const o = moon.offers[offer]
  const prepaidUsd = MOON.offtake.prepay_share * o.volumeTYr * 1000 * o.priceUsdKg
  state.bandwidth -= MOON.offtake.bandwidth
  book(state, 'other_income', prepaidUsd, { biz: 'moon' })
  moon.offtakes.push({
    id: `lo${moon.nextId++}`,
    buyer: o.buyer,
    volumeTYr: o.volumeTYr,
    priceUsdKg: o.priceUsdKg,
    startQuarter: state.quarter,
    endQuarter: state.quarter + o.termQuarters,
    prepaidLeftUsd: prepaidUsd,
    deliveredT: 0,
  })
  moon.offers.splice(offer, 1)
  logEntry(state, 'log.moon.offtake', { buyer: o.buyer, volume: o.volumeTYr, prepaidUsd })
}

// ---------- agency task orders (M31.3; doc 33 §11.1-11.2) ----------

export function taskOrderBlocker(state: GameState): Message | undefined {
  const blocked = planBlocker(state)
  if (blocked) return blocked
  if (!state.act4Moon?.taskOrderUsd) return { key: 'error.moon_no_task_order' }
  const bloc = MONEY.capital.task_orders.bloc
  if (state.act4Moon.alignedBloc && state.act4Moon.alignedBloc !== bloc) return { key: 'error.moon_other_bloc' }
}

/** Accepts the task order (0 Bandwidth): it pays its part of your next mission; the agency's bloc's strings come with it. */
export function acceptTaskOrder(state: GameState): void {
  const moon = moonOf(state)
  const usd = moon.taskOrderUsd!
  moon.missionCreditUsd = (moon.missionCreditUsd ?? 0) + usd
  moon.alignedBloc = MONEY.capital.task_orders.bloc
  moon.taskOrderUsd = null
  logEntry(state, 'log.moon.task_order', { amountUsd: usd })
}

/** A contract's remaining value at its price (for the backlog). */
export const offtakeLeftUsd = (state: GameState, o: { volumeTYr: number; priceUsdKg: number; endQuarter: number }) =>
  (Math.max(0, o.endQuarter - state.quarter) * o.volumeTYr * 1000 * o.priceUsdKg) / 4

// ---------- the start of a quarter ----------

/** Offtake offers once you hold a landed site; the Flag on the Pole's freeze when it fires. */
export function startQuarterMoonOps(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  moon.offers = []
  if (moon.claims.some((c) => c.status === 'held')) {
    const r = substream(act4SeedOf(state), `act4_lunar_offer:${state.quarter}`)
    const o = MOON.offtake
    moon.offers.push({
      buyer: pick(r, o.buyers),
      volumeTYr: randomInt(r, o.volume_t_yr[0], o.volume_t_yr[1]),
      priceUsdKg: row(state).lunar_offtake_surface_usd_kg * uniform(r, o.price_spread[0], o.price_spread[1]),
      termQuarters: o.term_quarters,
    })
  }
  // (M31.3) an agency task order part-funds prospecting: lunar funding is grants and orders, never debt
  const T = MONEY.capital.task_orders
  moon.taskOrderUsd = null
  if (moon.claims.some((c) => c.status === 'claimed' || c.status === 'held') && moon.alignedBloc !== 'station') {
    const r = substream(act4SeedOf(state), `act4_task_order:${state.quarter}`)
    if (uniform(r, 0, 1) < T.chance_q)
      moon.taskOrderUsd = Math.min(uniform(r, T.usd[0], T.usd[1]), T.max_share_of_mission * missionCostUsd(state))
  }
  const flag = state.act4Wildcards?.find((w) => w.id === 'flag_on_the_pole' && w.quarter === state.quarter)
  if (flag && wildcardFiredIv(state, 'flag_on_the_pole')) {
    const w = CONTENT.wildcardsIv.wildcards.find((x) => x.id === 'flag_on_the_pole')!
    const [lo, hi] = w.effect.freeze_quarters as [number, number]
    moon.freezeUntil = state.quarter + randomInt(substream(act4SeedOf(state), 'act4_flag_freeze'), lo, hi) - 1
    if (moon.alignedBloc !== 'station')
      logEntry(state, 'log.moon.frozen', { quarter: CONTENT.quarters[moon.freezeUntil] ?? '—' })
  }
}

/** Plans this quarter's dust faults on running pilots (doc 33 §9.4, §14.2). */
export function planLunarDust(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  for (const c of moon.claims.filter((x) => x.status === 'held' && x.pilot && x.pilot.readyQuarter <= state.quarter)) {
    const r = substream(act4SeedOf(state), `act4_lunar_dust:${c.site}:${state.quarter}`)
    if (random01(r) < MOON.alerts.dust_fault_chance_q)
      moon.planned.push({ week: randomInt(r, 1, 11), kind: 'lunar_dust', site: c.site })
  }
  moon.planned.sort((a, b) => a.week - b.week)
}
const random01 = (r: ReturnType<typeof substream>) => uniform(r, 0, 1)

// ---------- the end of a quarter ----------

/**
 * At the end of a quarter: running pilots process water (and wear with dust unless maintained); the water goes to your
 * offtake contracts; maintenance and reactor leases are paid; production capex is drawn; a pilot that has run two
 * quarters reports a measured resource.
 */
export function endQuarterMoonOps(state: GameState): void {
  const moon = state.act4Moon
  if (!moon || !inActIV(state)) return
  const st = state.quarterStats
  st.moonRevenueUsd ??= 0
  st.moonCostUsd ??= 0
  let waterT = 0
  for (const c of moon.claims.filter((x) => x.status === 'held')) {
    if (c.reactor && c.reactor.readyQuarter <= state.quarter) {
      book(state, 'lunar_opex', -P.reactor.lease_usd_q)
      st.moonCostUsd += P.reactor.lease_usd_q
    }
    const p = c.pilot
    if (p && p.readyQuarter <= state.quarter) {
      const out = pilotOutputT(state, c)
      p.processedT += out
      waterT += out
      if (out > 0) p.runQuarters++
      if (p.maintained) {
        book(state, 'lunar_opex', -PILOT.maintenance_usd_q)
        st.moonCostUsd += PILOT.maintenance_usd_q
      } else p.availability *= 1 - PILOT.dust_loss_share_q
      if (p.runQuarters === PILOT.measured_after_quarters && !c.reports.some((r) => r.step === 'pilot'))
        addReport(state, c, 'pilot')
    }
    const prod = c.production
    if (prod && prod.drawnUsd < prod.capexUsd) {
      const draw = Math.min(prod.capexUsd / MOON.production.draw_quarters, prod.capexUsd - prod.drawnUsd)
      book(state, 'lunar_capex', -draw)
      prod.drawnUsd += draw
    }
  }
  // Deliveries: the quarter's water, to your live contracts in the order you signed them.
  for (const o of moon.offtakes.filter((x) => x.startQuarter <= state.quarter && x.endQuarter > state.quarter)) {
    const t = Math.min(waterT, o.volumeTYr / 4)
    if (t <= 0) continue
    waterT -= t
    o.deliveredT += t
    const usd = t * 1000 * o.priceUsdKg
    const credited = Math.min(o.prepaidLeftUsd, usd)
    o.prepaidLeftUsd -= credited
    // (a prepayment was income when received: the sales it covers come off it)
    bookSplit(state, usd - credited, [
      ['lunar_revenue', usd],
      ['other_income', -credited, { biz: 'moon' }],
    ])
    st.moonRevenueUsd += usd
  }
}

// ---------- the lunar unit (doc 33 §11.3) ----------

/** One site's value: your estimate × the market's value per tonne × category confidence × stage, plus presence. */
export function siteValueUsd(state: GameState, c: LunarClaim): number {
  if (c.status !== 'held') return 0
  const conf = MOON.category_confidence[resourceCategory(c)]
  const stage = c.production
    ? MOON.stage_factor.production
    : c.pilot && c.pilot.readyQuarter <= state.quarter
      ? MOON.stage_factor.pilot
      : MOON.stage_factor.claim
  return estimateT(c) * resourceShare(c) * row(state).lunar_value_usd_t * conf * stage + MOON.presence_value_usd
}

/** The lunar unit: the held sites, plants under construction at capex spent, and the weighted offtake backlog. */
export function lunarUnitUsd(state: GameState): number {
  const moon = state.act4Moon
  if (!moon) return 0
  let usd = 0
  for (const c of moon.claims) {
    usd += siteValueUsd(state, c)
    if (c.status !== 'held') continue
    if (c.pilot && c.pilot.readyQuarter > state.quarter) usd += c.pilot.capexUsd
    if (c.production) usd += c.production.drawnUsd
  }
  for (const o of moon.offtakes) usd += offtakeLeftUsd(state, o) * MOON.offtake.backlog_weight
  return usd
}

/** Lunar kWe delivered now (the act's third megawatt column). */
export const lunarKwe = (state: GameState): number =>
  (state.act4Moon?.claims ?? [])
    .filter((c) => c.status === 'held')
    .reduce((kwe, c) => kwe + effectiveKwe(c, state.quarter), 0)
