// Energy ventures (M36, doc 38 §5, E-D9..E-D12): firm-power bets with fat tails, in Acts III-IV. One mechanic for
// every type: the card shows the developer's pitch; diligence (1 Bandwidth, a fee) shows the reference-class estimate;
// you join as equity (a stake, paid in now), offtaker (a PPA for some output, optionally prepaid for a cheaper price)
// or both. The realised cost is drawn when you join (hidden) and arrives as three cash calls at 33/66/100% of the
// build: pay, dilute or walk (Act IV: a partner may cover part; nuclear: a government may share the cost, else the
// PPA reopens at cost). No debt before operation. At first power the venture delivers firm MW to your campus with no
// grid wait, and your stake revalues at the ground AI multiple. Fusion has four science gates instead, and never
// delivers power before 2038. Every roll uses its own substream ("venture:…"), so a game without a venture plays as
// before.
import { CONTENT, actFirstQuarter, actLastQuarter } from '../../content/index.ts'
import { ENERGY, VENTURES, VENTURE_TYPES, energyYear, type VentureType } from '../../content/energyContent.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream, uniform, type RngHolder } from '../rng.ts'
import {
  act4SeedOf,
  inActIII,
  inActIV,
  logEntry,
  logQuarterLabel,
  roundCents,
  type GameState,
  type Site,
  type Venture,
  type VentureCall,
} from '../state.ts'
import { addGrievance } from './heat.ts'
import { scenarioOf } from './market.ts'
import { addPc } from './pcState.ts'
import { drawOverrun, lognormal } from './overrun.ts'
import { powerPriceUsdKwh, regionOf, usedKw } from './sites.ts'

const V = VENTURES
const T = V.types
const HOURS_Q = 24 * 91
const label = (q: number) => CONTENT.quarters[q]
const qIndex = (id: string) => CONTENT.quarters.indexOf(id)
const perQuarter = (pYear: number) => 1 - (1 - pYear) ** 0.25
const isNuclear = (type: VentureType): type is 'smr' | 'adv_fission' => type === 'smr' || type === 'adv_fission'
/** Either EGS block (M36.11: the second block shares the first's rules). */
export const isEgs = (type: VentureType): type is 'egs' | 'egs2' => type === 'egs' || type === 'egs2'

/** True in the acts ventures are offered in (III and IV). */
export const venturesOpen = (state: GameState) => inActIII(state) || inActIV(state)

/** Ventures still alive (not cancelled or folded). */
export const liveVentures = (state: GameState) =>
  (state.ventures ?? []).filter((v) => v.stage !== 'cancelled' && v.stage !== 'folded')

/** The regions a type delivers to (doc 38's siting constraints mapped to the game's regions). */
export function ventureRegions(type: VentureType): string[] | 'any' {
  const r = (T[type] as { regions?: string[] | 'nuclear' | 'any' }).regions ?? 'any'
  if (r === 'nuclear') return CONTENT.act3Nuclear.regions
  return r
}

/** The developer's pitch for a type, $/kW (fusion: undisclosed; its round is sized at the hidden capex). */
export function pitchUsdKw(state: GameState, type: VentureType): number {
  if (type === 'fusion') return T.fusion.capex_usd_kw
  if (type === 'control') {
    const row = energyYear(Number(label(state.quarter).slice(0, 4)))
    return (row.utility_solar_usd_kw ?? 0) + (row.bess_usd_kwh_us ?? 0) * T.control.bess_hours
  }
  return T[type].pitch_usd_kw
}

/** The pitched PPA price, $/MWh. */
export function pitchPpaUsdMwh(type: VentureType): number | null {
  if (type === 'fusion') return T.fusion.pitch_usd_mwh
  if (type === 'pumped') return null
  return T[type].ppa_usd_mwh
}

/**
 * The developer's pitched first power for a venture joined in quarter `joined` (relative to joining: doc 38's dates
 * assume a 2027 start): SMR +5 years, advanced +6, fusion +3 (its "$40/MWh by"), EGS 12 quarters, pumped storage 4
 * years, the control its build.
 */
export function pitchCodQuarter(type: VentureType, joined: number): number {
  const t = T[type]
  if ('pitch_cod_years' in t) return joined + t.pitch_cod_years * 4
  if (isEgs(type)) return joined + T[type].pitch_cod_quarters
  if (type === 'pumped') return joined + T.pumped.pitch_years * 4
  if (type === 'fusion') return joined + T.fusion.pitch_years * 4
  return joined + T.control.build_q
}

