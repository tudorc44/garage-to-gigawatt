// The Act III anchor harness (M18.5; doc 28 §L adapted to the real sim, designed thresholds). `npm run sim --
// --act3-anchors`: the Good preset × the 4 scenarios (forced) × 30 Act III seeds (the act3Seed salt) × 7 archetypes.
// Measure: founder net worth at 2030Q4 ÷ founder net worth at act3Entry (0 after a game over). Prints the table
// (median, p10, game overs "x of 30", reading median), the paired-seed check C3, the payback check C2 and every
// anchor's verdict; writes anchors.json to --out. Tools only.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTENT, SCENARIO_IDS, type ScenarioId } from '../src/content/index.ts'
import { playFrom } from '../src/sim/replay.ts'
import { toAct3, type GameState } from '../src/sim/state.ts'
import { ARCHETYPES, archetype, type Archetype } from './act3Archetypes.ts'
import { paybackYears } from './act3Payback.ts'
import { presetCompany, scanPreset } from './act3Presets.ts'
import { BOTS } from './bots.ts'
import { applyKnobs } from './act3Knobs.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output')
// M18.6: tuning knobs set for this run only (tools/act3Knobs.ts), e.g. --knobs K1.rubin=0.9,K2=0.875
const knobs = applyKnobs(argValue('--knobs', ''))

interface Run {
  ratio: number
  gameOver: boolean
  reading: number | null
  /** M18.10: GPU contracts that walked after 2 quarters in distress. */
  walks: number
  /** M18.11: a foreclosure, a rescue sale or a forced sale happened in Act III. */
  distressSale: boolean
}

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p10 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(0.1 * (s.length - 1))] ?? NaN
}

/** One Act III run from the preset's 2026Q4 company. */
function play(end: GameState, scenario: ScenarioId, seed: number, strategy: Parameters<typeof playFrom>[1]): Run {
  const start = toAct3(end, { scenario, act3Seed: seed })
  const r = playFrom(start, strategy, { through: 3 })
  const entry = start.act3Entry!.founderNetWorthUsd
  const done = r.state.phase === 'chapter'
  const last = done ? Math.max(0, r.state.founderStake * r.state.reports.at(-1)!.valuationUsd) : 0
  return {
    ratio: entry > 0 ? last / entry : 0,
    gameOver: !done,
    reading: r.state.act3End?.reading.score ?? null,
    walks: r.state.log.filter((e) => e.key === 'log.gpu_contract_walked').length,
    distressSale: r.state.log.some(
      (e) =>
        e.quarter >= start.quarter &&
        (e.key === 'log.project_foreclosed' || e.key === 'log.rescue_sale' || e.key === 'log.forced_sale'),
    ),
  }
}

const t0 = performance.now()
const seeds = Array.from({ length: SEEDS }, (_, i) => i + 1)

// The Good preset; A7 (passive never goes bust) picks the next candidate if it fails (M18.3).
const good = CONTENT.act3Presets.find((p) => p.id === 'good')!
let presetUsed = { bot: good.bot, seed: good.seed }
let end = presetCompany(good.bot, good.seed)!
const passiveRuns = (e: GameState, bot: string) =>
  Object.fromEntries(
    SCENARIO_IDS.map((sc) => [sc, seeds.map((n) => play(e, sc, n, archetype(BOTS[bot], 'passive')))]),
  ) as Record<ScenarioId, Run[]>
let passive = passiveRuns(end, good.bot)
const a7 = (p: Record<ScenarioId, Run[]>) => SCENARIO_IDS.every((sc) => p[sc].every((r) => !r.gameOver))
const a7Tried: string[] = [`${good.bot} seed ${good.seed}`]
if (!a7(passive) && !args.includes('--no-a7-fallback')) {
  for (const c of scanPreset('good', 50, 3).filter((x) => x.fits).slice(1)) {
    a7Tried.push(`${c.bot} seed ${c.seed}`)
    const p = passiveRuns(c.state, c.bot)
    if (a7(p)) {
      end = c.state
      passive = p
      presetUsed = { bot: c.bot, seed: c.seed }
      break
    }
  }
}
const base = BOTS[presetUsed.bot]

// Every archetype × scenario × seed (passive's runs reused).
const runs: Record<Archetype, Record<ScenarioId, Run[]>> = {} as never
for (const a of ARCHETYPES)
  runs[a] =
    a === 'passive'
      ? passive
      : (Object.fromEntries(
          SCENARIO_IDS.map((sc) => [sc, seeds.map((n) => play(end, sc, n, archetype(base, a)))]),
        ) as Record<ScenarioId, Run[]>)

const med = (a: Archetype, sc: ScenarioId) => median(runs[a][sc].map((r) => r.ratio))
const overs = (a: Archetype, sc: ScenarioId) => runs[a][sc].filter((r) => r.gameOver).length

