// The last resorts before an Act II game over (owner, M7.0 answer A8). At quarter end, once the coins
// and machines have been sold and cash is still below zero:
// 1. a forced sale of the smallest live project whose proceeds cure the shortfall, at its cap-rate
//    value × 0.85, less the debt on it;
// 2. if none cures it, an emergency equity raise at half the current valuation, diluting at most 30%.
// Game over only if both fail. The log says which one fired.
import { BALANCE } from '../../content/index.ts'
import { logEntry, type GameState } from '../state.ts'
import { equityPreMoneyUsd } from './equity.ts'
import { repayProjectFacilities } from './facilities.ts'
import { saleValueUsd } from './projects.ts'

/** What each project would bring now in a forced sale, net of its debt. */
function forcedSaleNetUsd(state: GameState, projectId: string): number {
  const p = state.projects.find((x) => x.id === projectId)!
  const owed = state.facilities
    .filter((f) => f.projectId === projectId)
    .reduce((a, f) => a + f.balanceUsd, 0)
  return Math.round(saleValueUsd(state, p) * BALANCE.finance.rescue.saleMult) - owed
}

/** Tries the two rescues in order; returns which one fired, or null. */
export function rescueBeforeGameOver(
  state: GameState,
): 'sale' | 'equity' | null {
  if (state.act !== 2 || state.cash >= 0) return null
  const r = BALANCE.finance.rescue
  const shortUsd = -state.cash
  // 1. The smallest live project (by MW) whose net proceeds cure the shortfall.
  const curing = state.projects
    .filter((p) => p.stage === 'live' && p.kind === 'shell' && p.tenant)
    .map((p) => ({ p, net: forcedSaleNetUsd(state, p.id) }))
    .filter((x) => x.net >= shortUsd)
    .sort((a, b) => a.p.kw - b.p.kw || a.net - b.net)[0]
  if (curing) {
    const { p } = curing
    const priceUsd = Math.round(saleValueUsd(state, p) * r.saleMult)
    const site = state.sites.find((s) => s.id === p.siteId)
    if (site) site.soldKw = (site.soldKw ?? 0) + p.kw
    state.cash += priceUsd
    repayProjectFacilities(state, p.id)
    p.stage = 'sold'
    p.soldQuarter = state.quarter
    logEntry(state, 'log.rescue_sale', {
      n: p.n,
      priceUsd,
      shortUsd,
    })
    return 'sale'
  }
  // 2. An emergency raise at half the valuation, at most 30% dilution.
  const pre = equityPreMoneyUsd(state) * r.equityPriceMult
  if (pre > 0) {
    const d = shortUsd / (pre + shortUsd)
    if (d <= r.maxDilution) {
      const amountUsd = Math.ceil((pre * d) / (1 - d))
      state.cash += amountUsd
      state.founderStake *= 1 - d
      logEntry(state, 'log.rescue_equity', {
        amountUsd,
        dilutionPct: d,
        stakePct: state.founderStake,
      })
      return 'equity'
    }
  }
  return null
}
