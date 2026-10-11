// Act V's presets (M49; rescanned in M50 per doc 43 §0.13, which amends §3.4). Each is a real company: an Act IV preset's
// line played through Act IV on a fixed future and seed by the Balanced archetype with a recipe's ventures, battery or
// grid request (presetRun.ts), to its 2035Q4 chapter. The scan takes the first company, in a fixed order, that fits each
// description. Choosing recipes is allowed; choosing values isn't: the values are whatever the sim made. Each preset
// carries its Act IV future (§0.9 item 11), so Act IV's rival fates (Orrery only after F1 or F3) follow it.
// `npm run content:act5-presets` writes presets_v.json into docs/act5-content/ and src/content/ (byte-identical), and
// reports V-B7 (the Firm Builder, played passively through Act V, never goes bust).
import { writeFileSync } from 'node:fs'
import { FUTURE_IDS, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import type { VentureType } from '../../src/content/energyContent.ts'
import type { Act4PresetId } from '../../src/content/presetsAct4.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { buildAct5Entry } from '../../src/sim/systems/act5Entry.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { ventureRegions } from '../../src/sim/systems/ventures.ts'
import { leasesOf } from '../act5-gate/gate-b.ts'
import { playAct5Recipe, type Act5PresetRecipe } from './presetRun.ts'

const ROOT = new URL('../../', import.meta.url)
type Id = 'firm_builder' | 'orbital_landlord'
const first5 = actFirstQuarter(5)
const Q = (label: string) => first5 - 4 + ['2035Q1', '2035Q2', '2035Q3', '2035Q4'].indexOf(label)
const FIRST_POWER_FROM = Q('2035Q1')
const FIRST_POWER_TO = first5 + 11 // 2038Q4

/** A 2035Q4 company, measured for the descriptions (act5Entry includes free MW × the 2036 powered price). */
function profile(s: GameState) {
  const e = buildAct5Entry(s, 'v1') // (the 2036Q1 powered price is the common baseline: any future gives the same)
  const r = s.reports.at(-1)!
  const aiMult = aiInfraMultiple(s.quarter, scenarioOf(s))
  // The gate's definition (M43.0c-e): the live leases' margin × 4 × the AI multiple, over act5Entry.
  const orbitMark = Math.max(0, r.orbitEbitdaUsd ?? 0) * 4 * (r.orbitMultiple ?? 0)
  // (M60.1, doc 43 §0.16 item 1: the stored figures are on act5Entry's footing, orbital blocks on their remaining life;
  // the scan still chooses on Act IV's 2035Q4 marks, so the same two companies stay the presets: mine, reversible)
  const orbit = orbitMark + (e.orbitRevaluedUsd ?? 0)
  const markUsd = e.valuationUsd - (e.orbitRevaluedUsd ?? 0)
  const leasesUsd = leasesOf(s).reduce((a, l) => a + l.marginNowQ * 4 * aiMult, 0)
  const firstLiveRetire = Math.min(
    ...(s.act4Orbit?.blocks ?? []).filter((b) => b.retireQuarter !== null && b.stage === 'live').map((b) => b.retireQuarter!),
  )
  // §0.13: a plant stake whose first power falls in 2035Q1-2038Q4 (one that has just switched on counts); offtake if the
  // line has a site the class may deliver to.
  const campusRegions = new Set(s.sites.filter((x) => x.tier !== 'garage').map((x) => regionOf(x)))
  const plantInWindow = (s.ventures ?? []).some((v) => {
    if (v.stake <= 0 || v.stage === 'cancelled' || v.stage === 'folded') return false
    const inWindow = v.codQuarter >= FIRST_POWER_FROM && v.codQuarter <= FIRST_POWER_TO
    const regions = ventureRegions(v.type)
    const lineHasCampus = regions === 'any' || regions.some((g) => campusRegions.has(g as never))
    return inWindow && (!lineHasCampus || v.offtakeMw > 0)
  })
  const poweredSites = s.sites.filter((x) => x.tier !== 'garage' && poweredKw(x, s.quarter) > 0).length
  const queuePosition = s.sites.some((x) => (x.powerAdds ?? []).some((a) => a.source === 'grid' && (a.readyQuarter === null || a.readyQuarter > s.quarter)))
  return {
    e,
    chapter: s.phase === 'chapter',
    leaseShare: e.valuationUsd > 0 ? leasesUsd / e.valuationUsd : 0,
    orbitShare: e.valuationUsd > 0 ? orbit / e.valuationUsd : 0,
    scanLeaseShare: markUsd > 0 ? leasesUsd / markUsd : 0,
    scanOrbitShare: markUsd > 0 ? orbitMark / markUsd : 0,
    firstLiveRetire,
    plantInWindow,
    poweredSites,
    queuePosition,
  }
}
type Profile = ReturnType<typeof profile>

const SEEDS_GATE = Array.from({ length: 30 }, (_, i) => i + 1)
const SEEDS_LATE = [1, 2, 3, 4, 5, 6, 7, 8]
const recipes = (
  lines: Act4PresetId[],
  seeds: number[],
  joins: Act5PresetRecipe['joins'][],
  extra: Partial<Act5PresetRecipe> = {},
): Act5PresetRecipe[] =>
  lines.flatMap((l) =>
    FUTURE_IDS.flatMap((f) => seeds.flatMap((seed) => joins.map((j) => ({ act4_preset: l, act4_future: f, act4_seed: seed, joins: j, ...extra })))),
  )
// M43.0d/e's Firm Builder runs: the Fortress line × futures × seeds 1-30 × the gate's starts (one firm class each, then
// EGS + SMR), in the gate's order; then one venture joined later (2032Q1, then 2033Q1), so first power lands in Act V.
const GATE_STARTS: VentureType[][] = [['egs'], ['egs2'], ['smr'], ['adv_fission'], ['pumped'], ['egs', 'smr']]
const LATE: VentureType[][] = [['smr'], ['egs'], ['egs2'], ['adv_fission']]

/** Doc 43 §3.4 as amended by §0.13 (and §0.8: the Firm Builder from the Fortress line). */
/** The descriptions shown on "Start at Act V" (doc 43 §0.17 item 2: reworded; the companies are unchanged). */
const DESCRIPTION: Record<Id, string> = {
  firm_builder: 'a ground landlord whose first geothermal plant has just switched on',
  orbital_landlord: 'a ground-and-orbit company whose five orbital blocks all reach end of life inside the act: replacing them is its game',
}

const PRESETS: Record<Id, { scan: Act5PresetRecipe[]; fits: (p: Profile) => boolean }> = {
  // a ground landlord: leases ≥ 40% of value, a plant stake switching on in 2035Q1-2038Q4, offtake if the line has one,
  // little orbit
  firm_builder: {
    scan: [
      ...recipes(['fortress'], SEEDS_GATE, GATE_STARTS),
      ...recipes(['fortress'], SEEDS_LATE, LATE, { join_from: '2032Q1' }),
      ...recipes(['fortress'], SEEDS_LATE, LATE, { join_from: '2033Q1' }),
    ],
    fits: (p) => p.chapter && p.scanLeaseShare >= 0.4 && p.plantInWindow && p.scanOrbitShare < 0.25,
  },
  // an orbit-heavy company whose first blocks retire in 2036-37
  orbital_landlord: {
    scan: recipes(['fortress', 'neocloud', 'ridge'], SEEDS_LATE, [[]]),
    fits: (p) => p.chapter && p.scanOrbitShare >= 0.25 && p.firstLiveRetire >= first5 && p.firstLiveRetire <= first5 + 7,
  },
  // (Small Grid is cut: doc 43 §0.14 item 1, two presets ship)
}

/** V-B7: the company, played passively through Act V on every future (act5 seeds 1-3), never goes bust. */
function neverBust(end: GameState): { runs: number; busts: number } {
  let runs = 0
  let busts = 0
  for (const v of V_FUTURE_IDS)
    for (const seed of [1, 2, 3]) {
      const s = playFrom(toAct5(structuredClone(end), { vfuture: v, act5Seed: seed }), { plan: () => [] }, { through: 5 }).state
      runs++
      if (s.phase === 'gameover') busts++
    }
  return { runs, busts }
}

const found: Record<string, unknown>[] = []
const lines: string[] = []
const say = (l: string) => {
  lines.push(l)
  console.log(l)
}
for (const id of Object.keys(PRESETS) as Id[]) {
  const d = PRESETS[id]
  let hit: { r: Act5PresetRecipe; p: Profile; end: GameState } | null = null
  let tried = 0
  for (const r of d.scan) {
    tried++
    const end = playAct5Recipe(r)
    const p = profile(end)
    if (d.fits(p)) {
      hit = { r, p, end }
      break
    }
  }
  if (!hit) {
    say(`${id}: no company fits after ${tried} recipes (reported, not targeted)`)
    continue
  }
  const { r, p } = hit
  const e = p.e
  const vb7 = id === 'firm_builder' ? neverBust(hit.end) : null
  say(`${id}: ${r.act4_preset} ${r.act4_future} seed ${r.act4_seed} ${JSON.stringify(r.joins)}${r.join_from ? ` from ${r.join_from}` : ''}${r.queue ? ' +queue' : ''} (recipe ${tried})${vb7 ? `; V-B7 busts ${vb7.busts}/${vb7.runs}` : ''}`)
  const m = (x: number) => Math.round(x / 1e5) / 10
  found.push({
    id,
    description: DESCRIPTION[id],
    act4_preset: r.act4_preset,
    act4_future: r.act4_future,
    act4_seed: r.act4_seed,
    joins: r.joins,
    ...(r.join_from ? { join_from: r.join_from } : {}),
    ...(r.queue ? { queue: true } : {}),
    valuation_usd_m: m(e.valuationUsd),
    founder_net_worth_usd_m: m(e.founderNetWorthUsd),
    cash_usd_m: m(e.cashUsd),
    debt_usd_m: m(e.debtUsd),
    energized_mw: Math.round(e.energizedMw * 10) / 10,
    free_mw: Math.round(e.freeMw * 10) / 10,
    lease_share: Math.round(p.leaseShare * 100) / 100,
    orbit_share: Math.round(p.orbitShare * 100) / 100,
    rating: e.creditRating,
    ...(vb7 ? { vb7_busts: vb7.busts, vb7_runs: vb7.runs } : {}),
  })
}

const file = {
  _meta: {
    schema: 'presets_v/1',
    doc43: '§3.4 as amended by §0.13 (2035Q4 companies, bot-made; values set by the sim), §0.8 (the Firm Builder from the Fortress line), §0.9 item 11 (each carries its Act IV future)',
    note: "Written by npm run content:act5-presets (tools/act5/presets.ts): the first company in each preset's scan order that fits its description. Figures are that company's at 2035Q4, with free MW at the 2036 powered price. vb7_*: the Firm Builder played passively through Act V (4 futures × 3 seeds).",
  },
  presets: found,
}
const text = JSON.stringify(file, null, 1) + '\n'
for (const dir of ['docs/act5-content/', 'src/content/']) writeFileSync(new URL(`${dir}presets_v.json`, ROOT), text)
say(`presets_v.json: ${found.length} presets`)
