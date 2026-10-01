// Political capital (Act III, M17.3; doc 27 D8, political_capital.json, the design thread's step-6 spec). A
// meter 0–100, 40 at the Act III boundary, −2 a quarter. It rises with the Government Affairs Director (+3 a
// quarter) and with lobbying (paid now, the gain landing at the quarter's end); it's spent on five cards. Below 15
// the moratorium comes at Anger 40 in your regions and grid queues take a quarter longer (pcState.ts). None of
// this goes into the move log.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, substream } from '../rng.ts'
import { inActIII, logEntry, type GameState, type Project } from '../state.ts'
import { accelerateTarget } from './cardHalls.ts'
import { isHired } from './hires.ts'
import { addPc, adjustAnger } from './pcState.ts'
import { projectBuildQuarters } from './projects.ts'

const PC = BALANCE.act3.politicalCapital
const C = () => CONTENT.politicalCapital

/** The Government section's bookkeeping, created on first use. */
function gov(state: GameState) {
  return (state.act3Gov ??= { pending: [], lastUsed: {}, once: [] })
}

/** Sets the meter up at the Act III boundary (40, no adjustment, nothing pending). */
export function startPolitics(state: GameState): void {
  state.politicalCapital = C().start
  state.angerAdj = 0
  state.act3Gov = { pending: [], lastUsed: {}, once: [] }
}

/** Whether `id` (a lobbying action or a spend card) is still cooling down, or was already used this act. */
function used(state: GameState, id: string): boolean {
  const g = gov(state)
  if (PC.oncePerAct.includes(id)) return g.once.includes(id)
  const last = g.lastUsed[id]
  return last !== undefined && state.quarter - last < PC.cooldownQuarters
}

/** The quarter `id` can be used again (for the reason line). */
function againQuarter(state: GameState, id: string): string {
  const last = gov(state).lastUsed[id] ?? state.quarter
  return CONTENT.quarters[last + PC.cooldownQuarters] ?? '—'
}

// ---------- lobbying ----------