/** The reference-class estimate diligence reveals, $/kW: pitch × the class's median overrun (SMR floor ×3 not shown). */
export function referenceUsdKw(state: GameState, type: VentureType): number {
  if (type === 'fusion') return T.fusion.capex_usd_kw
  if (type === 'pumped') return T.pumped.real_usd_kw * ENERGY.overrun_classes.pumped_hydro.median
  const cls = T[type].class
  return pitchUsdKw(state, type) * ENERGY.overrun_classes[cls].median
}

/** Why a type can't be joined now (or diligence done), or undefined. */
function typeBlocker(state: GameState, type: VentureType): Message | undefined {
  if (!venturesOpen(state)) return { key: 'error.venture_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (!VENTURE_TYPES.includes(type)) return { key: 'error.bad_choice' }
  if (label(state.quarter) < T[type].from) return { key: 'error.venture_not_yet' }
  if (isNuclear(type)) {
    // One regulator slot per 8 quarters, for any nuclear venture (doc 38 §5.3).
    const last = (state.ventures ?? []).filter((v) => isNuclear(v.type)).map((v) => v.joinedQuarter)
    if (last.some((q) => state.quarter - q < T[type].regulator_slot_q)) return { key: 'error.venture_regulator_slot' }
  }
}

export function diligenceBlocker(state: GameState, type: VentureType): Message | undefined {
  const blocked = typeBlocker(state, type)
  if (blocked) return blocked
  if (state.ventureDiligence?.includes(type)) return { key: 'error.venture_diligence_done' }
  const d = V.diligence
  if (state.bandwidth < d.bandwidth) return { key: 'error.no_bandwidth', params: { needed: d.bandwidth, have: state.bandwidth } }
  if (state.cash < d.fee_usd) return { key: 'error.no_cash', params: { costUsd: d.fee_usd, cashUsd: state.cash } }
}

/** Diligence (doc 38 §5.1 point 2): 1 Bandwidth and a fee; the type's reference-class estimate and tail show. */
export function doDiligence(state: GameState, type: VentureType): void {
  state.bandwidth -= V.diligence.bandwidth
  state.cash = roundCents(state.cash - V.diligence.fee_usd)
  ;(state.ventureDiligence ??= []).push(type)
  logEntry(state, 'log.venture.diligence', { ventureType: type, costUsd: V.diligence.fee_usd })
}

export interface VentureJoin {
  type: VentureType
  /** An equity share from equity_shares, or 0. */
  stake: number
  /** A share of the output from offtake_shares, or 0. */
  offtake: number
  /** An index into prepay (0 = none). */
  prepay: number
  /** The campus the offtake delivers to (needed with an offtake; the region must fit). */
  siteId?: string
}

/** The buy-in for a stake: its share of the budget (pumped storage: of the part the government doesn't fund). */
export function buyInUsd(state: GameState, j: Pick<VentureJoin, 'type' | 'stake'>): number {
  const budget = budgetUsd(state, j.type)
  const govt = j.type === 'pumped' ? (T.pumped.govt_share[0] + T.pumped.govt_share[1]) / 2 : 0
  return roundCents(j.stake * budget * (1 - govt))
}

export const budgetUsd = (state: GameState, type: VentureType) => pitchUsdKw(state, type) * T[type].mw * 1000

/** The PPA's notional value over its term, $ (prepayments are a share of it). */
function notionalPpaUsd(type: VentureType, mw: number, price: number): number {
  const cf = type === 'fusion' ? 0.9 : type === 'control' ? capacityFactorControl() : 'cf' in T[type] ? (T[type] as { cf: number }).cf : 0
  return mw * cf * 8760 * price * V.ppa_years
}

const capacityFactorControl = () => ENERGY.site_assets.btm_solar.cf_by_region[T.control.cf_region] ?? 0.24

/**
 * The MW an offtake share subscribes: the share of the unit's MW (fusion: of its reservation), capped at 100 MW per
 * venture (M36.11, design thread answer 1).
 */
export function offtakeMwOf(type: VentureType, share: number): number {
  const unit = type === 'fusion' ? T.fusion.reservation_mw : T[type].mw
  return Math.min(V.offtake_cap_mw, unit * share)
}

/** The prepayment for an offtake, $: the share of the PPA's notional value (fusion: its capacity reservation). */
export function prepayUsd(j: Pick<VentureJoin, 'type' | 'offtake' | 'prepay'>): number {
  if (j.offtake <= 0) return 0
  if (j.type === 'fusion')
    return roundCents(T.fusion.reservation_share * notionalPpaUsd('fusion', offtakeMwOf('fusion', j.offtake), T.fusion.pitch_usd_mwh))
  const p = V.prepay[j.prepay]
  const price = pitchPpaUsdMwh(j.type) ?? 0
  return roundCents(p.share * notionalPpaUsd(j.type, offtakeMwOf(j.type, j.offtake), price))
}

export function joinBlocker(state: GameState, j: VentureJoin): Message | undefined {
  const blocked = typeBlocker(state, j.type)
  if (blocked) return blocked
  // One developer per type: you join it once while it lives (mine).
  if (liveVentures(state).some((v) => v.type === j.type)) return { key: 'error.venture_joined' }
  // M36.10: the developer's project runs on its own calendar; a cancelled, folded or finished one takes no new money.
  const dev = developerVenture(state, j.type)
  if (dev.stage === 'cancelled' || dev.stage === 'folded') return { key: 'error.venture_gone' }
  if (dev.stage === 'operating') return { key: 'error.venture_built' }
  if (j.stake !== 0 && !V.equity_shares.includes(j.stake)) return { key: 'error.bad_choice' }
  if (j.offtake !== 0 && !V.offtake_shares.includes(j.offtake)) return { key: 'error.bad_choice' }
  if (!(j.prepay >= 0 && j.prepay < V.prepay.length)) return { key: 'error.bad_choice' }
  if (j.stake <= 0 && j.offtake <= 0) return { key: 'error.venture_no_role' }
  // Pumped storage sells capacity to the grid: equity only (mine).
  if (j.type === 'pumped' && j.offtake > 0) return { key: 'error.venture_equity_only' }
  if (j.offtake > 0 && j.type !== 'fusion') {
    const site = state.sites.find((s) => s.id === j.siteId)
    if (!site) return { key: 'error.venture_needs_campus' }
    const regions = ventureRegions(j.type)
    if (regions !== 'any' && !regions.includes(regionOf(site) ?? '')) return { key: 'error.venture_region' }
  }
  const cost = buyInUsd(state, j) + prepayUsd(j)
  if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
}

/** M36.10 (design thread, answer 4): a developer's project starts on its doc 38 date, whether or not you join. */
export const developerStart = (type: VentureType) => qIndex(T[type].from)

/**
 * M36.10: the developer's project of a type as it stands at the start of quarter `upTo` (default: now), with nobody's
 * stake or offtake: its hidden draws (one set per game and type) and its history replayed quietly from its start, so a
 * late joiner buys into a project already under way, or finds it cancelled, folded or built. Pure: no logs or cash.
 */
export function developerVenture(state: GameState, type: VentureType, upTo = state.quarter): Venture {
  const start = developerStart(type)
  const t = T[type]
  const v: Venture = {
    id: `developer-${type}`,
    type,
    joinedQuarter: start,
    mw: t.mw,
    pitchUsdKw: pitchUsdKw(state, type),
    budgetUsd: roundCents(budgetUsd(state, type)),
    diligence: false,
    stake: 0,
    paidUsd: 0,
    offtakeMw: 0,
    ppaUsdMwh: pitchPpaUsdMwh(type) ?? 0,
    prepaidUsd: 0,
    siteId: null,
    m: 1,
    stage: 'construction',
    licenceEnd: start,
    buildStart: start,
    buildEnd: start,
    codQuarter: start,
    callsDone: 0,
    call: null,
    othersSubscribed: 0,
    partnerCut: 0,
    pitchCodQuarter: pitchCodQuarter(type, start),
  }
  // (Act IV's own seed when there is one, so each Act IV run draws afresh: act4SeedOf)
  drawSchedule(v, start, substream(act4SeedOf(state), `venture:${type}`))
  for (let q = start; q < upTo && !isOver(v) && v.stage !== 'operating'; q++)
    stepVenture(state, v, q, true)
  return v
}

/** Joins a venture: pays the buy-in and any prepayment, and takes the developer's project over as it stands now. */
export function joinVenture(state: GameState, j: VentureJoin): Venture {
  const dev = developerVenture(state, j.type)
  const buyIn = buyInUsd(state, j)
  const prepaid = prepayUsd(j)
  const cut = j.type === 'fusion' ? 0 : V.prepay[j.prepay].price_cut
  const v: Venture = {
    ...dev,
    id: `venture-${state.nextId++}`,
    joinedQuarter: state.quarter,
    diligence: state.ventureDiligence?.includes(j.type) ?? false,
    stake: j.stake,
    paidUsd: buyIn,
    offtakeMw: offtakeMwOf(j.type, j.offtake),
    ppaUsdMwh: roundCents((pitchPpaUsdMwh(j.type) ?? 0) * (1 - cut)),
    prepaidUsd: prepaid,
    siteId: j.offtake > 0 && j.type !== 'fusion' ? (j.siteId ?? null) : null,
    buyInUsd: buyIn,
    stakeAtJoin: j.stake,
    callsPaidUsd: 0,
    // (only milestones and slips after you join count toward your mark)
    milestones: 0,
    slips: 0,
  }
  state.cash = roundCents(state.cash - buyIn - prepaid)
  ;(state.ventures ??= []).push(v)
  logEntry(state, 'log.venture.joined', { ventureType: j.type, costUsd: buyIn + prepaid })
  return v
}

/** The hidden draws (doc 38 §5.1-5.7): the cost multiple, the schedule from `start` and its slips, the type's risks. */
function drawSchedule(v: Venture, start: number, r: RngHolder): void {
  const q = start
  if (v.type === 'fusion') {
    const f = T.fusion
    v.stage = 'research'
    v.gate = 0
    v.gateDue = q + randomInt(r, ...f.gates[0].q)
    v.m = 1
    return
  }
  const t = T[v.type]
  const cls = t.class
  if (v.type === 'pumped') v.m = (T.pumped.real_usd_kw / T.pumped.pitch_usd_kw) * drawOverrun(r, cls)
  else v.m = drawOverrun(r, cls)
  if (isNuclear(v.type)) {
    const n = T[v.type]
    v.m = Math.max(n.foak_floor, v.m)
    v.othersSubscribed = Math.round(uniform(r, ...n.cancel.others_subscribed) * 100) / 100
  }
  const slip = t.slip.sigma > 0 ? lognormal(r, t.slip.median, t.slip.sigma) : t.slip.median
  v.licenceEnd = q + Math.round(t.licence_q * (t.licence_q > 0 ? slip : 1))
  v.stage = t.licence_q > 0 ? 'licensing' : 'construction'
  v.buildStart = v.licenceEnd
  let build = Math.round(t.build_q * slip)
  if (v.type === 'control') build += T.control.slip_extra_q
  if (v.type === 'adv_fission' && chance(r, T.adv_fission.haleu!.chance)) build += randomInt(r, ...T.adv_fission.haleu!.slip_q)
  if (v.type === 'pumped' && chance(r, T.pumped.tbm.chance)) {
    build += T.pumped.tbm.slip_q
    v.m += T.pumped.tbm.budget_share
  }
  if (isEgs(v.type)) v.weakField = chance(r, T[v.type].weak_field.chance)
  v.buildEnd = v.buildStart + Math.max(1, build)
  // The control waits for its grid connection after building (16-24 quarters, from its 2027 start: doc 38 §5.8).
  v.codQuarter = v.type === 'control' ? v.buildEnd + randomInt(r, ...T.control.grid_wait_q) : v.buildEnd
}

// ---------- Cash calls ----------

/** The overrun's share of one tranche, for your stake now, $. */
function trancheUsd(v: Venture): number {
  return roundCents((v.stake * Math.max(0, v.m - 1) * v.budgetUsd) / 3)
}

export function callBlocker(state: GameState, ventureId: string, choice: string): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const v = state.ventures?.find((x) => x.id === ventureId)
  if (!v?.call) return { key: 'error.bad_choice' }
  const c = v.call
  if (choice === 'pay' || choice === 'partner' || choice === 'cost_share') {
    if (choice === 'partner' && c.partnerShare === null) return { key: 'error.bad_choice' }
    if (choice === 'cost_share' && c.costShare === null) return { key: 'error.bad_choice' }
    const due = callDueUsd(c, choice)
    if (state.cash < due) return { key: 'error.no_cash', params: { costUsd: due, cashUsd: state.cash } }
    return
  }
  if (choice !== 'dilute' && choice !== 'walk') return { key: 'error.bad_choice' }
}

