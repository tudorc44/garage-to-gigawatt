// The Act II chapter report (M6.3; scope 0.2 §2.13, wireframe A2-09) and the game-over cause
// (M6.4, A2-10's foreclosure variant).
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { playGame } from '../../src/sim/replay.ts'
import { act2ChapterView, gameOverView } from '../../src/sim/selectors.ts'
import { logEntry, type GameState } from '../../src/sim/state.ts'
import { BOTS } from '../../tools/bots.ts'
import { act2Company } from './act2Helpers.ts'

describe('the Act II chapter report', () => {
  const end = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state

  it('ends at 2026Q4 with a title by the end valuation (scope §2.13 bands)', () => {
    expect(end.phase).toBe('chapter')
    const c = act2ChapterView(end)
    const band = BALANCE.act2Chapter.titleBands.find(
      (b) => c.finalValuationUsd >= b.min,
    )!
    expect(c.title).toBe(band.id)
    expect(c.curve[0].quarter).toBe(CONTENT.quarters[0])
    expect(c.curve.at(-1)!.quarter).toBe('2026Q4')
    expect(c.netWorthUsd).toBeCloseTo(end.founderStake * c.finalValuationUsd, 2)
    expect(c.rank!.of).toBe(6) // you and the five Act II rivals
  })

  it('its breakdown adds up to the end valuation', () => {
    const b = act2ChapterView(end).breakdown!
    const sum =
      b.miningEvUsd +
      b.aiEvUsd +
      b.backlogUsd +
      b.constructionUsd +
      b.cashUsd +
      b.treasuryUsd -
      b.debtUsd
    expect(sum).toBeCloseTo(act2ChapterView(end).finalValuationUsd, 0)
  })

  it('its moments count what the log says', () => {
    const m = act2ChapterView(end).moments
    const act2 = end.log.filter(
      (e) => e.quarter >= CONTENT.acts[1].firstQuarter,
    )
    expect(m.projectsLive).toBe(
      act2.filter((e) => e.key === 'log.project_live').length,
    )
    expect(m.tenantsSigned).toBe(
      act2.filter((e) => e.key === 'log.tenant_signed').length,
    )
    expect(m.foreclosures).toBe(
      act2.filter((e) => e.key === 'log.project_foreclosed').length,
    )
  })
})

describe('game over in Act II: its cause', () => {
  const over = (): GameState => ({
    ...act2Company('2025Q2'),
    phase: 'gameover',
    cash: -2_000_000,
  })

  it('out of cash when no lender foreclosed recently', () => {
    const v = gameOverView(over())!
    expect(v.cause).toBe('cash')
    expect(v.shortUsd).toBe(2_000_000)
  })

  it('foreclosure when a lender took a project in the last 4 quarters', () => {
    const s = over()
    logEntry(s, 'log.project_foreclosed', {
      n: 2,
      tier: 'own_site',
      debtUsd: 30_000_000,
    })
    const v = gameOverView(s)!
    expect(v.cause).toBe('foreclosure')
    expect(v.foreclosed).toEqual([
      { n: 2, quarter: '2025Q2', debtUsd: 30_000_000 },
    ])
    expect(act2ChapterView(s).title).toBe('bust')
  })

  it('none while the game goes on, and none for an Act I bust', () => {
    expect(gameOverView(act2Company('2025Q2'))).toBeNull()
    expect(gameOverView({ ...over(), act: 1 })).toBeNull()
  })
})
