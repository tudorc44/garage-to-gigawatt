// M79.5 (doc 62 §3): the Act I capital changes' report-only table. `npm run sim -- --capital` (options: --seeds N, default 50; --out <dir>).
// texas-selffund against texas-ipo (Act I end founder net worth, who reached Texas), buyback-founder against raise-climb (founder stake and
// net worth), and the buy-back refusal rate overall and by year. Reported, never tuned.
import { mkdirSync, writeFileSync } from 'node:fs'
import { CONTENT } from '../src/content/index.ts'
import { playGame } from '../src/sim/replay.ts'
import type { GameState } from '../src/sim/state.ts'
import { BOTS } from './bots.ts'

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
  /** Founder net worth at Act I's end (founder stake x the last report's valuation) and at Act II's end. */
  actI: number
  actII: number
}
const founderWorth = (s: GameState, label: string): number => {
  const r = s.reports.find((x) => x.quarter === label)
  return r ? Math.max(0, s.founderStake * r.valuationUsd) : NaN
}
function runs(bot: string): Run[] {
  return Array.from({ length: SEEDS }, (_, i) => {
    const one = playGame(i + 1, BOTS[bot], { through: 1 }).state
    const two = playGame(i + 1, BOTS[bot], { through: 2 }).state
    const last = two.reports.at(-1)
    return { seed: i + 1, state: one, actI: founderWorth(one, '2022Q3'), actII: last ? Math.max(0, two.founderStake * last.valuationUsd) : NaN }
  })
}

const ipo = runs('texas-ipo')
const selffund = runs('texas-selffund')
const climb = runs('raise-climb')
const buyback = runs('buyback-founder')

say(`Act I capital (--capital): ${SEEDS} seeds, Acts I and II, report only`)

// ---------- Texas without Series A ----------
const hasTexas = (r: Run) => r.state.sites.some((x) => x.tier === 'texas_site')
const selfFunded = selffund.filter((r) => r.state.sites.some((x) => x.tier === 'texas_site' && x.phases))
say(`\nTexas: texas-ipo reached Texas in ${ipo.filter(hasTexas).length}/${SEEDS} runs (Series A first, then the loan); texas-selffund (no Series A, phase 1 in cash plus the deposit) in ${selfFunded.length}/${SEEDS}.`)
const peak = (r: Run) => Math.max(0, ...r.state.reports.filter((x) => x.quarter >= '2020Q3').map((x) => x.cash))
say(`  texas-selffund's highest cash at any quarter's end from 2020Q3: median ${usd(median(selffund.map(peak)))}, best ${usd(Math.max(...selffund.map(peak)))}; phase 1 needs about $11.1M in cash (the cost $8M and a deposit of about $3.06M at the fixed price).`)
say(`  its Act I end: median valuation ${usd(median(selffund.map((r) => r.state.reports.at(-1)?.valuationUsd ?? NaN)))} against texas-ipo's ${usd(median(ipo.map((r) => r.state.reports.at(-1)?.valuationUsd ?? NaN)))}; rounds taken: ${[...new Set(selffund.map((r) => r.state.raisesDone.join('+')))].join(' | ')}`)
say(`  founder net worth at Act I's end (median): texas-selffund ${usd(median(selffund.map((r) => r.actI)))} against texas-ipo ${usd(median(ipo.map((r) => r.actI)))} (${pct(median(selffund.map((r, i) => (ipo[i].actI ? r.actI / ipo[i].actI - 1 : NaN))))} paired)`)

// ---------- buy-backs ----------
const offers = buyback.flatMap((r) => r.state.log.filter((e) => e.key === 'log.buyback_refused' || e.key === 'log.buyback_accepted').map((e) => ({ year: CONTENT.quarters[e.quarter].slice(0, 4), accepted: e.key === 'log.buyback_accepted' })))
const refused = offers.filter((o) => !o.accepted).length
say(`\nBuy-backs: buyback-founder made ${offers.length} offers over ${SEEDS} runs (${(offers.length / SEEDS).toFixed(1)} a run); refused ${pct(refused / Math.max(1, offers.length))} overall (expect about 30%).`)
const years = [...new Set(offers.map((o) => o.year))].sort()
say(`  by year: ${years.map((y) => `${y} ${pct(offers.filter((o) => o.year === y && !o.accepted).length / offers.filter((o) => o.year === y).length)} of ${offers.filter((o) => o.year === y).length}`).join(', ')}`)
const bought = buyback.filter((r) => (r.state.buyback?.closed.length ?? 0) > 0)
say(`  runs that bought a round out: ${bought.length}/${SEEDS}; rounds closed ${buyback.reduce((n, r) => n + (r.state.buyback?.closed.length ?? 0), 0)}`)
say(`  founder stake at Act I's end (median): buyback-founder ${pct(median(buyback.map((r) => r.state.founderStake)))} against raise-climb ${pct(median(climb.map((r) => r.state.founderStake)))}`)
say(`  founder net worth at Act I's end (median): buyback-founder ${usd(median(buyback.map((r) => r.actI)))} against raise-climb ${usd(median(climb.map((r) => r.actI)))} (${pct(median(buyback.map((r, i) => (climb[i].actI ? r.actI / climb[i].actI - 1 : NaN))))} paired); company valuation ${pct(median(buyback.map((r, i) => (climb[i].state.reports.at(-1)!.valuationUsd ? (r.state.reports.at(-1)?.valuationUsd ?? NaN) / climb[i].state.reports.at(-1)!.valuationUsd - 1 : NaN))))} paired`)

// ---------- the bot table ----------
say(`\nFounder net worth, median over ${SEEDS} seeds, at Act I's end (2022Q3) and Act II's end (2026Q4):`)
say('| bot | founder stake (Act I end) | Act I end | Act II end | game overs (Acts I-II) |')
say('|---|---|---|---|---|')
for (const [name, rs] of [['texas-ipo', ipo], ['texas-selffund', selffund], ['raise-climb', climb], ['buyback-founder', buyback]] as const)
  say(`| ${name} | ${pct(median(rs.map((r) => r.state.founderStake)))} | ${usd(median(rs.map((r) => r.actI)))} | ${usd(median(rs.map((r) => r.actII)))} | ${rs.filter((r) => Number.isNaN(r.actII) || r.actII === 0).length} |`)

const csv = ['bot,seed,founder_stake,act1_net_worth,act2_net_worth,texas,closed_rounds,offers']
for (const [name, rs] of [['texas-ipo', ipo], ['texas-selffund', selffund], ['raise-climb', climb], ['buyback-founder', buyback]] as const)
  for (const r of rs) csv.push([name, r.seed, r.state.founderStake.toFixed(4), Math.round(r.actI), Math.round(r.actII), hasTexas(r) ? 1 : 0, r.state.buyback?.closed.length ?? 0, r.state.buyback?.draws ?? 0].join(','))
writeFileSync(`${OUT}/capital-runs.csv`, csv.join('\n') + '\n')
writeFileSync(`${OUT}/capital-summary.txt`, lines.join('\n') + '\n')
say(`\n${((performance.now() - t0) / 1000).toFixed(1)} s for ${8 * SEEDS} runs`)
