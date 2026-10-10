// M43.0b, the Act V gate redone (doc 43 v1.1 §0, rules in §0.6; throwaway prototype, sim-only, nothing in src/ changes):
//   node tools/act5-gate/gate-b.ts [--seeds N] [--out dir]
// The decision is the whole ground book: lock it in at 2036 prices (Seller) or keep it open to the scarcity price (Firm
// Holder). Each 2035Q4 company (states.ts) plays 20 stub quarters, 2036Q1-2040Q4, on two stub futures (V1: scarcity
// rises; V3: it falls after a 2037Q4 trigger), as each bot. Pass: V1 Holder ≥ 1.2 × Seller AND V3 Seller ≥ 1.2 × Holder
// (medians of the founder net-worth multiple, 2040Q4 ÷ act5Entry). Assumptions: README.md, "M43.0b".
import { mkdirSync, writeFileSync } from 'node:fs'
import { BALANCE, CONTENT, FUTURE_IDS, quarterInputs, type FutureId } from '../../src/content/index.ts'
import { VENTURES } from '../../src/content/energyContent.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { chance, substream } from '../../src/sim/rng.ts'
import type { GameState, Project, Venture } from '../../src/sim/state.ts'
import { contractEndQuarter } from '../../src/sim/systems/calendar.ts'
import { shellTierRentMult } from '../../src/sim/systems/density.ts'
import { gpuRenewalIndex, rfpMid, walkProbAtRenewal } from '../../src/sim/systems/leaseIndex.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { annualContractUsd, annualRentUsd, ownedShareOut, tenantCard } from '../../src/sim/systems/projects.ts'
import { poweredKw, regionOf, usedKw } from '../../src/sim/systems/sites.ts'
import { aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { isEgs, ventureCf, ventureRegions, ventureValueUsd } from '../../src/sim/systems/ventures.ts'
import { FIRM_TYPES, state2035, type FirmType } from './states.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output/act5-gate-b')

// ---------- The two stub futures (doc 43 §0.6 item 5; V1's baseline as M43.0's stub) ----------
const Q = 20 // t = 0 (2036Q1) … 19 (2040Q4)
const HOURS_Q = 2190
const TRIGGER = 7 // 2037Q4
const lerp = (a: number, b: number, x: number) => a + (b - a) * Math.min(1, Math.max(0, x))
type StubId = 'v1' | 'v3'
interface Stub {
  scarcity: (t: number) => number
  poweredUsdMw: (t: number) => number
  merchantMult: (t: number) => number
  capacityMult: (t: number) => number
  plantMerchantMultiple: (t: number) => number
  spreadUsdMwh: (t: number) => number
}
const STUBS: Record<StubId, Stub> = {
  v1: {
    scarcity: (t) => (t <= TRIGGER ? lerp(1, 1.1, (t + 1) / (TRIGGER + 1)) : lerp(1.1, 1.5, (t - TRIGGER) / (Q - 1 - TRIGGER))),
    poweredUsdMw: (t) => lerp(300_000, 500_000, (t + 1) / Q),
    merchantMult: (t) => 1 + (0.25 * (t + 1)) / Q,
    capacityMult: (t) => (t >= TRIGGER ? 1.3 : 1),
    plantMerchantMultiple: (t) => (t >= TRIGGER ? 8.5 : 7.5),
    spreadUsdMwh: (t) => (t >= TRIGGER ? 45 : 30),
  },
  v3: {
    scarcity: (t) => (t <= TRIGGER ? 1 : lerp(1, 0.8, (t - TRIGGER) / (15 - TRIGGER))), // → 0.8 at 2039Q4, then flat
    poweredUsdMw: (t) => (t <= TRIGGER ? 300_000 : lerp(300_000, 100_000, (t - TRIGGER) / (Q - 1 - TRIGGER))),
    merchantMult: (t) => (t >= TRIGGER ? 0.7 : 1),
    capacityMult: (t) => (t >= TRIGGER ? 0.5 : 1),
    plantMerchantMultiple: (t) => (t >= TRIGGER ? 6 : 7.5),
    spreadUsdMwh: (t) => (t >= TRIGGER ? 20 : 30),
  },
}
// Doc 43 §0.4 (doc 45).
const PLANT = {
  contractedMultiple: 10,
  contractedShare: { egs: 0.9, egs2: 0.9, smr: 0.9, adv_fission: 0.9, pumped: 0.5 } as Record<FirmType, number>,
  reactorFixedUsdKwYr: 107 * 1.3, // single unit
  reactorVarUsdMwh: 9,
  egsUsdMwh: 20,
  pumpedCapacityUsdKwYr: 85,
  pumpedHours: 10,
  pumpedRoundTrip: 0.8,
  capacityRating: { egs: 0.9, egs2: 0.9, smr: 0.95, adv_fission: 0.95, pumped: 0 } as Record<FirmType, number>,
}
const SELLER_TERM_Q = 36 // 9 years
const HOLDER_TERM_Q = 8 // 2 years

