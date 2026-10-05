// M27.3 (doc 33 §3.3, §6.2, §16): generates Act IV's market files for the four futures, f1 On Schedule, f2 The Wall,
// f3 Closed Shell, f4 Cheap Ground. Run it with `npm run content:act4` (then `npm run content:market` turns the CSVs
// into the JSON the game imports). Nothing in the files is edited by hand: every value comes from this script, and
// docs/act4-content/README.md says, column by column, whether it is sourced, derived or designed.
//
// The rules it follows:
// - **The common 2031 baseline.** Every column is identical across the four futures in 2031Q1–2031Q4 (act quarters
//   0–3). The futures diverge from 2032Q1 (B14, doc 33 §3.3; the build makes them identical through 2031Q4, see
//   act4-scope.md §6).
// - **The Act II–III columns continued** (derived). The 2031 baseline of every Act III quarterly column is the mean of
//   the four Act III scenarios' 2030Q4 values; it then moves by its own drift (the scenarios' mean change over 2030,
//   per quarter, clamped) times the future's designed index for its group (ground rents, power, the AI multiple …).
// - **The new Act IV columns** (launch, satellites, insurance, congestion, orbital rents, the space multiple, lunar
//   transport and prices): each future's designed path, anchored to doc 33 §6.2 and the cost model's 2031/2033/2035
//   inputs (docs/act4-research/results.md).
// - The seam glide from the player's own Act III scenario to this baseline happens when the game loads (index.ts), not
//   here: these files are each future's own path.
// - Never in the files: the true orbital failure rate or useful life, the lunar grade (the hidden files, doc 33 §6.8).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { TRIGGER } from './futures.ts'

const ROOT = new URL('../../', import.meta.url)
const FUTURES = ['f1', 'f2', 'f3', 'f4'] as const
type Future = (typeof FUTURES)[number]
const SCENARIOS = ['s0', 's1', 's2', 's3'] as const

/** The 20 Act IV quarters, 2031Q1–2035Q4 (act quarters 0–19). */
const QUARTERS = Array.from({ length: 20 }, (_, n) => `${2031 + Math.floor(n / 4)}Q${(n % 4) + 1}`)
const N = QUARTERS.length
/** The last act quarter every future shares exactly (2031Q4): the futures diverge from the next one. */
const COMMON_UNTIL = 3
// Each future's trigger quarter (act quarter) lives in futures.ts, shared with the Signals generator.

// ---------------------------------------------------------------------------------------------------- csv io ----

function readCsv(rel: string): { header: string[]; rows: Record<string, string>[] } {
  const [h, ...lines] = readFileSync(new URL(rel, ROOT), 'utf8').trim().split(/\r?\n/)
  const header = h.split(',')
  return {
    header,
    rows: lines.map((l) => Object.fromEntries(l.split(',').map((c, i) => [header[i], c]))),
  }
}

/** A number as the CSV writes it: whole above 1,000, 1 decimal above 100, 4 above 1, else 5 (1.5625 stays exact). */
function fmt(v: number | null): string {
  if (v === null || Number.isNaN(v)) return ''
  if (Math.abs(v) >= 1000) return String(Math.round(v))
  if (Math.abs(v) >= 100) return String(Math.round(v * 10) / 10)
  if (Math.abs(v) >= 1) return String(Math.round(v * 10000) / 10000)
  return String(Math.round(v * 100000) / 100000)
}

// --------------------------------------------------------------------------------------------- path helpers ----

/** Piecewise-linear interpolation over [act quarter, value] anchors (held flat before the first, after the last). */
function path(anchors: [number, number][], n: number): number {
  if (n <= anchors[0][0]) return anchors[0][1]
  for (let i = 1; i < anchors.length; i++) {
    const [n1, v1] = anchors[i]
    const [n0, v0] = anchors[i - 1]
    if (n <= n1) return v0 + ((v1 - v0) * (n - n0)) / (n1 - n0)
  }
  return anchors.at(-1)![1]
}

