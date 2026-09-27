// Read-only views of the prologue for the screens (Alpha 0.3 §2.13). The UI shows these and
// dispatches actions; it works out no rules of its own.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import type { GameState } from '../state.ts'
import { buyPrice, getModel, marketWeek } from '../systems/market.ts'
import { saleValueUsd } from '../systems/machines.ts'
import { walletCoins } from './engine.ts'
import {
  P,
  householdTier,
  isDecisionQuarter,
  netWorthUsd,
  poolFee,
  poolsOpen,
  siteCapacityKw,
  siteLoadKw,
} from './setup.ts'
import { p0BuyBlocker } from './actions.ts'

const label = (q: number) => CONTENT.quarters[q] ?? ''

/** The market week the player is looking at: week 1 in the Plan phase, else the last played. */
function nowWeek(state: GameState) {
  const w = Math.min(Math.max(state.week - 1, 0), BALANCE.weeksPerQuarter - 1)
  return marketWeek(state.quarter, state.phase === 'plan' ? 0 : w)
}

/**
 * Solo odds in words (scope §2.6): your expected blocks a week at this week's network, as
 * "about N blocks a week", "about 1 block every N weeks" or "… every N years".
 */
export function soloOdds(state: GameState): {
  blocksPerWeek: number
  words: Message
} {
  const w = nowWeek(state)
  const netTh = w.btc_hashrate_EHs * 1e6
  let myTh = 0
  for (const lot of state.machines) {
    const m = getModel(lot.model)!
    if (m.coin === 'BTC') myTh += (lot.count - lot.failed) * m.hashrate
  }
  const lambda = (myTh / (myTh + netTh || 1)) * P().blocks_per_week
  let words: Message
  if (lambda <= 0) words = { key: 'ui.p0.odds.none' }
  else if (lambda >= 1)
    words = { key: 'ui.p0.odds.per_week', params: { n: Math.round(lambda) } }
  else if (1 / lambda < 52)
    words = { key: 'ui.p0.odds.weeks', params: { n: Math.round(1 / lambda) } }
  else
    words = {
      key: 'ui.p0.odds.years',
      params: { n: Math.max(1, Math.round(1 / lambda / 52)) },
    }
  return { blocksPerWeek: lambda, words }
}

/** Everything the prologue's screens show about the company now. */
export function prologueView(state: GameState) {
  const p = state.prologue!
  const w = nowWeek(state)
  const q = state.quarter
  return {
    quarter: label(q),
    decision: isDecisionQuarter(q),
    /** This live quarter auto-plays (no Plan phase was held for it). */
    autoPlay:
      state.phase === 'live' &&
      !isDecisionQuarter(q) &&
      !p.flags.includes('planned_now'),
    turn: q - CONTENT.acts.find((a) => a.act === 0)!.firstQuarter + 1,
    turns: -CONTENT.acts.find((a) => a.act === 0)!.firstQuarter,
    btcUsd: w.btc_usd,
    ethUsd: w.eth_usd,
    difficultyT: w.btc_difficulty_T,
    subsidy: w.btc_block_subsidy,
    cash: state.cash,
    bandwidth: state.bandwidth,
    treasury: { ...state.treasury },
    onExchange: { ...p.onExchange },
    wallet: { BTC: walletCoins(state, 'BTC'), ETH: walletCoins(state, 'ETH') },
    sellQueue: { ...p.sellQueue },
    moving: p.moves.map((m) => ({ ...m })),
    minedTo: p.minedTo,
    hodlPct: { ...state.hodlPct },
    backup: p.backup,
    livingAtHome: p.livingAtHome,
    patience: p.livingAtHome ? p.patience : null,
    pool: p.pool,
    poolsOpen: poolsOpen(q),
    poolFeePct: poolFee(q),
    solo: soloOdds(state),
    netWorthUsd: netWorthUsd(state, w),
    mined: { ...p.mined },
    blocksFound: p.blocksFound,
    lost: structuredClone(p.lost),
    sites: state.sites.map((site) => ({
      site,
      household: !!householdTier(site.tier),
      capacityKw: siteCapacityKw(site),
      loadKw: siteLoadKw(state, site.id),
      thresholdKw: householdTier(site.tier)?.household_threshold_kw ?? null,
      lots: state.machines
        .filter((l) => l.siteId === site.id)
        .map((lot) => ({
          lot,
          sellUsd: saleValueUsd(lot, lot.count, q),
        })),
    })),
    lastReport: p.reports.at(-1) ?? null,
  }
}

/** The prologue's buy menu: machines on sale now, new and used, with their price and why not. */
export function prologueBuyView(state: GameState, siteId: string) {
  return CONTENT.prologue.machines
    .filter((m) => !P().not_for_sale.includes(m.id))
    .flatMap((m) =>
      (['new', 'used'] as const).map((condition) => {
        const unitUsd = buyPrice(m, state.quarter, condition)
        return {
          model: m,
          condition,
          unitUsd,
          blocker:
            unitUsd === undefined
              ? null
              : (p0BuyBlocker(state, {
                  type: 'P0_BUY',
                  model: m.id,
                  condition,
                  count: 1,
                  siteId,
                }) ?? null),
        }
      }),
    )
    .filter((x) => x.unitUsd !== undefined)
}

/** This quarter's news headlines (p0.news.<quarter>.<n>). */
export function prologueNews(state: GameState): string[] {
  const q = label(state.quarter)
  const keys: string[] = []
  for (let i = 0; i < 6; i++) keys.push(`p0.news.${q}.${i}`)
  return keys
}
