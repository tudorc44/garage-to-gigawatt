// Sim-runner: plays every bot strategy over many seeds, writes one CSV per run and a
// summary. For balance checks, not for players.
//   npm run sim                      (50 seeds, output in sim-output/)
//   npm run sim -- --seeds 10 --out some/folder
//   npm run sim -- --act2            (also plays a few bots on through Act II, to 2026Q4)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT, actLastQuarter } from '../src/content/index.ts'
import { playGame } from '../src/sim/replay.ts'
import type {
  ContractType,
  GameState,
  QuarterReport,
} from '../src/sim/state.ts'
import { marketWeek } from '../src/sim/systems/market.ts'
import { mineWeek } from '../src/sim/systems/mining.ts'
import { normalPriceUsdKwh, poweredKw } from '../src/sim/systems/sites.ts'
import { mwByUse } from '../src/sim/systems/mwUse.ts'
import { eraMultiple } from '../src/sim/systems/valuation.ts'
import { BOTS, PROBES } from './bots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '50'))
const OUT = argValue('--out', 'sim-output')
/** Target B1: the cash a small unit needs. */
const B1_CASH = 35_000

const RUN_COLUMNS = [
  'quarter',
  'cash',
  'treasury_value',
  'hashrate_btc_ths',
  'hashrate_eth_mhs',
  'revenue',
  'ebitda',
  'valuation',
  'founder_stake',
  'price_alerts',
  'forced_sale',
  'heat',
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
      r.founderStake.toFixed(4),
      r.priceAlerts,
      r.forcedSale ? 1 : 0,
      r.heat.toFixed(1),
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
/** Median of quarter labels ("2018Q3"), which sort correctly as text. */
const medianLabel = (xs: string[]) =>
  xs.length ? [...xs].sort()[Math.floor(xs.length / 2)] : ''
const usd = (n: number) =>
  Number.isNaN(n)
    ? '—'
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
const counts = (xs: string[]) => {
  const m = new Map<string, number>()
  for (const x of [...xs].sort()) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m].map(([k, n]) => `${k} ×${n}`).join(', ')
}

interface Run {
  seed: number
  state: GameState
}

interface StrategySummary {
  strategy: string
  runs: Run[]
}

/** First quarter a run's cash reached `usd`, or null. */
const firstCashAt = (r: Run, amount: number) =>
  r.state.reports.find((x) => x.cash >= amount)?.quarter ?? null

/** Quarter the run's first small unit was powered, from the game log (it may have been left since), or null. */
function smallUnitPowered(r: Run): string | null {
  const e = r.state.log.find(
    (x) => x.key === 'log.site_ready' && x.params?.tier === 'small_unit',
  )
  return e ? CONTENT.quarters[e.quarter] : null
}

const started = performance.now()
mkdirSync(OUT, { recursive: true })

function runAll(
  strategies: Record<string, (typeof BOTS)[string]>,
  csv: boolean,
) {
  return Object.entries(strategies).map(([name, bot]): StrategySummary => {
    const runs: Run[] = []
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { state } = playGame(seed, bot)
      if (csv)
        writeFileSync(
          join(OUT, `${name}-seed${seed}.csv`),
          runCsv(state.reports),
        )
      runs.push({ seed, state })
    }
    return { strategy: name, runs }
  })
}

/**
 * Power contract renewals across the runs: how many, and the price signed vs the site's
 * normal price that quarter (read from the log; first contracts at power-on are left out).
 */
function renewalStats(runs: Run[]) {
  const ratios: number[] = []
  let deals = 0
  let walked = 0
  for (const r of runs) {
    for (const e of r.state.log) {
      if (e.key === 'log.negotiation_deal') deals++
      if (e.key === 'log.negotiation_they_walked') walked++
      if (e.key !== 'log.contract_signed') continue
      const site = r.state.sites.find((x) => x.tier === e.params!.tier)
      if (!site || site.readyQuarter === e.quarter) continue
      const price = Number(String(e.params!.price).replace('¢', '')) / 100
      const type = e.params!.contract as ContractType
      ratios.push(price / normalPriceUsdKwh(site, e.quarter, type))
    }
  }
  return {
    renewals: ratios.length,
    renewal_price_vs_normal: ratios.length
      ? ratios.reduce((a, b) => a + b, 0) / ratios.length
      : 0,
    negotiated_deals: deals,
    utility_walked: walked,
  }
}

