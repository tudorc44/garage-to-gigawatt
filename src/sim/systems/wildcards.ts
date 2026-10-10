// Wildcards (Act III, M17.4; doc 27 D10, wildcards.json, the design thread's step-6 spec). At the Act III
// boundary 2 of the 4 are drawn on their own stream (act3_wildcards), each with a quarter drawn uniformly in its
// window. A drawn wildcard comes as a card in its quarter's Plan phase; with no target then it doesn't come (no
// replacement). The upcoming ones are never shown. They don't depend on the scenario, so the draw is in state.
// Undecided at END_PLAN, the first choice (the default) applies.
import { BALANCE, CONTENT, quarterIndex } from '../../content/index.ts'
import type { Message, MessageKey } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { randomInt, substream } from '../rng.ts'
import {
  act3SeedOf,
  inActIII,
  logEntry,
  projectGone,
  type GameState,
  type Project,
  type Site,
  type WildcardId,
} from '../state.ts'
import { extraShellOffers } from './cardContracts.ts'
import { addGrievance } from './heat.ts'
import { addPc, adjustAnger } from './pcState.ts'
import { annualContractUsd, contractQuarters, tenantCard } from './projects.ts'
import { capacityKw, poweredKw, usedKw } from './sites.ts'
import { siteParams } from './siteSerials.ts'

const W = BALANCE.act3.wildcards
const card = (id: WildcardId) => CONTENT.wildcards.find((w) => w.id === id)!
const n = (v: unknown) => Number(v ?? 0)

/** Draws 2 of the 4 and their quarters (at the Act III boundary). */
export function drawWildcards(state: GameState): void {
  const r = substream(act3SeedOf(state), 'act3_wildcards')
  const left = [...CONTENT.wildcards]
  state.act3Wildcards = []
  for (let i = 0; i < W.draw && left.length > 0; i++) {
    const w = left.splice(randomInt(r, 0, left.length - 1), 1)[0]
    const from = quarterIndex(w.window[0])!
    const to = quarterIndex(w.window[1])!
    state.act3Wildcards.push({
      id: w.id,
      quarter: randomInt(r, from, to),
      status: 'pending',
    })
  }
}

/**
 * The water moratorium's target (M17.8 F, in this order): the building project with the latest ready quarter (tie:
 * larger capex); else the largest proposed project; else the site with the most idle energized MW (tie: the larger
 * site). None only without a site.
 */
function waterTarget(
  state: GameState,
): { projectId: string } | { siteId: string } | undefined {
  const building = state.projects
    .filter((p) => p.stage === 'building' && p.readyQuarter !== null)
    .sort(
      (a, b) => b.readyQuarter! - a.readyQuarter! || b.capexUsd - a.capexUsd,
    )[0]
  if (building) return { projectId: building.id }
  const proposed = state.projects
    .filter((p) => p.stage === 'proposed')
    .sort((a, b) => b.kw - a.kw || a.n - b.n)[0]
  if (proposed) return { projectId: proposed.id }
  const idle = (s: Site) =>
    Math.max(0, poweredKw(s, state.quarter) - usedKw(state, s.id))
  const site = [...state.sites].sort(
    (a, b) => idle(b) - idle(a) || capacityKw(b) - capacityKw(a),
  )[0]
  return site ? { siteId: site.id } : undefined
}

/** The AI lab restructure's target: your largest live lease with an AI-lab tenant card. */
function labTarget(state: GameState): Project | undefined {
  return state.projects
    .filter(
      (p) =>
        p.stage === 'live' &&
        !projectGone(p) &&
        p.tenant &&
        !p.tenant.gpu &&
        tenantCard(p.tenant.card)?.type === 'ai_lab',
    )
    .sort((a, b) => annualContractUsd(b) - annualContractUsd(a) || a.n - b.n)[0]
}

/** A wildcard's target now, or null when it has none (it doesn't fire); true when it needs none. */
function target(
  state: GameState,
  id: WildcardId,
): { projectId: string } | { siteId: string } | true | null {
  switch (id) {
    case 'wc_water_moratorium':
      return waterTarget(state) ?? null
    case 'wc_ai_lab_breakup': {
      const p = labTarget(state)
      return p ? { projectId: p.id } : null
    }
    default:
      return true
  }
}

/** Opens the next wildcard due this quarter that has a target (the ones without are skipped for good). */
export function openNextWildcard(state: GameState): void {
  if (!inActIII(state) || state.act3WildcardOpen) return
  for (const w of state.act3Wildcards ?? []) {
    if (w.status !== 'pending' || w.quarter !== state.quarter) continue
    const t = target(state, w.id)
    if (t === null) {
      w.status = 'skipped'
      continue
    }
    state.act3WildcardOpen = { id: w.id, ...(t === true ? {} : t) }
    return
  }
}