/** A future's index for a column group: 1 through 2031 in every future, then the future's designed path. */
function index(anchorsByFuture: Record<Future, [number, number][]>, f: Future, n: number): number {
  if (n <= COMMON_UNTIL) return 1
  return path([[COMMON_UNTIL, 1], ...anchorsByFuture[f]], n)
}

// ------------------------------------------------------------- the Act II–III columns: baseline and groups ----

const act3 = Object.fromEntries(SCENARIOS.map((s) => [s, readCsv(`src/content/market_${s}.csv`)])) as Record<
  (typeof SCENARIOS)[number],
  ReturnType<typeof readCsv>
>
const act3Weekly = Object.fromEntries(
  SCENARIOS.map((s) => [s, readCsv(`src/content/market_weekly_${s}.csv`)]),
) as Record<(typeof SCENARIOS)[number], ReturnType<typeof readCsv>>

/** The Act III quarterly columns Act IV continues (all but the labels, which Act IV replaces with `future`). */
const CARRIED = act3.s0.header.filter((c) => !['quarter', 'scenario', 'phase', 'estimate'].includes(c))

/** The mean of the four scenarios' values for a column in a quarter, or null when none has one. */
function meanOf(col: string, quarter: string): number | null {
  const vals = SCENARIOS.map((s) => act3[s].rows.find((r) => r.quarter === quarter)![col])
    .filter((v) => v !== undefined && v !== '')
    .map(Number)
  return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0) / vals.length
}

/** Columns that are levels, rates or indices: they hold their baseline (no drift), and move only by their group. */
const NO_DRIFT = new Set([
  'sofr_pct',
  'hy_spread_bps',
  'ddtl_spread_bps',
  'cap_rate_hyperscale_pct',
  'mining_ev_ebitda_mult',
  'ai_infra_ev_ebitda_mult',
  'ai_demand_index_0_100',
  'newest_gen_lead_time_weeks',
  'renewal_shell_index_low',
  'renewal_shell_index_high',
  'renewal_h100_gpu_index_vs_2025q4',
  'renewal_b200_gpu_index_vs_2025q4',
  'rfp_new_lease_index_low',
  'rfp_new_lease_index_high',
  'renewal_offer_term_years_shell',
  'renewal_offer_term_years_gpu',
  'tenant_default_prob_q_ai_lab',
  'tenant_default_prob_q_neocloud_sub',
  'tenant_default_prob_q_hyperscaler',
  'tenant_walk_prob_at_renewal_nonhyperscaler',
  'tenant_walk_prob_at_renewal_hyperscaler',
  // BTC has its own common path (below)
  'btc_usd_close',
  'btc_difficulty_T',
  'btc_hashrate_EHs',
  'btc_block_subsidy',
  'btc_hashprice_usd_ph_day',
])

/** The per-quarter drift of a column: the scenarios' mean change over 2030 (2029Q4 → 2030Q4), clamped to −3%…+2%. */
function drift(col: string): number {
  if (NO_DRIFT.has(col)) return 0
  const a = meanOf(col, '2029Q4')
  const b = meanOf(col, '2030Q4')
  if (!a || !b) return 0
  return Math.max(-0.03, Math.min(0.02, Math.pow(b / a, 1 / 4) - 1))
}

// The futures' designed indices per column group (doc 33 §6.2 "ground squeeze", "who it rewards / punishes").
/** Ground rents (GPU-hours, shell renewals and RFPs, EV per AI MW): F1 squeeze then the 2034–35 flood; F2 high
 *  throughout; F3 a spike after the cascade; F4 falling from its trigger. */
