// M43.0d, the Act V gate's confirmation run (the owner's option A after M43.0c; doc 43 v1.1 §0.6 and §0.7 otherwise;
// throwaway prototype, sim-only): node tools/act5-gate/gate-d.ts [--seeds N] [--out dir]
// Changes from M43.0c (gate-c.ts):
// 1. The Seller's sale proceeds (sites, free MW, plant stakes) first repay its debt, saving that interest; the rest earns
//    the 2035Q4 SOFR each quarter.
// 2. A third archetype, the Locker: keeps every site and plant stake, takes every renewal and blend-and-extend long at
//    the 2036 rate (the Seller's §0.6 lock), contracts 80% of its plant output at market − 10%; sells nothing.
// 3. Targets on the ground-heavy starts (Fortress and the Firm Builder subset): V1 Holder ≥ 1.2 × Seller AND V1 Holder ≥
//    Locker; V3 Locker ≥ 1.05 × Holder. V3 Seller ÷ Holder is information only.
// A confirmation run: no tuning; whatever it shows goes back to the owner.
import { mkdirSync, writeFileSync } from 'node:fs'
import { FUTURE_IDS, quarterInputs, type FutureId } from '../../src/content/index.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import type { GameState } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { poweredKw, usedKw } from '../../src/sim/systems/sites.ts'
import { aiEbitdaUsd, aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { Q, STUBS, leasePath, leasesOf, plantPart, type Stub, type StubId } from './gate-b.ts'
import { FIRM_TYPES, state2035, type FirmType } from './states.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output/act5-gate-d')
const FIRM_BUILDER_LEASE_SHARE = 0.4

const groundFactor = (stub: Stub, t: number) => 1 + 0.5 * (stub.scarcity(t) - 1)

type Bot = 'holder' | 'seller' | 'locker'
const BOTS: Bot[] = ['holder', 'seller', 'locker']
type StartId = FirmType | 'firm_heavy'
interface Parts {
  multiple: number
  lease: number
  siteSale: number
  cashYield: number
  powered: number
  plants: number
  total: number
}
interface GateDRun {
  preset: Act4PresetId
  future: FutureId
  start: StartId
  seed: number
  stub: StubId
  entryUsd: number
  leaseShare: number
  debtUsd: number
  multiples: Record<Bot, number>
  parts: Record<Bot, Parts>
}

