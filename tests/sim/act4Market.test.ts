// M27.3 (doc 33 §3.3, §16; act4-scope.md §3): Act IV's market. Four futures, each a generated file pair; 16 glided
// markets (one per Act III scenario × future). The honesty invariants tested here:
// - B14: every market value the UI can show is identical across the four futures in 2031Q1–Q2 and within 3% through
//   2031Q4 (the build makes them identical through 2031Q4);
// - the seam glide starts on the player's Act III scenario's 2030Q4 values and ends on the common baseline;
// - the files hold no hidden truth (orbital reliability, lunar grade).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  FUTURE_IDS,
  SCENARIO_IDS,
  act4GlideWeight,
  actFirstQuarter,
  actLastQuarter,
  quarterInputs,
  quarterRow,
} from '../../src/content/index.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'

const FIRST = actFirstQuarter(4)

/** Every number in an object (one level), by key. */
function numbers(o: object): Record<string, number> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => typeof v === 'number'),
  ) as Record<string, number>
}

function within(a: number, b: number, share: number): boolean {
  if (a === b) return true
  return Math.abs(a - b) <= share * Math.max(Math.abs(a), Math.abs(b))
}

describe('Act IV market (M27.3)', () => {
  it('runs 2031Q1–2035Q4 at quarters 56–75, 13 weeks a quarter, for all 16 scenario × future keys', () => {
    expect(FIRST).toBe(56)
    expect(actLastQuarter(4)).toBe(75)
    for (const s of SCENARIO_IDS)
      for (const f of FUTURE_IDS) {
        const m = CONTENT.act4Markets[`${s}.${f}`]
        expect(m.quarterly).toHaveLength(20)
        expect(m.inputs).toHaveLength(20)
        expect(m.weeks).toHaveLength(20)
        for (const w of m.weeks) expect(w).toHaveLength(13)
      }
  })

  it('B14: every value is identical across the four futures in 2031Q1–Q2 and within 3% through 2031Q4', () => {
    for (const s of SCENARIO_IDS)
      for (let n = 0; n < 4; n++) {
        const share = n < 2 ? 0 : 0.03
        const rows = FUTURE_IDS.map((f) => numbers(CONTENT.act4Markets[`${s}.${f}`].quarterly[n]))
        const weeks = FUTURE_IDS.map((f) => CONTENT.act4Markets[`${s}.${f}`].weeks[n])
        for (const [k, v] of Object.entries(rows[0]))
          for (const other of rows.slice(1)) expect(within(v, other[k], share), `${s} n${n} ${k}`).toBe(true)
        for (let w = 0; w < 13; w++) {
          const base = numbers(weeks[0][w])
          for (const other of weeks.slice(1))
            for (const [k, v] of Object.entries(base))
              expect(within(v, numbers(other[w])[k], share), `${s} n${n} w${w} ${k}`).toBe(true)
        }
      }
  })

  it('the seam glide: 2031Q1 is the Act III scenario’s 2030Q4 value, 2031Q4 the common baseline (the future’s own file)', () => {
    expect(act4GlideWeight(0)).toBe(0)
    expect(act4GlideWeight(3)).toBe(1)
    for (const s of SCENARIO_IDS) {
      const last = numbers(CONTENT.act3Scenarios[s].quarterly.at(-1)!)
      for (const f of FUTURE_IDS) {
        const glided = CONTENT.act4Markets[`${s}.${f}`].quarterly
        const own = CONTENT.act4Futures[f].quarterly
        // quarter 0: every column both acts carry starts at the scenario's 2030Q4 value
        for (const [k, v] of Object.entries(numbers(glided[0])))
          if (k in last) expect(v, `${s}.${f} ${k}`).toBeCloseTo(last[k], 9)
        // quarter 3 (2031Q4) onwards: the future's own file, which is the common baseline in 2031
        for (let n = 3; n < 20; n++) expect(glided[n]).toEqual(own[n])
        expect(own[3]).toEqual({ ...CONTENT.act4Futures.f1.quarterly[3], future: f })
      }
    }
  })

  it('the carried systems read Act IV prices through a scenario and future key, never without one', () => {
    const q = FIRST + 4
    expect(() => marketWeek(q, 0)).toThrow(RangeError)
    expect(() => marketWeek(q, 0, 's1')).toThrow(RangeError)
    expect(marketWeek(q, 0, 's1.f2')).toBe(CONTENT.act4Markets['s1.f2'].weeks[4][0])
    expect(quarterInputs(q, 's1.f2')).toBe(CONTENT.act4Markets['s1.f2'].inputs[4])
    expect(quarterRow(q, 's1.f2')).toBe(CONTENT.act4Markets['s1.f2'].quarterly[4])
    // Act III reads are unchanged: an Act III quarter through an Act IV key reads its own Act III scenario
    expect(quarterRow(FIRST - 1, 's1.f2')).toBe(CONTENT.act3Scenarios.s1.quarterly.at(-1))
  })

  it('the futures diverge after 2031 (their own designed paths), and Bitcoin halves in 2032Q2 in every future', () => {
    const launch = (f: (typeof FUTURE_IDS)[number], n: number) => CONTENT.act4Futures[f].quarterly[n].launch_usd_kg_leo
    expect(launch('f1', 19)).toBe(150)
    expect(launch('f2', 19)).toBe(600)
    expect(launch('f3', 19)).toBe(350)
    expect(launch('f4', 19)).toBe(350)
    for (const f of FUTURE_IDS) {
      const rows = CONTENT.act4Futures[f].quarterly
      expect(rows[4].btc_block_subsidy).toBe(1.5625)
      expect(rows[5].btc_block_subsidy).toBe(0.78125)
    }
  })

  it('the files hold no hidden truth: no failure rate, useful life or lunar grade column', () => {
    for (const f of FUTURE_IDS)
      for (const name of [`market_iv_${f}.csv`, `market_weekly_iv_${f}.csv`]) {
        const header = readFileSync(new URL(`../../src/content/${name}`, import.meta.url), 'utf8').split('\n')[0]
        expect(header, name).not.toMatch(/fail|life|grade|truth|trigger|decoy|phase|scenario/i)
      }
  })
})
