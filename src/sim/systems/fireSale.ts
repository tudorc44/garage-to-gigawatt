// Act IV's fire sales (M31.3; doc 33 §11.5, IV-D26). Short of cash at a quarter's end, before the emergency equity raise,
// the rescue sells the smallest Act IV asset whose proceeds (net of its debt) cure the shortfall: a live orbital block
// at its value on the space multiple × 0.4, or a held lunar site at its value × 0.2 (× 0.5 when a bloc that wants the site
// is the buyer). Like the original Iridium, a distressed constellation sells for a fraction of what it cost.
import { MONEY } from '../../content/moneyContent.ts'
import { lunarSite } from '../../content/moonContent.ts'
import { logEntry, type GameState } from '../state.ts'
import { blockDebt, repayFromProceeds } from './orbitCapital.ts'
import { orbitRow } from './orbit.ts'
import { siteValueUsd } from './moonOps.ts'
import { blockPricingEbitdaUsd } from './orbitOps.ts'

const F = MONEY.capital.fire_sale

/** What each Act IV asset would fetch in a fire sale now, net of its debt. */
export function fireSaleCandidates(state: GameState) {
  const mult = orbitRow(state).space_ev_ebitda_mult
  const orbit = (state.act4Orbit?.blocks ?? [])
    .filter((b) => b.stage === 'live')
    .map((b) => {
      // (M34.1, 2b: a block without a booked quarter yet is priced on its run-rate; the fire-sale haircut on top)
      const priceUsd = Math.max(0, blockPricingEbitdaUsd(state, b) * 4 * mult) * F.orbital
      return { kind: 'orbit' as const, id: b.id, n: b.n, priceUsd, netUsd: priceUsd - (blockDebt(state, b.id)?.balanceUsd ?? 0) }
    })
  const aligned = state.act4Moon?.alignedBloc ?? null
  const moon = (state.act4Moon?.claims ?? [])
    .filter((c) => c.status === 'held')
    .map((c) => {
      const interest = lunarSite(c.site).bloc_interest
      const toBloc = interest === 'both' || (aligned !== null && interest === aligned)
      const priceUsd = siteValueUsd(state, c) * (toBloc ? F.lunar_to_bloc : F.lunar)
      return { kind: 'moon' as const, id: c.site, n: 0, priceUsd, netUsd: priceUsd }
    })
  return [...orbit, ...moon]
}

/** Sells the smallest asset whose net proceeds cure the shortfall; true if one did. */
export function act4FireSale(state: GameState, shortUsd: number): boolean {
  const pick = fireSaleCandidates(state)
    .filter((x) => x.netUsd >= shortUsd)
    .sort((a, b) => a.netUsd - b.netUsd)[0]
  if (!pick) return false
  if (pick.kind === 'orbit') {
    const b = state.act4Orbit!.blocks.find((x) => x.id === pick.id)!
    state.cash += repayFromProceeds(state, b, pick.priceUsd)
    b.stage = 'sold'
    logEntry(state, 'log.orbit.fire_sale', { n: b.n, priceUsd: pick.priceUsd, shortUsd })
  } else {
    const c = state.act4Moon!.claims.find((x) => x.site === pick.id && x.status === 'held')!
    state.cash += pick.priceUsd
    c.status = 'sold'
    logEntry(state, 'log.moon.fire_sale', { lunarSite: c.site, priceUsd: pick.priceUsd, shortUsd })
  }
  return true
}