/**
 * Investor pitches across the runs (read from the log): pitches started, deals, walk-aways
 * (either side), the valuation signed vs capital.json's pre-money, and when the seed closed.
 */
function pitchStats(runs: Run[]) {
  let pitches = 0
  let deals = 0
  let walkaways = 0
  const vsTerms: number[] = []
  const seedClosed: string[] = []
  // Stake gained on the rounds it raised vs taking them at capital.json's terms, in points
  // (leaves out path effects like raising an extra round the taker never reached).
  let gainPoints = 0
  for (const r of runs) {
    let keptVsTerms = 1
    for (const e of r.state.log) {
      if (e.key === 'log.raised') {
        const step = CONTENT.ladder[String(e.params!.round)]
        keptVsTerms *= (1 - Number(e.params!.dilutionPct)) / (1 - step.dilution)
      }
      if (e.key === 'log.pitch_started') pitches++
      if (e.key.startsWith('log.pitch_') && e.key.includes('walked'))
        walkaways++
      if (e.key === 'log.pitch_deal') {
        deals++
        const pre = CONTENT.ladder[String(e.params!.round)].pre_money_usd!
        vsTerms.push(Number(e.params!.preMoneyUsd) / pre)
      }
      if (e.key === 'log.raised' && e.params?.round === 'seed')
        seedClosed.push(CONTENT.quarters[e.quarter])
    }
    gainPoints += r.state.founderStake * (1 - 1 / keptVsTerms) * 100
  }
  return {
    pitches,
    pitch_deals: deals,
    pitch_walkaways: walkaways,
    pitch_valuation_vs_terms: vsTerms.length
      ? vsTerms.reduce((a, b) => a + b, 0) / vsTerms.length
      : 0,
    pitch_stake_gain_points: gainPoints / runs.length,
    seed_closed: seedClosed.length
      ? `${medianLabel(seedClosed)} (${seedClosed.length}/${runs.length})`
      : '',
  }
}

/**
 * Event cards across the runs (from the log): random cards per eligible quarter, how many runs
 * saw each card, and whether scripted cards fired whenever they could.
 */
function eventStats(runs: Run[]) {
  const perCard: Record<string, number> = {}
  let randomCards = 0
  let eligibleQuarters = 0
  let doubleQuarters = 0
  for (const r of runs) {
    const seen = new Set<string>()
    const perQuarter: Record<number, number> = {}
    for (const e of r.state.log) {
      if (e.key !== 'log.event_choice' && e.key !== 'log.event_choice_cash')
        continue
      const id = String(e.params!.eventTitle).replace(/\.title$/, '')
      seen.add(id)
      if (CONTENT.events.byId[id]?.type === 'random') {
        randomCards++
        perQuarter[e.quarter] = (perQuarter[e.quarter] ?? 0) + 1
      }
    }
    for (const id of seen) perCard[id] = (perCard[id] ?? 0) + 1
    doubleQuarters += Object.values(perQuarter).filter((n) => n > 1).length
    eligibleQuarters += r.state.events.eligibleQuarters
  }
  return {
    random_cards_per_quarter: eligibleQuarters
      ? randomCards / eligibleQuarters
      : 0,
    double_random_quarters: doubleQuarters,
    cards_seen: perCard,
  }
}

/** Failure waves across the runs: per game, and busts in a quarter that had a wave. */
function waveStats(runs: Run[]) {
  const isWave = (k: string) => k.startsWith('log.failure_wave_')
  const perRun = runs.map(
    (r) => r.state.log.filter((e) => isWave(e.key)).length,
  )
  const bustWithWave = runs.filter((r) => {
    if (r.state.phase !== 'gameover') return false
    const last = r.state.quarter
    return r.state.log.some((e) => e.quarter === last && isWave(e.key))
  }).length
  return {
    waves_per_run: perRun.reduce((a, b) => a + b, 0) / runs.length,
    median_waves: median(perRun),
    busts_in_wave_quarter: bustWithWave,
  }
}

