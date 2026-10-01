// M14.3: the reading score (systems/readingScore.ts), against the design thread's required values.
import { describe, expect, it } from 'vitest'
import type { ScenarioId } from '../../src/content/index.ts'
import type { Act3Move } from '../../src/sim/state.ts'
import {
  computeReading,
  oracleLogs,
} from '../../src/sim/systems/readingScore.ts'

const Q = (label: string) => {
  const [y, n] = label.split('Q').map(Number)
  return (y - 2027) * 4 + (n - 1)
}
const plus = (label: string): Act3Move => ({ q: Q(label), kind: 'project_commit' })
const minus = (label: string): Act3Move => ({ q: Q(label), kind: 'sale_voluntary' })
const score = (moves: Act3Move[], id: ScenarioId, lastQ?: number) =>
  computeReading(moves, id, lastQ).score

describe('the required values (M14.3 table)', () => {
  it('passive (no moves): s0 78, s1 50, s2 50, s3 50', () => {
    expect(['s0', 's1', 's2', 's3'].map((id) => score([], id as ScenarioId))).toEqual([78, 50, 50, 50])
  })

  it('perfect (stance = ideal every quarter): s0 78, s1 100, s2 100, s3 100', () => {
    expect(
      (['s0', 's1', 's2', 's3'] as const).map((id) => score(oracleLogs(id).perfect, id)),
    ).toEqual([78, 100, 100, 100])
  })

  it('opposite (stance = −ideal): s1 0, s2 0, s3 0', () => {
    for (const id of ['s1', 's2', 's3'] as const)
      expect(score(oracleLogs(id).opposite, id), id).toBe(0)
  })

  it('s1, one +1 move in 2027Q2: 34 (44 − the decoy penalty 10)', () => {
    const r = computeReading([plus('2027Q2')], 's1')
    expect(r.base).toBe(44)
    expect(r.penalty).toBe(10)
    expect(r.score).toBe(34)
  })

  it('s1, a +1 stance in 2027Q2–Q4 with 4 moves in the window: 1 (the penalty capped at 30)', () => {
    const r = computeReading(
      [plus('2027Q2'), plus('2027Q2'), plus('2027Q3'), plus('2027Q4')],
      's1',
    )
    expect(r.penalty).toBe(30)
    expect(r.score).toBe(1)
  })

  it('s0, one −1 move in 2027Q4: 63; one +1 move in 2027Q4: 73 (not the decoy sign, no penalty)', () => {
    expect(score([minus('2027Q4')], 's0')).toBe(63)
    const up = computeReading([plus('2027Q4')], 's0')
    expect(up.penalty).toBe(0)
    expect(up.score).toBe(73)
  })

  it('s1 game over after 2028Q2 (lastQ 5): passive 50, perfect 100', () => {
    expect(score([], 's1', 5)).toBe(50)
    expect(score(oracleLogs('s1').perfect, 's1', 5)).toBe(100)
  })

  it('s2 game over after 2027Q2 (lastQ 1): null (no weighted quarter)', () => {
    expect(score([], 's2', 1)).toBeNull()
    expect(score(oracleLogs('s2').perfect, 's2', 1)).toBeNull()
  })

  it('s3 passive with lastQ 3: 50', () => {
    expect(score([], 's3', 3)).toBe(50)
  })
})

describe('the rules', () => {
  it('a quarter’s stance is the sign of the sum of its moves (a tie is 0)', () => {
    const tie = computeReading([plus('2027Q3'), minus('2027Q3')], 's1')
    expect(tie.perQuarter.find((x) => x.q === Q('2027Q3'))!.stance).toBe(0)
    const two = computeReading([plus('2028Q3'), plus('2028Q3'), minus('2028Q3')], 's1')
    expect(two.perQuarter.find((x) => x.q === Q('2028Q3'))!.stance).toBe(1)
  })

  it('quarters after lastQ and weight-0 quarters are not counted; moves after lastQ add no penalty', () => {
    const r = computeReading([plus('2027Q3')], 's1', 0)
    expect(r.score).toBeNull()
    expect(r.penalty).toBe(0)
    expect(computeReading([], 's1').perQuarter.every((x) => x.weight > 0)).toBe(true)
  })
})
