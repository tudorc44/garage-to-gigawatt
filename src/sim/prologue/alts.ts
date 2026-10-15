// Altcoins for old GPUs (M68.4, doc 51 v1.0 §5, doc 53 A1-A6): a GPU lot can mine Litecoin from 2011Q4 and Dogecoin from
// 2013Q4 (scrypt) instead of its own coin. Weekly income = units x the model's scrypt kH/s x that week's dollars per kH/s
// per day x 7, paid in coins at the week's price into your wallet (altcoins have no exchange: only your wallet, where the
// wallet-loss rule reaches them). From the week Dogecoin's merged mining starts, a lot on Litecoin also earns Dogecoin at
// the Dogecoin rate for the same work. Selling is limited by how thin these markets were: a week's sale is free up to
// 0.5% of the year's average daily volume, each further 0.5% costs 1% of the price, and 2% is the most a week can sell.
// The 2014Q3 card sells every scrypt GPU at the used price. At the handover the coins are sold over 2016Q4 within the
// limits; what is left converts at the last week's price x 0.9; no altcoin enters Act I.
// Nothing here runs, and no state is created, in a game that never points a lot at an altcoin (opt-out invariance).
import { CONTENT, type MarketWeek, type PrologueAltWeek } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type GameState, type MachineLot } from '../state.ts'
import { accrue, book, roundCash } from '../ledger.ts'
import { removeMachines } from '../systems/machines.ts'
import { getModel } from '../systems/market.ts'
import { P } from './setup.ts'
import { ALT_COINS, type AltAmounts, type AltCoin, type AltState } from './types.ts'

const EPS = 1e-9
const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})
const zero = (): AltAmounts => ({ LTC: 0, DOGE: 0 })

export const isAltCoin = (c: unknown): c is AltCoin => c === 'LTC' || c === 'DOGE'

/** The altcoin week for a prologue quarter index and week index (undefined without the files, or before any altcoin). */
export function altWeek(quarter: number, week: number): PrologueAltWeek | undefined {
  return CONTENT.prologue.alts?.weekly[quarter]?.[week]
}

let byDate: Map<string, PrologueAltWeek> | undefined
/** The altcoin week that starts on a market week's date (for the net worth at any week). */
export function altWeekOf(w: MarketWeek): PrologueAltWeek | undefined {
  if (!byDate) {
    byDate = new Map()
    for (const rows of Object.values(CONTENT.prologue.alts?.weekly ?? {})) for (const r of rows) byDate.set(r.week, r)
  }
  return byDate.get(w.week)
}

export const altPrice = (row: PrologueAltWeek | undefined, coin: AltCoin): number =>
  (coin === 'LTC' ? row?.ltc_usd : row?.doge_usd) ?? 0
const revKhsDay = (row: PrologueAltWeek, coin: AltCoin): number =>
  (coin === 'LTC' ? row.ltc_rev_usd_khs_day : row.doge_rev_usd_khs_day) ?? 0
/** A coin is open in a week when it has a price and a revenue rate. */
export const altOpen = (row: PrologueAltWeek | undefined, coin: AltCoin): boolean =>
  !!row && altPrice(row, coin) > 0 && revKhsDay(row, coin) > 0

/** The scrypt rate of a machine model in kH/s (GPUs only), and the first quarter it can mine scrypt. */
export function scryptKhs(modelId: string): number {
  return (getModel(modelId) as unknown as { scrypt_khs?: { value: number } } | undefined)?.scrypt_khs?.value ?? 0
}
const scryptFrom = (modelId: string): string =>
  (getModel(modelId) as unknown as { available_scrypt_from?: string } | undefined)?.available_scrypt_from ?? '9999Q4'

/** A coin you can point GPUs at in a quarter: it exists by the quarter's last week. */
export function altOpenInQuarter(quarter: number, coin: AltCoin): boolean {
  return altOpen(altWeek(quarter, 12), coin)
}

/** The coins a lot's model could mine now besides its own: [] for anything but a GPU. */
export function lotAltChoices(s: GameState, lot: MachineLot): AltCoin[] {
  if (scryptKhs(lot.model) <= 0 || label(s.quarter) < scryptFrom(lot.model)) return []
  return ALT_COINS.filter((c) => altOpenInQuarter(s.quarter, c))
}

