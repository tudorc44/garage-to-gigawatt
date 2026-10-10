// M43.0c, the Act V gate's third run (doc 43 v1.1 §0.7, on top of §0.6; throwaway prototype, sim-only):
//   node tools/act5-gate/gate-c.ts [--seeds N] [--out dir]
// What §0.7 adds to M43.0b (gate-b.ts, whose model this reuses):
// 1. Scarcity moves the AI (ground) multiple: market × (1 + 0.5 × (scarcity_index − 1)); spot GPU rents move by the same
//    factor.
// 2. The Seller also sells every leased ground site in 2036Q1 at that quarter's value (EBITDA × the multiple; its free MW
//    are already sold at the powered value), keeping the sites that serve its own GPU clusters.
// 3. V-B2 and V-B4 are judged on the ground-heavy starts: Ground Fortress, and a Firm Builder start (any run whose
//    leases are ≥ 40% of act5Entry). The others are information.
// Stop rule: if the ground-heavy starts land at 1.10-1.19 on either stub, the owner chooses (a 1.10 margin or a miss).
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
const OUT = argValue('--out', 'sim-output/act5-gate-c')
const FIRM_BUILDER_LEASE_SHARE = 0.4

/** §0.7 item 1: the factor on the AI multiple and on spot GPU rents in stub quarter t. */
const groundFactor = (stub: Stub, t: number) => 1 + 0.5 * (stub.scarcity(t) - 1)

type StartId = FirmType | 'firm_heavy'
interface GateCRun {
  preset: Act4PresetId
  future: FutureId
  start: StartId
  seed: number
  stub: StubId
  entryUsd: number
  holderMultiple: number
  sellerMultiple: number
  /** Holder − Seller by part, $: the multiple (and spot rents), lease repricing, the Seller's site sale, powered value, plants. */
  multipleGapUsd: number
  leaseGapUsd: number
  siteSaleGapUsd: number
  poweredGapUsd: number
  plantGapUsd: number
  seller2040Usd: number
  leaseShare: number
  soldSites: number
}