/** What you pay for a call with this answer. */
export function callDueUsd(c: VentureCall, choice: string): number {
  if (choice === 'partner') return roundCents(c.dueUsd * (1 - (c.partnerShare ?? 0)))
  if (choice === 'cost_share') return roundCents(c.dueUsd * (1 - (c.costShare ?? 0)))
  return choice === 'pay' ? c.dueUsd : 0
}

/** Answers a cash call (doc 38 §5.1 point 4): pay, dilute (the stake falls pro rata) or walk (written off). */
export function answerCall(state: GameState, ventureId: string, choice: string): void {
  const v = state.ventures!.find((x) => x.id === ventureId)!
  const c = v.call!
  const due = callDueUsd(c, choice)
  if (choice === 'pay' || choice === 'partner' || choice === 'cost_share') {
    state.cash = roundCents(state.cash - due)
    v.paidUsd = roundCents(v.paidUsd + due)
    v.callsPaidUsd = roundCents((v.callsPaidUsd ?? 0) + due)
    if (choice === 'partner') v.partnerCut = Math.min(1, v.partnerCut + (c.partnerShare ?? 0) / 3)
  } else if (choice === 'dilute') {
    // A fusion down round halves a stake that doesn't join it (doc 38 §5.5: the raise is at half the valuation).
    v.stake =
      c.n === 5
        ? v.stake * T.fusion.pivot.valuation_mult
        : v.paidUsd + c.dueUsd > 0
          ? (v.stake * v.paidUsd) / (v.paidUsd + c.dueUsd)
          : 0
  } else {
    v.stake = 0
    v.walked = true
    v.paidUsd = 0
  }
  // Nuclear without a cost-share: the PPA reopens at cost (doc 38 §5.3).
  if (isNuclear(v.type) && c.n <= 3 && choice !== 'cost_share' && !v.reopened && v.offtakeMw > 0) {
    v.reopened = true
    v.ppaUsdMwh = roundCents(Math.max(v.ppaUsdMwh, costPriceUsdMwh(v)))
  }
  if (c.n === 4 && choice !== 'walk') v.fieldFixed = true
  logEntry(state, 'log.venture.call_answered', { ventureType: v.type, ventureChoice: choice, costUsd: due })
  v.call = null
}

