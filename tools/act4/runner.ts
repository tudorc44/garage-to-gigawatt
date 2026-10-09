// M32.5 (doc 33 §18): `npm run sim -- --act4 [--seeds N] [--out dir]`. Plays every Act IV archetype (tools/act4/bots.ts)
// on the three presets × the four futures × the three lunar grades × N seeds (default 30; the seed is the act4Seed, so
// the presets' companies are the same and only Act IV's own draws change), plus the perfect reader. Writes act4-runs.csv
// and prints the B1-B14 table (founder net worth multiples, 2035Q4 ÷ the Act IV entry, medians). B10, B11, B12 and B14
// are enforced by tests (act4OrbitCost, act4B11, act4B12, act4Market): the table says so. Only grades and futures are
// forced (harness overrides, as Act III's anchors force the scenario).
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT, FUTURE_IDS, type FutureId } from '../../src/content/index.ts'
import { TRIGGER } from './futures.ts'
import { PRESETS_IV, type Act4PresetId } from '../../src/content/presetsAct4.ts'
import { playFrom, playGame } from '../../src/sim/replay.ts'
import { toAct3, toAct4, type GameState } from '../../src/sim/state.ts'
import { computeReadingIv } from '../../src/sim/systems/readingScoreIv.ts'
import { BOTS } from '../bots.ts'
import { ACT4_ARCHETYPES, act4Archetypes, groundStats } from './bots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output')
const GRADES = ['rich', 'patchy', 'dry'] as const
type Grade = (typeof GRADES)[number]
const ALL_BOTS = [...ACT4_ARCHETYPES, 'perfect'] as const
// M36.6 (design thread, answer 4): a search run may play some futures and bots only (`--futures f2 --bots ground,sprinter`)
const BOT_NAMES = (args.includes('--bots') ? argValue('--bots', '').split(',') : ALL_BOTS) as readonly (typeof ALL_BOTS)[number][]
const FUTURES = (args.includes('--futures') ? argValue('--futures', '').split(',') : FUTURE_IDS) as readonly FutureId[]
// and scale F2's space multiple from its trigger quarter on, for this process only (`--f2space 0.85`)
const F2_SPACE = Number(argValue('--f2space', '1'))
if (F2_SPACE !== 1) {
  // (the four Act III scenarios' F2 keys share one table: scale each table once, not once per key)
  const tables = new Set(Object.entries(CONTENT.act4Markets).filter(([k]) => k.endsWith('.f2')).map(([, m]) => m.quarterly))
  for (const q of tables) q.forEach((row, i) => i >= TRIGGER.f2 && (row.space_ev_ebitda_mult *= F2_SPACE))
  console.log(`F2's space multiple × ${F2_SPACE} from act quarter ${TRIGGER.f2} (this run only)`)
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
  grade: Grade
  bot: string
  seed: number
  multiple: number
  gameOver: boolean
  reading: number | null
  orbitMw: number
  lunarSites: number
  pilotT: number
  decisions: number
  frontier: string
  /** M34.4: the founder stake at the end, and (Ground Holder) how often it borrowed, raised, skipped, built, bought a site. */
  stake: number
  borrowed: number
  raised: number
  skipped: number
  built: number
  sites: number
  poweredOffered: number
  poweredBought: number
}