function gateRuns(preset: Act4PresetId, future: FutureId, start: StartId, seed: number): GateCRun[] {
  const s: GameState = state2035(preset, future, start === 'firm_heavy' ? (['egs', 'smr'] as const) : start, seed)
  const m = quarterInputs(s.quarter, scenarioOf(s))!
  const r = s.reports.at(-1)!
  const venturesNow = r.venturesUsd ?? 0
  const freeMw = s.sites.reduce((a, x) => a + Math.max(0, poweredKw(x, s.quarter) - usedKw(s, x.id)), 0) / 1000
  const entryUsd = r.valuationUsd + freeMw * 300_000
  const aiMult = aiInfraMultiple(s.quarter, scenarioOf(s))
  const leases = leasesOf(s)
  const aiEbitda0 = aiEbitdaUsd(r)
  // Spot GPU revenue (mine): the AI revenue that isn't a lease's.
  const spotRevQ = Math.max(0, r.aiRevenueUsd - leases.reduce((a, l) => a + l.revenueNowQ, 0))
  // Sites that serve the company's own GPU clusters (any cloud project), kept by the Seller (mine).
  const ownClusterSites = new Set(s.projects.filter((p) => p.kind !== 'shell' && p.stage === 'live').map((p) => p.siteId))
  const sold = leases.filter((l) => !ownClusterSites.has(l.siteId))
  const soldIds = new Set(sold.map((l) => l.id))
  const soldMarginQ = sold.reduce((a, l) => a + l.marginNowQ, 0)
  const commonUsd = r.valuationUsd - venturesNow + Q * (r.ebitdaUsd - r.interestUsd)
  const out: GateCRun[] = []
  for (const stubId of ['v1', 'v3'] as const) {
    const stub = STUBS[stubId]
    const f19 = groundFactor(stub, Q - 1)
    const parts = (bot: 'holder' | 'seller') => {
      const kept = bot === 'holder' ? leases : leases.filter((l) => !soldIds.has(l.id))
      // Lease repricing (at the 2035Q4 multiple): the cash change along the way and the 2040Q4 margin change × the multiple.
      let lease = 0
      let leaseDelta19 = 0
      for (const l of kept) {
        const path = leasePath(l, bot, stub, seed)
        lease += path.reduce((a, x) => a + x - l.marginNowQ, 0)
        leaseDelta19 += path[Q - 1] - l.marginNowQ
      }
      lease += leaseDelta19 * 4 * aiMult
      // Spot rents move with the factor (cash along the way and the 2040Q4 EBITDA); then the factor on the whole 2040Q4
      // AI EBITDA the bot still holds.
      let spot = 0
      for (let t = 0; t < Q; t++) spot += spotRevQ * (groundFactor(stub, t) - 1)
      const spot19 = spotRevQ * (f19 - 1)
      spot += spot19 * 4 * aiMult
      const soldOut = bot === 'seller' ? soldMarginQ : 0
      const aiEbitda19 = aiEbitda0 - soldOut + leaseDelta19 + spot19
      const multiple = spot + aiEbitda19 * 4 * aiMult * (f19 - 1)
      // The Seller's site sale: the 2036Q1 price, less the sold leases' 2035Q4 value and their 20 quarters of margin.
      const siteSale = bot === 'seller' ? soldMarginQ * 4 * aiMult * groundFactor(stub, 0) - soldMarginQ * 4 * aiMult - Q * soldMarginQ : 0
      const powered = bot === 'holder' ? freeMw * stub.poweredUsdMw(Q - 1) : freeMw * 300_000
      const plants = (s.ventures ?? []).reduce((a, v) => a + plantPart(s, v, m, stub, bot, seed), 0)
      return { multiple, lease, siteSale, powered, plants, total: commonUsd + multiple + lease + siteSale + powered + plants }
    }
    const h = parts('holder')
    const se = parts('seller')
    const nw = (v: number) => Math.max(0, s.founderStake * v)
    const base = nw(entryUsd)
    out.push({
      preset,
      future,
      start,
      seed,
      stub: stubId,
      entryUsd,
      holderMultiple: base > 0 ? nw(h.total) / base : 0,
      sellerMultiple: base > 0 ? nw(se.total) / base : 0,
      multipleGapUsd: h.multiple - se.multiple,
      leaseGapUsd: h.lease - se.lease,
      siteSaleGapUsd: h.siteSale - se.siteSale,
      poweredGapUsd: h.powered - se.powered,
      plantGapUsd: h.plants - se.plants,
      seller2040Usd: se.total,
      leaseShare: entryUsd > 0 ? leases.reduce((a, l) => a + l.marginNowQ * 4 * aiMult, 0) / entryUsd : 0,
      soldSites: new Set(sold.map((l) => l.siteId)).size,
    })
  }
  return out
}

