// The GPU failure wave (M8.4; interrupts_act2.json › gpu_failure_wave): a live AI cloud of 10,000+
// GPUs rolls 10% a quarter; a hit fails 0.5–1% of its GPUs; replace now ($30,000 each) or run short.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import { availableChoices, defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  endQuarterGpuWaves,
  gpuOutShare,
  plannedWave,
  waveClusters,
} from '../../src/sim/systems/gpuWave.ts'
import { settleProjectsWeek } from '../../src/sim/systems/projects.ts'
import { act2Company, ok } from './act2Helpers.ts'

const G = CONTENT.projects.gpuWave

/** A live H100 cloud of `kw` at site-2 (750 GPUs a MW), forced live for the test. */
function liveCloud(seed: number, kw: number, label = '2025Q1'): GameState {
  let s = ok(act2Company(label, seed), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw,
    kind: 'cloud',
    gpu: 'h100',
  })
  s = ok(s, { type: 'PROJECT_SPOT', projectId: 'project-1' })
  s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
  s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
  s.projects[0].stage = 'live'
  s.projects[0].readyQuarter = s.quarter
  return s
}

/** The first seed (from 1) where the project's roll for this quarter is a hit. */
function hitSeed(kw: number, label = '2025Q1'): number {
  for (let seed = 1; seed < 400; seed++) {
    const s = liveCloud(seed, kw, label)
    if (plannedWave(s, s.projects[0])) return seed
  }
  throw new Error('no hit found')
}

/** Plays weeks until an alert shows (or the quarter ends). */
function toAlert(s: GameState): GameState {
  s.phase = 'live'
  s.week = 0
  s.projectEvents = []
  for (let i = 0; i < 13 && !s.interrupt; i++) s = advance(s)
  return s
}