// M18.8 (DT answer 2): A2, and A1 again, on the GPU-heavy quick-start company (the overleveraged bot, seed 1).
const gpuBot = 'overleveraged'
const gpuEnd = presetCompany(gpuBot, 1)!
// (M18.9: every archetype on it, for the report)
const gpuRuns = Object.fromEntries(
  ARCHETYPES.map((a) => [
    a,
    Object.fromEntries(
      SCENARIO_IDS.map((sc) => [sc, seeds.map((n) => play(gpuEnd, sc, n, archetype(BOTS[gpuBot], a)))]),
    ),
  ]),
) as Record<Archetype, Record<ScenarioId, Run[]>>
const gMed = (a: Archetype, sc: ScenarioId) => median(gpuRuns[a][sc].map((r) => r.ratio))
const gOvers = (a: Archetype, sc: ScenarioId) => gpuRuns[a][sc].filter((r) => r.gameOver).length
const A1_SCENARIOS = ['s0', 's1', 's3'] as const // M18.8 (DT answer 3): S2 exempt

const table: Record<string, Record<string, string | number>> = {}
for (const a of ARCHETYPES)
  for (const sc of SCENARIO_IDS) {
    const rs = runs[a][sc]
    const reads = rs.map((r) => r.reading).filter((v): v is number => v !== null)
    table[`${a} ${sc}`] = {
      median: Number(med(a, sc).toFixed(2)),
      p10: Number(p10(rs.map((r) => r.ratio)).toFixed(2)),
      gameOver: `${overs(a, sc)} of ${rs.length}`,
      reading: Number.isNaN(median(reads)) ? '—' : median(reads),
      gpuWalks: rs.reduce((n, r) => n + r.walks, 0),
      distressSales: rs.filter((r) => r.distressSale).length,
    }
  }

// C3: paired seeds, the Good preset with no hire: passive vs passive signing s2_c1 (S2) / s3_c2 (S3).
const c3 = (sc: ScenarioId, card: string) => {
  const signed = seeds.map((n) => play(end, sc, n, archetype(base, 'passive', { signOnly: card })))
  return { signed: median(signed.map((r) => r.ratio)), not: med('passive', sc) }
}
const c3s2 = c3('s2', 's2_c1')
const c3s3 = c3('s3', 's3_c2')

// C2: payback at 2027Q3, the six-region mean row.
const c2 = Object.fromEntries(SCENARIO_IDS.map((sc) => [sc, paybackYears(sc, '2027Q3')]))
const c2ok = SCENARIO_IDS.every((sc) => {
  const p = c2[sc]
  return p.rubin >= 1.8 && p.rubinUltra >= 1.8 && p.rubin >= p.b200 && p.rubinUltra >= p.b200
})