export function newAlts(): AltState {
  return {
    held: zero(),
    hodl: { LTC: 1, DOGE: 1 },
    queue: zero(),
    mined: zero(),
    lost: zero(),
    sold: zero(),
    soldUsd: zero(),
    mark: { mined: zero(), soldUsd: zero() },
  }
}
export function ensureAlts(s: GameState): AltState {
  s.prologue!.alts ??= newAlts()
  return s.prologue!.alts
}

/** Does any lot mine an altcoin? (The 2014Q3 card and decision quarter ask.) */
export const hasScryptGpus = (s: GameState): boolean => s.machines.some((l) => !!l.altCoin)

/** Points a lot at a coin: 'BTC' or 'ETH' (its own) or an altcoin. Free, and it starts with the quarter's first week. */
export function setLotCoin(s: GameState, lotId: string, coin: string): Message | undefined {
  const lot = s.machines.find((l) => l.id === lotId)
  if (!lot) return fail('error.unknown_lot')
  if (coin === 'BTC' || coin === 'ETH') {
    if (lot.altCoin) {
      delete lot.altCoin
      logEntry(s, 'log.p0_lot_coin', { model: lot.model, count: lot.count, coin: getModel(lot.model)!.coin })
    }
    return undefined
  }
  if (!isAltCoin(coin) || !CONTENT.prologue.alts) return fail('error.p0_lot_coin', { coin })
  if (!lotAltChoices(s, lot).includes(coin)) return fail('error.p0_lot_coin', { coin })
  if (lot.altCoin === coin) return undefined
  lot.altCoin = coin
  ensureAlts(s)
  logEntry(s, 'log.p0_lot_coin', { model: lot.model, count: lot.count, coin })
  return undefined
}

/**
 * What a working lot on an altcoin earns this week: coins by type and their dollar value at the week's prices. Null when its
 * coin isn't open yet (the lot mines its own coin that week). A lot on Litecoin also earns Dogecoin from the merged-mining week.
 */
export function altIncome(
  s: GameState,
  lot: MachineLot,
  working: number,
): { coins: AltAmounts; usd: number } | null {
  const coin = lot.altCoin
  if (!coin) return null
  return altIncomeKhs(s, coin, working * scryptKhs(lot.model))
}

/** The same for any scrypt hashrate in kH/s on a coin (the club's machines use it too, M70.4). */
export function altIncomeKhs(
  s: GameState,
  coin: AltCoin,
  khs: number,
): { coins: AltAmounts; usd: number } | null {
  const row = altWeek(s.quarter, s.week)
  if (!row || !altOpen(row, coin)) return null
  const coins = zero()
  let usd = 0
  const earn = (c: AltCoin) => {
    const u = khs * revKhsDay(row, c) * 7
    coins[c] += u / altPrice(row, c)
    usd += u
  }
  earn(coin)
  if (coin === 'LTC' && row.doge_merged_mining === true && altOpen(row, 'DOGE')) earn('DOGE')
  return { coins, usd }
}

/** The week's mined altcoins land in your wallet; the sell share of each is ordered sold (it waits for the limits). */
export function landAlts(s: GameState, coins: AltAmounts): void {
  const row = altWeek(s.quarter, s.week)
  const a = ensureAlts(s)
  for (const c of ALT_COINS) {
    if (coins[c] <= 0) continue
    a.held[c] += coins[c]
    a.mined[c] += coins[c]
    accrue(s, 'mining_other', coins[c] * altPrice(row, c))
    const sellShare = 1 - a.hodl[c]
    if (sellShare > 0) a.queue[c] += coins[c] * sellShare
  }
}