/** A nuclear venture's cost price, $/MWh: the realised capex over 60 years at 7%, at 90%, plus running cost. */
export function costPriceUsdMwh(v: Venture): number {
  if (!isNuclear(v.type)) return v.ppaUsdMwh
  const n = T[v.type]
  const r = V.crf.rate
  const crf = (r * (1 + r) ** n.lifetime_years) / ((1 + r) ** n.lifetime_years - 1)
  return (v.pitchUsdKw * v.m * crf * 1000) / (8760 * n.cf) + n.running_usd_mwh
}

/** Unanswered calls take the default at the end of the Plan (dilute). */
export function settleVentureCalls(state: GameState): void {
  for (const v of state.ventures ?? []) if (v.call) answerCall(state, v.id, v.call.n === 4 ? 'pay' : V.default_call)
}

// ---------- The quarter's end ----------

/** True for a venture past its last chance: cancelled, folded, or one you walked away from with no offtake. */
const isOver = (v: Venture) => v.stage === 'cancelled' || v.stage === 'folded'

/**
 * At a quarter's end: each venture moves on (licensing and its cancellation risk; the build, its cash calls and
 * events; the grid wait; first power and delivery; fusion's gates), then operating ones deliver to your campus.
 * Returns the energy revenue (the PPA savings at your campus) to book.
 */
