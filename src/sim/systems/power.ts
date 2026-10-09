// New power for a project (Act II, scope 0.2 §2.5–2.6; doc 18 §5.3; conversions.json › grid_upgrade,
// on_site_gas; wireframe A2-05's Power slot). Besides the site's existing MW, a project can bring
// its own:
// - a grid upgrade: $/MW, then the region's queue (drawn when the build starts), longer with
//   policies (PJM +4 from 2026Q1), shorter by a quarter with the Ex-Utility Exec (scope §2.8); halted
//   in ERCOT in 2026Q3–Q4;
// - on-site gas: $/MW, a 2-quarter build, and Heat at the site while it runs (more with the
//   air-permit flaw).
// The project goes live when both its build and its power are done.
import { BALANCE, CONTENT, act4Row, type PowerRegion } from '../../content/index.ts'
import { scenarioOf } from './market.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream } from '../rng.ts'
import { act4SeedOf, inActIV, type GameState, type PowerSource, type Project, type Site } from '../state.ts'
import { VENTURES } from '../../content/energyContent.ts'
import { drawOverrun } from './overrun.ts'
import { isHired } from './hires.ts'
import { extraQueueQuarters, gridUpgradesHalted } from './regions.ts'
import { flawEffect, regionOf } from './sites.ts'
import { nuclearBlocker, nuclearPowerQuarters } from './nuclear.ts'
import { lowCapital } from './pcState.ts'

const POWER = () => CONTENT.projects.power
/** The hire whose queue effect applies to grid upgrades (scope 0.2 §2.8), and by how much. */
const EX_UTILITY = 'ex_utility'
const exUtilityCut = (state: GameState) => (isHired(state, EX_UTILITY) ? 1 : 0)

/** What new power for `kw` costs (a nuclear PPA: nothing up front, M17.2). */
export function powerCostUsd(source: PowerSource, kw: number): number {
  if (source === 'nuclear') return 0
  const perMw =
    source === 'grid' ? POWER().grid.capexUsdMw : POWER().gas.capexUsdMw
  return (perMw * kw) / 1000
}

/** A grid upgrade's queue in a region now: the content's range, + policy delays, − the Ex-Utility Exec (≥ 1). */
export function gridQuarterRange(
  state: GameState,
  region: PowerRegion,
): [number, number] {
  // M36.4 (design thread, answer 9): Act IV reads doc 33's wait, the future's grid_wait_q × 0.8-1.2, in every region.
  const [lo, hi] = inActIV(state) ? act4GridRange(state) : POWER().grid.quartersByRegion[region]
  // Act III (M17.3): with political capital under 15, new grid upgrades queue a quarter longer (designed).
  const lowPc = lowCapital(state)
    ? BALANCE.act3.politicalCapital.lowCapital.gridQueueExtraQuarters
    : 0
  const shift =
    extraQueueQuarters(region, state.quarter) - exUtilityCut(state) + lowPc
  return [Math.max(1, lo + shift), Math.max(1, hi + shift)]
}

/** Act IV's grid wait before shifts: the future's grid_wait_q × the spread (16-24 at 20; 8-12 at 10). */
function act4GridRange(state: GameState): [number, number] {
  const gw = Number(act4Row(state.quarter, scenarioOf(state)).grid_wait_q)
  const [a, b] = VENTURES.act4_power.grid_wait_spread
  return [Math.round(gw * a), Math.round(gw * b)]
}

/** Why a project at this site can't bring this power now, or undefined. */
export function powerBlocker(
  state: GameState,
  site: Site,
  source: PowerSource,
): Message | undefined {
  if (source === 'nuclear') return nuclearBlocker(state, site)
  const region = regionOf(site)
  if (!region) return { key: 'error.power_no_region' }
  if (source === 'grid' && gridUpgradesHalted(region, state.quarter))
    return { key: 'error.grid_halted', params: { region } }
  return undefined
}

/** Quarters until a new power source is energized, counted from the build start (grid: drawn). */
export function drawPowerQuarters(state: GameState, p: Project): number {
  const site = state.sites.find((s) => s.id === p.siteId)!
  // M36.4 (answer 9): Act IV's on-site gas waits for turbines, 6-10 quarters (its own stream).
  if (p.power === 'gas' && inActIV(state))
    return randomInt(substream(act4SeedOf(state), `gas_build:${CONTENT.quarters[state.quarter]}:${p.id}`), ...VENTURES.act4_power.gas_build_q)
  if (p.power === 'gas') return POWER().gas.buildQuarters
  if (p.power === 'nuclear') return nuclearPowerQuarters()
  const [lo, hi] = gridQuarterRange(state, regionOf(site)!)
  const r = substream(
    state.seed,
    `grid_queue:${CONTENT.quarters[state.quarter]}:${p.id}`,
  )
  return randomInt(r, lo, hi)
}

/** Quarters a proposed project's new power is expected to take (grid: the queue's short end). */
export function expectedPowerQuarters(state: GameState, p: Project): number {
  if (!p.power) return 0
  if (p.power === 'gas') return inActIV(state) ? VENTURES.act4_power.gas_build_q[0] : POWER().gas.buildQuarters
  if (p.power === 'nuclear') return nuclearPowerQuarters()
  const site = state.sites.find((s) => s.id === p.siteId)!
  return gridQuarterRange(state, regionOf(site)!)[0]
}

/**
 * M36 (doc 38 §5.9): on-site gas in Act IV has a thermal-class overrun, drawn when the build starts, on its own
 * substream (its 6-10 quarter wait is drawPowerQuarters's). Nothing outside Act IV.
 */
export function gasActIvDraw(state: GameState, p: Project): { slipQuarters: number; overrunUsd: number } {
  if (p.power !== 'gas' || !inActIV(state)) return { slipQuarters: 0, overrunUsd: 0 }
  const m = drawOverrun(substream(act4SeedOf(state), `gas_iv:${p.id}`), VENTURES.act4_power.gas_class)
  return { slipQuarters: 0, overrunUsd: Math.round((m - 1) * powerCostUsd('gas', p.kw)) }
}

/** Heat from on-site gas running at a site in `quarter` (Act II): per plant, plus the air-permit flaw's. */
export function gasHeat(site: Site, quarter: number): number {
  const running = (site.powerAdds ?? []).filter(
    (a) =>
      a.source === 'gas' &&
      a.readyQuarter !== null &&
      a.readyQuarter <= quarter,
  )
  if (running.length === 0) return 0
  return (
    running.length * POWER().gas.heatDelta +
    (flawEffect(site, 'heat_delta') ?? 0)
  )
}
