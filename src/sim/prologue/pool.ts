// Your own bitcoin pool (M69.3, doc 51 v1.1 §3; pools_player.json): from 2011Q2, with a home rig or better, the player opens a
// pool. Outside miners point their machines at it in proportion to the small-pool share of the network, the pool's pull
// (fee against the median fee, luck, reputation, churn) and a few risks. Blocks are drawn each week (Poisson, on the pool's own
// seeded stream) from the pool's total hashrate. PPLNS pays outside miners only when blocks are found; PPS pays them the
// expected value, so the operator keeps the variance. The operator's income (the fee, or blocks less payouts) and the
// player's own rigs' share land in the wallet like mined coins; the server bill, the protection bill and a theft come out of cash.
// An open pool is sold automatically at the handover. Nothing here runs, and no state is created, in a game that never opens one.
import { CONTENT, quarterIndex } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, uniform } from '../rng.ts'
import { logEntry, type GameState } from '../state.ts'
import { accrue, book, roundCash } from '../ledger.ts'
import { marketWeek } from '../systems/market.ts'
import { usedKw } from '../systems/sites.ts'
import { P, byYear, poisson, rentUsdQ, rollStream, sitePowerUsdKwh } from './setup.ts'
import type { OwnPool, PoolReport } from './types.ts'

const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})
const PL = () => CONTENT.prologue.pool!
const nums = (r: Record<string, { value: number }>): Record<string, number> =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.value]))
const clampRep = (x: number) => Math.min(100, Math.max(0, x))

export const hasPool = (s: GameState): boolean => !!s.prologue?.ownPool

/** Is the pool feature in this build and open to you now: 2011Q2 on, with a home rig or better. */
export function poolUnlocked(s: GameState): boolean {
  const f = CONTENT.prologue.pool
  return !!f && label(s.quarter) >= f.unlock.quarter && s.sites.some((x) => x.tier !== 'bedroom')
}

export const medianFee = (quarter: number): number => {
  const v = PL().outside_miners.median_fee_by_year
  return byYear(
    Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'number')) as Record<string, number>,
    quarter,
  )
}
const smallShare = (q: number) => byYear(nums(PL().outside_miners.small_pool_share_by_year), q)
const orphanRate = (q: number) => byYear(PL().risks_per_quarter.orphan_rate.value, q)
export const serverBill = (q: number) => byYear(nums(PL().server_bill_usd_quarter), q)
export const protectionBill = (q: number) => byYear(nums(PL().ddos_protection.usd_quarter), q)

export const feeRange = (method: 'PPLNS' | 'PPS'): [number, number] => PL().payout_methods[method].fee_range

/** The fee in force this quarter (a boycott card may hold it at 0 for two quarters). */
export const currentFee = (pool: OwnPool, quarter: number): number =>
  pool.feeOverride && quarter <= pool.feeOverride.until ? pool.feeOverride.fee : pool.feePct

function weekRow(s: GameState, week = 0) {
  return marketWeek(s.quarter, week)
}

/** The cash a PPS pool must hold: 3 x sqrt(blocks expected a week) block rewards at this quarter's first week. */
export function poolReserveUsd(s: GameState): number {
  const pool = s.prologue!.ownPool
  const w = weekRow(s)
  const perBlock = w.btc_block_subsidy / Math.max(0.01, 1 - w.btc_fee_share)
  const netTh = w.btc_hashrate_EHs * 1e6
  const outside = pool ? netTh * smallShare(s.quarter) * pool.pull : netTh * smallShare(s.quarter) * PL().outside_miners.start_pull.value
  const blocks = Math.max(0, (outside / (netTh || 1)) * P().blocks_per_week)
  return 3 * Math.sqrt(blocks) * perBlock * w.btc_usd
}

// ---------- actions ----------

function checkFee(method: 'PPLNS' | 'PPS', fee: number): Message | undefined {
  const [lo, hi] = feeRange(method)
  return fee >= lo - 1e-12 && fee <= hi + 1e-12 ? undefined : fail('error.p0_pool_fee', { method, lo, hi })
}

