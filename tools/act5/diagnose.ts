// M59.1 (doc 43 §0.15 rules 9-10): two diagnostics before any balance change, `node tools/act5/diagnose.ts [--seeds N]`.
// (1) Orbital Landlord's 2035Q4 → 2040Q4 change, per future, for Passive and the Orbit Replacer: the valuation split into
//     its units (orbit, AI ground, mining, the lunar holding, ventures, free MW, cash, debt, the rest), the orbit unit's
//     change split into its EBITDA and its multiple, the blocks by fate (live at the start, retired, replaced, new), and
//     the founder's stake. Medians over N seeds (default 5) of each part, and seed 1's blocks.
// (2) One Orbital Landlord V3 game's reading score (seed 1): Perfect's and Passive's move lists with each move's mark,
//     and the score quarter by quarter (stance, ideal, weight, value), to rule out a scoring bug behind V-B9's −21.
// Tools may read the hidden files (CLAUDE.md); nothing here changes the game.
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import type { VFutureId } from '../../src/content/schemas.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState, type QuarterReport } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { computeReadingV, markMovesV } from '../../src/sim/systems/readingScoreV.ts'
import { valuationSplit } from '../../src/sim/systems/valuation.ts'
import { act5Bot, type Act5Archetype } from './bots.ts'
import { playAct5Recipe } from './presetRun.ts'

const args = process.argv.slice(2)
const SEEDS = Number(args.includes('--seeds') ? args[args.indexOf('--seeds') + 1] : '5')
const first5 = actFirstQuarter(5)
const M = (x: number) => `${(x / 1e6).toFixed(0)}`
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y)
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

// (3) M60.3 (§0.16 item 4), `--flex`: the Flex Operator in V2 on both presets: the MW it requested, how many took the fast
// lane, connected (energized) and leased by 2040Q4, and the rent those halls earned (the ledger's ai_shell_rent on them).
if (args.includes('--flex')) {
  const { ledgerQuarters } = await import('../../src/sim/ledger.ts')
  for (const id of ['firm_builder', 'orbital_landlord'] as const) {
    const pr = PRESETS_V.find((x) => x.id === id)!
    const b0 = playAct5Recipe({ act4_preset: pr.act4_preset, act4_future: pr.act4_future, act4_seed: pr.act4_seed, joins: pr.joins as never })
    for (let seed = 1; seed <= SEEDS; seed++) {
      const start = toAct5(structuredClone(b0), { vfuture: 'v2', act5Seed: seed })
      const before = new Set(start.projects.map((x) => x.id))
      const s = playFrom(start, act5Bot('flex'), { through: 5 }).state
      const fresh = s.projects.filter((x) => !before.has(x.id))
      const adds = s.sites.flatMap((x) => x.powerAdds ?? []).filter((a) => fresh.some((f) => f.id === a.projectId))
      const fast = adds.filter((a) => a.position?.fastLane)
      const connected = adds.filter((a) => a.readyQuarter !== null && a.readyQuarter <= s.quarter)
      const leased = fresh.filter((x) => x.stage === 'live' && x.tenant)
      let rent = 0
      for (const lq of ledgerQuarters(s)) for (const f of fresh) rent += lq.byRef[`project:${f.id}`]?.ai_shell_rent ?? 0
      const flexMw = s.sites.reduce((a, x) => a + (x.flexKw ?? 0), 0) / 1000
      console.log(
        `  ${id} v2 seed ${seed}: halls requested ${fresh.length} (${adds.reduce((a, x) => a + x.kw, 0) / 1000} MW); fast lane ${fast.length} ` +
          `(${fast.reduce((a, x) => a + x.kw, 0) / 1000} MW); connected ${connected.reduce((a, x) => a + x.kw, 0) / 1000} MW; leased ${leased.length} ` +
          `(${leased.reduce((a, x) => a + x.kw, 0) / 1000} MW); their rent $${(rent / 1e6).toFixed(1)}M; enrolled ${flexMw} MW; cash $${(s.cash / 1e6).toFixed(0)}M`,
      )
    }
  }
  process.exit(0)
}

const p = PRESETS_V.find((x) => x.id === 'orbital_landlord')!
const base = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never })

/** A report's valuation by part ($). */
function parts(s: GameState, r: QuarterReport) {
  const v = valuationSplit(r, s.firstAiDealQuarter ?? null, scenarioOf({ ...s, quarter: CONTENT.quarters.indexOf(r.quarter) } as GameState))
  return {
    orbit: v.orbitEvUsd,
    ai: v.aiEvUsd,
    mining: v.miningEvUsd,
    lunar: v.lunarUsd,
    ventures: v.venturesUsd,
    powered: r.poweredUsd ?? 0,
    construction: v.constructionUsd + v.weightedBacklogUsd,
    cash: r.cash,
    debt: -r.debtUsd,
    rest: v.treasuryUsd - (r.poweredUsd ?? 0),
    total: r.valuationUsd,
    orbitEbitdaQ: r.orbitEbitdaUsd ?? 0,
    orbitMultiple: r.orbitMultiple ?? 0,
    stake: r.founderStake,
  }
}
type Parts = ReturnType<typeof parts>
const KEYS = ['orbit', 'ai', 'mining', 'lunar', 'ventures', 'powered', 'construction', 'cash', 'debt', 'rest', 'total'] as const

