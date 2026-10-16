// The Live screen's chart, by act (doc 61 v1.0, M75). UI only: it reads the sim's state and market and changes none. Which series the
// chart can show this week, which one it opens on (the act's main driver, decided from last quarter's revenue split), and the
// columns it may read in Acts III-V (the leak guard: only columns the game's screens already display during play).
import { POWER_REGIONS, act5Row, type PowerRegion } from '../content/index.ts'
import type { MessageKey } from '../i18n/t.ts'
import { ledgerQuarters } from '../sim/ledger.ts'
import { siteFacts } from '../sim/selectors.ts'
import type { GameState, WeekSummary } from '../sim/state.ts'
import { orbitRow } from '../sim/systems/orbit.ts'
import { getModel, marketWeek, scenarioOf } from '../sim/systems/market.ts'
import { ethMiningOver, hasMiners } from './mining.ts'

export type ChartSeriesId = 'btc' | 'gpu' | 'power' | 'launch' | 'company'

/**
 * The market columns the chart may read in Acts III-V (doc 61 §5): the BTC price, the GPU rent rates and Act V's power prices (all
 * shown on the Plan and market screens during play) and the quarterly launch price (shown on the Orbit screens). Never a scenario or
 * future tag, a Signals series or a hidden file's value. A test checks every series built here uses only these.
 */
export const CHART_ALLOWED_COLUMNS: readonly string[] = [
  'btc_usd',
  'eth_usd',
  'gpu_h100_neocloud_usd_hr',
  'gpu_rubin_hyperscaler_usd_hr',
  'gpu_rubin_ultra_hyperscaler_usd_hr',
  ...POWER_REGIONS.map((r) => `power_usd_kwh_${r}`),
  'launch_usd_kg_leo',
]

/** One line of the chart: values as a fraction change against the quarter's first week, and the first and last raw values. */
export interface ChartLine {
  /** The text of the line's legend entry and end label, already through t(). */
  id: 'btc' | 'eth' | 'gpu' | 'power' | 'launch' | 'revenue' | 'cash'
  changes: number[]
  first: number
  last: number
  /** The raw value before the quarter, for the stepped launch price (null otherwise). */
  previous: number | null
}

export interface ChartSeries {
  id: ChartSeriesId
  labelKey: MessageKey
  lines: ChartLine[]
  /** The market columns it reads (empty for Your company). */
  columns: string[]
  /** The power region for the power price. */
  region?: PowerRegion
}

const change = (v: number[]): number[] => v.map((x) => (v[0] ? x / v[0] - 1 : 0))

/** The newest GPU generation the company has projects on (Acts III-V), as the weekly market column that prices its class. */
export function gpuColumn(state: GameState): string {
  const order = ['a100', 'h100', 'h200', 'b200', 'rubin_nvl144', 'rubin_ultra', 'gen2037', 'bowline']
  const gens = state.projects.filter((p) => p.gpu && p.stage !== 'ended' && p.stage !== 'sold' && p.stage !== 'foreclosed').map((p) => p.gpu!)
  const newest = gens.reduce((best, g) => (order.indexOf(g) > order.indexOf(best) ? g : best), 'h100')
  if (newest === 'rubin_nvl144') return 'gpu_rubin_hyperscaler_usd_hr'
  if (newest === 'rubin_ultra' || newest === 'gen2037' || newest === 'bowline') return 'gpu_rubin_ultra_hyperscaler_usd_hr'
  return 'gpu_h100_neocloud_usd_hr'
}

/** The region of the largest site by energized MW, when it has a power price column (Act V). */
export function largestSiteRegion(state: GameState): PowerRegion | undefined {
  const sites = [...state.sites]
    .map((s) => ({ s, f: siteFacts(state, s) }))
    .sort((a, b) => b.f.energizedKw - a.f.energizedKw)
  const top = sites.find((x) => x.f.region && (POWER_REGIONS as readonly string[]).includes(x.f.region))
  return top?.f.region as PowerRegion | undefined
}