const RENT: Record<Future, [number, number][]> = {
  f1: [[8, 1.08], [14, 1.08], [19, 0.85]],
  f2: [[10, 1.15], [19, 1.15]],
  f3: [[7, 1.04], [8, 1.18], [10, 1.18], [19, 1.05]],
  f4: [[9, 1.03], [19, 0.8]],
}
/** Ground power prices: the squeeze in F1–F3, cheap ground power in F4. */
const POWER: Record<Future, [number, number][]> = {
  f1: [[19, 1.05]],
  f2: [[19, 1.08]],
  f3: [[19, 1.04]],
  f4: [[9, 1.0], [19, 0.82]],
}
/** PJM capacity prices (the ground squeeze's sharpest signal). */
const CAPACITY: Record<Future, [number, number][]> = {
  f1: [[10, 1.15], [19, 1.0]],
  f2: [[19, 1.25]],
  f3: [[19, 1.1]],
  f4: [[9, 1.05], [19, 0.6]],
}
/** The ground AI-infrastructure multiple. */
const AI_MULT: Record<Future, [number, number][]> = {
  f1: [[10, 1.15], [19, 0.95]],
  f2: [[19, 0.8]],
  f3: [[6, 1.0], [8, 0.75], [19, 0.95]],
  f4: [[9, 1.0], [19, 0.85]],
}
/** GPU and rack purchase prices (on top of their own drift): cheaper hardware in F1. */
const HARDWARE: Record<Future, [number, number][]> = {
  f1: [[19, 0.85]],
  f2: [[19, 1.0]],
  f3: [[19, 0.95]],
  f4: [[19, 0.95]],
}
/** Added to the high-yield and DDTL spreads, bps: the F3 cascade's credit shock; F2's slow grind. */
const SPREAD_ADD: Record<Future, [number, number][]> = {
  f1: [[19, 0]],
  f2: [[8, 40], [19, 40]],
  f3: [[6, 0], [7, 150], [12, 80], [19, 50]],
  f4: [[19, 0]],
}
/** Tenant default probabilities: doubled after the F3 cascade. */
const DEFAULTS: Record<Future, [number, number][]> = {
  f1: [[19, 1]],
  f2: [[19, 1.2]],
  f3: [[6, 1], [7, 2], [12, 1.5], [19, 1.2]],
  f4: [[19, 1]],
}
/** Added to the AI demand index (0–100, capped). */
const DEMAND_ADD: Record<Future, [number, number][]> = {
  f1: [[19, 4]],
  f2: [[19, -6]],
  f3: [[6, 0], [7, -15], [12, -6], [19, -4]],
  f4: [[19, 2]],
}
/** Hyperscaler capex (on top of its drift). */
const CAPEX_Q: Record<Future, [number, number][]> = {
  f1: [[19, 1.2]],
  f2: [[19, 0.95]],
  f3: [[7, 1.0], [8, 0.85], [19, 1.0]],
  f4: [[19, 1.1]],
}
/** Nuclear PPA prices: firm power gets cheaper in F4. */
const NUCLEAR: Record<Future, [number, number][]> = {
  f1: [[19, 1.0]],
  f2: [[19, 1.05]],
  f3: [[19, 1.0]],
  f4: [[9, 1.0], [19, 0.9]],
}

const GROUP: [RegExp, Record<Future, [number, number][]>][] = [
  [/^gpu_.*_usd_hr$|^renewal_|^rfp_new_lease|^ev_per_mw_ai/, RENT],
  [/^power_usd_kwh_/, POWER],
  [/^pjm_capacity/, CAPACITY],
  [/^ai_infra_ev_ebitda_mult$/, AI_MULT],
  [/_purchase_usd$|_system_usd$|_rack_usd$/, HARDWARE],
  [/^tenant_default_prob/, DEFAULTS],
  [/^hyperscaler_capex/, CAPEX_Q],
  [/^nuclear_ppa/, NUCLEAR],
]

/** The 2031 baseline of every carried column (the scenarios' 2030Q4 mean; null where none has one). */
const BASE = Object.fromEntries(CARRIED.map((c) => [c, meanOf(c, '2030Q4')])) as Record<string, number | null>

