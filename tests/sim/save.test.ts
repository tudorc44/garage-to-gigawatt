import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame, replay } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  decodeSave,
  encodeSave,
  readSlot,
  writeSlot,
} from '../../src/platform/saves.ts'
import { BOTS } from '../../tools/bots.ts'

/** Plays on to the end of the current quarter (default answers to alerts). */
function finishQuarter(s: GameState): GameState {
  while (s.phase === 'live') {
    if (s.interrupt) {
      const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      s = r.ok ? r.state : s
      if (s.interrupt) s = { ...s, interrupt: null }
    } else s = advance(s)
  }
  return s
}

describe('saves (scope §2.13)', () => {
  it('a mid-quarter save, loaded, plays on exactly like the original', () => {
    const { state: end, log } = playGame(7, BOTS['raise-climb'])
    // A busy mid-live state: the bot's game stopped after its 200th week (2020Q4, mid-quarter).
    let weeks = 0
    const cut = log.findIndex((st) => st.type === 'ADVANCE' && ++weeks === 200)
    const s = replay(7, log.slice(0, cut + 1))
    expect(s.phase).toBe('live')
    expect(s.machines.length).toBeGreaterThan(0)
    const text = encodeSave(s)
    const loaded = decodeSave(text)
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.state).toEqual(s)
    expect(finishQuarter(loaded.state)).toEqual(finishQuarter(s))
    // A whole finished game survives the round trip too.
    const whole = decodeSave(encodeSave(end))
    expect(whole.ok && whole.state).toEqual(end)
  })

  it('fills in fields added after the save was made', () => {
    const old = JSON.parse(JSON.stringify(newGame(3)))
    delete old.staff
    delete old.marketRead
    delete old.mergeChoice
    delete old.quarterStats.salariesUsd
    delete old.events.eligibleQuarters
    const r = restoreSave(old)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.staff).toEqual({})
    expect(r.state.marketRead).toBeNull()
    expect(r.state.mergeChoice).toBeNull()
    expect(r.state.quarterStats.salariesUsd).toBe(0)
    expect(r.state.events.eligibleQuarters).toBe(0)
  })

  it('refuses things that are not saves, with a reason', () => {
    expect(decodeSave('hello').ok).toBe(false)
    expect(decodeSave('G2G1.not-base64!').ok).toBe(false)
    const cut = encodeSave(newGame(1)).slice(0, 40)
    expect(decodeSave(cut).ok).toBe(false)
    const future = restoreSave({ ...newGame(1), version: 2 })
    expect(!future.ok && future.error.key).toBe('error.save_version')
    expect(restoreSave([1, 2]).ok).toBe(false)
  })

  it('slots fail softly where there is no browser storage', () => {
    expect(writeSlot('manual', newGame(1))).toBe(false)
    expect(readSlot('manual')).toBeNull()
  })
})