export function endQuarterVentures(state: GameState): { revenueUsd: number } {
  const list = state.ventures
  if (!list?.length) return { revenueUsd: 0 }
  let revenueUsd = 0
  const q = state.quarter
  for (const v of list) {
    if (isOver(v)) continue
    stepVenture(state, v, q, false)
    if (v.stage === 'operating') revenueUsd += deliverySavingsUsd(state, v)
  }
  syncVentureKw(state)
  state.cash = roundCents(state.cash + revenueUsd)
  return { revenueUsd }
}

/**
 * One quarter's end for a venture (quarter `q`): its build, licence, gates and events, on the type's own stream for
 * that quarter. `quiet` (the developer's replay before you join): no log lines, Heat, political capital or cash.
 */
function stepVenture(state: GameState, v: Venture, q: number, quiet: boolean): void {
  const r = substream(act4SeedOf(state), `venture:${v.type}:q${q}`)
  if (v.type === 'fusion') stepFusion(state, v, r, q, quiet)
  else stepBuild(state, v, r, q, quiet)
  // M36.8: each full year past the pitched first power without it is a slip (from the pitched quarter itself).
  if (v.stage !== 'operating' && !isOver(v) && v.pitchCodQuarter !== undefined) {
    const late = q + 1 - v.pitchCodQuarter
    if (late >= 0 && late % 4 === 0) mark(v, 'slip')
  }
}

