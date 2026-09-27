// Act II ASIC prices from the market file's $/TH tiers, and the Antminer S21 (owner decision B7).
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  buyPrice,
  getModel,
  marketWeek,
  revenuePerUnitDay,
  sellPrice,
} from '../../src/sim/systems/market.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const tier = (label: string, t: 'old' | 'mid' | 'new' | 'latest') =>
  marketWeek(q(label), 0)[`asic_price_usd_th_${t}`]!

describe('ASIC prices in Act II (owner B7)', () => {
  it('S19 Pro: the "new" tier × 110 TH/s; used at its 2022Q3 used/new ratio', () => {
    const m = getModel('s19pro')!
    const n = tier('2023Q1', 'new') * 110
    expect(buyPrice(m, q('2023Q1'), 'new')).toBeCloseTo(n, 6)
    expect(buyPrice(m, q('2023Q1'), 'used')).toBeCloseTo((n * 2900) / 3300, 6)
    expect(sellPrice(m, q('2023Q1'))).toBeCloseTo((n * 2900) / 3300, 6)
    // Act I is unchanged.
    expect(buyPrice(m, q('2022Q3'), 'new')).toBe(3300)
  })

  it('S9: the "old" tier × 13.5 TH/s, used only (retail ended 2020Q1), at its 2020Q1 ratio', () => {
    const m = getModel('s9')!
    expect(buyPrice(m, q('2024Q2'), 'new')).toBeUndefined()
    expect(buyPrice(m, q('2024Q2'), 'used')).toBeCloseTo(
      tier('2024Q2', 'old') * 13.5 * (120 / 300),
      6,
    )
  })

  it('GPU rigs keep their 2022Q3 prices', () => {
    const m = getModel('gpu_gen2')!
    expect(buyPrice(m, q('2024Q2'), 'used')).toBe(
      buyPrice(m, q('2022Q3'), 'used'),
    )
  })
})

describe('the Antminer S21 (owner B7; Bitmain spec 200 TH/s, 3,500 W, 17.5 J/TH)', () => {
  const m = getModel('s21')!

  it('has the published spec', () => {
    expect(m.hashrate).toBe(200)
    expect(m.power_kw).toBe(3.5)
    expect((m.power_kw * 1000) / m.hashrate).toBe(17.5)
  })

  it('new from 2024Q1 on the "latest" tier; used from 2025Q1', () => {
    expect(buyPrice(m, q('2023Q4'), 'new')).toBeUndefined()
    expect(buyPrice(m, q('2024Q1'), 'new')).toBeCloseTo(
      tier('2024Q1', 'latest') * 200,
      6,
    )
    expect(buyPrice(m, q('2024Q4'), 'used')).toBeUndefined()
    expect(buyPrice(m, q('2025Q1'), 'used')).toBeCloseTo(
      tier('2025Q1', 'latest') * 200 * (2900 / 3300),
      6,
    )
    // Not in Act I at all.
    expect(buyPrice(m, q('2022Q3'), 'new')).toBeUndefined()
  })

  it('can be bought and placed in Act II, and mines 200 TH/s', () => {
    const s: GameState = {
      ...newGame(1),
      act: 2,
      quarter: q('2024Q2'),
      cash: 1_000_000,
    }
    s.sites.push({
      id: 'site-2',
      tier: 'warehouse',
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    })
    const r = applyAction(s, {
      type: 'BUY_MACHINES',
      model: 's21',
      condition: 'new',
      count: 10,
      siteId: 'site-2',
    })
    expect(r.ok).toBe(true)
    const w = marketWeek(q('2024Q2'), 0)
    expect(revenuePerUnitDay(m, w)).toBeCloseTo(
      200 * w.btc_hashprice_usd_th_day,
      10,
    )
  })
})
