// Distressed auctions (scope §2.7): in crypto winters a failed miner's machines are sold
// off in a sealed-bid auction against 2–3 rivals. A lot may come up at the start of a
// Plan phase in an auction window; bidding costs Bandwidth and is settled at once.
// The rolls use their own stream (substream), so they don't change the rest of the game.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { pick, randomInt, substream, uniform } from '../rng.ts'
import { logEntry, type Auction, type GameState } from '../state.ts'
import { addMachines } from './machines.ts'
import { getModel, sellPrice } from './market.ts'
import { activeRivals } from './rivals.ts'
import { capacityKw, usedKw } from './sites.ts'

/** The auction window covering this quarter, if any. */
export function auctionWindow(quarter: number) {
  const q = CONTENT.quarters[quarter]
  return CONTENT.auction.windows.find((w) => w.from <= q && q <= w.to)
}

/** Whole lot at the used price. */
export function lotValueUsd(a: Auction): number {
  return a.count * a.unitListUsd
}

const roundTo100 = (usd: number) => Math.max(100, Math.round(usd / 100) * 100)

/** Start of a Plan phase: in an auction window, a lot comes up with the rules' chance. */
export function rollAuction(state: GameState): void {
  state.auction = null
  const win = auctionWindow(state.quarter)
  if (!win) return
  const rules = CONTENT.auction
  const r = substream(state.seed, `auction:${state.quarter}`)
  if (uniform(r, 0, 1) >= rules.chancePerQuarter) return
  const model = getModel(pick(r, win.models))!
  // Lots come in tens: "240 used Antminer S9".
  const count =
    randomInt(r, rules.lotUnits[0] / 10, rules.lotUnits[1] / 10) * 10
  const unitListUsd = sellPrice(model, state.quarter)
  const value = count * unitListUsd
  const reserveUsd = roundTo100(value * uniform(r, ...rules.reserveShare))
  const rivals = activeRivals(state.quarter).map((x) => x.id)
  const n = Math.min(rivals.length, randomInt(r, ...rules.rivalBidders))
  const bids: Auction['bids'] = []
  for (let i = 0; i < n; i++) {
    const rival = rivals.splice(randomInt(r, 0, rivals.length - 1), 1)[0]
    bids.push({
      rival,
      bidUsd: roundTo100(value * uniform(r, ...rules.rivalBidShare)),
    })
  }
  state.auction = { model: model.id, count, unitListUsd, reserveUsd, bids }
  logEntry(state, 'log.auction_open', {
    count,
    model: model.id,
    listUsd: unitListUsd,
    reserveUsd,
  })
}

/** The best rival bid (the one you have to beat). */
export function topRivalBid(a: Auction): { rival: string; bidUsd: number } {
  return a.bids.reduce((best, b) => (b.bidUsd > best.bidUsd ? b : best))
}

/** Why this bid can't be placed, or undefined if it can. */
export function bidBlocker(
  state: GameState,
  bidUsd: number,
  siteId: string,
): Message | undefined {
  const a = state.auction
  if (!a) return { key: 'error.no_auction' }
  if (!(bidUsd >= a.reserveUsd))
    return {
      key: 'error.bid_below_reserve',
      params: { reserveUsd: a.reserveUsd },
    }
  const bw = CONTENT.auction.bandwidth
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  if (bidUsd > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: bidUsd, cashUsd: state.cash },
    }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  const freeKw = capacityKw(site) - usedKw(state, site.id)
  const neededKw = getModel(a.model)!.power_kw * a.count
  if (neededKw > freeKw + 1e-9)
    return {
      key: 'error.no_capacity',
      params: { tier: site.tier, freeKw, neededKw },
    }
}

/**
 * Places the sealed bid and settles the auction. The highest bid wins and pays what it
 * bid (a tie goes to the rival). Win: the used machines join the chosen site at once.
 * Either way the auction is over and the Bandwidth is spent.
 */
export function placeBid(
  state: GameState,
  bidUsd: number,
  siteId: string,
): void {
  const a = state.auction!
  state.bandwidth -= CONTENT.auction.bandwidth
  const top = topRivalBid(a)
  if (bidUsd > top.bidUsd) {
    state.cash -= bidUsd
    addMachines(state, a.model, 'used', a.count, siteId)
    logEntry(state, 'log.auction_won', {
      count: a.count,
      model: a.model,
      bidUsd,
      sharePct: bidUsd / lotValueUsd(a),
      rival: top.rival,
      rivalUsd: top.bidUsd,
    })
  } else {
    logEntry(state, 'log.auction_lost', {
      rival: top.rival,
      rivalUsd: top.bidUsd,
      bidUsd,
    })
  }
  state.auction = null
}

/** End of the Plan phase with no bid: the best rival takes the lot. */
export function closeAuction(state: GameState): void {
  const a = state.auction
  if (!a) return
  const top = topRivalBid(a)
  logEntry(state, 'log.auction_passed', {
    rival: top.rival,
    count: a.count,
    model: a.model,
    rivalUsd: top.bidUsd,
  })
  state.auction = null
}