function stepBuild(state: GameState, v: Venture, r: RngHolder, q: number, quiet: boolean): void {
  const log: typeof logEntry = (...a) => {
    if (!quiet) logEntry(...a)
  }
  if (v.stage === 'licensing') {
    if (isNuclear(v.type)) {
      const c = T[v.type].cancel
      const subscribed = v.othersSubscribed + v.offtakeMw / v.mw
      if (subscribed < c.subscribed_min && chance(r, perQuarter(c.per_year))) {
        end(state, v, 'cancelled', q, quiet)
        return
      }
    }
    if (q + 1 >= v.licenceEnd) {
      v.stage = 'construction'
      mark(v, 'milestone')
      log(state, 'log.venture.licensed', { ventureType: v.type })
    }
    return
  }
  if (v.stage === 'construction') {
    // EGS: induced seismicity pauses the build a quarter (Heat at the campus it serves).
    if (isEgs(v.type) && chance(r, perQuarter(T[v.type].seismic.per_year))) {
      const seismic = T[v.type].seismic
      v.buildEnd += seismic.pause_q
      v.codQuarter += seismic.pause_q
      mark(v, 'slip')
      const site = state.sites.find((s) => s.id === v.siteId)
      if (site && !quiet) addGrievance(state, site.id, seismic.heat)
      log(state, 'log.venture.seismic', { ventureType: v.type })
    }
    const span = Math.max(1, v.buildEnd - v.buildStart)
    const progress = (q + 1 - v.buildStart) / span
    if (!v.call && v.callsDone < 3 && progress >= V.cash_calls[v.callsDone] - 1e-9) {
      v.callsDone++
      // (each third of the build is a milestone, whether or not it brings a call)
      mark(v, 'milestone')
      const due = trancheUsd(v)
      if (due > 0) {
        v.call = {
          n: v.callsDone,
          dueUsd: due,
          partnerShare: q >= actFirstQuarter(4) ? Math.round(uniform(r, ...V.partner_cover) * 100) / 100 : null,
          costShare:
            isNuclear(v.type) && chance(r, T[v.type].cost_share.chance)
              ? Math.round(uniform(r, ...T[v.type].cost_share.share) * 100) / 100
              : null,
        }
        log(state, 'log.venture.call', { ventureType: v.type, n: v.callsDone, costUsd: due })
      }
    }
    if (q + 1 >= v.buildEnd && v.callsDone >= 3) {
      if (v.type === 'control' && v.codQuarter > q + 1) {
        v.stage = 'grid_wait'
        log(state, 'log.venture.grid_wait', { ventureType: v.type, quarter: logQuarterLabel(state, v.codQuarter) })
      } else firstPower(state, v, q, quiet)
    }
    return
  }
  if (v.stage === 'grid_wait' && q + 1 >= v.codQuarter) firstPower(state, v, q, quiet)
}

/** First power (doc 38 §5.1 point 6): delivery starts next quarter; EGS may find a weak well field. */
function firstPower(state: GameState, v: Venture, q: number, quiet: boolean): void {
  v.stage = 'operating'
  v.codQuarter = q + 1
  mark(v, 'milestone')
  if (quiet) return
  logEntry(state, 'log.venture.first_power', { ventureType: v.type })
  if (isEgs(v.type)) {
    const e = T[v.type]
    if (state.politicalCapital !== undefined && inActIII(state)) addPc(state, e.pc_on_cod)
    if (v.weakField && v.stake > 0) {
      const due = roundCents(v.stake * e.weak_field.fix_usd_kw * v.mw * 1000)
      v.call = { n: 4, dueUsd: due, partnerShare: null, costShare: null }
      logEntry(state, 'log.venture.weak_field', { costUsd: due })
    }
  }
}

