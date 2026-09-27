// Act II rivals and the league (M6.2; scope 0.2 §2.11; rivals_act2.json): the five scripted rivals
// replace Act I's from 2022Q4, ranked by value with you; their key moves; a passed RFP goes to one.
import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { hasText } from '../../src/i18n/t.ts'
import {
  activeRivals,
  leagueTable,
  rivalMoves,
} from '../../src/sim/systems/rivals.ts'
import type { GameState } from '../../src/sim/state.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('the Act II rivals', () => {
  it('five from 2022Q4 (Act I’s four until 2022Q3), with AI and mining MW', () => {
    expect(activeRivals(actLastQuarter(1)).map((r) => r.id)).not.toContain(
      'coreweave',
    )
    const act2 = activeRivals(q('2024Q2'))
    expect(act2.map((r) => r.id)).toEqual([
      'core_scientific',
      'iren',
      'hut8',
      'cipher',
      'coreweave',
    ])
    const core = act2[0]
    expect(core).toMatchObject({ mw: 700, aiMw: 200, miningMw: 500 })
    expect(core.valueUsd).toBe(4_000_000_000)
  })

  it('2026Q4 holds 2026Q3’s numbers (the data ends there)', () => {
    const [a, b] = [q('2026Q3'), q('2026Q4')].map((x) =>
      activeRivals(x).find((r) => r.id === 'coreweave'),
    )
    expect(b).toEqual(a)
  })

  it('the league ranks you with them by value', () => {
    const s: GameState = act2Company('2025Q1')
    s.reports.push({
      quarter: '2025Q1',
      valuationUsd: 3_000_000_000,
    } as GameState['reports'][number])
    const rows = leagueTable(s, 0)
    expect(rows).toHaveLength(6)
    expect(rows[0].id).toBe('coreweave')
    const you = rows.find((r) => r.id === 'you')!
    // Above Hut 8 ($3.0B vs $3.0B tie goes by order) and Cipher ($2.5B); below IREN ($3.9B) and Core ($3.4B).
    expect(you.rank).toBeGreaterThanOrEqual(3)
    expect(you.rank).toBeLessThanOrEqual(5)
  })

  it('every key move has its text, and the report lists them by quarter', () => {
    for (const r of CONTENT.act2Rivals)
      for (const m of r.moves)
        expect(hasText(`rival_move.${r.id}.${m}`), `${r.id} ${m}`).toBe(true)
    expect(rivalMoves(q('2024Q2')).map((m) => m.rival)).toEqual([
      'core_scientific',
      'coreweave',
    ])
    expect(rivalMoves(q('2021Q1'))).toEqual([])
  })
})
