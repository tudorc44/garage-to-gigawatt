// The mining club (M70.4, doc 51 v1.2 §4; club.json, preorders_additions.json): in 2013Q1 three friends (Nell, Teo, Jun) offer to
// pool money. You put in $500-$5,000, they put in $3,000 between them and Teo brings two GPUs; shares follow the value put in. All
// the cash goes into the group buy (its delay roll and its late-equals-loss rule apply, one order per $650); Teo's GPUs mine the
// coin you pick. The club's output is split by shares each week. Who holds the keys and where the machines run are your choices:
// the keys with Jun can be lost (a chance a quarter, a share of everything), the machines in your place count against the household's
// patience and the club pays you a hosting fee, in Nell's flat they don't and you pay your share of hers. Seven cards test it. The club
// ends at the breakup card or at the handover: you buy the friends out (everything becomes yours and enters Act I as machines and
// coins) or dissolve it (machines at the used price, coins at the week's price, split by shares). No club system enters Act I.
// Nothing here runs, and no state is created, in a game that never joins the club (opt-out invariance).
import { CONTENT, quarterIndex } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, uniform } from '../rng.ts'
import { logEntry, type GameState } from '../state.ts'
import { accrue, book, roundCash } from '../ledger.ts'
import { addMachines } from '../systems/machines.ts'
import { getModel, marketWeek, sellPrice } from '../systems/market.ts'
import { altIncomeKhs, altPrice, altWeek, landAlts } from './alts.ts'
import { orderSale } from './custody.ts'
import { clubKw } from './clubLoad.ts'
import { P, poolFee, rollStream, siteCapacityKw, siteLoadKw } from './setup.ts'
import { CLUB_FRIENDS, type Club, type ClubBalance, type ClubMember, type ClubOrder } from './types.ts'

const label = (q: number) => CONTENT.quarters[q] ?? ''
const fail = (key: Message['key'], params?: Message['params']): Message => ({
  key,
  ...(params ? { params } : {}),
})
const CL = () => CONTENT.prologue.club!
const ALL: readonly ClubMember[] = ['you', 'nell', 'teo', 'jun']
const emptyBal = (): ClubBalance => ({ cash: 0, BTC: 0, LTC: 0, DOGE: 0 })
const FRIENDSHIP_PRICE_STEP = 0.1
const COINS = ['BTC', 'LTC', 'DOGE'] as const
type Coin3 = (typeof COINS)[number]

export const hasClub = (s: GameState): boolean => !!s.prologue?.club
const wk = (s: GameState) => Math.min(Math.max(s.week - 1, 0), 12)
/** The coin prices of the week being played (the week just played in the live quarter, week 1 in a Plan phase). */
function prices(s: GameState): Record<Coin3, number> {
  const w = marketWeek(s.quarter, s.phase === 'plan' ? 0 : wk(s))
  const row = altWeek(s.quarter, s.phase === 'plan' ? 0 : wk(s))
  return { BTC: w.btc_usd, LTC: altPrice(row, 'LTC'), DOGE: altPrice(row, 'DOGE') }
}
const balUsd = (b: ClubBalance, px: Record<Coin3, number>) => b.cash + b.BTC * px.BTC + b.LTC * px.LTC + b.DOGE * px.DOGE
const groupBuy = () => P().preorders.vendors.find((v) => v.id === CL().rules.buys.vendor)!

// ---------- joining ----------

/** Can you join now: the offer's quarter, a Plan phase, a stake in range, the Bandwidth and the cash. */
export function joinBlocker(s: GameState, stake: number): Message | undefined {
  const f = CONTENT.prologue.club
  if (!f) return fail('error.p0_club_locked', { quarter: '2013Q1' })
  if (s.prologue!.club) return fail('error.p0_club_in')
  const { min, max, step } = f.rules.player_contribution_usd
  if (label(s.quarter) !== f.rules.offer.quarter || s.prologue!.clubEnded)
    return fail('error.p0_club_locked', { quarter: f.rules.offer.quarter })
  if (!(stake >= min && stake <= max) || Math.abs(stake / step - Math.round(stake / step)) > 1e-9)
    return fail('error.p0_club_stake', { min, max, step })
  if (s.bandwidth < f.rules.offer.join_bandwidth)
    return fail('error.no_bandwidth', { needed: f.rules.offer.join_bandwidth, have: s.bandwidth })
  if (s.cash < stake) return fail('error.no_cash', { costUsd: stake, cashUsd: s.cash })
  return undefined
}

