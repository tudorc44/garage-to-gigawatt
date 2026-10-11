// M57.3 (doc 43 §18): `npm run sim -- --act5 [--seeds N] [--out dir] [--presets a,b] [--futures v1,v2] [--bots x,y]`.
// Plays every Act V archetype (tools/act5/bots.ts) on the two presets × the four futures × N seeds (default 30; the seed
// is the act5Seed, so the preset companies are the same and only Act V's own draws change). Writes act5-runs.csv and
// prints the V-B1..V-B14 table (medians of the founder net worth multiple 2040Q4 ÷ act5Entry, before the exit unless
// stated). The futures are forced (a harness override, as Act IV's runner forces its futures).
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { ACT5_PRESET_IDS, PRESETS_V, type Act5PresetId } from '../../src/content/presetsAct5.ts'
import type { VentureType } from '../../src/content/energyContent.ts'
import type { VFutureId } from '../../src/content/schemas.ts'
import { playFrom, type Step } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { ACT5_ARCHETYPES, act5Bot, type Act5Archetype } from './bots.ts'
import { playAct5Recipe } from './presetRun.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '30'))
const OUT = argValue('--out', 'sim-output')
const list = <T extends string>(flag: string, all: readonly T[]) => (args.includes(flag) ? (argValue(flag, '').split(',') as T[]) : all)
const PRESETS = list<Act5PresetId>('--presets', ACT5_PRESET_IDS)
const FUTURES = list<VFutureId>('--futures', V_FUTURE_IDS)
const BOT_NAMES = list<Act5Archetype>('--bots', ACT5_ARCHETYPES)

/** The preset companies at 2035Q4 (each played once from 2017, as the game's "Start at Act V"). */
const presetEnd = new Map<Act5PresetId, GameState>()
for (const id of PRESETS) {
  const p = PRESETS_V.find((x) => x.id === id)!
  presetEnd.set(
    id,
    playAct5Recipe({
      act4_preset: p.act4_preset,
      act4_future: p.act4_future,
      act4_seed: p.act4_seed,
      joins: p.joins === 'btm' ? 'btm' : (p.joins as VentureType[]),
      ...(p.join_from ? { join_from: p.join_from } : {}),
    }),
  )
}

export interface Act5Run {
  preset: Act5PresetId
  future: VFutureId
  bot: Act5Archetype
  seed: number
  /** Before the exit (V-B1-V-B5, V-B8) and after the default hold. */
  multiple: number
  afterHold: number
  /** The exit priced from the same run: sold at the bid, held at the outlook (V-B11). */
  sellUsd: number
  holdUsd: number
  gameOver: boolean
  reading: number | null
  moves: number
  plans: number
  actions: number
  maxActions: number
  fusionBefore2038: boolean
  /** Ventures with a stake at the boundary: class and first power ≤ 2040Q4 (V-B10). */
  ventures: { type: string; built: boolean }[]
  ledgerOk: boolean
}