function end(state: GameState, v: Venture, stage: 'cancelled' | 'folded', q: number, quiet: boolean): void {
  v.stage = stage
  v.endedQuarter = q
  v.call = null
  if (quiet) return
  // A fusion reservation is refundable only on a fold (doc 38 §5.5); an SMR prepayment is lost on cancellation.
  const refund = stage === 'folded' && v.type === 'fusion' ? v.prepaidUsd : 0
  state.cash = roundCents(state.cash + refund)
  logEntry(state, stage === 'cancelled' ? 'log.venture.cancelled' : 'log.venture.folded', {
    ventureType: v.type,
    costUsd: v.paidUsd + v.prepaidUsd - refund,
  })
}

/**
 * Fusion (doc 38 §5.5): four gates, each passing with its chance when due; a pass sets the next gate 4-12 quarters on.
 * A failed gate: half the time a pivot (8-12 quarters, a new raise at half the valuation: pay to keep your stake or be
 * diluted to half), else it folds. The last gate (90% availability) never comes before 2038.
 */
function stepFusion(state: GameState, v: Venture, r: RngHolder, q: number, quiet: boolean): void {
  const f = T.fusion
  if (v.gate === undefined || v.gateDue === undefined || q + 1 < v.gateDue) return
  const gate = f.gates[v.gate]
  if (chance(r, gate.p)) {
    if (!quiet) logEntry(state, 'log.venture.gate_passed', { ventureGate: gate.id })
    mark(v, 'milestone')
    v.gate++
    if (v.gate >= f.gates.length) {
      firstPower(state, v, q, quiet)
      return
    }
    const next = f.gates[v.gate]
    v.gateDue = q + 1 + randomInt(r, ...next.q)
    // Honesty rule: no fusion power before 2038 (in Acts III-IV it never delivers).
    if (v.gate === f.gates.length - 1) v.gateDue = Math.max(v.gateDue, quarterIndexBeyond(f.no_power_before))
    return
  }
  v.hypeMinusUntil = q + 1 + f.hype.minus_q
  if (chance(r, f.pivot.chance)) {
    v.gateDue = q + 1 + randomInt(r, ...f.pivot.q)
    mark(v, 'slip')
    if (quiet) return
    logEntry(state, 'log.venture.pivot', { ventureGate: gate.id })
    if (v.stake > 0) {
      // Keeping your stake through the down round costs half of what you paid in (mine); else it halves.
      v.call = { n: 5, dueUsd: roundCents(v.paidUsd * f.pivot.valuation_mult), partnerShare: null, costShare: null }
    }
  } else end(state, v, 'folded', q, quiet)
}

/**
 * A quarter's index, counting on past the timeline's last quarter ("2038Q1" is 9 after 2035Q4), so a date beyond the
 * game stays beyond it (M36.10: fusion's 2038 rule had fallen back to the quarter after the last).
 */
export function quarterIndexBeyond(id: string): number {
  const i = qIndex(id)
  if (i >= 0) return i
  const n = (q: string) => Number(q.slice(0, 4)) * 4 + Number(q.slice(5)) - 1
  const last = CONTENT.quarters.length - 1
  return last + n(id) - n(CONTENT.quarters[last])
}

/** The fusion hype (doc 38 §5.5): +1x on your multiples between first plasma and Q > 1, −2x for 4 quarters after a
 *  failed gate. 0 without a fusion stake. */
export function fusionHypeDelta(state: GameState, quarter = state.quarter): number {
  const f = T.fusion
  let delta = 0
  for (const v of state.ventures ?? []) {
    if (v.type !== 'fusion' || v.stake <= 0 || v.stage === 'folded') continue
    if (v.hypeMinusUntil !== undefined && quarter < v.hypeMinusUntil) delta -= f.hype.minus
    else if (v.gate === 1) delta += f.hype.plus
  }
  return delta
}

// ---------- Delivery and value ----------

/** The firm kW a venture delivers to its campus now (0 before first power). */
export function deliveredKw(v: Venture): number {
  if (v.stage !== 'operating' || !v.siteId || v.offtakeMw <= 0) return 0
  const firm =
    v.type === 'control'
      ? ENERGY.site_assets.bess.firm_share
      : isEgs(v.type) && v.weakField && !v.fieldFixed
        ? T[v.type].weak_field.cf / T[v.type].cf
        : 1
  return v.offtakeMw * 1000 * firm * (1 - v.partnerCut)
}

