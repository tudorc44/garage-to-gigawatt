// M32.4 (doc 33 §3.4, as doc 27 D13 learning from its F-6 correction): Act IV's three presets. Each is a real company: a
// bot and a seed played from 2017 through Act II, then through Act III on a fixed scenario, to the 2030Q4 chapter. The
// scan tries sim-runner's Act II bots × seeds 1-20 × Act III scenarios s0-s3 in that order and takes the first company
// that fits each preset's description. The values are whatever the sim made: nothing is targeted in advance.
// `npm run content:act4-presets` writes presets_act4.json into docs/act4-content/ and src/content/ (byte-identical).
import { mkdirSync, writeFileSync } from 'node:fs'
import { SCENARIO_IDS, type ScenarioId } from '../../src/content/index.ts'
import { playFrom, playGame } from '../../src/sim/replay.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { buildAct4Entry } from '../../src/sim/systems/act4Entry.ts'
import { poweredKw } from '../../src/sim/systems/sites.ts'
import { BOTS } from '../bots.ts'
import { ACT2_BOT_ORDER } from '../act3Presets.ts'

const ROOT = new URL('../../', import.meta.url)
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1)
const INVESTMENT_GRADE = ['AAA', 'AA', 'A', 'BBB']

type Id = 'fortress' | 'neocloud' | 'ridge'

/** What a 2030Q4 company looks like for the descriptions. */
function profile(s: GameState) {
  const e = buildAct4Entry(s)
  const live = s.projects.filter((p) => p.stage === 'live')
  const cloudMw = live.filter((p) => p.kind === 'cloud').reduce((mw, p) => mw + p.kw / 1000, 0)
  const sites = s.sites.filter((x) => poweredKw(x, s.quarter) > 0 && x.tier !== 'garage').length
  return { e, cloudMw, sites }
}

/** Doc 33 §3.4's descriptions, as tests on a company. */
const FITS: Record<Id, (p: ReturnType<typeof profile>) => boolean> = {
  // a leased-shell landlord with plenty of energized ground MW, low debt, a good rating, no GPUs
  fortress: ({ e, cloudMw }) =>
    cloudMw === 0 &&
    e.energizedMw >= 40 &&
    e.debtUsd <= 0.25 * e.valuationUsd &&
    INVESTMENT_GRADE.some((g) => (e.creditRating ?? '').startsWith(g)),
  // a GPU-heavy company with clouds under contract, some debt, cash flow to fund an orbital cloud
  neocloud: ({ e, cloudMw }) => cloudMw >= 5 && e.debtUsd > 0 && e.cashUsd > 0,
  // a small survivor with one site and little debt
  ridge: ({ e, sites }) => sites === 1 && e.valuationUsd < 300e6 && e.debtUsd <= 0.2 * Math.max(1, e.valuationUsd),
}

const found: Partial<Record<Id, { bot: string; seed: number; scenario: ScenarioId; s: GameState }>> = {}
const t0 = Date.now()
let runs = 0
scan: for (const scenario of SCENARIO_IDS)
  for (const bot of ACT2_BOT_ORDER)
    for (const seed of SEEDS) {
      if ((Object.keys(FITS) as Id[]).every((id) => found[id])) break scan
      const a2 = playGame(seed, BOTS[bot], { through: 2 }).state
      if (a2.phase !== 'chapter') continue
      const s = playFrom(toAct3(a2, { scenario }), BOTS[bot], { through: 3 }).state
      runs++
      if (s.phase !== 'chapter') continue
      const p = profile(s)
      for (const id of Object.keys(FITS) as Id[])
        if (!found[id] && FITS[id](p)) {
          found[id] = { bot, seed, scenario, s }
          console.log(`${id}: ${bot} seed ${seed} on ${scenario} (${runs} runs, ${Math.round((Date.now() - t0) / 1000)} s)`)
        }
    }

const m = (usd: number) => Math.round(usd / 1e5) / 10
const presets = (['fortress', 'neocloud', 'ridge'] as Id[]).map((id) => {
  const f = found[id]
  if (!f) throw new Error(`No company fits the ${id} preset: widen the scan`)
  const { e, cloudMw, sites } = profile(f.s)
  return {
    id,
    bot: f.bot,
    seed: f.seed,
    act3_scenario: f.scenario,
    valuation_usd_m: m(e.valuationUsd),
    founder_net_worth_usd_m: m(e.founderNetWorthUsd),
    cash_usd_m: m(e.cashUsd),
    debt_usd_m: m(e.debtUsd),
    energized_mw: Math.round(e.energizedMw * 10) / 10,
    contracted_mw: Math.round(e.contractedMw * 10) / 10,
    cloud_mw: Math.round(cloudMw * 10) / 10,
    sites_with_power: sites,
    rating: e.creditRating,
  }
})

const file = {
  _meta: {
    schema: 'presets_act4/1',
    doc33: '§3.4 (three 2030Q4 companies, each a real bot + seed + Act III scenario played from 2017; values set by the sim)',
    note: 'Written by npm run content:act4-presets (tools/act4/presets.ts): the first company in the scan order (sim-runner’s Act II bots × seeds 1-20 × scenarios s0-s3) that fits each description. Figures are that company’s at 2030Q4.',
  },
  presets,
}
const text = JSON.stringify(file, null, 2) + '\n'
mkdirSync(new URL('docs/act4-content/', ROOT), { recursive: true })
writeFileSync(new URL('docs/act4-content/presets_act4.json', ROOT), text)
writeFileSync(new URL('src/content/presets_act4.json', ROOT), text)
console.log(`presets_act4.json written (${runs} runs, ${Math.round((Date.now() - t0) / 1000)} s).`)