/** Rolls an order's delivery on its own stream: the group buy's odds, or the scrypt box's delay roll. */
function rollOrder(s: GameState, club: Club, kind: ClubOrder['kind'], paidUsd: number): ClubOrder {
  const id = `co-${club.nextId++}`
  const r = rollStream(s.seed, `club:order:${id}`)
  let roll = uniform(r, 0, 1)
  let outcome: ClubOrder['outcome']
  let deliver: number | null
  if (kind === 'group_buy') {
    const v = groupBuy()
    const due = quarterIndex(P().preorders.ships_quarter.value)!
    if ((roll -= v.odds.on_time) < 0) [outcome, deliver] = ['on_time', due]
    else if ((roll -= v.odds.moderate) < 0) [outcome, deliver] = ['late', due + randomInt(r, ...v.moderate_quarters)]
    else if (roll - v.odds.severe < 0) [outcome, deliver] = ['very_late', due + randomInt(r, ...v.severe_quarters)]
    else [outcome, deliver] = ['never', null]
  } else {
    const d = CL().boxVendor.delay_roll.value
    const due = s.quarter + CL().boxVendor.promised_delivery_quarters_after_order
    if ((roll -= d.on_time) < 0) [outcome, deliver] = ['on_time', due]
    else if ((roll -= d.one_quarter_late) < 0) [outcome, deliver] = ['late', due + 1]
    else if (roll - d.two_quarters_late < 0) [outcome, deliver] = ['late', due + 2]
    else [outcome, deliver] = ['very_late', due + 3]
  }
  return { id, kind, paidUsd, orderedQuarter: s.quarter, outcome, deliverQuarter: deliver, delivered: false }
}

export function joinClub(
  s: GameState,
  stake: number,
  keys: 'player' | 'jun',
  hosting: 'your_place' | 'friends_flat',
): Message | undefined {
  const blocked = joinBlocker(s, stake)
  if (blocked) return blocked
  const p = s.prologue!
  const rules = CL().rules
  const gpu = getModel(rules.teo_gpus.model)!
  const gpuValue = rules.teo_gpus.count * sellPrice(gpu, s.quarter)
  const friendsCash = rules.friends_cash_usd.value
  const each = friendsCash / 3
  const total = stake + friendsCash + gpuValue
  const club: Club = {
    joinedQuarter: s.quarter,
    shares: { you: stake / total, nell: each / total, teo: (each + gpuValue) / total, jun: each / total },
    members: [...ALL],
    stakeUsd: stake,
    keys,
    hosting,
    hostSiteId: [...s.sites]
      .filter((x) => x.readyQuarter <= s.quarter)
      .sort((a, b) => siteCapacityKw(b) - siteLoadKw(s, b.id) - (siteCapacityKw(a) - siteLoadKw(s, a.id)))[0].id,
    bal: { you: emptyBal(), nell: emptyBal(), teo: emptyBal(), jun: emptyBal() },
    lots: [],
    orders: [],
    gpuCoin: 'BTC',
    friendship: 0,
    cloud: null,
    feeDebtUsd: 0,
    ending: 'buy_out',
    nextId: 1,
    quarter: { outputUsd: 0, yourShareUsd: 0, hostingUsd: 0 },
    lostUsd: 0,
  }
  s.bandwidth -= rules.offer.join_bandwidth
  book(s, 'machines', -stake)
  roundCash(s)
  // all the cash goes into the group buy, a unit at a time; what is left over stays with the members, by what they put in
  const price = groupBuy().price_usd
  const pooled = stake + friendsCash
  const n = Math.floor(pooled / price)
  for (let i = 0; i < n; i++) club.orders.push(rollOrder(s, club, 'group_buy', price))
  const left = pooled - n * price
  club.bal.you.cash += (left * stake) / pooled
  for (const f of CLUB_FRIENDS) club.bal[f].cash += (left * each) / pooled
  club.lots.push({ id: `cl-${club.nextId++}`, kind: 'gpu', model: rules.teo_gpus.model, count: rules.teo_gpus.count, earnsFrom: s.quarter + 1 })
  p.club = club
  settleYourBalance(s, club)
  logEntry(s, 'log.p0_club_joined', { stakeUsd: stake, orders: n, share: club.shares.you })
  return undefined
}

