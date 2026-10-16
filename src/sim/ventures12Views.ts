// The Ventures tab in Acts I-II (M78.3; doc 58 v1.1 §4): read-only views of Larkspur Silicon and of what each GPU lot can do after the
// Merge. Lives apart from selectors.ts like the other venture views. Shows only what has happened: never the start-up's outcome
// before the tape-out quarter is over, and nothing from a draw.
import { CONTENT, type MarketWeek } from '../content/index.ts'
import type { GameState } from './state.ts'
import { isLkModel, lotPlan, afterMergeOpen, canMineAlt, canRent, type AltCoinId } from './systems/afterMerge.ts'
import {
  larkspurAvailable,
  larkspurBuyBlocker,
  larkspurCanPickMemory,
  larkspurCallBlocker,
  larkspurCostUsd,
  larkspurDiscountedUsd,
  larkspurDraws,
  larkspurJoinBlocker,
  larkspurMaxReserveUnits,
  larkspurOpen,
  larkspurReserveBlocker,
  larkspurSaleOpen,
  larkspurSaleValueUsd,
  larkspurSellBlocker,
  larkspurSale,
  larkspurThirdUsd,
  larkspurValueUsd,
  lkPriceUsd,
} from './systems/larkspur.ts'
import { getModel, marketWeek, scenarioOf } from './systems/market.ts'
import { saleValueUsd } from './systems/machines.ts'
import { powerPriceUsdKwh } from './systems/sites.ts'

const qIndex = (label: string): number => CONTENT.quarters.indexOf(label)

export type LarkspurStatus = 'unseen' | 'raising' | 'taped_out' | 'first_units' | 'volume' | 'closed'

/** Where the start-up stands as the world sees it: only milestones already behind us. */
function larkspurStatus(state: GameState): LarkspurStatus {
  const f = CONTENT.larkspur!
  if (state.act !== 1 && state.act !== 2) return 'unseen'
  if (state.act === 1 && state.quarter < qIndex(f.offer.news_quarter)) return 'unseen'
  const d = larkspurDraws(state)
  if (state.quarter > d.tape && d.outcome !== 'ships') return 'closed'
  if (state.quarter >= d.volume) return 'volume'
  if (state.quarter >= d.first) return 'first_units'
  if (state.quarter > d.tape || (state.quarter === d.tape && state.phase !== 'plan')) return 'taped_out'
  return 'raising'
}

/** Larkspur's panel: the offer, your stake, the open call, the reservation, the sale and the stake's value. Null without the files. */
export function larkspurView(state: GameState) {
  if (!larkspurAvailable()) return null
  const f = CONTENT.larkspur!
  const l = state.larkspur
  const status = larkspurStatus(state)
  const visible = status !== 'unseen' || !!l
  if (!visible) return null
  const sale = larkspurSale(state)
  const reserveUnitsMax = l && l.stake > 0 && !l.ended ? larkspurMaxReserveUnits(l.stake) : 0
  return {
    status,
    budgetUsd: f.offer.budget_usd,
    stakes: f.offer.stakes.map((stake) => ({
      stake,
      thirdUsd: larkspurThirdUsd(stake),
      totalUsd: larkspurThirdUsd(stake) * 3,
      blocker: larkspurJoinBlocker(state, stake) ?? null,
    })),
    offerOpen: larkspurOpen(state),
    joinWindow: [f.offer.join_from, f.offer.join_to] as const,
    pitched: { tapeOut: f.milestones.tape_out, firstUnits: f.milestones.first_units, volume: f.milestones.volume },
    lk5Usd: lkPriceUsd('lk5', Math.max(state.quarter, qIndex('2021Q4'))),
    lk6Usd: lkPriceUsd('lk6', Math.max(state.quarter, qIndex('2021Q4'))),
    wall: f.memory.walls,
    stake: l
      ? {
          share: l.stake,
          shareAtJoin: l.stakeAtJoin,
          paidUsd: l.paidUsd,
          valueUsd: larkspurValueUsd(state),
          walked: !!l.walked,
          ended: l.ended ?? null,
          proceedsUsd: l.proceedsUsd ?? null,
          resolvedUsd: l.resolvedUsd ?? null,
          memory: l.memory ?? null,
        }
      : null,
    call: l?.call
      ? {
          kind: l.call.kind,
          dueUsd: l.call.dueUsd,
          canPickMemory: l.call.kind === 'tape_out' && larkspurCanPickMemory(l),
          payBlocker: larkspurCallBlocker(state, 'pay') ?? null,
        }
      : null,
    reservation: l?.reservation ?? null,
    // M80.1: selling the stake before the Merge: the value each quarter, the window, the half-sale used or not
    stakeSale: l
      ? {
          open: larkspurSaleOpen(state),
          valueUsd: larkspurSaleValueUsd(state),
          halfUsed: !!l.soldHalf,
          soldUsd: l.saleUsd ?? 0,
          bandwidth: f.sale.bandwidth,
          blocker: (kind: 'all' | 'half') => larkspurSellBlocker(state, kind) ?? null,
        }
      : null,
    reserve: l
      ? {
          maxUnits: reserveUnitsMax,
          depositPerUnitUsd: larkspurDiscountedUsd(l.memory ?? f.memory.default, state.quarter) * f.reservation.deposit_share,
          blocker: (units: number) => larkspurReserveBlocker(state, units) ?? null,
        }
      : null,
    sale: sale
      ? {
          model: sale.model,
          listUsd: sale.listUsd,
          discountedUsd: sale.discountedUsd,
          inWindow: sale.inWindow,
          marketOpen: sale.marketOpen,
          reservedLeft: sale.reservedLeft,
          costUsd: (count: number) => larkspurCostUsd(state, count),
          blocker: (count: number, siteId: string) => larkspurBuyBlocker(state, count, siteId) ?? null,
        }
      : null,
    lots: state.machines.filter((m) => isLkModel(m.model)).map((m) => ({ lotId: m.id, model: m.model, count: m.count, siteId: m.siteId })),
  }
}

