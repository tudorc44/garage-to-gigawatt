// Act III's blend-and-extend offers (M12.4; the design thread's proposal, approved by the owner on
// 30 Sep 2026). Shell leases from Act II run 5–15 years, so most never come up for renewal in 2027–2030.
// From 2028Q1, once a year per lease (in the Plan phase of its anniversary quarter: every 4 quarters of
// its term served), a shell tenant with more than 8 quarters left offers to extend the lease by the
// offered shell term at one blended rent for the whole remaining + extended term:
//   blended rent = current rent × (R + E × Band mid(q)) / (R + E)
// (R = years left, E = the extension in years, Band mid = the middle of Band(q)). The player accepts
// (0 BW) or ignores it (the default: nothing changes). No walk roll, no counter. Accepting locks in a
// small raise for a long time in a rising market and a cut in a falling one: a bet on the scenario.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  inAct3Rules,
  logEntry,
  projectGone,
  type BlendOffer,
  type GameState,
  type Project,
} from '../state.ts'
import { offeredTermYears, renewalBand } from './leaseIndex.ts'
import { scenarioOf } from './market.ts'
import { contractQuarters } from './projects.ts'

const B = BALANCE.act3.blendExtend

/** Quarters still to serve on a lease (this one included). */
function quartersLeft(p: Project): number {
  return contractQuarters(p) - p.tenant!.servedQuarters
}

/** Whether this lease gets an offer now: a live shell in its anniversary quarter with > 8 quarters left. */
function eligible(state: GameState, p: Project): boolean {
  const t = p.tenant
  if (!t || t.gpu || t.rolling || p.kind !== 'shell') return false
  if (projectGone(p) || p.stage !== 'live') return false
  if (t.servedQuarters === 0 || t.servedQuarters % 4 !== 0) return false
  if (quartersLeft(p) <= B.minQuartersLeft) return false
  if (t.blendOfferedQuarter === state.quarter) return false
  return !state.act3Renewals?.some((r) => r.projectId === p.id)
}

/** The offer for a lease now (Band mid and the offered shell term of this quarter), or null without data. */
export function blendOffer(
  state: GameState,
  p: Project,
): Omit<BlendOffer, 'projectId' | 'openedQuarter'> | null {
  const scenario = scenarioOf(state)
  const band = renewalBand(state.quarter, scenario)
  const years = offeredTermYears(state.quarter, scenario, 'shell')
  if (!band || years === null) return null
  const r = quartersLeft(p) / 4
  const mid = (band.lo + band.hi) / 2
  return {
    mult: (r + years * mid) / (r + years),
    extendQuarters: years * 4,
  }
}

/**
 * At the start of an Act III Plan phase (after renewals and reopeners): last quarter's unanswered offers
 * lapse, and each eligible lease makes its offer.
 */
export function openBlendOffers(state: GameState): void {
  if (state.act3BlendOffers) state.act3BlendOffers = []
  if (!inAct3Rules(state) || !state.scenarioId) return
  if (CONTENT.quarters[state.quarter] < B.from) return
  for (const p of state.projects) {
    if (!eligible(state, p)) continue
    const offer = blendOffer(state, p)
    if (!offer) continue
    p.tenant!.blendOfferedQuarter = state.quarter
    ;(state.act3BlendOffers ??= []).push({
      projectId: p.id,
      openedQuarter: state.quarter,
      ...offer,
    })
    logEntry(state, 'log.blend_offer', {
      n: p.n,
      tenant: p.tenant!.card,
      years: offer.extendQuarters / 4,
      multPct: offer.mult - 1,
    })
  }
}

/** Why this blend-and-extend offer can't be accepted now, or undefined. */
export function blendAcceptBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const o = state.act3BlendOffers?.find(
    (x) => x.projectId === projectId && x.openedQuarter === state.quarter,
  )
  if (!o) return { key: 'error.no_blend_offer' }
  const p = state.projects.find((x) => x.id === projectId)
  if (!p?.tenant || projectGone(p)) return { key: 'error.no_blend_offer' }
  return undefined
}

/**
 * Accepts the offer (0 BW; assumes the blocker passed): the blended rent from now, and the term
 * extended by E years. The offer is used up.
 */
export function acceptBlend(state: GameState, projectId: string): void {
  const o = state.act3BlendOffers!.find((x) => x.projectId === projectId)!
  const p = state.projects.find((x) => x.id === projectId)!
  const t = p.tenant!
  t.priceMult = (t.priceMult ?? 1) * o.mult
  t.termQuarters = contractQuarters(p) + o.extendQuarters
  state.act3BlendOffers = state.act3BlendOffers!.filter((x) => x !== o)
  logEntry(state, 'log.blend_signed', {
    n: p.n,
    tenant: t.card,
    multPct: o.mult - 1,
    years: quartersLeft(p) / 4,
  })
}
