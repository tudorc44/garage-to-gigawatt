// Sim-runner: plays every bot strategy over many seeds, writes one CSV per run and a
// summary. For balance checks, not for players.
//   npm run sim                      (50 seeds, output in sim-output/)
//   npm run sim -- --seeds 10 --out some/folder
//   npm run sim -- --act2            (also plays a few bots on through Act II, to 2026Q4)
//   npm run sim -- --act2 --act2-bots sign-then-raise,asic-retirer   (only those, for a quick check)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CONTENT,
  actLastQuarter,
  quarterInputs,
  type ScenarioId,
} from '../src/content/index.ts'
import {
  applyStep,
  playFrom,
  playGame,
  type Strategy,
} from '../src/sim/replay.ts'
import { presetGame } from '../src/sim/preset.ts'
import { gpuResidualUsd, projectCapex } from '../src/sim/systems/projects.ts'
import { retrofitBlocker, retrofitPlan } from '../src/sim/systems/retrofit.ts'
import type {
  ContractType,
  GameState,
  QuarterReport,
} from '../src/sim/state.ts'
import { gameOverView } from '../src/sim/selectors.ts'
import { inActII, toAct3 } from '../src/sim/state.ts'
import { runway } from '../src/sim/systems/runway.ts'
import { eventChoices, getCard } from '../src/sim/systems/events.ts'
import {
  activePpas,
  lockedSpreadUsdMwh,
  ppaUsedKw,
} from '../src/sim/systems/nuclear.ts'
// tools/ may read the hidden reading score (M14.5's oracle); the player-like bots in bots.ts may not.
import {
  computeReading,
  oracleLogs,
} from '../src/sim/systems/readingScore.ts'
import { marketWeek } from '../src/sim/systems/market.ts'
import { mineWeek } from '../src/sim/systems/mining.ts'
import { normalPriceUsdKwh, poweredKw } from '../src/sim/systems/sites.ts'
import { mwByUse } from '../src/sim/systems/mwUse.ts'
import { aiEbitdaUsd, valuationSplit } from '../src/sim/systems/valuation.ts'
import { BOTS, HEAD_START_OPENINGS, PROBES, gpuRevenueShare } from './bots.ts'
import {
  PAYBACK_UTILISATION,
  contractedPaybackYears,
  paybackYears,
} from './act3Payback.ts'
import { contractIrrs, delayCost } from './section5.ts'
import {
  BREAKDOWN_COLUMNS,
  breakdown,
  type Breakdown,
} from './valuation-breakdown.ts'
import { applyKnobs } from './act3Knobs.ts'

const args = process.argv.slice(2)
// The prologue's runs and checks (Alpha 0.3 §5) have their own runner.
if (args.includes('--prologue')) {
  await import('./prologue-runner.ts')
  process.exit(0)
}
// Act III step 7's presets scan and anchor harness (M18.3, M18.5) have theirs.
if (args.includes('--act3-presets') || args.includes('--act3-anchors')) {
  await import('./act3-runner.ts')
  process.exit(0)
}
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '50'))
// M23.3: a robustness run sets knobs for this process only (tools/act3Knobs.ts), e.g. --knobs SOFR2=100 or HY3=-150
const KNOBS_SET = applyKnobs(argValue('--knobs', ''))
if (KNOBS_SET.length > 0) console.log(`Knobs (this run only): ${KNOBS_SET.join(', ')}`)
/**
 * Scope 0.2 §5 good path at 2026Q4 (also the preset's yardstick, owner M7.0 answer A6), and the great
 * path's 2025 peak band. Revised by the owner's A1 rule (M7.0): sign-then-raise ended at $412M, under
 * $700M, so good $1–3B → $0.5–2B and great $10B+ → $4–8B.
 */
const GOOD_BAND: [number, number] = [0.5e9, 2e9]
const GREAT_PEAK: [number, number] = [4e9, 8e9]
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

/**
 * A quarter's valuation split: operations (each unit's EBITDA × 4 × its multiple, plus projects
 * under construction and the weighted backlog), cash, coins, debt.
 */