describe('the GPU failure wave', () => {
  it('needs a live cloud of at least 10,000 GPUs (13.3 MW)', () => {
    expect(G.minGpus).toBe(10_000)
    const small = liveCloud(1, 13_000) // 9,750 GPUs
    expect(small.projects[0].gpuCount).toBeLessThan(G.minGpus)
    expect(waveClusters(small)).toEqual([])
    const big = liveCloud(1, 14_000) // 10,500 GPUs
    expect(waveClusters(big)).toHaveLength(1)
    // ...and a small cloud never gets an alert, whatever the seed.
    for (let seed = 1; seed <= 60; seed++) {
      let s = liveCloud(seed, 13_000)
      s = toAlert(s)
      expect(s.interrupt?.id).not.toBe('gpu_failure_wave')
    }
  })

  it('rolls 10% of the time and fails 0.5–1% of the GPUs, rounded up', () => {
    let hits = 0
    const n = 400
    for (let seed = 1; seed <= n; seed++) {
      const s = liveCloud(seed, 14_000)
      const w = plannedWave(s, s.projects[0])
      if (!w) continue
      hits++
      const gpus = s.projects[0].gpuCount
      expect(w.gpus).toBeGreaterThanOrEqual(Math.ceil(0.005 * gpus))
      expect(w.gpus).toBeLessThanOrEqual(Math.ceil(0.01 * gpus))
      expect(w.week).toBeGreaterThanOrEqual(2)
      expect(w.week).toBeLessThanOrEqual(12)
    }
    expect(hits / n).toBeGreaterThan(0.05)
    expect(hits / n).toBeLessThan(0.15)
  })

  it('shows an alert (replace now is the default) and replacing costs exactly $30,000 a GPU', () => {
    const seed = hitSeed(14_000)
    let s = toAlert(liveCloud(seed, 14_000))
    expect(s.interrupt?.id).toBe('gpu_failure_wave')
    expect(s.interruptsThisQuarter).toBe(1)
    const gpus = s.interrupt!.gpus!
    expect(availableChoices(s)).toEqual(['replace_now', 'run_short'])
    expect(defaultChoice(s)).toBe('replace_now')
    const cash = s.cash
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'replace_now' })
    expect(cash - s.cash).toBe(gpus * 30_000)
    expect(s.interrupt).toBeNull()
    expect(s.projects[0].gpuOut).toBeUndefined()
  })

  it('run short: no cash now, the GPUs earn nothing through next quarter, the bill comes at its end', () => {
    const seed = hitSeed(14_000)
    let s = toAlert(liveCloud(seed, 14_000))
    const gpus = s.interrupt!.gpus!
    const cash = s.cash
    s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'run_short' })
    expect(s.cash).toBe(cash)
    const p = s.projects[0]
    expect(p.gpuOut).toEqual({
      gpus,
      untilQuarter: s.quarter + 1,
      costUsd: gpus * 30_000,
    })
    expect(gpuOutShare(s, p)).toBeCloseTo(gpus / p.gpuCount, 10)
    // Less revenue while they are out (spot: exactly the lost share).
    const withOut = settleProjectsWeek({ ...s, cash: 0 }).revenueUsd
    delete p.gpuOut
    const whole = settleProjectsWeek({ ...s, cash: 0 }).revenueUsd
    p.gpuOut = { gpus, untilQuarter: s.quarter + 1, costUsd: gpus * 30_000 }
    expect(withOut).toBeCloseTo(whole * (1 - gpus / p.gpuCount), 4)
    // The bill is paid at the end of the next quarter, not before.
    endQuarterGpuWaves(s)
    expect(s.cash).toBe(cash)
    expect(p.gpuOut).toBeDefined()
    s.quarter++
    endQuarterGpuWaves(s)
    expect(cash - s.cash).toBe(gpus * 30_000)
    expect(p.gpuOut).toBeUndefined()
  })

  it('a contracted tenant gets an SLA credit of 2× the lost revenue', () => {
    const s = liveCloud(1, 14_000)
    const p = s.projects[0]
    p.tenant = {
      card: 'tc_realname_coreweave_style',
      readyByQuarter: s.quarter,
      lateQuarters: 0,
      servedQuarters: 0,
      prepaymentLeftUsd: 0,
      gpu: { gpus: p.gpuCount, priceUsdHr: 2, termQuarters: 8 },
    } as unknown as NonNullable<typeof p.tenant>
    const whole = { ...s, cash: 0 }
    const w = settleProjectsWeek(whole)
    const out = 500
    p.gpuOut = { gpus: out, untilQuarter: s.quarter + 1, costUsd: 0 }
    const hurt = { ...s, cash: 0 }
    const h = settleProjectsWeek(hurt)
    const lost = w.revenueUsd * (out / p.gpuCount)
    expect(h.revenueUsd).toBeCloseTo(w.revenueUsd - lost, 2)
    expect(h.costUsd).toBeCloseTo(w.costUsd + lost * G.slaCreditMult, 2)
  })

  it('with the 3-interrupt cap full it resolves silently with the default, and logs it', () => {
    const seed = hitSeed(14_000)
    const s0 = liveCloud(seed, 14_000)
    s0.phase = 'live'
    s0.projectEvents = []
    s0.interruptsThisQuarter = 3
    const cash = s0.cash
    let s = s0
    for (let i = 0; i < 13; i++) s = advance(s)
    expect(s.interrupt?.id).not.toBe('gpu_failure_wave')
    const line = s.log.find((e) => e.key === 'log.gpu_wave_silent')
    expect(line).toBeDefined()
    expect(Number(line!.params!.costUsd)).toBe(Number(line!.params!.gpus) * 30_000)
    expect(s.projects[0].gpuOut).toBeUndefined() // replaced, not run short
    expect(cash).toBeGreaterThan(0)
  })

  it('only run short is offered when the cash cannot cover a replacement', () => {
    const seed = hitSeed(14_000)
    const s = toAlert(liveCloud(seed, 14_000))
    s.cash = 0
    expect(availableChoices(s)).toEqual(['run_short'])
    expect(defaultChoice(s)).toBe('run_short')
  })
})