/** A quarter's valuation split: operations (EBITDA × 4 × the era multiple), cash, coins, debt. */
function valuationSplit(r: QuarterReport) {
  const multiple = eraMultiple(CONTENT.quarters.indexOf(r.quarter))
  const ops = Math.max(0, r.ebitdaUsd * 4) * multiple
  // Coins include pledged collateral, as in the valuation itself.
  const coins = r.valuationUsd - ops - r.cash + r.debtUsd
  return { ops, cash: r.cash, coins, debt: r.debtUsd }
}

/**
 * Idle share at the Merge (design thread E1): energized kW not hashing in the last week of
 * 2022Q3 (switched off, broken or empty), over all energized kW. null for a bust run.
 */
function idleShare(r: Run): number | null {
  const s = r.state
  if (s.phase === 'gameover') return null
  const q = actLastQuarter(1)
  const energized = s.sites.reduce((a, x) => a + poweredKw(x, q), 0)
  if (energized === 0) return null
  const lots = new Map(s.machines.map((l) => [l.id, l]))
  const hashing = mineWeek(s, marketWeek(q, 12))
    .filter((w) => w.running)
    .reduce(
      (a, w) =>
        a +
        w.working *
          CONTENT.machines.find((m) => m.id === lots.get(w.lotId)!.model)!
            .power_kw,
      0,
    )
  return Math.max(0, 1 - hashing / energized)
}

/** Lowest quarter-end cash in 2018–2019 over the seed round's amount (runs that took the seed). */
function seedCashFloor(r: Run): number | null {
  if (!r.state.raisesDone.includes('seed')) return null
  const floor = Math.min(
    ...r.state.reports
      .filter((x) => x.quarter >= '2018Q1' && x.quarter <= '2019Q4')
      .map((x) => x.cash),
  )
  return floor / CONTENT.ladder.seed.amount_usd
}

const summaries = runAll(BOTS, true)
const probes = runAll(PROBES, false)

// ---------- per-strategy summary ----------