const first5 = actFirstQuarter(5)
const fusionLimit = CONTENT.quarters.indexOf('2038Q1')
const runs: Act5Run[] = []
const t0 = performance.now()
for (const preset of PRESETS)
  for (const future of FUTURES)
    for (let seed = 1; seed <= SEEDS; seed++)
      for (const bot of BOT_NAMES) {
        const start = toAct5(structuredClone(presetEnd.get(preset)!), { vfuture: future, act5Seed: seed, preset })
        const venturesIn = (start.ventures ?? []).filter((v) => v.stake > 0).map((v) => v.id)
        const run = playFrom(start, act5Bot(bot), { through: 5 })
        const s = run.state
        const e = s.act5End!
        const entry = s.act5Entry!.founderNetWorthUsd
        const pre = e.preExitNetWorthUsd ?? e.founderNetWorthUsd
        // (Plan phases and their actions, from the step log: END_PLAN closes each)
        const perPlan: number[] = []
        let n = 0
        for (const st of run.log as Step[])
          if (st.type === 'END_PLAN') {
            perPlan.push(n)
            n = 0
          } else if (st.type !== 'ADVANCE' && st.type !== 'RESOLVE_INTERRUPT' && st.type !== 'NEXT_QUARTER') n++
        runs.push({
          preset,
          future,
          bot,
          seed,
          multiple: entry > 0 ? pre / entry : 0,
          afterHold: entry > 0 ? (e.gameOver ? 0 : pre * (e.outlookFactor ?? 1)) / entry : 0,
          sellUsd: e.gameOver ? 0 : pre * (e.bidFactor ?? 1),
          holdUsd: e.gameOver ? 0 : pre * (e.outlookFactor ?? 1),
          gameOver: e.gameOver,
          reading: e.reading?.score ?? null,
          moves: (s.act5Moves ?? []).length,
          plans: perPlan.length,
          actions: perPlan.reduce((a, b) => a + b, 0),
          maxActions: Math.max(0, ...perPlan),
          fusionBefore2038: (s.ventures ?? []).some((v) => v.type === 'fusion' && v.stage === 'operating' && v.codQuarter < fusionLimit),
          ventures: (s.ventures ?? [])
            .filter((v) => venturesIn.includes(v.id))
            .map((v) => ({ type: v.type, built: v.stage === 'operating' || (v.codQuarter >= first5 && v.codQuarter <= first5 + 19 && v.stage !== 'cancelled' && v.stage !== 'folded') })),
          ledgerOk: unreconciled(s).length === 0,
        })
      }
const secs = (performance.now() - t0) / 1000

mkdirSync(OUT, { recursive: true })
const header = 'preset,future,bot,seed,multiple,after_hold,sell_usd,hold_usd,game_over,reading,moves,plans,actions,max_actions,ledger_ok'
writeFileSync(
  `${OUT}/act5-runs.csv`,
  [
    header,
    ...runs.map((r) =>
      [r.preset, r.future, r.bot, r.seed, r.multiple.toFixed(4), r.afterHold.toFixed(4), Math.round(r.sellUsd), Math.round(r.holdUsd), r.gameOver ? 1 : 0, r.reading ?? '', r.moves, r.plans, r.actions, r.maxActions, r.ledgerOk ? 1 : 0].join(','),
    ),
  ].join('\n') + '\n',
)

// ---------- the V-B table ----------
const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const a = [...xs].sort((x, y) => x - y)
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
const of = (p: Act5PresetId | null, v: VFutureId, b: Act5Archetype) => runs.filter((r) => (p === null || r.preset === p) && r.future === v && r.bot === b)
const med = (p: Act5PresetId | null, v: VFutureId, b: Act5Archetype) => median(of(p, v, b).map((r) => r.multiple))
const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : '—')
const lines: string[] = []
const say = (s: string) => {
  lines.push(s)
  console.log(s)
}
const verdict = (ok: boolean) => (ok ? 'PASS' : 'MISS')

say(`Act V runs: ${runs.length} (${PRESETS.join(', ')} × ${FUTURES.join(', ')} × ${SEEDS} seeds × ${BOT_NAMES.length} bots) in ${secs.toFixed(0)} s`)
say(`Ledger: ${runs.filter((r) => !r.ledgerOk).length} runs unreconciled`)
say('')
say('Medians of the founder net worth multiple, 2040Q4 before the exit ÷ act5Entry:')
for (const p of PRESETS) {
  say(`  ${p}`)
  say(`    ${'bot'.padEnd(12)}${FUTURES.map((v) => v.padStart(9)).join('')}   busts`)
  for (const b of BOT_NAMES)
    say(
      `    ${b.padEnd(12)}${FUTURES.map((v) => f3(med(p, v, b)).padStart(9)).join('')}   ${FUTURES.map((v) => of(p, v, b).filter((r) => r.gameOver).length).join('/')}`,
    )
}
say('')
const ratio = (p: Act5PresetId, v: VFutureId, a: Act5Archetype, b: Act5Archetype) => med(p, v, a) / med(p, v, b)
const has = (b: Act5Archetype) => BOT_NAMES.includes(b)
const GROUND: Act5PresetId[] = PRESETS.filter((p) => p === 'firm_builder')

