import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/sim/actions.ts'
import { newGame, type GameState } from '../src/sim/state.ts'
import { soundsFor } from '../src/ui/audio/director.ts'
import { SOUNDS } from '../src/ui/audio/sounds.ts'

const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('sound director (docs/audio)', () => {
  it('plays a sound for game moments, from the state change alone', () => {
    const s = newGame(1)
    const bought = ok(s, {
      type: 'BUY_MACHINES',
      model: 'gpu_gen1',
      condition: 'new',
      count: 1,
      siteId: 'site-1',
    })
    expect(soundsFor(s, bought)).toEqual(['buy'])
    const live = ok(bought, { type: 'END_PLAN' })
    expect(soundsFor(bought, live)).toEqual(['end-quarter'])
    const alert: GameState = {
      ...live,
      interrupt: { id: 'price_alert', week: 3, coin: 'ETH', changePct: -0.2 },
    }
    expect(soundsFor(live, alert)).toEqual(['price-down'])
  })

  it('stays quiet when a different game is loaded, and uses only sounds that exist', () => {
    expect(soundsFor(newGame(1), newGame(2))).toEqual([])
    expect(soundsFor(null, newGame(1))).toEqual([])
    expect(Object.keys(SOUNDS).length).toBeGreaterThanOrEqual(8)
  })
})
