// M22 (design thread, 5 Oct 2026): replaces the estimated SOFR and high-yield spread series in Act II's quarterly market
// with real data, from the raw downloads committed next to this script (tools/data/raw/), so the transform is
// reproducible. Run it with `npm run data:real`, then `npm run content:market`. It never edits anything by hand:
//   SOFR      FRED series SOFR (daily, %)              → sofr_pct      = the quarter's average of the daily values, 2 dp
//   HY spread FRED series BAMLH0A0HYM2 (daily, %)      → hy_spread_bps = the quarter's average × 100, whole bps
// A quarter takes real data only when the download covers all of it (an observation within its first 7 days and one
// on or after its last day − 7 days); every other quarter keeps its estimate. Per row, `sofr_estimate` and
// `hy_spread_estimate` say which series are still estimates; the row's `estimate` stays True while any column in the
// row is one (the GPU, capex, power and multiple columns all still are). Missing days (FRED's "." or empty) are skipped.
// The DDTL spread has no public series and the ASIC $/TH tiers (Luxor's ASIC Price Index) aren't freely available:
// both stay estimates; see tools/data/README.md.
import { readFileSync, writeFileSync } from 'node:fs'

const here = new URL('./', import.meta.url)
const TARGETS = [
  new URL('../../src/content/market_quarterly_act2.csv', here),
  new URL('../../docs/act2-content/market_quarterly.csv', here),
]

/** A FRED graph CSV (observation_date,VALUE) → [date, value] for the days that have a value. */
function readFred(name: string): [string, number][] {
  const lines = readFileSync(new URL(`raw/${name}`, here), 'utf8').trim().split(/\r?\n/)
  return lines
    .slice(1)
    .map((l) => l.split(','))
    .filter(([, v]) => v !== undefined && v !== '' && v !== '.' && !Number.isNaN(Number(v)))
    .map(([d, v]) => [d, Number(v)])
}

/** "2023Q4" → its first and last day (ISO dates). */
function quarterDays(q: string): [string, string] {
  const year = Number(q.slice(0, 4))
  const n = Number(q.slice(5))
  const start = new Date(Date.UTC(year, (n - 1) * 3, 1))
  const end = new Date(Date.UTC(year, n * 3, 0))
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
}

const shift = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The quarter's average, or null if the series doesn't cover the whole quarter. */
function quarterAverage(series: [string, number][], q: string): number | null {
  const [start, end] = quarterDays(q)
  const inQ = series.filter(([d]) => d >= start && d <= end)
  if (inQ.length === 0) return null
  if (inQ[0][0] > shift(start, 7) || inQ[inQ.length - 1][0] < shift(end, -7)) return null
  return inQ.reduce((a, [, v]) => a + v, 0) / inQ.length
}

const SERIES = [
  {
    column: 'sofr_pct',
    flag: 'sofr_estimate',
    data: readFred('fred_SOFR.csv'),
    format: (avg: number) => String(Number(avg.toFixed(2))),
  },
  {
    column: 'hy_spread_bps',
    flag: 'hy_spread_estimate',
    data: readFred('fred_BAMLH0A0HYM2.csv'),
    format: (avg: number) => String(Math.round(avg * 100)),
  },
] as const

const csv = readFileSync(TARGETS[0], 'utf8')
const [headerLine, ...rows] = csv.trim().split(/\r?\n/)
const header = headerLine.split(',')
// The per-series flags go just before the row's `estimate` column (added on the first run).
for (const s of SERIES)
  if (!header.includes(s.flag)) header.splice(header.indexOf('estimate'), 0, s.flag)
const col = (name: string) => header.indexOf(name)
const oldHeader = headerLine.split(',')

const out = rows.map((line) => {
  const old = line.split(',')
  const cells = header.map((h) => {
    const i = oldHeader.indexOf(h)
    return i >= 0 ? (old[i] ?? '') : 'True'
  })
  const q = cells[col('quarter')]
  for (const s of SERIES) {
    const avg = quarterAverage(s.data, q)
    if (avg === null) {
      cells[col(s.flag)] = 'True'
      continue
    }
    cells[col(s.column)] = s.format(avg)
    cells[col(s.flag)] = 'False'
  }
  return cells.join(',')
})

const text = [header.join(','), ...out].join('\n') + '\n'
for (const t of TARGETS) writeFileSync(t, text)
console.log(
  `market_quarterly_act2.csv (and its docs/act2-content copy): ${SERIES.map((s) => `${s.column} real in ${out.filter((r) => r.split(',')[col(s.flag)] === 'False').length} of ${out.length} quarters`).join('; ')}`,
)