// ------------------------------------------------------------------------------------- BTC (one common path) ----
// Bitcoin isn't part of the future (doc 33 §10's coda): one designed path for all four. The 2031 price is the
// scenarios' 2030Q4 mean, then +2% a quarter (designed); difficulty +2.5% a quarter (designed); the sixth halving
// lands in 2032Q2 by the 210,000-block schedule (sourced rule, date designed): the subsidy 1.5625 → 0.78125. Hashrate
// and hashprice are derived (Act II's formulas): EH/s = T × 2^32 / 600 / 10^6; $/TH/day = BTC × 144 × subsidy /
// (1 − fee share) / TH/s.
const FEE_SHARE = 0.02
const btcClose = (n: number) => (BASE.btc_usd_close as number) * Math.pow(1.02, n + 1)
const difficulty = (n: number) => (BASE.btc_difficulty_T as number) * Math.pow(1.025, n + 1)
const subsidy = (n: number) => (n >= 5 ? 0.78125 : 1.5625)
const hashrateEh = (t: number) => (t * 1e12 * 2 ** 32) / 600 / 1e18
const hashpriceTh = (btc: number, sub: number, eh: number) =>
  (btc * 144 * sub) / (1 - FEE_SHARE) / (eh * 1e6)

function carriedValue(col: string, f: Future, n: number): number | null {
  if (col === 'btc_usd_close') return btcClose(n)
  if (col === 'btc_difficulty_T') return difficulty(n)
  if (col === 'btc_hashrate_EHs') return hashrateEh(difficulty(n))
  if (col === 'btc_block_subsidy') return subsidy(n)
  if (col === 'btc_hashprice_usd_ph_day')
    return hashpriceTh(btcClose(n), subsidy(n), hashrateEh(difficulty(n))) * 1000
  const base = BASE[col]
  if (base === null) return null
  let v = base * Math.pow(1 + drift(col), n)
  for (const [re, group] of GROUP) if (re.test(col)) v *= index(group, f, n)
  if (/^hy_spread_bps$|^ddtl_spread_bps$/.test(col))
    v += n <= COMMON_UNTIL ? 0 : path([[COMMON_UNTIL, 0], ...SPREAD_ADD[f]], n)
  if (col === 'ai_demand_index_0_100')
    v = Math.max(0, Math.min(100, v + (n <= COMMON_UNTIL ? 0 : path([[COMMON_UNTIL, 0], ...DEMAND_ADD[f]], n))))
  return v
}