const yes = (b: boolean) => (b ? 'PASS' : 'FAIL')
const anchors: { id: string; target: string; result: string; numbers: string }[] = [
  {
    id: 'A1',
    target: 'hedged > ignorer (median) in S0, S1, S3 (S2 exempt), on the Good preset',
    result: yes(A1_SCENARIOS.every((sc) => med('hedged', sc) > med('ignorer', sc))),
    numbers: SCENARIO_IDS.map((sc) => `${sc} ${med('hedged', sc).toFixed(2)} vs ${med('ignorer', sc).toFixed(2)}`).join('; '),
  },
  {
    id: 'A1-gpu',
    target: 'hedged > ignorer (median) in S1 and S3 (M18.10: S0 information, S2 exempt), on the GPU-heavy company',
    result: yes((['s1', 's3'] as const).every((sc) => gMed('hedged', sc) > gMed('ignorer', sc))),
    numbers: SCENARIO_IDS.map((sc) => `${sc} ${gMed('hedged', sc).toFixed(2)} vs ${gMed('ignorer', sc).toFixed(2)}`).join('; '),
  },
  // M18.9 (DT): A2 first as written; if the 60%-LTV ignorer doesn't bust, the fallback version
  (() => {
    // M18.11 (DT): the game-over half replaced by a foreclosure, rescue sale or forced sale in ≥ 9 of 30 runs
    const sales = gpuRuns.ignorer.s1.filter((r) => r.distressSale).length
    const primary = gMed('ignorer', 's1') <= 0.5 && sales >= Math.ceil((9 / 30) * SEEDS)
    const fallback =
      gMed('ignorer', 's1') <= 0.6 * gMed('ignorer', 's0') &&
      gMed('ignorer', 's1') < gMed('hedged', 's1')
    return {
      id: 'A2',
      target: primary
        ? 'S1 ignorer (GPU-heavy): median ≤ 0.5 and a foreclosure / rescue / forced sale in ≥ 9 of 30 (M18.11)'
        : 'fallback: S1 ignorer (GPU-heavy) median ≤ 0.6 × its S0 median, and below hedged',
      result: primary ? 'PASS (as written)' : fallback ? 'PASS (fallback)' : 'FAIL (both versions)',
      numbers: `S1 median ${gMed('ignorer', 's1').toFixed(2)}, distress sales in ${sales} of ${SEEDS}, game over ${gOvers('ignorer', 's1')}; S0 median ${gMed('ignorer', 's0').toFixed(2)} (× 0.6 = ${(0.6 * gMed('ignorer', 's0')).toFixed(2)}); hedged S1 ${gMed('hedged', 's1').toFixed(2)}`,
    }
  })(),
  {
    id: 'A3',
    target: 'S2: long-locked ≥ 1.15 × passive (M18.9; the builder row is information)',
    result: yes(med('long-locked', 's2') >= 1.15 * med('passive', 's2')),
    numbers: `${med('long-locked', 's2').toFixed(2)} vs 1.15 × ${med('passive', 's2').toFixed(2)}; builder ${med('builder', 's2').toFixed(2)}`,
  },
  // (A4 retired, M18.9: the flexible and long-locked rows are information.)
  {
    id: 'A5',
    target: "S0: every archetype's median ≥ 0.85",
    result: yes(ARCHETYPES.every((a) => med(a, 's0') >= 0.85)),
    numbers: ARCHETYPES.map((a) => `${a} ${med(a, 's0').toFixed(2)}`).join('; '),
  },
  {
    id: 'A6',
    target: 'over-reactor ≤ 0.97 × passive in S0, S1, S2',
    result: yes((['s0', 's1', 's2'] as const).every((sc) => med('over-reactor', sc) <= 0.97 * med('passive', sc))),
    numbers: (['s0', 's1', 's2'] as const)
      .map((sc) => `${sc} ${med('over-reactor', sc).toFixed(2)} vs ${(0.97 * med('passive', sc)).toFixed(2)}`)
      .join('; '),
  },
  {
    id: 'A7',
    target: 'Good preset, passive: no game over in any seed in any scenario',
    result: yes(a7(passive)),
    numbers: `${SCENARIO_IDS.map((sc) => `${sc} ${overs('passive', sc)}`).join(', ')}; preset ${presetUsed.bot} seed ${presetUsed.seed} (tried ${a7Tried.join(', ')})`,
  },
  {
    id: 'F7',
    target: 'hedged S1 median ≥ 0.75',
    result: yes(med('hedged', 's1') >= 0.75),
    numbers: med('hedged', 's1').toFixed(2),
  },
  {
    id: 'C1',
    target: "the full sim's bot runs: S1 has the lowest median growth multiple at 2030Q4 (M18.9; see --act3)",
    result: 'see the full sim',
    numbers: `(Good preset passive, information: ${SCENARIO_IDS.map((sc) => `${sc} ${med('passive', sc).toFixed(2)}`).join('; ')})`,
  },
  {
    id: 'C2',
    target: 'payback at 2027Q3: Rubin and Rubin Ultra ≥ 1.8 years and ≥ B200 in every scenario',
    result: yes(c2ok),
    numbers: SCENARIO_IDS.map(
      (sc) => `${sc} b200 ${c2[sc].b200.toFixed(1)} rubin ${c2[sc].rubin.toFixed(1)} ultra ${c2[sc].rubinUltra.toFixed(1)}`,
    ).join('; '),
  },
  {
    id: 'C3',
    target: 'paired seeds (no hire): S2 signing s2_c1 ahead; S3 signing s3_c2 within ±2% of not signing (M18.8)',
    result: yes(c3s2.signed > c3s2.not && Math.abs(c3s3.signed / c3s3.not - 1) <= 0.02),
    numbers: `S2 ${c3s2.signed.toFixed(3)} vs ${c3s2.not.toFixed(3)}; S3 ${c3s3.signed.toFixed(3)} vs ${c3s3.not.toFixed(3)}`,
  },
  {
    id: 'C4',
    target: 'the seam tests and the reading oracle pass',
    result: 'see npm test',
    numbers: 'tests/sim/act3*.test.ts (seam), the oracle self-check in --act3',
  },
]

console.log(
  `\n  Act III anchors (M18.5): Good preset ${presetUsed.bot} seed ${presetUsed.seed} × 4 scenarios × ${SEEDS} seeds × ${ARCHETYPES.length} archetypes` +
    (knobs.length ? `; knobs ${knobs.join(', ')}` : '') +
    `\n  Founder net worth at 2030Q4 ÷ at act3Entry (0 after a game over):`,
)
console.table(table)
console.log(`  GPU-heavy company (${gpuBot} seed 1), every archetype:`)
console.table(
  Object.fromEntries(
    ARCHETYPES.flatMap((a) =>
      SCENARIO_IDS.map((sc) => [
        `${a} ${sc}`,
        {
          median: Number(gMed(a, sc).toFixed(2)),
          p10: Number(p10(gpuRuns[a][sc].map((r) => r.ratio)).toFixed(2)),
          gameOver: `${gOvers(a, sc)} of ${SEEDS}`,
          gpuWalks: gpuRuns[a][sc].reduce((n, r) => n + r.walks, 0),
          distressSales: gpuRuns[a][sc].filter((r) => r.distressSale).length,
        },
      ]),
    ),
  ),
)
console.table(Object.fromEntries(anchors.map((a) => [a.id, { result: a.result, target: a.target, numbers: a.numbers }])))
mkdirSync(OUT, { recursive: true })
writeFileSync(
  join(OUT, 'anchors.json'),
  JSON.stringify({ preset: presetUsed, seeds: SEEDS, knobs, table, anchors }, null, 1),
)
console.log(`  (${((performance.now() - t0) / 1000).toFixed(0)} s)`)
