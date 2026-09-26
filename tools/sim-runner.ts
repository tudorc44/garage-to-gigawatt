// Sim-runner: plays every bot strategy over many seeds, writes one CSV per run and a
// summary. For balance checks, not for players.
//   npm run sim                      (50 seeds, output in sim-output/)
//   npm run sim -- --seeds 10 --out some/folder
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT } from '../src/content/index.ts'
import { playGame } from '../src/sim/replay.ts'
import type { QuarterReport } from '../src/sim/state.ts'
import { BOTS } from './bots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '50'))
const OUT = argValue('--out', 'sim-output')

const RUN_COLUMNS = [
  'quarter',
  'cash',
  'treasury_value',
  'hashrate_btc_ths',
  'hashrate_eth_mhs',
  'revenue',
  'ebitda',
  'valuation',
  'price_alerts',
  'forced_sale',
] as const

function runCsv(reports: QuarterReport[]): string {
  const rows = reports.map((r) =>
    [
      r.quarter,
      r.cash.toFixed(2),
      r.treasuryValueUsd.toFixed(2),
      r.hashrate.BTC.toFixed(2),
      r.hashrate.ETH.toFixed(2),
      r.revenueUsd.toFixed(2),
      r.ebitdaUsd.toFixed(2),
      r.valuationUsd.toFixed(2),
      r.priceAlerts,
      r.forcedSale ? 1 : 0,
    ].join(','),
  )
  return [RUN_COLUMNS.join(','), ...rows].join('\n') + '\n'
}

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
const usd = (n: number) =>
  Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)

interface StrategySummary {
  strategy: string
  runs: number
  busts: number
  bustQuarters: string[]
  endValuations: number[]
  peakValuations: number[]
  peakQuarters: string[]
  /** alertsByQuarter[q] = total price alerts in that quarter across all runs */
  alertsByQuarter: number[]
  quartersPlayed: number
}

const started = performance.now()
mkdirSync(OUT, { recursive: true })
const summaries: StrategySummary[] = []

for (const [name, bot] of Object.entries(BOTS)) {
  const sum: StrategySummary = {
    strategy: name,
    runs: 0,
    busts: 0,
    bustQuarters: [],
    endValuations: [],
    peakValuations: [],
    peakQuarters: [],
    alertsByQuarter: CONTENT.quarters.map(() => 0),
    quartersPlayed: 0,
  }
  for (let seed = 1; seed <= SEEDS; seed++) {
    const { state } = playGame(seed, bot)
    const reports = state.reports
    writeFileSync(join(OUT, `${name}-seed${seed}.csv`), runCsv(reports))

    sum.runs++
    sum.quartersPlayed += reports.length
    if (state.phase === 'gameover') {
      sum.busts++
      sum.bustQuarters.push(reports.at(-1)!.quarter)
    }
    sum.endValuations.push(reports.at(-1)!.valuationUsd)
    const peak = reports.reduce((a, b) =>
      b.valuationUsd > a.valuationUsd ? b : a,
    )
    sum.peakValuations.push(peak.valuationUsd)
    sum.peakQuarters.push(peak.quarter)
    reports.forEach((r, i) => (sum.alertsByQuarter[i] += r.priceAlerts))
  }
  summaries.push(sum)
}

// ---------- summary ----------

const mostCommon = (xs: string[]) => {
  const counts = new Map<string, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}
const summaryRows = summaries.map((s) => {
  const busts = [...s.bustQuarters].sort()
  const alertsTotal = s.alertsByQuarter.reduce((a, b) => a + b, 0)
  return {
    strategy: s.strategy,
    runs: s.runs,
    bust_rate: s.busts / s.runs,
    first_bust: busts[0] ?? '',
    median_bust: busts.length ? busts[Math.floor(busts.length / 2)] : '',
    median_end_valuation: median(s.endValuations),
    median_peak_valuation: median(s.peakValuations),
    usual_peak_quarter: mostCommon(s.peakQuarters),
    alerts_per_quarter: alertsTotal / s.quartersPlayed,
  }
})
const header = Object.keys(summaryRows[0]).join(',')
writeFileSync(
  join(OUT, 'summary.csv'),
  [header, ...summaryRows.map((r) => Object.values(r).join(','))].join('\n') +
    '\n',
)

console.log(
  `\nSim-runner: ${SEEDS} seeds × ${summaries.length} strategies (${((performance.now() - started) / 1000).toFixed(1)} s). CSVs in ${OUT}/\n`,
)
console.table(
  summaryRows.map((r) => ({
    strategy: r.strategy,
    'bust rate': `${(r.bust_rate * 100).toFixed(0)}%`,
    'busts (first / median)': r.first_bust
      ? `${r.first_bust} / ${r.median_bust}`
      : '—',
    'median end valuation': usd(r.median_end_valuation),
    'median peak (usual quarter)': `${usd(r.median_peak_valuation)} (${r.usual_peak_quarter})`,
    'alerts / quarter': r.alerts_per_quarter.toFixed(2),
  })),
)

console.log('Price alerts per quarter (average per run, all strategies):')
const runsTotal = summaries.reduce((a, s) => a + s.runs, 0)
const line = CONTENT.quarters.map((q, i) => {
  const total = summaries.reduce((a, s) => a + s.alertsByQuarter[i], 0)
  return `${q} ${(total / runsTotal).toFixed(2)}`
})
for (let i = 0; i < line.length; i += 6)
  console.log('  ' + line.slice(i, i + 6).join('  '))