/** With the keys in your wallet your own balance is yours at once: cash and coins move to you. */
function settleYourBalance(s: GameState, club: Club): void {
  if (club.keys !== 'player') return
  const b = club.bal.you
  if (b.cash > 0) {
    book(s, 'other_income', b.cash)
    roundCash(s)
    b.cash = 0
  }
  if (b.BTC > 0 || b.LTC > 0 || b.DOGE > 0) {
    landPlayer(s, 'BTC', b.BTC)
    landPlayer(s, 'LTC', b.LTC)
    landPlayer(s, 'DOGE', b.DOGE)
    b.BTC = b.LTC = b.DOGE = 0
  }
}

/** Mined coins reach your wallet as your own mined coins do (the keep/sell % orders the sell share sold). */
function landPlayer(s: GameState, coin: Coin3, amount: number): void {
  if (amount <= 0) return
  const p = s.prologue!
  if (coin === 'BTC') {
    s.treasury.BTC += amount
    p.mined.BTC += amount
    p.quarter.coinsMined.BTC += amount
    if (p.minedTo === 'exchange') p.onExchange.BTC += amount
    const sellShare = 1 - s.hodlPct.BTC
    if (sellShare > 0) orderSale(s, 'BTC', amount * sellShare)
    accrue(s, 'mining_btc', amount * prices(s).BTC)
  } else landAlts(s, { LTC: coin === 'LTC' ? amount : 0, DOGE: coin === 'DOGE' ? amount : 0 })
}

// ---------- the weeks ----------

/** Shares the members still in hold (they sum to 1). */
const shareOf = (club: Club, m: ClubMember) => (club.members.includes(m) ? club.shares[m] : 0)

/** Credits an amount of coin or cash to the members by their shares (yours goes to your wallet when you hold the keys). */
function credit(s: GameState, club: Club, what: 'cash' | Coin3, amount: number): void {
  if (amount <= 0) return
  for (const m of ALL) {
    const part = amount * shareOf(club, m)
    if (part > 0) club.bal[m][what] += part
  }
  settleYourBalance(s, club)
}

/** One week of the club: its machines mine, the output is split by shares, the hosting is paid. */
export function clubWeek(s: GameState): void {
  const p = s.prologue!
  const club = p.club!
  const w = marketWeek(s.quarter, s.week)
  const perBlock = w.btc_block_subsidy / Math.max(0.01, 1 - w.btc_fee_share)
  const netTh = w.btc_hashrate_EHs * 1e6
  const coins: Record<Coin3, number> = { BTC: 0, LTC: 0, DOGE: 0 }
  for (const l of club.lots) {
    if (s.quarter < l.earnsFrom) continue
    const model = getModel(l.model)
    if (l.kind === 'box') {
      const inc = altIncomeKhs(s, 'LTC', CL().boxVendor.hashrate_share_khs.value * l.count)
      if (inc) {
        coins.LTC += inc.coins.LTC
        coins.DOGE += inc.coins.DOGE
      }
      continue
    }
    if (l.kind === 'gpu' && club.gpuCoin !== 'BTC') {
      const inc = altIncomeKhs(s, club.gpuCoin, ((model as unknown as { scrypt_khs?: { value: number } }).scrypt_khs?.value ?? 0) * l.count)
      if (inc) {
        coins.LTC += inc.coins.LTC
        coins.DOGE += inc.coins.DOGE
        continue
      }
      // (a coin that does not exist yet that week: the GPUs mine bitcoin)
    }
    const th = l.count * (model?.hashrate ?? 0)
    // the club mines in a public pool: the expected share of a week's blocks, less its fee
    coins.BTC += (th / (th + netTh || 1)) * P().blocks_per_week * perBlock * (1 - poolFee(s.quarter))
  }
  const px = prices(s)
  const outUsd = coins.BTC * px.BTC + coins.LTC * px.LTC + coins.DOGE * px.DOGE
  for (const c of COINS) credit(s, club, c, coins[c])
  club.quarter.outputUsd += outUsd
  club.quarter.yourShareUsd += outUsd * club.shares.you
  // hosting: in your place the club pays you its fee (the friends' part; yours is yours), in Nell's flat you pay your share of hers
  const kw = clubKw(club)
  const feeWeek = (kw * hostingRate(club)) / 13
  if (kw > 0 && club.hosting === 'your_place') {
    const owed = feeWeek * (1 - club.shares.you) + club.feeDebtUsd
    const paid = takeFromFriends(club, owed, px)
    club.feeDebtUsd = owed - paid
    if (paid > 0) {
      book(s, 'hosting_fees', paid)
      roundCash(s)
      club.quarter.hostingUsd += paid
    }
  } else if (kw > 0 && club.hosting === 'friends_flat') {
    const mine = feeWeek * club.shares.you
    book(s, 'rent', -mine)
    roundCash(s)
    club.quarter.hostingUsd -= mine
  }
}