export function openPool(s: GameState, method: 'PPLNS' | 'PPS', fee: number): Message | undefined {
  const p = s.prologue!
  if (!CONTENT.prologue.pool || !poolUnlocked(s)) return fail('error.p0_pool_locked', { quarter: PL().unlock.quarter })
  if (p.ownPool) return fail('error.p0_pool_open_already')
  const bad = checkFee(method, fee)
  if (bad) return bad
  const bw = PL().open_action.bandwidth
  if (s.bandwidth < bw) return fail('error.no_bandwidth', { needed: bw, have: s.bandwidth })
  const cost = PL().open_action.setup_cash_usd.value
  if (s.cash < cost) return fail('error.no_cash', { costUsd: cost, cashUsd: s.cash })
  if (method === 'PPS' && s.cash - cost < poolReserveUsd(s)) return fail('error.p0_pps_reserve')
  s.bandwidth -= bw
  book(s, 'one_offs', -cost)
  roundCash(s)
  p.ownPool = {
    name: PL().names.default_pool_name,
    method,
    feePct: fee,
    openedQuarter: s.quarter,
    coldStorage: false,
    protectionFrom: null,
    reputation: PL().outside_miners.reputation.start,
    pull: PL().outside_miners.start_pull.value,
    luck: [],
    unluckyRun: 0,
    feeOverride: null,
    boycott: null,
    incident: false,
    outsideTh: 0,
    lastBlocks: 0,
    feeUsdQuarters: [],
    quarter: { feeUsd: 0, paidMinersUsd: 0, billsUsd: 0, ownBtc: 0, operatorBtc: 0, blocks: 0 },
    crunchQuarter: null,
  }
  delete p.poolEnded
  logEntry(s, 'log.p0_pool_opened', { name: p.ownPool.name, method, feePct: fee })
  return undefined
}

export function setPoolSettings(s: GameState, method: 'PPLNS' | 'PPS', fee: number): Message | undefined {
  const pool = s.prologue!.ownPool
  if (!pool) return fail('error.p0_pool_none')
  const bad = checkFee(method, fee)
  if (bad) return bad
  const bw = PL().change_settings_bandwidth
  if (s.bandwidth < bw) return fail('error.no_bandwidth', { needed: bw, have: s.bandwidth })
  if (method === 'PPS' && pool.method !== 'PPS' && s.cash < poolReserveUsd(s)) return fail('error.p0_pps_reserve')
  s.bandwidth -= bw
  pool.method = method
  pool.feePct = fee
  pool.feeOverride = null
  logEntry(s, 'log.p0_pool_settings', { method, feePct: fee })
  return undefined
}

export function buyProtection(s: GameState): Message | undefined {
  const pool = s.prologue!.ownPool
  if (!pool) return fail('error.p0_pool_none')
  if (label(s.quarter) < PL().ddos_protection.available_from)
    return fail('error.p0_not_yet', { quarter: PL().ddos_protection.available_from })
  if (pool.protectionFrom !== null) return fail('error.p0_pool_have_it')
  const bw = PL().ddos_protection.action_bandwidth
  if (s.bandwidth < bw) return fail('error.no_bandwidth', { needed: bw, have: s.bandwidth })
  s.bandwidth -= bw
  pool.protectionFrom = s.quarter + 1
  logEntry(s, 'log.p0_pool_protection', { usd: protectionBill(s.quarter) })
  return undefined
}

export function buyColdStorage(s: GameState): Message | undefined {
  const pool = s.prologue!.ownPool
  if (!pool) return fail('error.p0_pool_none')
  if (pool.coldStorage) return fail('error.p0_pool_have_it')
  const bw = PL().cold_storage.action_bandwidth
  if (s.bandwidth < bw) return fail('error.no_bandwidth', { needed: bw, have: s.bandwidth })
  s.bandwidth -= bw
  pool.coldStorage = true
  logEntry(s, 'log.p0_pool_cold')
  return undefined
}

/** What the pool sells for: its last four quarters of fee income x the multiple. */
export function poolSalePriceUsd(pool: OwnPool): number {
  return pool.feeUsdQuarters.slice(-4).reduce((a, b) => a + b, 0) * PL().sale.multiple.value
}

export const poolSaleOpen = (s: GameState): boolean => label(s.quarter) >= PL().sale.from_quarter

export function sellPool(s: GameState, kind: 'sold' | 'handover' = 'sold'): Message | undefined {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return fail('error.p0_pool_none')
  if (kind === 'sold' && !poolSaleOpen(s)) return fail('error.p0_not_yet', { quarter: PL().sale.from_quarter })
  const usd = poolSalePriceUsd(pool)
  book(s, 'asset_sales', usd)
  roundCash(s)
  p.poolEnded = { name: pool.name, quarter: s.quarter, usd, kind }
  delete p.ownPool
  logEntry(s, 'log.p0_pool_sold', { name: pool.name, valueUsd: usd })
  return undefined
}