const summaryRows = summaries.map(({ strategy, runs }) => {
  const busts = runs.filter((r) => r.state.phase === 'gameover')
  const bustQuarters = busts.map((r) => r.state.reports.at(-1)!.quarter)
  const endValuations = runs.map((r) => r.state.reports.at(-1)!.valuationUsd)
  const peaks = runs.map((r) =>
    r.state.reports.reduce((a, b) => (b.valuationUsd > a.valuationUsd ? b : a)),
  )
  // Runs that reached the Merge: drawdown from peak, and the valuation splits.
  const merged = runs.filter((r) => r.state.phase !== 'gameover')
  const peakSplits = merged.map((r) =>
    valuationSplit(
      r.state.reports.reduce((a, b) =>
        b.valuationUsd > a.valuationUsd ? b : a,
      ),
    ),
  )
  const mergeSplits = merged.map((r) => valuationSplit(r.state.reports.at(-1)!))
  // Texas's share of EBITDA in the peak quarter (runs that built Texas; design thread check 3).
  const texasShares = runs
    .filter((r) => r.state.sites.some((x) => x.tier === 'texas_site'))
    .map((r) => {
      const p = r.state.reports.reduce((a, b) =>
        b.valuationUsd > a.valuationUsd ? b : a,
      )
      return p.ebitdaUsd > 0
        ? (p.marginByTier?.texas_site ?? 0) / p.ebitdaUsd
        : 0
    })
  const drawdowns = merged.map((r) => {
    const peak = Math.max(...r.state.reports.map((x) => x.valuationUsd))
    return peak > 0 ? r.state.reports.at(-1)!.valuationUsd / peak - 1 : 0
  })
  const idle = runs.map(idleShare).filter((x): x is number => x !== null)
  const floors = runs.map(seedCashFloor).filter((x): x is number => x !== null)
  const splitMedians = (xs: ReturnType<typeof valuationSplit>[]) => ({
    ops: median(xs.map((x) => x.ops)),
    cash: median(xs.map((x) => x.cash)),
    coins: median(xs.map((x) => x.coins)),
    debt: median(xs.map((x) => x.debt)),
  })
  const powered = runs
    .map(smallUnitPowered)
    .filter((q): q is string => q !== null)
  const quartersPlayed = runs.reduce((a, r) => a + r.state.reports.length, 0)
  const alerts = runs.reduce(
    (a, r) => a + r.state.reports.reduce((b, x) => b + x.priceAlerts, 0),
    0,
  )
  const logCount = (key: string) =>
    runs.reduce(
      (a, r) => a + r.state.log.filter((e) => e.key === key).length,
      0,
    )
  // First quarter-end report with the hottest site at Heat 50 or more (rate-hike level).
  const heat50 = runs
    .map((r) => r.state.reports.find((x) => x.heat >= 50)?.quarter)
    .filter((q): q is string => q !== undefined)
  return {
    strategy,
    runs: runs.length,
    bust_rate: busts.length / runs.length,
    bust_quarters: counts(bustQuarters),
    median_bust: medianLabel(bustQuarters),
    median_end_valuation: median(endValuations),
    median_peak_valuation: median(peaks.map((p) => p.valuationUsd)),
    usual_peak_quarter: medianLabel(peaks.map((p) => p.quarter)),
    median_founder_stake: median(runs.map((r) => r.state.founderStake)),
    small_unit_powered: powered.length
      ? `${medianLabel(powered)} (${powered.length}/${runs.length} runs)`
      : '',
    alerts_per_quarter: alerts / quartersPlayed,
    auctions_won_per_run: logCount('log.auction_won') / runs.length,
    auctions_lost_per_run: logCount('log.auction_lost') / runs.length,
    heat50_runs: heat50.length,
    heat50_first: medianLabel(heat50),
    shutdown_runs: runs.filter((r) =>
      r.state.log.some((e) => e.key === 'log.heat_shutdown'),
    ).length,
    complaints_per_run:
      (logCount('log.complaint_paid') + logCount('log.complaint_ignored')) /
      runs.length,
    rate_hikes_per_run: logCount('log.rate_hike') / runs.length,
    outreach_per_run: logCount('log.outreach') / runs.length,
    median_drawdown: median(drawdowns),
    texas_share_runs: texasShares.length,
    median_texas_share: median(texasShares),
    texas_share_25_runs: texasShares.filter((x) => x >= 0.25).length,
    peak_split: splitMedians(peakSplits),
    merge_split: splitMedians(mergeSplits),
    idle_runs: idle.length,
    idle_10pct_runs: idle.filter((x) => x >= 0.1).length,
    median_idle_share: median(idle),
    seed_floor_runs: floors.length,
    median_seed_cash_floor: median(floors),
    seed_floor_under_half: floors.filter((x) => x < 0.5).length,
    ipo_runs: runs.filter((r) => r.state.raisesDone.includes('ipo_spac'))
      .length,
    texas_runs: runs.filter((r) =>
      r.state.sites.some((x) => x.tier === 'texas_site'),
    ).length,
    ...renewalStats(runs),
    ...pitchStats(runs),
    ...eventStats(runs),
    ...waveStats(runs),
  }
})
const csvRows = summaryRows.map((r) => {
  const row: Partial<typeof r> = { ...r }
  delete row.cards_seen // a table, printed below; not a CSV column
  delete row.peak_split // printed below
  delete row.merge_split
  return row
})
const header = Object.keys(csvRows[0]).join(',')
writeFileSync(
  join(OUT, 'summary.csv'),
  [header, ...csvRows.map((r) => Object.values(r).join(','))].join('\n') + '\n',
)

console.log(
  `\nSim-runner: ${SEEDS} seeds × ${summaries.length} strategies + ${probes.length} probe (${((performance.now() - started) / 1000).toFixed(1)} s). CSVs in ${OUT}/\n`,
)
console.table(
  summaryRows.map((r) => ({
    strategy: r.strategy,
    'bust rate': `${(r.bust_rate * 100).toFixed(0)}%`,
    'median bust': r.median_bust || '—',
    'median end value': usd(r.median_end_valuation),
    'median peak (quarter)': `${usd(r.median_peak_valuation)} (${r.usual_peak_quarter})`,
    'founder stake': `${(r.median_founder_stake * 100).toFixed(0)}%`,
    'small unit powered': r.small_unit_powered || '—',
    'alerts / q': r.alerts_per_quarter.toFixed(2),
    'auctions won/lost': `${r.auctions_won_per_run.toFixed(1)} / ${r.auctions_lost_per_run.toFixed(1)}`,
  })),
)
for (const r of summaryRows) {
  if (r.bust_quarters)
    console.log(`  ${r.strategy} busts by quarter: ${r.bust_quarters}`)
}

