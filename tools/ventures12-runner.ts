// M78.6 (doc 58 v1.1 §5): the Acts I-II ventures' balance table, Y-B2..Y-B6, from bots played through Act II. `npm run sim -- --ventures12`
// (options: --seeds N, default 50; --out <dir>, default sim-output). Y-B1 (opt-out invariance) is the goldens and `--act2 --act3`.
// Targets are reported, never tuned here: a miss goes to the design thread.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT, quarterIndex } from '../src/content/index.ts'
import { ledgerQuarters } from '../src/sim/ledger.ts'
import { playGame, type Step } from '../src/sim/replay.ts'
import type { GameState } from '../src/sim/state.ts'
import { altCoinPer60, rentalOn } from '../src/sim/systems/afterMerge.ts'
import { larkspurDraws, lkPriceUsd } from '../src/sim/systems/larkspur.ts'
import { marketWeek } from '../src/sim/systems/market.ts'
import { BOTS, gen2Buyer, makeBot, RAISE_CLIMB } from './bots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '50'))
const OUT = argValue('--out', 'sim-output')
mkdirSync(OUT, { recursive: true })
const t0 = performance.now()

const median = (xs: number[]): number => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const pct = (x: number) => (Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(1)}%`)
const usd = (x: number) => (Number.isNaN(x) ? 'n/a' : `$${Math.round(x).toLocaleString('en-US')}`)
const lines: string[] = []
const say = (s = '') => {
  lines.push(s)
  console.log(s)
}

interface Run {
  seed: number
  state: GameState
  log: Step[]
  actI: number
  actII: number
}
const valueAt = (s: GameState, label: string): number => s.reports.find((r) => r.quarter === label)?.valuationUsd ?? NaN
function run(bot: string, seed: number, strategy = BOTS[bot]): Run {
  const r = playGame(seed, strategy, { through: 2 })
  return { seed, state: r.state, log: r.log, actI: valueAt(r.state, '2022Q3'), actII: r.state.reports.at(-1)?.valuationUsd ?? NaN }
}
const runs = (bot: string, strategy = BOTS[bot]): Run[] => Array.from({ length: SEEDS }, (_, i) => run(bot, i + 1, strategy))

const base = runs('raise-climb')
const street = runs('gen2-street')
const backer = runs('larkspur-backer')
const backer5 = runs('larkspur-backer-5gb')
const miner = runs('post-merge-miner')
const renter = runs('post-merge-renter')

const MERGE_Q = quarterIndex('2022Q3')!
say(`Acts I-II ventures (--ventures12): ${SEEDS} seeds, bots played to 2026Q4`)

// ---------- the start-up's own draws ----------
const draws = Array.from({ length: SEEDS }, (_, i) => larkspurDraws({ seed: i + 1 }))
const cancelled = draws.filter((d) => d.outcome === 'cancelled').length / SEEDS
const acquired = draws.filter((d) => d.outcome === 'acquired').length / SEEDS
const shipped = draws.filter((d) => d.outcome === 'ships').length / SEEDS
say(`\nLarkspur's fate over ${SEEDS} seeds: ships ${pct(shipped)}, cancelled ${pct(cancelled)}, acquired ${pct(acquired)}; slip 0/1/2: ${[0, 1, 2].map((k) => draws.filter((d) => d.slip === k).length).join('/')}`)

// ---------- who could afford it ----------
const joined = (rs: Run[]) => rs.filter((r) => r.state.larkspur)
const j = joined(backer)
say(
  `Backer (raise-climb, saving from 2019Q3): joined ${j.length}/${SEEDS} (20%: ${j.filter((r) => r.state.larkspur!.stakeAtJoin === 0.2).length}, 10%: ${j.filter((r) => r.state.larkspur!.stakeAtJoin === 0.1).length}); the rest could not find a first third in 2020`,
)

