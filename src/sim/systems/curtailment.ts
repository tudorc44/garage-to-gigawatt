// Grid curtailment (scope §2.7, review A8): in a summer heat wave the Texas grid asks
// miners to switch off for a week and pays them for it. The alert comes at the end of a
// week; if you agree, the Texas machines sit out the next week and the credit is paid then.
// The rolls use their own stream (substream), so they don't change the rest of the game.
import { CONTENT, type MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream, uniform } from '../rng.ts'
import { logEntry, type CurtailOffer, type GameState } from '../state.ts'
import { getModel, marketWeek } from './market.ts'
import type { LotWeek } from './mining.ts'
import { mineWeek } from './mining.ts'

/** The 1-based week after which the grid asks this quarter, or null if it doesn't. */
export function curtailmentAlertWeek(state: GameState): number | null {
  const rules = CONTENT.curtailment
  const label = CONTENT.quarters[state.quarter]
  if (!label.endsWith(`Q${rules.quarterOfYear}`)) return null
  const r = substream(state.seed, `curtailment:${state.quarter}`)
  if (uniform(r, 0, 1) >= rules.chancePerQuarter) return null
  return randomInt(r, ...rules.alertAfterWeek)
}

/** True for a machine batch on a site of the curtailment tier (Texas). */
function onGridSite(state: GameState, lotId: string): boolean {
  const lot = state.machines.find((l) => l.id === lotId)
  const site = lot && state.sites.find((s) => s.id === lot.siteId)
  return site?.tier === CONTENT.curtailment.siteTier
}

/** What curtailing the Texas machines in market week `w` would forgo and pay. */
export function curtailOffer(state: GameState, w: MarketWeek): CurtailOffer {
  const rules = CONTENT.curtailment
  const lots = mineWeek(state, w).filter(
    (l) => l.running && onGridSite(state, l.lotId),
  )
  const kw = lots.reduce((sum, l) => {
    const lot = state.machines.find((x) => x.id === l.lotId)!
    return sum + l.working * getModel(lot.model)!.power_kw
  }, 0)
  const mw = kw / 1000
  const forgoneUsd = lots.reduce((sum, l) => sum + l.revenueUsd, 0)
  return {
    mw,
    forgoneUsd,
    creditUsd: Math.max(
      rules.creditUsdPerMw * mw,
      rules.forgoneRevenueMult * forgoneUsd,
    ),
  }
}

/**
 * After a week is played: if this is the week the grid asks, and Texas machines would
 * be mining next week, pause for the curtailment alert. Counts toward the 3 per quarter.
 */
export function checkCurtailment(state: GameState): void {
  if (state.interrupt) return
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) return
  if (curtailmentAlertWeek(state) !== state.week + 1) return
  const next = state.week + 1
  if (next >= CONTENT.market[state.quarter].length) return
  const offer = curtailOffer(state, marketWeek(state.quarter, next))
  if (offer.mw <= 0) return
  state.interrupt = {
    id: 'curtailment',
    week: state.week,
    coin: 'BTC',
    changePct: 0,
    curtail: offer,
  }
  state.interruptsThisQuarter++
}

/** Curtail (the Texas machines sit out next week, for the credit) or keep mining. */
export function resolveCurtailment(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  const offer = active.curtail!
  if (choiceId === 'curtail') {
    state.curtailment = { week: active.week + 1, creditUsd: offer.creditUsd }
    logEntry(
      state,
      'log.curtail_agreed',
      { creditUsd: offer.creditUsd, week: active.week + 2 },
      active.week + 1,
    )
  } else if (choiceId === 'mine') {
    logEntry(
      state,
      'log.curtail_declined',
      { creditUsd: offer.creditUsd },
      active.week + 1,
    )
  } else return { key: 'error.bad_choice' }
  state.interrupt = null
}

/**
 * The agreed curtailment week: Texas batches mine nothing and use no power, and the
 * credit is paid. Returns the batches to settle and the credit (0 in other weeks).
 */
export function applyCurtailment(
  state: GameState,
  lots: LotWeek[],
): { lots: LotWeek[]; creditUsd: number } {
  const c = state.curtailment
  if (!c || c.week !== state.week) return { lots, creditUsd: 0 }
  state.curtailment = null
  state.cash += c.creditUsd
  return {
    lots: lots.map((l) =>
      onGridSite(state, l.lotId)
        ? {
            ...l,
            running: false,
            revenueUsd: 0,
            powerCostUsd: 0,
            coinsMined: 0,
          }
        : l,
    ),
    creditUsd: c.creditUsd,
  }
}
