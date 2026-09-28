// Act I's liquidity brake (owner, P5.0 answer P1; designed): a prologue start's coin sales are capped
// each week with a price impact, the rest waits; a crypto-backed loan is capped at 4 weeks of the cap.
// A $10K start never meets the brake (the Act I goldens are unchanged: tests/golden-replay.test.ts).
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { playGame } from '../../src/sim/replay.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { maxCryptoLoanUsd } from '../../src/sim/systems/cryptoLoan.ts'
import {
  act1SellCapUsdWeek,
  sellQueued,
} from '../../src/sim/systems/liquidity.ts'
import { coinPrice, marketWeek } from '../../src/sim/systems/market.ts'
import { sellTreasury } from '../../src/sim/systems/treasury.ts'
import { BOTS } from '../../tools/bots.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** An Act I game that came from the prologue, holding `btc`. */
function rich(btc: number, label = '2017Q1'): GameState {
  const s = newGame(1)
  s.quarter = q(label)
  s.treasury.BTC = btc
  s.prologueCarry = {
    startNetWorthUsd: btc * 1000,
    onExchange: { BTC: 0, ETH: 0 },
    lost: { exchange: { BTC: 0, ETH: 0 }, wallet: { BTC: 0, ETH: 0 } },
  }
  return s
}

describe('the Act I liquidity brake', () => {
  it('the designed caps: $20M a week in 2017, $50M 2018–19, $100M 2020, $250M 2021–22', () => {
    expect(act1SellCapUsdWeek(q('2017Q3'))).toBe(20e6)
    expect(act1SellCapUsdWeek(q('2019Q4'))).toBe(50e6)
    expect(act1SellCapUsdWeek(q('2020Q2'))).toBe(100e6)
    expect(act1SellCapUsdWeek(q('2022Q3'))).toBe(250e6)
    expect(BALANCE.act1Liquidity.designed).toBe(true)
  })

  it('a prologue start selling its whole treasury: the cap sells, at a lower price; the rest waits and sells next week', () => {
    const s = rich(1_000_000)
    const w = marketWeek(s.quarter, 0)
    const px = coinPrice(w, 'BTC')
    const usd = sellTreasury(s, 1, w, 'BTC')
    const cap = 20e6
    expect(usd).toBeCloseTo(cap * (1 - 0.2), 0)
    expect(s.treasury.BTC).toBeCloseTo(1_000_000 - cap / px, 3)
    expect(s.act1Liquidity!.queue.BTC).toBeCloseTo(1_000_000 - cap / px, 3)
    // The same week: nothing more sells.
    expect(sellQueued(s, { BTC: px, ETH: 0 })).toBe(0)
    // The next week: another cap's worth.
    s.week = 1
    expect(sellQueued(s, { BTC: px, ETH: 0 })).toBeCloseTo(cap * 0.8, 0)
  })

  it('a small sale by a prologue start pays a small impact', () => {
    const s = rich(10)
    const w = marketWeek(s.quarter, 0)
    const px = coinPrice(w, 'BTC')
    const usd = sellTreasury(s, 1, w, 'BTC')
    const sale = 10 * px
    expect(usd).toBeCloseTo(sale * (1 - 0.2 * (sale / 20e6)), 6)
    expect(s.treasury.BTC).toBeCloseTo(0, 9)
  })

  it('a $10K start never meets the brake: no brake state, sales at the market price', () => {
    const s = newGame(1)
    s.treasury.BTC = 10
    const w = marketWeek(s.quarter, 0)
    expect(sellTreasury(s, 1, w, 'BTC')).toBe(10 * coinPrice(w, 'BTC'))
    expect(s.act1Liquidity).toBeUndefined()
    const end = playGame(2017, BOTS['cautious']).state
    expect(end.act1Liquidity).toBeUndefined()
  })

  it('a crypto-backed loan is capped at 4 weeks of the year’s sell cap', () => {
    const s = rich(10_000_000, '2021Q1')
    expect(maxCryptoLoanUsd(s, 'BTC')).toBe(4 * 250e6)
  })
})