const hostingRate = (club: Club) =>
  club.hosting === 'your_place'
    ? CL().rules.hosting.your_place.fee_from_club_usd_kw_quarter.value
    : CL().rules.hosting.friends_flat.fee_to_nell_usd_kw_quarter.value

/** Takes up to `usd` from the friends' balances (cash first, then coins at the week's price, pro rata by their shares); returns what was taken. */
function takeFromFriends(club: Club, usd: number, px: Record<Coin3, number>): number {
  const friends = CLUB_FRIENDS.filter((f) => club.members.includes(f))
  const totalShare = friends.reduce((a, f) => a + club.shares[f], 0)
  if (usd <= 0 || totalShare <= 0) return 0
  let taken = 0
  for (const f of friends) {
    let want = (usd * club.shares[f]) / totalShare
    const b = club.bal[f]
    const fromCash = Math.min(want, b.cash)
    b.cash -= fromCash
    want -= fromCash
    taken += fromCash
    for (const c of COINS) {
      if (want <= 1e-9 || px[c] <= 0) continue
      const useCoins = Math.min(b[c], want / px[c])
      b[c] -= useCoins
      want -= useCoins * px[c]
      taken += useCoins * px[c]
    }
  }
  return taken
}

// ---------- the quarter ----------

/** The quarter's start: Jun's keys may be lost (a chance a quarter, a share of everything he holds). */
export function clubQuarterStart(s: GameState): void {
  const club = s.prologue!.club
  if (!club || club.keys !== 'jun') return
  const k = CL().rules.keys.jun
  const r = rollStream(s.seed, `club_keys:${s.quarter}`)
  const roll = uniform(r, 0, 1)
  const [lo, hi] = k.loss_share.value
  const share = uniform(r, lo, hi)
  if (roll >= k.loss_chance_quarter.value) return
  const px = prices(s)
  let lost = 0
  for (const m of ALL) {
    const b = club.bal[m]
    lost += balUsd(b, px) * share
    b.cash *= 1 - share
    for (const c of COINS) b[c] *= 1 - share
  }
  club.lostUsd += lost
  logEntry(s, 'log.p0_club_keys_lost', { share, valueUsd: lost })
}

/** Your own wallet losing coins (a dead drive) takes the friends' coins held in it too. */
export function loseClubWallet(s: GameState, share: number): void {
  const club = s.prologue?.club
  if (!club || club.keys !== 'player') return
  for (const m of CLUB_FRIENDS) for (const c of COINS) club.bal[m][c] *= 1 - share
}

/** Orders due arrive at the start of a quarter (units earn from the next); a vendor that never delivers refunds a share. */
export function deliverClubOrders(s: GameState): void {
  const club = s.prologue?.club
  if (!club) return
  for (const o of club.orders) {
    if (o.delivered) continue
    if (o.kind === 'group_buy' && o.outcome === 'never') {
      const due = quarterIndex(P().preorders.ships_quarter.value)! + groupBuy().severe_quarters[1]
      if (s.quarter >= due) {
        credit(s, club, 'cash', o.paidUsd * groupBuy().refund_share)
        o.delivered = true
        logEntry(s, 'log.p0_club_refund', { valueUsd: o.paidUsd * groupBuy().refund_share })
      }
      continue
    }
    if (o.deliverQuarter === null || s.quarter < o.deliverQuarter) continue
    club.lots.push({
      id: `cl-${club.nextId++}`,
      kind: o.kind === 'group_buy' ? 'asic' : 'box',
      model: o.kind === 'group_buy' ? groupBuy().model : CL().boxVendor.unit_model,
      count: 1,
      earnsFrom: s.quarter + 1,
    })
    o.delivered = true
    logEntry(s, o.kind === 'group_buy' ? 'log.p0_club_unit_arrived' : 'log.p0_club_box_arrived', {})
  }
}

