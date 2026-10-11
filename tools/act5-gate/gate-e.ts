// M43.0e, the Act V gate on doc 47's real market files (doc 43 v1.2 §0.11; throwaway prototype, sim-only, no tuning):
//   node tools/act5-gate/gate-e.ts [--seeds N] [--out dir]
// M43.0d's three archetypes (Holder, Seller, Locker) and rules, with the stub paths replaced by the Act V market files
// (docs/act5-content/market_v_v1..v4.csv): V1 and V3 judged, V2 and V4 for information. Each 2035Q4 company is played on
// all four Act V futures. Series that also exist in Act IV glide from the company's own 2035Q4 value to the file's over
// 4 quarters (doc 43 §3.3): regional power prices, the PJM capacity price, the AI multiple and SOFR.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { FUTURE_IDS, quarterInputs, type FutureId } from '../../src/content/index.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import type { GameState } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { poweredKw, usedKw } from '../../src/sim/systems/sites.ts'
import { aiEbitdaUsd, aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { Q, leasePath, leasesOf, plantPart, type Market, type Stub } from './gate-b.ts'
import { FIRM_TYPES, state2035, type FirmType } from './states.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output/act5-gate-e')
const FIRM_BUILDER_LEASE_SHARE = 0.4
const GLIDE_Q = 4

// ---------- The Act V market files ----------
type VFuture = 'v1' | 'v2' | 'v3' | 'v4'
const V_FUTURES: VFuture[] = ['v1', 'v2', 'v3', 'v4']
const FILE_DIR = new URL('../../docs/act5-content/', import.meta.url)
function readFuture(f: VFuture): Record<string, number>[] {
  const [h, ...ls] = readFileSync(new URL(`market_v_${f}.csv`, FILE_DIR), 'utf8').trim().split(/\r?\n/)
  const cols = h.split(',')
  return ls.map((l) => Object.fromEntries(l.split(',').map((c, i) => [cols[i], c === '' ? NaN : Number(c)])))
}
const FILES = Object.fromEntries(V_FUTURES.map((f) => [f, readFuture(f)])) as Record<VFuture, Record<string, number>[]>
const col = (f: VFuture, name: string, t: number) => FILES[f][Math.min(Q - 1, Math.max(0, t))][name]

/** A series that also exists in Act IV: the company's 2035Q4 value at t = 0, the file's from t = 4, straight between. */
const glide = (iv: number, file: number, t: number) => (t >= GLIDE_Q ? file : iv + ((file - iv) * t) / GLIDE_Q)

/** A stub built from a future's file, for one company's 2035Q4 market (the glide's start). */
function fileStub(f: VFuture, m: Market): Stub {
  const cap0 = col(f, 'pjm_capacity_price_usd_mwday', 0)
  return {
    scarcity: (t) => col(f, 'scarcity_index', t),
    poweredUsdMw: (t) => col(f, 'powered_value_usd_mw', t),
    merchantMult: () => 1, // (unused: powerUsdKwh is given)
    capacityMult: (t) => col(f, 'pjm_capacity_price_usd_mwday', t) / cap0, // pumped storage's capacity path (mine)
    plantMerchantMultiple: (t) => col(f, 'plant_mult_merchant', t),
    plantContractedMultiple: (t) => col(f, 'plant_mult_contracted', t),
    spreadUsdMwh: (t) => col(f, 'peak_spread_10h_usd_mwh', t),
    powerUsdKwh: (region, t) => {
      const name = `power_usd_kwh_${region}`
      const file = Number.isNaN(col(f, name, t)) || col(f, name, t) === undefined ? col(f, 'power_usd_kwh_ercot', t) : col(f, name, t)
      const iv = m.powerUsdKwh[region as keyof Market['powerUsdKwh']] ?? m.powerUsdKwh.ercot
      return glide(iv, file, t)
    },
    pjmCapacityUsdMwDay: (t) => glide(m.pjmCapacityUsdMwDay, col(f, 'pjm_capacity_price_usd_mwday', t), t),
    walkProb: (type, t) =>
      col(f, type === 'hyperscaler' ? 'tenant_walk_prob_at_renewal_hyperscaler' : 'tenant_walk_prob_at_renewal_nonhyperscaler', t),
  }
}

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
interface GateERun {
  preset: Act4PresetId
  future: FutureId
  start: StartId
  seed: number
  vfuture: VFuture
  entryUsd: number
  leaseShare: number
  multiples: Record<Bot, number>
  parts: Record<Bot, Parts>
}

