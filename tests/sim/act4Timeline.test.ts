// M27.5 (doc 33 §2, §10, §19 step 2): the walking skeleton plays. An Act IV company runs its 20 quarters (2031Q1–2035Q4)
// with the ground systems of Acts II–III running on Act IV's market, then reaches the chapter phase with its end record.
import { describe, expect, it, vi } from 'vitest'
// (Each test plays Act III then Act IV: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT, FUTURE_IDS, actFirstQuarter, actLastQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { BOTS } from '../../tools/bots.ts'
import { act4Company } from './act4Helpers.ts'

const ACT4 = CONTENT.quarters.slice(actFirstQuarter(4), actLastQuarter(4) + 1)

describe('Act IV runs its 20 quarters, then the chapter phase (M27.5)', () => {
  it('is 2031Q1 → 2035Q4', () => {
    expect(ACT4).toHaveLength(20)
    expect(ACT4[0]).toBe('2031Q1')
    expect(ACT4.at(-1)).toBe('2035Q4')
  })

  it.each(FUTURE_IDS)('future %s: an empty plan plays every quarter to the chapter phase, with the end record', (f) => {
    const start = act4Company('s0', f)
    const entryReports = start.reports.length
    const run = playFrom(start, { plan: () => [] }, { through: 4 })
    expect(['chapter', 'gameover']).toContain(run.state.phase)
    expect(run.state.act).toBe(4)
    const played = run.state.reports.slice(entryReports).map((r) => r.quarter)
    if (run.state.phase === 'chapter') {
      expect(played).toEqual(ACT4)
      expect(run.state.act4End).toMatchObject({ futureId: f, endQuarter: '2035Q4', gameOver: false })
    } else {
      expect(run.state.act4End).toMatchObject({ futureId: f, gameOver: true })
    }
    // same seed + same plan → the same game (replaying the log gives the same end state)
    expect(playFrom(act4Company('s0', f), { plan: () => [] }, { through: 4 }).state).toEqual(run.state)
  }, 0)

  it('the ground systems run in Act IV: a bot that signs and builds plays 2031–2035 on every future without errors', () => {
    for (const f of FUTURE_IDS) {
      const run = playFrom(act4Company('s2', f, 3), BOTS['sign-then-raise'], { through: 4 })
      expect(['chapter', 'gameover'], f).toContain(run.state.phase)
      expect(run.state.act).toBe(4)
      // its reports carry the Act III blocks Act IV keeps: political capital and the covenant
      const last = run.state.reports.at(-1)!
      expect(last.politicalCapital, f).toBeTypeOf('number')
      expect(last.creditRating, f).toBeTypeOf('string')
    }
  }, 0)
})