type Market = NonNullable<ReturnType<typeof quarterInputs>>

// ---------- Leases (§0.6 item 1) ----------
interface Lease {
  id: string
  /** This quarter's margin at the current rent, $ (our share). */
  marginNowQ: number
  /** The margin at a given annual rent (or GPU $/hr), $ a quarter. */
  marginAt: (rate: number) => number
  rateNow: number
  /** The 2035Q4 market rate for its class (scarcity 1.0). */
  marketRate: number
  endQ: number
  walkProb: number
}

function leasesOf(s: GameState): Lease[] {
  const scenario = scenarioOf(s)
  const opex = BALANCE.projects.shellOpexShare
  const mid = rfpMid(s.quarter, scenario) ?? 1
  const out: Lease[] = []
  for (const p of s.projects as Project[]) {
    const t = p.tenant
    if (!t || p.stage !== 'live') continue
    const end = contractEndQuarter(s, p)
    if (end === null) continue
    const ours = 1 - ownedShareOut(p)
    const walkProb = walkProbAtRenewal(s.quarter, scenario, tenantCard(t.card)?.type ?? 'ai_lab')
    if (t.gpu) {
      const g = t.gpu
      const base = Math.max(t.signedQuarter, CONTENT.quarters.indexOf('2027Q1'))
      const now = gpuRenewalIndex(s.quarter, scenario, p.gpu ?? 'h100')
      const then = gpuRenewalIndex(base, scenario, p.gpu ?? 'h100')
      const marketRate = g.priceUsdHr * (now !== null && then ? now / then : 1)
      const marginAt = (rate: number) => g.gpus * rate * HOURS_Q * ours
      out.push({ id: p.id, marginNowQ: marginAt(g.priceUsdHr), marginAt, rateNow: g.priceUsdHr, marketRate, endQ: end, walkProb })
    } else {
      const rateNow = annualContractUsd(p)
      const marketRate = annualRentUsd(tenantCard(t.card)!, p.kw) * mid * shellTierRentMult(s, p)
      const marginAt = (rate: number) => (rate / 4) * (1 - opex) * ours
      out.push({ id: p.id, marginNowQ: marginAt(rateNow), marginAt, rateNow, marketRate, endQ: end, walkProb })
    }
  }
  return out
}

/** A lease's margin each stub quarter for one bot, $ a quarter. Walks are rolled once per end date and shared. */
function leasePath(l: Lease, bot: 'holder' | 'seller', stub: Stub, seed: number): number[] {
  const first = CONTENT.quarters.length // 2036Q1
  const margins: number[] = []
  let rate = l.rateNow
  let nextEnd = l.endQ // the last quarter served at the current rate
  let vacantUntil = -1
  for (let t = 0; t < Q; t++) {
    const q = first + t
    if (q > nextEnd) {
      // An end date (or a holdover): the walk roll, then a renewal or a re-let after a quarter empty.
      const walked = chance(substream(seed, `act5gate:walk:${l.id}:${nextEnd}`), l.walkProb)
      if (walked) {
        vacantUntil = q
        const reletT = t + 1
        rate = l.marketRate * stub.scarcity(Math.min(Q - 1, reletT))
        nextEnd = q + (bot === 'holder' ? HOLDER_TERM_Q : SELLER_TERM_Q)
      } else {
        // (the Seller's extension, agreed in 2036Q1, runs at the 2036Q1 market rent: scarcity 1.0)
        rate = bot === 'holder' ? l.marketRate * stub.scarcity(t) : l.marketRate
        nextEnd = q - 1 + (bot === 'holder' ? HOLDER_TERM_Q : SELLER_TERM_Q)
      }
    }
    margins.push(q <= vacantUntil ? 0 : l.marginAt(rate))
  }
  return margins
}

// ---------- Plants (§0.4, §0.6 item 3) ----------
function plantRegion(s: GameState, v: Venture): string {
  const site = s.sites.find((x) => x.id === v.siteId)
  const r = site ? regionOf(site) : undefined
  if (r) return r
  const regions = ventureRegions(v.type)
  return regions === 'any' ? 'ercot' : regions[0]
}