/** The quarter's end: the cloud contract pays (or does not), the hosting debt is tried again, the report's figures go out. */
export function clubQuarterEnd(s: GameState): { outputUsd: number; yourShareUsd: number; hostingUsd: number } | undefined {
  const p = s.prologue!
  const club = p.club
  if (!club) return undefined
  const px = prices(s)
  if (club.cloud) {
    // the sourced backdrop: payouts run daily at first, fall below their fees from late 2014 and stop with the shutdown in January 2015
    // (the percentages are designed placeholders, mine: doc 51 v1.2 gives the shape, not the numbers)
    const k = s.quarter - club.cloud.sinceQuarter
    const pct = k === 1 ? 0.1 : k === 2 ? 0.02 : 0
    if (pct > 0) credit(s, club, 'cash', club.cloud.investedUsd * pct)
  }
  const out = { ...club.quarter }
  club.quarter = { outputUsd: 0, yourShareUsd: 0, hostingUsd: 0 }
  void px
  if (s.quarter >= CONTENT.acts.find((a) => a.act === 0)!.lastQuarter) endClub(s, club.ending, false)
  return out
}

// ---------- cards ----------

/** What the club's machines and orders are worth to its members now (machines at the used price, orders at what was paid). */
export function clubAssetsUsd(s: GameState, club: Club): number {
  const refund = groupBuy().refund_share
  let usd = 0
  for (const l of club.lots) usd += l.kind === 'box' ? 0 : l.count * sellPrice(getModel(l.model)!, s.quarter)
  for (const l of club.lots) if (l.kind === 'box') usd += l.count * CL().boxVendor.price_usd.value * refund
  for (const o of club.orders)
    if (!o.delivered) usd += o.kind === 'group_buy' ? o.paidUsd : o.paidUsd * refund
  return usd
}

/** What a member's share of the club is worth: their part of its assets and what they hold. */
export function memberValueUsd(s: GameState, club: Club, m: ClubMember): number {
  return shareOf(club, m) * clubAssetsUsd(s, club) + balUsd(club.bal[m], prices(s))
}

function chargeMembers(s: GameState, club: Club, usd: number): boolean {
  const px = prices(s)
  const friends = takeable(club, usd * (1 - club.shares.you), px)
  if (!friends) return false
  if (s.cash < usd * club.shares.you) return false
  takeFromFriends(club, usd * (1 - club.shares.you), px)
  book(s, 'other_opex', -usd * club.shares.you)
  roundCash(s)
  return true
}
function takeable(club: Club, usd: number, px: Record<Coin3, number>): boolean {
  const friends = CLUB_FRIENDS.filter((f) => club.members.includes(f))
  const have = friends.reduce((a, f) => a + balUsd(club.bal[f], px), 0)
  return have + 1e-9 >= usd
}

/** The club's power bill, a quarter of the hosting fee again, paid by the shares or by you alone. */
export function payClubPowerBill(s: GameState, who: 'player' | 'shares'): void {
  const club = s.prologue?.club
  if (!club) return
  const bill = clubKw(club) * hostingRate(club)
  if (bill <= 0) return
  if (who === 'player') {
    book(s, 'other_opex', -bill)
    roundCash(s)
    logEntry(s, 'log.p0_club_bill_you', { valueUsd: bill })
  } else {
    takeFromFriends(club, bill * (1 - club.shares.you), prices(s))
    book(s, 'other_opex', -bill * club.shares.you)
    roundCash(s)
    logEntry(s, 'log.p0_club_bill_split', { valueUsd: bill })
  }
}

