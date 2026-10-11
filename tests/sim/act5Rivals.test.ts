// M56 (doc 43 §12 with §0.9 item 11): Act V's rivals from rivals_v.json, replacing M49's 2035Q4 freeze. Six fictional
// rivals (Act IV's five and Ironvale Power, the firm-power developer); Orrery only after Act IV's F1 or F3; the same in
// every Act V future through 2036Q2; in V3 Orrery fails in 2038Q3 and its blocks go to auction.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { ORRERY_AUCTION_V3, RIVALS_V } from '../../src/content/rivalsVContent.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { activeRivals } from '../../src/sim/systems/rivals.ts'
import { orreryAuction } from '../../src/sim/systems/rivalsIv.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { act4Company } from './act4Helpers.ts'

const first = actFirstQuarter(5)
const key = (f: string, v: string) => `s0.${f}.${v}` as `s0.f1.v1`

describe('Act V’s rivals (M56)', () => {
  it('six in the league after F1 (Orrery present), five after F2; the league moves with the quarter', () => {
    expect(activeRivals(first, key('f1', 'v1')).map((r) => r.id).sort()).toEqual(
      ['cratermark', 'ironvale_power', 'jade_arc', 'northgate', 'orrery_compute', 'pallas_compute'].sort(),
    )
    expect(activeRivals(first, key('f2', 'v1')).some((r) => r.id === 'orrery_compute')).toBe(false)
    const v = (q: number) => activeRivals(q, key('f1', 'v1')).find((r) => r.id === 'pallas_compute')!.valueUsd
    expect(v(first + 19)).not.toBe(v(first)) // no longer frozen at 2035Q4
  })

  it('the same in every Act V future through 2036Q2 (V-B14)', () => {
    for (const q of [first, first + 1]) {
      const rows = V_FUTURE_IDS.map((v) => JSON.stringify(activeRivals(q, key('f1', v))))
      expect(new Set(rows).size).toBe(1)
    }
  })

  it('Ironvale Power carries firm MW and its orderbook against units delivered', () => {
    const r = activeRivals(first + 19, key('f1', 'v1')).find((x) => x.id === 'ironvale_power')!
    expect(r.firmMw).toBeGreaterThan(0)
    expect(r.orderbookUnits).not.toBeUndefined()
    expect(RIVALS_V.find((x) => x.id === 'ironvale_power')!.futures.v1.orderbookUnits).not.toBeNull()
  })

  it('V3: Orrery fails in 2038Q3 (out of the league) and its blocks go to auction for two quarters', () => {
    const failQ = CONTENT.quarters.indexOf(ORRERY_AUCTION_V3.quarter)
    expect(activeRivals(failQ, key('f1', 'v3')).some((r) => r.id === 'orrery_compute')).toBe(false)
    expect(activeRivals(failQ - 1, key('f1', 'v3')).some((r) => r.id === 'orrery_compute')).toBe(true)
    const s4 = playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
    const s = toAct5(s4, { vfuture: 'v3' }) as GameState
    s.quarter = failQ
    s.cash = 2e9
    expect(orreryAuction(s).open).toBe(true)
    const r = applyAction(s, { type: 'BUY_ORRERY_BLOCKS' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.act4Orbit!.blocks.at(-1)!.mw).toBe(ORRERY_AUCTION_V3.mw)
    // not in V1, nor after F2 (no Orrery to fail)
    expect(orreryAuction({ ...s, vFutureId: 'v1' }).open).toBe(false)
    expect(orreryAuction({ ...s, futureId: 'f2' }).open).toBe(false)
  })
})