function valuationParts(r: QuarterReport, firstAiDealQuarter: number | null) {
  const v = valuationSplit(r, firstAiDealQuarter)
  const ops =
    v.miningEvUsd + v.aiEvUsd + v.constructionUsd + v.weightedBacklogUsd
  // Coins include pledged collateral, as in the valuation itself.
  return { ops, cash: r.cash, coins: v.treasuryUsd, debt: r.debtUsd }
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
    valuationParts(
      r.state.reports.reduce((a, b) =>
        b.valuationUsd > a.valuationUsd ? b : a,
      ),
      r.state.firstAiDealQuarter,
    ),
  )
  const mergeSplits = merged.map((r) =>
    valuationParts(r.state.reports.at(-1)!, r.state.firstAiDealQuarter),
  )
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
  const splitMedians = (xs: ReturnType<typeof valuationParts>[]) => ({
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
  // Acts I and II only: these runs stop at 2026Q4 (Act III's cards are reported by --act3).
  for (const c of CONTENT.events.cards.filter((x) => x.act !== 3))
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
  const ACT2_BOTS = [
    'raise-climb',
    'hosting-switcher',
    'texas-ipo',
    'shell-climb',
    'texas-shell',
    'shell-capital',
    'texas-capital',
    'sign-then-raise',
    'asic-retirer',
    'lifeline-shell',
    'overleveraged',
  ].filter((name) => {
    const only = argValue('--act2-bots', '')
    return only === '' || only.split(',').includes(name)
  })
  const t0 = performance.now()
  // Each run's valuation breakdown by quarter (answer 1, step 1): taken in the next Plan phase,
  // when the quarter's report is the latest one, and at the end for 2026Q4.
  const breakdowns = new Map<string, Map<string, Breakdown>>()
  const recording = (key: string, bot: Strategy): Strategy => {
    const seen = new Map<string, Breakdown>()
    breakdowns.set(key, seen)
    return {
      ...bot,
      plan(state) {
        const r = state.reports.at(-1)
        if (inActII(state) && r && !seen.has(r.quarter))
          seen.set(r.quarter, breakdown(state, r))
        return bot.plan(state)
      },
    }
  }
  const byBot = ACT2_BOTS.map((name) => ({
    name,
    runs: Array.from({ length: SEEDS }, (_, i) => {
      const key = `${name}:${i + 1}`
      const state = playGame(
        i + 1,
        recording(key, BOTS[name] ?? PROBES[name]),
        {
          through: 2,
        },
      ).state
      const last = state.reports.at(-1)
      if (last && state.phase === 'chapter')
        breakdowns.get(key)!.set(last.quarter, breakdown(state, last))
      return { seed: i + 1, state }
    }),
  }))
  // Act III plumbing check (--act3 only; M11.3): no Act III decisions or rules yet. Only when the flag is
  // passed, every run that reached 2026Q4 normally is flipped (toAct3: no head start, no carry-over
  // rule, the seed's drawn scenario) and played on through 2030Q4 with the SAME bot. Prints runs per
  // scenario, crashes, and how many reached the chapter phase with the scenario reveal. Without the
  // flag nothing here runs, and Act II's own numbers are unaffected either way.
  if (args.includes('--act3')) {
    const t3 = performance.now()
    interface A3Run {
      bot: string
      seed: number
      scenario: string
      end: 'chapter' | 'gameover' | 'other'
      cause: string | null
      entryUsd: number
      firstUsd: number | null
      firstEbitdaUsd: number | null
      entryEbitdaUsd: number
      lastUsd: number | null
      /** M12.2 renewals, from the game log: opened with an offer, walked at the roll, signed, re-let, GPU lapsed to spot. */
      renewals: {
        offers: number
        walks: number
        signed: number
        relets: number
        gpuSpot: number
        /** Each signed renewal's multiple of the old rate. */
        mults: number[]
        /** Renewals that came due after 2027Q4 (for the S3 check). */
        dueAfter2027Q4: number
        /** M12.3: reopeners fired, by who triggered them. */
        reopenTenant: number
        reopenPlayer: number
        /** M12.3: Act III card choices taken with a live effect, and deferred ones (logged no-ops). */
        cardsApplied: number
        cardsDeferred: number
        /** M12.4: blend-and-extend offers made, and accepted (bots ignore them). */
        blendOffered: number
        blendAccepted: number
      }
      /** AI revenue (leases and GPU contracts) in 2027 and in the last 4 quarters played. */
      aiRevenue2027Usd: number
      aiRevenueLastYearUsd: number
      /** M14.5: the reading score (null: no weighted quarter) and the number of logged moves. */
      reading: number | null
      moves: number
      /** M16.6: the founder's net worth at the end (2030Q4; 0 after a game over). */
      netWorthUsd: number
      /** M16.6: retrofits started. */
      retrofits: number
      /** M17.7: political capital at the end of 2028Q4 and 2030Q4 (null when not reached). */
      pc2028Q4: number | null
      pc2030Q4: number | null
      /** M17.7: the wildcards drawn and what became of them. */
      wildcards: { id: string; status: string }[]
      /** M17.7: PPA MW contracted and idle (unused) at the end. */
      ppaMw: number
      ppaIdleMw: number
      /** M18.10: GPU contracts that walked after 2 quarters in distress, and how many of those had a DDTL. */
      gpuWalks: number
      gpuWalksDdtl: number
      /** M18.11: of those, contracts carried in from Act II; and the lender cures: opened, cured, foreclosed. */
      gpuWalksCarried: number
      cures: { started: number; done: number; foreclosed: number }
      /** M18.13: the leverage covenant: breaches opened, cured, forced sales, debt called. */
      covenant: { breaches: number; cured: number; sales: number; called: number }
    }
    /**
     * M17.7, tools only: a bot that also signs every nuclear PPA card choice it can (s2_c1, s3_c2, sh_2) and hires
     * the Government Affairs Director when sh_3 offers him; every other answer is the bot's own.
     */
    const withPpas = (base: Strategy, hire = true): Strategy => ({
      ...base,
      answer: (s) => {
        const card = s.interrupt?.id === 'event' ? getCard(s.interrupt.event ?? '') : undefined
        if (card?.act === 3) {
          const open = eventChoices(s)
          const pick = card.choices.find(
            (c) =>
              open.includes(c.id) &&
              ('ppa_switch' in c.effects ||
                'ppa_site_mw' in c.effects ||
                (hire && 'hire_card' in c.effects)),
          )
          if (pick) return pick.id
        }
        return base.answer?.(s)
      },
    })
    /**
     * M16.6, tools only: a bot plus one rule in Act III: each quarter, after its own plan, retrofit the largest
     * low-tier hall it can if its cash is over twice the cost (its plan is played on a copy first).
     */
    const withRetrofits = (base: Strategy): Strategy => ({
      ...base,
      plan: (s) => {
        const own = base.plan(s)
        if (s.act !== 3) return own
        const after = own.reduce(applyStep, s)
        const pick = after.projects
          .filter(
            (p) => p.tier === 'low' && !retrofitBlocker(after, p.id),
          )
          .sort((a, b) => b.kw - a.kw || a.n - b.n)[0]
        if (!pick) return own
        const costUsd = retrofitPlan(after, pick)!.costUsd
        return after.cash > 2 * costUsd
          ? [...own, { type: 'RETROFIT', projectId: pick.id }]
          : own
      },
    })
    /** Renewal counts from a finished game's log (Act III quarters only). */
    const renewalStats = (s: GameState): A3Run['renewals'] => {
      const first = CONTENT.quarters.indexOf('2027Q1')
      const log = s.log.filter((e) => e.quarter >= first)
      const n = (key: string) => log.filter((e) => e.key === key).length
      // The Act III cards' choices: with a live effect, deferred, or empty ("Wait").
      let cardsApplied = 0
      let cardsDeferred = 0
      for (const e of log) {
        if (e.key !== 'log.event_choice' && e.key !== 'log.event_choice_cash')
          continue
        const [id, , choice] = String(e.params?.eventChoice).split('.')
        if (!id.startsWith('a3_')) continue
        const effects = getCard(id)?.choices.find((c) => c.id === choice)
          ?.effects
        if (!effects) continue
        if ('deferred' in effects) cardsDeferred++
        else if (Object.keys(effects).length > 0) cardsApplied++
      }
      return {
        blendOffered: n('log.blend_offer'),
        blendAccepted: n('log.blend_signed'),
        reopenTenant: n('log.reopener_tenant'),
        reopenPlayer: n('log.reopener_player'),
        cardsApplied,
        cardsDeferred,
        offers: n('log.renewal_offer'),
        walks: n('log.renewal_walk'),
        signed: n('log.renewal_signed'),
        relets: n('log.renewal_relet'),
        gpuSpot: n('log.gpu_contract_ended'),
        dueAfter2027Q4: log.filter(
          (e) =>
            (e.key === 'log.renewal_offer' || e.key === 'log.renewal_walk') &&
            e.quarter > CONTENT.quarters.indexOf('2027Q4'),
        ).length,
        mults: log
          .filter((e) => e.key === 'log.renewal_signed')
          .map((e) => 1 + Number(e.params?.multPct)),
      }
    }
    const a3: A3Run[] = []
    /** M16.6: the same runs with the retrofit rule added (tools only). */
    const a3r: A3Run[] = []
    /** M17.7: the same runs as a nuclear signer (tools only); M18.0: and as one that doesn't hire the Director. */
    const a3n: A3Run[] = []
    const a3nn: A3Run[] = []
    let crashed = 0
    for (const { name, runs } of byBot) {
      for (const { seed, state } of runs) {
        if (state.phase !== 'chapter') continue
        // M16.6, M17.7, M18.0: each run four times: as the bot plays it, with the retrofit rule, as a nuclear
        // signer, and as a signer without the hire.
        for (const variant of ['bot', 'retrofitter', 'signer', 'signerNoHire'] as const) try {
          const start = toAct3(state)
          const bot = BOTS[name] ?? PROBES[name]
          const strategy =
            variant === 'retrofitter'
              ? withRetrofits(bot)
              : variant === 'signer'
                ? withPpas(bot)
                : variant === 'signerNoHire'
                  ? withPpas(bot, false)
                  : bot
          const r = playFrom(start, strategy, { through: 3 })
          const rep = r.state.reports.filter((x) => x.quarter >= '2027Q1')
          const pcAt = (label: string) =>
            rep.find((x) => x.quarter === label)?.politicalCapital ?? null
          const ppas = activePpas(r.state)
          ;(variant === 'retrofitter'
            ? a3r
            : variant === 'signer'
              ? a3n
              : variant === 'signerNoHire'
                ? a3nn
                : a3
          ).push({
            pc2028Q4: pcAt('2028Q4'),
            pc2030Q4: pcAt('2030Q4'),
            wildcards: (r.state.act3Wildcards ?? []).map((w) => ({
              id: w.id,
              status: w.status,
            })),
            gpuWalks: r.state.log.filter((e) => e.key === 'log.gpu_contract_walked').length,
            gpuWalksDdtl: r.state.log.filter(
              (e) => e.key === 'log.gpu_contract_walked' && e.params?.ddtl === 1,
            ).length,
            gpuWalksCarried: r.state.log.filter(
              (e) => e.key === 'log.gpu_contract_walked' && e.params?.carried === 1,
            ).length,
            cures: {
              started: r.state.log.filter((e) => e.key === 'log.lender_cure_started').length,
              done: r.state.log.filter((e) => e.key === 'log.lender_cure_done').length,
              foreclosed: r.state.log.filter((e) => e.key === 'log.lender_cure_foreclosed').length,
            },
            covenant: {
              breaches: r.state.log.filter((e) => e.key === 'log.covenant_breach').length,
              cured: r.state.log.filter((e) => e.key === 'log.covenant_cured').length,
              sales: r.state.log.filter((e) => e.key === 'log.covenant_forced_sale').length,
              called: r.state.log.filter((e) => e.key === 'log.covenant_called').length,
            },
            ppaMw: ppas.reduce((a, x) => a + x.kw, 0) / 1000,
            ppaIdleMw:
              ppas.reduce((a, x) => a + x.kw - ppaUsedKw(r.state, x), 0) / 1000,
            bot: name,
            seed,
            scenario: start.scenarioId!,
            end:
              r.state.phase === 'chapter' && r.state.act3End
                ? 'chapter'
                : r.state.phase === 'gameover'
                  ? 'gameover'
                  : 'other',
            cause: gameOverView(r.state)?.cause ?? null,
            entryUsd: start.act3Entry!.valuationUsd,
            entryEbitdaUsd: state.reports.at(-1)?.ebitdaUsd ?? 0,
            firstUsd: rep[0]?.valuationUsd ?? null,
            firstEbitdaUsd: rep[0]?.ebitdaUsd ?? null,
            lastUsd:
              r.state.phase === 'chapter' ? rep.at(-1)!.valuationUsd : null,
            renewals: renewalStats(r.state),
            aiRevenue2027Usd: rep
              .slice(0, 4)
              .reduce((a, x) => a + x.aiRevenueUsd, 0),
            aiRevenueLastYearUsd: rep
              .slice(-4)
              .reduce((a, x) => a + x.aiRevenueUsd, 0),
            // M14.5: the reading score from the reveal record (chapter or game over), and the moves logged.
            reading: r.state.act3End?.reading.score ?? null,
            moves: (r.state.act3Moves ?? []).length,
            netWorthUsd:
              r.state.phase === 'chapter'
                ? Math.max(0, r.state.founderStake * rep.at(-1)!.valuationUsd)
                : 0,
            retrofits: r.state.log.filter((e) => e.key === 'log.retrofit_started')
              .length,
          })
        } catch (e) {
          crashed++
          console.error(
            `  --act3${variant === 'bot' ? '' : ` (${variant})`}: ${name} seed ${seed} crashed: ${(e as Error).message}`,
          )
        }
      }
    }
    const usd = (n: number) =>
      Number.isNaN(n) ? '—' : `$${(n / 1e6).toFixed(1)}M`
    const summarize = (rows: A3Run[]) => {
      const done = rows.filter((x) => x.end === 'chapter')
      const causes: Record<string, number> = {}
      for (const x of rows.filter((y) => y.end === 'gameover'))
        causes[x.cause ?? '?'] = (causes[x.cause ?? '?'] ?? 0) + 1
      return {
        runs: rows.length,
        crashes: 0,
        reachedEnd: done.length,
        gameOver: rows.length - done.length,
        causes: Object.entries(causes)
          .map(([k, n]) => `${k} ${n}`)
          .join(', '),
        median2027Q1: usd(
          median(
            rows.map((x) => x.firstUsd).filter((v): v is number => v !== null),
          ),
        ),
        median2030Q4: usd(median(done.map((x) => x.lastUsd!))),
        medianMultiple: (() => {
          const m = median(
            done
              .filter((x) => x.firstUsd! > 0)
              .map((x) => x.lastUsd! / x.firstUsd!),
          )
          return Number.isNaN(m) ? '—' : `${m.toFixed(2)}×`
        })(),
      }
    }
    /** The renewal wall (M12.2): totals and medians over a group of runs. */
    const renewalSummary = (rows: A3Run[]) => {
      const sum = (k: keyof A3Run['renewals']) =>
        rows.reduce((a, x) => a + (x.renewals[k] as number), 0)
      const mults = rows.flatMap((x) => x.renewals.mults)
      const m = median(mults)
      return {
        renewalsDue: sum('offers') + sum('walks'),
        walks: sum('walks'),
        accepted: sum('signed'),
        relets: sum('relets'),
        gpuToSpot: sum('gpuSpot'),
        medianMult: Number.isNaN(m) ? '—' : `${m.toFixed(2)}×`,
        reopenT: sum('reopenTenant'),
        reopenP: sum('reopenPlayer'),
        cardsLive: sum('cardsApplied'),
        cardsDeferred: sum('cardsDeferred'),
        blendOffered: sum('blendOffered'),
        blendAccepted: sum('blendAccepted'),
        aiRev2027: usd(median(rows.map((x) => x.aiRevenue2027Usd))),
        aiRevLastYear: usd(median(rows.map((x) => x.aiRevenueLastYearUsd))),
      }
    }
    const scenarios = ['s0', 's1', 's2', 's3']
    console.log(
      `\n  Act III (--act3, M11.4c: Act II's systems on the scenario market): ${a3.length} runs from 2027Q1 on their drawn scenario, ` +
        `${crashed} crashed, ${a3.filter((x) => x.end === 'chapter').length} reached the chapter phase with the reveal, ` +
        `${a3.filter((x) => x.end === 'gameover').length} ended in game over (${(performance.now() - t3).toFixed(0)} ms)`,
    )
    console.log('  Act III by scenario:')
    console.table(
      Object.fromEntries(
        scenarios.map((id) => [
          id,
          summarize(a3.filter((x) => x.scenario === id)),
        ]),
      ),
    )
    // M18.9 (DT): anchor C1 on the population: S1 has the lowest median growth multiple at 2030Q4 (runs reaching it).
    {
      const multiple = (id: string) =>
        median(
          a3
            .filter((x) => x.scenario === id && x.end === 'chapter' && x.firstUsd! > 0)
            .map((x) => x.lastUsd! / x.firstUsd!),
        )
      const ms = Object.fromEntries(scenarios.map((id) => [id, multiple(id)]))
      const ok = scenarios.every((id) => id === 's1' || ms.s1 < ms[id])
      console.log(
        `  C1 (population): S1 lowest median growth multiple: ${ok ? 'PASS' : 'FAIL'} (${scenarios.map((id) => `${id} ${ms[id].toFixed(2)}×`).join(', ')})`,
      )
      // M18.10: GPU contracts that walked after 2 quarters in distress (the bots' runs).
      console.log(
        `  GPU contract walks (M18.10): ${scenarios
          .map((id) => {
            const rows = a3.filter((x) => x.scenario === id)
            const sum = (f: (x: A3Run) => number) => rows.reduce((a, x) => a + f(x), 0)
            const walks = sum((x) => x.gpuWalks)
            const runs = rows.filter((x) => x.gpuWalks > 0).length
            // (M18.11: carried vs new, and the lender cures)
            return `${id} ${walks} (${sum((x) => x.gpuWalksCarried)} carried, ${walks - sum((x) => x.gpuWalksCarried)} new; ${sum((x) => x.gpuWalksDdtl)} with a DDTL; in ${runs} of ${rows.length} runs; cures ${sum((x) => x.cures.started)} opened, ${sum((x) => x.cures.done)} cured, ${sum((x) => x.cures.foreclosed)} foreclosed)`
          })
          .join(', ')}`,
      )
      // M18.13: the leverage covenant (the bots' runs).
      console.log(
        `  Leverage covenant (M18.13): ${scenarios
          .map((id) => {
            const rows = a3.filter((x) => x.scenario === id)
            const sum = (f: (x: A3Run) => number) => rows.reduce((a, x) => a + f(x), 0)
            const runs = rows.filter((x) => x.covenant.breaches > 0).length
            return `${id} ${sum((x) => x.covenant.breaches)} breaches in ${runs} of ${rows.length} runs (${sum((x) => x.covenant.cured)} cured, ${sum((x) => x.covenant.sales)} forced sales, ${sum((x) => x.covenant.called)} called)`
          })
          .join(', ')}`,
      )
    }
    console.log('  Act III by bot:')
    console.table(
      Object.fromEntries(
        [...new Set(a3.map((x) => x.bot))].map((b) => [
          b,
          summarize(a3.filter((x) => x.bot === b)),
        ]),
      ),
    )
    // The renewal wall (M12.2): per scenario and per bot. AI revenue = leases and GPU contracts, run median.
    console.log(
      '  Act III renewals by scenario (AI revenue: 2027 vs the last 4 quarters played):',
    )
    console.table(
      Object.fromEntries(
        scenarios.map((id) => [
          id,
          renewalSummary(a3.filter((x) => x.scenario === id)),
        ]),
      ),
    )
    console.log('  Act III renewals by bot:')
    console.table(
      Object.fromEntries(
        [...new Set(a3.map((x) => x.bot))].map((b) => [
          b,
          renewalSummary(a3.filter((x) => x.bot === b)),
        ]),
      ),
    )
    // M14.5: the reading score per scenario × bot (numbers only; no balance targets in M14).
    const pct = (xs: number[], p: number) => {
      if (xs.length === 0) return NaN
      const s = [...xs].sort((a, b) => a - b)
      return s[Math.min(s.length - 1, Math.floor(p * s.length))]
    }
    const readingRow = (rows: A3Run[]) => {
      const scores = rows
        .map((x) => x.reading)
        .filter((v): v is number => v !== null)
      const n = (v: number) => (Number.isNaN(v) ? '—' : v)
      return {
        runs: rows.length,
        median: n(median(scores)),
        p10: n(pct(scores, 0.1)),
        p90: n(pct(scores, 0.9)),
        nullShare: rows.length
          ? `${Math.round((100 * (rows.length - scores.length)) / rows.length)}%`
          : '—',
        medianMoves: n(median(rows.map((x) => x.moves))),
      }
    }
    console.log('  Act III reading score by scenario × bot (M14.5):')
    console.table(
      Object.fromEntries(
        scenarios.flatMap((id) =>
          [...new Set(a3.map((x) => x.bot))]
            .map((b) => [
              `${id} ${b}`,
              a3.filter((x) => x.scenario === id && x.bot === b),
            ] as const)
            .filter(([, rows]) => rows.length > 0)
            .map(([k, rows]) => [k, readingRow(rows)]),
        ),
      ),
    )
    console.log('  Act III reading score by scenario (all bots):')
    console.table(
      Object.fromEntries(
        scenarios.map((id) => [
          id,
          readingRow(a3.filter((x) => x.scenario === id)),
        ]),
      ),
    )
    // The oracle (tools/ may read the hidden file): a passive and a perfect log per scenario must give the
    // M14.3 table (passive 78/50/50/50, perfect 78/100/100/100); the sim stops if they don't.
    const oracle = Object.fromEntries(
      scenarios.map((id) => {
        const logs = oracleLogs(id as ScenarioId)
        return [
          id,
          {
            passive: computeReading(logs.passive, id as ScenarioId).score,
            perfect: computeReading(logs.perfect, id as ScenarioId).score,
          },
        ]
      }),
    )
    console.log('  Reading-score oracle (synthetic logs):')
    console.table(oracle)
    const want = {
      s0: { passive: 78, perfect: 78 },
      s1: { passive: 50, perfect: 100 },
      s2: { passive: 50, perfect: 100 },
      s3: { passive: 50, perfect: 100 },
    }
    if (JSON.stringify(oracle) !== JSON.stringify(want))
      throw new Error(
        `Reading-score oracle self-check failed: ${JSON.stringify(oracle)}`,
      )
    // M16.6, M17.0 (DT answer 11; report, no targets; step 7's baseline): payback in years, the formula in
    // tools/act3Payback.ts (M18.5: shared with the anchor harness's C2). ⚑ = under 1.8 years (DT: step 7's target).
    // M17.8 (DT answer 10): PJM and Ohio rows too, on that region's power with the capacity charge.
    const util = PAYBACK_UTILISATION
    const flag = (years: number) =>
      Number.isFinite(years)
        ? years < 0
          ? 'never'
          : `${years.toFixed(1)}${years < 1.8 ? ' ⚑' : ''}`
        : '—'
    const payback: Record<string, Record<string, string>> = {}
    for (const id of scenarios as ScenarioId[])
      for (const label of ['2027Q3', '2028Q3'])
        for (const region of [undefined, 'pjm', 'ohio'] as const)
          payback[`${id} ${label}${region ? ` ${region}` : ''}`] = {
            ...Object.fromEntries(
              Object.entries(paybackYears(id, label, region)).map(([k, v]) => [k, flag(v)]),
            ),
            // M18.12 (DT): the contracted basis (all GPUs × a 2-year contract signed then, the six-region power mean)
            ...(region
              ? {}
              : Object.fromEntries(
                  (['b200', 'rubin_nvl144', 'rubin_ultra'] as const).map((g) => [
                    `${g === 'rubin_nvl144' ? 'rubin' : g === 'rubin_ultra' ? 'ultra' : g}·contract`,
                    contractedPaybackYears(id, label, g).toFixed(1),
                  ]),
                )),
          }
    console.log(
      `  Step 5 payback in years (M17.0; capex per MW ÷ EBITDA per MW-year; utilisation ${util}; ⚑ under 1.8, step 7's target;` +
        ' rows: the mean of six regions\' power, then PJM and Ohio with the capacity charge, M17.8):',
    )
    console.table(payback)
    // M16.6: the retrofitter (each bot's runs again, plus "retrofit the largest low-tier hall when cash > 2 × cost").
    const worthRow = (rows: A3Run[]) => {
      const scores = rows
        .map((x) => x.reading)
        .filter((v): v is number => v !== null)
      const n = (v: number) => (Number.isNaN(v) ? '—' : v)
      return {
        runs: rows.length,
        gameOver: rows.filter((x) => x.end !== 'chapter').length,
        netWorth2030Q4: usd(median(rows.map((x) => x.netWorthUsd))),
        reading: n(median(scores)),
        retrofits: n(median(rows.map((x) => x.retrofits))),
      }
    }
    console.log(
      '  Retrofitter (M16.6, tools only): median founder net worth at 2030Q4 (0 after a game over) and reading score, per scenario:',
    )
    console.table(
      Object.fromEntries(
        scenarios.flatMap((id) => [
          [`${id} bots`, worthRow(a3.filter((x) => x.scenario === id))],
          [`${id} retrofitter`, worthRow(a3r.filter((x) => x.scenario === id))],
        ]),
      ),
    )
    // M17.8 (report, no targets): a PPA signed in 2027Q3, at its locked price, against each eligible region's
    // market power (capacity charge included) at 2027Q3 … 2030Q3, $/MWh (spread = market − PPA: negative when the
    // PPA costs more). M17.7 compared same-quarter prices, the wrong basis.
    const signedQ = CONTENT.quarters.indexOf('2027Q3')
    const spread: Record<string, Record<string, string>> = {}
    for (const id of scenarios as ScenarioId[])
      for (const label of ['2027Q3', '2028Q3', '2029Q3', '2030Q3']) {
        const ppa = quarterInputs(signedQ, id)?.act3?.nuclearPpaUsdMwh ?? null
        const row: Record<string, string> = { locked: ppa === null ? '—' : `$${ppa}` }
        for (const region of CONTENT.act3Nuclear.regions) {
          const v = lockedSpreadUsdMwh(id, region, signedQ, CONTENT.quarters.indexOf(label))
          row[region] = v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(0)}`
        }
        spread[`${id} ${label}`] = row
      }
    console.log(
      '  Nuclear PPA signed 2027Q3 vs market power incl. the capacity charge (M17.8; $/MWh; region columns = market − contract, positive = the PPA is cheaper):',
    )
    console.table(spread)
    // M17.7: the nuclear signer (the same runs, signing every PPA card it can and hiring the Director).
    const signerRow = (rows: A3Run[]) => {
      const scores = rows
        .map((x) => x.reading)
        .filter((v): v is number => v !== null)
      const n = (v: number) => (Number.isNaN(v) ? '—' : v)
      return {
        // (M17.8: "x of y")
        gameOver: `${rows.filter((x) => x.end !== 'chapter').length} of ${rows.length}`,
        netWorth2030Q4: usd(median(rows.map((x) => x.netWorthUsd))),
        reading: n(median(scores)),
        ppaMw: n(median(rows.map((x) => x.ppaMw))),
        ppaIdleMw: n(median(rows.map((x) => x.ppaIdleMw))),
        // (M18.0: how many runs hold a PPA at the end, since the median is often 0)
        withPpa: `${rows.filter((x) => x.ppaMw > 0).length} of ${rows.length}`,
      }
    }
    console.log(
      '  Nuclear signer (M17.7, M18.0 ± the Director; tools only): median founder net worth at 2030Q4, reading, game overs, PPA MW and PPA MW idle at the end, runs holding a PPA:',
    )
    console.table(
      Object.fromEntries(
        scenarios.flatMap((id) => [
          [`${id} bots`, signerRow(a3.filter((x) => x.scenario === id))],
          [`${id} signer`, signerRow(a3n.filter((x) => x.scenario === id))],
          [`${id} signer, no hire`, signerRow(a3nn.filter((x) => x.scenario === id))],
        ]),
      ),
    )
    // M17.7: political capital (the bots don't lobby: decay and cards only) and the wildcards.
    console.log('  Political capital, median (the bots), at the end of 2028Q4 and 2030Q4:')
    console.table(
      Object.fromEntries(
        scenarios.map((id) => {
          const rows = a3.filter((x) => x.scenario === id)
          const m = (k: 'pc2028Q4' | 'pc2030Q4') =>
            median(rows.map((x) => x[k]).filter((v): v is number => v !== null))
          return [id, { pc2028Q4: m('pc2028Q4'), pc2030Q4: m('pc2030Q4') }]
        }),
      ),
    )
    const wc: Record<string, { drawn: number; fired: number; skipped: number; notReached: number }> = {}
    for (const x of a3)
      for (const w of x.wildcards) {
        wc[w.id] ??= { drawn: 0, fired: 0, skipped: 0, notReached: 0 }
        wc[w.id].drawn++
        if (w.status === 'fired') wc[w.id].fired++
        else if (w.status === 'skipped') wc[w.id].skipped++
        else wc[w.id].notReached++
      }
    console.log(`  Wildcards over the ${a3.length} bot runs (drawn, fired, skipped for no target, not reached):`)
    console.table(wc)
    // For the scenario-order check: S3 runs with a contract coming due after 2027Q4.
    const s3Late = a3.filter(
      (x) => x.scenario === 's3' && x.renewals.dueAfter2027Q4 > 0,
    ).length
    console.log(
      `  S3 runs with a contract coming due after 2027Q4: ${s3Late} of ${a3.filter((x) => x.scenario === 's3').length}`,
    )
    // Seam check: the 2027Q1 valuation against the end of 2026Q4 (±10%).
    const seam = a3.filter((x) => x.firstUsd !== null && x.entryUsd > 0)
    const out = seam.filter((x) => Math.abs(x.firstUsd! / x.entryUsd - 1) > 0.1)
    console.log(
      `  Act III seam: ${seam.length - out.length}/${seam.length} runs have their 2027Q1 valuation within ±10% of the end of 2026Q4; ${out.length} outliers`,
    )
    const byBotOut: Record<string, string> = {}
    for (const b of new Set(out.map((x) => x.bot)))
      byBotOut[b] =
        `${out.filter((x) => x.bot === b).length} of ${seam.filter((x) => x.bot === b).length}` +
        ` (${out.filter((x) => x.bot === b && x.firstUsd! > x.entryUsd).length} up)`
    console.log(`  Act III seam outliers by bot: ${JSON.stringify(byBotOut)}`)
    // The outliers that are not a tiny cash-dominated company (entry valuation over $50M).
    const big = out.filter((x) => x.entryUsd > 50e6)
    console.log(`  Act III seam outliers over $50M at entry: ${big.length}`)
    for (const x of big.slice(0, 15))
      console.log(
        `    ${x.bot} seed ${x.seed} ${x.scenario}: ${usd(x.entryUsd)} → ${usd(x.firstUsd!)} (${((x.firstUsd! / x.entryUsd - 1) * 100).toFixed(1)}%); quarter EBITDA ${usd(x.entryEbitdaUsd)} → ${usd(x.firstEbitdaUsd!)}`,
      )
  }
  // Scope 0.2 §5: every balance target, PASS / MISS with its numbers, printed as one table at the end.
  const s5: { target: string; result: string; numbers: string }[] = []
  const verdict = (pass: boolean | null) =>
    pass === null ? '—' : pass ? 'PASS' : 'MISS'
  // Misses the owner accepted as they stand (28 Sep 2026, M8.1a): good path, lifeline, preset.
  const acceptedVerdict = (pass: boolean) =>
    pass ? 'PASS' : 'MISS (accepted, owner 28 Sep 2026)'
  // The breakdown at 2026Q4 and at the run's 2025 peak, one row per run, in act2-valuation.csv.
  const pointsOf = (name: string, r: Run) => {
    const seen = breakdowns.get(`${name}:${r.seed}`)!
    const peak2025 = [...seen.values()]
      .filter((b) => b.quarter.startsWith('2025'))
      .reduce<Breakdown | null>(
        (a, b) => (a === null || b.valuation > a.valuation ? b : a),
        null,
      )
    return { end: seen.get('2026Q4') ?? null, peak2025 }
  }
  writeFileSync(
    join(OUT, 'act2-valuation.csv'),
    [
      ['bot', 'seed', 'point', 'quarter', ...BREAKDOWN_COLUMNS].join(','),
      ...byBot.flatMap(({ name, runs }) =>
        runs.flatMap((r) => {
          const pts = pointsOf(name, r)
          return (
            [
              ['2026Q4', pts.end],
              ['peak2025', pts.peak2025],
            ] as const
          )
            .filter(([, b]) => b !== null)
            .map(([point, b]) =>
              [
                name,
                r.seed,
                point,
                b!.quarter,
                ...BREAKDOWN_COLUMNS.map((c) => (b![c] ?? '').toString()),
              ].join(','),
            )
        }),
      ),
    ].join('\n') + '\n',
  )
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
      const last = (r: Run) => r.state.reports.at(-1)!
      const aiMw = ended.map(
        (r) =>
          r.state.projects
            .filter((p) => p.stage === 'live')
            .reduce((a, p) => a + p.kw, 0) / 1000,
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
        'live AI MW, 2026Q4': median(aiMw),
        'AI EBITDA 2026Q4 (q)': usd(
          median(ended.map((r) => aiEbitdaUsd(last(r)))),
        ),
        'backlog 2026Q4': usd(
          median(ended.map((r) => last(r).backlogUsd ?? 0)),
        ),
      }
    }),
  )
  // Scope 0.2 §5 pilot timing: a 1 MW pilot's operating return by 2026Q4 (its AI EBITDA over the
  // quarters: the pilot is the bot's only AI project) ÷ its capex, and with its GPUs' resale value
  // at 2026Q4 (the game's residual curve, M4.0b). No bot has a pilot's ~$31M in
  // cash (capital beyond own cash comes later), so this is a measurement harness: texas-ipo with
  // the pilot bot, its cash topped up by exactly the pilot's cost in the pilot quarter.
  const withPilotCash = (name: string): Strategy => {
    const inner = PROBES[name]
    const from = name.slice('pilot-'.length)
    return {
      ...inner,
      plan(state) {
        if (
          inActII(state) &&
          CONTENT.quarters[state.quarter] === from &&
          !state.projects.some((p) => p.kind === 'pilot')
        )
          state.cash += projectCapex(state, {
            kw: 1000,
            kind: 'pilot',
            gpu: CONTENT.projects.pilot.gpu,
            tenant: null,
          }).totalUsd
        return inner.plan(state)
      },
    }
  }
  const pilotMedian: Record<string, number> = {}
  const allBots = argValue('--act2-bots', '') === ''
  for (const name of allBots ? ['pilot-2023Q3', 'pilot-2025Q2'] : []) {
    const multiples = Array.from({ length: SEEDS }, (_, i) =>
      playGame(i + 1, withPilotCash(name), { through: 2 }),
    )
      .map((g) => ({ state: g.state }))
      .filter((r) => r.state.phase === 'chapter')
      .flatMap((r) => {
        const p = r.state.projects.find((x) => x.kind === 'pilot')
        if (!p || p.capexUsd <= 0) return []
        const margin = r.state.reports.reduce((a, x) => a + aiEbitdaUsd(x), 0)
        return [
          {
            ops: margin / p.capexUsd,
            withResale:
              (margin + gpuResidualUsd(p, r.state.quarter)) / p.capexUsd,
          },
        ]
      })
    pilotMedian[name] = median(multiples.map((m) => m.withResale))
    console.log(
      `  Pilot timing (${name}): ${multiples.length} pilots built; returns ${median(multiples.map((m) => m.ops)).toFixed(2)}× its cost from operations, ${pilotMedian[name].toFixed(2)}× with the GPUs' 2026Q4 resale value`,
    )
  }
  if (allBots) {
    const gap = pilotMedian['pilot-2023Q3'] - pilotMedian['pilot-2025Q2']
    s5.push({
      target: 'Pilot 2023Q3 ≥ 1.7× and ≥ 0.4× above 2025Q2',
      result: verdict(pilotMedian['pilot-2023Q3'] >= 1.7 && gap >= 0.4),
      numbers: `${pilotMedian['pilot-2023Q3'].toFixed(2)}× vs ${pilotMedian['pilot-2025Q2'].toFixed(2)}× (gap ${gap.toFixed(2)})`,
    })
    console.log(
      `  Pilot check (scope 0.2 §5, revised 27 Sep 2026): 2023Q3 ${pilotMedian['pilot-2023Q3'].toFixed(2)}× (≥ 1.7×), ${gap.toFixed(2)}× above 2025Q2 (≥ 0.4×): ${pilotMedian['pilot-2023Q3'] >= 1.7 && gap >= 0.4 ? 'pass' : 'miss'}`,
    )
  }
  const runsOf = (name: string) => byBot.find((b) => b.name === name)?.runs
  // Scope 0.2 §5 "hosting isn't a free win" (revised 27 Sep 2026): hosting vs staying in mining,
  // same seeds, judged at 2026Q4.
  const climb = runsOf('raise-climb')
  const host = runsOf('hosting-switcher')
  if (climb && host) {
    const pairs = climb
      .map((c, i) => [at(c, '2026Q4'), at(host[i], '2026Q4')])
      .filter(
        (p): p is [number, number] => p[0] !== undefined && p[1] !== undefined,
      )
    const wins = pairs.filter(([c, h]) => h > c).length
    s5.push({
      target: 'Hosting ahead of mining at 2026Q4 in ≤ ~60% of runs',
      result: verdict(wins <= pairs.length * 0.6),
      numbers: `${wins}/${pairs.length}`,
    })
    console.log(
      `  Hosting vs staying in mining (hosting-switcher vs raise-climb, same seeds, value at 2026Q4): hosting ahead in ${wins}/${pairs.length} runs (scope 0.2 §5: should be ≤ ~60%)`,
    )
  }
  // Scope 0.2 §5 good and great paths (bands revised in M7.0, see GOOD_BAND): the good path's 2026Q4
  // value; the great path's 2025 peak, surviving 2026 with ≥ 12 months (4 quarters) of runway.
  for (const name of ['shell-capital', 'sign-then-raise']) {
    const runs = runsOf(name)
    if (!runs) continue
    const ends = runs.map((r) => at(r, '2026Q4') ?? 0)
    const inBand = ends.filter((v) => v >= GOOD_BAND[0]).length
    const busts = runs.filter(
      (r) => at(r, '2022Q3') !== undefined && r.state.phase === 'gameover',
    ).length
    if (name === 'sign-then-raise')
      s5.push({
        target: `Good path ~${usd(GOOD_BAND[0])}–${usd(GOOD_BAND[1])} at 2026Q4, ≤ 10% bust in Act II`,
        result: acceptedVerdict(
          median(ends) >= GOOD_BAND[0] &&
            median(ends) <= GOOD_BAND[1] &&
            busts <= runs.length * 0.1,
        ),
        numbers: `${name}: median ${usd(median(ends))} (all runs), ${usd(GOOD_BAND[0])}+ in ${inBand}/${ends.length}, bust ${busts}/${runs.length}`,
      })
    console.log(
      `  Good path (${name}): 2026Q4 median ${usd(median(ends))}; at ${usd(GOOD_BAND[0])}+ in ${inBand}/${ends.length} runs (target ${usd(GOOD_BAND[0])}–${usd(GOOD_BAND[1])}); bust in Act II ${busts}/${runs.length} (target ≤ 10%)`,
    )
  }
  for (const name of ['texas-capital', 'asic-retirer']) {
    const runs = runsOf(name)
    if (!runs) continue
    const peak2025 = runs.map((r) =>
      Math.max(
        0,
        ...r.state.reports
          .filter((x) => x.quarter.startsWith('2025'))
          .map((x) => x.valuationUsd),
      ),
    )
    const survivors = runs.filter((r) => {
      if (r.state.phase !== 'chapter') return false
      const last = r.state.reports.at(-1)!
      const q = runway(r.state, last).quarters
      return q === null || q >= 4
    }).length
    if (name === 'asic-retirer')
      s5.push({
        target: `Great path peaks ${usd(GREAT_PEAK[0])}–${usd(GREAT_PEAK[1])} in 2025, survives 2026 with ≥ 12 months runway`,
        result: verdict(
          median(peak2025) >= GREAT_PEAK[0] &&
            median(peak2025) <= GREAT_PEAK[1] &&
            survivors >= runs.length / 2,
        ),
        numbers: `${name}: 2025 peak median ${usd(median(peak2025))}; ≥ 4 q runway at 2026Q4 in ${survivors}/${runs.length}`,
      })
    console.log(
      `  Great path (${name}): 2025 peak median ${usd(median(peak2025))} (target ${usd(GREAT_PEAK[0])}–${usd(GREAT_PEAK[1])}); alive at 2026Q4 with ≥ 4 quarters of runway in ${survivors}/${runs.length} runs`,
    )
  }
  // The valuation breakdown (medians of each part over the runs that have that point), for the
  // good and great bots, and EV per MW against the §5 sanity bands.
  console.log(
    '\n  Valuation breakdown (medians; EV/MW bands: mining $0.4–1.2M, announced AI $3–15M, stabilized IG $18–28M):',
  )
  const medOrDash = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null)
    return v.length ? usd(median(v)) : '—'
  }
  console.table(
    ['sign-then-raise', 'shell-capital', 'asic-retirer', 'texas-capital']
      .filter((n) => runsOf(n))
      .flatMap((name) =>
        (['end', 'peak2025'] as const).map((point) => {
          const bs = runsOf(name)!
            .map((r) => pointsOf(name, r)[point])
            .filter((b): b is Breakdown => b !== null)
          const col = (c: (typeof BREAKDOWN_COLUMNS)[number]) =>
            medOrDash(bs.map((b) => b[c]))
          return {
            bot: name,
            point:
              point === 'end'
                ? `2026Q4 (${bs.length})`
                : `2025 peak (${bs.length})`,
            value: col('valuation'),
            'mining EV': col('miningEv'),
            'AI EV': col('aiEv'),
            backlog: col('backlog'),
            construction: col('construction'),
            cash: col('cash'),
            treasury: col('treasury'),
            debt: col('debt'),
            'EV/MW mining': col('evMwMining'),
            'EV/MW announced AI': col('evMwAnnouncedAi'),
            'EV/MW stabilized IG': col('evMwStabilizedIg'),
          }
        }),
      ),
  )
  // Scope 0.2 §5 lifeline: runs that took the lifeline reach a live AI project by 2024Q4 in ≥ 70%.
  const byEnd2024 = CONTENT.quarters.indexOf('2024Q4')
  const lifelineRuns = byBot.flatMap(({ name, runs }) =>
    runs
      .filter((r) => r.state.act2Entry?.lifeline === 'taken')
      .map((r) => ({ name, r })),
  )
  const liveBy = lifelineRuns.filter(({ r }) =>
    r.state.projects.some(
      (p) =>
        p.readyQuarter !== null &&
        p.readyQuarter <= byEnd2024 &&
        p.stage !== 'proposed' &&
        p.stage !== 'building',
    ),
  ).length
  const takers = [...new Set(lifelineRuns.map((x) => x.name))].map(
    (n) => `${n} ${lifelineRuns.filter((x) => x.name === n).length}`,
  )
  console.log(
    `  Lifeline: taken in ${lifelineRuns.length} runs (${takers.join(', ') || 'none'}); a live AI project by 2024Q4 in ${liveBy}/${lifelineRuns.length} (target ≥ 70%)`,
  )
  // The owner's M5 answer 4: the target counts only once the lifeline bot survives at least half.
  const lifelineBot = runsOf('lifeline-shell')
  const lifelineAlive = lifelineBot
    ? lifelineBot.filter((r) => r.state.phase === 'chapter').length
    : 0
  const botCounts = !!lifelineBot && lifelineAlive >= lifelineBot.length / 2
  s5.push({
    target: 'Lifeline runs have a live AI project by 2024Q4 in ≥ 70%',
    result: botCounts
      ? acceptedVerdict(liveBy >= lifelineRuns.length * 0.7)
      : 'not counted',
    numbers: `${liveBy}/${lifelineRuns.length}; lifeline-shell alive at 2026Q4 in ${lifelineAlive}/${lifelineBot?.length ?? 0}`,
  })
  // Pure miner (texas-ipo): ~$100–400M at 2026Q4, alive.
  const miner = runsOf('texas-ipo')
  if (miner) {
    const reached = miner.filter((r) => at(r, '2022Q3') !== undefined)
    const alive = reached.filter((r) => r.state.phase === 'chapter')
    const end = median(alive.map((r) => at(r, '2026Q4') ?? 0))
    s5.push({
      target: 'Pure miner ends ~$100–400M, alive',
      result: verdict(
        end >= 100e6 && end <= 400e6 && alive.length === reached.length,
      ),
      numbers: `texas-ipo: median ${usd(end)}; alive ${alive.length}/${reached.length}`,
    })
  }
  // Overleveraged full stack (owner, M7.0 answer A3): debt/EBITDA > 4×, AI-lab tenant, no backstop →
  // ≥ 40% of runs end in a foreclosure or a forced sale (coins / machines, or the A8 project sale) in
  // 2026, or a game over then. M8.1b (owner, 28 Sep 2026): an emergency equity raise (the A8
  // rescue's second step) counts as a hit too.
  const lev = runsOf('overleveraged')
  if (lev) {
    const from2026 = CONTENT.quarters.indexOf('2026Q1')
    const hitKeys = [
      'log.project_foreclosed',
      'log.forced_sale',
      'log.rescue_sale',
      'log.rescue_equity',
    ]
    const hit = lev.filter(
      (r) =>
        r.state.log.some(
          (e) => hitKeys.includes(e.key) && e.quarter >= from2026,
        ) ||
        (r.state.phase === 'gameover' && r.state.quarter >= from2026),
    ).length
    const leverage = lev
      .map((r) => r.state.reports.find((x) => x.quarter === '2025Q4'))
      .filter((x): x is QuarterReport => !!x && x.ebitdaUsd > 0)
      .map((x) => x.debtUsd / (x.ebitdaUsd * 4))
    const distressed = lev.filter((r) =>
      r.state.log.some((e) => e.key === 'log.tenant_distress'),
    ).length
    s5.push({
      target:
        'Overleveraged (> 4× debt/EBITDA, AI lab, no backstop): ≥ 40% foreclosure, forced sale or emergency raise in 2026',
      result: verdict(hit >= lev.length * 0.4),
      numbers: `${hit}/${lev.length} runs; debt/EBITDA at 2025Q4 median ${median(leverage).toFixed(1)}× (> 4× in ${leverage.filter((x) => x > 4).length}/${leverage.length}); a tenant in distress in ${distressed}/${lev.length}; earlier busts ${lev.filter((r) => r.state.phase === 'gameover' && r.state.quarter < from2026).length}`,
    })
  }
  // One-project checks (tools/section5.ts): a 2-quarter delay, and 2024 vs post-reset contracts.
  const delay = delayCost('2025Q1')
  const delay24 = delayCost('2024Q1')
  s5.push({
    target: 'A 2-quarter delay costs ≥ 80% of a full-stack project’s profit',
    result: verdict(delay.lostShare !== null && delay.lostShare >= 0.8),
    numbers: `1 MW H100 on a neocloud contract, profit to 2026Q4: started 2025Q1 ${usd(delay.onTimeUsd)} → ${usd(delay.lateUsd)} (${((delay.lostShare ?? 0) * 100).toFixed(0)}% lost); started 2024Q1 ${((delay24.lostShare ?? 0) * 100).toFixed(0)}% lost`,
  })
  const irrs = contractIrrs()
  s5.push({
    target: 'A 2024 full-stack contract beats a post-Jun-2025 one by ≥ 30% IRR',
    result: verdict(
      irrs.early !== null &&
        (irrs.late === null || irrs.early - irrs.late >= 0.3),
    ),
    numbers: `projected IRR 2024Q1 ${((irrs.early ?? 0) * 100).toFixed(0)}% vs 2025Q3 ${irrs.late === null ? 'no payback' : `${(irrs.late * 100).toFixed(0)}%`} (mine: 30 points)`,
  })
  // EV/MW sanity bands at 2026Q4 (the good and great bots' medians).
  for (const name of ['sign-then-raise', 'asic-retirer']) {
    const runs = runsOf(name)
    if (!runs) continue
    const bs = runs
      .map((r) => pointsOf(name, r).end)
      .filter((b): b is Breakdown => b !== null)
    const med = (k: 'evMwMining' | 'evMwAnnouncedAi' | 'evMwStabilizedIg') =>
      median(bs.map((b) => b[k]).filter((x): x is number => x !== null))
    const [mine, ann, stab] = [
      med('evMwMining'),
      med('evMwAnnouncedAi'),
      med('evMwStabilizedIg'),
    ]
    const inBand = (x: number, lo: number, hi: number) =>
      Number.isNaN(x) || (x >= lo && x <= hi)
    // M8.1c (owner, 28 Sep 2026): no mining EBITDA left (mining EV/MW of $0) is not judged against the
    // pure-mining band.
    const noMining = Number.isNaN(mine) || mine === 0
    s5.push({
      target: `EV/MW sanity at 2026Q4 (${name})`,
      result: verdict(
        (noMining || inBand(mine, 0.4e6, 1.2e6)) &&
          inBand(ann, 3e6, 15e6) &&
          inBand(stab, 18e6, 28e6),
      ),
      numbers: `mining ${noMining ? 'n/a (no mining left)' : usd(mine)} · announced AI ${usd(ann)} · stabilized IG ${usd(stab)} per MW`,
    })
  }
  // Act II alone from the standalone preset (scope 0.2 §2.15).
  if (allBots) {
    const presetBots = ['texas-ipo', 'shell-capital', 'sign-then-raise']
    const presetSeeds = Math.min(SEEDS, 20)
    console.log(
      `\n  Act II from the preset (${presetSeeds} seeds, the Merge choice: hold_and_wait):`,
    )
    for (const name of presetBots) {
      const ends = Array.from(
        { length: presetSeeds },
        (_, i) => playFrom(presetGame(i + 1), BOTS[name], { through: 2 }).state,
      )
      const busts = ends.filter((x) => x.phase === 'gameover').length
      const alive = ends.filter((x) => x.phase === 'chapter')
      console.log(
        `    ${name.padEnd(16)} bust ${busts}/${presetSeeds}; 2026Q4 median ${usd(median(alive.map((x) => x.reports.at(-1)!.valuationUsd)))}; peak median ${usd(median(alive.map((x) => Math.max(...x.reports.map((r) => r.valuationUsd)))))}`,
      )
    }
    // Scope 0.2 §5 (owner, 28 Sep 2026): each Merge head start has its own intended-opening bot.
    // On a GPU-heavy good-path Act I (raise-climb buying GPU rigs first), every opening under every head start;
    // passes when ≥ 3 of the 4 head starts have a different best opening and the four matching bots'
    // 2026Q4 medians are within ±30% of their average.
    const hsSeeds = Math.min(SEEDS, 20)
    const matching: Record<string, string> = {
      gpu_cloud: 'open-pilot',
      hosting: 'open-shell',
      sell_gpus_keep_btc: 'open-fleet',
      hold_and_wait: 'open-hold',
    }
    const names = Object.values(matching)
    console.log(
      `\n  Head starts × openings (good path through Act I, ${hsSeeds} seeds, 2026Q4 median value, busts count 0):`,
    )
    const bests: string[] = []
    const own: number[] = []
    // The openings play a GPU-heavy Act I (owner, M7.0 answer A4: ≥ 30% of 2022Q3 mining revenue
    // from GPUs); the share is measured on every run.
    const gpuShares: number[] = []
    for (const choice of CONTENT.merge.choices.map((c) => c.id)) {
      const row = names.map((name) => {
        const bot = { ...HEAD_START_OPENINGS[name], merge: () => choice }
        const vals = Array.from({ length: hsSeeds }, (_, i) => {
          const end = playGame(i + 1, bot, { through: 2 }).state
          const share = gpuRevenueShare(end)
          if (share !== null) gpuShares.push(share)
          return end.phase === 'chapter' ? end.reports.at(-1)!.valuationUsd : 0
        })
        return { name, value: median(vals) }
      })
      const best = row.reduce((a, b) => (b.value > a.value ? b : a))
      bests.push(best.name)
      own.push(row.find((x) => x.name === matching[choice])!.value)
      console.log(
        `    ${choice.padEnd(20)} ${row.map((x) => `${x.name} ${usd(x.value)}`).join(' · ')} → best: ${best.name}`,
      )
    }
    const distinct = new Set(bests).size
    const avg = own.reduce((a, b) => a + b, 0) / own.length
    const within = own.every((v) => Math.abs(v / avg - 1) <= 0.3)
    console.log(
      `  Head-start check: ${distinct}/4 different best openings (≥ 3); matching bots ${own.map(usd).join(' / ')}, within ±30% of their average: ${within ? 'yes' : 'no'} → ${distinct >= 3 && within ? 'pass' : 'miss'}`,
    )
    const heavy = gpuShares.filter((x) => x >= 0.3).length
    s5.push({
      target:
        'Each Merge head start makes a different opening best (≥ 3 of 4; matching bots ±30%), on a GPU-heavy Act I',
      result: verdict(distinct >= 3 && within),
      numbers: `${distinct}/4 different best (${bests.join(', ')}); matching ${own.map(usd).join(' / ')}; GPU share of 2022Q3 mining revenue median ${(median(gpuShares) * 100).toFixed(0)}% (≥ 30% in ${heavy}/${gpuShares.length})`,
    })
    // The owner's M5 answer 3 and M7.0 answer A6: the preset is judged with the good path, against
    // whatever the good band is.
    const presetBest = presetBots
      .map((name) =>
        median(
          Array.from({ length: presetSeeds }, (_, i) => {
            const end = playFrom(presetGame(i + 1), BOTS[name], {
              through: 2,
            }).state
            return end.phase === 'chapter'
              ? end.reports.at(-1)!.valuationUsd
              : 0
          }),
        ),
      )
      .reduce((a, b) => Math.max(a, b), 0)
    s5.push({
      target: `Preset (40 MW) best bot reaches the good band (${usd(GOOD_BAND[0])}–${usd(GOOD_BAND[1])})`,
      result: acceptedVerdict(presetBest >= GOOD_BAND[0]),
      numbers: `best preset bot median ${usd(presetBest)}`,
    })
  }
  console.log('\n  Scope 0.2 §5 balance targets:')
  console.table(s5)
}