function gateRuns(preset: Act4PresetId, future: FutureId, start: StartId, seed: number): GateDRun[] {
  const s: GameState = state2035(preset, future, start === 'firm_heavy' ? (['egs', 'smr'] as const) : start, seed)
  const m = quarterInputs(s.quarter, scenarioOf(s))!
  const r = s.reports.at(-1)!
  const venturesNow = r.venturesUsd ?? 0
  const freeMw = s.sites.reduce((a, x) => a + Math.max(0, poweredKw(x, s.quarter) - usedKw(s, x.id)), 0) / 1000
  const entryUsd = r.valuationUsd + freeMw * 300_000
  const aiMult = aiInfraMultiple(s.quarter, scenarioOf(s))
  const leases = leasesOf(s)
  const aiEbitda0 = aiEbitdaUsd(r)
  const spotRevQ = Math.max(0, r.aiRevenueUsd - leases.reduce((a, l) => a + l.revenueNowQ, 0))
  const ownClusterSites = new Set(s.projects.filter((p) => p.kind !== 'shell' && p.stage === 'live').map((p) => p.siteId))
  const soldIds = new Set(leases.filter((l) => !ownClusterSites.has(l.siteId)).map((l) => l.id))
  const soldMarginQ = leases.filter((l) => soldIds.has(l.id)).reduce((a, l) => a + l.marginNowQ, 0)
  const commonUsd = r.valuationUsd - venturesNow + Q * (r.ebitdaUsd - r.interestUsd)
  // The Seller's cash (mine): its debt at 2035Q4 and that debt's quarterly rate (2035Q4 interest ÷ debt); SOFR per quarter.
  const debtUsd = Math.max(0, r.debtUsd)
  const debtRateQ = debtUsd > 0 ? Math.max(0, r.interestUsd) / debtUsd : 0
  const sofrQ = m.sofrPct / 100 / 4
  const out: GateDRun[] = []
  for (const stubId of ['v1', 'v3'] as const) {
    const stub = STUBS[stubId]
    const f19 = groundFactor(stub, Q - 1)
    const parts = (bot: Bot): Parts => {
      const sells = bot === 'seller'
      const kept = sells ? leases.filter((l) => !soldIds.has(l.id)) : leases
      // The Locker locks its leases as the Seller's §0.6 lock does (leasePath's 'seller' terms).
      const terms = bot === 'holder' ? 'holder' : 'seller'
      let lease = 0
      let leaseDelta19 = 0
      for (const l of kept) {
        const path = leasePath(l, terms, stub, seed)
        lease += path.reduce((a, x) => a + x - l.marginNowQ, 0)
        leaseDelta19 += path[Q - 1] - l.marginNowQ
      }
      lease += leaseDelta19 * 4 * aiMult
      let spot = 0
      for (let t = 0; t < Q; t++) spot += spotRevQ * (groundFactor(stub, t) - 1)
      const spot19 = spotRevQ * (f19 - 1)
      spot += spot19 * 4 * aiMult
      const aiEbitda19 = aiEbitda0 - (sells ? soldMarginQ : 0) + leaseDelta19 + spot19
      const multiple = spot + aiEbitda19 * 4 * aiMult * (f19 - 1)
      const salePrice = soldMarginQ * 4 * aiMult * groundFactor(stub, 0)
      const siteSale = sells ? salePrice - soldMarginQ * 4 * aiMult - Q * soldMarginQ : 0
      const powered = bot === 'seller' ? freeMw * 300_000 : freeMw * stub.poweredUsdMw(Q - 1)
      const plantSaleOrHold = (s.ventures ?? []).reduce((a, v) => a + plantPart(s, v, m, stub, bot, seed), 0)
      // The Seller's proceeds (sites, free MW, plant stakes) repay debt first (the interest saved), then earn SOFR.
      let cashYield = 0
      if (sells) {
        const proceeds = salePrice + freeMw * 300_000 + plantSaleOrHold
        const repaid = Math.min(debtUsd, Math.max(0, proceeds))
        const rest = Math.max(0, proceeds - repaid)
        cashYield = repaid * debtRateQ * Q + rest * ((1 + sofrQ) ** Q - 1)
      }
      const total = commonUsd + multiple + lease + siteSale + cashYield + powered + plantSaleOrHold
      return { multiple, lease, siteSale, cashYield, powered, plants: plantSaleOrHold, total }
    }
    const all = { holder: parts('holder'), seller: parts('seller'), locker: parts('locker') }
    const nw = (v: number) => Math.max(0, s.founderStake * v)
    const base = nw(entryUsd)
    out.push({
      preset,
      future,
      start,
      seed,
      stub: stubId,
      entryUsd,
      leaseShare: entryUsd > 0 ? leases.reduce((a, l) => a + l.marginNowQ * 4 * aiMult, 0) / entryUsd : 0,
      debtUsd,
      multiples: {
        holder: base > 0 ? nw(all.holder.total) / base : 0,
        seller: base > 0 ? nw(all.seller.total) / base : 0,
        locker: base > 0 ? nw(all.locker.total) / base : 0,
      },
      parts: all,
    })
  }
  return out
}