console.log('\nCommunity Heat (hottest site at each quarter end):')
console.table(
  summaryRows
    .filter((r) => r.heat50_runs > 0 || r.complaints_per_run > 0)
    .map((r) => ({
      strategy: r.strategy,
      'reached Heat 50': `${r.heat50_runs}/${r.runs} runs${r.heat50_first ? ` (median first ${r.heat50_first})` : ''}`,
      'shutdown (90)': `${r.shutdown_runs}/${r.runs} runs`,
      'complaints / run': r.complaints_per_run.toFixed(1),
      'rate hikes / run': r.rate_hikes_per_run.toFixed(1),
      'outreach / run': r.outreach_per_run.toFixed(1),
    })),
)

console.log(
  '\nPower contract renewals (price signed vs the normal price at the time):',
)
console.table(
  summaryRows
    .filter((r) => r.renewals > 0)
    .map((r) => ({
      strategy: r.strategy,
      'renewals / run': (r.renewals / r.runs).toFixed(1),
      'price vs normal': `${(r.renewal_price_vs_normal * 100).toFixed(1)}%`,
      'negotiated deals': r.negotiated_deals,
      'utility walked': r.utility_walked,
    })),
)

console.log('\nInvestor pitches (seed and Series A):')
console.table(
  summaryRows
    .filter((r) => r.seed_closed)
    .map((r) => ({
      strategy: r.strategy,
      'pitches / run': (r.pitches / r.runs).toFixed(2),
      'walk-aways': r.pitches
        ? `${r.pitch_walkaways} (${((r.pitch_walkaways / r.pitches) * 100).toFixed(0)}% of pitches)`
        : '—',
      'valuation vs terms': r.pitch_deals
        ? `${(r.pitch_valuation_vs_terms * 100).toFixed(1)}%`
        : '—',
      'seed closed (median)': r.seed_closed,
      'founder stake': `${(r.median_founder_stake * 100).toFixed(1)}%`,
      'stake vs terms': `${r.pitch_stake_gain_points >= 0 ? '+' : ''}${r.pitch_stake_gain_points.toFixed(1)} pts`,
      'bust rate': `${(r.bust_rate * 100).toFixed(0)}%`,
    })),
)
{
  // Same seeds, pitching vs taking every opening: the design thread's targets.
  const taker = summaries.find((x) => x.strategy === 'raise-climb')
  for (const pitcher of summaries.filter((x) =>
    x.strategy.startsWith('raise-pitch'),
  )) {
    if (!taker) break
    const gain =
      pitcher.runs.reduce(
        (a, r, i) =>
          a + r.state.founderStake - taker.runs[i].state.founderStake,
        0,
      ) / pitcher.runs.length
    const seedQ = (r: Run) =>
      r.state.log.find(
        (e) => e.key === 'log.raised' && e.params?.round === 'seed',
      )?.quarter
    const later = pitcher.runs.map((r, i) => {
      const a = seedQ(r)
      const b = seedQ(taker.runs[i])
      return a !== undefined && b !== undefined ? a - b : null
    })
    const delays = later.filter((d): d is number => d !== null)
    console.log(
      `  ${pitcher.strategy} vs raise-climb (same seeds): final founder stake ${gain >= 0 ? '+' : ''}${(gain * 100).toFixed(1)} points on average (includes extra rounds one of them took); seed closed later in ${delays.filter((d) => d > 0).length}/${delays.length} runs (median delay ${median(delays)} quarters)`,
    )
  }
}

console.log('\nFailure waves (bots run degraded):')
console.table(
  summaryRows.map((r) => ({
    strategy: r.strategy,
    'waves / run': r.waves_per_run.toFixed(2),
    'median waves': r.median_waves,
    'busts in a wave quarter': r.busts_in_wave_quarter,
  })),
)

