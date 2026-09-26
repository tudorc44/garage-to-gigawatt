import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { trueDirection } from '../../src/sim/systems/readMarket.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
const read: Action = { type: 'READ_MARKET' }

describe('Read the market (interrupts.json › read_market)', () => {
  it('measures the quarter from its Plan-phase price to its last week, ±15%', () => {
    const q = CONTENT.quarters.indexOf('2017Q2') // ETH ran from ~$50 to ~$300
    expect(trueDirection(q, 'ETH')).toBe('up')
    expect(trueDirection(CONTENT.quarters.indexOf('2018Q1'), 'BTC')).toBe(
      'down',
    )
  })

  it('costs 1 Bandwidth (0 with the Trader), once per quarter, Plan phase only; own random stream', () => {
    const s = newGame(1)
    const after = ok(s, read)
    expect(after.bandwidth).toBe(2)
    expect(after.rng).toBe(s.rng)
    expect(after.marketRead?.quarter).toBe(0)
    expect(err(after, read)).toBe('error.market_read_done')
    expect(ok({ ...s, staff: { trader: 0 } }, read).bandwidth).toBe(3)
    expect(err({ ...s, phase: 'live' }, read)).toBe('error.wrong_phase')
  })

  it('is right about 3 times in 4, and a wrong read is never the opposite direction', () => {
    let right = 0
    let total = 0
    for (let seed = 1; seed <= 40; seed++) {
      for (let q = 0; q < CONTENT.quarters.length; q++) {
        const s = ok({ ...newGame(seed), quarter: q }, read)
        for (const coin of ['BTC', 'ETH'] as const) {
          const truth = trueDirection(q, coin)
          const got = s.marketRead!.reads[coin]
          total++
          if (got === truth) right++
          else expect(new Set([got, truth]).has('flat')).toBe(true)
        }
      }
    }
    expect(right / total).toBeGreaterThan(0.7)
    expect(right / total).toBeLessThan(0.8)
  })
})