/** Sets each site's delivered venture kW (doc 38 §5.1 point 6: no interconnection wait). */
function syncVentureKw(state: GameState): void {
  const bySite = new Map<string, number>()
  for (const v of state.ventures ?? []) {
    const kw = deliveredKw(v)
    if (kw > 0 && v.siteId) bySite.set(v.siteId, (bySite.get(v.siteId) ?? 0) + kw)
  }
  for (const site of state.sites) {
    const kw = bySite.get(site.id) ?? 0
    if (kw > 0) site.ventureKw = kw
    else if (site.ventureKw !== undefined) delete site.ventureKw
  }
}

/** A quarter's PPA saving at the campus: (grid price − PPA price) × the kWh the site uses of it. */
function deliverySavingsUsd(state: GameState, v: Venture): number {
  const site: Site | undefined = state.sites.find((s) => s.id === v.siteId)
  if (!site || state.quarter < v.codQuarter) return 0
  const kw = Math.min(deliveredKw(v), usedKw(state, site.id))
  if (kw <= 0) return 0
  const grid = powerPriceUsdKwh(site, state.quarter, scenarioOf(state))
  return kw * HOURS_Q * (grid - v.ppaUsdMwh / 1000)
}

/** The venture's own EBITDA for a quarter at operation, $ (it sells all its output at its PPA price). */
export function ventureEbitdaUsd(v: Venture): number {
  if (v.stage !== 'operating') return 0
  if (v.type === 'pumped') return (v.mw * 1000 * (T.pumped.capacity_usd_kw_yr - T.pumped.running_usd_kw_yr)) / 4
  if (v.type === 'fusion') return 0
  if (v.type === 'control')
    return (v.mw * capacityFactorControl() * HOURS_Q * T.control.ppa_usd_mwh) - (v.mw * 1000 * T.control.running_usd_kw_yr) / 4
  const t = T[v.type]
  const cf = isEgs(v.type) && v.weakField && !v.fieldFixed ? T[v.type].weak_field.cf : t.cf
  const price = v.reopened ? Math.max(v.ppaUsdMwh, t.ppa_usd_mwh) : t.ppa_usd_mwh
  return v.mw * cf * HOURS_Q * (price - t.running_usd_mwh)
}

/** Counts a milestone hit or a slip toward the stake's mark (M36.8). */
function mark(v: Venture, kind: 'milestone' | 'slip'): void {
  if (kind === 'milestone') v.milestones = (v.milestones ?? 0) + 1
  else v.slips = (v.slips ?? 0) + 1
}

/**
 * Your venture's value, marked to milestones (M36.8, design thread answer 11a), as a funding round would mark it: the
 * buy-in, scaled by any dilution since, × 1.25 per milestone hit (M36.10; was 1.5) × 0.8 per slip; cash calls paid at par; prepayments at
 * cost; at first power an offtake adds its contracted power savings over the rest of the act. 0 once cancelled,
 * folded or walked away from (an offtake you keep still counts).
 */
export function ventureValueUsd(state: GameState, v: Venture): number {
  if (isOver(v)) return 0
  const M = V.marks
  let value = v.prepaidUsd
  if (v.stake > 0) {
    const buyIn = v.buyInUsd ?? v.paidUsd
    const share = v.stakeAtJoin && v.stakeAtJoin > 0 ? v.stake / v.stakeAtJoin : 1
    value += buyIn * share * M.milestone_mult ** (v.milestones ?? 0) * M.slip_mult ** (v.slips ?? 0) + (v.callsPaidUsd ?? 0)
  }
  if (v.stage === 'operating' && v.offtakeMw > 0) value += deliverySavingsUsd(state, v) * quartersLeftInAct(state)
  return Math.max(0, value)
}

/** Quarters left in the current act after this one. */
function quartersLeftInAct(state: GameState): number {
  return Math.max(0, actLastQuarter(inActIV(state) ? 4 : 3) - state.quarter)
}

/** All your ventures' value, $ (a valuation part). */
export function venturesValueUsd(state: GameState): number {
  return (state.ventures ?? []).reduce((sum, v) => sum + ventureValueUsd(state, v), 0)
}
