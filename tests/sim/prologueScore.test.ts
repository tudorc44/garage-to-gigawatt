// Act I scoring for prologue starts (Alpha 0.3 §2.12, P0-17): the chapter report shows the absolute
// result and the growth multiple on the wealth brought in; title and rank use the multiple.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { playGame, playPrologue } from '../../src/sim/replay.ts'
import { chapterReport } from '../../src/sim/selectors.ts'
import { BOTS } from '../../tools/bots.ts'
import { PROLOGUE_BOTS } from '../../tools/prologueBots.ts'

const bandFor = (usd: number) =>
  CONTENT.merge.titleBands.find((b) => usd >= b.min)?.title ??
  CONTENT.merge.titleBands.at(-1)!.title

describe('Act I scoring for prologue starts', () => {
  it('a prologue start: the growth multiple on its start wealth, and the title a $10K start would get with it', () => {
    const { state } = playPrologue(3, PROLOGUE_BOTS['careful-hodler'], {
      through: 1,
    })
    const c = chapterReport(state)
    expect(c.growth).not.toBeNull()
    const start = state.prologueCarry!.startNetWorthUsd
    expect(c.growth!.startUsd).toBe(start)
    expect(c.growth!.multiple).toBeCloseTo(c.netWorthUsd / start, 9)
    if (!c.bust)
      expect(c.title).toBe(bandFor(c.growth!.multiple * BALANCE.startCash))
  })

  it('a 2017 start is scored as before (no growth multiple)', () => {
    const { state } = playGame(2017, BOTS['cautious'])
    const c = chapterReport(state)
    expect(c.growth).toBeNull()
    if (!c.bust) expect(c.title).toBe(bandFor(c.netWorthUsd))
  })
})