export function closePool(s: GameState): Message | undefined {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return fail('error.p0_pool_none')
  p.poolEnded = { name: pool.name, quarter: s.quarter, usd: 0, kind: 'closed' }
  delete p.ownPool
  logEntry(s, 'log.p0_pool_closed', { name: pool.name })
  return undefined
}

// ---------- the week ----------

/** Is the 2014 boycott's bonus open to the pool this week: its window, a fee at or below the median, reputation 50 or more. */
function boycottOpen(s: GameState, pool: OwnPool): boolean {
  const b = pool.boycott
  return !!b && s.quarter >= b.from && s.quarter <= b.until && currentFee(pool, s.quarter) <= medianFee(s.quarter) + 1e-12 && pool.reputation >= 50
}

/**
 * The June 2014 bump to the small-pool share, in percentage points, for the week starting `weekDate` (an ISO date): the table's
 * points (week 1, 4, 8) with straight lines between, then a lasting bump to the end of that year, nothing before it or after.
 */
export function boycottBumpPp(weekDate: string): number {
  const B = PL().boycott_2014
  const start = Date.parse(B.start_week)
  const k = Math.floor((Date.parse(weekDate) - start) / (7 * 86400000)) + 1
  if (k < 1 || weekDate.slice(0, 4) !== B.start_week.slice(0, 4)) return 0
  const pts = Object.entries(B.small_pool_share_bump_pp_by_week.value)
    .map(([w, v]) => [Number(w), v] as const)
    .sort((a, b) => a[0] - b[0])
  if (k >= pts[pts.length - 1][0]) return k === pts[pts.length - 1][0] ? pts[pts.length - 1][1] : B.lasting_bump_pp.value
  for (let i = 0; i + 1 < pts.length; i++) {
    const [w0, v0] = pts[i]
    const [w1, v1] = pts[i + 1]
    if (k >= w0 && k <= w1) return v0 + ((v1 - v0) * (k - w0)) / (w1 - w0)
  }
  return pts[0][1]
}

/**
 * One week of the pool. `ownTh` is the TH/s of your own bitcoin rigs (they mine in your pool, with no fee). Returns the coins that
 * land in your wallet this week (your own share plus the operator's fee or net); a negative net (a PPS payout beyond the blocks
 * found) is paid here, from the wallet's coins and then from cash.
 */