function gateRuns(preset: Act4PresetId, future: FutureId, start: StartId, seed: number): GateERun[] {
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
  const debtUsd = Math.max(0, r.debtUsd)
  const debtRateQ = debtUsd > 0 ? Math.max(0, r.interestUsd) / debtUsd : 0
  const out: GateERun[] = []
  for (const vf of V_FUTURES) {
    const stub = fileStub(vf, m)
    const f19 = groundFactor(stub, Q - 1)
    const mult19 = glide(aiMult, col(vf, 'ai_infra_ev_ebitda_mult', Q - 1), Q - 1)
    const mult0 = glide(aiMult, col(vf, 'ai_infra_ev_ebitda_mult', 0), 0)
    const parts = (bot: Bot): Parts => {
      const sells = bot === 'seller'
      const kept = sells ? leases.filter((l) => !soldIds.has(l.id)) : leases
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
      // The multiple: the 2040Q4 AI EBITDA held, at the file's (glided) multiple × the scarcity factor, against the
      // 2035Q4 multiple everything else above is valued at.
      const multiple = spot + aiEbitda19 * 4 * (mult19 * f19 - aiMult)
      const salePrice = soldMarginQ * 4 * mult0 * groundFactor(stub, 0)
      const siteSale = sells ? salePrice - soldMarginQ * 4 * aiMult - Q * soldMarginQ : 0
      const powered = bot === 'seller' ? freeMw * stub.poweredUsdMw(0) : freeMw * stub.poweredUsdMw(Q - 1)
      const plants = (s.ventures ?? []).reduce((a, v) => a + plantPart(s, v, m, stub, bot, seed), 0)
      let cashYield = 0
      if (sells) {
        const proceeds = salePrice + freeMw * stub.poweredUsdMw(0) + plants
        const repaid = Math.min(debtUsd, Math.max(0, proceeds))
        let rest = Math.max(0, proceeds - repaid)
        const start = rest
        for (let t = 0; t < Q; t++) rest *= 1 + glide(m.sofrPct, col(vf, 'sofr_pct', t), t) / 100 / 4
        cashYield = repaid * debtRateQ * Q + (rest - start)
      }
      const total = commonUsd + multiple + lease + siteSale + cashYield + powered + plants
      return { multiple, lease, siteSale, cashYield, powered, plants, total }
    }
    const all = { holder: parts('holder'), seller: parts('seller'), locker: parts('locker') }
    const nw = (v: number) => Math.max(0, s.founderStake * v)
    const base = nw(entryUsd)
    out.push({
      preset,
      future,
      start,
      seed,
      vfuture: vf,
      entryUsd,
      leaseShare: entryUsd > 0 ? leases.reduce((a, l) => a + l.marginNowQ * 4 * aiMult, 0) / entryUsd : 0,
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
const runs: GateERun[] = []
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
  vfuture: r.vfuture,
  entryUsd: r.entryUsd,
  leaseShare: r.leaseShare,
  ...Object.fromEntries(BOTS.map((b) => [`${b}Multiple`, r.multiples[b]])),
  ...Object.fromEntries(BOTS.flatMap((b) => (Object.keys(r.parts[b]) as (keyof Parts)[]).map((k) => [`${b}_${k}`, r.parts[b][k]]))),
}))
const cols = Object.keys(flat[0])
writeFileSync(
  `${OUT}/gate-e-runs.csv`,
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
const med = (rs: GateERun[], b: Bot) => median(rs.map((r) => r.multiples[b]))
type Row = { name: string; judged: boolean; pick: (r: GateERun) => boolean }
const isFirmBuilder = (r: GateERun) => r.leaseShare >= FIRM_BUILDER_LEASE_SHARE
const rows: Row[] = [
  { name: 'fortress', judged: true, pick: (r) => r.preset === 'fortress' && r.start !== 'firm_heavy' },
  { name: 'firm builder', judged: true, pick: isFirmBuilder },
  { name: 'neocloud', judged: false, pick: (r) => r.preset === 'neocloud' && r.start !== 'firm_heavy' },
  { name: 'ridge', judged: false, pick: (r) => r.preset === 'ridge' && r.start !== 'firm_heavy' },
  { name: 'firm-heavy', judged: false, pick: (r) => r.start === 'firm_heavy' },
]
const v1 = runs.filter((r) => r.vfuture === 'v1')
say(`M43.0e Act V gate on doc 47's market files (doc 43 v1.2 §0.11), ${SEEDS} seeds; medians of the founder NW multiple, 2040Q4 ÷ act5Entry`)
say(`Firm Builder (leases ≥ 40% of act5Entry): ${v1.filter(isFirmBuilder).length} of ${v1.length} runs qualify`)
for (const vf of V_FUTURES) {
  const judged = vf === 'v1' || vf === 'v3'
  say(`\n${vf.toUpperCase()}${judged ? '' : ' (information)'}: Holder / Seller / Locker per start × Act IV future (judged rows marked *)`)
  say(`start           ${FUTURE_IDS.map((f) => f.padEnd(20)).join('')}all`)
  for (const row of rows) {
    const cell = (rs: GateERun[]) => (rs.length ? `${med(rs, 'holder').toFixed(2)}/${med(rs, 'seller').toFixed(2)}/${med(rs, 'locker').toFixed(2)}` : '—')
    const cells = FUTURE_IDS.map((f) => cell(runs.filter((r) => r.vfuture === vf && r.future === f && row.pick(r))).padEnd(20))
    say(`${(row.name + (row.judged ? ' *' : '')).padEnd(16)}${cells.join('')}${cell(runs.filter((r) => r.vfuture === vf && row.pick(r)))}`)
  }
  say(`Gap breakdown, as a share of the Holder's 2040 value (medians): multiple / lease repricing / site sale / cash yield / powered / plants`)
  for (const row of rows.filter((x) => x.judged)) {
    const rs = runs.filter((r) => r.vfuture === vf && row.pick(r))
    for (const other of ['seller', 'locker'] as const) {
      const share = (k: keyof Parts) =>
        `${(median(rs.map((r) => (r.parts.holder[k] - r.parts[other][k]) / Math.max(1, r.parts.holder.total))) * 100).toFixed(1)}%`
      say(`  ${row.name.padEnd(13)} Holder − ${other.padEnd(7)}${share('multiple')} / ${share('lease')} / ${share('siteSale')} / ${share('cashYield')} / ${share('powered')} / ${share('plants')}`)
    }
  }
}
say('\nTargets (judged rows, Act IV futures pooled):')
let v1ok = true
let v3ok = true
for (const row of rows.filter((x) => x.judged)) {
  const r1 = runs.filter((r) => r.vfuture === 'v1' && row.pick(r))
  const r3 = runs.filter((r) => r.vfuture === 'v3' && row.pick(r))
  const a = med(r1, 'holder') / med(r1, 'seller')
  const b = med(r1, 'holder') / med(r1, 'locker')
  const c = med(r3, 'locker') / med(r3, 'holder')
  const info = med(r3, 'seller') / med(r3, 'holder')
  v1ok &&= a >= 1.2 && b >= 1
  v3ok &&= c >= 1.05
  say(
    `  ${row.name.padEnd(13)} V1 Holder ÷ Seller ${a.toFixed(3)} (≥ 1.2 ${a >= 1.2 ? 'pass' : 'FAIL'}); V1 Holder ÷ Locker ${b.toFixed(3)} (≥ 1 ${b >= 1 ? 'pass' : 'FAIL'}); ` +
      `V3 Locker ÷ Holder ${c.toFixed(3)} (≥ 1.05 ${c >= 1.05 ? 'pass' : 'FAIL'}); info: V3 Seller ÷ Holder ${info.toFixed(3)}`,
  )
}
say(`V1 targets: ${v1ok ? 'all pass' : 'a V1 target FAILS (the stop rule: steps 2 and 3, then stop)'}; V3: ${v3ok ? 'pass' : 'a V3 target misses (recorded; the balance pass owns it)'}`)
writeFileSync(`${OUT}/gate-e-summary.txt`, lines.join('\n') + '\n')