/** A week's value of a market column, or null when the column has none that week. */
function marketValue(state: GameState, week: number, column: string): number | null {
  const w = marketWeek(state.quarter, week - 1, scenarioOf(state)) as unknown as Record<string, number | null | undefined>
  const v = w[column]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** A market column across the played weeks (null if any week has no value). */
function marketLine(state: GameState, weeks: WeekSummary[], column: string): number[] | null {
  const out: number[] = []
  for (const w of weeks) {
    const v = marketValue(state, w.week, column)
    if (v === null) return null
    out.push(v)
  }
  return out.length > 0 ? out : null
}

/** A quarter's power price in a region, from Act V's quarterly row (null outside Act V or for a quarter with none). */
function powerPrice(state: GameState, quarter: number, region: PowerRegion): number | null {
  const row = act5Row(quarter, scenarioOf(state)) as unknown as Record<string, number | null | undefined> | undefined
  const v = row?.[`power_usd_kwh_${region}`]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Last quarter's revenue split from the ledger: mining, AI and orbital shares (null before there is a closed quarter with lines). */
export function revenueSplit(state: GameState): { mining: number; ai: number; orbit: number; total: number } | null {
  const lq = ledgerQuarters(state).find((l) => l.q === state.quarter - 1)
  if (!lq || lq.partial) return null
  const g = (k: keyof typeof lq.lines) => lq.lines[k] ?? 0
  const mining = g('mining_btc') + g('mining_eth') + g('mining_other')
  const ai = g('ai_shell_rent') + g('ai_cloud')
  const orbit = g('orbit_revenue')
  const total = mining + ai + orbit + g('hosting_fees') + g('lunar_revenue') + g('grid_credits') + g('energy_income') + g('other_income')
  return total > 0 ? { mining, ai, orbit, total } : null
}

/** Whether any BTC machine is still on the books (Act II's "a company still mining BTC"). */
export const minesBtc = (state: GameState): boolean =>
  state.machines.some((m) => m.count > m.failed && getModel(m.model)?.coin === 'BTC')

/** The series the chart can show this week for this company, in the order of the switch. Empty before the quarter's first week. */
export function chartSeries(state: GameState, weeks: WeekSummary[]): ChartSeries[] {
  if (weeks.length === 0) return []
  const out: ChartSeries[] = []
  // BTC (and ETH before the Merge): every act; in Act V only for a company that still has machines (M66.4)
  if (state.act !== 5 || hasMiners(state)) {
    const lines: ChartLine[] = [
      { id: 'btc', changes: change(weeks.map((w) => w.btcUsd)), first: weeks[0].btcUsd, last: weeks.at(-1)!.btcUsd, previous: null },
    ]
    if (!ethMiningOver(state.quarter))
      lines.push({ id: 'eth', changes: change(weeks.map((w) => w.ethUsd)), first: weeks[0].ethUsd, last: weeks.at(-1)!.ethUsd, previous: null })
    out.push({ id: 'btc', labelKey: ethMiningOver(state.quarter) ? 'ui.live.series.btc' : 'ui.live.series.btc_eth', lines, columns: ['btc_usd', 'eth_usd'] })
  }
  // GPU rent: Act II from the week its data starts, Acts III-V for the newest class the company rents
  if (state.act >= 2) {
    const column = state.act === 2 ? 'gpu_h100_neocloud_usd_hr' : gpuColumn(state)
    const v = marketLine(state, weeks, column)
    if (v) out.push({ id: 'gpu', labelKey: 'ui.live.series.gpu', lines: [{ id: 'gpu', changes: change(v), first: v[0], last: v.at(-1)!, previous: null }], columns: [column] })
  }
  // Power price in the largest site's region (Act V). The quarterly row is what the game carries at run time (the weekly power
  // columns do not survive the glide from Act IV's weeks), so, like the launch price, it is held flat across the quarter's weeks.
  if (state.act === 5) {
    const region = largestSiteRegion(state)
    const now = region ? powerPrice(state, state.quarter, region) : null
    if (region && now !== null) {
      const before = powerPrice(state, state.quarter - 1, region)
      out.push({
        id: 'power',
        labelKey: 'ui.live.series.power',
        lines: [{ id: 'power', changes: weeks.map(() => 0), first: now, last: now, previous: before }],
        columns: [`power_usd_kwh_${region}`],
        region,
      })
    }
  }
  // Launch price (stepped): Acts IV-V, only for a company with orbital blocks
  if ((state.act === 4 || state.act === 5) && (state.act4Orbit?.blocks.length ?? 0) > 0) {
    const now = orbitRow(state).launch_usd_kg_leo
    const before = state.quarter > 0 ? orbitRow(state, state.quarter - 1).launch_usd_kg_leo : null
    out.push({
      id: 'launch',
      labelKey: 'ui.live.series.launch',
      lines: [{ id: 'launch', changes: weeks.map(() => 0), first: now, last: now, previous: before }],
      columns: ['launch_usd_kg_leo'],
    })
  }
  // Your company: this quarter's weekly revenue and cash
  out.push({
    id: 'company',
    labelKey: 'ui.live.series.company',
    lines: [
      { id: 'revenue', changes: change(weeks.map((w) => w.revenueUsd)), first: weeks[0].revenueUsd, last: weeks.at(-1)!.revenueUsd, previous: null },
      { id: 'cash', changes: change(weeks.map((w) => w.cash)), first: weeks[0].cash, last: weeks.at(-1)!.cash, previous: null },
    ],
    columns: [],
  })
  return out
}

/**
 * The series the chart opens on (doc 61 §3): what most of the company's money depends on, decided from last quarter's revenue split,
 * with the fallbacks when a series has no data. `available` is `chartSeries(state, weeks)`.
 */
export function defaultSeries(state: GameState, available: ChartSeries[]): ChartSeriesId {
  const has = (id: ChartSeriesId) => available.some((s) => s.id === id)
  const split = revenueSplit(state)
  const prefer: ChartSeriesId[] = []
  switch (state.act) {
    case 2:
      // a company still mining BTC keeps BTC; else GPU rent from the week its data starts; before that, Your company
      prefer.push(...(minesBtc(state) ? (['btc'] as const) : []), 'gpu', 'company')
      break
    case 3:
      prefer.push(...(split ? (split.mining / split.total > 0.5 ? (['btc'] as const) : []) : minesBtc(state) ? (['btc'] as const) : []), 'gpu', 'company')
      break
    case 4:
      prefer.push(...(split && split.orbit / split.total > 0.5 ? (['launch'] as const) : []), 'gpu', 'company')
      break
    case 5:
      // M66's rule: a company that still mines keeps BTC; otherwise the power price in the largest site's region
      prefer.push(...(hasMiners(state) ? (['btc'] as const) : []), 'power', 'gpu', 'company')
      break
    default:
      prefer.push('btc', 'company')
  }
  return prefer.find(has) ?? available[0]?.id ?? 'company'
}