export function lobbyBlocker(state: GameState, id: string): Message | undefined {
  if (!inActIII(state)) return { key: 'error.act3_only' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const a = C().lobbying.find((x) => x.id === id)
  if (!a) return { key: 'error.bad_choice' }
  if (a.requires && !isHired(state, a.requires))
    return { key: 'error.needs_director' }
  if (used(state, id))
    return PC.oncePerAct.includes(id)
      ? { key: 'error.pc_once' }
      : { key: 'error.pc_cooldown', params: { quarter: againQuarter(state, id) } }
  if (state.bandwidth < PC.lobbyBandwidth)
    return {
      key: 'error.no_bandwidth',
      params: { needed: PC.lobbyBandwidth, have: state.bandwidth },
    }
  if (state.cash < a.costUsd)
    return { key: 'error.no_cash', params: { costUsd: a.costUsd, cashUsd: state.cash } }
  return undefined
}

/**
 * Starts lobbying (assumes the blocker passed): the cost now, 1 BW, and the gain lands at the end of the
 * quarter. The tariff intervention may backfire (20%, rolled now on its own stream act3_pc): −10 instead.
 */
export function lobby(state: GameState, id: string): void {
  const a = C().lobbying.find((x) => x.id === id)!
  const g = gov(state)
  state.cash -= a.costUsd
  state.bandwidth -= PC.lobbyBandwidth
  const backfired =
    !!a.backfire &&
    chance(
      substream(state.seed, `act3_pc:${CONTENT.quarters[state.quarter]}:${id}`),
      a.backfire.chance,
    )
  g.pending.push({
    id,
    pc: backfired ? a.backfire!.pc : a.pcGain,
    anger: a.angerDelta ?? 0,
  })
  if (PC.oncePerAct.includes(id)) g.once.push(id)
  else g.lastUsed[id] = state.quarter
  logEntry(state, 'log.lobby_started', { lobby: id, costUsd: a.costUsd })
}

// ---------- spending ----------

/** A project waiting on a grid upgrade whose power could come a quarter sooner (the latest first). */
function queueJumpTarget(state: GameState): Project | undefined {
  return state.projects
    .flatMap((p) => {
      if (p.stage !== 'building' || p.power !== 'grid') return []
      const add = state.sites
        .find((s) => s.id === p.siteId)
        ?.powerAdds?.find((x) => x.projectId === p.id)
      return add?.readyQuarter != null && add.readyQuarter > state.quarter + 1
        ? [{ p, at: add.readyQuarter }]
        : []
    })
    .sort((a, b) => b.at - a.at)[0]?.p
}

/** What "Block the moratorium" would end: a regional moratorium on now, or the water moratorium's pause. */
function moratoriumTarget(state: GameState): 'region' | 'pause' | undefined {
  const m = state.events.regionMoratorium
  if (m && state.quarter <= m.until) return 'region'
  const pause = state.act3Gov?.pause
  if (!pause) return undefined
  // (M17.8: a held start or site, until it lifts)
  if (pause.kind) return state.quarter <= pause.untilQuarter! ? 'pause' : undefined
  const p = state.projects.find((x) => x.id === pause.projectId)
  return p && p.stage === 'building' ? 'pause' : undefined
}

/** Whether on-site gas runs at one of your sites now (the grant needs it). */
function gasRunning(state: GameState): boolean {
  return state.sites.some((s) =>
    (s.powerAdds ?? []).some(
      (a) => a.source === 'gas' && a.readyQuarter !== null && a.readyQuarter <= state.quarter,
    ),
  )
}

export function spendBlocker(state: GameState, id: string): Message | undefined {
  if (!inActIII(state)) return { key: 'error.act3_only' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const card = C().spend.find((x) => x.id === id)
  // pc_tariff_relief isn't offered in step 6 (no tariff to relieve; the step-7 list).
  if (!card || id === 'pc_tariff_relief') return { key: 'error.bad_choice' }
  if ((state.politicalCapital ?? 0) < card.pcCost)
    return {
      key: 'error.pc_short',
      params: { needed: card.pcCost, have: state.politicalCapital ?? 0 },
    }
  if (used(state, id))
    return PC.oncePerAct.includes(id)
      ? { key: 'error.pc_once' }
      : { key: 'error.pc_cooldown', params: { quarter: againQuarter(state, id) } }
  switch (id) {
    case 'pc_fast_permit':
      return accelerateTarget(state) ? undefined : { key: 'error.card_no_build' }
    case 'pc_queue_jump':
      return queueJumpTarget(state) ? undefined : { key: 'error.pc_no_queue' }
    case 'pc_moratorium_block':
      return moratoriumTarget(state) ? undefined : { key: 'error.pc_no_moratorium' }
    case 'pc_grant':
      return gasRunning(state) ? undefined : { key: 'error.pc_no_gas' }
  }
  return undefined
}

/** Spends political capital on a card (assumes the blocker passed; 0 BW). */
export function spendPc(state: GameState, id: string): void {
  const card = C().spend.find((x) => x.id === id)!
  const g = gov(state)
  addPc(state, -card.pcCost)
  if (PC.oncePerAct.includes(id)) g.once.push(id)
  else g.lastUsed[id] = state.quarter
  const next = state.quarter + 1
  switch (id) {
    case 'pc_fast_permit': {
      const p = accelerateTarget(state)!
      p.readyQuarter = Math.max(next, p.readyQuarter! - PC.speedUpQuarters)
      break
    }
    case 'pc_queue_jump': {
      const p = queueJumpTarget(state)!
      const add = state.sites
        .find((s) => s.id === p.siteId)!
        .powerAdds!.find((x) => x.projectId === p.id)!
      const was = add.readyQuarter!
      add.readyQuarter = Math.max(next, was - PC.speedUpQuarters)
      // the project went live with its power: it comes sooner too, never before its build is done
      if (p.readyQuarter !== null && p.readyQuarter <= was && p.startQuarter !== null)
        p.readyQuarter = Math.max(
          add.readyQuarter,
          p.startQuarter + projectBuildQuarters(state, p),
          next,
        )
      break
    }
    case 'pc_anger_shield':
      adjustAnger(state, PC.angerShield)
      break
    case 'pc_moratorium_block': {
      if (moratoriumTarget(state) === 'region')
        state.events.regionMoratorium!.until = state.quarter - 1
      else {
        const pause = g.pause!
        if (!pause.kind) {
          const p = state.projects.find((x) => x.id === pause.projectId)!
          p.readyQuarter = Math.max(next, p.readyQuarter! - pause.quarters)
        }
        delete g.pause
      }
      break
    }
    case 'pc_grant':
      state.cash += PC.grantUsd
      break
  }
  logEntry(state, 'log.pc_spent', { pcCard: id, pc: card.pcCost })
}

// ---------- the quarter's end ----------

/**
 * At the end of an Act III quarter: lobbying lands (its gain, and the community deal's Anger), the Director
 * adds 3 and takes Anger 1 down, and the meter decays by 2; 0–100.
 */
export function endQuarterPolitics(state: GameState): void {
  if (!inActIII(state) || state.politicalCapital === undefined) return
  const g = gov(state)
  const before = state.politicalCapital
  for (const x of g.pending) {
    addPc(state, x.pc)
    if (x.anger) adjustAnger(state, x.anger)
    logEntry(
      state,
      x.pc < 0 ? 'log.lobby_backfired' : 'log.lobby_landed',
      { lobby: x.id, pc: Math.abs(x.pc) },
    )
  }
  g.pending = []
  const hire = C().hire
  if (isHired(state, hire.id)) {
    addPc(state, hire.pcPerQuarter)
    adjustAnger(state, hire.angerPerQuarter)
  }
  addPc(state, -C().decayPerQuarter)
  logEntry(state, 'log.pc_quarter', {
    pc: state.politicalCapital,
    deltaPc: state.politicalCapital - before,
  })
}
