import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import {
  buyPrice,
  coinPrice,
  getModel,
  leadTimeQuarters,
  marketWeek,
  previousMarketWeek,
  revenuePerUnitDay,
  sellPrice,
} from '../../src/sim/systems/market.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const model = (id: string) => getModel(id)!

describe('market system', () => {
  it('reads prices straight from market_weekly, no noise', () => {
    const w = marketWeek(0, 0)
    expect(w.week).toBe('2017-01-02')
    expect(coinPrice(w, 'BTC')).toBe(964.39)
    expect(coinPrice(w, 'ETH')).toBe(8.15)
  })

  it('finds the previous week across a quarter boundary', () => {
    expect(previousMarketWeek(0, 0)).toBeUndefined()
    expect(previousMarketWeek(1, 0)).toBe(marketWeek(0, 12))
    expect(previousMarketWeek(1, 5)).toBe(marketWeek(1, 4))
  })

  it('computes revenue per unit per day from hashprice and ETH $/MH', () => {
    const w = marketWeek(q('2017Q4'), 0)
    expect(revenuePerUnitDay(model('gpu_gen1'), w)).toBeCloseTo(
      180 * w.eth_rev_usd_mh_day,
    )
    expect(revenuePerUnitDay(model('s9'), w)).toBeCloseTo(
      13.5 * w.btc_hashprice_usd_th_day,
    )
  })

  it('only sells machines once they exist (review A1)', () => {
    expect(buyPrice(model('gpu_gen1'), 0, 'new')).toBe(2000)
    expect(buyPrice(model('s19pro'), q('2020Q1'), 'new')).toBeUndefined()
    expect(buyPrice(model('s19pro'), q('2020Q2'), 'new')).toBe(2600)
    expect(buyPrice(model('gpu_gen2'), q('2020Q3'), 'used')).toBeUndefined()
    expect(buyPrice(model('gpu_gen2'), q('2020Q4'), 'new')).toBe(3600)
  })

  it('stops selling new S9s after 2020Q1 but keeps a used market', () => {
    expect(buyPrice(model('s9'), q('2020Q1'), 'new')).toBe(300)
    expect(buyPrice(model('s9'), q('2020Q2'), 'new')).toBeUndefined()
    expect(buyPrice(model('s9'), q('2020Q2'), 'used')).toBe(50)
    expect(sellPrice(model('s9'), q('2022Q3'))).toBe(25)
  })

  it('uses dated lead times for new machines; used ones arrive at once', () => {
    expect(leadTimeQuarters(model('s19pro'), q('2021Q2'), 'new')).toBe(3)
    expect(leadTimeQuarters(model('s19pro'), q('2020Q2'), 'new')).toBe(0)
    expect(leadTimeQuarters(model('s19pro'), q('2021Q2'), 'used')).toBe(0)
  })
})