// ---------------------------------------------------------------------------------- the new Act IV columns ----
// Each future's designed path as [act quarter, value] anchors; through act quarter 3 (2031) every future is the same.
// Sources (doc 33 §6.2, the cost model's results §4b, doc 31): launch 600 → F1 150 / F2 600 / F3 350 / F4 350 $/kg;
// satellite build 800 → F1 500 / F2 800 / F3–F4 600 $/kg; satellite mass 18 t/MW (Gen 31) → Gen 33 14 (F2 16) from
// 2033Q1, Gen 35 10 (F1, 2034Q3) or 11 (F3, F4, 2035Q1); insurance capacity ~$300M in 2026 [A] → $500–800M by 2035;
// premiums 5–10% young / 2–4% mature / 1–3% in orbit (designed, doc 31 §3); lunar Earth→surface $10–50k/kg
// (inference); landing success 55% → 75% (designed); offtake $2–10k/kg surface, $1–3k/kg lunar orbit ([D]).
type Anchors = [number, number][]
const NEW_COLUMNS: Record<string, Record<Future, Anchors>> = {
  launch_usd_kg_leo: {
    f1: [[3, 600], [7, 450], [11, 320], [15, 220], [19, 150]],
    f2: [[3, 600], [6, 600], [7, 480], [9, 480], [10, 600], [19, 600]],
    f3: [[3, 600], [6, 520], [7, 700], [9, 700], [12, 500], [19, 350]],
    f4: [[3, 600], [9, 480], [19, 350]],
  },
  launch_slots_t_q: {
    f1: [[3, 400], [19, 2400]],
    f2: [[3, 400], [19, 800]],
    f3: [[3, 400], [6, 700], [7, 300], [10, 500], [19, 1200]],
    f4: [[3, 400], [19, 1200]],
  },
  sat_build_usd_kg: {
    f1: [[3, 800], [19, 500]],
    f2: [[3, 800], [19, 800]],
    f3: [[3, 800], [19, 600]],
    f4: [[3, 800], [19, 600]],
  },
  insurance_capacity_usd_m: {
    f1: [[3, 350], [19, 800]],
    f2: [[3, 350], [19, 500]],
    f3: [[3, 350], [6, 450], [7, 300], [11, 320], [19, 600]],
    f4: [[3, 350], [19, 600]],
  },
  insurance_rate_young_pct: {
    f1: [[3, 7.5], [19, 6]],
    f2: [[3, 7.5], [19, 7.5]],
    f3: [[3, 7.5], [6, 7.5], [7, 13], [10, 13], [12, 8.5], [19, 8]],
    f4: [[3, 7.5], [19, 7]],
  },
  insurance_rate_mature_pct: {
    f1: [[3, 3], [19, 2.5]],
    f2: [[3, 3], [19, 3]],
    f3: [[3, 3], [6, 3], [7, 5], [10, 5], [12, 3.5], [19, 3.2]],
    f4: [[3, 3], [19, 2.8]],
  },
  insurance_rate_inorbit_pct: {
    f1: [[3, 2], [19, 1.6]],
    f2: [[3, 2], [19, 2]],
    f3: [[3, 2], [6, 2], [7, 3.5], [10, 3.5], [12, 2.4], [19, 2.2]],
    f4: [[3, 2], [19, 1.9]],
  },
  congestion_sso: {
    f1: [[3, 55], [19, 90]],
    f2: [[3, 55], [19, 65]],
    f3: [[3, 55], [6, 72], [7, 95], [19, 80]],
    f4: [[3, 55], [19, 70]],
  },
  congestion_high_leo: {
    f1: [[3, 20], [19, 50]],
    f2: [[3, 20], [19, 30]],
    f3: [[3, 20], [7, 45], [19, 55]],
    f4: [[3, 20], [19, 35]],
  },
  congestion_high_orbit: {
    f1: [[3, 5], [19, 15]],
    f2: [[3, 5], [19, 8]],
    f3: [[3, 5], [7, 12], [19, 20]],
    f4: [[3, 5], [19, 10]],
  },
  orbital_shell_rent_usd_mw_yr: {
    f1: [[3, 8.5e6], [10, 8.0e6], [19, 5.0e6]],
    f2: [[3, 8.5e6], [19, 9.0e6]],
    f3: [[3, 8.5e6], [6, 8.5e6], [7, 10.5e6], [11, 10.0e6], [19, 8.5e6]],
    f4: [[3, 8.5e6], [9, 8.3e6], [19, 6.0e6]],
  },
  orbital_gpu_usd_hr: {
    f1: [[3, 4.2], [19, 2.6]],
    f2: [[3, 4.2], [19, 4.3]],
    f3: [[3, 4.2], [6, 4.2], [7, 4.8], [19, 4.0]],
    f4: [[3, 4.2], [9, 4.0], [19, 2.8]],
  },
  sovereign_premium_pct: {
    f1: [[3, 20], [19, 15]],
    f2: [[3, 20], [19, 20]],
    f3: [[3, 20], [6, 20], [7, 30], [19, 25]],
    f4: [[3, 20], [19, 15]],
  },
  grid_wait_q: {
    f1: [[3, 20], [19, 20]],
    f2: [[3, 20], [19, 22]],
    f3: [[3, 20], [19, 20]],
    f4: [[3, 20], [9, 20], [12, 10], [19, 8]],
  },
  gas_wait_q: {
    f1: [[3, 8], [19, 8]],
    f2: [[3, 8], [19, 9]],
    f3: [[3, 8], [19, 8]],
    f4: [[3, 8], [9, 8], [19, 6]],
  },
  space_ev_ebitda_mult: {
    f1: [[3, 22], [10, 30], [19, 20]],
    f2: [[3, 22], [19, 12]],
    f3: [[3, 22], [6, 24], [7, 9], [12, 14], [19, 16]],
    f4: [[3, 22], [9, 21], [19, 10]],
  },
  lunar_delivery_usd_kg: {
    f1: [[3, 40000], [19, 15000]],
    f2: [[3, 40000], [19, 35000]],
    f3: [[3, 40000], [19, 25000]],
    f4: [[3, 40000], [19, 25000]],
  },
  lunar_llo_usd_kg: {
    f1: [[3, 8000], [19, 3000]],
    f2: [[3, 8000], [19, 7000]],
    f3: [[3, 8000], [19, 5000]],
    f4: [[3, 8000], [19, 5000]],
  },
  landing_success_pct: {
    f1: [[0, 55], [19, 75]],
    f2: [[0, 55], [19, 75]],
    f3: [[0, 55], [19, 75]],
    f4: [[0, 55], [19, 75]],
  },
  lunar_offtake_surface_usd_kg: {
    f1: [[3, 8000], [19, 3500]],
    f2: [[3, 8000], [19, 6000]],
    f3: [[3, 8000], [6, 8000], [7, 9000], [19, 7000]],
    f4: [[3, 8000], [19, 4500]],
  },
  lunar_offtake_llo_usd_kg: {
    f1: [[3, 2500], [19, 1000]],
    f2: [[3, 2500], [19, 2000]],
    f3: [[3, 2500], [19, 2500]],
    f4: [[3, 2500], [19, 1500]],
  },
  lunar_value_usd_t: {
    f1: [[3, 2000], [19, 2500]],
    f2: [[3, 2000], [19, 1500]],
    f3: [[3, 2000], [6, 2000], [7, 2600], [19, 4000]],
    f4: [[3, 2000], [19, 1800]],
  },
}
/** Columns that are 0/blank switches or step values, not paths. */
function stepColumns(f: Future, n: number): Record<string, number | null> {
  return {
    // Gen 33 delivers in 2033Q1 everywhere, heavier than announced in F2; Gen 35 only in F1 (2034Q3), F3, F4 (2035Q1).
    gen33_t_mw: n >= 8 ? (f === 'f2' ? 16 : 14) : null,
    gen35_t_mw:
      f === 'f1' ? (n >= 14 ? 10 : null) : f === 'f2' ? null : n >= 16 ? 11 : null,
    // F3's cascade closes the busy shell to new launches for 6 quarters from its trigger (doc 33 §7.2: 4–8 ⚙).
    sso_closed: f === 'f3' && n >= TRIGGER.f3 && n < TRIGGER.f3 + 6 ? 1 : 0,
  }
}

