// Act V's lunar holding (M62.2; doc 43 §9.2 with §0.18): the Act IV Moon programme as one holding, worth its 2035Q4 value
// × the future's `lunar_value_index`. One action: sell it to a bloc at half its value (1 Bandwidth; a move that scores 0).
// The distress sale to a rival (§9.2's × 0.3) is dropped (doc 43 §0.19 item 6): the bloc sale is the one way out.
// The view shows the first-tonnes outlook as the public range only: the year drawn at the boundary stays hidden until the
// finale's epilogue.
import { BALANCE, act5Row } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { book } from '../ledger.ts'
import { inActV, logEntry, roundCents, type GameState } from '../state.ts'
import { lunarHoldingUsd } from './act5Entry.ts'
import { scenarioOf } from './market.ts'

/** The bloc's price: × 0.5 of the holding's value (doc 43 §9.2). */
export const LUNAR_BLOC_SHARE = 0.5

/** Why the holding can't be sold now, or undefined. */
export function sellLunarBlocker(state: GameState): Message | undefined {
  const h = state.lunarHolding
  if (!inActV(state) || !h || h.soldQuarter !== undefined || lunarHoldingUsd(state) <= 0) return { key: 'error.lunar_none' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (state.bandwidth < 1) return { key: 'error.no_bandwidth', params: { needed: 1, have: state.bandwidth } }
}

/** Sells the holding to a bloc (1 Bandwidth). */
export function sellLunarHolding(state: GameState): void {
  const usd = roundCents(lunarHoldingUsd(state) * LUNAR_BLOC_SHARE)
  state.bandwidth -= 1
  state.lunarHolding!.soldQuarter = state.quarter
  book(state, 'asset_sales', usd, { biz: 'moon' })
  logEntry(state, 'log.lunar.sold', { usd })
}

/** The Capital page's lunar holding panel: its 2035Q4 value, today's index and value, the first-tonnes range, the sale. */
export function lunarHoldingView(state: GameState) {
  const h = state.lunarHolding
  if (!inActV(state) || !h || h.value2035Usd <= 0) return null
  const [lo, hi] = BALANCE.act5.lunarPlantFirstTonnesYears
  return {
    value2035Usd: h.value2035Usd,
    index: act5Row(state.quarter, scenarioOf(state))?.lunar_value_index ?? 1,
    valueUsd: lunarHoldingUsd(state),
    saleUsd: roundCents(lunarHoldingUsd(state) * LUNAR_BLOC_SHARE),
    sold: h.soldQuarter !== undefined,
    // (whether a production plant was decided is the player's own decision; when its tonnes come is hidden)
    tonnesRange: h.firstTonnesYear !== undefined ? { lo, hi } : null,
    blocked: sellLunarBlocker(state) ?? null,
  }
}
