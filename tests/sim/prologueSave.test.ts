// Saves in the prologue (Alpha 0.3 §5): save / reload / export / import in Act 0 and across the
// Act 0 → I boundary. A game saved at any point and loaded again is the same game, and plays on
// to exactly the same end.
import { describe, expect, it } from 'vitest'
import { decodeSave, encodeSave } from '../../src/platform/saves.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { applyStep, playPrologue } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import type { GameState } from '../../src/sim/state.ts'
import { PROLOGUE_BOTS } from '../../tools/prologueBots.ts'

const SEED = 5

/** Export, then import. */
function roundTrip(s: GameState): GameState {
  const r = decodeSave(encodeSave(s))
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('prologue saves (scope §5)', () => {
  const { state: end, log } = playPrologue(
    SEED,
    PROLOGUE_BOTS['careful-hodler'],
    { through: 1 },
  )

  it('export → import gives the same game at every kind of moment, in Act 0 and in Act I', () => {
    const seen = new Set<string>()
    let cur = newPrologueGame(SEED)
    for (const step of log) {
      const kind = `${cur.act}:${cur.phase}${cur.interrupt ? ':card' : ''}`
      if (!seen.has(kind)) {
        seen.add(kind)
        expect(roundTrip(cur), kind).toEqual(cur)
      }
      cur = applyStep(cur, step)
    }
    expect(cur).toEqual(end)
    expect(roundTrip(end)).toEqual(end)
    // The intro, a Plan phase, a live week, a card, a report, the prologue's chapter report, and
    // Act I after the handover.
    for (const kind of [
      '0:intro',
      '0:plan',
      '0:live',
      '0:live:card',
      '0:report',
      '0:chapter',
      '1:plan',
    ])
      expect(seen.has(kind), kind).toBe(true)
  })

  it('a game loaded mid-prologue plays on to the same end', () => {
    const half = Math.floor(log.length / 2)
    let cur = newPrologueGame(SEED)
    for (const step of log.slice(0, half)) cur = applyStep(cur, step)
    let loaded = roundTrip(cur)
    for (const step of log.slice(half)) loaded = applyStep(loaded, step)
    expect(loaded).toEqual(end)
  })

  it('a prologue save without its prologue state is refused', () => {
    const s: Partial<GameState> = structuredClone(newPrologueGame(SEED))
    delete s.prologue
    expect(restoreSave(JSON.parse(JSON.stringify(s))).ok).toBe(false)
  })
})
