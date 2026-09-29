// Act II spot-market alerts (scope 0.2 §2.9; interrupts_act2.json › spot_price_shock; doc 18 §9).
// Both pause the live quarter only for a company with a live GPU cluster selling on spot, count
// toward the 3 interrupts, and offer the same choice: lock the spot capacity at a price for 4
// quarters (every GPU-hour sold, whatever the utilisation) or stay on spot.
// - The spot price shock: scripted in June 2025 (event card ec15), then a 15% chance each quarter
//   from 2025Q3, in a random week; staying on spot means prices × 0.7 for the rest of the quarter.
//   With the cap full it passes silently as "stay" (logged).
// - The GPU spot alert: a weekly H100 spot move of 15% or more (the coin price alert's threshold);
//   locking fixes today's neocloud price.
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream } from '../rng.ts'
import { inActII, logEntry, type GameState, type Project } from '../state.ts'
import { absWeek } from './eventEffects.ts'
import { previousMarketWeek, scenarioOf } from './market.ts'
import { neocloudUsdHr } from './projects.ts'

const S = BALANCE.act2Spot
const W = BALANCE.weeksPerQuarter

/** Live clusters (clouds and pilots) selling on spot. */
export function spotClusters(state: GameState): Project[] {
  return state.projects.filter(
    (p) => p.stage === 'live' && p.kind !== 'shell' && !p.tenant?.gpu,
  )
}

/** At END_PLAN (Act II, from 2025Q3): whether a random spot price shock comes this quarter, and when. */
export function planSpotShock(state: GameState): void {
  state.spotShock = null
  const label = CONTENT.quarters[state.quarter]
  if (!inActII(state) || label < S.shockFrom) return
  const r = substream(state.seed, `spot_shock:${label}`)
  if (!chance(r, CONTENT.projects.spotShockChance)) return
  state.spotShock = { week: randomInt(r, S.weeks[0], S.weeks[1]) }
}

const capFull = (state: GameState) =>
  state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter

/** After a week is played: the planned shock, then the GPU spot alert. */
export function checkSpotAlerts(state: GameState, w: MarketWeek): void {
  // Act III (M11.4c, DT 2): the random spot shock and the GPU spot alert stay off. The scenario files
  // author GPU prices already, and unauthored shocks would blur the Signals and the decoy.
  if (!inActII(state)) return
  const weekNo = state.week + 1
  const clusters = spotClusters(state).length > 0
  if (state.spotShock?.week === weekNo) {
    state.spotShock = null
    if (clusters) {
      if (state.interrupt || capFull(state)) {
        stay(state)
        logEntry(state, 'log.spot_shock_silent', {}, weekNo)
      } else {
        state.interrupt = {
          id: 'spot_price_shock',
          week: state.week,
          coin: 'BTC',
          changePct: S.shockMult - 1,
        }
        state.interruptsThisQuarter++
        return
      }
    }
  }
  if (state.interrupt || capFull(state) || !clusters) return
  const prev = previousMarketWeek(state.quarter, state.week, scenarioOf(state))
  const now = w.gpu_h100_spot_usd_hr
  const before = prev?.gpu_h100_spot_usd_hr
  if (!now || !before) return
  const changePct = now / before - 1
  if (Math.abs(changePct) < BALANCE.priceAlert.threshold) return
  state.interrupt = {
    id: 'gpu_spot_alert',
    week: state.week,
    coin: 'BTC',
    changePct,
  }
  state.interruptsThisQuarter++
}

export const isSpotAlert = (id: string) =>
  id === 'spot_price_shock' || id === 'gpu_spot_alert'

export function spotAlertChoices(): string[] {
  return ['lock', 'stay']
}

/** The shock's default is to lock (card ec15's); the alert's to stay on spot. */
export function spotAlertDefault(state: GameState): string {
  return state.interrupt?.id === 'spot_price_shock' ? 'lock' : 'stay'
}

/** Spot prices × the shock for the rest of this quarter. */
function stay(state: GameState): void {
  state.events.modifiers.push({
    kind: 'spot',
    siteIds: null,
    mult: S.shockMult,
    from: absWeek(state),
    to: state.quarter * W + W - 1,
  })
}

export function resolveSpotAlert(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  const shock = active.id === 'spot_price_shock'
  if (choiceId === 'lock') {
    const mult = shock ? S.shockMult : 1
    for (const p of spotClusters(state))
      p.spotLock = {
        usdHr:
          (neocloudUsdHr(p.gpu!, state.quarter, scenarioOf(state)) ?? 0) * mult,
        until: state.quarter + S.lockQuarters - 1,
      }
    logEntry(
      state,
      'log.spot_locked',
      { quarters: S.lockQuarters },
      active.week + 1,
    )
  } else if (choiceId === 'stay') {
    if (shock) stay(state)
  } else return { key: 'error.bad_choice' }
  state.interrupt = null
}
