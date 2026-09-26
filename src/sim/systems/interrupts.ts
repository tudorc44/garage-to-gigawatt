// Interrupts: alerts that pause the live quarter until the player picks a choice.
// This week only the price alert exists. At most max_per_quarter fire per quarter.
import { BALANCE, CONTENT, type MarketWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type Coin, type GameState } from '../state.ts'
import { coinPrice, marketWeek, previousMarketWeek } from './market.ts'
import { marginCallChoices, resolveMarginCall } from './cryptoLoan.ts'
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
  state.quarterStats.priceAlerts++
}

/** Applies the chosen option's effects (from interrupts.json) and clears the interrupt. */
export function resolveInterrupt(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt
  if (!active) return { key: 'error.no_interrupt' }
  if (active.id === 'margin_call') return resolveMarginCall(state, choiceId)
  const choice = CONTENT.interrupts.byId[active.id]?.choices?.find(
    (c) => c.id === choiceId,
  )
  if (!choice) return { key: 'error.bad_choice' }
  const coin = choiceCoin(choice.effects)
  if (coin && state.treasury[coin] <= 0)
    return { key: 'error.nothing_to_sell', params: { coin } }

  const w = marketWeek(state.quarter, active.week)
  const alert = { coin: active.coin, changeDelta: active.changePct }
  let sold = false
  for (const [effect, value] of Object.entries(choice.effects ?? {})) {
    switch (effect) {
      case 'coin':
        break // which coin the sale applies to (read above)
      case 'sell_treasury_pct': {
        const valueUsd = sellTreasury(state, Number(value), w, coin)
        state.quarterStats.treasurySoldUsd += valueUsd
        logEntry(
          state,
          'log.alert_sold',
          {
            ...alert,
            sharePct: Number(value),
            soldCoin: coin ?? 'BTC + ETH',
            valueUsd,
          },
          active.week + 1,
        )
        sold = true
        break
      }
      default:
        throw new Error(`Interrupt effect "${effect}" is not implemented yet`)
    }
  }
  if (!sold) logEntry(state, 'log.alert_held', alert, active.week + 1)
  state.interrupt = null
}

/** What a choice would do, for the event card's one-line preview. Reads state only. */
export function choicePreview(
  state: GameState,
  choiceId: string,
): { cashUsd: number; coins: Record<Coin, number> } {
  const none = { cashUsd: 0, coins: { BTC: 0, ETH: 0 } }
  const active = state.interrupt
  if (!active) return none
  const choice = CONTENT.interrupts.byId[active.id]?.choices?.find(
    (c) => c.id === choiceId,
  )
  const share = Number(choice?.effects?.sell_treasury_pct ?? 0)
  if (share === 0) return none
  const w = marketWeek(state.quarter, active.week)
  const only = choiceCoin(choice?.effects)
  const coins = {
    BTC: !only || only === 'BTC' ? state.treasury.BTC * share : 0,
    ETH: !only || only === 'ETH' ? state.treasury.ETH * share : 0,
  }
  return {
    cashUsd: coins.BTC * coinPrice(w, 'BTC') + coins.ETH * coinPrice(w, 'ETH'),
    coins,
  }
}

/** The coin a choice sells (effects.coin), or undefined if it sells both or nothing. */
export function choiceCoin(
  effects: Record<string, unknown> | undefined,
): Coin | undefined {
  const c = effects?.coin
  return c === 'BTC' || c === 'ETH' ? c : undefined
}

/** Choices that make sense now: no "sell BTC" when there's no BTC in the treasury. */
export function availableChoices(state: GameState): string[] {
  const active = state.interrupt
  if (!active) return []
  if (active.id === 'margin_call') return marginCallChoices(state)
  return (CONTENT.interrupts.byId[active.id].choices ?? [])
    .filter((c) => {
      const coin = choiceCoin(c.effects)
      return !coin || state.treasury[coin] > 0
    })
    .map((c) => c.id)
}

/**
 * The choice that applies when the player doesn't pick: the interrupt's default, or,
 * if that isn't possible now, the fallbacks in default_if_unaffordable ("a, then b").
 */
export function defaultChoice(state: GameState): string {
  const def = CONTENT.interrupts.byId[state.interrupt!.id]
  const open = availableChoices(state)
  const fallbacks = (def.default_if_unaffordable ?? '')
    .split(/,\s*then\s*|,\s*/)
    .map((x) => x.trim())
    .filter(Boolean)
  return (
    [def.default, ...fallbacks].find((c) => open.includes(c)) ?? def.default
  )
}
