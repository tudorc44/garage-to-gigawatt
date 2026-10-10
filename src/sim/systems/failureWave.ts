// The failure wave (interrupts.json › failure_wave, design thread F1–F4): a rolled shock on top
// of the weekly failures. Each quarter, every site with enough working units gets one roll at a
// random week:
//   chance = base_chance × (1 + used_share_bonus × the site's used share)
//            × heat_wave_run_hot_mult (if "Run hot" was chosen this quarter)
//            × ops_manager_mult (with the Ops Manager)
// When it hits, a share (wave_size_range) of the site's working units break at once, used
// ones first. The alert (counted toward the 3-interrupt cap) offers a rush repair at
// repair_cost × cost_mult, back next week, or running degraded until a normal Plan-phase
// repair. With the cap full the units just break, without an alert.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { randomInt, substream, uniform } from '../rng.ts'
import { logEntry, type GameState, type MachineLot } from '../state.ts'
import { isHired } from './hires.ts'
import { repairCostPerUnit } from './machines.ts'
import { isEarning } from './mining.ts'
import { siteParams } from './siteSerials.ts'

/** A wave planned for this quarter at a site: the week it may hit, and its dice. */
export interface PlannedWave {
  siteId: string
  /** Week number (1–13): the roll happens after this week is played. */
  week: number
  /** The chance roll (0–1) and the size roll, drawn when the quarter starts. */
  roll: number
  size: number
}

/** Broken by a wave: units per batch (for the rush repair). */
export type WaveDamage = { lotId: string; units: number }[]

function workingLots(state: GameState, siteId: string): MachineLot[] {
  return state.machines.filter(
    (l) => l.siteId === siteId && isEarning(state, l) && l.count > l.failed,
  )
}

function working(lots: MachineLot[]): number {
  return lots.reduce((n, l) => n + l.count - l.failed, 0)
}

/** The chance that a site's wave hits this quarter, from what's there now. */
export function waveChance(state: GameState, siteId: string): number {
  const rules = CONTENT.failureWave
  const lots = workingLots(state, siteId)
  const total = working(lots)
  if (total < rules.minWorkingUnits) return 0
  const used = working(lots.filter((l) => l.condition === 'used'))
  const runHot = state.events.runHotQuarter === state.quarter
  return (
    rules.baseChance *
    (1 + rules.usedShareBonus * (used / total)) *
    (runHot ? rules.runHotMult : 1) *
    (isHired(state, 'ops_manager') ? rules.opsManagerMult : 1)
  )
}

/** At END_PLAN: one roll per site for this quarter (its own random stream). */
export function planFailureWaves(state: GameState): void {
  const [w0, w1] = CONTENT.failureWave.weekRange
  state.failureWaves = state.sites.map((site) => {
    const r = substream(state.seed, `failure_wave:${state.quarter}:${site.id}`)
    return {
      siteId: site.id,
      week: randomInt(r, w0, w1),
      roll: uniform(r, 0, 1),
      size: uniform(r, ...CONTENT.failureWave.sizeRange),
    }
  })
}

/** After a week is played: a site's planned wave hits if its roll is under the chance now. */
export function checkFailureWaves(state: GameState): void {
  const weekNo = state.week + 1
  for (const wave of state.failureWaves) {
    if (wave.week !== weekNo) continue
    if (wave.roll >= waveChance(state, wave.siteId)) continue
    const lots = workingLots(state, wave.siteId).sort(
      (a, b) => Number(b.condition === 'used') - Number(a.condition === 'used'),
    )
    let left = Math.max(1, Math.round(working(lots) * wave.size))
    const damage: WaveDamage = []
    for (const lot of lots) {
      if (left <= 0) break
      const n = Math.min(left, lot.count - lot.failed)
      lot.failed += n
      left -= n
      damage.push({ lotId: lot.id, units: n })
    }
    const units = damage.reduce((n, d) => n + d.units, 0)
    state.quarterStats.failures += units
    const site = state.sites.find((s) => s.id === wave.siteId)!
    const capFull =
      state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter
    if (state.interrupt || capFull) {
      logEntry(
        state,
        'log.failure_wave_silent',
        { units, ...siteParams(site) },
        weekNo,
      )
      continue
    }
    state.interrupt = {
      id: 'failure_wave',
      week: state.week,
      coin: 'BTC',
      changePct: 0,
      siteId: wave.siteId,
      wave: damage,
    }
    state.interruptsThisQuarter++
  }
}

/** What the rush repair costs for the units on the alert. */
export function rushRepairUsd(state: GameState): number {
  const damage = state.interrupt?.wave ?? []
  return damage.reduce((sum, d) => {
    const lot = state.machines.find((l) => l.id === d.lotId)
    return (
      sum +
      (lot ? repairCostPerUnit(lot.model) * d.units : 0) *
        CONTENT.failureWave.rushCostMult
    )
  }, 0)
}

export function failureWaveChoices(state: GameState): string[] {
  return rushRepairUsd(state) <= state.cash
    ? ['repair_now', 'run_degraded']
    : ['run_degraded']
}

export function resolveFailureWave(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  if (!failureWaveChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const site = state.sites.find((s) => s.id === active.siteId)
  const units = (active.wave ?? []).reduce((n, d) => n + d.units, 0)
  if (choiceId === 'repair_now') {
    const costUsd = rushRepairUsd(state)
    book(state, 'repairs', -costUsd, { site: site?.id })
    for (const d of active.wave ?? []) {
      const lot = state.machines.find((l) => l.id === d.lotId)
      if (lot) lot.failed = Math.max(0, lot.failed - d.units)
    }
    logEntry(
      state,
      'log.failure_wave_repaired',
      { units, ...siteParams(site), costUsd },
      active.week + 1,
    )
  } else {
    logEntry(
      state,
      'log.failure_wave_degraded',
      { units, ...siteParams(site) },
      active.week + 1,
    )
  }
  state.interrupt = null
}