console.log('\nEvent cards (default answers):')
console.table(
  summaryRows.map((r) => ({
    strategy: r.strategy,
    'random cards / eligible quarter': r.random_cards_per_quarter.toFixed(2),
    'quarters with 2+ random': r.double_random_quarters,
  })),
)
{
  // Share of runs that saw each card, over all strategies.
  const runsTotal = summaryRows.reduce((n, r) => n + r.runs, 0)
  const seen: Record<string, number> = {}
  for (const r of summaryRows)
    for (const [id, n] of Object.entries(r.cards_seen))
      seen[id] = (seen[id] ?? 0) + n
  console.log('  Runs that saw each card (all strategies):')
  for (const c of CONTENT.events.cards)
    console.log(
      `    ${c.type.padEnd(8)} ${c.id.padEnd(22)} ${(((seen[c.id] ?? 0) / runsTotal) * 100).toFixed(0)}%`,
    )
}

// ---------- target B1: when can a garage-only player first afford a small unit? ----------

const garageOnly = summaries.filter(({ runs }) =>
  runs.every(
    (r) =>
      !smallUnitPowered(r) && !r.state.sites.some((s) => s.tier !== 'garage'),
  ),
)
const b1 = (list: StrategySummary[]) => {
  const hits = list.flatMap(({ strategy, runs }) =>
    runs
      .map((r) => ({ strategy, q: firstCashAt(r, B1_CASH) }))
      .filter((x) => x.q),
  )
  if (hits.length === 0) return 'never'
  const first = hits.reduce((a, b) => (b.q! < a.q! ? b : a))
  const runsTotal = list.reduce((a, s) => a + s.runs.length, 0)
  return `${first.q} (${first.strategy}); ${hits.length}/${runsTotal} runs ever reach it, median ${medianLabel(hits.map((h) => h.q!))}`
}
console.log(
  `\nTarget B1 — first quarter with ≥ ${usd(B1_CASH)} cash, garage only:`,
)
console.log(
  `  garage-only bots (${garageOnly.map((s) => s.strategy).join(', ')}): ${b1(garageOnly)}`,
)
console.log(
  `  best case (probe garage-max: 5 rigs day one, sell everything): ${b1(probes)}`,
)

// ---------- price alerts per quarter ----------

console.log('\nPrice alerts per quarter (average per run, all strategies):')
const allRuns = summaries.flatMap((s) => s.runs)
const played = CONTENT.quarters.filter((q) =>
  allRuns.some((r) => r.state.reports.some((x) => x.quarter === q)),
)
const line = played.map((q) => {
  const total = allRuns.reduce(
    (a, r) =>
      a + (r.state.reports.find((x) => x.quarter === q)?.priceAlerts ?? 0),
    0,
  )
  return `${q} ${(total / allRuns.length).toFixed(2)}`
})
for (let i = 0; i < line.length; i += 6)
  console.log('  ' + line.slice(i, i + 6).join('  '))

// ---------- valuation, drawdown and idle MW (balance pass, design thread 27 Sep 2026) ----------

console.log(
  '\nValuation at the peak and at the Merge (medians of each part, runs that reached the Merge):',
)
console.table(
  summaryRows
    .filter((r) => r.median_peak_valuation >= 1e6)
    .map((r) => ({
      strategy: r.strategy,
      'peak (quarter)': `${usd(r.median_peak_valuation)} (${r.usual_peak_quarter})`,
      'peak: ops / cash / coins / debt': `${usd(r.peak_split.ops)} / ${usd(r.peak_split.cash)} / ${usd(r.peak_split.coins)} / ${usd(r.peak_split.debt)}`,
      'Merge: ops / cash / coins / debt': `${usd(r.merge_split.ops)} / ${usd(r.merge_split.cash)} / ${usd(r.merge_split.coins)} / ${usd(r.merge_split.debt)}`,
      drawdown: `${(r.median_drawdown * 100).toFixed(0)}%`,
      'IPO / Texas runs': `${r.ipo_runs} / ${r.texas_runs}`,
      'Texas share of peak EBITDA': r.texas_share_runs
        ? `${(r.median_texas_share * 100).toFixed(0)}% (≥25% in ${r.texas_share_25_runs}/${r.texas_share_runs})`
        : '—',
      'idle ≥ 10% at Merge': `${r.idle_10pct_runs}/${r.idle_runs} (median ${(r.median_idle_share * 100).toFixed(0)}%)`,
    })),
)
{
  const seedRows = summaryRows.filter((r) => r.seed_floor_runs > 0)
  console.log(
    '  Seed cash floor (lowest 2018–19 quarter-end cash ÷ the seed amount):',
  )
  for (const r of seedRows)
    console.log(
      `    ${r.strategy.padEnd(18)} median ${(r.median_seed_cash_floor * 100).toFixed(0)}%, under 50% in ${r.seed_floor_under_half}/${r.seed_floor_runs} runs`,
    )
}