const yearOf = (row: PrologueAltWeek) => row.week.slice(0, 4)
/** The week's daily volume in dollars: the file's real figure, else the year's average (the last year on file if the year is past it). */
function dailyVolumeUsd(coin: AltCoin, row: PrologueAltWeek): number {
  // M71.3 (doc 51 v1.4 §15 decision 1): the week's real daily volume where the market file has it, else the year's average
  const real = coin === 'LTC' ? row.ltc_volume_usd_day : row.doge_volume_usd_day
  if (real && real > 0) return real
  const v = P().altcoin_selling_limits.avg_daily_volume_usd[coin]
  const years = Object.keys(v).sort()
  const y = yearOf(row)
  return v[y] ?? v[years.filter((k) => k <= y).at(-1) ?? years[0]]
}

/** What a sale of `usd` at market brings after the thin market's slippage (the limits' own rule). */
export function altSaleProceeds(coin: AltCoin, row: PrologueAltWeek, usd: number): number {
  const L = P().altcoin_selling_limits
  const share = usd / dailyVolumeUsd(coin, row)
  const steps = Math.max(0, share - L.free_share) / L.step_share
  return usd * (1 - L.slippage_per_step * steps)
}

/** The most dollars of a coin one week may sell (the hard cap). */
export function altWeeklyCapUsd(coin: AltCoin, row: PrologueAltWeek): number {
  return P().altcoin_selling_limits.hard_cap_share * dailyVolumeUsd(coin, row)
}

/** The 2016Q4 handover quarter: every altcoin is ordered sold. */
export const handoverQuarter = (s: GameState): boolean => label(s.quarter) === P().altcoin_handover.sell_quarter

/**
 * The week's altcoin sales: each coin's queue sells up to the hard cap at the week's price less slippage; what doesn't sell
 * waits for next week. Returns the dollars received. In the handover quarter the whole holding is ordered sold first.
 */
export function sellAltWeek(s: GameState): number {
  const a = s.prologue!.alts
  if (!a) return 0
  const row = altWeek(s.quarter, s.week)
  if (!row) return 0
  let total = 0
  for (const c of ALT_COINS) {
    if (handoverQuarter(s)) a.queue[c] = a.held[c]
    a.queue[c] = Math.min(a.queue[c], a.held[c])
    const px = altPrice(row, c)
    if (px <= 0 || a.queue[c] <= EPS) continue
    const coins = Math.min(a.queue[c], altWeeklyCapUsd(c, row) / px)
    const usd = coins * px
    const got = altSaleProceeds(c, row, usd)
    a.held[c] -= coins
    a.queue[c] -= coins
    a.sold[c] += coins
    a.soldUsd[c] += got
    total += got
    book(s, 'coins_sold', got)
    if (handoverQuarter(s)) recordHandover(a, c, coins, got)
  }
  return total
}

function recordHandover(a: AltState, c: AltCoin, amount: number, usd: number): void {
  a.handover ??= { LTC: { amount: 0, usd: 0 }, DOGE: { amount: 0, usd: 0 } }
  a.handover[c].amount += amount
  a.handover[c].usd += usd
}

/** The handover quarter's end: whatever the limits left unsold converts at the last week's price x the haircut. */
export function convertLeftoverAlts(s: GameState): void {
  const a = s.prologue!.alts
  if (!a || !handoverQuarter(s)) return
  const row = altWeek(s.quarter, 12)
  for (const c of ALT_COINS) {
    if (a.held[c] <= EPS) continue
    const usd = a.held[c] * altPrice(row, c) * P().altcoin_handover.left_over_close_mult
    book(s, 'coins_sold', usd)
    a.sold[c] += a.held[c]
    a.soldUsd[c] += usd
    recordHandover(a, c, a.held[c], usd)
    logEntry(s, 'log.p0_alts_converted', { coin: c, amount: a.held[c], valueUsd: usd })
    a.held[c] = 0
    a.queue[c] = 0
  }
  roundCash(s)
}

/** The altcoins in your wallet, at a market week's prices (the net worth). */
export function altValueUsd(s: GameState, w: MarketWeek): number {
  const a = s.prologue?.alts
  if (!a) return 0
  const row = altWeekOf(w)
  return ALT_COINS.reduce((n, c) => n + a.held[c] * altPrice(row, c), 0)
}

/** Coins you could still order sold (not already in the queue). */
export const altSellable = (s: GameState, c: AltCoin): number =>
  Math.max(0, (s.prologue!.alts?.held[c] ?? 0) - (s.prologue!.alts?.queue[c] ?? 0))

