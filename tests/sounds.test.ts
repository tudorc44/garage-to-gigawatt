import { describe, expect, it } from 'vitest'
import { applyAction } from '../src/sim/actions.ts'
import { newGame, type GameState } from '../src/sim/state.ts'
import { soundsFor } from '../src/ui/audio/director.ts'
import { SOUNDS } from '../src/ui/audio/sounds.ts'
import { finishDowntimes } from '../src/sim/systems/density.ts'
import { act3ScenarioCompany } from './sim/act3Helpers.ts'

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

  it('Act III’s moments use the existing sounds (M25.3)', () => {
    const s = newGame(1)
    const withLog = (key: string): GameState => ({
      ...s,
      log: [...s.log, { quarter: 0, week: null, key: key as GameState['log'][number]['key'] }],
    })
    expect(soundsFor(s, withLog('log.renewal_signed'))).toEqual(['deal-agreed'])
    expect(soundsFor(s, withLog('log.blend_signed'))).toEqual(['deal-agreed'])
    expect(soundsFor(s, withLog('log.renewal_walk'))).toEqual(['walk-away'])
    expect(soundsFor(s, withLog('log.covenant_breach'))).toEqual(['margin-call'])
    expect(soundsFor(s, withLog('log.covenant_forced_sale'))).toEqual(['liquidation'])
    expect(soundsFor(s, withLog('log.lobby_landed'))).toEqual(['auction-won'])
    expect(soundsFor(s, withLog('log.signal_read'))).toEqual([]) // a read stays quiet: the screen shows it
  })

  it('a finished Act III retrofit or GPU change logs its line and sounds "energized" (M26.4)', () => {
    for (const kind of ['retrofit', 'refit'] as const) {
      const before = act3ScenarioCompany('s0', 1)
      const after = structuredClone(before)
      // (a minimal project: finishDowntimes reads only its downtime, tier, number and GPU)
      const p = { id: 'p-test', n: 1, tier: 'low', gpu: 'h100' } as unknown as GameState['projects'][number]
      p.downtime = { kind, fromQuarter: after.quarter - 1, weeks: 10, ...(kind === 'retrofit' ? { toTier: 'mid' } : {}) }
      after.projects.push(p)
      finishDowntimes(after)
      expect(after.log.at(-1)!.key).toBe(`log.${kind}_done`)
      expect(p.downtime).toBeUndefined()
      expect(soundsFor(before, after)).toEqual(['energized'])
    }
  })

  it('stays quiet when a different game is loaded, and uses only sounds that exist', () => {
    expect(soundsFor(newGame(1), newGame(2))).toEqual([])
    expect(soundsFor(null, newGame(1))).toEqual([])
    expect(Object.keys(SOUNDS).length).toBeGreaterThanOrEqual(8)
  })
})
