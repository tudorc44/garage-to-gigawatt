// M68.1 (doc 43 §0.25 item 1): what drives Heat in Act V, by source. `node tools/act5/heatReport.ts [--seeds N]` (default 10).
// The Perfect and Holder bots on both presets and all four futures. For each run it samples every Plan phase (the end of the
// quarter before) and reports medians over the seeds: the share of runs whose hottest site passes 50, the quarter it first
// does, the hottest site's Heat at the start and at 2040Q4 split into its parts (heatParts: tier = the site ladder, load =
// the running MW, grievance = cards and neglect, era, region, Anger, national policy, the Community hire, a deal), the MW
// added (capacity of the sites at 2040Q4 minus at the start) and the site count. Measurement only: nothing here changes the game.
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { ACT5_PRESET_IDS, PRESETS_V } from '../../src/content/presetsAct5.ts'
import type { VFutureId } from '../../src/content/schemas.ts'
import { playFrom, type Strategy } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { heatParts } from '../../src/sim/systems/heat.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'
import { act5Bot, type Act5Archetype } from './bots.ts'
import { playAct5Recipe } from './presetRun.ts'

const args = process.argv.slice(2)
const SEEDS = Number(args.includes('--seeds') ? args[args.indexOf('--seeds') + 1] : '10')
const first5 = actFirstQuarter(5)
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y)
  const m = a.length >> 1
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}
const PARTS = ['tier', 'flaw', 'mitigation', 'load', 'grievance', 'goodwill', 'era', 'region', 'anger', 'national', 'gas', 'relations', 'deal'] as const

interface Sample {
  quarter: number
  maxHeat: number
  parts: Record<string, number>
  mw: number
  sites: number
}
function sample(s: GameState): Sample {
  const live = s.sites
  let top = live[0]
  for (const x of live) if ((s.siteHeat[x.id]?.value ?? 0) > (s.siteHeat[top.id]?.value ?? 0)) top = x
  const parts: Record<string, number> = {}
  if (top) for (const p of heatParts(s, top).parts) parts[p.id] = p.pts
  return {
    quarter: s.quarter,
    maxHeat: top ? (s.siteHeat[top.id]?.value ?? 0) : 0,
    parts,
    mw: live.reduce((a, x) => a + capacityKw(x), 0) / 1000,
    sites: live.length,
  }
}

for (const botName of ['perfect', 'holder'] as Act5Archetype[])
  for (const id of ACT5_PRESET_IDS) {
    const pr = PRESETS_V.find((x) => x.id === id)!
    const base = playAct5Recipe({ act4_preset: pr.act4_preset, act4_future: pr.act4_future, act4_seed: pr.act4_seed, joins: pr.joins as never })
    for (const v of V_FUTURE_IDS) {
      const runs: Sample[][] = []
      for (let seed = 1; seed <= SEEDS; seed++) {
        const bot = act5Bot(botName)
        const samples: Sample[] = []
        const wrapped: Strategy = { ...bot, plan: (s) => (s.act === 5 && samples.push(sample(s)), bot.plan(s)) }
        const end = playFrom(toAct5(structuredClone(base), { vfuture: v as VFutureId, act5Seed: seed }), wrapped, { through: 5 }).state
        samples.push(sample(end))
        runs.push(samples)
      }
      const last = runs.map((r) => r.at(-1)!)
      const firstOver = runs.map((r) => r.find((x) => x.maxHeat > 50)?.quarter ?? null)
      const hit = firstOver.filter((q) => q !== null) as number[]
      const startS = runs.map((r) => r[0])
      const partsEnd = PARTS.map((p) => [p, median(last.map((x) => x.parts[p] ?? 0))] as const).filter(([, v2]) => Math.abs(v2) >= 0.05)
      const partsStart = PARTS.map((p) => [p, median(startS.map((x) => x.parts[p] ?? 0))] as const).filter(([, v2]) => Math.abs(v2) >= 0.05)
      console.log(
        `${botName.padEnd(7)} ${id.padEnd(16)} ${v}: Heat ${median(startS.map((x) => x.maxHeat)).toFixed(0)} → ${median(last.map((x) => x.maxHeat)).toFixed(0)} ` +
          `(over 50 in ${hit.length}/${SEEDS} runs${hit.length ? `, first ${CONTENT.quarters[median(hit)]}` : ''}); MW ${median(startS.map((x) => x.mw)).toFixed(0)} → ${median(last.map((x) => x.mw)).toFixed(0)}, ` +
          `sites ${median(startS.map((x) => x.sites)).toFixed(0)} → ${median(last.map((x) => x.sites)).toFixed(0)}; start parts: ${partsStart.map(([p, v2]) => `${p} ${v2.toFixed(1)}`).join(', ')}; end parts: ${partsEnd.map(([p, v2]) => `${p} ${v2.toFixed(1)}`).join(', ')}`,
      )
    }
  }
console.log('first Act V quarter', CONTENT.quarters[first5])