/** Why this choice of the open wildcard can't be picked, or undefined. */
export function wildcardChoiceBlocker(
  state: GameState,
  choice: string,
): Message | undefined {
  const open = state.act3WildcardOpen
  if (!open) return { key: 'error.no_wildcard' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (choice !== 'c1' && choice !== 'c2') return { key: 'error.bad_choice' }
  const c = card(open.id).choices[choice === 'c1' ? 0 : 1]
  if (c.pcCost !== undefined && (state.politicalCapital ?? 0) < c.pcCost)
    return {
      key: 'error.pc_short',
      params: { needed: c.pcCost, have: state.politicalCapital ?? 0 },
    }
  return undefined
}

/** Plays the open wildcard's choice (assumes the blocker passed), then opens the next one due, if any. */
export function chooseWildcard(state: GameState, choice: 'c1' | 'c2'): void {
  const open = state.act3WildcardOpen!
  const w = card(open.id)
  const c = w.choices[choice === 'c1' ? 0 : 1]
  const e = w.effect
  const q = state.quarter
  const p = open.projectId
    ? state.projects.find((x) => x.id === open.projectId)
    : undefined
  switch (open.id) {
    case 'wc_grid_event': {
      // Grid-priced power costs × (1 + 0.6 × 3/13) this quarter (3 weeks at × 1.6); PPA MW are exempt.
      const mult = 1 + (n(e.power_price_mult) - 1) * (n(e.weeks) / BALANCE.weeksPerQuarter)
      for (const site of state.sites) {
        const was = site.eventPowerMult
        const on = was && q >= was.from && q <= was.until
        site.eventPowerMult = { mult: (on ? was!.mult : 1) * mult, from: q, until: q }
      }
      book(state, 'one_offs', -(c.costUsd ?? 0))
      if (c.heat) {
        const largest = [...state.sites].sort((a, b) => capacityKw(b) - capacityKw(a))[0]
        if (largest) addGrievance(state, largest.id, c.heat)
      }
      break
    }
    case 'wc_export_control': {
      const quarters = n(e.quarters)
      if (choice === 'c2') {
        const gpuUsd = state.projects
          .filter((x) => x.stage === 'building' && x.kind !== 'shell')
          .reduce((sum, x) => sum + x.gpuCapexUsd, 0)
        book(state, 'gpus', -Math.round(gpuUsd * (c.costUsdMult ?? 0)))
      }
      state.act3ExportRule = { from: q, until: q + quarters - 1, exempt: choice === 'c2' }
      break
    }
    case 'wc_water_moratorium': {
      if (choice === 'c1') {
        const quarters = n(e.one_pipeline_project_paused_quarters)
        const g = (state.act3Gov ??= { pending: [], lastUsed: {}, once: [] })
        // (M17.8 F) a build waits; a proposed project can't start; else no new project at the site, 2 quarters
        if (p?.stage === 'building') {
          p.readyQuarter = (p.readyQuarter ?? q) + quarters
          g.pause = { projectId: p.id, quarters }
        } else if (p)
          g.pause = { kind: 'start', projectId: p.id, quarters, untilQuarter: q + quarters - 1 }
        else if (open.siteId)
          g.pause = { kind: 'site', siteId: open.siteId, quarters, untilQuarter: q + quarters - 1 }
        adjustAnger(state, n(e.ratepayer_anger))
      } else addPc(state, -(c.pcCost ?? 0))
      break
    }
    case 'wc_ai_lab_breakup': {
      if (choice === 'c1' && p?.tenant) {
        const t = p.tenant
        t.priceMult = (t.priceMult ?? 1) * (1 + n(e.rent_index))
        const left = contractQuarters(p) - t.servedQuarters
        t.termQuarters =
          t.servedQuarters +
          Math.max(W.minQuartersLeft, left - 4 * n(e.term_shortened_years))
      } else {
        book(state, 'one_offs', -(c.costUsd ?? 0), p ? { site: p.siteId, project: p.id, biz: 'ai' } : undefined)
        extraShellOffers(state, -1)
        state.events.extraShellOffers!.until = q + W.fewerOffersQuarters
      }
      break
    }
  }
  const drawn = state.act3Wildcards?.find(
    (x) => x.id === open.id && x.status === 'pending',
  )
  if (drawn) {
    drawn.status = 'fired'
    drawn.choice = choice
  }
  const key = `log.wildcard.${open.id}.${choice}${waterVariant(state, open)}` as const
  logEntry(state, key as MessageKey, {
    ...(p ? { n: p.n } : {}),
    ...(siteTier(state, open.siteId)
      ? siteParams(state.sites.find((s) => s.id === open.siteId))
      : {}),
  })
  state.act3WildcardOpen = null
  openNextWildcard(state)
}

/** A site's tier id (its name in text), or undefined. */
export function siteTier(state: GameState, siteId?: string): string | undefined {
  return siteId ? state.sites.find((s) => s.id === siteId)?.tier : undefined
}

/**
 * The water moratorium's text variant (M17.8 F): '' for a build that waits, '_start' for a proposed project, '_site'
 * for a site. '' for the other wildcards.
 */
export function waterVariant(
  state: GameState,
  open: NonNullable<GameState['act3WildcardOpen']>,
): '' | '_start' | '_site' {
  if (open.id !== 'wc_water_moratorium') return ''
  if (open.siteId) return '_site'
  const p = state.projects.find((x) => x.id === open.projectId)
  return p?.stage === 'proposed' ? '_start' : ''
}

/** At END_PLAN: a wildcard still open takes its default (the first choice); so does any other due now. */
export function settleWildcards(state: GameState): void {
  while (state.act3WildcardOpen) chooseWildcard(state, 'c1')
}
