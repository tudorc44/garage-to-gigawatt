// Ratepayer Anger (Act II, scope 0.2 §2.2 / §2.6; owner, 28 Sep 2026, M5 answer 6): each region's
// anger at data centers, 0–100. It grows with the megawatts you run there (× the region's anger
// modifier from regions.json) plus policy bumps (the PJM capacity shock in Virginia and Ohio from
// 2024Q4; the national backlash from 2026Q1). It adds Heat at your sites in that region, and at 50
// the state's moratorium card (ec21) can come. It's regional: local Heat actions don't lower it.
import {
  BALANCE,
  CONTENT,
  POWER_REGIONS,
  isAct2RulesQuarter,
  type PowerRegion,
} from '../../content/index.ts'
import { inActIII, type GameState } from '../state.ts'
import { ppaRegions } from './nuclear.ts'
import { lowCapital } from './pcState.ts'
import { getRegion } from './regions.ts'
import { poweredKw, regionOf } from './sites.ts'

const A = BALANCE.act2Regions.anger

/** A region's Ratepayer Anger in `quarter` (0 in Act I and without a region). */
export function regionAnger(
  state: GameState,
  region: PowerRegion | undefined,
  quarter = state.quarter,
): number {
  // Act III too (M11.4c): worked out from energized MW, with Act II's standing policy bumps.
  if (!region || !isAct2RulesQuarter(quarter)) return 0
  const kw = state.sites
    .filter((s) => regionOf(s) === region)
    .reduce((sum, s) => sum + poweredKw(s, quarter), 0)
  const label = CONTENT.quarters[quarter]
  const bumps = A.bumps
    .filter(
      (b) =>
        label >= b.from && (b.regions === null || b.regions.includes(region)),
    )
    .reduce((sum, b) => sum + b.add, 0)
  const fromMw = Math.floor(
    (kw / 1000 / A.mwPerPoint) * getRegion(region).anger_modifier,
  )
  // Act III (M17.2, M17.3): −5 where you hold a nuclear PPA (once per region), and the company-wide
  // adjustment (the hire, lobbying, spends, cards, a wildcard); floor 0.
  const adj = inActIII(state)
    ? (ppaRegions(state, quarter).includes(region)
        ? BALANCE.act3.nuclear.angerDelta
        : 0) + (state.angerAdj ?? 0)
    : 0
  return Math.max(0, Math.min(A.max, fromMw + bumps + adj))
}

/** Heat Anger adds at a site in that region: floor(Anger ÷ 5). */
export function angerHeat(
  state: GameState,
  region: PowerRegion | undefined,
): number {
  return Math.floor(regionAnger(state, region) / A.heatDivisor)
}

/** The angriest region where you have a site, if its Anger is at the moratorium level (ec21). */
export function moratoriumRegion(state: GameState): PowerRegion | undefined {
  const mine = POWER_REGIONS.filter((r) =>
    state.sites.some((s) => regionOf(s) === r),
  )
  const angriest = [...mine].sort(
    (a, b) => regionAnger(state, b) - regionAnger(state, a),
  )[0]
  // Act III (M17.3): with political capital under 15 the moratorium comes at Anger 40 (designed).
  const at = lowCapital(state)
    ? BALANCE.act3.politicalCapital.lowCapital.moratoriumAngerAt
    : A.moratoriumAt
  return angriest && regionAnger(state, angriest) >= at ? angriest : undefined
}

/** Whether new projects are blocked at sites in this region now (ec21's moratorium). */
export function regionMoratoriumOn(
  state: GameState,
  region: PowerRegion | undefined,
): boolean {
  const m = state.events.regionMoratorium
  return !!m && !!region && m.region === region && state.quarter <= m.until
}
