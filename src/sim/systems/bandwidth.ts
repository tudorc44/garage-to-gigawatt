// Bandwidth: the founder's attention. Refilled each quarter; unused points are lost.
import { BALANCE } from '../../content/index.ts'
import { inActII, inAct3Rules, inActIV, type GameState } from '../state.ts'
import { holdBandwidthBonus } from './headStarts.ts'
import { bandwidthBonus } from './hires.ts'
import { isReady, poweredKw } from './sites.ts'

/**
 * Bandwidth for the quarter. Act I: 3, +1 once the 20 MW own site is energized, +1 Chief of Staff,
 * capped at 6. Act II (scope 0.2 §2.2): 4, +1 at 50 MW energized and +1 more at 200 MW, +1 each from
 * the Chief of Staff (one hired in Act I carries over) and the Head of Development, capped at 8.
 * Act III (M11.2): the same as Act II.
 */
export function bandwidthForQuarter(state: GameState): number {
  // Act III uses Act II's rule (doc 27 §2: same rules where Act II is silent); Act II's staff carry over.
  if (inActII(state) || inAct3Rules(state)) {
    const a = BALANCE.act2Bandwidth
    const kw = state.sites.reduce(
      (sum, s) => sum + poweredKw(s, state.quarter),
      0,
    )
    const mw = a.mwSteps.filter((step) => kw >= step).length
    // Act IV (M29.4): +1 once an orbital block has gone live, and a higher cap.
    if (inActIV(state)) {
      const b = BALANCE.act4.bandwidth
      const orbit = state.act4Orbit?.blocks.some((x) => x.liveQuarter !== null && x.liveQuarter <= state.quarter)
      return Math.min(
        a.base + mw + bandwidthBonus(state) + holdBandwidthBonus(state) + (orbit ? b.orbitLiveBonus : 0),
        b.max,
      )
    }
    return Math.min(
      a.base + mw + bandwidthBonus(state) + holdBandwidthBonus(state),
      a.max,
    )
  }
  const b = BALANCE.bandwidth
  const bonus = state.sites.some(
    (s) => s.tier === b.bonusSiteTier && isReady(s, state.quarter),
  )
    ? 1
    : 0
  return Math.min(b.perQuarter + bonus + bandwidthBonus(state), b.max)
}
