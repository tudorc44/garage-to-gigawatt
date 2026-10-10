// M36.3 (doc 38 §5.10): `npm run sim -- --energy [--seeds N] [--out dir]`. The E-B targets for the energy options and
// ventures. Each Act IV preset × future × seed plays the Balanced archetype (the venture-free path) and the same with
// one venture joined in 2031Q1 (a 20% stake, and a 50% offtake to an eligible site when there is one; cash calls paid
// when cash allows, else diluted), or with on-site solar and a 4-hour battery behind the meter. Lunar grade: rich (the
// ventures don't touch the Moon). Writes energy-runs.csv and prints E-B1, E-B2 and E-B5; E-B3 and E-B4 are tests
// (tests/sim/ventures.test.ts), and so is E-B5's first half (tests/sim/texasPower.test.ts).
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT, FUTURE_IDS, quarterInputs, type FutureId } from '../../src/content/index.ts'
import { ENERGY, energyYear, VENTURES, type VentureType } from '../../src/content/energyContent.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom, playGame, type Strategy } from '../../src/sim/replay.ts'
import { toAct3, toAct4, type GameState } from '../../src/sim/state.ts'
import { regionOf } from '../../src/sim/systems/sites.ts'
import { buyInUsd, prepayUsd, ventureRegions } from '../../src/sim/systems/ventures.ts'
import { buildCostUsd } from '../../src/sim/systems/energy.ts'
import { poweredKw } from '../../src/sim/systems/sites.ts'
import { BOTS } from '../bots.ts'
import { act4Archetypes } from './bots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '10'))
const OUT = argValue('--out', 'sim-output')
const VENTURE_VARIANTS = ['egs', 'egs2', 'smr', 'adv_fission', 'fusion', 'pumped', 'control'] as const satisfies readonly VentureType[]
const VARIANTS = ['none', ...VENTURE_VARIANTS, 'btm'] as const
type Variant = (typeof VARIANTS)[number]

function tryAll(state: GameState, actions: Action[]): { kept: Action[]; after: GameState } {
  let s = state
  const kept: Action[] = []
  for (const a of actions) {
    const r = applyAction(s, a)
    if (r.ok) {
      s = r.state
      kept.push(a)
    }
  }
  return { kept, after: s }
}

/** The biggest energized site in the venture's regions (null if none). */
function campusFor(s: GameState, type: VentureType): string | null {
  const regions = ventureRegions(type)
  const sites = s.sites
    .filter((x) => x.tier !== 'garage' && (regions === 'any' || regions.includes(regionOf(x) ?? '')))
    .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))
  return sites[0]?.id ?? null
}

/**
 * M36.10 (design thread, answer 5): the cash guard. A bot builds, joins or pays only if its cash after the spend still
 * covers two quarters of the company's fixed costs (salaries, rent, interest and debt service, from the last report).
 */
function guardOk(s: GameState, spendUsd: number): boolean {
  const r = s.reports.at(-1)
  const fixedQ = r ? r.salariesUsd + r.rentUsd + r.interestUsd + r.principalUsd : 0
  return s.cash - spendUsd >= 2 * fixedQ
}
export const guardStats = { blocked: 0 }

