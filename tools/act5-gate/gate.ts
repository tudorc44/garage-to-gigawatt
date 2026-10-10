// M43.0, the Act V gate (doc 43 §19, V-B2; throwaway prototype, sim-only, nothing in src/ changes):
//   node tools/act5-gate/gate.ts [--seeds N] [--out dir]
// Question: in a jammed-grid 2036-2040 world (V1), does holding firm power beat selling it? Each 2035Q4 company
// (states.ts: the three Act IV presets × the four Act IV futures × one firm venture × seeds) plays 20 stub quarters,
// 2036Q1-2040Q4, twice: as the Firm Holder and as the Seller. Pass: Firm Holder ≥ 1.2 × Seller on the median founder
// net-worth multiple (2040Q4 ÷ 2035Q4). The stub's rules and every assumption are in README.md (all "mine, reversible").
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT, FUTURE_IDS, quarterInputs, type FutureId } from '../../src/content/index.ts'
import { VENTURES } from '../../src/content/energyContent.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { chance, substream, uniform } from '../../src/sim/rng.ts'
import type { GameState, Venture } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { isEgs, ventureCf, ventureRegions, ventureValueUsd } from '../../src/sim/systems/ventures.ts'
import { FIRM_TYPES, state2035, type FirmType } from './states.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output/act5-gate')

// ---------- The stub V1 market (doc 43 §19 and the design thread's prompt) ----------
const Q = 20 // 2036Q1 (t = 0) … 2040Q4 (t = 19)
const HOURS_Q = 2190
const V1 = {
  gridWaitQ: (t: number) => 24 + (4 * t) / (Q - 1), // 24 → 28
  demand: (t: number) => 1 + (0.45 * (t + 1)) / Q, // AI demand index 100 → 145, relative to 2035Q4
  capacityMult: (t: number) => (t >= 7 ? 1.3 : 1), // PJM capacity at the cap (2035Q4's price), lifted 30% from 2037Q4
  merchantMult: (t: number) => 1 + (0.25 * (t + 1)) / Q, // merchant power +25% by 2040Q4
  upgradeUsdKw: 150, // network upgrades: $150/kW for a third off the remaining wait
  upgradeCut: 1 / 3,
}
// Doc 43 §11.3 (working values) and §11.1.
const MULT = { contracted: 12, merchant: 7 }
const SELL = { contractShare: 0.8, contractDiscount: 0.1, priceMult: 1.0 }

type Market = NonNullable<ReturnType<typeof quarterInputs>>

/** The plant's region: its offtake campus, else the class's first eligible region. */
function plantRegion(s: GameState, v: Venture): string {
  const site = s.sites.find((x) => x.id === v.siteId)
  const r = site ? regionOf(site) : undefined
  if (r) return r
  const regions = ventureRegions(v.type)
  return regions === 'any' ? 'ercot' : regions[0]
}

/** A plant's EBITDA in stub quarter t (100% of the plant), with `contracted` of the merchant share sold forward. */
function plantEbitdaQ(s: GameState, v: Venture, m: Market, t: number, contracted = 0): number {
  const q = CONTENT.quarters.length + t // 2036Q1 = the index after 2035Q4
  const region = plantRegion(s, v)
  const cap = region === 'pjm' || region === 'ohio' ? m.pjmCapacityUsdMwDay * V1.capacityMult(t) : 0
  if (v.type === 'pumped') {
    const p = VENTURES.types.pumped
    return (v.mw * 1000 * (p.capacity_usd_kw_yr - p.running_usd_kw_yr)) / 4 + cap * v.mw * 91.25
  }
  const T = VENTURES.types[v.type as 'egs' | 'egs2' | 'smr' | 'adv_fission']
  const cf = isEgs(v.type) && v.weakField && !v.fieldFixed ? VENTURES.types[v.type].weak_field.cf : ventureCf(v, q)
  const mwh = v.mw * cf * HOURS_Q
  const off = Math.min(1, v.offtakeMw / v.mw)
  const merchant = (m.powerUsdKwh[region as keyof Market['powerUsdKwh']] ?? m.powerUsdKwh.ercot) * 1000 * V1.merchantMult(t)
  const merchantShare = 1 - off
  const revenue =
    mwh * off * v.ppaUsdMwh +
    mwh * merchantShare * contracted * merchant * (1 - SELL.contractDiscount) +
    mwh * merchantShare * (1 - contracted) * merchant
  return revenue - mwh * T.running_usd_mwh + cap * v.mw * cf * 91.25
}

