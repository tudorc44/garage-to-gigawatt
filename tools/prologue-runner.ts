// The prologue's sim-runner (Alpha 0.3 §5): `npm run sim -- --prologue [--seeds 50] [--out sim-output]`.
// Plays each prologue bot for N seeds from 2009 through Act I and Act II (2026Q4), writes one CSV
// row per run, and prints the scope's §5 checks as PASS / MISS with their numbers. Also: the solo
// fade (a gaming GPU's chance of a block per quarter), the pre-order multiples by outcome, the
// interaction count, and 1,000 prologue-only runs for timing.
import { writeFileSync, mkdirSync } from 'node:fs'
import { CONTENT, quarterIndex } from '../src/content/index.ts'
import { playFrom, playPrologue } from '../src/sim/replay.ts'
import { schedulePrologueEvents } from '../src/sim/prologue/events.ts'
import { shipsQuarter } from '../src/sim/prologue/preorders.ts'
import { P, newPrologueGame, poolFee } from '../src/sim/prologue/setup.ts'
import { chapterReport } from '../src/sim/selectors.ts'
import type { GameState } from '../src/sim/state.ts'
import { getModel, marketWeek } from '../src/sim/systems/market.ts'
import {
  PROLOGUE_BOTS,
  PROLOGUE_SETTINGS,
  prologueBot,
} from './prologueBots.ts'

const args = process.argv.slice(2)
const argValue = (flag: string, fallback: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : fallback
}
const SEEDS = Number(argValue('--seeds', '50'))
const OUT = argValue('--out', 'sim-output')
const W = 13

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}
const usd = (n: number) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(n)
    : '—'
