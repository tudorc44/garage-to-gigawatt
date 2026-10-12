// M63.1 (doc 43 §0.19 item 1): orbit's unit economics in Act V, `node tools/act5/orbitUnits.ts [--out file]`. For a 20 MW
// orbital shell of the newest generation opened in each quarter 2037Q1-2040Q4, per Act V future: its capex (the build when
// opened, the launch two quarters later at the dominant launcher's price, launch insurance at the mature rate on build +
// launch), its first full year's EBITDA (the best tenant offer's price for its term, then spot rent; less running cost and
// in-orbit insurance), payback in years, and lifetime EBITDA ÷ capex over its design life (5 years) and with the one-year
// extension (a year's in-orbit insurance as the refit). Everything through the game's own functions on the Orbital
// Landlord preset's company. Mine, reversible: market values after 2040Q4 hold at 2040Q4; a shell loses no capacity to
// failures (as the game treats shells); the block launches in the dawn-dusk shell the preset is licensed for.
import { writeFileSync } from 'node:fs'
import { CONTENT, V_FUTURE_IDS, actFirstQuarter, actLastQuarter } from '../../src/content/index.ts'
import { ORBIT } from '../../src/content/orbitContent.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import type { VFutureId } from '../../src/content/schemas.ts'
import { toAct5, type GameState, type OrbitalBlock } from '../../src/sim/state.ts'
import { availableGenerations, openOrbitalBlock, orbitRow } from '../../src/sim/systems/orbit.ts'
import { buildCostUsd, launchPriceUsdKg, LIVE_AFTER_LAUNCH } from '../../src/sim/systems/orbitLaunch.ts'
import { playAct5Recipe } from './presetRun.ts'

const SAT = ORBIT.satellites
const args = process.argv.slice(2)
const OUT = args.includes('--out') ? args[args.indexOf('--out') + 1] : null
const LAUNCH_LEAD = 2
const first5 = actFirstQuarter(5)
const last5 = actLastQuarter(5)

const p = PRESETS_V.find((x) => x.id === 'orbital_landlord')!
const base = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never })
const shell = (base.act4Orbit?.blocks ?? []).find((b) => b.stage === 'live')?.shell ?? 'sso'

/** The state at a quarter (market rows held at 2040Q4 after it). */
const at = (s: GameState, q: number): GameState => ({ ...s, quarter: Math.min(q, last5) })

export interface UnitRow {
  future: VFutureId
  quarter: string
  capexUsd: number
  ebitdaYrUsd: number
  paybackYears: number
  lifeRatio: number
  extendedRatio: number
}

export function orbitUnit(v: VFutureId, q: number): UnitRow {
  const s = toAct5(structuredClone(base), { vfuture: v, act5Seed: 1 })
  s.quarter = q
  const gen = availableGenerations(s).at(-1)!
  const b: OrbitalBlock = openOrbitalBlock(s, { kind: 'shell', mw: 20, shell, gen })
  const buildUsd = buildCostUsd(s, b)
  const launchQ = q + LAUNCH_LEAD
  const launchUsd = b.massT * 1000 * launchPriceUsdKg(at(s, launchQ), 'pallas', shell)
  const capexNoIns = buildUsd + launchUsd
  const insUsd = (capexNoIns * orbitRow(at(s, launchQ)).insurance_rate_mature_pct) / 100
  const capexUsd = capexNoIns + insUsd
  const offer = [...b.offers].sort((x, y) => y.price - x.price)[0]
  const live = launchQ + LIVE_AFTER_LAUNCH
  const quarters = Math.round(SAT.design_life_years * 4)
  const ebitdaQ = (k: number): number => {
    const st = at(s, live + k)
    const row = orbitRow(st)
    const contracted = offer && k < offer.termQuarters
    const yearly = contracted ? offer.price * b.mw : row.orbital_shell_rent_usd_mw_yr * SAT.spot_shell_rent_share * b.mw
    const insQ = (capexNoIns * row.insurance_rate_inorbit_pct) / 100 / 4
    return yearly / 4 - (SAT.ops_usd_mw_yr * b.mw) / 4 - insQ
  }
  const life = Array.from({ length: quarters }, (_, k) => ebitdaQ(k)).reduce((a, x) => a + x, 0)
  const refitUsd = (capexNoIns * orbitRow(at(s, live + quarters)).insurance_rate_inorbit_pct) / 100
  const extra = Array.from({ length: 4 }, (_, k) => ebitdaQ(quarters + k)).reduce((a, x) => a + x, 0) - refitUsd
  const yr1 = [0, 1, 2, 3].map(ebitdaQ).reduce((a, x) => a + x, 0)
  return {
    future: v,
    quarter: CONTENT.quarters[q],
    capexUsd,
    ebitdaYrUsd: yr1,
    paybackYears: yr1 > 0 ? capexUsd / yr1 : Infinity,
    lifeRatio: life / capexUsd,
    extendedRatio: (life + extra) / capexUsd,
  }
}

const M = (x: number) => `${(x / 1e6).toFixed(0)}`
const lines: string[] = ['future,quarter,capex_usd_m,ebitda_yr_usd_m,payback_years,life_ebitda_over_capex,with_extension']
const say: string[] = []
for (const v of V_FUTURE_IDS) {
  say.push(`${v}: quarter  capex $M  EBITDA/yr $M  payback y  life ÷ capex  +1 yr`)
  for (let q = CONTENT.quarters.indexOf('2037Q1'); q <= last5; q++) {
    if (q < first5) continue
    const r = orbitUnit(v, q)
    lines.push([r.future, r.quarter, M(r.capexUsd), M(r.ebitdaYrUsd), r.paybackYears.toFixed(1), r.lifeRatio.toFixed(2), r.extendedRatio.toFixed(2)].join(','))
    say.push(`    ${r.quarter}  ${M(r.capexUsd).padStart(8)}  ${M(r.ebitdaYrUsd).padStart(11)}  ${r.paybackYears.toFixed(1).padStart(9)}  ${r.lifeRatio.toFixed(2).padStart(12)}  ${r.extendedRatio.toFixed(2).padStart(5)}`)
  }
}
console.log(say.join('\n'))
if (OUT) writeFileSync(OUT, lines.join('\n') + '\n')
