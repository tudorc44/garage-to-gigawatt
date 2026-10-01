// The Act III presets (M18.3; doc 27 v1.1 §8 bands, F-6): each is a recipe, a bot and a seed played from the campaign
// start to 2026Q4 (as the M13 quick starts are), then enterAct3. The scan picks each by trying the Act II bots in
// sim-runner's order × seeds 1–50 and taking the first company whose 2026Q4 valuation is in its band. Tools only:
// the game reads the chosen recipes from presets_act3.json.
import { BALANCE } from '../src/content/index.ts'
import { playGame } from '../src/sim/replay.ts'
import { projectGone, type GameState } from '../src/sim/state.ts'
import { buildAct3Entry } from '../src/sim/systems/act3Entry.ts'
import { regionAnger } from '../src/sim/systems/anger.ts'
import { siteHeatValue } from '../src/sim/systems/heat.ts'
import { tenantCard } from '../src/sim/systems/projects.ts'
import { poweredKw, regionOf } from '../src/sim/systems/sites.ts'
import { BOTS } from './bots.ts'

export type PresetId = 'good' | 'great' | 'lifeline'

/** sim-runner's Act II bots, in its order. */
export const ACT2_BOT_ORDER = [
  'raise-climb',
  'hosting-switcher',
  'texas-ipo',
  'shell-climb',
  'texas-shell',
  'shell-capital',
  'texas-capital',
  'sign-then-raise',
  'asic-retirer',
  'lifeline-shell',
  'overleveraged',
] as const

/** Each preset's band and the bots it's drawn from (the §5 good-path and great-path bots; any for the lifeline). */
export const PRESET_BANDS: Record<
  PresetId,
  { band: [number, number]; bots: readonly string[]; oneSite?: boolean }
> = {
  good: { band: [400e6, 450e6], bots: ['shell-capital', 'sign-then-raise'] },
  great: { band: [4.5e9, 5.0e9], bots: ['texas-capital', 'asic-retirer'] },
  lifeline: { band: [130e6, 170e6], bots: ACT2_BOT_ORDER, oneSite: true },
}

/** A company at the end of Act II (the 2026Q4 chapter phase), or null if the run didn't get there. */
export function presetCompany(bot: string, seed: number): GameState | null {
  const s = playGame(seed, BOTS[bot], { through: 2 }).state
  return s.phase === 'chapter' && s.reports.at(-1)?.quarter === '2026Q4' ? s : null
}

/** Sites with power now (the garage doesn't count). */
export function poweredSites(state: GameState): number {
  return state.sites.filter(
    (s) => s.tier !== BALANCE.startSite && poweredKw(s, state.quarter) > 0,
  ).length
}

/** A company's figures as presets_act3.json records them (money in $M, one decimal). */
export function presetFigures(state: GameState) {
  const e = buildAct3Entry(state)
  const m = (usd: number) => Math.round(usd / 1e5) / 10
  const tenants = new Map<string, number>()
  const gpus = new Map<string, number>()
  for (const p of state.projects) {
    if (projectGone(p) || p.stage === 'proposed' || p.stage === 'ended') continue
    const type = p.tenant ? tenantCard(p.tenant.card)?.type : undefined
    if (type) tenants.set(type, (tenants.get(type) ?? 0) + 1)
    if (p.gpu) gpus.set(p.gpu, (gpus.get(p.gpu) ?? 0) + p.kw / 1000)
  }
  const regions = [...new Set(state.sites.map((s) => regionOf(s)).filter((r) => r !== undefined))]
  return {
    valuation_usd_m: m(e.valuationUsd),
    cash_usd_m: m(e.cashUsd),
    debt_usd_m: m(e.debtUsd),
    energized_mw: Math.round(e.energizedMw * 10) / 10,
    contracted_mw: Math.round(e.contractedMw * 10) / 10,
    sites_with_power: poweredSites(state),
    regions,
    tenants: [...tenants].map(([t, n]) => `${t} x${n}`),
    rating: e.creditRating,
    gpu_mw: Object.fromEntries([...gpus].map(([g, mw]) => [g, Math.round(mw * 10) / 10])),
    heat_max: Math.max(0, ...state.sites.map((s) => siteHeatValue(state, s.id))),
    anger_max: Math.max(0, ...regions.map((r) => regionAnger(state, r))),
  }
}

/** Whether a company fits a preset's band (and, for the lifeline, has exactly one site with power). */
export function fitsPreset(id: PresetId, state: GameState): boolean {
  const { band, oneSite } = PRESET_BANDS[id]
  const v = state.reports.at(-1)!.valuationUsd
  return v >= band[0] && v <= band[1] && (!oneSite || poweredSites(state) === 1)
}

/**
 * The candidates for a preset, in scan order (its bots in sim-runner's order × seeds 1–`seeds`), each with its
 * 2026Q4 valuation; `fits` marks the ones in the band. Stops after `limit` fits.
 */
export function scanPreset(
  id: PresetId,
  seeds = 50,
  limit = 1,
): { bot: string; seed: number; valuationUsd: number; fits: boolean; state: GameState }[] {
  const out: { bot: string; seed: number; valuationUsd: number; fits: boolean; state: GameState }[] = []
  const bots = ACT2_BOT_ORDER.filter((b) => PRESET_BANDS[id].bots.includes(b))
  let fits = 0
  for (const bot of bots)
    for (let seed = 1; seed <= seeds; seed++) {
      const s = presetCompany(bot, seed)
      if (!s) continue
      const ok = fitsPreset(id, s)
      out.push({ bot, seed, valuationUsd: s.reports.at(-1)!.valuationUsd, fits: ok, state: s })
      if (ok && ++fits >= limit) return out
    }
  return out
}
