// M55 (doc 43 §0.14 item 5): the accelerator diagnosis, reported, not tuned. ≥ 200 independent draws of the venture
// (`accelSeed`, decoupled from the game's seed) on one company: the Fortress line, Act IV future f1, act4Seed 1, played by
// the Balanced archetype, joining Halyard with a 20% stake (10% if 20% doesn't clear the cash guard) at its first chance in
// 2032Q1 and paying calls while the guard allows (else diluting), then on through Act V (calls answered the same way; Act
// V's future from the draw's number). Per outcome: the stake's 2040 value (plus any sale proceeds) against buy-in plus
// calls; the call behaviour (calls paid and diluted, the stake left); for the best built case, units, EBITDA share,
// multiple and quarters since volume. The sanity target (DT ⚙): a built outcome with every call paid returns ≥ 3× buy-in
// plus calls by 2040. `node tools/act5/chipsDiagnosis.ts [--draws N]`.
import { CONTENT, V_FUTURE_IDS, act5Row } from '../../src/content/index.ts'
import { ACCELERATOR } from '../../src/content/acceleratorContent.ts'
import { PRESETS_IV } from '../../src/content/presetsAct4.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom, type Strategy } from '../../src/sim/replay.ts'
import { toAct4, toAct5, type GameState } from '../../src/sim/state.ts'
import {
  acceleratorBuyInUsd,
  acceleratorDraws,
  acceleratorEbitdaUsd,
  acceleratorFate,
  acceleratorStakeValueUsd,
} from '../../src/sim/systems/accelerator.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { act4Archetypes } from '../act4/bots.ts'
import { presetLine2030 } from './presetRun.ts'

const args = process.argv.slice(2)
const DRAWS = Number(args[args.indexOf('--draws') + 1] ?? 200) || 200

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
function guardOk(s: GameState, spendUsd: number): boolean {
  const r = s.reports.at(-1)
  const fixedQ = r ? r.salariesUsd + r.rentUsd + r.interestUsd + r.principalUsd : 0
  return s.cash - spendUsd >= 2 * fixedQ
}
function accelStep(s: GameState): Action[] {
  const out: Action[] = []
  if (!s.accelerator)
    for (const stake of [0.2, 0.1])
      if (guardOk(s, acceleratorBuyInUsd(stake))) {
        out.push({ type: 'ACCEL_JOIN', stake })
        break
      }
  const c = s.accelerator?.call
  if (c) out.push({ type: 'ACCEL_CALL', choice: guardOk(s, c.dueUsd) ? 'pay' : 'dilute' })
  return out
}

interface Row {
  draw: number
  outcome: string
  stakeAtJoin: number
  stakeLeft: number
  paidUsd: number
  valueUsd: number
  multiple: number
  callsPaid: number
  callsDiluted: number
  volumeQ: string | null
  units: number
  ebitdaShare: number
  chipMult: number
  qSinceVolume: number | null
  ebitdaQUsd: number
  vFuture: string
  capped: boolean
}

const base = presetLine2030('fortress')
const balanced = act4Archetypes(PRESETS_IV.find((p) => p.id === 'fortress')!.bot).balanced
const rows: Row[] = []
const t0 = performance.now()
for (let draw = 1; draw <= DRAWS; draw++) {
  const start = toAct4(structuredClone(base), { future: 'f1', act4Seed: 1 })
  start.lunarGrade = 'rich'
  start.accelSeed = 10_000 + draw
  let paid = 0
  let diluted = 0
  const count = (kept: Action[]) => {
    for (const x of kept)
      if (x.type === 'ACCEL_CALL') {
        if (x.choice === 'pay') paid++
        else diluted++
      }
  }
  const bot: Strategy = {
    plan: (s) => {
      const b = tryAll(s, balanced.plan(s))
      const a = tryAll(b.after, accelStep(b.after))
      count(a.kept)
      return [...b.kept, ...a.kept]
    },
  }
  let s = playFrom(start, bot, { through: 4 }).state
  if (s.phase === 'chapter') {
    const v5 = V_FUTURE_IDS[draw % 4]
    const keep = s.accelSeed
    s = toAct5(s, { vfuture: v5 })
    s.accelSeed = keep
    const act5Bot: Strategy = {
      plan: (st) => {
        const a = tryAll(st, accelStep(st))
        count(a.kept)
        return a.kept
      },
    }
    s = playFrom(s, act5Bot, { through: 5 }).state
  }
  const a = s.accelerator
  const d = acceleratorDraws(s)
  const fate = acceleratorFate(s, s.quarter + 1)
  const outcome = a?.ended ?? (fate.volume ? 'built' : a ? (s.phase === 'gameover' ? 'company bust' : 'still building') : 'not joined')
  const value = (a ? acceleratorStakeValueUsd(s) : 0) + (a?.proceedsUsd ?? 0)
  const since = s.quarter >= d.vol ? s.quarter - d.vol : null
  const row = act5Row(s.quarter, scenarioOf(s))
  const shares = ACCELERATOR.after_volume.ebitda_share_of_price_by_year_since_volume
  rows.push({
    draw,
    outcome,
    stakeAtJoin: a?.stakeAtJoin ?? 0,
    stakeLeft: a?.stake ?? 0,
    paidUsd: a?.paidUsd ?? 0,
    valueUsd: value,
    multiple: a?.paidUsd ? value / a.paidUsd : 0,
    callsPaid: paid,
    callsDiluted: diluted,
    volumeQ: fate.volume ? CONTENT.quarters[d.vol] : null,
    units: row?.accel_units_full_ramp_q ?? 0,
    ebitdaShare: since === null ? 0 : shares[Math.min(Math.floor(since / 4), shares.length - 1)],
    chipMult: row?.chip_ev_ebitda_mult ?? 0,
    qSinceVolume: since,
    ebitdaQUsd: since === null ? 0 : acceleratorEbitdaUsd(s),
    vFuture: s.vFutureId ?? '-',
    capped: d.foundryCapped,
  })
  if (draw % 25 === 0) console.log(`  ${draw} draws (${Math.round((performance.now() - t0) / 1000)} s)`)
}

