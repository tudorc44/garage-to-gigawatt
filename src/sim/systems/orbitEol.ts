// Orbit's replacement cycle (M56.3; doc 43 §9.1, V-D15; the "A Block Reaches Its End" cards). Blocks launched in
// 2031-35 reach the end of their design life in Act V. At the design end (the public figure: live quarter + the design
// life; the true life stays hidden and may end a block sooner) the Plan phase offers four choices, the default retire:
// - Replace: the block retires and a new one of the same kind, size and shell opens on the newest generation (gen38 once
//   it's flying), its slots to fill through the Deal Desk as any block;
// - Extend a year: once, for a refit of a year's in-orbit insurance on its capex, at failures × 1.5 (cloud GPUs wear
//   faster); the true life still applies;
// - Bring the compute home: a contracted shell tenant moves to the ground site with the most free energized MW (it needs
//   the block's MW free there: the scarce thing in V1) and pays its rent there for the rest of its term; the block retires;
// - Retire it: deorbit, no value.
// Orbit moves score 0 (doc 43 §6.7); the money judges them.
import { eolBodyKey } from './act5Cards.ts'
import { BALANCE, CONTENT, actFirstQuarter } from '../../content/index.ts'
import { ORBIT, tenantType } from '../../content/orbitContent.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { inActV, logEntry, roundCents, type GameState, type OrbitalBlock } from '../state.ts'
import { logAct5Move } from './act5Moves.ts'
import { availableGenerations, openOrbitalBlock, openOrbitalBlockBlocker, orbitRow } from './orbit.ts'
import { poweredKw, usedKw } from './sites.ts'

const X = BALANCE.act5.orbitExtend
export type EolChoice = 'replace' | 'extend' | 'bring_home' | 'retire'

/** The block's design end (the quarter its design life runs out, plus any extension). */
export function designEndQuarter(b: OrbitalBlock): number | null {
  if (b.liveQuarter === null) return null
  return b.liveQuarter + Math.round(ORBIT.satellites.design_life_years * 4) + (b.extendedQuarters ?? 0)
}

/** At the start of an Act V quarter: live blocks at their design end wait for a decision this Plan phase. */
export function startQuarterOrbitEol(state: GameState): void {
  if (!inActV(state)) return
  for (const b of state.act4Orbit?.blocks ?? []) {
    const end = designEndQuarter(b)
    if (b.stage !== 'live' || end === null || end > state.quarter || b.eolPending) continue
    b.eolPending = true
    logEntry(state, 'log.orbit.eol', { n: b.n })
  }
}

/** The ground site that could take a block's tenant home (the most free energized kW), or null. */
function homeSite(state: GameState, b: OrbitalBlock) {
  const need = b.mw * 1000
  return (
    state.sites
      .map((s) => ({ s, free: Math.max(0, poweredKw(s, state.quarter) - usedKw(state, s.id)) }))
      .filter((x) => x.s.tier !== 'garage' && x.free >= need)
      .sort((a, b2) => b2.free - a.free)[0]?.s ?? null
  )
}

/** A year of in-orbit insurance on the block's capex: the refit for an extension. */
export function refitUsd(state: GameState, b: OrbitalBlock): number {
  return roundCents((orbitRow(state).insurance_rate_inorbit_pct / 100) * b.capexSpentUsd)
}

/** Why this choice can't be made for this block now, or undefined. */
export function eolBlocker(state: GameState, blockId: string, choice: EolChoice): Message | undefined {
  const b = state.act4Orbit?.blocks.find((x) => x.id === blockId)
  if (!inActV(state) || !b || !b.eolPending || b.stage !== 'live') return { key: 'error.orbit_eol_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (choice === 'extend') {
    if (b.extendedQuarters) return { key: 'error.orbit_eol_extended' }
    const cost = refitUsd(state, b)
    if (state.cash < cost) return { key: 'error.no_cash', params: { costUsd: cost, cashUsd: state.cash } }
  }
  if (choice === 'bring_home') {
    if (b.kind !== 'shell' || !b.tenant || b.tenant === 'spot') return { key: 'error.orbit_eol_no_tenant' }
    if (!homeSite(state, b)) return { key: 'error.orbit_eol_no_ground' }
  }
  if (choice === 'replace') {
    const gens = availableGenerations(state)
    const blocked = openOrbitalBlockBlocker(state, { kind: b.kind, mw: b.mw, shell: b.shell, gen: gens.at(-1)! })
    if (blocked) return blocked
  }
  if (!['replace', 'extend', 'bring_home', 'retire'].includes(choice)) return { key: 'error.bad_choice' }
}

