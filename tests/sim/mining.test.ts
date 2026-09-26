import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { binomial } from '../../src/sim/rng.ts'
import {
  newGame,
  type GameState,
  type MachineLot,
} from '../../src/sim/state.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'
import {
  hashrate,
  mineWeek,
  rollFailures,
} from '../../src/sim/systems/mining.ts'
import {
  sellTreasury,
  settleWeek,
  treasuryValueUsd,
} from '../../src/sim/systems/treasury.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A game at `quarter` with one batch of machines in the garage, already earning. */
function withLot(quarter: string, lot: Partial<MachineLot> = {}): GameState {
  const s = newGame(7)
  s.quarter = q(quarter)
  s.machines.push({
    id: 'lot-1',
    model: 'gpu_gen1',
    siteId: 'site-1',
    condition: 'new',
    count: 1,
    failed: 0,
    earnsFromQuarter: 0,
    ...lot,
  })
  return s
}

describe('mining', () => {
  it('a garage rig in Q4 2017 mines ETH worth 180 MH × $/MH × 7 days, minus power', () => {
    const s = withLot('2017Q4')
    const w = marketWeek(q('2017Q4'), 0)
    const [lot] = mineWeek(s, w)
    expect(lot.running).toBe(true)
    expect(lot.revenueUsd).toBeCloseTo(180 * w.eth_rev_usd_mh_day * 7)
    expect(lot.powerCostUsd).toBeCloseTo(0.95 * 24 * 7 * 0.12)
    expect(lot.coinsMined).toBeCloseTo(lot.revenueUsd / w.eth_usd)
  })

  it('switches a batch off in a week when revenue is below power cost', () => {
    const s = withLot('2018Q4')
    const losingWeek = CONTENT.market[q('2018Q4')].find(
      (w) => 180 * w.eth_rev_usd_mh_day < 0.95 * 24 * 0.12,
    )!
    const [lot] = mineWeek(s, losingWeek)
    expect(lot).toMatchObject({
      running: false,
      revenueUsd: 0,
      powerCostUsd: 0,
    })
  })

  it('GPU rigs switch off for good after the Merge (week 12 of 2022Q3)', () => {
    const s = withLot('2022Q3')
    expect(mineWeek(s, marketWeek(q('2022Q3'), 11))[0].running).toBe(false)
  })

  it("doesn't mine before the batch's first earning quarter", () => {
    const s = withLot('2017Q1', { earnsFromQuarter: 1 })
    expect(mineWeek(s, marketWeek(0, 0))).toEqual([])
    expect(hashrate(s)).toEqual({ BTC: 0, ETH: 0 })
  })

  it('broken units stop hashing', () => {
    const s = withLot('2017Q4', { count: 4, failed: 1 })
    expect(mineWeek(s, marketWeek(q('2017Q4'), 0))[0].working).toBe(3)
    expect(hashrate(s).ETH).toBe(540)
  })
})

describe('failure roll', () => {
  it('is the same for the same seed', () => {
    const a = withLot('2019Q1', { count: 500, model: 's9', condition: 'used' })
    const b = structuredClone(a)
    for (let i = 0; i < 20; i++) expect(rollFailures(a)).toBe(rollFailures(b))
    expect(a).toEqual(b)
  })

  it('averages units × annual rate / 52 (× 1.5 used)', () => {
    let total = 0
    const weeks = 2000
    for (let i = 0; i < weeks; i++) {
      const s = withLot('2019Q1', { count: 50, model: 's9', condition: 'used' })
      s.rng = i
      total += rollFailures(s)
    }
    const expected = 50 * (0.1 / 52) * 1.5
    expect(total / weeks).toBeGreaterThan(expected * 0.8)
    expect(total / weeks).toBeLessThan(expected * 1.2)
  })

  it('binomial stays within 0…n and near n × p for big fleets', () => {
    const h = { rng: 11 }
    const rolls = Array.from({ length: 500 }, () => binomial(h, 10_000, 0.002))
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(0)
    const mean = rolls.reduce((a, b) => a + b, 0) / rolls.length
    expect(mean).toBeGreaterThan(18)
    expect(mean).toBeLessThan(22)
  })
})

describe('treasury', () => {
  it('HODL 0% sells everything mined; power and rent are paid', () => {
    const s = withLot('2017Q4')
    const w = marketWeek(q('2017Q4'), 0)
    const lots = mineWeek(s, w)
    const money = settleWeek(s, lots, w)
    expect(s.treasury.ETH).toBe(0)
    expect(s.cash).toBeCloseTo(
      10_000 + lots[0].revenueUsd - lots[0].powerCostUsd,
    )
    expect(money.rentUsd).toBe(0) // the garage is rent-free
  })

  it('HODL 60% keeps 60% of mined coins in the treasury', () => {
    const s = withLot('2017Q4')
    s.hodlPct = { BTC: 0, ETH: 0.6 }
    const w = marketWeek(q('2017Q4'), 0)
    const lots = mineWeek(s, w)
    settleWeek(s, lots, w)
    expect(s.treasury.ETH).toBeCloseTo(lots[0].coinsMined * 0.6)
    expect(treasuryValueUsd(s, w)).toBeCloseTo(lots[0].revenueUsd * 0.6)
  })

  it('charges site rent weekly (quarterly rent / 13)', () => {
    const s = withLot('2017Q4')
    s.sites.push({
      id: 'site-2',
      tier: 'small_unit',
      readyQuarter: 0,
      rentUsdQ: 6500,
      powerPriceMult: 1,
      flaw: null,
    })
    const w = marketWeek(q('2017Q4'), 0)
    expect(settleWeek(s, [], w).rentUsd).toBe(500)
    expect(s.cash).toBe(9500)
  })

  it('sells a share of the treasury at this week’s price', () => {
    const s = newGame(1)
    s.treasury = { BTC: 2, ETH: 100 }
    const w = marketWeek(0, 0)
    const usd = sellTreasury(s, 0.25, w)
    expect(usd).toBeCloseTo(0.5 * w.btc_usd + 25 * w.eth_usd)
    expect(s.treasury).toEqual({ BTC: 1.5, ETH: 75 })
  })
})
