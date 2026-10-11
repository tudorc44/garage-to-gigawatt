// M49 (doc 43 §3.4, §0.8 and §0.9 item 11): Act V's three presets. Each is a real company: an Act IV preset's line
// played through Act IV on a fixed future and seed by the Balanced archetype with a recipe's ventures or battery
// (presetRun.ts), to its 2035Q4 chapter. The scan takes the first company, in a fixed order (Act IV preset lines, then
// futures f1-f4, then seeds 1-8, then the recipe list), that fits each preset's description. The values are whatever the
// sim made: nothing is targeted. Each preset carries its Act IV future (§0.9 item 11), so Act IV's rival fates (Orrery
// only after F1 or F3) follow it.
// `npm run content:act5-presets` writes presets_act5.json into docs/act5-content/ and src/content/ (byte-identical).
import { writeFileSync } from 'node:fs'
import { FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import type { Act4PresetId } from '../../src/content/presetsAct4.ts'
import type { GameState } from '../../src/sim/state.ts'
import { buildAct5Entry } from '../../src/sim/systems/act5Entry.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { aiEbitdaUsd, aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { poweredKw } from '../../src/sim/systems/sites.ts'
import { playAct5Recipe, type Act5PresetJoins, type Act5PresetRecipe } from './presetRun.ts'

const ROOT = new URL('../../', import.meta.url)
type Id = 'firm_builder' | 'orbital_landlord' | 'small_grid'
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

/** A 2035Q4 company, measured for the descriptions (the act5Entry includes free MW × the 2036 powered price). */
function profile(s: GameState) {
  const e = buildAct5Entry(s, 'v1') // (the 2036Q1 powered price is the common baseline: any future gives the same)
  const r = s.reports.at(-1)!
  const ai = Math.max(0, aiEbitdaUsd(r)) * 4 * aiInfraMultiple(s.quarter, scenarioOf(s))
  const orbit = Math.max(0, r.orbitEbitdaUsd ?? 0) * 4 * (r.orbitMultiple ?? 0)
  const first5 = actFirstQuarter(5)
  const firstLiveRetire = Math.min(
    ...(s.act4Orbit?.blocks ?? []).filter((b) => b.retireQuarter !== null && b.stage === 'live').map((b) => b.retireQuarter!),
  )
  const offtakeSwitchingOn = (s.ventures ?? []).some(
    (v) => v.offtakeMw > 0 && v.stage !== 'operating' && v.stage !== 'cancelled' && v.stage !== 'folded' && v.codQuarter >= first5 && v.codQuarter <= first5 + 11,
  )
  const poweredSites = s.sites.filter((x) => x.tier !== 'garage' && poweredKw(x, s.quarter) > 0).length
  const battery = s.sites.some((x) => (x.energy ?? []).some((a) => a.kind === 'bess'))
  return {
    e,
    chapter: s.phase === 'chapter',
    groundShare: e.valuationUsd > 0 ? ai / e.valuationUsd : 0,
    orbitShare: e.valuationUsd > 0 ? orbit / e.valuationUsd : 0,
    firstLiveRetire,
    offtakeSwitchingOn,
    poweredSites,
    battery,
  }
}
type Profile = ReturnType<typeof profile>

/** Doc 43 §3.4's descriptions (with §0.8: the Firm Builder from the Fortress line, leases ≥ 40% of act5Entry). */
const PRESETS: Record<Id, { lines: Act4PresetId[]; joins: Act5PresetJoins[]; fits: (p: Profile) => boolean }> = {
  // a ground landlord with offtake from a venture that reaches first power in 2036-38, little orbit
  firm_builder: {
    lines: ['fortress'],
    joins: [['smr'], ['egs', 'smr'], ['adv_fission']],
    fits: (p) => p.chapter && p.groundShare >= 0.4 && p.offtakeSwitchingOn && p.orbitShare < 0.25,
  },
  // an orbit-heavy company whose first blocks retire in 2036-37
  orbital_landlord: {
    lines: ['fortress', 'neocloud', 'ridge'],
    joins: [[]],
    fits: (p) => p.chapter && p.orbitShare >= 0.25 && p.firstLiveRetire >= actFirstQuarter(5) && p.firstLiveRetire <= actFirstQuarter(5) + 7,
  },
  // a small survivor with one site and a battery: the cheap seat (no queue position exists before Act V's queue, M49)
  small_grid: {
    lines: ['ridge', 'fortress'],
    joins: ['btm'],
    fits: (p) => p.chapter && p.poweredSites === 1 && p.battery && p.e.valuationUsd < 2e9,
  },
}

const found: Record<string, unknown>[] = []
for (const id of Object.keys(PRESETS) as Id[]) {
  const d = PRESETS[id]
  let hit: (Act5PresetRecipe & { p: Profile }) | null = null
  scan: for (const line of d.lines)
    for (const future of FUTURE_IDS)
      for (const seed of SEEDS)
        for (const joins of d.joins) {
          const r: Act5PresetRecipe = { act4_preset: line, act4_future: future, act4_seed: seed, joins }
          const p = profile(playAct5Recipe(r))
          if (d.fits(p)) {
            hit = { ...r, p }
            break scan
          }
        }
  if (!hit) {
    console.log(`${id}: no company in the scan fits (reported, not targeted)`)
    continue
  }
  const e = hit.p.e
  const m = (x: number) => Math.round(x / 1e5) / 10
  console.log(`${id}: ${hit.act4_preset} ${hit.act4_future} seed ${hit.act4_seed} ${JSON.stringify(hit.joins)}`)
  found.push({
    id,
    act4_preset: hit.act4_preset,
    act4_future: hit.act4_future,
    act4_seed: hit.act4_seed,
    joins: hit.joins,
    valuation_usd_m: m(e.valuationUsd),
    founder_net_worth_usd_m: m(e.founderNetWorthUsd),
    cash_usd_m: m(e.cashUsd),
    debt_usd_m: m(e.debtUsd),
    energized_mw: Math.round(e.energizedMw * 10) / 10,
    free_mw: Math.round(e.freeMw * 10) / 10,
    ground_share: Math.round(hit.p.groundShare * 100) / 100,
    orbit_share: Math.round(hit.p.orbitShare * 100) / 100,
    rating: e.creditRating,
  })
}

const file = {
  _meta: {
    schema: 'presets_act5/1',
    doc43: '§3.4 (three 2035Q4 companies, bot-made; values set by the sim), §0.8 (the Firm Builder from the Fortress line), §0.9 item 11 (each carries its Act IV future)',
    note: "Written by npm run content:act5-presets (tools/act5/presets.ts): the first company in the scan order (Act IV preset lines × futures f1-f4 × seeds 1-8 × the recipe list) that fits each description. Figures are that company's at 2035Q4, with free MW at the 2036 powered price.",
  },
  presets: found,
}
const text = JSON.stringify(file, null, 1) + '\n'
for (const dir of ['docs/act5-content/', 'src/content/']) writeFileSync(new URL(`${dir}presets_act5.json`, ROOT), text)
console.log(`presets_act5.json: ${found.length} presets`)