console.log('(1) Orbital Landlord, 2035Q4 → 2040Q4 ($M; medians over', SEEDS, 'seeds)')
const start = parts(base, base.reports.at(-1)!)
console.log(`  2035Q4: ${KEYS.map((k) => `${k} ${M(start[k])}`).join(', ')}; orbit EBITDA/q ${M(start.orbitEbitdaQ)} × ${start.orbitMultiple.toFixed(2)}; stake ${start.stake.toFixed(3)}`)
for (const v of V_FUTURE_IDS)
  for (const bot of ['passive', 'orbit'] as Act5Archetype[]) {
    const ends: Parts[] = []
    let fates = ''
    const mults: number[] = []
    for (let seed = 1; seed <= SEEDS; seed++) {
      const s = playFrom(toAct5(structuredClone(base), { vfuture: v as VFutureId, act5Seed: seed }), act5Bot(bot), { through: 5 }).state
      ends.push(parts(s, s.reports.at(-1)!))
      mults.push((s.act5End!.preExitNetWorthUsd ?? 0) / s.act5Entry!.founderNetWorthUsd)
      if (seed === 1) {
        const blocks = s.act4Orbit?.blocks ?? []
        const startIds = new Set((base.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live').map((b) => b.id))
        const old = blocks.filter((b) => startIds.has(b.id))
        const fresh = blocks.filter((b) => !(base.act4Orbit?.blocks ?? []).some((x) => x.id === b.id))
        const replaced = (s.act5Moves ?? []).filter((m) => m.kind === 'orbit_replace').length
        fates =
          `live at start ${startIds.size} (still live ${old.filter((b) => b.stage === 'live').length}, retired ${old.filter((b) => b.stage === 'retired').length}); ` +
          `replaced ${replaced}; new ${fresh.length} (live ${fresh.filter((b) => b.stage === 'live').length})`
      }
    }
    const multiple = median(mults)
    const end = Object.fromEntries([...KEYS, 'orbitEbitdaQ', 'orbitMultiple', 'stake'].map((k) => [k, median(ends.map((e) => e[k as keyof Parts]))])) as Parts
    const d = (k: (typeof KEYS)[number]) => end[k] - start[k]
    // the orbit unit's change: its EBITDA at the old multiple, and the multiple's own move on the new EBITDA
    const byEbitda = (end.orbitEbitdaQ - start.orbitEbitdaQ) * 4 * start.orbitMultiple
    const byMultiple = end.orbitEbitdaQ * 4 * (end.orbitMultiple - start.orbitMultiple)
    console.log(`  ${v} ${bot.padEnd(7)} multiple ${multiple.toFixed(3)}; Δ ${KEYS.map((k) => `${k} ${M(d(k))}`).join(', ')}`)
    console.log(`             orbit Δ = EBITDA ${M(byEbitda)} + multiple ${M(byMultiple)} (× ${start.orbitMultiple.toFixed(2)} → ${end.orbitMultiple.toFixed(2)}); stake ${start.stake.toFixed(3)} → ${end.stake.toFixed(3)}; seed 1 blocks: ${fates}`)
  }

console.log('\n(2) Orbital Landlord V3, seed 1: the reading score')
for (const bot of ['perfect', 'passive'] as Act5Archetype[]) {
  const s = playFrom(toAct5(structuredClone(base), { vfuture: 'v3', act5Seed: 1 }), act5Bot(bot), { through: 5 }).state
  const moves = s.act5Moves ?? []
  const r = computeReadingV(moves, 'v3', s.act5Exposure ?? [], s.quarter - first5)
  console.log(`  ${bot}: score ${r.score} (base ${r.base}, penalty ${r.penalty}); ${moves.length} moves`)
  console.log(`    moves: ${markMovesV(moves, 'v3').map((m) => `q${m.q} ${m.kind} ${m.sign > 0 ? '+' : m.sign < 0 ? '−' : '0'}${m.mark ? `(${m.mark})` : ''}`).join('; ')}`)
  console.log(`    per quarter (q stance/ideal w value): ${r.perQuarter.map((x) => `q${x.q} ${x.stance}/${x.ideal} w${x.weight} ${x.value}`).join('; ')}`)
  console.log(`    exposure: ${(s.act5Exposure ?? []).map((x) => x.toFixed(2)).join(' ')}`)
}