/** Doc 43 §11.3: stake × EBITDA × 4 × (contracted × 12 + merchant × 7); no plant debt exists (none before first power). */
const plantValue = (stake: number, ebitdaQ: number, contractedShare: number) =>
  stake * ebitdaQ * 4 * (contractedShare * MULT.contracted + (1 - contractedShare) * MULT.merchant)

interface PlantPath {
  /** First stub quarter the plant runs (0 if already operating; null if not by 2040Q4 or cancelled). */
  codT: number | null
  cancelled: boolean
}

/** The carried draws, played on: first power at the drawn quarter; an undersubscribed reactor may still be cancelled
 *  while licensing (40% a year, doc 38). Seismic pauses and new slips are not drawn (mine). */
function plantPath(v: Venture, seed: number): PlantPath {
  if (v.stage === 'cancelled' || v.stage === 'folded' || v.stake <= 0) return { codT: null, cancelled: true }
  if (v.stage === 'operating') return { codT: 0, cancelled: false }
  const first = CONTENT.quarters.length
  if (v.stage === 'licensing' && (v.type === 'smr' || v.type === 'adv_fission')) {
    const c = VENTURES.types[v.type].cancel
    if (v.othersSubscribed + v.offtakeMw / v.mw < c.subscribed_min)
      for (let t = 0; first + t < v.licenceEnd && t < Q; t++)
        if (chance(substream(seed, `act5gate:cancel:${v.id}:${t}`), 1 - (1 - c.per_year) ** 0.25))
          return { codT: null, cancelled: true }
  }
  const codT = Math.max(v.codQuarter, v.buildEnd) - first
  return { codT: codT < Q ? Math.max(0, codT) : null, cancelled: false }
}

/** The calls still to come on a stake (each third of the overrun, doc 38), and an unfixed weak field's fix. */
function remainingCallsUsd(v: Venture): number {
  const tranche = (v.stake * Math.max(0, v.m - 1) * v.budgetUsd) / 3
  const due = v.call ? v.call.dueUsd : 0
  const fix =
    isEgs(v.type) && v.weakField && !v.fieldFixed ? v.stake * VENTURES.types[v.type].weak_field!.fix_usd_kw * v.mw * 1000 : 0
  return due + Math.max(0, 3 - v.callsDone - (v.call ? 1 : 0)) * tranche + fix
}

export interface GateRun {
  preset: Act4PresetId
  future: FutureId
  type: FirmType
  seed: number
  stage2035: string
  nw2035: number
  holderMultiple: number
  sellerMultiple: number
  holderPlantUsd: number
  sellerPlantUsd: number
  holderExpansionUsd: number
  sellerExpansionUsd: number
  commonUsd: number
  plantShareOfValue: number
  expansionMw: number
  holderEnergizedT: number
  sellerEnergizedT: number
  codT: number
}