// V-B1: no archetype best everywhere; each of the four is best or within 10% in at least one future (per preset)
const FOUR: Act5Archetype[] = (['holder', 'flex', 'seller', 'orbit'] as const).filter(has)
for (const p of PRESETS) {
  const best = FUTURES.map((v) => Math.max(...FOUR.map((b) => med(p, v, b))))
  const near = FOUR.map((b) => FUTURES.filter((v, i) => med(p, v, b) >= 0.9 * best[i]).length)
  const winners = FUTURES.map((v, i) => FOUR.find((b) => med(p, v, b) === best[i]))
  const one = new Set(winners).size === 1 && FUTURES.length > 1
  say(`V-B1 ${p}: best per future ${winners.join(', ')}; futures within 10% of best: ${FOUR.map((b, i) => `${b} ${near[i]}`).join(', ')} → ${verdict(!one && near.every((n) => n >= 1))}`)
}
if (FUTURES.includes('v1') && has('holder') && has('seller') && has('locker'))
  for (const p of PRESETS) {
    const hs = ratio(p, 'v1', 'holder', 'seller')
    const hl = ratio(p, 'v1', 'holder', 'locker')
    say(`V-B2 ${p}${GROUND.includes(p) ? '' : ' (information)'}: V1 Holder ÷ Seller ${f3(hs)} (≥ 1.2), Holder ÷ Locker ${f3(hl)} (≥ 1.0) → ${verdict(hs >= 1.2 && hl >= 1)}`)
  }
if (FUTURES.includes('v2') && has('flex') && has('holder'))
  for (const p of PRESETS) say(`V-B3 ${p}: V2 Flex ÷ Holder ${f3(ratio(p, 'v2', 'flex', 'holder'))} (≥ 1.15) → ${verdict(ratio(p, 'v2', 'flex', 'holder') >= 1.15)}`)
// (doc 43 §0.16 item 3: V-B4 is V3 Seller ≥ 1.2 × Holder, and Locker > Holder, on the ground-heavy start; Holder's
// game-over rate ≤ 30% as before)
if (FUTURES.includes('v3') && has('seller') && has('locker') && has('holder'))
  for (const p of PRESETS) {
    const sh = ratio(p, 'v3', 'seller', 'holder')
    const lh = ratio(p, 'v3', 'locker', 'holder')
    const busts = of(p, 'v3', 'holder')
    const rate = busts.filter((r) => r.gameOver).length / Math.max(1, busts.length)
    say(`V-B4 ${p}${GROUND.includes(p) ? '' : ' (information)'}: V3 Seller ÷ Holder ${f3(sh)} (≥ 1.2), Locker ÷ Holder ${f3(lh)} (> 1); Holder busts ${(rate * 100).toFixed(0)}% (≤ 30%) → ${verdict(sh >= 1.2 && lh > 1 && rate <= 0.3)}`)
  }
// (doc 43 §0.15 rule 8: V-B5 is judged on the orbit-heavy start, Orbital Landlord; Firm Builder's is information)
if (FUTURES.includes('v4') && has('orbit') && has('holder'))
  for (const p of PRESETS)
    say(`V-B5 ${p}${p === 'orbital_landlord' ? '' : ' (information)'}: V4 Orbit Replacer ÷ Holder ${f3(ratio(p, 'v4', 'orbit', 'holder'))} (≥ 1.15) → ${verdict(ratio(p, 'v4', 'orbit', 'holder') >= 1.15)}`)
// (§0.15 fix 7: the Builder is the Holder plus every follow-on unit; its gain over the Holder is the units' contribution.
// Act V has no control venture, so the 1.5× and 3× clauses can't be judged here: the contribution is reported)
if (has('builder') && has('holder'))
  for (const p of PRESETS) {
    const parts = FUTURES.map((v) => {
      const b = of(p, v, 'builder').map((r) => r.multiple)
      const h = of(p, v, 'holder').map((r) => r.multiple)
      const gains = b.map((x, i) => x - (h[i] ?? x))
      return `${v} median ${f3(median(gains))}, best ${f3(Math.max(...gains))}`
    })
    say(`V-B6 ${p}: the follow-on units' contribution (Builder − Holder, in multiples of act5Entry): ${parts.join('; ')} (information: no Act V control)`)
  }
