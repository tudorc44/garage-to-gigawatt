// The GPU failure wave (Act II, scope 0.2 §2.9; interrupts_act2.json › gpu_failure_wave; M8.4): a
// live full-stack AI cloud of at least min_gpus GPUs (10,000 = 13.3 MW at 750 GPUs a MW) rolls once a
// quarter (10%), at a random week 2–12. A hit fails 0.5–1% of its GPUs (rounded up). Basis: Meta's
// Llama 3 run (about half GPU and HBM faults). The alert counts toward the 3-interrupt cap:
// - replace now (default): $30,000 a GPU, no lost revenue;
// - run short: no cash now; the failed GPUs earn nothing for the rest of the quarter and the next, a
//   contracted tenant gets an SLA credit of 2× the lost revenue, and the replacement is paid at the
//   end of the next quarter.
// With the cap full, or another alert showing, it resolves silently with the default (replace now
// when the cash is there, else run short) and is logged. The roll is a pure function of the seed,
// quarter and project (its own "gpu_wave" substream), so nothing about it is stored until it hits.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream, uniform } from '../rng.ts'
import {
  inActII,
  logEntry,
  projectGone,
  type GameState,
  type Project,
} from '../state.ts'

const G = () => CONTENT.projects.gpuWave
/** The wave falls in a random week of this range, like the Act I failure wave. */
const WEEKS = [2, 12] as const

export const isGpuWave = (id: string) => id === 'gpu_failure_wave'

/** Live full-stack clouds big enough to fail in waves. */
export function waveClusters(state: GameState): Project[] {
  if (!inActII(state)) return []
  return state.projects.filter(
    (p) => p.stage === 'live' && p.kind === 'cloud' && p.gpuCount >= G().minGpus,
  )
}

/** This quarter's roll for a project: the week it hits and how many GPUs fail, or null for no wave. */
export function plannedWave(
  state: GameState,
  p: Project,
): { week: number; gpus: number } | null {
  const label = CONTENT.quarters[state.quarter]
  const r = substream(state.seed, `gpu_wave:${label}:${p.id}`)
  const hit = chance(r, G().chance)
  const week = randomInt(r, WEEKS[0], WEEKS[1])
  const share = uniform(r, ...G().failedShareRange)
  if (!hit) return null
  return { week, gpus: Math.ceil(share * p.gpuCount) }
}

export const waveCostUsd = (gpus: number) => gpus * G().replaceUsdPerGpu

/** The share of a project's GPUs that earn nothing now (a wave you ran short on), 0 when none. */
export function gpuOutShare(state: GameState, p: Project): number {
  const out = p.gpuOut
  if (!out || state.quarter > out.untilQuarter || p.gpuCount <= 0) return 0
  return Math.min(1, out.gpus / p.gpuCount)
}

const capFull = (state: GameState) =>
  state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter

/** After a week is played: a planned wave for this week becomes an alert, or resolves silently. */
export function checkGpuWaves(state: GameState): void {
  const weekNo = state.week + 1
  for (const p of waveClusters(state)) {
    if (p.gpuOut && state.quarter <= p.gpuOut.untilQuarter) continue
    const wave = plannedWave(state, p)
    if (!wave || wave.week !== weekNo) continue
    if (state.interrupt || capFull(state)) {
      applyChoice(state, p, wave.gpus, defaultFor(state, wave.gpus), weekNo, true)
      continue
    }
    state.interrupt = {
      id: 'gpu_failure_wave',
      week: state.week,
      coin: 'BTC',
      changePct: 0,
      projectId: p.id,
      gpus: wave.gpus,
    }
    state.interruptsThisQuarter++
  }
}

function defaultFor(state: GameState, gpus: number): 'replace_now' | 'run_short' {
  return waveCostUsd(gpus) <= state.cash ? 'replace_now' : 'run_short'
}

export function gpuWaveChoices(state: GameState): string[] {
  const gpus = state.interrupt?.gpus ?? 0
  return waveCostUsd(gpus) <= state.cash
    ? ['replace_now', 'run_short']
    : ['run_short']
}

export function gpuWaveDefault(state: GameState): string {
  return defaultFor(state, state.interrupt?.gpus ?? 0)
}

function applyChoice(
  state: GameState,
  p: Project,
  gpus: number,
  choice: 'replace_now' | 'run_short',
  weekNo: number,
  silent: boolean,
): void {
  const costUsd = waveCostUsd(gpus)
  if (choice === 'replace_now') {
    state.cash -= costUsd
    logEntry(
      state,
      silent ? 'log.gpu_wave_silent' : 'log.gpu_wave_replaced',
      { n: p.n, gpus, costUsd },
      weekNo,
    )
    return
  }
  // Run short: out for the rest of this quarter and the next; a second wave adds to what's out.
  const before = p.gpuOut && state.quarter <= p.gpuOut.untilQuarter ? p.gpuOut : null
  p.gpuOut = {
    gpus: (before?.gpus ?? 0) + gpus,
    untilQuarter: state.quarter + 1,
    costUsd: (before?.costUsd ?? 0) + costUsd,
  }
  logEntry(
    state,
    silent ? 'log.gpu_wave_short_silent' : 'log.gpu_wave_short',
    { n: p.n, gpus, costUsd },
    weekNo,
  )
}

export function resolveGpuWave(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  if (!gpuWaveChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const p = state.projects.find((x) => x.id === active.projectId)
  if (p)
    applyChoice(
      state,
      p,
      active.gpus ?? 0,
      choiceId as 'replace_now' | 'run_short',
      active.week + 1,
      false,
    )
  state.interrupt = null
}

/**
 * At a quarter's end: GPUs run short on come back, and their replacement is paid (the last of the
 * quarters they were out). A project that's gone by then owes nothing.
 */
export function endQuarterGpuWaves(state: GameState): void {
  for (const p of state.projects) {
    const out = p.gpuOut
    if (!out || state.quarter < out.untilQuarter) continue
    delete p.gpuOut
    if (projectGone(p)) continue
    state.cash -= out.costUsd
    logEntry(state, 'log.gpu_wave_repaired', {
      n: p.n,
      gpus: out.gpus,
      costUsd: out.costUsd,
    })
  }
}
