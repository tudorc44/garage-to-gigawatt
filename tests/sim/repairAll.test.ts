// "Fix all" on the Dashboard (M6.1): one action repairs every broken machine for the sum of their
// normal repair costs, no Bandwidth (a single repair costs none), and no partial repair when short.
import { describe, expect, it } from 'vitest'
import { t } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { repairAllView } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { repairCostPerUnit } from '../../src/sim/systems/machines.ts'

/** A Plan phase with two lots, some units broken in each. */
function broken(cash: number): GameState {
  const s: GameState = { ...newGame(1), cash, bandwidth: 3 }
  s.machines.push(
    {
      id: 'lot-a',
      model: 's9',
      siteId: 'site-1',
      condition: 'used',
      count: 10,
      failed: 4,
      earnsFromQuarter: 0,
    },
    {
      id: 'lot-b',
      model: 'gpu_gen1',
      siteId: 'site-1',
      condition: 'new',
      count: 5,
      failed: 2,
      earnsFromQuarter: 0,
    },
  )
  return s
}

const sum = () =>
  4 * repairCostPerUnit('s9') + 2 * repairCostPerUnit('gpu_gen1')

describe('Fix all', () => {
  it('repairs every broken unit for the exact sum of their repair costs, in one logged line, no Bandwidth', () => {
    const s = broken(100_000)
    expect(repairAllView(s)).toMatchObject({ units: 6, costUsd: sum() })
    const r = applyAction(s, { type: 'REPAIR_ALL' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.machines.every((l) => l.failed === 0)).toBe(true)
    expect(r.state.cash).toBeCloseTo(100_000 - sum(), 6)
    expect(r.state.bandwidth).toBe(3)
    const last = r.state.log.at(-1)!
    expect(last.key).toBe('log.repaired_all')
    expect(t(last.key, last.params)).toContain('6 broken machines')
    expect(repairAllView(r.state)).toBeNull()
  })

  it('short of cash: shown but blocked with the reason; nothing is repaired', () => {
    const s = broken(sum() - 1)
    const v = repairAllView(s)!
    expect(v.blocker?.key).toBe('error.no_cash')
    const r = applyAction(s, { type: 'REPAIR_ALL' })
    expect(r.ok).toBe(false)
    expect(s.machines.map((l) => l.failed)).toEqual([4, 2])
  })

  it('hidden with nothing broken', () => {
    expect(repairAllView(newGame(1))).toBeNull()
  })
})