// ---------- Y-B2: a 20% backer against the same cash on Gen 2 at street price ----------
const spendOf = (r: Run): number => {
  const calls = -ledgerQuarters(r.state).reduce((n, l) => n + (l.lines.venture_calls ?? 0), 0)
  const l = r.state.larkspur!
  const units = l.reservation ? l.reservation.bought * lkPriceUsd(l.memory ?? 'lk5', quarterIndex('2022Q1')!) * 0.9 : 0
  return calls + units
}
const y2: { seed: number; ratio: number; spend: number; ended: string }[] = []
for (const r of backer) {
  const l = r.state.larkspur
  if (!l || l.stakeAtJoin !== 0.2 || l.walked) continue
  const spend = spendOf(r)
  const n = Math.max(1, Math.round(spend / 3 / 6600))
  const matched = run('matched', r.seed, gen2Buyer(makeBot(RAISE_CLIMB), false, n))
  const b = base[r.seed - 1]
  const gain = (x: Run) => x.actI - b.actI + spend
  y2.push({ seed: r.seed, ratio: gain(matched) > 0 ? gain(r) / gain(matched) : NaN, spend, ended: l.ended ?? 'ships' })
}
const y2all = y2.filter((x) => !Number.isNaN(x.ratio)).map((x) => x.ratio)
const y2ships = y2.filter((x) => x.ended === 'ships' && !Number.isNaN(x.ratio)).map((x) => x.ratio)
say(`\nY-B2 (target 1.0-2.5x, median): a 20% backer who paid every call, return on its Larkspur spend against the same cash on Gen 2 at street price, Act I end`)
say(`  all 20% backers (${y2.length}, spend median ${usd(median(y2.map((x) => x.spend)))}): median ${median(y2all).toFixed(2)}x; those whose Larkspur shipped (${y2ships.length}): median ${median(y2ships).toFixed(2)}x`)
// the stake alone, from the books: cash back (acquired price or the Act I-end resolution) over cash paid in (calls and deposit, net of credit)
const stakeOnly = (r: Run) => {
  let back = 0
  let paid = 0
  for (const l of ledgerQuarters(r.state)) {
    const v = l.byRef['venture:larkspur']
    if (!v) continue
    back += v.asset_sales ?? 0
    paid -= v.venture_calls ?? 0
  }
  return { back, paid }
}
const so = y2.map((x) => stakeOnly(backer[x.seed - 1])).filter((x) => x.paid > 0)
say(`  the stake alone (cash back / cash paid in, 20% backers): median ${median(so.map((x) => x.back / x.paid)).toFixed(2)}x over ${so.length} runs, before the machines`)
say(`  (return = Act I-end net worth gained against raise-climb, plus the spend, for the backer over the Gen 2 bot spending the same; includes the cost of saving cash from 2019Q3)`)

// ---------- Y-B3 ----------
const mem5 = backer5.filter((r) => r.state.machines.some((l) => l.model === 'lk5'))
const walled = mem5.filter((r) => r.state.log.some((e) => e.key === 'log.larkspur.wall_lk5'))
say(`\nY-B3 (cancelled 20-30% of runs; LK-5 stops ETH before the Merge in every run that ships it):`)
say(`  cancelled ${pct(cancelled)} of ${SEEDS} seeds (${pct(cancelled + acquired)} with the 5% acquired). LK-5 wall 2022-08-17 (${CONTENT.larkspur!.memory.walls.lk5}) before the Merge ${CONTENT.larkspur!.memory.walls.lk6}: fixed date; ${walled.length}/${mem5.length} runs holding LK-5 logged the wall`)

// ---------- Y-B4 / Y-B5: the tables, quarter by quarter ----------
const gen2 = CONTENT.machines.find((m) => m.id === 'gpu_gen2')!
const lastEth = gen2.hashrate * marketWeek(MERGE_Q, 0, null).eth_rev_usd_mh_day * 91
const rows: { q: string; best: number; net: number; rent: number; rentNet: number }[] = []
for (let q = MERGE_Q + 1; q <= quarterIndex('2026Q4')!; q++) {
  const w = marketWeek(q, 0, null)
  const date = w.week
  const best = Math.max(...(['etc', 'rvn', 'erg'] as const).map((c) => (gen2.hashrate / 60) * altCoinPer60(c, date) * 91))
  const power = gen2.power_kw * 24 * 91 * 0.1
  const r = rentalOn(date)
  const rent = CONTENT.afterMerge!.rental.cards_per_rig * r.rate * 24 * r.utilisation * 91
  rows.push({ q: CONTENT.quarters[q], best, net: best - power, rent, rentNet: rent - power * r.utilisation })
}
const belowThreshold = rows.filter((r) => r.best < 0.3 * lastEth).length
const negative = rows.filter((r) => r.net < 0).length
say(`\nY-B4 (best alternative coin under 30% of the rig's last ETH quarter (doc 58 v1.2 §11.3, was 25%); net below zero at $0.10/kWh in most quarters), a Gen 2 rig, 17 quarters 2022Q4-2026Q4:`)
say(`  last ETH quarter (2022Q3 first week x 13 weeks): ${usd(lastEth)}; best alternative coin gross ${usd(Math.min(...rows.map((r) => r.best)))}-${usd(Math.max(...rows.map((r) => r.best)))} a quarter; under 30% of it in ${belowThreshold}/${rows.length} quarters; net below zero at $0.10/kWh in ${negative}/${rows.length}`)
const from2023 = rows.filter((r) => r.q >= '2023Q1')
const rentWins = from2023.filter((r) => r.rentNet > r.net).length
say(`Y-B5 (rental beats the best alternative coin from 2023 in most runs; adds under 5% to an Act II company's value):`)
say(`  by the tables, rental nets more than the best alternative coin in ${rentWins}/${from2023.length} quarters from 2023Q1 (rental ${usd(median(from2023.map((r) => r.rentNet)))} median a quarter, best coin ${usd(median(from2023.map((r) => r.net)))})`)
const pairs = SEEDS
let renterBeats = 0
const uplift: number[] = []
for (let i = 0; i < pairs; i++) {
  if (renter[i].actII >= miner[i].actII) renterBeats++
  if (street[i].actII > 0) uplift.push((renter[i].actII - street[i].actII) / street[i].actII)
}
say(`  played: renter's Act II end value >= miner's in ${renterBeats}/${pairs} runs; renter over the idle-rig bot (gen2-street): median ${pct(median(uplift))}, max ${pct(Math.max(...uplift))}`)
const minerEarned = miner.map((r) => ledgerQuarters(r.state).filter((l) => l.q > MERGE_Q && (l.lines.mining_other ?? 0) > 0).length)
say(`  the miner earned on an alternative coin in a median ${median(minerEarned)} of 17 Act II quarters (a lot that would lose money switches itself off)`)