export function ownPoolWeek(s: GameState, ownTh: number, perBlock: number, weekNo: number): number {
  const p = s.prologue!
  const pool = p.ownPool!
  const w = marketWeek(s.quarter, s.week)
  const netTh = w.btc_hashrate_EHs * 1e6 // (the network without you, as solo mining counts it)
  // (doc 51 v1.4 §14 decision 7: the June 2014 outflow from the biggest pool lifts the small-pool share week by week)
  const bump = boycottOpen(s, pool) ? boycottBumpPp(w.week) / 100 : 0
  const outsideTh = netTh * (smallShare(s.quarter) + bump) * pool.pull
  pool.outsideTh = outsideTh
  const total = ownTh + outsideTh
  if (total <= 0 || w.btc_usd <= 0) return 0
  const orphan = orphanRate(s.quarter)
  const denom = ownTh + netTh || 1
  const lam = (total / denom) * P().blocks_per_week * (1 - orphan)
  const blocks = poisson(rollStream(s.seed, `ownpool:${s.quarter}:${s.week}`), lam)
  const outFrac = outsideTh / total
  const reward = blocks * perBlock
  const fee = currentFee(pool, s.quarter)
  const ownBtc = reward * (1 - outFrac)
  let operator: number
  let feeBtc: number
  let paidBtc: number
  if (pool.method === 'PPLNS') {
    paidBtc = reward * outFrac * (1 - fee)
    feeBtc = reward * outFrac * fee
    operator = feeBtc
  } else {
    const expBlocks = (outsideTh / denom) * P().blocks_per_week * (1 - orphan)
    paidBtc = expBlocks * perBlock * (1 - fee)
    feeBtc = expBlocks * perBlock * fee
    operator = reward * outFrac - paidBtc
  }
  pool.lastBlocks = blocks
  pool.quarter.blocks += blocks
  pool.quarter.feeUsd += feeBtc * w.btc_usd
  pool.quarter.paidMinersUsd += paidBtc * w.btc_usd
  pool.quarter.ownBtc += ownBtc
  pool.quarter.operatorBtc += operator
  // luck: the last 4 weeks; an unlucky week (under half the blocks a week of this size should find) in a run under PPLNS starts a slide after 3
  pool.luck.push({ found: blocks, expected: lam })
  if (pool.luck.length > PL().outside_miners.luck_memory_weeks.value) pool.luck.shift()
  if (lam >= 1 && blocks < 0.5 * lam) pool.unluckyRun++
  else pool.unluckyRun = 0
  if (pool.method === 'PPLNS' && pool.unluckyRun > 3) pool.pull *= 0.85
  // the PPS crunch card: cash under the reserve (once a quarter)
  if (pool.method === 'PPS' && pool.crunchQuarter !== s.quarter && s.cash < poolReserveUsd(s)) {
    pool.crunchQuarter = s.quarter
    p.cardQueue.push({ id: 'pool_pps_crunch', week: weekNo })
  }
  const net = ownBtc + operator
  if (net >= 0) {
    // (PPS with no cash left, whatever drained it: the pool closes)
    if (pool.method === 'PPS' && s.cash < 0) {
      closeInsolvent(s, weekNo)
      return 0
    }
    return net
  }
  // a PPS payout beyond what the blocks brought: coins from the wallet first, then cash at the week's price
  const need = -net
  const wallet = Math.max(0, s.treasury.BTC - p.onExchange.BTC)
  const fromWallet = Math.min(need, wallet)
  if (fromWallet > 0) {
    s.treasury.BTC -= fromWallet
    accrue(s, 'mining_btc', -fromWallet * w.btc_usd)
  }
  const usd = (need - fromWallet) * w.btc_usd
  if (usd > 0) {
    // (doc 51 v1.4 §15 decision 5: what the pool owes its miners comes out of your cash only down to one quarter of your committed
    // costs; the rest is written off, the pool closes and the chapter report says its miners went unpaid. The game goes on.)
    const pay = Math.min(usd, Math.max(0, s.cash - committedCostsUsd(s)))
    if (pay > 0) book(s, 'other_opex', -pay)
    roundCash(s)
    if (pay < usd - 1e-9) closeInsolvent(s, weekNo, usd - pay)
  }
  return 0
}

/** One quarter of your committed costs (doc 51 v1.4 §15 decision 5): rent once moved out, the power your machines draw, the pool's server bill and its protection. */
export function committedCostsUsd(s: GameState): number {
  const p = s.prologue!
  const power = s.sites.reduce((a, site) => a + usedKw(s, site.id) * sitePowerUsdKwh(s, site) * 24 * 7 * 13, 0)
  const pool = p.ownPool
  const protectedNow = !!pool && pool.protectionFrom !== null && s.quarter >= pool.protectionFrom
  return (p.livingAtHome ? 0 : rentUsdQ(s.quarter)) + power + serverBill(s.quarter) + (protectedNow ? protectionBill(s.quarter) : 0)
}

/** A PPS pool that has run out of money (doc 51 v1.2 §13): it closes and sells for nothing; the chapter report says so. The game goes on. */
function closeInsolvent(s: GameState, weekNo: number, unpaidUsd = 0): void {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return
  p.poolEnded = { name: pool.name, quarter: s.quarter, usd: 0, kind: 'insolvent', ...(unpaidUsd > 0 ? { unpaidUsd } : {}) }
  delete p.ownPool
  logEntry(s, 'log.p0_pool_insolvent', { name: pool.name }, weekNo)
}

// ---------- the quarter ----------

/** This quarter's pool risks, rolled as the live quarter starts (each on its own stream): a DDoS, a theft. Queues the cards. */
export function poolRiskCards(s: GameState): void {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return
  const R = PL().risks_per_quarter
  const [w0, w1] = CONTENT.prologue.events.random_week_range
  const protectedNow = pool.protectionFrom !== null && s.quarter >= pool.protectionFrom
  const hits: [string, number][] = [
    ['pool_ddos', R.ddos.value * (protectedNow ? 0.5 : 1)],
    ['pool_theft', pool.coldStorage ? R.hot_wallet_theft_with_cold_storage.value : R.hot_wallet_theft.value],
  ]
  for (const [id, chance] of hits) {
    const r = rollStream(s.seed, `ownpool_risk:${s.quarter}:${id}`)
    const roll = uniform(r, 0, 1)
    const week = randomInt(r, w0, w1)
    if (roll < chance) p.cardQueue.push({ id, week })
  }
}