/** 100% of a plant's EBITDA in stub quarter t, and the contracted share of its output. */
function plantEbitdaQ(s: GameState, v: Venture, m: Market, stub: Stub, t: number): number {
  const type = v.type as FirmType
  const contracted = Math.max(Math.min(1, v.offtakeMw / v.mw), PLANT.contractedShare[type])
  const merchant = 1 - contracted
  const region = plantRegion(s, v)
  const capBase = region === 'pjm' || region === 'ohio' ? m.pjmCapacityUsdMwDay : 0
  if (type === 'pumped') {
    const p = VENTURES.types.pumped
    const capacity = (PLANT.pumpedCapacityUsdKwYr * v.mw * 1000) / 4
    const spread = (u: number) => v.mw * PLANT.pumpedHours * 91.25 * u * PLANT.pumpedRoundTrip
    // The contracted half keeps 2036's terms; the merchant half follows the stub.
    const revenue =
      contracted * (capacity + spread(30)) + merchant * (capacity * stub.capacityMult(t) + spread(stub.spreadUsdMwh(t)))
    return revenue - (v.mw * 1000 * p.running_usd_kw_yr) / 4
  }
  const T = VENTURES.types[type as 'egs' | 'egs2' | 'smr' | 'adv_fission']
  const cf = isEgs(v.type) && v.weakField && !v.fieldFixed ? VENTURES.types[v.type as 'egs'].weak_field.cf : ventureCf(v, CONTENT.quarters.length + t)
  const mwh = v.mw * cf * HOURS_Q
  const off = Math.min(1, v.offtakeMw / v.mw)
  const powerUsdMwh = (m.powerUsdKwh[region as keyof Market['powerUsdKwh']] ?? m.powerUsdKwh.ercot) * 1000
  const revenue =
    mwh * off * v.ppaUsdMwh +
    mwh * Math.max(0, contracted - off) * T.ppa_usd_mwh +
    mwh * merchant * powerUsdMwh * stub.merchantMult(t) +
    capBase * PLANT.capacityRating[type] * v.mw * 91.25 * (contracted + merchant * stub.capacityMult(t))
  const cost =
    v.type === 'smr' || v.type === 'adv_fission'
      ? (PLANT.reactorFixedUsdKwYr * v.mw * 1000) / 4 + mwh * PLANT.reactorVarUsdMwh
      : mwh * PLANT.egsUsdMwh
  return revenue - cost
}

const plantMultiple = (v: Venture, stub: Stub, t: number) => {
  const c = Math.max(Math.min(1, v.offtakeMw / v.mw), PLANT.contractedShare[v.type as FirmType])
  return c * PLANT.contractedMultiple + (1 - c) * stub.plantMerchantMultiple(t)
}

/** Calls still to come on a stake, and an unfixed weak field's fix (the Holder pays them; the Seller sold). */
function remainingCallsUsd(v: Venture): number {
  const tranche = (v.stake * Math.max(0, v.m - 1) * v.budgetUsd) / 3
  const due = v.call ? v.call.dueUsd : 0
  const fix = isEgs(v.type) && v.weakField && !v.fieldFixed ? v.stake * VENTURES.types[v.type as 'egs'].weak_field.fix_usd_kw * v.mw * 1000 : 0
  return due + Math.max(0, 3 - v.callsDone - (v.call ? 1 : 0)) * tranche + fix
}

/** First stub quarter the plant runs (0 if already), or null (not by 2040Q4, or cancelled while licensing). */
function codT(v: Venture, seed: number): number | null {
  if (v.stage === 'operating') return 0
  if (v.stage === 'cancelled' || v.stage === 'folded') return null
  const first = CONTENT.quarters.length
  if (v.stage === 'licensing' && (v.type === 'smr' || v.type === 'adv_fission')) {
    const c = VENTURES.types[v.type].cancel
    if (v.othersSubscribed + v.offtakeMw / v.mw < c.subscribed_min)
      for (let t = 0; first + t < v.licenceEnd && t < Q; t++)
        if (chance(substream(seed, `act5gate:cancel:${v.id}:${t}`), 1 - (1 - c.per_year) ** 0.25)) return null
  }
  const at = Math.max(v.codQuarter, v.buildEnd) - first
  return at < Q ? Math.max(0, at) : null
}