if (PRESETS.includes('firm_builder') && has('passive')) {
  const pr = runs.filter((r) => r.preset === 'firm_builder' && r.bot === 'passive')
  say(`V-B7: Firm Builder played passively: ${pr.filter((r) => r.gameOver).length} busts in ${pr.length} runs → ${verdict(pr.every((r) => !r.gameOver))}`)
}
if (has('perfect') && has('passive') && has('overreactor'))
  for (const p of PRESETS) {
    const pp = FUTURES.map((v) => ratio(p, v, 'perfect', 'passive'))
    const op = FUTURES.map((v) => ratio(p, v, 'overreactor', 'passive'))
    say(
      `V-B8 ${p}: Perfect ÷ Passive ${pp.map(f3).join(' / ')} (≥ 1.15 in ≥ 3); Over-reactor ÷ Passive ${op.map(f3).join(' / ')} (≤ 0.97 in all) → ${verdict(pp.filter((x) => x >= 1.15).length >= 3 && op.every((x) => x <= 0.97))}`,
    )
  }
if (has('perfect') && has('passive'))
  for (const p of PRESETS) {
    const rd = (v: VFutureId, b: Act5Archetype) => median(of(p, v, b).map((r) => r.reading ?? 0))
    const gaps = FUTURES.map((v) => rd(v, 'perfect') - rd(v, 'passive'))
    // (§0.15 rule 9: judged on ground-heavy starts; Orbital Landlord's is information)
    say(`V-B9 ${p}${GROUND.includes(p) ? '' : ' (information)'}: Perfect − Passive reading ${gaps.map((g) => g.toFixed(1)).join(' / ')} (≥ −2 in all) → ${verdict(gaps.every((g) => g >= -2))}`)
  }
{
  const fusion = runs.filter((r) => r.fusionBefore2038).length
  const byType = new Map<string, { n: number; built: number }>()
  for (const r of runs.filter((x) => x.bot === 'passive'))
    for (const v of r.ventures) {
      const t = byType.get(v.type) ?? { n: 0, built: 0 }
      t.n++
      if (v.built) t.built++
      byType.set(v.type, t)
    }
  say(`V-B10: fusion output before 2038 in ${fusion} runs → ${verdict(fusion === 0)}; P(first power by 2040) among held stakes (passive): ${[...byType].map(([k, t]) => `${k} ${(t.built / t.n).toFixed(2)} (${t.n})`).join(', ') || 'none held'}; grid waits: tests/sim/act5Queue.test.ts`)
}
for (const p of PRESETS) {
  const parts = FUTURES.map((v) => {
    const rs = runs.filter((r) => r.preset === p && r.future === v && !r.gameOver)
    return median(rs.map((r) => r.holdUsd)) / median(rs.map((r) => r.sellUsd))
  })
  say(`V-B11 ${p}: hold ÷ sell at the median ${parts.map(f3).join(' / ')} (within 0.80-1.25) → ${verdict(parts.every((x) => x >= 0.8 && x <= 1.25))}`)
}
say('V-B12: no plant trip or cash call forces a sale inside the covenant: by the plants tests (tests/sim/act5Plants.test.ts), not this runner')
{
  const bal = runs.filter((r) => r.bot === 'balanced')
  say(`V-B13: Plan phases per game ${median(bal.map((r) => r.plans))} (≤ 20); Balanced's actions per Plan phase median ${f3(median(bal.map((r) => r.actions / Math.max(1, r.plans))))}, max ${Math.max(...bal.map((r) => r.maxActions))} (a bot's count, information only)`)
}
say('V-B14: day one the same in every future: tests/sim/act5Futures.test.ts')
writeFileSync(`${OUT}/act5-summary.txt`, lines.join('\n') + '\n')
