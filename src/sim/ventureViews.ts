// Read-only views of the energy ventures (M36, doc 38 §5) for the Ventures page. They show what the player can know:
// the developer's pitch, the reference-class estimate once diligence is done, the cash calls as they come, the stage
// reached. Never the hidden cost multiplier or the drawn schedule (those arrive as calls and events).
import { CONTENT } from '../content/index.ts'
import { ENERGY, VENTURES, VENTURE_TYPES, type VentureType } from '../content/energyContent.ts'
import type { Message } from '../i18n/t.ts'
import type { GameState, Venture, VentureStage } from './state.ts'
import { regionOf } from './systems/sites.ts'
import {
  buyInUsd,
  callBlocker,
  callDueUsd,
  diligenceBlocker,
  joinBlocker,
  pitchCodQuarter,
  pitchPpaUsdMwh,
  pitchUsdKw,
  prepayUsd,
  referenceUsdKw,
  ventureRegions,
  ventureValueUsd,
  venturesOpen,
} from './systems/ventures.ts'

const T = VENTURES.types

export interface VentureOfferView {
  type: VentureType
  mw: number
  pitchUsdKw: number
  /** The pitched first power ("2032"), or null (fusion: its $/MWh year). */
  pitchYear: string | null
  pitchPpaUsdMwh: number | null
  /** With diligence: the reference-class estimate, $/kW, and the class (for its tail text). */
  referenceUsdKw: number | null
  overrunClass: string
  diligenceBlocked?: Message
  diligenceDone: boolean
  diligenceUsd: number
  diligenceBandwidth: number
  /** Why it can't be joined at all now (before choosing a role), or undefined. */
  blocked?: Message
  stakes: { share: number; costUsd: number }[]
  offtakes: number[]
  prepays: { index: number; share: number; priceCut: number }[]
  /** Your sites it can deliver to. */
  sites: { id: string }[]
  equityOnly: boolean
  /** Doc 38's milestone chances (shown as the developer's record). */
  p2035: number
}

export interface MyVentureView {
  id: string
  type: VentureType
  stage: VentureStage
  stake: number
  paidUsd: number
  valueUsd: number
  offtakeMw: number
  ppaUsdMwh: number
  prepaidUsd: number
  siteId: string | null
  callsDone: number
  reopened: boolean
  walked: boolean
  /** Fusion: gates passed. */
  gatesPassed: number | null
  /** M36.8: milestones hit and slips counted in its mark. */
  milestones: number
  slips: number
  /** The quarter it went into operation or ended ("2034Q2"), when it has. */
  sinceQuarter: string | null
  call: {
    n: number
    dueUsd: number
    choices: { choice: 'pay' | 'dilute' | 'walk' | 'partner' | 'cost_share'; payUsd: number; blocked?: Message }[]
    partnerShare: number | null
    costShare: number | null
  } | null
}

export interface VenturesView {
  open: boolean
  offers: VentureOfferView[]
  mine: MyVentureView[]
  totalValueUsd: number
}

/** The pitched first power's year for a venture joined in quarter `joined` (relative to joining: doc 38's dates assume
 *  a 2027 start, mine). */
function pitchYear(type: VentureType, joined: number): string | null {
  const q = pitchCodQuarter(type, joined)
  const year = Number(CONTENT.quarters[joined].slice(0, 4))
  // (past the timeline's last quarter: count the years on from the join)
  return q < CONTENT.quarters.length ? CONTENT.quarters[q].slice(0, 4) : String(year + Math.round((q - joined) / 4))
}