/** A sell order for an altcoin from the Plan screen (1 Bandwidth, as bitcoin's): it joins the queue and sells within the limits. */
export function sellAlt(s: GameState, coin: AltCoin, amount: number): Message | undefined {
  if (!(amount > 0)) return fail('error.bad_count')
  const max = altSellable(s, coin)
  if (amount > max + EPS) return fail('error.p0_not_enough_coins', { coin, have: max })
  const cost = P().bandwidth_costs.sell
  if (s.bandwidth < cost) return fail('error.no_bandwidth', { needed: cost, have: s.bandwidth })
  s.bandwidth -= cost
  const n = Math.min(amount, max)
  s.prologue!.alts!.queue[coin] += n
  logEntry(s, 'log.p0_sell_order', { coin, amount: n })
  return undefined
}

export function cancelAltSale(s: GameState, coin: AltCoin): void {
  const a = s.prologue!.alts
  if (a) a.queue[coin] = 0
}

/** The keep/sell % of an altcoin: the share of newly mined coins kept (0-1). */
export function setAltHodl(s: GameState, coin: AltCoin, hodl: number): Message | undefined {
  if (!(hodl >= 0 && hodl <= 1)) return fail('error.bad_pct')
  const a = s.prologue!.alts
  if (!a) return fail('error.p0_not_enough_coins', { coin, have: 0 })
  if (a.hodl[coin] === hodl) return undefined
  a.hodl[coin] = hodl
  logEntry(s, 'log.hodl', { sellPct: 1 - hodl, coin })
  return undefined
}

/** A dead drive takes `share` of what's in your wallet: altcoins included. */
export function loseAltWallet(s: GameState, share: number): void {
  const a = s.prologue?.alts
  if (!a) return
  for (const c of ALT_COINS) {
    const lost = a.held[c] * share
    if (lost <= 0) continue
    a.held[c] -= lost
    a.lost[c] += lost
    a.queue[c] = Math.min(a.queue[c], a.held[c])
    logEntry(s, 'log.p0_wallet_lost', { coin: c, amount: lost })
  }
}

/** The 2014Q3 card: every lot on Litecoin or Dogecoin is sold at the used price. */
export function sellScryptGpus(s: GameState): void {
  for (const lot of [...s.machines]) {
    if (!lot.altCoin) continue
    const units = lot.count
    book(s, 'asset_sales', removeMachines(s, lot, units), { site: lot.siteId })
    logEntry(s, 'log.p0_scrypt_gpus_sold', { model: lot.model, count: units })
  }
  roundCash(s)
}

/** Cash short at quarter end: altcoins in your wallet sell at the week's price (after the exchange's coins). */
export function forcedSaleAlts(s: GameState): void {
  const a = s.prologue?.alts
  if (!a) return
  const row = altWeek(s.quarter, 12)
  for (const c of ALT_COINS) {
    const px = altPrice(row, c)
    if (s.cash >= 0 || px <= 0 || a.held[c] <= 0) continue
    const coins = Math.min(a.held[c], -s.cash / px)
    book(s, 'coins_sold', coins * px)
    a.held[c] -= coins
    a.queue[c] = Math.min(a.queue[c], a.held[c])
    a.sold[c] += coins
    a.soldUsd[c] += coins * px
  }
}

/** The quarter's altcoin figures for the report, and the mark for the next quarter. */
export function reportAlts(s: GameState): { mined: AltAmounts; soldUsd: AltAmounts; held: AltAmounts } | undefined {
  const a = s.prologue?.alts
  if (!a) return undefined
  const out = {
    mined: { LTC: a.mined.LTC - a.mark.mined.LTC, DOGE: a.mined.DOGE - a.mark.mined.DOGE },
    soldUsd: { LTC: a.soldUsd.LTC - a.mark.soldUsd.LTC, DOGE: a.soldUsd.DOGE - a.mark.soldUsd.DOGE },
    held: { ...a.held },
  }
  a.mark = { mined: { ...a.mined }, soldUsd: { ...a.soldUsd } }
  return out
}