/** A club card's answer. */
export function applyClubEffect(s: GameState, fx: ClubEffectArg): void {
  const p = s.prologue!
  const club = p.club
  if (!club) return
  if (fx.cost_split) payClubPowerBill(s, 'shares')
  if (fx.dispute) club.friendship -= 1
  if (fx.friendship) club.friendship += fx.friendship
  if (fx.buy_out === 'teo' && club.members.includes('teo')) {
    const price = memberValueUsd(s, club, 'teo')
    if (s.cash >= price) {
      book(s, 'one_offs', -price)
      roundCash(s)
      club.shares.you += club.shares.teo
      club.shares.teo = 0
      club.members = club.members.filter((m) => m !== 'teo')
      for (const k of ['cash', ...COINS] as const) {
        club.bal.you[k] += club.bal.teo[k]
        club.bal.teo[k] = 0
      }
      settleYourBalance(s, club)
      logEntry(s, 'log.p0_club_teo_out', { valueUsd: price })
    } else {
      club.friendship -= 1
      logEntry(s, 'log.p0_club_cannot', { valueUsd: price })
    }
  }
  if (fx.member_sells === 'teo') {
    // Teo sells his share of the coins and cashes it: it leaves the club
    const b = club.bal.teo
    const value = balUsd(b, prices(s))
    b.cash = b.BTC = b.LTC = b.DOGE = 0
    logEntry(s, 'log.p0_club_teo_sold', { valueUsd: value })
  }
  if (fx.sell_gpus_mult) sellClubGpus(s, club, fx.sell_gpus_mult)
  if (fx.preorder === CL().boxVendor.id) orderBox(s, club)
  if (fx.cloud_contract) investCloud(s, club)
  if (fx.end) endClub(s, fx.end, true)
}
export type ClubEffectArg = {
  join?: boolean
  cost_split?: 'shares'
  dispute?: boolean
  buy_out?: 'teo'
  member_sells?: 'teo'
  refuse?: 'teo'
  friendship?: number
  sell_gpus_mult?: number
  preorder?: string
  cloud_contract?: boolean
  end?: 'buy_out' | 'dissolve'
}

/** A forum buyer takes the club's GPUs at a multiple of what the cards cost new; the money goes to the members by their shares. */
function sellClubGpus(s: GameState, club: Club, mult: number): void {
  const gpus = club.lots.filter((l) => l.kind === 'gpu')
  if (gpus.length === 0) return
  let usd = 0
  for (const l of gpus) {
    const m = getModel(l.model)!
    const launch = Object.values((m as unknown as { price_new: Record<string, number> }).price_new)[0] ?? 0
    usd += l.count * launch * mult
  }
  club.lots = club.lots.filter((l) => l.kind !== 'gpu')
  credit(s, club, 'cash', usd)
  logEntry(s, 'log.p0_club_gpus_sold', { valueUsd: usd })
}

/** A quarter share of a scrypt box: each member pays their part (the friends from what they hold); if they cannot, the club passes. */
function orderBox(s: GameState, club: Club): void {
  const v = CL().boxVendor
  const price = v.price_usd.value
  if (!chargeMembers(s, club, price)) {
    logEntry(s, 'log.p0_club_cannot', { valueUsd: price })
    return
  }
  club.orders.push(rollOrder(s, club, 'scrypt_box', price))
  logEntry(s, 'log.p0_club_box_ordered', { valueUsd: price })
}

/** Jun's cousin's cloud contract: what the friends hold (and yours too if Jun holds the keys) goes in; it pays daily at first, then stops. */
function investCloud(s: GameState, club: Club): void {
  if (club.cloud) return
  const px = prices(s)
  let usd = 0
  const who = club.keys === 'jun' ? ALL : CLUB_FRIENDS
  for (const m of who) {
    usd += balUsd(club.bal[m], px)
    club.bal[m] = emptyBal()
  }
  club.cloud = { investedUsd: usd, sinceQuarter: s.quarter }
  logEntry(s, 'log.p0_club_cloud', { valueUsd: usd })
}

// ---------- the ending ----------

/**
 * The club ends (the breakup card, or the handover): you buy the friends out, or it is dissolved. A buy-out you cannot pay for falls
 * back to dissolving. Nothing of the club stays: machines and coins become yours (enter Act I) or cash.
 */