const runs: Run[] = []
const t0 = performance.now()
/** Bots that never touch the Moon: the lunar grade can't change their game, so they're played once per future. */
const GRADE_FREE = new Set(['ground', 'sprinter', 'diversified', 'passive', 'perfect'])
for (const p of PRESETS_IV) {
  const bots = act4Archetypes(p.bot)
  for (const future of FUTURES)
    for (const grade of GRADES)
      for (const bot of BOT_NAMES)
        for (let seed = 1; seed <= SEEDS; seed++) {
          if (GRADE_FREE.has(bot) && grade !== 'rich') {
            const same = runs.find((r) => r.preset === p.id && r.future === future && r.grade === 'rich' && r.bot === bot && r.seed === seed)!
            runs.push({ ...same, grade })
            continue
          }
          const start = toAct4(structuredClone(presetEnd.get(p.id)!), { future, act4Seed: seed })
          start.lunarGrade = grade
          let decisions = 0
          const counting = {
            ...bots[bot],
            plan: (s: GameState) => {
              const a = bots[bot].plan(s)
              decisions += a.length
              return a
            },
          }
          for (const k of Object.keys(groundStats) as (keyof typeof groundStats)[]) groundStats[k] = 0
          const end = playFrom(start, counting, { through: 4 }).state
          const entry = end.act4Entry!.founderNetWorthUsd
          const nw = Math.max(0, end.founderStake * (end.reports.at(-1)?.valuationUsd ?? 0))
          runs.push({
            preset: p.id,
            future,
            grade,
            bot,
            seed,
            multiple: entry > 0 ? nw / entry : 0,
            gameOver: end.phase === 'gameover',
            reading: computeReadingIv(end.act4Moves ?? [], future).score,
            orbitMw: (end.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live').reduce((m, b) => m + b.mw * b.capacity, 0),
            lunarSites: (end.act4Moon?.claims ?? []).filter((c) => c.status === 'held').length,
            pilotT: (end.act4Moon?.claims ?? []).reduce((t, c) => t + (c.pilot?.processedT ?? 0), 0),
            decisions: decisions / Math.max(1, end.reports.filter((r) => r.quarter >= '2031Q1').length),
            frontier: end.act4End?.frontierTitleId ?? '',
            stake: end.founderStake,
            ...groundStats,
          })
        }
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}

mkdirSync(OUT, { recursive: true })
const cols = Object.keys(runs[0]) as (keyof Run)[]
writeFileSync(
  `${OUT}/act4-runs.csv`,
  [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n',
)

// ---------- the B table ----------
const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const sel = (f: Partial<Run>) =>
  runs.filter((r) => (Object.keys(f) as (keyof Run)[]).every((k) => r[k] === f[k]))
const med = (f: Partial<Run>) => median(sel(f).map((r) => r.multiple))
const goRate = (f: Partial<Run>) => {
  const xs = sel(f)
  return xs.length ? xs.filter((r) => r.gameOver).length / xs.length : NaN
}
const x = (n: number) => `${n.toFixed(2)}×`
const pct = (n: number) => `${Math.round(n * 100)}%`
const rows: [string, string, boolean, string][] = []
const add = (id: string, target: string, ok: boolean, got: string) => rows.push([id, target, ok, got])

// A filtered run (M36.6's knob search) prints its medians only: the B table needs every future and bot.
if (FUTURES.length < FUTURE_IDS.length || BOT_NAMES.length < ALL_BOTS.length) {
  console.log(`\nFiltered run: ${runs.length} runs. Medians (founder net worth multiple on the Act IV entry):`)
  for (const b of BOT_NAMES)
    console.log(`  ${b.padEnd(12)}${FUTURES.map((f) => `${f} ${x(med({ future: f, bot: b }))}`).join('  ')}   game overs ${pct(goRate({ bot: b }))}`)
  process.exit(0)
}
// B1: per (future × grade) cell, the archetypes' medians; who's best or within 10% of best
const winners = new Set<string>()
const bestCount: Record<string, number> = {}
for (const f of FUTURE_IDS)
  for (const g of GRADES) {
    const m = ACT4_ARCHETYPES.map((b) => ({ b, v: med({ future: f, grade: g, bot: b }) }))
    const best = Math.max(...m.map((y) => y.v))
    const top = m.filter((y) => y.v === best)[0].b
    bestCount[top] = (bestCount[top] ?? 0) + 1
    for (const y of m) if (y.v >= best * 0.9) winners.add(y.b)
  }
const anyAlwaysBest = Object.values(bestCount).some((n) => n === 12)
const orbitWins = winners.has('sprinter') || winners.has('diversified')
add('B1', 'no archetype best in all 12 cells; Ground, an orbit archetype and Lunar each best or within 10% somewhere', !anyAlwaysBest && winners.has('ground') && orbitWins && winners.has('lunar'), `best counts ${JSON.stringify(bestCount)}; within 10%: ${[...winners].join(', ')}`)
add('B2', 'F1: Sprinter ≥ 1.3 × Ground', med({ future: 'f1', bot: 'sprinter' }) >= 1.3 * med({ future: 'f1', bot: 'ground' }), `${x(med({ future: 'f1', bot: 'sprinter' }))} vs ${x(med({ future: 'f1', bot: 'ground' }))}`)
add('B3', 'F2: Ground ≥ 1.2 × Sprinter', med({ future: 'f2', bot: 'ground' }) >= 1.2 * med({ future: 'f2', bot: 'sprinter' }), `${x(med({ future: 'f2', bot: 'ground' }))} vs ${x(med({ future: 'f2', bot: 'sprinter' }))}`)
add('B4', 'F3: Diversified ≥ 1.25 × Sprinter; Lunar ≥ Sprinter', med({ future: 'f3', bot: 'diversified' }) >= 1.25 * med({ future: 'f3', bot: 'sprinter' }) && med({ future: 'f3', bot: 'lunar' }) >= med({ future: 'f3', bot: 'sprinter' }), `div ${x(med({ future: 'f3', bot: 'diversified' }))}, lunar ${x(med({ future: 'f3', bot: 'lunar' }))}, sprinter ${x(med({ future: 'f3', bot: 'sprinter' }))}`)
const f4 = ACT4_ARCHETYPES.map((b) => ({ b, v: med({ future: 'f4', bot: b }) }))
add('B5', 'F4: Ground best; Sprinter game overs ≤ 40%', f4.every((y) => y.v <= med({ future: 'f4', bot: 'ground' })) && goRate({ future: 'f4', bot: 'sprinter' }) <= 0.4, `ground ${x(med({ future: 'f4', bot: 'ground' }))}, best other ${x(Math.max(...f4.filter((y) => y.b !== 'ground').map((y) => y.v)))}; sprinter game overs ${pct(goRate({ future: 'f4', bot: 'sprinter' }))}`)
add('B6', 'Rich: Lunar ≥ 1.2 × Balanced; Dry: Lunar ≥ 0.7 × Balanced, game overs ≤ 25%', med({ grade: 'rich', bot: 'lunar' }) >= 1.2 * med({ grade: 'rich', bot: 'balanced' }) && med({ grade: 'dry', bot: 'lunar' }) >= 0.7 * med({ grade: 'dry', bot: 'balanced' }) && goRate({ grade: 'dry', bot: 'lunar' }) <= 0.25, `rich ${x(med({ grade: 'rich', bot: 'lunar' }))} vs ${x(med({ grade: 'rich', bot: 'balanced' }))}; dry ${x(med({ grade: 'dry', bot: 'lunar' }))} vs ${x(med({ grade: 'dry', bot: 'balanced' }))}, game overs ${pct(goRate({ grade: 'dry', bot: 'lunar' }))}`)
const fortressBust = sel({ preset: 'fortress', bot: 'passive' }).filter((r) => r.gameOver).length
add('B7', 'The Ground Fortress, played passively, never goes bust', fortressBust === 0, `${fortressBust} game overs in ${sel({ preset: 'fortress', bot: 'passive' }).length} runs`)
// (M34.1, the owner's answer 1e: in F2 and F4 the ideal stance is "stay out of orbit", which is what Passive does, so
// B8 asks for the reading edge in F1 and F3 only, and B9 for ≥ 0.98× passive everywhere: the noise band at 10 seeds)
const b8a = (['f1', 'f3'] as const).filter((f) => med({ future: f, bot: 'perfect' }) >= 1.15 * med({ future: f, bot: 'passive' })).length
const b8b = FUTURE_IDS.every((f) => med({ future: f, bot: 'overreactor' }) <= 0.97 * med({ future: f, bot: 'passive' }))
add('B8', 'Perfect ≥ 1.15 × passive in F1 and F3; over-reactor ≤ 0.97 × passive in every future', b8a === 2 && b8b, `perfect ≥ 1.15× in ${b8a}/2 (F1, F3); over-reactor: ${FUTURE_IDS.map((f) => x(med({ future: f, bot: 'overreactor' }) / med({ future: f, bot: 'passive' }))).join(' ')} of passive`)
add('B9', 'The perfect reader is ≥ 0.98 × passive in every future', FUTURE_IDS.every((f) => med({ future: f, bot: 'perfect' }) >= 0.98 * med({ future: f, bot: 'passive' })), FUTURE_IDS.map((f) => `${f} ${x(med({ future: f, bot: 'perfect' }))}/${x(med({ future: f, bot: 'passive' }))}`).join(', '))
add('B10', 'Orbital cost ratios match the model', true, 'enforced by tests/sim/act4OrbitCost.test.ts')
add('B11', 'Pilot water by 2035Q4 in its bands; no production output; no lunar cut to orbit', true, 'enforced by tests/sim/act4B11.test.ts (Rich 27.5, Patchy 13.8, Dry 4.1 t/yr)')
add('B12', 'No single launch failure forces a sale inside the rule', true, 'enforced by tests/sim/act4B12.test.ts')
const dec = median(sel({ bot: 'balanced' }).map((r) => r.decisions))
add('B13', '≤ 20 Plan phases, 3-6 decisions each (a miss accepted by the owner, 1f: a bot limit, measured in playtests)', dec >= 3 && dec <= 6, `20 Plan phases; Balanced's median ${dec.toFixed(1)} decisions a quarter`)
add('B14', 'Day one is the same in every future', true, 'enforced by tests/sim/act4Market.test.ts and act4Rivals (the league)')

console.log(`\nAct IV (--act4): ${runs.length} runs (${SEEDS} seeds), ${Math.round((performance.now() - t0) / 1000)} s. CSV in ${OUT}/act4-runs.csv`)
console.log('\nMedians (founder net worth multiple on the Act IV entry), by future × archetype:')
console.log(`  ${'archetype'.padEnd(12)}${FUTURE_IDS.map((f) => f.padStart(8)).join('')}   game overs`)
for (const b of BOT_NAMES)
  console.log(`  ${b.padEnd(12)}${FUTURE_IDS.map((f) => x(med({ future: f, bot: b })).padStart(8)).join('')}   ${pct(goRate({ bot: b }))}`)
// M34.4 (design thread, 9 Oct 2026): the Ground Holder's financing, by preset (runs, sums), and its founder stake.
console.log('\nGround Holder (M34.4, M36.5): per preset, over its runs: built / borrowed / raised / skipped; quarters a powered site was offered / bought; median founder stake at the end')
for (const p of PRESETS_IV) {
  const g = sel({ preset: p.id, bot: 'ground', grade: 'rich' })
  const sum = (k: keyof Run) => g.reduce((n, r) => n + Number(r[k]), 0)
  console.log(`  ${p.id.padEnd(10)} runs ${g.length}: built ${sum('built')}, borrowed ${sum('borrowed')}, raised ${sum('raised')}, skipped ${sum('skipped')}; powered offered ${sum('poweredOffered')}, bought ${sum('poweredBought')}; stake ${median(g.map((r) => r.stake)).toFixed(3)}`)
}
console.log('\nB1-B14:')
for (const [id, target, ok, got] of rows) console.log(`  ${id.padEnd(4)} ${ok ? 'PASS' : 'MISS'}  ${target}\n         ${got}`)
writeFileSync(`${OUT}/act4-btable.txt`, rows.map(([id, t, ok, got]) => `${id}\t${ok ? 'PASS' : 'MISS'}\t${t}\t${got}`).join('\n') + '\n')