export interface UseOption {
  use: 'own' | AltCoinId | 'rent'
  grossQuarterUsd: number
  powerQuarterUsd: number
  netQuarterUsd: number
}

/**
 * Each GPU lot after the Merge, side by side (doc 58 §3.3): sell it now, or earn per quarter from its own coin (nothing after the Merge),
 * an alternative coin or rental, at this quarter's first week and the lot's site power price. Larkspur units are listed too, fixed on
 * Ethereum Classic.
 */
export function lotChoices(state: GameState) {
  if (!CONTENT.afterMerge) return []
  const w: MarketWeek = marketWeek(state.quarter, 0, scenarioOf(state))
  const out = []
  for (const lot of state.machines) {
    const model = getModel(lot.model)
    if (!model || model.coin !== 'ETH' || lot.legacyCloud) continue
    const site = state.sites.find((s) => s.id === lot.siteId)
    if (!site) continue
    const lk = isLkModel(model.id)
    const price = powerPriceUsdKwh(site, state.quarter, scenarioOf(state))
    const working = lot.count - lot.failed
    const option = (use: UseOption['use']): UseOption => {
      const probe = { ...lot, use: use === 'own' ? undefined : use }
      const plan = use === 'own' ? undefined : lotPlan(probe, model, w.week)
      const perDay = plan ? plan.revenuePerUnitDay : model.hashrate * w.eth_rev_usd_mh_day
      const gross = working * perDay * 91
      const power = working * model.power_kw * 24 * 91 * (plan ? plan.powerShare : 1) * price
      return { use, grossQuarterUsd: gross, powerQuarterUsd: power, netQuarterUsd: gross - power }
    }
    const uses: UseOption['use'][] = ['own']
    for (const c of ['etc', 'rvn', 'erg'] as const) if (canMineAlt(model, c) && !lk) uses.push(c)
    if (canRent(model) && !lk) uses.push('rent')
    out.push({
      lotId: lot.id,
      model: model.id,
      count: lot.count,
      failed: lot.failed,
      siteId: lot.siteId,
      current: lk ? ('etc' as const) : (lot.use ?? 'own'),
      fixed: lk,
      open: afterMergeOpen(state),
      saleUsd: saleValueUsd(lot, lot.count, state.quarter, scenarioOf(state)),
      options: lk ? [option('etc')] : uses.map(option),
    })
  }
  return out
}

/** Whether the Ventures tab shows in Acts I-II: Larkspur is in the build and has been offered (2020Q2 on), through Act II. */
export function ventures12Visible(state: GameState): boolean {
  if (!larkspurAvailable()) return false
  if (state.act === 2) return true
  return state.act === 1 && state.quarter >= qIndex(CONTENT.larkspur!.offer.news_quarter)
}