/** The variant's own moves this quarter: join once (stake, offtake when it can), answer calls; or build behind the meter. */
function variantStep(s: GameState, v: Variant): Action[] {
  const out: Action[] = []
  if (v === 'none') return out
  if (v === 'btm') {
    const site = s.sites
      .filter((x) => x.tier === 'own_site' || x.tier === 'texas_site' || x.category)
      .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))[0]
    if (site && !site.energy?.length)
      for (const mw of [50, 20, 10, 5]) {
        const cost = (buildCostUsd(s, site, 'btm_solar', mw) ?? Infinity) + (buildCostUsd(s, site, 'bess', mw, 4) ?? Infinity)
        if (!guardOk(s, cost)) {
          guardStats.blocked++
          continue
        }
        out.push({ type: 'ENERGY_BUILD', siteId: site.id, kind: 'btm_solar', size: mw })
        out.push({ type: 'ENERGY_BUILD', siteId: site.id, kind: 'bess', size: mw, hours: 4 })
      }
    return out
  }
  if (!(s.ventures ?? []).some((x) => x.type === v)) {
    const campus = v === 'pumped' ? null : v === 'fusion' ? 'any' : campusFor(s, v)
    const tries: { stake: number; offtake: number; siteId?: string }[] = [
      ...(campus ? [{ stake: 0.2, offtake: 0.5, ...(campus !== 'any' ? { siteId: campus } : {}) }] : []),
      { stake: 0.2, offtake: 0 },
      { stake: 0.1, offtake: 0 },
    ]
    for (const t of tries) {
      const cost = buyInUsd(s, { type: v, stake: t.stake }) + prepayUsd({ type: v, offtake: t.offtake, prepay: 0 })
      if (!guardOk(s, cost)) {
        guardStats.blocked++
        continue
      }
      out.push({ type: 'VENTURE_JOIN', venture: v, prepay: 0, ...t })
    }
  }
  for (const x of s.ventures ?? [])
    if (x.call) out.push({ type: 'VENTURE_CALL', ventureId: x.id, choice: guardOk(s, x.call.dueUsd) ? 'pay' : 'dilute' })
  return out
}

/** The preset companies at 2030Q4 (each played once from 2017). */
const presetEnd = new Map<Act4PresetId, GameState>()
for (const p of PRESETS_IV) {
  const a2 = playGame(p.seed, BOTS[p.bot], { through: 2 }).state
  presetEnd.set(p.id, playFrom(toAct3(a2, { scenario: p.act3_scenario }), BOTS[p.bot], { through: 3 }).state)
}

interface Run {
  preset: Act4PresetId
  future: FutureId
  variant: Variant
  seed: number
  multiple: number
  nwUsd: number
  gameOver: boolean
  stage: string
  stake: number
  paidUsd: number
  m: number
}

const runs: Run[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  const balanced = act4Archetypes(p.bot).balanced
  for (const future of FUTURE_IDS)
    for (const variant of VARIANTS)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const start = toAct4(structuredClone(presetEnd.get(p.id)!), { future, act4Seed: seed })
        start.lunarGrade = 'rich'
        const bot: Strategy = {
          plan: (s) => {
            const base = tryAll(s, balanced.plan(s))
            return [...base.kept, ...tryAll(base.after, variantStep(base.after, variant)).kept]
          },
        }
        const end = playFrom(start, bot, { through: 4 }).state
        const entry = end.act4Entry!.founderNetWorthUsd
        const nw = Math.max(0, end.founderStake * (end.reports.at(-1)?.valuationUsd ?? 0))
        const v = end.ventures?.[0]
        runs.push({
          preset: p.id,
          future,
          variant,
          seed,
          multiple: entry > 0 ? nw / entry : 0,
          nwUsd: nw,
          gameOver: end.phase === 'gameover',
          stage: v?.stage ?? (variant === 'btm' ? 'built' : ''),
          stake: v?.stake ?? 0,
          paidUsd: v?.paidUsd ?? 0,
          m: v?.m ?? 0,
        })
      }
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}

