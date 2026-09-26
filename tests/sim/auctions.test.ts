import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  auctionWindow,
  lotValueUsd,
  rollAuction,
} from '../../src/sim/systems/auctions.ts'
import { startNextQuarter } from '../../src/sim/systems/quarter.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function ok(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
const say = (s: GameState) => t(s.log.at(-1)!.key, s.log.at(-1)!.params)

/** 2019Q1 Plan phase with a warehouse and a known lot: 100 used S9s, rivals bid $8K and $9K. */
function withLot(cash = 50_000): GameState {
  const s = { ...newGame(1), quarter: q('2019Q1'), cash }
  s.sites.push({
    id: 'site-9',
    tier: 'warehouse',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  s.auction = {
    model: 's9',
    count: 100,
    unitListUsd: 150,
    reserveUsd: 6_000,
    bids: [
      { rival: 'riot', bidUsd: 8_000 },
      { rival: 'core', bidUsd: 9_000 },
    ],
  }
  return s
}
const bid = (bidUsd: number, siteId = 'site-9'): Action => ({
  type: 'BID_AUCTION',
  bidUsd,
  siteId,
})

describe('distressed auction lots', () => {
  it('only come up in the crypto-winter windows (2018Q4–2019Q2, 2020Q2, 2022Q2–Q3)', () => {
    const windows = CONTENT.quarters.filter((_, i) => auctionWindow(i))
    expect(windows).toEqual([
      '2018Q4',
      '2019Q1',
      '2019Q2',
      '2020Q2',
      '2022Q2',
      '2022Q3',
    ])
    const s = { ...newGame(1), quarter: q('2018Q3') }
    rollAuction(s)
    expect(s.auction).toBeNull()
  })

  it('come up in about half of the window quarters, with lots inside the content ranges', () => {
    let lots = 0
    let quarters = 0
    for (let seed = 1; seed <= 200; seed++) {
      for (const label of ['2018Q4', '2020Q2', '2022Q2']) {
        const s = { ...newGame(seed), quarter: q(label) }
        rollAuction(s)
        quarters++
        const a = s.auction
        if (!a) continue
        lots++
        expect(auctionWindow(s.quarter)!.models).toContain(a.model)
        expect(a.count).toBeGreaterThanOrEqual(50)
        expect(a.count).toBeLessThanOrEqual(500)
        expect(a.count % 10).toBe(0)
        const value = lotValueUsd(a)
        expect(a.reserveUsd).toBeGreaterThanOrEqual(value * 0.4 - 100)
        expect(a.reserveUsd).toBeLessThanOrEqual(value * 0.6 + 100)
        expect(a.bids.length).toBeGreaterThanOrEqual(2)
        expect(a.bids.length).toBeLessThanOrEqual(3)
        expect(new Set(a.bids.map((b) => b.rival)).size).toBe(a.bids.length)
        for (const b of a.bids) {
          expect(b.bidUsd).toBeGreaterThanOrEqual(value * 0.5 - 100)
          expect(b.bidUsd).toBeLessThanOrEqual(value * 0.9 + 100)
        }
      }
    }
    expect(lots / quarters).toBeGreaterThan(0.4)
    expect(lots / quarters).toBeLessThan(0.6)
  })

  it('are the same for the same seed, and leave the main random stream alone', () => {
    const a = { ...newGame(7), quarter: q('2019Q1') }
    const b = { ...newGame(7), quarter: q('2019Q1') }
    rollAuction(a)
    rollAuction(b)
    expect(a.auction).toEqual(b.auction)
    expect(a.rng).toBe(newGame(7).rng)
  })

  it('are rolled when a new Plan phase starts, and logged', () => {
    // Find a seed that gets a lot in 2018Q4.
    let seed = 1
    for (; ; seed++) {
      const probe = { ...newGame(seed), quarter: q('2018Q4') }
      rollAuction(probe)
      if (probe.auction) break
    }
    const s = {
      ...newGame(seed),
      quarter: q('2018Q3'),
      phase: 'report' as const,
    }
    startNextQuarter(s)
    expect(s.auction).not.toBeNull()
    expect(s.log.at(-1)!.key).toBe('log.auction_open')
  })
})

describe('bidding', () => {
  it('a winning bid pays, spends 2 Bandwidth and puts the used machines on the site', () => {
    const s = ok(withLot(), bid(9_500))
    expect(s.cash).toBe(40_500)
    expect(s.bandwidth).toBe(1)
    expect(s.auction).toBeNull()
    const lot = s.machines.find((l) => l.siteId === 'site-9')!
    expect(lot).toMatchObject({ model: 's9', condition: 'used', count: 100 })
    expect(lot.earnsFromQuarter).toBe(q('2019Q2'))
    expect(say(s)).toBe(
      'You won the auction: 100 × used Antminer S9 for $9,500 (63% of list). Best rival bid: Core Scientific, $9,000.',
    )
  })

  it('a losing bid costs the Bandwidth but no money, and shows who won', () => {
    const s = ok(withLot(), bid(8_500))
    expect(s.cash).toBe(50_000)
    expect(s.bandwidth).toBe(1)
    expect(s.machines).toEqual([])
    expect(s.auction).toBeNull()
    expect(say(s)).toBe(
      'Core Scientific won the auction with $9,000. Your sealed bid was $8,500.',
    )
  })

  it('a tie goes to the rival', () => {
    expect(ok(withLot(), bid(9_000)).machines).toEqual([])
  })

  it('checks the minimum bid, Bandwidth, cash and site space', () => {
    expect(err(withLot(), bid(5_999))).toBe('error.bid_below_reserve')
    expect(err({ ...withLot(), bandwidth: 1 }, bid(9_500))).toBe(
      'error.no_bandwidth',
    )
    expect(err(withLot(9_000), bid(9_500))).toBe('error.no_cash')
    // 100 S9s need 132 kW; the garage has 5 kW.
    expect(err(withLot(), bid(9_500, 'site-1'))).toBe('error.no_capacity')
    expect(err(newGame(1), bid(9_500))).toBe('error.no_auction')
  })

  it('with no bid, the best rival takes the lot when the quarter starts', () => {
    const s = ok(withLot(), { type: 'END_PLAN' })
    expect(s.auction).toBeNull()
    expect(say(s)).toBe(
      'Core Scientific bought the distressed lot (100 × Antminer S9) for $9,000.',
    )
  })
})
