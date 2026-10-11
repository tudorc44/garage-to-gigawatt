// M54 (doc 43 §0.12, the overnight STEP 7 (d)): E-B2 for the accelerator venture, reported, not tuned. Each Act IV
// preset × future × seed plays the Balanced archetype three ways, as tools/act4/energyRunner.ts does: venture-free, with
// the control venture (a 20% stake, a 50% offtake when it can, joined in 2031Q1), and with a 20% stake in Halyard Silicon
// joined in 2032Q1 (calls paid while the cash guard allows, else diluted; a buyer at a gain taken). The contribution is
// the founder's net worth less the venture-free run's, at 2035Q4 (E-B2's horizon in the energy runner) and at 2040Q4
// (V-B6's: each company played on passively through Act V on the future its seed draws).
// `node tools/act5/chipsEb2.ts [--seeds N]`.
import { FUTURE_IDS } from '../../src/content/index.ts'
import { PRESETS_IV } from '../../src/content/presetsAct4.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playFrom, type Strategy } from '../../src/sim/replay.ts'
import { toAct4, toAct5, type GameState } from '../../src/sim/state.ts'
import { acceleratorBuyInUsd } from '../../src/sim/systems/accelerator.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { buyInUsd, prepayUsd, ventureRegions } from '../../src/sim/systems/ventures.ts'
import { act4Archetypes } from '../act4/bots.ts'
import { presetLine2030 } from './presetRun.ts'

const args = process.argv.slice(2)
const SEEDS = Number(args[args.indexOf('--seeds') + 1] ?? 10) || 10
type Variant = 'none' | 'control' | 'accelerator'
const VARIANTS: Variant[] = ['none', 'control', 'accelerator']

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
function variantStep(s: GameState, v: Variant): Action[] {
  const out: Action[] = []
  if (v === 'control') {
    if (!(s.ventures ?? []).some((x) => x.type === 'control')) {
      const regions = ventureRegions('control')
      const campus = s.sites
        .filter((x) => x.tier !== 'garage' && (regions === 'any' || regions.includes(regionOf(x) ?? '')))
        .sort((a, b) => poweredKw(b, s.quarter) - poweredKw(a, s.quarter))[0]?.id
      for (const t of [...(campus ? [{ stake: 0.2, offtake: 0.5, siteId: campus }] : []), { stake: 0.2, offtake: 0 }]) {
        const cost = buyInUsd(s, { type: 'control', stake: t.stake }) + prepayUsd({ type: 'control', offtake: t.offtake, prepay: 0 })
        if (guardOk(s, cost)) out.push({ type: 'VENTURE_JOIN', venture: 'control', prepay: 0, ...t })
      }
    }
    for (const x of s.ventures ?? [])
      if (x.call) out.push({ type: 'VENTURE_CALL', ventureId: x.id, choice: guardOk(s, x.call.dueUsd) ? 'pay' : 'dilute' })
  }
  if (v === 'accelerator') {
    if (!s.accelerator && guardOk(s, acceleratorBuyInUsd(0.2))) out.push({ type: 'ACCEL_JOIN', stake: 0.2 })
    const a = s.accelerator
    if (a?.call) out.push({ type: 'ACCEL_CALL', choice: guardOk(s, a.call.dueUsd) ? 'pay' : 'dilute' })
  }
  return out
}

const rows: { preset: string; future: string; seed: number; v: Variant; nw35: number; nw40: number; ended: string }[] = []
const t0 = performance.now()
for (const p of PRESETS_IV) {
  const balanced = act4Archetypes(p.bot).balanced
  for (const future of FUTURE_IDS)
    for (const v of VARIANTS)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const start = toAct4(presetLine2030(p.id), { future, act4Seed: seed })
        start.lunarGrade = 'rich'
        const bot: Strategy = {
          plan: (s) => {
            const base = tryAll(s, balanced.plan(s))
            return [...base.kept, ...tryAll(base.after, variantStep(base.after, v)).kept]
          },
        }
        const end4 = playFrom(start, bot, { through: 4 }).state
        const nw = (s: GameState) => Math.max(0, s.founderStake * (s.reports.at(-1)?.valuationUsd ?? 0))
        let nw40 = 0
        if (end4.phase === 'chapter') {
          // Act V passively (the accelerator's calls take their default, dilute)
          const end5 = playFrom(toAct5(end4, { act5Seed: seed }), { plan: () => [] }, { through: 5 }).state
          nw40 = nw(end5)
        }
        rows.push({ preset: p.id, future, seed, v, nw35: nw(end4), nw40, ended: end4.accelerator?.ended ?? (end4.accelerator ? 'running' : '') })
      }
  console.log(`  ${p.id}: done (${Math.round((performance.now() - t0) / 1000)} s)`)
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const m$ = (n: number) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n) / 1e6)}M`
const contrib = (v: Variant, key: 'nw35' | 'nw40') =>
  rows
    .filter((r) => r.v === v)
    .map((r) => r[key] - rows.find((n) => n.v === 'none' && n.preset === r.preset && n.future === r.future && n.seed === r.seed)![key])
for (const key of ['nw35', 'nw40'] as const) {
  const c = contrib('control', key)
  const a = contrib('accelerator', key)
  const cm = mean(c)
  const am = mean(a)
  const cb = Math.max(...c)
  const ab = Math.max(...a)
  console.log(
    `E-B2 (accelerator) at ${key === 'nw35' ? '2035Q4' : '2040Q4'}: control mean ${m$(cm)}, best ${m$(cb)}; accelerator mean ${m$(am)}, best ${m$(ab)}; ` +
      `mean ÷ control ${cm !== 0 ? (am / cm).toFixed(2) : 'n/a'} (target ≤ 1.5), best ÷ control best ${cb !== 0 ? (ab / cb).toFixed(2) : 'n/a'} (target ≥ 3)`,
  )
}
const outcomes = rows.filter((r) => r.v === 'accelerator').reduce<Record<string, number>>((o, r) => ({ ...o, [r.ended || 'not joined']: (o[r.ended || 'not joined'] ?? 0) + 1 }), {})
console.log(`accelerator runs by 2035Q4: ${JSON.stringify(outcomes)} (${rows.filter((r) => r.v === 'accelerator').length} runs)`)