const x = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}×` : '—')

interface Run {
  bot: string
  seed: number
  /** Net worth at the end of 2016Q4 (the handover's start wealth). */
  prologueUsd: number
  btcMined: number
  lostExchangeBtc: number
  lostWalletBtc: number
  /** Share of the coin stack lost in the 2014 Mt Gox collapse. */
  goxShare: number
  walletLostBefore2016Q4: boolean
  planPhases: number
  cardsShown: number
  act1Usd: number
  act1Multiple: number
  act1Bust: boolean
  end: string
  endAct: number
  crashed: string | null
}

function playOne(bot: string, seed: number): Run {
  const strategy = PROLOGUE_BOTS[bot]
  const run: Run = {
    bot,
    seed,
    prologueUsd: NaN,
    btcMined: NaN,
    lostExchangeBtc: NaN,
    lostWalletBtc: NaN,
    goxShare: NaN,
    walletLostBefore2016Q4: false,
    planPhases: 0,
    cardsShown: 0,
    act1Usd: NaN,
    act1Multiple: NaN,
    act1Bust: false,
    end: '',
    endAct: 0,
    crashed: null,
  }
  try {
    const r0 = playPrologue(seed, strategy, { through: 0 }).state
    const p = r0.prologue!
    run.btcMined = p.mined.BTC
    run.lostExchangeBtc = p.lost.exchange.BTC
    run.lostWalletBtc = p.lost.wallet.BTC
    run.planPhases = p.reports.filter((r) => !r.auto).length
    run.cardsShown = p.cardsShown
    const collapseQ = quarterIndex(P().exchange.gox_collapse.quarter)!
    const before = p.reports.find(
      (r) => r.quarter === CONTENT.quarters[collapseQ - 1],
    )
    const goxLost = r0.log
      .filter((e) => e.key === 'log.p0_gox_collapse' && e.params?.coin === 'BTC')
      .reduce((n, e) => n + Number(e.params!.amount), 0)
    run.goxShare = before && before.treasury.BTC > 0 ? goxLost / before.treasury.BTC : 0
    run.walletLostBefore2016Q4 = r0.log.some(
      (e) =>
        e.key === 'log.p0_wallet_lost' &&
        e.quarter < quarterIndex('2016Q4')!,
    )
    if (r0.phase === 'gameover') {
      run.prologueUsd = 0
      run.end = `gameover@${CONTENT.quarters[r0.quarter]}`
      return run
    }
    const r1 = playFrom(r0, strategy, { through: 1 }).state
    run.prologueUsd = r1.prologueCarry?.startNetWorthUsd ?? NaN
    const ch = chapterReport(r1)
    run.act1Usd = ch.netWorthUsd
    run.act1Bust = ch.bust
    run.act1Multiple = run.prologueUsd > 0 ? ch.netWorthUsd / run.prologueUsd : NaN
    const r2: GameState =
      r1.phase === 'gameover' ? r1 : playFrom(r1, strategy, { through: 2 }).state
    run.end = `${r2.phase}@${CONTENT.quarters[r2.quarter]}`
    run.endAct = r2.act
  } catch (e) {
    run.crashed = e instanceof Error ? e.message : String(e)
  }
  return run
}

// ---------- analytic checks ----------

/** A gaming GPU's chance of finding at least one block solo in each quarter (scope §5 solo fade). */
function soloFade(): { quarter: string; chance: number }[] {
  const gpu = getModel('gpu_gaming_2010')!
  const act0 = CONTENT.acts.find((a) => a.act === 0)!
  const out: { quarter: string; chance: number }[] = []
  for (let q = act0.firstQuarter; q <= act0.lastQuarter; q++) {
    let lambda = 0
    for (let w = 0; w < W; w++) {
      const net = marketWeek(q, w).btc_hashrate_EHs * 1e6
      lambda += (gpu.hashrate / (gpu.hashrate + net)) * P().blocks_per_week
    }
    out.push({ quarter: CONTENT.quarters[q], chance: 1 - Math.exp(-lambda) })
  }
  return out
}

/**
 * What a pre-ordered unit is worth by the end of 2016 as a multiple of its price, if it arrives
 * `delay` quarters after the promised quarter: its pool earnings (free household power, the pool
 * fee), sold weekly ("usd") or held to 2016Q4's last price ("held"), plus its used price then.
 */
function preorderMultiple(vendorId: string, delay: number) {
  const v = P().preorders.vendors.find((x) => x.id === vendorId)!
  const m = getModel(v.model)!
  const earnsFrom = shipsQuarter() + delay + 1
  const last = CONTENT.acts.find((a) => a.act === 0)!.lastQuarter
  let usdSold = 0
  let btc = 0
  for (let q = earnsFrom; q <= last; q++)
    for (let w = 0; w < W; w++) {
      const wk = marketWeek(q, w)
      const net = wk.btc_hashrate_EHs * 1e6
      const perBlock = wk.btc_block_subsidy / Math.max(0.01, 1 - wk.btc_fee_share)
      const coins =
        (m.hashrate / (m.hashrate + net)) *
        P().blocks_per_week *
        perBlock *
        (1 - poolFee(q))
      btc += coins
      usdSold += coins * wk.btc_usd
    }
  const endPrice = marketWeek(last, W - 1).btc_usd
  return {
    sold: usdSold / v.price_usd,
    held: (btc * endPrice) / v.price_usd,
  }
}

function preorderTable(vendorId: string) {
  const v = P().preorders.vendors.find((x) => x.id === vendorId)!
  const at = (d: number) => preorderMultiple(vendorId, d)
  const avg = (ds: number[]) => ({
    sold: ds.reduce((n, d) => n + at(d).sold, 0) / ds.length,
    held: ds.reduce((n, d) => n + at(d).held, 0) / ds.length,
  })
  const range = (r: [number, number]) =>
    Array.from({ length: r[1] - r[0] + 1 }, (_, i) => r[0] + i)
  const onTime = at(0)
  const late = avg(range(v.moderate_quarters))
  const veryLate = avg(range(v.severe_quarters))
  const never = { sold: v.refund_share, held: v.refund_share }
  const o = v.odds
  const mean = (k: 'sold' | 'held') =>
    o.on_time * onTime[k] + o.moderate * late[k] + o.severe * veryLate[k] + o.never * never[k]
  return { onTime, late, veryLate, never, mean: { sold: mean('sold'), held: mean('held') } }
}

// ---------- run ----------

const started = performance.now()
mkdirSync(OUT, { recursive: true })
const runs: Run[] = []
for (const bot of Object.keys(PROLOGUE_BOTS))
  for (let seed = 1; seed <= SEEDS; seed++) runs.push(playOne(bot, seed))

const cols = Object.keys(runs[0]) as (keyof Run)[]
writeFileSync(
  `${OUT}/prologue-runs.csv`,
  [cols.join(','), ...runs.map((r) => cols.map((c) => String(r[c])).join(','))].join('\n') + '\n',
)

// 1,000 prologue-only runs (the §5 timing check).
const t0 = performance.now()
const quick = prologueBot(PROLOGUE_SETTINGS['careful-hodler'])
for (let seed = 1; seed <= 1000; seed++) playPrologue(seed, quick, { through: 0 })
const thousandMs = performance.now() - t0

const of = (bot: string) => runs.filter((r) => r.bot === bot && !r.crashed)
const lines: string[] = []
const check = (ok: boolean, name: string, detail: string) =>
  lines.push(`${ok ? 'PASS' : 'MISS'}  ${name}: ${detail}`)

lines.push(`Prologue sim: ${Object.keys(PROLOGUE_BOTS).length} bots × ${SEEDS} seeds, to 2026Q4`)
lines.push('')
lines.push('bot               prologue net worth (p10 / median / p90)   BTC mined (median)   Act I multiple (median)   ends')
for (const bot of Object.keys(PROLOGUE_BOTS)) {
  const rs = of(bot)
  const nw = rs.map((r) => r.prologueUsd)
  const ends = new Map<string, number>()
  for (const r of rs) ends.set(r.end.split('@')[0], (ends.get(r.end.split('@')[0]) ?? 0) + 1)
  lines.push(
    `${bot.padEnd(18)}${`${usd(pct(nw, 0.1))} / ${usd(median(nw))} / ${usd(pct(nw, 0.9))}`.padEnd(42)}${Math.round(median(rs.map((r) => r.btcMined))).toLocaleString('en-US').padEnd(21)}${x(median(rs.map((r) => r.act1Multiple))).padEnd(26)}${[...ends].map(([k, n]) => `${k} ×${n}`).join(', ')}`,
  )
}
lines.push('')

const crashed = runs.filter((r) => r.crashed)
check(crashed.length === 0, 'no crash or stuck state (prologue → Act I → Act II)', `${runs.length - crashed.length}/${runs.length} ran${crashed.length ? `; first crash: ${crashed[0].bot} seed ${crashed[0].seed}: ${crashed[0].crashed}` : ''}`)
const reached = runs.filter((r) => !r.crashed && r.end.endsWith('2026Q4'))
const busts = runs.filter((r) => r.end.startsWith('gameover'))
check(
  reached.length + busts.length === runs.length,
  'every prologue bot reaches 2026Q4 (or a game over) through Act I and Act II',
  `${reached.length} reached 2026Q4, ${busts.length} game over (${[...new Set(busts.map((r) => r.end))].join(', ')})`,
)
const normal = of('careful-hodler')
const plans = normal.map((r) => r.planPhases)
const cards = normal.map((r) => r.cardsShown)
check(
  Math.max(...plans) <= 13 && Math.max(...cards) <= 25,
  'pacing proxy: ≤ 13 Plan phases, ≤ 25 cards needing a choice',
  `Plan phases max ${Math.max(...plans)}; cards shown median ${median(cards)}, max ${Math.max(...cards)}`,
)
const sam = of('sell-as-mined').map((r) => r.prologueUsd)
check(
  median(sam) >= 10_000 && median(sam) <= 100_000,
  'sell-as-mined ends 2016Q4 with $10K–$100K',
  `median ${usd(median(sam))} (p10 ${usd(pct(sam, 0.1))}, p90 ${usd(pct(sam, 0.9))})`,
)
const gox = of('gox-hodler').map((r) => r.goxShare)
check(
  Math.min(...gox) >= 0.7,
  'gox-hodler loses ≥ 70% of its coin stack in 2014Q1',
  `lost median ${(median(gox) * 100).toFixed(0)}%, min ${(Math.min(...gox) * 100).toFixed(0)}%`,
)
const careful = normal.map((r) => r.prologueUsd)
check(
  median(careful) >= 1_000_000,
  'careful-hodler ≥ $1M net worth at 2016Q4 (paper)',
  `median ${usd(median(careful))}; p10 ${usd(pct(careful, 0.1))}; p90 ${usd(pct(careful, 0.9))}; max ${usd(Math.max(...careful))} (the Satoshi-scale tail: median ${Math.round(median(normal.map((r) => r.btcMined))).toLocaleString('en-US')} BTC mined)`,
)
const nb = of('no-backup')
const nbLost = nb.filter((r) => r.walletLostBefore2016Q4).length
// The roll alone over many seeds (a wallet with coins from 2009Q2 to 2016Q3, no backup).
let rolled = 0
for (let seed = 1; seed <= 5000; seed++) {
  const s = newPrologueGame(seed)
  s.treasury.BTC = 1
  s.phase = 'live'
  for (let q = quarterIndex('2009Q2')!; q < quarterIndex('2016Q4')!; q++) {
    s.quarter = q
    schedulePrologueEvents(s)
    if (s.prologue!.cardQueue.some((c) => c.id === 'dead_hard_drive')) {
      rolled++
      break
    }
  }
}
check(
  nbLost / nb.length >= 0.2,
  'no-backup loses its wallet before 2016Q4 in ≥ 20% of runs',
  `${nbLost}/${nb.length} (${((nbLost / nb.length) * 100).toFixed(0)}%); the roll alone over 5,000 seeds: ${((rolled / 5000) * 100).toFixed(1)}% (1 − (1 − ${P().wallet_loss.chance_per_quarter.value})^30 = ${((1 - (1 - P().wallet_loss.chance_per_quarter.value) ** 30) * 100).toFixed(1)}%)`,
)
const fade = soloFade()
const at = (q: string) => fade.find((f) => f.quarter === q)!.chance
const cross = fade.find((f) => f.quarter >= '2010Q4' && f.chance <= 0.5)
check(
  at('2010Q4') >= 0.9 && fade.filter((f) => f.quarter <= '2012Q2').some((f) => f.chance <= 0.5),
  'solo fades by itself (one gaming GPU: ≥ 90% a block in 2010Q4, ≤ 50% by 2012Q2)',
  `2010Q4 ${(at('2010Q4') * 100).toFixed(0)}%, 2011Q2 ${(at('2011Q2') * 100).toFixed(0)}%, 2012Q2 ${(at('2012Q2') * 100).toFixed(0)}%; crosses 50% in ${cross?.quarter ?? 'never'}`,
)
for (const vendor of P().preorders.vendors.map((v) => v.id)) {
  const t = preorderTable(vendor)
  check(
    t.onTime.sold >= 2.5 && t.late.sold < 1 && t.mean.sold >= 1.2 && t.mean.sold <= 1.8,
    `pre-order ${vendor} (value by 2016Q4 ÷ price, coins sold weekly)`,
    `on time ${x(t.onTime.sold)}, 2–3Q late ${x(t.late.sold)}, 4+Q late ${x(t.veryLate.sold)}, never ${x(t.never.sold)}; average ${x(t.mean.sold)} (held to 2016Q4: on time ${x(t.onTime.held)}, late ${x(t.late.held)}, average ${x(t.mean.held)})`,
  )
}
const pre = [...of('preorder-summit'), ...of('preorder-group')]
lines.push(
  `      pre-order bots ran: ${pre.length}; prologue net worth median ${usd(median(pre.map((r) => r.prologueUsd)))}`,
)
const allMult = runs
  .map((r) => r.act1Multiple)
  .filter((m) => Number.isFinite(m))
lines.push(
  `      Act I growth multiples (all prologue bots): p10 ${x(pct(allMult, 0.1))}, median ${x(median(allMult))}, p90 ${x(pct(allMult, 0.9))}`,
)
check(
  thousandMs < 120_000,
  '1,000 prologue runs in reasonable time (CSV out)',
  `${(thousandMs / 1000).toFixed(1)} s for 1,000 prologue-only runs; ${OUT}/prologue-runs.csv`,
)
lines.push('')
lines.push('Solo fade (one gaming GPU, chance of ≥ 1 block in the quarter):')
lines.push(
  fade
    .filter((f) => f.quarter >= '2010Q3' && f.quarter <= '2013Q2')
    .map((f) => `${f.quarter} ${(f.chance * 100).toFixed(0)}%`)
    .join(' · '),
)
lines.push('')
lines.push(`Done in ${((performance.now() - started) / 1000).toFixed(0)} s.`)
writeFileSync(`${OUT}/prologue-summary.txt`, lines.join('\n') + '\n')
console.log(lines.join('\n'))