function offerView(state: GameState, type: VentureType): VentureOfferView {
  const t = T[type]
  const regions = ventureRegions(type)
  const done = state.ventureDiligence?.includes(type) ?? false
  const dBlocked = diligenceBlocker(state, type)
  const probe = joinBlocker(state, { type, stake: VENTURES.equity_shares[0], offtake: 0, prepay: 0 })
  return {
    type,
    mw: t.mw,
    pitchUsdKw: pitchUsdKw(state, type),
    pitchYear: pitchYear(type, state.quarter),
    pitchPpaUsdMwh: pitchPpaUsdMwh(type),
    referenceUsdKw: done ? referenceUsdKw(state, type) : null,
    overrunClass: 'class' in t ? t.class : 'fusion',
    ...(dBlocked && !done ? { diligenceBlocked: dBlocked } : {}),
    diligenceDone: done,
    diligenceUsd: VENTURES.diligence.fee_usd,
    diligenceBandwidth: VENTURES.diligence.bandwidth,
    ...(probe && probe.key !== 'error.no_cash' ? { blocked: probe } : {}),
    stakes: VENTURES.equity_shares.map((share) => ({ share, costUsd: buyInUsd(state, { type, stake: share }) })),
    offtakes: type === 'pumped' ? [] : VENTURES.offtake_shares,
    prepays: type === 'fusion' || type === 'pumped' ? [] : VENTURES.prepay.map((p, index) => ({ index, share: p.share, priceCut: p.price_cut })),
    sites: state.sites
      .filter((s) => type === 'fusion' || regions === 'any' || regions.includes(regionOf(s) ?? ''))
      .filter((s) => s.tier !== 'garage')
      .map((s) => ({ id: s.id })),
    equityOnly: type === 'pumped',
    p2035: t.targets.p2035,
  }
}

function myView(state: GameState, v: Venture): MyVentureView {
  const choices = (['pay', 'dilute', 'walk', 'partner', 'cost_share'] as const)
    .filter((c) => (c !== 'partner' || v.call?.partnerShare != null) && (c !== 'cost_share' || v.call?.costShare != null))
    .map((choice) => {
      const blocked = v.call ? callBlocker(state, v.id, choice) : undefined
      return { choice, payUsd: v.call ? callDueUsd(v.call, choice) : 0, ...(blocked ? { blocked } : {}) }
    })
  const since =
    v.endedQuarter !== undefined
      ? CONTENT.quarters[v.endedQuarter]
      : v.stage === 'operating'
        ? CONTENT.quarters[Math.min(v.codQuarter, CONTENT.quarters.length - 1)]
        : null
  return {
    id: v.id,
    type: v.type,
    stage: v.stage,
    stake: v.stake,
    paidUsd: v.paidUsd,
    valueUsd: ventureValueUsd(state, v),
    offtakeMw: v.offtakeMw,
    ppaUsdMwh: v.ppaUsdMwh,
    prepaidUsd: v.prepaidUsd,
    siteId: v.siteId,
    callsDone: v.callsDone,
    reopened: !!v.reopened,
    walked: !!v.walked,
    gatesPassed: v.type === 'fusion' ? (v.gate ?? 0) : null,
    milestones: v.milestones ?? 0,
    slips: v.slips ?? 0,
    sinceQuarter: since,
    call: v.call
      ? { n: v.call.n, dueUsd: v.call.dueUsd, choices, partnerShare: v.call.partnerShare, costShare: v.call.costShare }
      : null,
  }
}

/** The Ventures page: the offers (one per type) and your ventures. */
export function venturesView(state: GameState): VenturesView {
  const open = venturesOpen(state)
  const mine = (state.ventures ?? []).map((v) => myView(state, v))
  return {
    open,
    offers: open
      ? VENTURE_TYPES.filter((t) => CONTENT.quarters[state.quarter] >= T[t].from).map((t) => offerView(state, t))
      : [],
    mine,
    totalValueUsd: mine.reduce((n, v) => n + v.valueUsd, 0),
  }
}

/** The share of the class that overruns by more than half (diligence's tail line), from energy.json's class. */
export function tailShare(cls: string): number | null {
  const c = ENERGY.overrun_classes[cls as keyof typeof ENERGY.overrun_classes]
  if (!c) return null
  // P(m > 1.5) for a lognormal: 1 − Φ(ln(1.5 / median) / σ); Φ by the Abramowitz-Stegun formula (display only).
  if (c.sigma === 0) return c.median > 1.5 ? 1 : 0
  const z = Math.log(1.5 / c.median) / c.sigma
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? p : 1 - p
}

/** A view's prepayment for an offtake choice, $ (for the join form's total). */
export const offtakePrepayUsd = (type: VentureType, offtake: number, prepay: number) => prepayUsd({ type, offtake, prepay })