// ---------- Y-B6: pacing ----------
const actionsPerPlan = (r: Run, act: 1 | 2): number => {
  const plans = new Set<number>()
  let n = 0
  let q = 0
  for (const s of r.log) {
    const t = (s as { type: string }).type
    if (t === 'NEXT_QUARTER') q++
    if (t !== 'END_PLAN' && t !== 'ADVANCE' && t !== 'RESOLVE_INTERRUPT' && t !== 'NEXT_QUARTER' && t !== 'CONTINUE_TO_ACT_2' && t !== 'MERGE_CHOOSE') {
      n++
      plans.add(q)
    }
  }
  return act === 1 ? n / Math.max(1, plans.size) : n / Math.max(1, plans.size)
}
const added = (r: Run) => r.log.filter((s) => /^(LARKSPUR_|SET_LOT_USE)/.test((s as { type: string }).type)).length
say(`\nY-B6 (Plan phases and choice cards within pacing: 3-6 meaningful decisions per turn):`)
say(
  `  actions per Plan phase that has any: raise-climb ${median(base.map((r) => actionsPerPlan(r, 1))).toFixed(1)}, larkspur-backer ${median(backer.map((r) => actionsPerPlan(r, 1))).toFixed(1)}, post-merge-renter ${median(renter.map((r) => actionsPerPlan(r, 2))).toFixed(1)} (medians); the ventures add a median ${median(backer.map(added))} actions to a whole backer run (join, 3 calls at most, a reservation, buys) and ${median(renter.map(added))} to a renter run`,
)

// ---------- the bot table ----------
say(`\nNet worth (valuation, median over ${SEEDS} seeds) at Act I's end (2022Q3) and Act II's end (2026Q4) against the M77 baseline bot gen2-street:`)
say('| bot | joined | Act I end | vs gen2-street | Act II end | vs gen2-street | game overs |')
say('|---|---|---|---|---|---|---|')
const table = (name: string, rs: Run[]) => {
  const rel = (f: (r: Run) => number) => median(rs.map((r, i) => (f(street[i]) ? f(r) / f(street[i]) - 1 : NaN)))
  say(
    `| ${name} | ${joined(rs).length} | ${usd(median(rs.map((r) => r.actI)))} | ${pct(rel((r) => r.actI))} | ${usd(median(rs.map((r) => r.actII)))} | ${pct(rel((r) => r.actII))} | ${rs.filter((r) => r.state.phase === 'gameover').length} |`,
  )
}
table('raise-climb', base)
table('gen2-street', street)
table('larkspur-backer', backer)
table('larkspur-backer-5gb', backer5)
table('post-merge-miner', miner)
table('post-merge-renter', renter)

const csv = ['bot,seed,joined,stake,ended,memory,act1_end,act2_end,phase']
for (const [name, rs] of [['raise-climb', base], ['gen2-street', street], ['larkspur-backer', backer], ['larkspur-backer-5gb', backer5], ['post-merge-miner', miner], ['post-merge-renter', renter]] as const)
  for (const r of rs) {
    const l = r.state.larkspur
    csv.push([name, r.seed, l ? 1 : 0, l?.stakeAtJoin ?? '', l?.ended ?? '', l?.memory ?? '', Math.round(r.actI), Math.round(r.actII), r.state.phase].join(','))
  }
writeFileSync(`${OUT}/ventures12-runs.csv`, csv.join('\n') + '\n')
writeFileSync(`${OUT}/ventures12-summary.txt`, lines.join('\n') + '\n')
say(`\n${((performance.now() - t0) / 1000).toFixed(1)} s for ${6 * SEEDS} runs through Act II (plus the matched-spend control runs)`)
