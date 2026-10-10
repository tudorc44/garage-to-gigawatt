// M43.0 (doc 43 §19, the Act V gate; throwaway prototype): the 2035Q4 companies the gate starts from. As the energy runner
// (tools/act4/energyRunner.ts): each Act IV preset × future × seed plays the Balanced archetype with one firm venture
// joined in 2031Q1 (a 20% stake, and a 50% offtake to the biggest eligible site when there is one; calls paid when cash
// allows, else diluted). Lunar grade rich. Nothing here changes the game: it only plays it.
import type { FutureId } from '../../src/content/index.ts'
import type { VentureType } from '../../src/content/energyContent.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom, playGame, type Strategy } from '../../src/sim/replay.ts'
import { toAct3, toAct4, type GameState } from '../../src/sim/state.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { buyInUsd, prepayUsd, ventureRegions } from '../../src/sim/systems/ventures.ts'
import { BOTS } from '../bots.ts'
import { act4Archetypes } from '../act4/bots.ts'

/** The firm classes the gate tests (mine, reversible): fusion can't deliver before 2038 and the control is solar. */
export const FIRM_TYPES = ['egs', 'egs2', 'smr', 'adv_fission', 'pumped'] as const satisfies readonly VentureType[]
export type FirmType = (typeof FIRM_TYPES)[number]

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

function campusFor(s: GameState, type: VentureType): string | null {
  const regions = ventureRegions(type)
  const sites = s.sites
    .filter((x) => x.tier !== 'garage' && (regions === 'any' || regions.includes(regionOf(x) ?? '')))
    .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))
  return sites[0]?.id ?? null
}

function guardOk(s: GameState, spendUsd: number): boolean {
  const r = s.reports.at(-1)
  const fixedQ = r ? r.salariesUsd + r.rentUsd + r.interestUsd + r.principalUsd : 0
  return s.cash - spendUsd >= 2 * fixedQ
}

function ventureStep(s: GameState, v: FirmType): Action[] {
  const out: Action[] = []
  if (!(s.ventures ?? []).some((x) => x.type === v)) {
    const campus = v === 'pumped' ? null : campusFor(s, v)
    const tries: { stake: number; offtake: number; siteId?: string }[] = [
      ...(campus ? [{ stake: 0.2, offtake: 0.5, siteId: campus }] : []),
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

const presetEnd = new Map<Act4PresetId, GameState>()
/** The preset company at 2030Q4 (played once from 2017, cached). */
function preset2030(id: Act4PresetId): GameState {
  let s = presetEnd.get(id)
  if (!s) {
    const p = PRESETS_IV.find((x) => x.id === id)!
    const a2 = playGame(p.seed, BOTS[p.bot], { through: 2 }).state
    s = playFrom(toAct3(a2, { scenario: p.act3_scenario }), BOTS[p.bot], { through: 3 }).state
    presetEnd.set(id, s)
  }
  return s
}

/** One gate company at the end of 2035Q4 (the Act IV chapter phase). */
export function state2035(preset: Act4PresetId, future: FutureId, type: FirmType, seed: number): GameState {
  const p = PRESETS_IV.find((x) => x.id === preset)!
  const balanced = act4Archetypes(p.bot).balanced
  const start = toAct4(structuredClone(preset2030(preset)), { future, act4Seed: seed })
  start.lunarGrade = 'rich'
  const bot: Strategy = {
    plan: (s) => {
      const base = tryAll(s, balanced.plan(s))
      return [...base.kept, ...tryAll(base.after, ventureStep(base.after, type)).kept]
    },
  }
  return playFrom(start, bot, { through: 4 }).state
}