/** The plant part for one bot: Holder = distributions + 2040 value − calls; Seller = the 2036Q1 sale. */
function plantPart(s: GameState, v: Venture, m: Market, stub: Stub, bot: 'holder' | 'seller', seed: number): number {
  if (v.stake <= 0 || v.stage === 'cancelled' || v.stage === 'folded') return 0
  const mark = ventureValueUsd(s, v)
  const at = codT(v, seed)
  if (bot === 'seller') return at === 0 ? v.stake * plantEbitdaQ(s, v, m, stub, 0) * 4 * plantMultiple(v, stub, 0) : mark
  if (at === null) return v.stage === 'licensing' || v.stage === 'construction' ? mark : 0
  const run: Venture = { ...v, stage: 'operating', fieldFixed: v.fieldFixed || (isEgs(v.type) && !!v.weakField) }
  if (v.stage !== 'operating') run.codQuarter = CONTENT.quarters.length + at
  let cash = 0
  for (let t = at; t < Q; t++) cash += v.stake * plantEbitdaQ(s, run, m, stub, t)
  return cash + v.stake * plantEbitdaQ(s, run, m, stub, Q - 1) * 4 * plantMultiple(run, stub, Q - 1) - remainingCallsUsd(v)
}

// ---------- One company ----------
type StartId = FirmType | 'firm_heavy'
export interface GateBRun {
  preset: Act4PresetId
  future: FutureId
  start: StartId
  seed: number
  stub: StubId
  entryUsd: number
  holderMultiple: number
  sellerMultiple: number
  leaseGapUsd: number
  poweredGapUsd: number
  plantGapUsd: number
  seller2040Usd: number
  freeMw: number
  leases: number
  plantShare: number
  /** What act5Entry is made of: the live leases at the AI multiple, the orbital unit, cash. */
  leaseShare: number
  orbitShare: number
  cashShare: number
}

function gateRuns(preset: Act4PresetId, future: FutureId, start: StartId, seed: number): GateBRun[] {
  const s = state2035(preset, future, start === 'firm_heavy' ? (['egs', 'smr'] as const) : start, seed)
  const m = quarterInputs(s.quarter, scenarioOf(s))!
  const r = s.reports.at(-1)!
  const venturesNow = r.venturesUsd ?? 0
  const freeMw = s.sites.reduce((a, x) => a + Math.max(0, poweredKw(x, s.quarter) - usedKw(s, x.id)), 0) / 1000
  // act5Entry (§0.6 item 2): the 2035Q4 valuation + free MW × $300K.
  const entryUsd = r.valuationUsd + freeMw * 300_000
  const leases = leasesOf(s)
  const aiMult = aiInfraMultiple(s.quarter, scenarioOf(s))
  // Common to both (mine): the company without its venture part and its free MW, held; 20 quarters of 2035Q4 cash
  // earnings (EBITDA − interest).
  const commonUsd = r.valuationUsd - venturesNow + Q * (r.ebitdaUsd - r.interestUsd)
  const out: GateBRun[] = []
  for (const stubId of ['v1', 'v3'] as const) {
    const stub = STUBS[stubId]
    const part = (bot: 'holder' | 'seller') => {
      // Leases: the change from the 2035Q4 margin, as cash each quarter and in the 2040Q4 value at the AI multiple.
      let lease = 0
      for (const l of leases) {
        const path = leasePath(l, bot, stub, seed)
        lease += path.reduce((a, x) => a + x - l.marginNowQ, 0) + (path[Q - 1] - l.marginNowQ) * 4 * aiMult
      }
      const powered = bot === 'holder' ? freeMw * stub.poweredUsdMw(Q - 1) : freeMw * 300_000
      const plants = (s.ventures ?? []).reduce((a, v) => a + plantPart(s, v, m, stub, bot, seed), 0)
      return { lease, powered, plants, total: commonUsd + lease + powered + plants }
    }
    const h = part('holder')
    const se = part('seller')
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
      leaseGapUsd: h.lease - se.lease,
      poweredGapUsd: h.powered - se.powered,
      plantGapUsd: h.plants - se.plants,
      seller2040Usd: se.total,
      freeMw,
      leases: leases.length,
      plantShare: entryUsd > 0 ? venturesNow / entryUsd : 0,
      leaseShare: entryUsd > 0 ? leases.reduce((a, l) => a + l.marginNowQ * 4 * aiMult, 0) / entryUsd : 0,
      orbitShare: entryUsd > 0 ? Math.max(0, (r.orbitEbitdaUsd ?? 0) * 4 * (r.orbitMultiple ?? 0)) / entryUsd : 0,
      cashShare: entryUsd > 0 ? s.cash / entryUsd : 0,
    })
  }
  return out
}