// ---------- Act II (--act2): a few bots played on through 2026Q4 ----------

if (args.includes('--act2')) {
  const ACT2_BOTS = ['raise-climb', 'hosting-switcher', 'texas-ipo']
  const t0 = performance.now()
  const byBot = ACT2_BOTS.map((name) => ({
    name,
    runs: Array.from({ length: SEEDS }, (_, i) => ({
      seed: i + 1,
      state: playGame(i + 1, BOTS[name], { through: 2 }).state,
    })),
  }))
  const at = (r: Run, q: string) =>
    r.state.reports.find((x) => x.quarter === q)?.valuationUsd
  const act2First = CONTENT.quarters[actLastQuarter(1) + 1]
  console.log(
    `\nAct II (--act2): ${SEEDS} seeds × ${ACT2_BOTS.length} bots, played to 2026Q4 (${((performance.now() - t0) / 1000).toFixed(1)} s)`,
  )
  console.table(
    byBot.map(({ name, runs }) => {
      const alive = runs.filter((r) => at(r, '2022Q3') !== undefined)
      const act2Busts = alive.filter((r) => r.state.phase === 'gameover')
      const ended = alive.filter((r) => r.state.phase === 'chapter')
      const act2Peak = ended.map((r) => {
        const reps = r.state.reports.filter((x) => x.quarter >= act2First)
        const best = reps.reduce((a, b) =>
          b.valuationUsd > a.valuationUsd ? b : a,
        )
        return best
      })
      const evPerMw = ended.map((r) => {
        const u = mwByUse(r.state, r.state.quarter)
        const mw =
          (u.mining + u.hosting + u.aiShell + u.aiCloud + u.idle) / 1000
        return mw > 0 ? r.state.reports.at(-1)!.valuationUsd / mw : 0
      })
      const fees = ended.map((r) =>
        r.state.reports.reduce((a, x) => a + (x.hostingFeesUsd ?? 0), 0),
      )
      return {
        strategy: name,
        'reached Act II': `${alive.length}/${runs.length}`,
        'bust in Act II': act2Busts.length,
        'value 2022Q3': usd(median(alive.map((r) => at(r, '2022Q3')!))),
        'value 2024Q1': usd(median(ended.map((r) => at(r, '2024Q1') ?? 0))),
        'value 2026Q4': usd(median(ended.map((r) => at(r, '2026Q4') ?? 0))),
        'Act II peak': usd(median(act2Peak.map((x) => x.valuationUsd))),
        'hosting fees (Act II)': usd(median(fees)),
        'EV per energized MW, 2026Q4': usd(median(evPerMw)),
      }
    }),
  )
  // Scope 0.2 §5 "hosting isn't a free win": hosting vs staying in mining, same seeds, 2022Q4–2024Q1.
  const climb = byBot.find((b) => b.name === 'raise-climb')!.runs
  const host = byBot.find((b) => b.name === 'hosting-switcher')!.runs
  const pairs = climb
    .map((c, i) => [at(c, '2024Q1'), at(host[i], '2024Q1')])
    .filter(
      (p): p is [number, number] => p[0] !== undefined && p[1] !== undefined,
    )
  const wins = pairs.filter(([c, h]) => h > c).length
  console.log(
    `  Hosting vs staying in mining (hosting-switcher vs raise-climb, same seeds, value at 2024Q1): hosting ahead in ${wins}/${pairs.length} runs (scope 0.2 §5: should be ≤ ~60%)`,
  )
}
