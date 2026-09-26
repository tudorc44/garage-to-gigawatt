import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { interruptChoices } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  planFailureWaves,
  rushRepairUsd,
  waveChance,
} from '../../src/sim/systems/failureWave.ts'

const Q = CONTENT.quarters.indexOf('2019Q2')
/** A live 2019Q2 at the warehouse (site-2) with `used` used and `fresh` new S9s, week `week`. */
function warehouse(used: number, fresh: number, week = 4): GameState {
  const s: GameState = {
    ...newGame(1),
    phase: 'live',
    quarter: Q,
    week,
    cash: 100_000,
  }
  s.sites.push({
    id: 'site-2',
    tier: 'warehouse',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  const lot = (id: string, condition: 'used' | 'new', count: number) => ({
    id,
    model: 's9',
    siteId: 'site-2',
    condition,
    count,
    failed: 0,
    earnsFromQuarter: 0,
  })
  if (used) s.machines.push(lot('lot-u', 'used', used))
  if (fresh) s.machines.push(lot('lot-n', 'new', fresh))
  return s
}
/** Forces this site's wave to hit after the next week, with the given size. */
function hitNext(s: GameState, size = 0.1): GameState {
  s.failureWaves = [{ siteId: 'site-2', week: s.week + 1, roll: 0, size }]
  return s
}

describe('failure wave (interrupts.json › failure_wave)', () => {
  it('chance = 6% × (1 + 0.5 × used share) × Run hot 2 × Ops Manager 0.5; none under 10 units', () => {
    expect(waveChance(warehouse(0, 100), 'site-2')).toBeCloseTo(0.06)
    expect(waveChance(warehouse(100, 0), 'site-2')).toBeCloseTo(0.09)
    expect(waveChance(warehouse(50, 50), 'site-2')).toBeCloseTo(0.075)
    const hot = warehouse(0, 100)
    hot.events.runHotQuarter = Q
    expect(waveChance(hot, 'site-2')).toBeCloseTo(0.12)
    const ops = { ...warehouse(0, 100), staff: { ops_manager: 0 } }
    expect(waveChance(ops, 'site-2')).toBeCloseTo(0.03)
    expect(waveChance(warehouse(9, 0), 'site-2')).toBe(0)
  })

  it('one roll per site per quarter, in weeks 2–12, from its own stream', () => {
    const s = { ...warehouse(100, 0), phase: 'plan' as const }
    planFailureWaves(s)
    expect(s.failureWaves).toHaveLength(2)
    for (const w of s.failureWaves) {
      expect(w.week).toBeGreaterThanOrEqual(2)
      expect(w.week).toBeLessThanOrEqual(12)
    }
    expect(s.rng).toBe(warehouse(100, 0).rng)
  })

  it('breaks 5–10% of the working units at once, used first; counted toward the cap', () => {
    const s = advance(hitNext(warehouse(5, 95), 0.1))
    expect(s.interrupt).toMatchObject({ id: 'failure_wave', siteId: 'site-2' })
    expect(s.interruptsThisQuarter).toBe(1)
    const used = s.machines.find((l) => l.id === 'lot-u')!
    const fresh = s.machines.find((l) => l.id === 'lot-n')!
    expect(used.failed).toBe(5) // all the used ones first…
    expect(fresh.failed).toBeGreaterThanOrEqual(5) // …then new ones (plus any weekly failure)
    expect(interruptChoices(s).map((c) => c.id)).toEqual([
      'repair_now',
      'run_degraded',
    ])
    expect(interruptChoices(s).find((c) => c.isDefault)!.id).toBe(
      'run_degraded',
    )
  })

  it('rush repair costs 1.5× the repair price and fixes those units; degraded leaves them off', () => {
    const s = advance(hitNext(warehouse(100, 0), 0.1))
    const broke = s.interrupt!.wave!.reduce((n, d) => n + d.units, 0)
    expect(broke).toBe(10)
    const cost = CONTENT.interrupts.byId.failure_wave.repair_cost_usd!.s9
    expect(rushRepairUsd(s)).toBeCloseTo(10 * cost * 1.5)
    const failedBefore = s.machines[0].failed
    const r = applyAction(s, {
      type: 'RESOLVE_INTERRUPT',
      choice: 'repair_now',
    })
    expect(r.ok && r.state.machines[0].failed).toBe(failedBefore - 10)
    expect(r.ok && r.state.cash).toBeCloseTo(s.cash - 10 * cost * 1.5)
    const d = applyAction(s, {
      type: 'RESOLVE_INTERRUPT',
      choice: 'run_degraded',
    })
    expect(d.ok && d.state.machines[0].failed).toBe(failedBefore)
  })

  it('with the 3 interrupts used up the units still break, silently', () => {
    const s = hitNext(warehouse(100, 0), 0.1)
    s.interruptsThisQuarter = 3
    const after = advance(s)
    expect(after.interrupt).toBeNull()
    expect(after.machines[0].failed).toBeGreaterThanOrEqual(10)
    expect(after.log.some((e) => e.key === 'log.failure_wave_silent')).toBe(
      true,
    )
  })
})