const NEW_HEADER = [...Object.keys(NEW_COLUMNS), 'gen33_t_mw', 'gen35_t_mw', 'sso_closed']

// ------------------------------------------------------------------------------------------------- writing ----

function quarterlyCsv(f: Future): string {
  const header = ['quarter', 'future', ...CARRIED, ...NEW_HEADER, 'estimate']
  const lines = [header.join(',')]
  for (let n = 0; n < N; n++) {
    const steps = stepColumns(f, n)
    const cells = [
      QUARTERS[n],
      f,
      ...CARRIED.map((c) => fmt(carriedValue(c, f, n))),
      ...Object.keys(NEW_COLUMNS).map((c) => fmt(path(NEW_COLUMNS[c][f], n))),
      fmt(steps.gen33_t_mw),
      fmt(steps.gen35_t_mw),
      fmt(steps.sso_closed),
      'True',
    ]
    lines.push(cells.join(','))
  }
  return lines.join('\n') + '\n'
}

/** The 13 Mondays of a quarter, starting with its first Monday. */
function mondays(q: string): string[] {
  const year = Number(q.slice(0, 4))
  const first = new Date(Date.UTC(year, (Number(q.slice(5)) - 1) * 3, 1))
  while (first.getUTCDay() !== 1) first.setUTCDate(first.getUTCDate() + 1)
  return Array.from({ length: 13 }, (_, k) => {
    const d = new Date(first)
    d.setUTCDate(d.getUTCDate() + 7 * k)
    return d.toISOString().slice(0, 10)
  })
}

