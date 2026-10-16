// The Capital screen's buy-back panel (M79.2, doc 62 §2): read-only. Shows which way the market leans (the rules are open), each
// round's stake and the price of buying it out, the open market after an IPO, and the last answer.
import { CONTENT } from '../content/index.ts'
import type { GameState } from './state.ts'
import { isPublic } from './systems/equity.ts'
import {
  buybackClimate,
  buybackMarketBlocker,
  buybackOfferBlocker,
  buybackValuationUsd,
  offerPriceUsd,
  publicRoomPct,
  roundStakes,
} from './systems/buyback.ts'

export function buybackView(state: GameState) {
  if (state.act !== 1) return null
  const b = CONTENT.buyback
  const stakes = roundStakes(state)
  const closed = state.buyback?.closed ?? []
  const rounds = state.raisesDone
    .filter((id) => id !== 'savings' && id !== 'ipo_spac')
    .map((id) => ({
      id,
      stake: stakes[id] ?? 0,
      closed: closed.includes(id) || !((stakes[id] ?? 0) > 1e-9),
      priceUsd: (share: number) => offerPriceUsd(state, id, share),
      blocker: (share: number) => buybackOfferBlocker(state, id, share) ?? null,
    }))
  const room = publicRoomPct(state)
  return {
    public: isPublic(state),
    climate: buybackClimate(state),
    valuationUsd: buybackValuationUsd(state),
    mult: b.valuation_mult,
    bandwidth: b.bandwidth,
    boomPct: b.refusal.boom_btc_up,
    downturnPct: b.refusal.downturn_btc_down,
    capPerYear: b.public_cap_per_year,
    offeredThisQuarter: state.buyback?.lastOffer === state.quarter,
    rounds,
    roomPct: room,
    marketCostUsd: (pct: number) => Math.round(buybackValuationUsd(state) * pct * 100) / 100,
    marketBlocker: (pct: number) => buybackMarketBlocker(state, pct) ?? null,
    last: state.buyback?.last ?? null,
    heldDepositsUsd: state.sites.reduce((n, s) => n + (s.deposit?.usd ?? 0), 0),
  }
}
