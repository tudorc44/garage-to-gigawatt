// Act V's preset recipes, played (M49, doc 43 §3.4 with §0.9 item 11): a preset is a real company. Its Act IV preset's
// line (a bot and seed played from 2017 through Act III, presets_act4.json) enters Act IV on a fixed future and seed and
// plays it with the Balanced archetype, joining firm ventures in 2031Q1 as the energy runner does (a 20% stake and a 50%
// offtake to the biggest eligible site when there is one; calls paid when cash allows, else diluted) or building solar
// and a 4-hour battery behind the meter; the result is the company at its 2035Q4 chapter report, carrying its Act IV
// future into Act V. Used by tools/act5/presets.ts (the scan) and by the game's "Start at Act V" (lazily, like Act IV's).
import type { FutureId } from '../../src/content/index.ts'
import type { VentureType } from '../../src/content/energyContent.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom, playGame, type Strategy } from '../../src/sim/replay.ts'
import { toAct3, toAct4, type GameState } from '../../src/sim/state.ts'
import { buildCostUsd } from '../../src/sim/systems/energy.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { buyInUsd, prepayUsd, ventureRegions } from '../../src/sim/systems/ventures.ts'
import { BOTS } from '../bots.ts'
import { act4Archetypes } from '../act4/bots.ts'

/** What a recipe adds to the Balanced archetype in Act IV: firm ventures to join, or a battery behind the meter. */
export type Act5PresetJoins = VentureType[] | 'btm'

export interface Act5PresetRecipe {
  act4_preset: Act4PresetId
  act4_future: FutureId
  act4_seed: number
  joins: Act5PresetJoins
}

function tryAll(state: GameState, actions: Action[]): { kept: Action[]; after: GameState } {
  let s = state
  const kept: Action[] = []
  for (const a of actions) {
    const r = applyAction(s, a)
    if (r.ok) {
      s = r.state
      kept.push(a)
    }
  }
  return { kept, after: s }
}

/** The energy runner's cash guard: a spend leaves two quarters of fixed costs. */
function guardOk(s: GameState, spendUsd: number): boolean {
  const r = s.reports.at(-1)
  const fixedQ = r ? r.salariesUsd + r.rentUsd + r.interestUsd + r.principalUsd : 0
  return s.cash - spendUsd >= 2 * fixedQ
}

function campusFor(s: GameState, type: VentureType): string | null {
  const regions = ventureRegions(type)
  const sites = s.sites
    .filter((x) => x.tier !== 'garage' && (regions === 'any' || regions.includes(regionOf(x) ?? '')))
    .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))
  return sites[0]?.id ?? null
}

function joinsStep(s: GameState, joins: Act5PresetJoins): Action[] {
  const out: Action[] = []
  if (joins === 'btm') {
    const site = s.sites
      .filter((x) => x.tier === 'own_site' || x.tier === 'texas_site' || x.category)
      .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))[0]
    if (site && !site.energy?.length)
      for (const mw of [50, 20, 10, 5]) {
        const cost = (buildCostUsd(s, site, 'btm_solar', mw) ?? Infinity) + (buildCostUsd(s, site, 'bess', mw, 4) ?? Infinity)
        if (!guardOk(s, cost)) continue
        out.push({ type: 'ENERGY_BUILD', siteId: site.id, kind: 'btm_solar', size: mw })
        out.push({ type: 'ENERGY_BUILD', siteId: site.id, kind: 'bess', size: mw, hours: 4 })
      }
    return out
  }
  for (const v of joins) {
    if ((s.ventures ?? []).some((x) => x.type === v)) continue
    const campus = v === 'pumped' ? null : v === 'fusion' ? 'any' : campusFor(s, v)
    const tries: { stake: number; offtake: number; siteId?: string }[] = [
      ...(campus ? [{ stake: 0.2, offtake: 0.5, ...(campus !== 'any' ? { siteId: campus } : {}) }] : []),
      { stake: 0.2, offtake: 0 },
      { stake: 0.1, offtake: 0 },
    ]
    for (const t of tries) {
      const cost = buyInUsd(s, { type: v, stake: t.stake }) + prepayUsd({ type: v, offtake: t.offtake, prepay: 0 })
      if (!guardOk(s, cost)) continue
      out.push({ type: 'VENTURE_JOIN', venture: v, prepay: 0, ...t })
    }
  }
  for (const x of s.ventures ?? [])
    if (x.call) out.push({ type: 'VENTURE_CALL', ventureId: x.id, choice: guardOk(s, x.call.dueUsd) ? 'pay' : 'dilute' })
  return out
}

const line2030 = new Map<Act4PresetId, GameState>()
/** An Act IV preset's company at its 2030Q4 chapter (played once from 2017, cached; returns a copy). */
export function presetLine2030(id: Act4PresetId): GameState {
  let s = line2030.get(id)
  if (!s) {
    const p = PRESETS_IV.find((x) => x.id === id)!
    const a2 = playGame(p.seed, BOTS[p.bot], { through: 2 }).state
    s = playFrom(toAct3(a2, { scenario: p.act3_scenario }), BOTS[p.bot], { through: 3 }).state
    line2030.set(id, s)
  }
  return structuredClone(s)
}

/** A recipe's company at its 2035Q4 chapter report (or its game over). */
export function playAct5Recipe(r: Act5PresetRecipe): GameState {
  const p = PRESETS_IV.find((x) => x.id === r.act4_preset)!
  const balanced = act4Archetypes(p.bot).balanced
  const start = toAct4(presetLine2030(r.act4_preset), { future: r.act4_future, act4Seed: r.act4_seed })
  // The energy runner's convention: the lunar grade rich (the recipes don't touch the Moon).
  start.lunarGrade = 'rich'
  const bot: Strategy = {
    plan: (s) => {
      const base = tryAll(s, balanced.plan(s))
      return [...base.kept, ...tryAll(base.after, joinsStep(base.after, r.joins)).kept]
    },
  }
  return playFrom(start, bot, { through: 4 }).state
}