/** The quarter's end: bills, the pull's move, reputation, the fee history; an open pool is sold in the handover quarter. */
export function poolQuarterEnd(s: GameState): PoolReport | undefined {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return undefined
  const O = PL().outside_miners
  const bills = serverBill(s.quarter) + (pool.protectionFrom !== null && s.quarter >= pool.protectionFrom ? protectionBill(s.quarter) : 0)
  book(s, 'other_opex', -bills)
  pool.quarter.billsUsd = bills
  // new miners find a pool in proportion to how cheap, lucky and trusted it is; some leave each quarter
  const found = pool.luck.reduce((a, l) => a + l.found, 0)
  const expected = pool.luck.reduce((a, l) => a + l.expected, 0)
  const luckFactor = pool.method === 'PPLNS' && expected > 0 ? Math.min(1.5, Math.max(0.5, found / expected)) : 1
  const feeFactor = Math.max(0, 1 + O.fee_elasticity_per_pp.value * (currentFee(pool, s.quarter) - medianFee(s.quarter)) * 100)
  const repMult = 0.5 + pool.reputation / 100
  pool.pull = pool.pull * (1 - O.base_churn_quarter.value) + O.start_pull.value * feeFactor * repMult * luckFactor
  if (!pool.incident) pool.reputation = clampRep(pool.reputation + 5)
  pool.incident = false
  pool.feeUsdQuarters.push(pool.quarter.feeUsd)
  if (pool.feeOverride && s.quarter >= pool.feeOverride.until) pool.feeOverride = null
  // the quarter's figures go to the report; a fresh quarter starts
  const report: PoolReport = { ...pool.quarter, outsideTh: pool.outsideTh, reputation: pool.reputation }
  pool.quarter = { feeUsd: 0, paidMinersUsd: 0, billsUsd: 0, ownBtc: 0, operatorBtc: 0, blocks: 0 }
  if (s.quarter >= CONTENT.acts.find((a) => a.act === 0)!.lastQuarter) sellPool(s, 'handover')
  return report
}

// ---------- cards ----------

/** A pool card's answer. */
export function applyPoolEffect(
  s: GameState,
  fx: {
    outage?: boolean
    buy_ddos_protection?: boolean
    theft?: boolean
    repay_from_cash?: boolean
    reputation?: number
    set_method?: 'PPLNS' | 'PPS'
    fee_override?: number
    duration_quarters?: number
    boycott_eligible?: boolean | 'if_fee_at_or_below_median'
    sell?: boolean
  },
): void {
  const p = s.prologue!
  const pool = p.ownPool
  if (!pool) return
  if (fx.outage) {
    pool.reputation = clampRep(pool.reputation - 15)
    pool.pull *= 1 - PL().risks_per_quarter.ddos_outside_hashrate_loss.value
    pool.incident = true
  }
  if (fx.buy_ddos_protection && label(s.quarter) >= PL().ddos_protection.available_from && pool.protectionFrom === null)
    pool.protectionFrom = s.quarter + 1
  if (fx.theft) {
    pool.incident = true
    // one week of outside miners' payouts is gone (under PPS you still owe it)
    const weekly = pool.quarter.paidMinersUsd / Math.max(1, s.week)
    if (fx.repay_from_cash) {
      const pay = Math.min(weekly, Math.max(0, s.cash))
      book(s, 'other_opex', -pay)
      roundCash(s)
    }
  }
  if (fx.reputation) pool.reputation = clampRep(pool.reputation + fx.reputation)
  if (fx.set_method) {
    pool.method = fx.set_method
    const [lo, hi] = feeRange(fx.set_method)
    pool.feePct = Math.min(hi, Math.max(lo, pool.feePct))
  }
  if (fx.fee_override !== undefined && fx.duration_quarters)
    pool.feeOverride = { fee: fx.fee_override, until: s.quarter + fx.duration_quarters - 1 }
  if (fx.boycott_eligible !== undefined) {
    const year = PL().boycott_2014.start_week.slice(0, 4)
    pool.boycott = { from: quarterIndex(`${year}Q2`)!, until: quarterIndex(`${year}Q4`)! }
  }
  if (fx.sell) sellPool(s, 'sold')
}
