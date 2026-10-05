// M22: Act II's SOFR and high-yield spread come from FRED (tools/data/real-market.ts over tools/data/raw/). This
// recomputes each quarter's average from the committed raw downloads and checks the game's data matches wherever the
// per-series flag says "real" (so a hand edit, or a CSV not regenerated after a refresh, fails), and that the two CSV
// copies stay byte-identical.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../src/content/index.ts'
import rows from '../src/content/market_quarterly_act2.json' with { type: 'json' }

const raw = (name: string) =>
  readFileSync(new URL(`../tools/data/raw/${name}`, import.meta.url), 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(','))
    .filter(([, v]) => v && v !== '.' && !Number.isNaN(Number(v)))
    .map(([d, v]) => [d, Number(v)] as const)

function average(series: (readonly [string, number])[], q: string): number {
  const y = Number(q.slice(0, 4))
  const n = Number(q.slice(5))
  const start = new Date(Date.UTC(y, (n - 1) * 3, 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(y, n * 3, 0)).toISOString().slice(0, 10)
  const v = series.filter(([d]) => d >= start && d <= end).map(([, x]) => x)
  return v.reduce((a, x) => a + x, 0) / v.length
}

type Row = {
  quarter: string
  sofr_pct: number
  hy_spread_bps: number
  sofr_estimate: boolean
  hy_spread_estimate: boolean
  estimate: boolean
}

describe('real market data (M22)', () => {
  const sofr = raw('fred_SOFR.csv')
  const hy = raw('fred_BAMLH0A0HYM2.csv')
  const data = rows as Row[]

  it('SOFR = FRED SOFR quarterly average (2 dp) for 2022Q4–2026Q3; 2026Q4 still an estimate', () => {
    const real = data.filter((r) => !r.sofr_estimate).map((r) => r.quarter)
    expect(real[0]).toBe('2022Q4')
    expect(real.at(-1)).toBe('2026Q3')
    for (const r of data.filter((x) => !x.sofr_estimate))
      expect(r.sofr_pct, r.quarter).toBe(Number(average(sofr, r.quarter).toFixed(2)))
    expect(data.find((r) => r.quarter === '2026Q4')!.sofr_estimate).toBe(true)
  })

  it('HY spread = FRED BAMLH0A0HYM2 quarterly average × 100 for 2023Q4–2026Q3; the rest still estimates', () => {
    const real = data.filter((r) => !r.hy_spread_estimate).map((r) => r.quarter)
    expect(real).toHaveLength(12)
    expect(real[0]).toBe('2023Q4')
    for (const r of data.filter((x) => !x.hy_spread_estimate))
      expect(r.hy_spread_bps, r.quarter).toBe(Math.round(average(hy, r.quarter) * 100))
  })

  it('every row still says estimate (other columns are), the game reads the real values, the copies match', () => {
    expect(data.every((r) => r.estimate)).toBe(true)
    const i = data.findIndex((r) => r.quarter === '2024Q2')
    expect(CONTENT.act2Market[i].sofrPct).toBe(data[i].sofr_pct)
    const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
    expect(read('../src/content/market_quarterly_act2.csv')).toBe(
      read('../docs/act2-content/market_quarterly.csv'),
    )
  })
})