const m$ = (n: number) => `$${(n / 1e6).toFixed(1)}M`
const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN
}
const by: Record<string, Row[]> = {}
for (const r of rows) (by[r.outcome] ??= []).push(r)
console.log(`\nAccelerator diagnosis: ${rows.length} independent draws (Fortress, f1, act4Seed 1; a 20% stake, 10% if 20% fails the guard)`)
for (const [o, rs] of Object.entries(by))
  console.log(
    `  ${o.padEnd(15)} ${String(rs.length).padStart(3)} draws · 2040 value ${m$(med(rs.map((r) => r.valueUsd)))} median vs paid-in ${m$(med(rs.map((r) => r.paidUsd)))} · multiple median ${med(rs.map((r) => r.multiple)).toFixed(2)}× (min ${Math.min(...rs.map((r) => r.multiple)).toFixed(2)}, max ${Math.max(...rs.map((r) => r.multiple)).toFixed(2)}) · calls paid ${rs.reduce((a, r) => a + r.callsPaid, 0)}, diluted ${rs.reduce((a, r) => a + r.callsDiluted, 0)} · stake left median ${(med(rs.map((r) => r.stakeLeft)) * 100).toFixed(1)}% of ${(med(rs.map((r) => r.stakeAtJoin)) * 100).toFixed(0)}%`,
  )
const built = by.built ?? []
const allPaid = built.filter((r) => r.callsDiluted === 0)
const best = [...built].sort((a, b) => b.valueUsd - a.valueUsd)[0]
if (best)
  console.log(
    `  best built: draw ${best.draw}, volume ${best.volumeQ}, ${best.qSinceVolume} quarters since volume at the end; units ${best.units}/q at full ramp; EBITDA share ${best.ebitdaShare}; multiple ${best.chipMult}×; quarter EBITDA ${m$(best.ebitdaQUsd)}; stake ${(best.stakeLeft * 100).toFixed(1)}%; value ${m$(best.valueUsd)} vs paid-in ${m$(best.paidUsd)} (${best.multiple.toFixed(2)}×)`,
  )
for (const r of allPaid.filter((x) => x.multiple < 3))
  console.log(
    `  under 3×: draw ${r.draw} (Act V future ${r.vFuture}${r.capped ? ', foundry-rationed' : ''}), volume ${r.volumeQ}, ${r.qSinceVolume} q since; units ${r.units}/q, EBITDA share ${r.ebitdaShare}, multiple ${r.chipMult}×, quarter EBITDA ${m$(r.ebitdaQUsd)}: ${r.multiple.toFixed(2)}×`,
  )
const pass = allPaid.filter((r) => r.multiple >= 3).length
console.log(
  `  sanity target (built, every call paid, ≥ 3× buy-in plus calls by 2040): ${pass}/${allPaid.length} pass; multiples median ${med(allPaid.map((r) => r.multiple)).toFixed(2)}×, by quarters since volume: ${allPaid
    .sort((a, b) => (a.qSinceVolume ?? 0) - (b.qSinceVolume ?? 0))
    .map((r) => `${r.qSinceVolume}q ${r.multiple.toFixed(1)}×`)
    .join(', ')}`,
)