// ---------- Run and report ----------
const STARTS: StartId[] = [...FIRM_TYPES, 'firm_heavy']
const runs: GateDRun[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  for (const future of FUTURE_IDS)
    for (const start of STARTS) for (let seed = 1; seed <= SEEDS; seed++) runs.push(...gateRuns(p.id, future, start, seed))
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}
mkdirSync(OUT, { recursive: true })
const flat = runs.map((r) => ({
  preset: r.preset,
  future: r.future,
  start: r.start,
  seed: r.seed,
  stub: r.stub,
  entryUsd: r.entryUsd,
  leaseShare: r.leaseShare,
  debtUsd: r.debtUsd,
  ...Object.fromEntries(BOTS.map((b) => [`${b}Multiple`, r.multiples[b]])),
  ...Object.fromEntries(
    BOTS.flatMap((b) => (Object.keys(r.parts[b]) as (keyof Parts)[]).map((k) => [`${b}_${k}`, r.parts[b][k]])),
  ),
}))
const cols = Object.keys(flat[0])
writeFileSync(
  `${OUT}/gate-d-runs.csv`,
  [cols.join(','), ...flat.map((r) => cols.map((c) => String((r as Record<string, unknown>)[c])).join(','))].join('\n') + '\n',
)

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
const med = (rs: GateDRun[], b: Bot) => median(rs.map((r) => r.multiples[b]))
type Row = { name: string; judged: boolean; pick: (r: GateDRun) => boolean }
const isFirmBuilder = (r: GateDRun) => r.leaseShare >= FIRM_BUILDER_LEASE_SHARE
const rows: Row[] = [
  { name: 'fortress', judged: true, pick: (r) => r.preset === 'fortress' && r.start !== 'firm_heavy' },
  { name: 'firm builder', judged: true, pick: isFirmBuilder },
  { name: 'neocloud', judged: false, pick: (r) => r.preset === 'neocloud' && r.start !== 'firm_heavy' },
  { name: 'ridge', judged: false, pick: (r) => r.preset === 'ridge' && r.start !== 'firm_heavy' },
  { name: 'firm-heavy', judged: false, pick: (r) => r.start === 'firm_heavy' },
]
const v1Runs = runs.filter((r) => r.stub === 'v1')
say(`M43.0d Act V gate (owner's option A; doc 43 v1.1 §0.6-§0.7), ${SEEDS} seeds; medians of the founder NW multiple, 2040Q4 ÷ act5Entry`)
say(`Firm Builder (leases ≥ 40% of act5Entry): ${v1Runs.filter(isFirmBuilder).length} of ${v1Runs.length} runs qualify`)
for (const stub of ['v1', 'v3'] as const) {
  say(`\n${stub.toUpperCase()}: Holder / Seller / Locker per start × Act IV future (judged rows marked *)`)
  say(`start           ${FUTURE_IDS.map((f) => f.padEnd(20)).join('')}all`)
  for (const row of rows) {
    const cell = (rs: GateDRun[]) => (rs.length ? `${med(rs, 'holder').toFixed(2)}/${med(rs, 'seller').toFixed(2)}/${med(rs, 'locker').toFixed(2)}` : '—')
    const cells = FUTURE_IDS.map((f) => cell(runs.filter((r) => r.stub === stub && r.future === f && row.pick(r))).padEnd(20))
    say(`${(row.name + (row.judged ? ' *' : '')).padEnd(16)}${cells.join('')}${cell(runs.filter((r) => r.stub === stub && row.pick(r)))}`)
  }
  say(`Gap breakdown, as a share of the Holder's 2040 value (medians): multiple / lease repricing / site sale / cash yield / powered / plants`)
  for (const row of rows.filter((x) => x.judged)) {
    const rs = runs.filter((r) => r.stub === stub && row.pick(r))
    for (const other of ['seller', 'locker'] as const) {
      const share = (k: keyof Parts) =>
        `${(median(rs.map((r) => (r.parts.holder[k] - r.parts[other][k]) / Math.max(1, r.parts.holder.total))) * 100).toFixed(1)}%`
      say(`  ${row.name.padEnd(13)} Holder − ${other.padEnd(7)}${share('multiple')} / ${share('lease')} / ${share('siteSale')} / ${share('cashYield')} / ${share('powered')} / ${share('plants')}`)
    }
  }
}
say('\nTargets (judged rows, all futures pooled):')
let ok = true
for (const row of rows.filter((x) => x.judged)) {
  const r1 = runs.filter((r) => r.stub === 'v1' && row.pick(r))
  const r3 = runs.filter((r) => r.stub === 'v3' && row.pick(r))
  const a = med(r1, 'holder') / med(r1, 'seller')
  const b = med(r1, 'holder') / med(r1, 'locker')
  const c = med(r3, 'locker') / med(r3, 'holder')
  const info = med(r3, 'seller') / med(r3, 'holder')
  ok &&= a >= 1.2 && b >= 1 && c >= 1.05
  say(
    `  ${row.name.padEnd(13)} V1 Holder ÷ Seller ${a.toFixed(3)} (≥ 1.2 ${a >= 1.2 ? 'pass' : 'FAIL'}); V1 Holder ÷ Locker ${b.toFixed(3)} (≥ 1 ${b >= 1 ? 'pass' : 'FAIL'}); ` +
      `V3 Locker ÷ Holder ${c.toFixed(3)} (≥ 1.05 ${c >= 1.05 ? 'pass' : 'FAIL'}); info: V3 Seller ÷ Holder ${info.toFixed(3)}`,
  )
}
say(`Gate: ${ok ? 'PASS' : 'FAIL'}`)
writeFileSync(`${OUT}/gate-d-summary.txt`, lines.join('\n') + '\n')