function gateRun(preset: Act4PresetId, future: FutureId, type: FirmType, seed: number): GateRun {
  const s = state2035(preset, future, type, seed)
  const m = quarterInputs(s.quarter, scenarioOf(s))!
  const r = s.reports.at(-1)!
  const v = (s.ventures ?? []).find((x) => x.type === type)
  const plant0 = r.venturesUsd ?? 0
  const nw2035 = Math.max(0, s.founderStake * r.valuationUsd)

  // Common to both bots (mine): the company without its venture, held at 2035Q4 (doc 43 §19: "everything else held"),
  // plus 20 quarters of its 2035Q4 cash earnings (EBITDA − interest).
  const commonUsd = r.valuationUsd - plant0 + Q * (r.ebitdaUsd - r.interestUsd)

  // The plant: the Holder keeps it (pays the calls still to come, takes its share of EBITDA, valued on earnings at
  // 2040Q4, or at the milestone mark if it hasn't run by then); the Seller contracts 80% of its merchant share at market
  // − 10% and sells the stake at value × 1.0 in 2036Q1 (the milestone mark if it isn't running yet).
  let holderPlantUsd = 0
  let sellerPlantUsd = 0
  let codT = -1
  if (v && v.stake > 0) {
    const path = plantPath(v, seed)
    codT = path.codT ?? -1
    const off = Math.min(1, v.offtakeMw / v.mw)
    const mark = ventureValueUsd(s, v)
    if (path.cancelled) {
      holderPlantUsd = 0
      sellerPlantUsd = v.stage === 'cancelled' || v.stage === 'folded' ? 0 : mark
    } else {
      const calls = path.codT === 0 ? (isEgs(v.type) && v.weakField && !v.fieldFixed ? remainingCallsUsd(v) : 0) : remainingCallsUsd(v)
      const held: Venture = { ...v, fieldFixed: v.fieldFixed || (isEgs(v.type) && !!v.weakField), stage: 'operating' }
      if (path.codT !== null) {
        if (v.stage !== 'operating') held.codQuarter = CONTENT.quarters.length + path.codT
        let cash = 0
        for (let t = path.codT; t < Q; t++) cash += v.stake * plantEbitdaQ(s, held, m, t)
        holderPlantUsd = cash + plantValue(v.stake, plantEbitdaQ(s, held, m, Q - 1), off) - calls
      }
      // Not running by 2040Q4: the milestone mark; the calls it pays add to the mark at par, so they net out (further
      // milestones not advanced: mine).
      else holderPlantUsd = mark
      if (path.codT === 0) {
        const c = off + SELL.contractShare * (1 - off)
        const sold: Venture = { ...v, fieldFixed: v.fieldFixed }
        sellerPlantUsd = SELL.priceMult * plantValue(v.stake, plantEbitdaQ(s, sold, m, 0, SELL.contractShare), c)
      } else sellerPlantUsd = SELL.priceMult * mark
    }
  }

  // The queue (mine): both bots request a ground expansion in 2036Q1 (a quarter of their energized MW, at least 10 MW),
  // shell capex at the 2035Q4 greenfield price; it energizes after the V1 wait × U(0.8, 1.2) (the Firm Holder pays $150/kW
  // for a third off). Energized MW rent at the 2035Q4 stabilized EV/MW ÷ (4 × the AI multiple) × the demand index, and are
  // valued at the AI multiple at 2040Q4; not energized by then: under construction at capex spent (net 0).
  // Only a company whose cash covers the shell (and, for the Holder, the upgrade) requests it (mine).
  const energizedMw = s.sites.reduce((a, x) => a + poweredKw(x, s.quarter), 0) / 1000
  const wantMw = Math.max(10, Math.round(energizedMw / 4))
  const expansionMw = s.cash >= wantMw * (m.capexUsdMw.greenfieldShell + 1000 * V1.upgradeUsdKw) ? wantMw : 0
  const wait = V1.gridWaitQ(0) * uniform(substream(seed, `act5gate:wait:${preset}:${future}:${type}`), 0.8, 1.2)
  const evMw = (m.evPerMwUsdM.aiStabilized ?? m.evPerMwUsdM.aiAnnounced ?? 0) * 1e6
  const rentMwQ = (t: number) => (evMw / (4 * m.multiple.aiInfra)) * V1.demand(t)
  const capex = expansionMw * m.capexUsdMw.greenfieldShell
  const expansion = (energizeT: number) => {
    if (energizeT >= Q || expansionMw === 0) return 0
    let cash = 0
    for (let t = energizeT; t < Q; t++) cash += expansionMw * rentMwQ(t)
    return cash + expansionMw * rentMwQ(Q - 1) * 4 * m.multiple.aiInfra - capex
  }
  const holderEnergizedT = Math.ceil(wait * (1 - V1.upgradeCut))
  const sellerEnergizedT = Math.ceil(wait)
  const holderExpansionUsd = expansion(holderEnergizedT) - expansionMw * 1000 * V1.upgradeUsdKw
  const sellerExpansionUsd = expansion(sellerEnergizedT)

  const holder2040 = commonUsd + holderPlantUsd + holderExpansionUsd
  const seller2040 = commonUsd + sellerPlantUsd + sellerExpansionUsd
  const nw = (v2040: number) => Math.max(0, s.founderStake * v2040)
  return {
    preset,
    future,
    type,
    seed,
    stage2035: v?.stage ?? 'none',
    nw2035,
    holderMultiple: nw2035 > 0 ? nw(holder2040) / nw2035 : 0,
    sellerMultiple: nw2035 > 0 ? nw(seller2040) / nw2035 : 0,
    holderPlantUsd,
    sellerPlantUsd,
    holderExpansionUsd,
    sellerExpansionUsd,
    commonUsd,
    plantShareOfValue: r.valuationUsd > 0 ? plant0 / r.valuationUsd : 0,
    expansionMw,
    holderEnergizedT,
    sellerEnergizedT,
    codT,
  }
}