/** Applies the choice (eolBlocker passed). */
export function decideEol(state: GameState, blockId: string, choice: EolChoice): void {
  const b = state.act4Orbit!.blocks.find((x) => x.id === blockId)!
  delete b.eolPending
  if (choice === 'extend') {
    const cost = refitUsd(state, b)
    book(state, 'orbit_capex', -cost, { block: b.id })
    b.extendedQuarters = X.quarters
    logEntry(state, 'log.orbit.extended', { n: b.n, costUsd: cost })
    logAct5Move(state, 'orbit_extend')
    return
  }
  b.stage = 'retired'
  if (choice === 'bring_home') {
    const site = homeSite(state, b)!
    const t = b.tenant as Exclude<OrbitalBlock['tenant'], 'spot' | null>
    ;(state.act5Homed ??= []).push({
      id: `homed-${b.id}`,
      siteId: site.id,
      kw: b.mw * 1000,
      rentUsdMwYr: t.price,
      endQuarter: t.endQuarter ?? state.quarter + t.termQuarters,
      tenant: t.type,
    })
    logEntry(state, 'log.orbit.brought_home', { n: b.n, tenantName: tenantType(t.type).name })
    logAct5Move(state, 'orbit_bring_home')
    return
  }
  if (choice === 'replace') {
    const gen = availableGenerations(state).at(-1)!
    const nb = openOrbitalBlock(state, { kind: b.kind, mw: b.mw, shell: b.shell, gen })
    logEntry(state, 'log.orbit.replaced', { n: b.n, newN: nb.n })
    logAct5Move(state, 'orbit_replace')
    return
  }
  logEntry(state, 'log.orbit.retired', { n: b.n })
}

/** Unanswered decisions at the end of the Plan: retire (the card's default). */
export function settleEol(state: GameState): void {
  for (const b of state.act4Orbit?.blocks ?? []) if (b.eolPending && b.stage === 'live') decideEol(state, b.id, 'retire')
}

/** The failure multiplier on an extended block (× 1.5 in its extra year), else 1. */
export const extendedFailureMult = (b: OrbitalBlock) => (b.extendedQuarters ? X.failureMult : 1)

// ---------- tenants brought home ----------

/** kW a homed tenant takes at a site (counted as used). */
export function homedKw(state: GameState, siteId: string): number {
  return (state.act5Homed ?? []).filter((h) => h.siteId === siteId).reduce((a, h) => a + h.kw, 0)
}

/** At each Act V quarter's end: homed tenants pay their rent (AI revenue); a term that ends frees its MW. */
export function endQuarterHomed(state: GameState): void {
  if (!inActV(state) || !state.act5Homed?.length) return
  for (const h of state.act5Homed) {
    const usd = roundCents((h.rentUsdMwYr * h.kw) / 1000 / 4)
    book(state, 'ai_shell_rent', usd, { site: h.siteId })
    state.quarterStats.aiRevenueUsd += usd
  }
  const next = state.quarter + 1
  const ended = state.act5Homed.filter((h) => h.endQuarter <= next)
  for (const h of ended) logEntry(state, 'log.orbit.homed_ended', { quarter: CONTENT.quarters[h.endQuarter] ?? '—' })
  state.act5Homed = state.act5Homed.filter((h) => h.endQuarter > next)
}

/** The Orbit screen's end-of-life rows: blocks waiting for a decision, with each choice's blocker. */
export function eolView(state: GameState) {
  if (!inActV(state)) return []
  return (state.act4Orbit?.blocks ?? [])
    .filter((b) => b.eolPending && b.stage === 'live')
    .map((b) => ({
      id: b.id,
      n: b.n,
      mw: b.mw,
      refitUsd: refitUsd(state, b),
      newGen: availableGenerations(state).at(-1)!,
      choices: (['replace', 'extend', 'bring_home', 'retire'] as EolChoice[]).map((c) => ({
        choice: c,
        blocked: eolBlocker(state, b.id, c) ?? null,
      })),
      since: CONTENT.quarters[actFirstQuarter(5)],
      // (M58.5, doc 43 §0.15 fix 5: the card's body: neutral before the future's trigger card has played, its own after)
      bodyKey: eolBodyKey(state),
    }))
}