// ---------- Run and report ----------
const STARTS: StartId[] = [...FIRM_TYPES, 'firm_heavy']
const runs: GateBRun[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  for (const future of FUTURE_IDS)
    for (const start of STARTS) for (let seed = 1; seed <= SEEDS; seed++) runs.push(...gateRuns(p.id, future, start, seed))
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}
mkdirSync(OUT, { recursive: true })
const cols = Object.keys(runs[0]) as (keyof GateBRun)[]
writeFileSync(`${OUT}/gate-b-runs.csv`, [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n')

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
const ratio = (rs: GateBRun[], stub: StubId) => {
  const h = median(rs.map((r) => r.holderMultiple))
  const s = median(rs.map((r) => r.sellerMultiple))
  return stub === 'v1' ? h / s : s / h
}
const rows: [string, (r: GateBRun) => boolean][] = [
  ...PRESETS_IV.map((p) => [p.id, (r: GateBRun) => r.preset === p.id && r.start !== 'firm_heavy'] as [string, (r: GateBRun) => boolean]),
  ['firm-heavy', (r: GateBRun) => r.start === 'firm_heavy'],
]
say(`M43.0b Act V gate (doc 43 v1.1 §0.6), ${SEEDS} seeds; medians of the founder NW multiple, 2040Q4 ÷ act5Entry`)
for (const stub of ['v1', 'v3'] as const) {
  const what = stub === 'v1' ? 'V1: Holder ÷ Seller (pass ≥ 1.2)' : 'V3: Seller ÷ Holder (pass ≥ 1.2)'
  say(`\n${what}`)
  say(`start        ${FUTURE_IDS.map((f) => f.padEnd(24)).join('')}`)
  for (const [name, pick] of rows) {
    const cells = FUTURE_IDS.map((f) => {
      const rs = runs.filter((r) => r.stub === stub && r.future === f && pick(r))
      const h = median(rs.map((r) => r.holderMultiple))
      const s = median(rs.map((r) => r.sellerMultiple))
      return `${h.toFixed(2)}/${s.toFixed(2)}=${ratio(rs, stub).toFixed(3)}`.padEnd(24)
    })
    say(`${name.padEnd(13)}${cells.join('')}`)
  }
  const all = runs.filter((r) => r.stub === stub)
  const k = ratio(all, stub)
  say(`all (${all.length} runs): ${k.toFixed(3)} → ${k >= 1.2 ? 'PASS' : 'FAIL'}`)
  const share = (f: (r: GateBRun) => number, rs = all) => `${(median(rs.map((r) => f(r) / Math.max(1, r.seller2040Usd))) * 100).toFixed(1)}%`
  say(
    `Holder − Seller as a share of the Seller's 2040 value (medians): leases ${share((r) => r.leaseGapUsd)}, powered value ${share((r) => r.poweredGapUsd)}, plants ${share((r) => r.plantGapUsd)}`,
  )
  for (const [name, pick] of rows) {
    const rs = all.filter(pick)
    say(`  ${name.padEnd(12)} leases ${share((r) => r.leaseGapUsd, rs)}, powered ${share((r) => r.poweredGapUsd, rs)}, plants ${share((r) => r.plantGapUsd, rs)}`)
  }
}
const v1 = ratio(runs.filter((r) => r.stub === 'v1'), 'v1')
const v3 = ratio(runs.filter((r) => r.stub === 'v3'), 'v3')
say(`\nGate: V1 ${v1.toFixed(3)} (${v1 >= 1.2 ? 'pass' : 'fail'}), V3 ${v3.toFixed(3)} (${v3 >= 1.2 ? 'pass' : 'fail'}) → ${v1 >= 1.2 && v3 >= 1.2 ? 'PASS' : 'FAIL'}`)
say(
  `Company facts (medians): free MW ${median(runs.map((r) => r.freeMw)).toFixed(0)}, live leases ${median(runs.map((r) => r.leases))}, venture share of act5Entry ${(median(runs.map((r) => r.plantShare)) * 100).toFixed(1)}%`,
)
say('What act5Entry is made of (medians, V1 rows): leases at the AI multiple / the orbital unit / cash / ventures')
for (const [name, pick] of rows) {
  const rs = runs.filter((r) => r.stub === 'v1' && pick(r))
  const pct = (f: (r: GateBRun) => number) => `${(median(rs.map(f)) * 100).toFixed(0)}%`
  say(`  ${name.padEnd(12)} ${pct((r) => r.leaseShare)} / ${pct((r) => r.orbitShare)} / ${pct((r) => r.cashShare)} / ${pct((r) => r.plantShare)}`)
}
writeFileSync(`${OUT}/gate-b-summary.txt`, lines.join('\n') + '\n')