const WEEKLY_HEADER = act3Weekly.s0.header.map((c) => (c === 'scenario' ? 'future' : c))
/** The 2031 baseline of the weekly-only columns (the ASIC $/TH tiers): the scenarios' last 2030 week, mean. */
function weeklyBase(col: string): number {
  const vals = SCENARIOS.map((s) => Number(act3Weekly[s].rows.at(-1)![col]))
  return vals.reduce((a, b) => a + b, 0) / vals.length
}
/** ASIC prices keep falling as new chips come (designed: −3% a quarter, all futures). */
const ASIC_DRIFT = 0.97

function weeklyCsv(f: Future): string {
  const lines = [WEEKLY_HEADER.join(',')]
  let prevBtc = weeklyBase('btc_usd')
  for (let n = 0; n < N; n++) {
    const close = btcClose(n)
    const t = difficulty(n)
    const eh = hashrateEh(t)
    mondays(QUARTERS[n]).forEach((week, k) => {
      // A smooth weekly path from the last close to this one, with a small designed wiggle that is 0 at the close.
      const frac = (k + 1) / 13
      const btc =
        k === 12
          ? close
          : prevBtc * Math.pow(close / prevBtc, frac) * (1 + 0.02 * Math.sin(frac * 2 * Math.PI))
      const sub = subsidy(n)
      const th = hashpriceTh(btc, sub, eh)
      const row: Record<string, string> = {
        week,
        quarter: QUARTERS[n],
        btc_usd: fmt(Math.round(btc * 100) / 100),
        btc_difficulty_T: fmt(t),
        btc_hashrate_EHs: fmt(eh),
        btc_block_subsidy: fmt(sub),
        btc_fee_share: fmt(FEE_SHARE),
        btc_hashprice_usd_th_day: fmt(th),
        btc_hashprice_usd_ph_day: fmt(th * 1000),
        asic_price_usd_th_old: fmt(weeklyBase('asic_price_usd_th_old') * Math.pow(ASIC_DRIFT, n + 1)),
        asic_price_usd_th_mid: fmt(weeklyBase('asic_price_usd_th_mid') * Math.pow(ASIC_DRIFT, n + 1)),
        asic_price_usd_th_new: fmt(weeklyBase('asic_price_usd_th_new') * Math.pow(ASIC_DRIFT, n + 1)),
        asic_price_usd_th_latest: fmt(weeklyBase('asic_price_usd_th_latest') * Math.pow(ASIC_DRIFT, n + 1)),
        gpu_h100_hyperscaler_usd_hr: fmt(carriedValue('gpu_h100_hyperscaler_usd_hr', f, n)),
        gpu_h100_neocloud_usd_hr: fmt(carriedValue('gpu_h100_neocloud_usd_hr', f, n)),
        gpu_h100_spot_usd_hr: fmt(carriedValue('gpu_h100_spot_usd_hr', f, n)),
        gpu_rubin_hyperscaler_usd_hr: fmt(carriedValue('gpu_rubin_hyperscaler_usd_hr', f, n)),
        gpu_rubin_ultra_hyperscaler_usd_hr: fmt(carriedValue('gpu_rubin_ultra_hyperscaler_usd_hr', f, n)),
        future: f,
        estimate: 'True',
      }
      lines.push(WEEKLY_HEADER.map((c) => row[c]).join(','))
    })
    prevBtc = close
  }
  return lines.join('\n') + '\n'
}

mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
for (const f of FUTURES) {
  const files: [string, string][] = [
    [`market_iv_${f}.csv`, quarterlyCsv(f)],
    [`market_weekly_iv_${f}.csv`, weeklyCsv(f)],
  ]
  for (const [name, text] of files) {
    writeFileSync(new URL(`docs/act4-content/${name}`, ROOT), text)
    writeFileSync(new URL(`src/content/${name}`, ROOT), text)
  }
}
console.log(
  `Act IV market: ${FUTURES.length} futures × ${N} quarters (${QUARTERS[0]}–${QUARTERS.at(-1)}), ` +
    `${CARRIED.length} carried + ${NEW_HEADER.length} new columns; weekly ${N * 13} rows each. ` +
    `Written to docs/act4-content/ and src/content/.`,
)
