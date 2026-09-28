// Read-only views of the prologue for the screens (Alpha 0.3 §2.13). The UI shows these and
// dispatches actions; it works out no rules of its own.
import { BALANCE, CONTENT, actLastQuarter } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import type { Coin, GameState } from '../state.ts'
import { buyPrice, getModel, marketWeek } from '../systems/market.ts'
import { saleValueUsd } from '../systems/machines.ts'
import { capacityKw, powerPriceUsdKwh, usedKw } from '../systems/sites.ts'
import { handOverToAct1 } from './handover.ts'
import { movable, openOffers, sellable } from './custody.ts'
import { prologueNetWorth, walletCoins } from './engine.ts'
import {
  conferenceNow,
  moveBackBlocker,
  moveOutBlocker,
  smallUnitBlocker,
  usedOfferPrice,
} from './life.ts'
import {
  openVendors,
  preorderBlocker,
  preorderOdds,
  shipsQuarter,
} from './preorders.ts'
import {
  P,
  depositUsd,
  householdTier,
  isDecisionQuarter,
  netWorthUsd,
  poolFee,
  poolsOpen,
  rentUsdQ,
  sellCapUsdWeek,
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

/**
 * The Plan screen's market panel (wireframe P0-03): BTC's price and the difficulty at the end of each of
 * the last 4 quarters and now, with this week's change on the quarter before.
 */
export function prologueMarketView(state: GameState) {
  const now = nowWeek(state)
  const first = CONTENT.acts.find((a) => a.act === 0)!.firstQuarter
  const points: { btcUsd: number; difficulty: number }[] = []
  for (let k = 4; k >= 1; k--) {
    const q = state.quarter - k
    if (q < first) continue
    const w = marketWeek(q, BALANCE.weeksPerQuarter - 1)
    points.push({ btcUsd: w.btc_usd, difficulty: w.btc_difficulty_T * 1e12 })
  }
  points.push({ btcUsd: now.btc_usd, difficulty: now.btc_difficulty_T * 1e12 })
  const before = points.length > 1 ? points[points.length - 2] : null
  const change = (a: number, b: number | undefined) =>
    b !== undefined && b > 0 ? a / b - 1 : null
  return {
    points,
    btcUsd: now.btc_usd,
    /** The network's hashrate this week, in TH/s (what solo odds and pool shares are against). */
    networkTh: now.btc_hashrate_EHs * 1e6,
    difficulty: now.btc_difficulty_T * 1e12,
    btcChange: change(now.btc_usd, before?.btcUsd),
    difficultyChange: change(now.btc_difficulty_T * 1e12, before?.difficulty),
  }
}

/** What a pool would pay you a week at this week's network (BTC, after the fee), and a block's worth. */
export function poolWeekBtc(state: GameState): {
  btc: number
  perBlock: number
} {
  const w = nowWeek(state)
  const perBlock = w.btc_block_subsidy / Math.max(0.01, 1 - w.btc_fee_share)
  return {
    btc:
      soloOdds(state).blocksPerWeek * perBlock * (1 - poolFee(state.quarter)),
    perBlock,
  }
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

/** The Life section: the household, moving out, the small unit, conferences, vanity (scope §2.3, §2.11). */
export function prologueLifeView(state: GameState) {
  const p = state.prologue!
  const smallUnit = CONTENT.siteTiers.find((t) => t.id === 'small_unit')!
  const conference = conferenceNow(state)
  const usedPrice = usedOfferPrice(state)
  return {
    livingAtHome: p.livingAtHome,
    patience: p.patience,
    patienceMax: P().household.patience_start,
    drainPerQuarter: P().household.drain_per_quarter.value,
    cutBack: p.cutLoadUntil !== null && state.quarter <= p.cutLoadUntil,
    homeRig: {
      built: state.sites.some((s) => s.tier === 'home_rig'),
      costUsd: householdTier('home_rig')!.capex_usd,
      blocker: p.livingAtHome
        ? null
        : ({ key: 'error.p0_moved_out' } as Message),
    },
    moveOut: {
      depositUsd: depositUsd(state.quarter),
      rentUsdQ: rentUsdQ(state.quarter),
      blocker: moveOutBlocker(state) ?? null,
    },
    /** Moving back home (P5.0, P6): 1 BW; the income doesn't come back. */
    moveBack: {
      bandwidth: P().move_back.bandwidth,
      blocker: moveBackBlocker(state) ?? null,
    },
    movedBack: p.movedBack === true,
    smallUnit: {
      built: state.sites.some((s) => s.tier === 'small_unit'),
      capexUsd:
        typeof smallUnit.capex_usd === 'number' ? smallUnit.capex_usd : 0,
      rentUsdQ:
        typeof smallUnit.rent_usd_q === 'number' ? smallUnit.rent_usd_q : 0,
      blocker: smallUnitBlocker(state) ?? null,
    },
    conference: conference
      ? {
          id: conference.id,
          costUsd: conference.cost_usd,
          blocker:
            state.cash < conference.cost_usd
              ? ({
                  key: 'error.no_cash',
                  params: { costUsd: conference.cost_usd, cashUsd: state.cash },
                } as Message)
              : null,
        }
      : null,
    usedOffer:
      p.usedOffer && usedPrice !== undefined
        ? { model: p.usedOffer.model, priceUsd: usedPrice }
        : null,
    vanity: P().vanity.map((v) => ({
      id: v.id,
      costUsd: v.cost_usd,
      owned: p.vanity.includes(v.id),
    })),
    backup: p.backup,
    buildBandwidth: P().bandwidth_costs.build,
  }
}

/** The Wallet section: where your coins are, what's moving and what's for sale (scope §2.7, §2.8). */
export function prologueWalletView(state: GameState) {
  const p = state.prologue!
  const coins = (['BTC', 'ETH'] as const).map((coin) => ({
    coin,
    total: state.treasury[coin],
    wallet: walletCoins(state, coin),
    exchange: p.onExchange[coin],
    toExchange: p.moves
      .filter((m) => m.coin === coin && m.to === 'exchange')
      .reduce((n, m) => n + m.amount, 0),
    toWallet: p.moves
      .filter((m) => m.coin === coin && m.to === 'wallet')
      .reduce((n, m) => n + m.amount, 0),
    selling: p.sellQueue[coin],
    movableToExchange: movable(state, coin, 'exchange'),
    movableToWallet: movable(state, coin, 'wallet'),
    sellable: sellable(state, coin),
    keepPct: state.hodlPct[coin],
  }))
  return {
    coins,
    minedTo: p.minedTo,
    backup: p.backup,
    backupBandwidth: P().wallet_loss.backup_bandwidth,
    sellBandwidth: P().bandwidth_costs.sell,
    capUsdWeek: sellCapUsdWeek(state.quarter),
    /** Mt Gox by name until its collapse, then "an exchange" (scope §2.7). */
    exchangeName:
      label(state.quarter) < P().exchange.named_until ? 'gox' : 'generic',
    noSellingNow:
      p.noSellingUntil !== null &&
      state.quarter * BALANCE.weeksPerQuarter + state.week <= p.noSellingUntil,
    offers: openOffers(state),
  }
}

/** The pre-order cards open now (scope §2.9): vendor, price, when it ships on time, the odds. */
export function preorderMenuView(state: GameState) {
  const ships = shipsQuarter()
  return {
    /** When an on-time unit ships (every vendor's). */
    shipsQuarter: label(ships),
    vendors: openVendors(state).map((v) => ({
      id: v.id,
      model: v.model,
      priceUsd: v.price_usd,
      unitShare: v.unit_share,
      shipsQuarter: label(ships),
      odds: preorderOdds(state, v.id),
      lateQuarters: v.moderate_quarters,
      veryLateQuarters: v.severe_quarters,
      refundShare: v.refund_share,
      blocker: preorderBlocker(state, v.id) ?? null,
    })),
    orders: state.prologue!.preorders.map((o) => ({
      ...o,
      deliverLabel: o.deliverQuarter === null ? null : label(o.deliverQuarter),
    })),
  }
}

/**
 * The prologue's chapter report (scope §2.13 screen 6): net worth, coins mined, coins lost to
 * exchanges and to lost keys, and what the coins mined in 2010 would be worth at Act I's 2021 peak.
 */
export function prologueChapterView(state: GameState) {
  const p = state.prologue!
  const reports = p.reports
  const mined2010 = reports
    .filter((r) => r.quarter.startsWith('2010'))
    .reduce((n, r) => n + r.coinsMined.BTC, 0)
  let peak2021 = 0
  for (let q = 0; CONTENT.quarters[q] !== undefined; q++)
    if (CONTENT.quarters[q].startsWith('2021'))
      for (const w of CONTENT.market[q])
        peak2021 = Math.max(peak2021, w.btc_usd)
  const sold = reports.reduce((n, r) => n + r.soldUsd, 0)
  const lostGox = p.lost.exchange.BTC
  const lostWallet = p.lost.wallet.BTC
  const title =
    lostWallet > p.mined.BTC * 0.25
      ? 'lost_wallet'
      : lostGox > p.mined.BTC * 0.25
        ? 'hodler_lost_gox'
        : state.treasury.BTC < p.mined.BTC * 0.25
          ? 'sold_as_mined'
          : p.backup
            ? 'careful_hodler'
            : 'default'
  // The chapter report's breakdown (wireframe P0-07), at the prologue's last week like the net worth.
  const end = marketWeek(actLastQuarter(0), BALANCE.weeksPerQuarter - 1)
  const machinesUsd = state.machines.reduce(
    (usd, l) => usd + saleValueUsd(l, l.count, state.quarter),
    0,
  )
  const ledger = prologueLostLedger(state)
  const inRange = new Set(reports.map((r) => r.quarter))
  return {
    title,
    netWorthUsd: prologueNetWorth(state),
    breakdown: {
      btcPrice: end.btc_usd,
      btcUsd: state.treasury.BTC * end.btc_usd,
      ethUsd: state.treasury.ETH * end.eth_usd,
      cash: state.cash,
      machinesUsd,
      units: state.machines.reduce((n, l) => n + l.count, 0),
    },
    /** BTC mined, lost (each loss with its cause), kept; sold or spent is what's left of mined. */
    coinsFlow: {
      mined: p.mined.BTC,
      lost: ledger.totalBtc,
      losses: ledger.rows.filter((r) => r.coin === 'BTC'),
      kept: state.treasury.BTC,
      soldOrSpent: Math.max(
        0,
        p.mined.BTC - ledger.totalBtc - state.treasury.BTC,
      ),
    },
    /** Net worth at each quarter's end, for the log-scale career graph. */
    career: reports.map((r) => ({
      quarter: r.quarter,
      netWorthUsd: r.netWorthUsd,
    })),
    markers: P().career_markers.filter((m) => inRange.has(m.quarter)),
    cash: state.cash,
    treasury: { ...state.treasury },
    mined: { ...p.mined },
    blocksFound: p.blocksFound,
    soldUsd: sold,
    lost: structuredClone(p.lost),
    mined2010,
    peak2021Usd: peak2021,
    worth2021Usd: mined2010 * peak2021,
    vanity: [...p.vanity],
    preorders: p.preorders.map((o) => ({
      vendor: o.vendor,
      outcome: o.outcome,
    })),
    machines: state.machines.map((l) => ({ model: l.model, count: l.count })),
  }
}

/**
 * The handover (wireframe P0-08): what Act I starts with, previewed by running the handover on a
 * copy of the state (the real one runs on CONTINUE_TO_ACT_1), and a 2017 start to compare with.
 */
export function prologueHandoverView(state: GameState) {
  const s = structuredClone(state)
  handOverToAct1(s)
  const carry = s.prologueCarry!
  return {
    sites: s.sites.map((site) => ({
      tier: site.tier,
      capacityKw: capacityKw(site),
      usedKw: usedKw(s, site.id),
      powerUsdKwh: powerPriceUsdKwh(site, s.quarter),
    })),
    machines: s.machines.map((l) => ({ model: l.model, count: l.count })),
    machinesUsd: s.machines.reduce(
      (usd, l) => usd + saleValueUsd(l, l.count, s.quarter),
      0,
    ),
    cash: s.cash,
    treasury: { ...s.treasury },
    onExchange: { ...carry.onExchange },
    coinsUsd:
      s.treasury.BTC * marketWeek(0, 0).btc_usd +
      s.treasury.ETH * marketWeek(0, 0).eth_usd,
    startNetWorthUsd: carry.startNetWorthUsd,
    fresh: { cash: BALANCE.startCash, tier: P().handover.home_tiers_to },
  }
}

/** Coins & custody's history (wireframe P0-05): BTC in the wallet and on the exchange at each quarter end. */
export function prologueCoinsHistory(state: GameState) {
  return state.prologue!.reports.map((r) => ({
    quarter: r.quarter,
    wallet: Math.max(0, r.treasury.BTC - r.onExchange.BTC),
    exchange: r.onExchange.BTC,
  }))
}

/**
 * The lost-coins ledger (wireframe P0-05): every loss with its quarter, coins, cause and value at the
 * time (from the log: lost wallets, the Mt Gox collapse, the Bitfinex hack).
 */
export function prologueLostLedger(state: GameState) {
  const causes: Record<string, 'wallet' | 'gox' | 'bitfinex'> = {
    'log.p0_wallet_lost': 'wallet',
    'log.p0_gox_collapse': 'gox',
    'log.p0_bitfinex': 'bitfinex',
  }
  const rows = state.log
    .filter((e) => e.key in causes)
    .map((e) => {
      const coin = (e.params?.coin as Coin) ?? 'BTC'
      const amount = Number(e.params?.amount ?? 0)
      const w = marketWeek(e.quarter, Math.max(0, (e.week ?? 1) - 1))
      return {
        quarter: label(e.quarter),
        coin,
        amount,
        cause: causes[e.key],
        valueUsd: amount * (coin === 'BTC' ? w.btc_usd : w.eth_usd),
      }
    })
  return {
    rows,
    totalBtc: rows
      .filter((r) => r.coin === 'BTC')
      .reduce((n, r) => n + r.amount, 0),
  }
}

/** This quarter's news headlines (p0.news.<quarter>.<n>). */
export function prologueNews(state: GameState): string[] {
  const q = label(state.quarter)
  const keys: string[] = []
  for (let i = 0; i < 6; i++) keys.push(`p0.news.${q}.${i}`)
  return keys
}
