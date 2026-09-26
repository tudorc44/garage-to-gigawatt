import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  activeRivals,
  leagueTable,
  upcomingRivals,
  yourRank,
} from '../../src/sim/systems/rivals.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A game with one finished quarter report at `label` with this valuation. */
function withReport(label: string, valuationUsd: number): GameState {
  const s = newGame(1)
  s.quarter = q(label)
  s.reports.push({
    quarter: label,
    valuationUsd,
  } as GameState['reports'][number])
  return s
}

describe('rivals', () => {
  it('join the game when their numbers start (Bitfarms 2017Q3, Core Scientific 2018Q2)', () => {
    expect(activeRivals(q('2017Q1'))).toEqual([])
    expect(activeRivals(q('2017Q3')).map((r) => r.id)).toEqual(['bitfarms'])
    expect(activeRivals(q('2017Q4')).map((r) => r.id)).toEqual([
      'riot',
      'marathon',
      'bitfarms',
    ])
    expect(activeRivals(q('2018Q2'))).toHaveLength(4)
    expect(upcomingRivals(q('2017Q4'))).toEqual([
      { id: 'core', quarter: '2018Q2' },
    ])
  })

  it('reads end-of-quarter numbers from rivals.json (market cap in $)', () => {
    const riot = activeRivals(q('2021Q4')).find((r) => r.id === 'riot')!
    expect(riot.hashrateEhs).toBe(3.1)
    expect(riot.mw).toBe(450)
    expect(riot.valueUsd).toBe(3_000_000_000)
    // Riot is listed in 2017Q4 but doesn't mine until 2018Q1.
    const early = activeRivals(q('2017Q4')).find((r) => r.id === 'riot')!
    expect(early.hashrateEhs).toBeNull()
    expect(early.valueUsd).toBe(330_000_000)
  })
})

describe('league table', () => {
  it('ranks by value; rivals with no public value go last, unranked', () => {
    const s = withReport('2017Q4', 97_800)
    const rows = leagueTable(s, 0)
    expect(rows.map((r) => [r.id, r.rank])).toEqual([
      ['riot', 1],
      ['marathon', 2],
      ['you', 3],
      ['bitfarms', null], // private until 2019Q3
    ])
    expect(yourRank(s, 0)).toEqual({ rank: 3, of: 3 })
  })

  it('a big enough valuation climbs above the rivals', () => {
    const s = withReport('2020Q3', 1_000_000_000)
    expect(yourRank(s, 0)).toEqual({ rank: 1, of: 5 })
  })
})