mkdirSync(OUT, { recursive: true })
const cols = Object.keys(runs[0]) as (keyof Run)[]
writeFileSync(`${OUT}/energy-runs.csv`, [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n')

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const sel = (f: Partial<Run>) => runs.filter((r) => (Object.keys(f) as (keyof Run)[]).every((k) => r[k] === f[k]))
const x = (n: number) => `${n.toFixed(2)}×`
const m$ = (n: number) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n) / 1e6)}M`
const rows: [string, string, boolean, string][] = []
const add = (id: string, target: string, ok: boolean, got: string) => rows.push([id, target, ok, got])

// E-B1 (redefined, design thread answer 8): the venture-free path is within 15% of the best path in a future, and its
// game-over rate isn't significantly worse than the venture paths' (one-sided Fisher exact test, p < 0.05) nor worse by
// more than 3 points.
const none = (f: FutureId) => median(sel({ future: f, variant: 'none' }).map((r) => r.multiple))
const best = (f: FutureId) => Math.max(...VARIANTS.map((v) => median(sel({ future: f, variant: v }).map((r) => r.multiple))))
const within = FUTURE_IDS.filter((f) => none(f) >= 0.85 * best(f))
const busts = (v: Variant) => sel({ variant: v }).filter((r) => r.gameOver).length
const n1 = sel({ variant: 'none' }).length
const vRuns = runs.filter((r) => (VENTURE_VARIANTS as readonly string[]).includes(r.variant))
const vBusts = vRuns.filter((r) => r.gameOver).length
const p = fisherWorse(busts('none'), n1, vBusts, vRuns.length)
const gap = busts('none') / n1 - vBusts / vRuns.length
add(
  'E-B1',
  'Venture-free: within 15% of the best path in a future; game overs not significantly worse (Fisher p < 0.05) nor > 3 points worse',
  within.length >= 1 && !(p < 0.05) && gap <= 0.03,
  `within 15% in ${within.join(', ') || 'none'} (${FUTURE_IDS.map((f) => `${f} ${x(none(f))}/${x(best(f))}`).join(', ')}); game overs: venture-free ${busts('none')}/${n1}, venture paths ${vBusts}/${vRuns.length} (gap ${(gap * 100).toFixed(1)} points, p = ${p.toFixed(3)})`,
)

/** One-sided Fisher exact test: the chance of a busts count at least `a` in group 1 if the groups' rates were equal. */
function fisherWorse(a: number, n1: number, c: number, n2: number): number {
  const lf = (n: number) => {
    let s = 0
    for (let i = 2; i <= n; i++) s += Math.log(i)
    return s
  }
  const k = a + c
  const n = n1 + n2
  const pmf = (x: number) => Math.exp(lf(k) - lf(x) - lf(k - x) + lf(n - k) - lf(n1 - x) - lf(n - k - n1 + x) - lf(n) + lf(n1) + lf(n - n1))
  let total = 0
  for (let x = a; x <= Math.min(k, n1); x++) if (n - k - n1 + x >= 0) total += pmf(x)
  return Math.min(1, total)
}

// E-B2: each venture's expected net-worth contribution (vs the venture-free run, same preset, future and seed) against
// the control's: none above 1.5× the control's in expectation; at least one 3× the control's in its best case.
const contrib = (v: Variant) =>
  sel({ variant: v }).map((r) => r.nwUsd - sel({ preset: r.preset, future: r.future, seed: r.seed, variant: 'none' })[0].nwUsd)
const control = contrib('control')
const ctrlMean = mean(control)
const ctrlBest = Math.max(...control)
const ventureStats = VENTURE_VARIANTS.filter((v) => v !== 'control').map((v) => ({ v, mean: mean(contrib(v)), best: Math.max(...contrib(v)) }))
const capOk = ventureStats.every((s) => (ctrlMean > 0 ? s.mean <= 1.5 * ctrlMean : s.mean <= ctrlMean + Math.abs(ctrlMean) * 0.5))
const betOk = ventureStats.some((s) => (ctrlBest > 0 ? s.best >= 3 * ctrlBest : s.best > 0))
add(
  'E-B2',
  'No venture beats the control by more than 1.5× in expectation; one beats it 3× in its best case',
  capOk && betOk,
  `control mean ${m$(ctrlMean)}, best ${m$(ctrlBest)}; ${ventureStats.map((s) => `${s.v} mean ${m$(s.mean)}, best ${m$(s.best)}`).join('; ')}; behind the meter mean ${m$(mean(contrib('btm')))}`,
)

// E-B5 (second half): a 4-hour battery sized to an ERCOT AI load pays back within 12 quarters in normal summers. What
// it earns a year per MW: the normal summer's demand-response credit and 4CP's 10% off a year of AI power at the
// ERCOT price (SLA cover in grid calls not counted). Capex: that year's US price × 4 hours.
const ercotPrice = (label: string): number | undefined => {
  const q = CONTENT.quarters.indexOf(label)
  if (q < 0) return undefined
  const key = label >= '2031Q1' ? ('s0.f2' as const) : label >= '2027Q1' ? ('s0' as const) : null
  return quarterInputs(q, key)?.powerUsdKwh.ercot
}
// (redefined, design thread answer 7: within the battery's life, ≤ 60 quarters, for builds from 2028, falling with
// battery prices)
const paybacks: string[] = []
const from2028: number[] = []
for (let y = 2023; y <= 2035; y++) {
  const price = ercotPrice(`${y}Q1`)
  const bess = energyYear(y).bess_usd_kwh_us
  if (price === undefined || bess === null) continue
  const capexPerMw = bess * 4 * 1000
  const earnPerMwYr = ENERGY.texas.dr_usd_mw_yr.normal + (1 - ENERGY.texas.four_cp.next_year_price_mult) * price * 8760 * 1000
  const q = (capexPerMw / earnPerMwYr) * 4
  if (y >= 2028) from2028.push(q)
  paybacks.push(`${y} ${Math.round(q)} q`)
}
const falling = from2028.every((q, i) => i === 0 || q <= from2028[i - 1] + 1e-9)
add(
  'E-B5',
  'A battery sized to the AI load pays back within its life (≤ 60 quarters) for builds from 2028, falling with prices (credits lost without it: tested)',
  from2028.length > 0 && from2028.every((q) => q <= 60) && falling,
  `payback by build year: ${paybacks.join(', ')}`,
)

console.log(`\nEnergy (--energy): ${runs.length} runs (${SEEDS} seeds), ${Math.round((performance.now() - t0) / 1000)} s. CSV in ${OUT}/energy-runs.csv`)
console.log('\nMedians (founder net worth multiple on the Act IV entry), by future × variant (Balanced + one venture):')
console.log(`  ${'variant'.padEnd(12)}${FUTURE_IDS.map((f) => f.padStart(8)).join('')}   game overs   stages at 2035Q4`)
for (const v of VARIANTS) {
  const stages: Record<string, number> = {}
  for (const r of sel({ variant: v })) stages[r.stage || '—'] = (stages[r.stage || '—'] ?? 0) + 1
  console.log(
    `  ${v.padEnd(12)}${FUTURE_IDS.map((f) => x(median(sel({ future: f, variant: v }).map((r) => r.multiple))).padStart(8)).join('')}   ${String(busts(v)).padStart(5)}        ${JSON.stringify(stages)}`,
  )
}
console.log(`\nVenture milestone targets (doc 38): ${VENTURE_VARIANTS.map((v) => `${v} P(2035) ${VENTURES.types[v].targets.p2035}`).join(', ')}`)
console.log(`Cash guard (M36.10): ${guardStats.blocked} builds, joins or sizes held back for want of two quarters' fixed costs`)
console.log('\nE-B1, E-B2, E-B5 (E-B3 and E-B4: tests/sim/ventures.test.ts):')
for (const [id, target, ok, got] of rows) console.log(`  ${id.padEnd(5)} ${ok ? 'PASS' : 'MISS'}  ${target}\n         ${got}`)
writeFileSync(`${OUT}/energy-btable.txt`, rows.map(([id, t, ok, got]) => `${id}\t${ok ? 'PASS' : 'MISS'}\t${t}\t${got}`).join('\n') + '\n')