// ---------- Run and report ----------
const STARTS: StartId[] = [...FIRM_TYPES, 'firm_heavy']
const runs: GateCRun[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  for (const future of FUTURE_IDS)
    for (const start of STARTS) for (let seed = 1; seed <= SEEDS; seed++) runs.push(...gateRuns(p.id, future, start, seed))
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}
mkdirSync(OUT, { recursive: true })
const cols = Object.keys(runs[0]) as (keyof GateCRun)[]
writeFileSync(`${OUT}/gate-c-runs.csv`, [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n')

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
const ratio = (rs: GateCRun[], stub: StubId) => {
  const h = median(rs.map((r) => r.holderMultiple))
  const s = median(rs.map((r) => r.sellerMultiple))
  return stub === 'v1' ? h / s : s / h
}
type Row = { name: string; judged: boolean; pick: (r: GateCRun) => boolean }
const isFirmBuilder = (r: GateCRun) => r.leaseShare >= FIRM_BUILDER_LEASE_SHARE
const rows: Row[] = [
  { name: 'fortress', judged: true, pick: (r) => r.preset === 'fortress' && r.start !== 'firm_heavy' },
  { name: 'firm builder', judged: true, pick: isFirmBuilder },
  { name: 'neocloud', judged: false, pick: (r) => r.preset === 'neocloud' && r.start !== 'firm_heavy' },
  { name: 'ridge', judged: false, pick: (r) => r.preset === 'ridge' && r.start !== 'firm_heavy' },
  { name: 'firm-heavy', judged: false, pick: (r) => r.start === 'firm_heavy' },
]
const v1Runs = runs.filter((r) => r.stub === 'v1')
const fb = v1Runs.filter(isFirmBuilder)
say(`M43.0c Act V gate (doc 43 v1.1 §0.6 + §0.7), ${SEEDS} seeds; medians of the founder NW multiple, 2040Q4 ÷ act5Entry`)
say(
  `Firm Builder start (leases ≥ 40% of act5Entry): ${fb.length} of ${v1Runs.length} runs qualify (` +
    PRESETS_IV.map((p) => `${p.id} ${fb.filter((r) => r.preset === p.id).length}`).join(', ') +
    `; of them firm-heavy ${fb.filter((r) => r.start === 'firm_heavy').length})`,
)
const verdict: Record<StubId, number[]> = { v1: [], v3: [] }
for (const stub of ['v1', 'v3'] as const) {
  say(`\n${stub === 'v1' ? 'V1: Holder ÷ Seller' : 'V3: Seller ÷ Holder'} (pass ≥ 1.2 on the judged rows, marked *)`)
  say(`start           ${FUTURE_IDS.map((f) => f.padEnd(24)).join('')}all`)
  for (const row of rows) {
    const cells = FUTURE_IDS.map((f) => {
      const rs = runs.filter((r) => r.stub === stub && r.future === f && row.pick(r))
      if (rs.length === 0) return '—'.padEnd(24)
      const h = median(rs.map((r) => r.holderMultiple))
      const s = median(rs.map((r) => r.sellerMultiple))
      return `${h.toFixed(2)}/${s.toFixed(2)}=${ratio(rs, stub).toFixed(3)} (${rs.length})`.padEnd(24)
    })
    const all = runs.filter((r) => r.stub === stub && row.pick(r))
    const k = ratio(all, stub)
    if (row.judged) verdict[stub].push(k)
    say(`${(row.name + (row.judged ? ' *' : '')).padEnd(16)}${cells.join('')}${k.toFixed(3)}`)
  }
  const share = (rs: GateCRun[], f: (r: GateCRun) => number) =>
    `${(median(rs.map((r) => f(r) / Math.max(1, r.seller2040Usd))) * 100).toFixed(1)}%`
  say('Holder − Seller as a share of the Seller\'s 2040 value (medians): multiple (and spot) / lease repricing / site sale / powered value / plants')
  for (const row of rows) {
    const rs = runs.filter((r) => r.stub === stub && row.pick(r))
    say(
      `  ${row.name.padEnd(14)} ${share(rs, (r) => r.multipleGapUsd)} / ${share(rs, (r) => r.leaseGapUsd)} / ${share(rs, (r) => r.siteSaleGapUsd)} / ${share(rs, (r) => r.poweredGapUsd)} / ${share(rs, (r) => r.plantGapUsd)}`,
    )
  }
}
const pass = (xs: number[]) => xs.every((k) => k >= 1.2)
const band = (xs: number[]) => xs.some((k) => k >= 1.1 && k < 1.2)
say(
  `\nGate (judged rows): V1 ${verdict.v1.map((k) => k.toFixed(3)).join(', ')}; V3 ${verdict.v3.map((k) => k.toFixed(3)).join(', ')} → ` +
    `${pass(verdict.v1) && pass(verdict.v3) ? 'PASS' : 'FAIL'}${band([...verdict.v1, ...verdict.v3]) ? ' (a judged row at 1.10-1.19: the stop rule applies, the owner chooses)' : ''}`,
)
writeFileSync(`${OUT}/gate-c-summary.txt`, lines.join('\n') + '\n')
