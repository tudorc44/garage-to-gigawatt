// Interrupts: alerts that pause the live quarter until the player picks a choice.
// This week only the price alert exists. At most max_per_quarter fire per quarter.
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import type { Coin, GameState } from '../state.ts'
import { coinPrice, marketWeek, previousMarketWeek } from './market.ts'
import { sellTreasury } from './treasury.ts'

/**
 * Price alert: fires when BTC or ETH moved by at least the threshold this week.
 * Only when there's something in the treasury to sell (otherwise there's no decision).
 */
export function checkPriceAlert(state: GameState, w: MarketWeek): void {
  if (state.interrupt) return
  if (state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter) return
  if (state.treasury.BTC <= 0 && state.treasury.ETH <= 0) return
  const prev = previousMarketWeek(state.quarter, state.week)
  if (!prev) return

  let biggest: { coin: Coin; changePct: number } | undefined
  for (const coin of ['BTC', 'ETH'] as const) {
    const changePct = coinPrice(w, coin) / coinPrice(prev, coin) - 1
    if (
      Math.abs(changePct) >= BALANCE.priceAlert.threshold &&
      Math.abs(changePct) > Math.abs(biggest?.changePct ?? 0)
    ) {
      biggest = { coin, changePct }
    }
  }
  if (!biggest) return
  state.interrupt = { id: 'price_alert', week: state.week, ...biggest }
  state.interruptsThisQuarter++
}

/** Applies the chosen option's effects (from interrupts.json) and clears the interrupt. */
export function resolveInterrupt(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt
  if (!active) return { key: 'error.no_interrupt' }
  const choice = CONTENT.interrupts.byId[active.id]?.choices?.find(
    (c) => c.id === choiceId,
  )
  if (!choice) return { key: 'error.bad_choice' }

  const w = marketWeek(state.quarter, active.week)
  for (const [effect, value] of Object.entries(choice.effects ?? {})) {
    switch (effect) {
      case 'sell_treasury_pct':
        state.quarterStats.treasurySoldUsd += sellTreasury(
          state,
          Number(value),
          w,
        )
        break
      default:
        throw new Error(`Interrupt effect "${effect}" is not implemented yet`)
    }
  }
  state.interrupt = null
}

/** The choice that applies when the player skips the alert. */
export function defaultChoice(interruptId: string): string {
  return CONTENT.interrupts.byId[interruptId].default
}