// ---------- Run ----------
const runs: GateRun[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  for (const future of FUTURE_IDS)
    for (const type of FIRM_TYPES) for (let seed = 1; seed <= SEEDS; seed++) runs.push(gateRun(p.id, future, type, seed))
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}
mkdirSync(OUT, { recursive: true })
const cols = Object.keys(runs[0]) as (keyof GateRun)[]
writeFileSync(`${OUT}/gate-runs.csv`, [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n')

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const a = [...xs].sort((x, y) => x - y)
  const i = Math.floor(a.length / 2)
  return a.length % 2 ? a[i] : (a[i - 1] + a[i]) / 2
}
const lines: string[] = []
const say = (l: string) => {
  lines.push(l)
  console.log(l)
}
const ratio = (rs: GateRun[]) => median(rs.map((r) => r.holderMultiple)) / median(rs.map((r) => r.sellerMultiple))
// The gate compares holding firm power with selling it: a company that never held a stake (the cash guard kept it out,
// or it was cancelled before 2035Q4) has nothing to hold or sell, and is left out (counted).
const held = runs.filter((r) => r.stage2035 !== 'none' && r.stage2035 !== 'cancelled' && r.stage2035 !== 'folded')
say(`M43.0 Act V gate (V-B2: Firm Holder ≥ 1.2 × Seller, median founder NW multiple 2040Q4 ÷ 2035Q4), ${SEEDS} seeds`)
say(`runs with a plant stake at 2035Q4: ${held.length} of ${runs.length} (the rest are left out)`)
say('preset   future   n    holder  seller  ratio   (pooled over the firm classes: ' + FIRM_TYPES.join(', ') + ')')
let pass = 0
let cells = 0
for (const p of PRESETS_IV)
  for (const f of FUTURE_IDS) {
    const rs = held.filter((r) => r.preset === p.id && r.future === f)
    const k = ratio(rs)
    cells++
    if (k >= 1.2) pass++
    say(`${p.id.padEnd(9)}${f.padEnd(6)}${String(rs.length).padStart(4)}  ${median(rs.map((r) => r.holderMultiple)).toFixed(3).padStart(6)}  ${median(rs.map((r) => r.sellerMultiple)).toFixed(3).padStart(6)}  ${k.toFixed(3)}${k >= 1.2 ? '  PASS' : ''}`)
  }
const all = ratio(held)
say(`all: ratio ${all.toFixed(3)} → ${all >= 1.2 ? 'PASS' : 'FAIL'} (${pass}/${cells} cells ≥ 1.2)`)
say('\nBy class (runs with a stake): holder/seller ratio; plant-only (holder plant ÷ seller plant, medians); plant share of 2035Q4 value')
for (const type of FIRM_TYPES) {
  const rs = held.filter((r) => r.type === type)
  const plantOnly = median(rs.map((r) => r.holderPlantUsd)) / median(rs.map((r) => r.sellerPlantUsd))
  say(`${type.padEnd(12)} ratio ${ratio(rs).toFixed(3)}  plant-only ${plantOnly.toFixed(2)}  plant share ${(median(rs.map((r) => r.plantShareOfValue)) * 100).toFixed(1)}%  stage2035 ${[...new Set(rs.map((r) => r.stage2035))].map((st) => `${st} ${rs.filter((r) => r.stage2035 === st).length}`).join(', ')}`)
}
const seller2040 = (r: GateRun) => Math.max(1, r.commonUsd + r.sellerPlantUsd + r.sellerExpansionUsd)
const gapPct = (f: (r: GateRun) => number) => (median(held.map((r) => f(r) / seller2040(r))) * 100).toFixed(1)
say(
  `\nHolder − Seller as a share of the Seller's 2040 company value (medians): plant ${gapPct((r) => r.holderPlantUsd - r.sellerPlantUsd)}%, ` +
    `expansion ${gapPct((r) => r.holderExpansionUsd - r.sellerExpansionUsd)}%`,
)
writeFileSync(`${OUT}/gate-summary.txt`, lines.join('\n') + '\n')