export function endClub(s: GameState, kind: 'buy_out' | 'dissolve', early: boolean): void {
  const p = s.prologue!
  const club = p.club
  if (!club) return
  const px = prices(s)
  const refund = groupBuy().refund_share
  const assets = clubAssetsUsd(s, club)
  // (doc 51 v1.4 §15 decision 6: each friendship point below 0 adds 10% to the price of buying the friends out; the 10% is the doc's own number)
  const friendsOwed =
    CLUB_FRIENDS.filter((f) => club.members.includes(f)).reduce((a, f) => a + memberValueUsd(s, club, f), 0) *
    (kind === 'buy_out' ? 1 + FRIENDSHIP_PRICE_STEP * Math.max(0, -club.friendship) : 1)
  let what = kind
  if (what === 'buy_out' && s.cash < friendsOwed) {
    logEntry(s, 'log.p0_club_cannot', { valueUsd: friendsOwed })
    what = 'dissolve'
  }
  let usd: number
  if (what === 'buy_out') {
    book(s, 'one_offs', -friendsOwed)
    // the machines become yours (a box share is worth cash)
    const site = s.sites.find((x) => x.id === club.hostSiteId) ?? s.sites[0]
    for (const l of club.lots) {
      if (l.kind === 'box') book(s, 'asset_sales', l.count * CL().boxVendor.price_usd.value * refund)
      else addMachines(s, l.model, l.kind === 'gpu' ? 'used' : 'new', l.count, site.id)
    }
    for (const o of club.orders) {
      if (o.delivered) continue
      if (o.kind === 'scrypt_box') book(s, 'asset_sales', o.paidUsd * refund)
      else
        p.preorders.push({
          id: `po-${s.nextId++}`,
          vendor: groupBuy().id,
          unitShare: groupBuy().unit_share,
          paidUsd: o.paidUsd,
          orderedQuarter: o.orderedQuarter,
          outcome: o.outcome,
          deliverQuarter: o.deliverQuarter,
          delivered: false,
        })
    }
    // every balance becomes yours
    for (const m of ALL) {
      const b = club.bal[m]
      if (b.cash > 0) book(s, 'other_income', b.cash)
      landPlayer(s, 'BTC', b.BTC)
      landPlayer(s, 'LTC', b.LTC)
      landPlayer(s, 'DOGE', b.DOGE)
    }
    usd = friendsOwed
  } else {
    // dissolve: machines at the used price, orders at their refund, coins at the week's price, all split by shares
    let lots = 0
    for (const l of club.lots) lots += l.kind === 'box' ? l.count * CL().boxVendor.price_usd.value * refund : l.count * sellPrice(getModel(l.model)!, s.quarter)
    let orders = 0
    for (const o of club.orders) if (!o.delivered) orders += o.paidUsd * refund
    const pot = lots + orders
    const total = pot + ALL.reduce((a, m) => a + balUsd(club.bal[m], px), 0)
    const yours = shareOf(club, 'you') * pot
    if (yours > 0) book(s, 'asset_sales', yours)
    // your own balance (when Jun held the keys) comes to you; the friends take theirs
    const mine = club.bal.you
    if (mine.cash > 0) book(s, 'other_income', mine.cash)
    const coinsUsd = mine.BTC * px.BTC + mine.LTC * px.LTC + mine.DOGE * px.DOGE
    if (coinsUsd > 0) book(s, 'coins_sold', coinsUsd)
    usd = total
    void assets
  }
  roundCash(s)
  p.clubEnded = { kind: what, quarter: s.quarter, usd, early }
  delete p.club
  logEntry(s, what === 'buy_out' ? 'log.p0_club_bought_out' : 'log.p0_club_dissolved', { valueUsd: usd })
}

// ---------- actions ----------

export function setGpuCoin(s: GameState, coin: 'BTC' | 'LTC' | 'DOGE'): Message | undefined {
  const club = s.prologue!.club
  if (!club) return fail('error.p0_club_none')
  club.gpuCoin = coin
  logEntry(s, 'log.p0_club_gpu_coin', { coin })
  return undefined
}

export function setEnding(s: GameState, kind: 'buy_out' | 'dissolve'): Message | undefined {
  const club = s.prologue!.club
  if (!club) return fail('error.p0_club_none')
  club.ending = kind
  return undefined
}

/** The club's net worth to you now: your share of its assets and, with Jun, the balance he holds for you. */
export function clubEquityUsd(s: GameState): number {
  const club = s.prologue?.club
  if (!club) return 0
  return shareOf(club, 'you') * clubAssetsUsd(s, club) + (club.keys === 'jun' ? balUsd(club.bal.you, prices(s)) : 0)
}

