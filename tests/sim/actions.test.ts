import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance as advanceWeek } from '../../src/sim/advance.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(state: GameState, action: Action): GameState {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(`expected ok, got ${r.error.key}`)
  return r.state
}
function err(state: GameState, action: Action): string {
  const r = applyAction(state, action)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
const rich = (cash = 5_000_000): GameState => ({ ...newGame(1), cash })
const buyRigs = (count: number, condition: 'new' | 'used' = 'new'): Action => ({
  type: 'BUY_MACHINES',
  model: 'gpu_gen1',
  condition,
  count,
  siteId: 'site-1',
})

describe('buying and selling machines', () => {
  it('buys a rig for the garage; it earns from next quarter', () => {
    const s = ok(newGame(1), buyRigs(1))
    expect(s.cash).toBe(8000)
    expect(s.machines).toEqual([
      expect.objectContaining({
        model: 'gpu_gen1',
        count: 1,
        earnsFromQuarter: 1,
      }),
    ])
  })

  it('merges identical purchases into one batch', () => {
    const s = ok(ok(rich(), buyRigs(2)), buyRigs(1))
    expect(s.machines).toHaveLength(1)
    expect(s.machines[0].count).toBe(3)
  })

  it('never changes the state it was given', () => {
    const before = newGame(1)
    const copy = structuredClone(before)
    applyAction(before, buyRigs(1))
    applyAction(before, buyRigs(99))
    expect(before).toEqual(copy)
  })

  it('checks garage capacity (5 kW fits 5 rigs, not 6)', () => {
    expect(ok(rich(), buyRigs(5)).machines[0].count).toBe(5)
    expect(err(rich(), buyRigs(6))).toBe('error.no_capacity')
  })

  it('checks cash, sale dates, counts and phase', () => {
    expect(err({ ...newGame(1), cash: 9000 }, buyRigs(5))).toBe('error.no_cash')
    expect(
      err(rich(), {
        type: 'BUY_MACHINES',
        model: 's19pro',
        condition: 'new',
        count: 1,
        siteId: 'site-1',
      }),
    ).toBe('error.not_for_sale')
    expect(err(rich(), buyRigs(0))).toBe('error.bad_count')
    expect(err({ ...rich(), phase: 'live' }, buyRigs(1))).toBe(
      'error.wrong_phase',
    )
  })

  it('sells at the used price, broken units first at used price minus repair', () => {
    let s = ok(rich(10_000), buyRigs(2, 'used')) // 2 × $1,500
    s.machines[0].failed = 1
    s = ok(s, { type: 'SELL_MACHINES', lotId: s.machines[0].id, count: 1 })
    expect(s.cash).toBe(7000 + 1500 - 150)
    expect(s.machines[0]).toMatchObject({ count: 1, failed: 0 })
  })

  it('repairs broken units for repair_cost_usd each', () => {
    let s = ok(rich(10_000), buyRigs(3, 'used'))
    s.machines[0].failed = 2
    s = ok(s, { type: 'REPAIR_MACHINES', lotId: s.machines[0].id })
    expect(s.cash).toBe(10_000 - 4500 - 300)
    expect(s.machines[0].failed).toBe(0)
    expect(err(s, { type: 'REPAIR_MACHINES', lotId: s.machines[0].id })).toBe(
      'error.nothing_to_repair',
    )
  })
})

describe('HODL', () => {
  it('accepts 0–100% only', () => {
    expect(ok(newGame(1), { type: 'SET_HODL', pct: 0.6 }).hodlPct).toEqual({
      BTC: 0.6,
      ETH: 0.6,
    })
    expect(
      ok(newGame(1), { type: 'SET_HODL', pct: 0.6, coin: 'ETH' }).hodlPct,
    ).toEqual({ BTC: 0, ETH: 0.6 })
    expect(err(newGame(1), { type: 'SET_HODL', pct: 1.2 })).toBe(
      'error.bad_pct',
    )
  })
})

describe('site ladder', () => {
  it('builds a small unit straight away (no scouting), ready next quarter', () => {
    const s = ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' })
    expect(s.cash).toBe(5_000_000 - 35_000)
    expect(s.bandwidth).toBe(2)
    expect(s.sites[1]).toMatchObject({
      tier: 'small_unit',
      readyQuarter: 1,
      flaw: null,
    })
    expect(err(rich(), { type: 'SCOUT_SITES', tier: 'small_unit' })).toBe(
      'error.no_scouting_needed',
    )
  })

  it('only lets you scout one tier above your biggest site', () => {
    expect(err(rich(), { type: 'SCOUT_SITES', tier: 'warehouse' })).toBe(
      'error.cannot_scout',
    )
    expect(err(rich(), { type: 'BUILD_SITE', tier: 'warehouse' })).toBe(
      'error.cannot_scout',
    )
  })

  it('scouting costs 1 Bandwidth and reveals 2–3 offers, each hiding a flaw', () => {
    const s = ok(ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' }), {
      type: 'SCOUT_SITES',
      tier: 'warehouse',
    })
    expect(s.bandwidth).toBe(1)
    expect(s.siteOffers.length).toBeGreaterThanOrEqual(2)
    expect(s.siteOffers.length).toBeLessThanOrEqual(3)
    const flaws = CONTENT.siteTiers.find(
      (x) => x.id === 'warehouse',
    )!.possible_flaws
    for (const o of s.siteOffers) {
      expect(o.tier).toBe('warehouse')
      expect(flaws).toContain(o.flaw)
      expect(o.capexUsd).toBeGreaterThanOrEqual(400_000 * 0.85)
      expect(o.capexUsd).toBeLessThanOrEqual(400_000 * 1.15)
    }
  })

  it('building an offer applies its flaw (delay, one-off cost) and removes the offer', () => {
    let s = ok(ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' }), {
      type: 'SCOUT_SITES',
      tier: 'warehouse',
    })
    s.siteOffers[0].flaw = 'zoning' // delay 1 quarter, −$50k
    const offer = s.siteOffers[0]
    const cashBefore = s.cash
    s = ok(s, { type: 'BUILD_SITE', offerId: offer.id })
    expect(s.cash).toBe(cashBefore - offer.capexUsd - 50_000)
    expect(s.sites.at(-1)).toMatchObject({
      tier: 'warehouse',
      readyQuarter: 2,
      flaw: 'zoning',
    })
    expect(s.siteOffers.find((o) => o.id === offer.id)).toBeUndefined()
    expect(s.bandwidth).toBe(0)
  })

  it('runs out of Bandwidth', () => {
    const s = { ...rich(), bandwidth: 0 }
    expect(err(s, { type: 'BUILD_SITE', tier: 'small_unit' })).toBe(
      'error.no_bandwidth',
    )
  })

  it('keeps Texas locked until 2020Q1 (review A2)', () => {
    const s = rich()
    s.sites.push({
      id: 'site-9',
      tier: 'own_site',
      readyQuarter: 0,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    })
    expect(err(s, { type: 'SCOUT_SITES', tier: 'texas_site' })).toBe(
      'error.tier_not_available',
    )
    expect(
      ok(
        { ...s, quarter: q('2020Q1') },
        { type: 'SCOUT_SITES', tier: 'texas_site' },
      ).siteOffers.length,
    ).toBeGreaterThan(0)
  })
})

describe('selling treasury coins from the Plan screen', () => {
  const holding = (): GameState => ({
    ...newGame(1),
    treasury: { BTC: 2, ETH: 100 },
  })

  it('sells a share of one coin at the Plan-screen price, for 1 Bandwidth', () => {
    const w = CONTENT.market[0][0]
    const s = ok(holding(), { type: 'SELL_TREASURY', coin: 'ETH', pct: 0.5 })
    expect(s.treasury).toEqual({ BTC: 2, ETH: 50 })
    expect(s.cash).toBeCloseTo(10_000 + 50 * w.eth_usd)
    expect(s.bandwidth).toBe(2)
    const entry = s.log.at(-1)!
    expect(entry.key).toBe('log.treasury_sold')
    expect(t(entry.key, entry.params)).toMatch(
      /^Sold 50% of your ETH \(50\.0000 ETH\) for \$/,
    )
  })

  it('refuses: a coin you do not hold, a bad share, no Bandwidth, outside the Plan phase', () => {
    const noBtc = { ...holding(), treasury: { BTC: 0, ETH: 100 } }
    const sellBtc: Action = { type: 'SELL_TREASURY', coin: 'BTC', pct: 1 }
    expect(err(noBtc, sellBtc)).toBe('error.nothing_to_sell')
    expect(err(holding(), { type: 'SELL_TREASURY', coin: 'ETH', pct: 0 })).toBe(
      'error.bad_pct',
    )
    expect(err({ ...holding(), bandwidth: 0 }, sellBtc)).toBe(
      'error.no_bandwidth',
    )
    expect(err({ ...holding(), phase: 'live' }, sellBtc)).toBe(
      'error.wrong_phase',
    )
  })
})

describe('leaving a site (breaking the lease)', () => {
  // A small unit (rent $6,000/quarter) with 3 used rigs on it, and $10,000 cash.
  function withSmallUnit(): GameState {
    let s = ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' })
    s = ok(s, {
      type: 'BUY_MACHINES',
      model: 'gpu_gen1',
      condition: 'used',
      count: 3,
      siteId: 'site-2',
    })
    return { ...s, cash: 10_000, bandwidth: 0 }
  }

  it('costs one month of rent and no Bandwidth; machines there are sold', () => {
    const s = ok(withSmallUnit(), { type: 'LEAVE_SITE', siteId: 'site-2' })
    expect(s.sites.map((x) => x.tier)).toEqual(['garage'])
    expect(s.machines).toEqual([])
    expect(s.bandwidth).toBe(0)
    const sold = s.log.find((e) => e.key === 'log.sold')!
    expect(s.cash).toBeCloseTo(10_000 + Number(sold.params!.valueUsd) - 2_000)
    const entry = s.log.at(-1)!
    expect(t(entry.key, entry.params)).toBe(
      'Left the Small unit 1 and paid $2,000 to break the lease. No more rent there.',
    )
  })

  it('stops the rent: a quarter without the site costs nothing', () => {
    let s = ok(withSmallUnit(), { type: 'LEAVE_SITE', siteId: 'site-2' })
    const cash = s.cash
    s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live') {
      const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      s = r.ok ? r.state : advanceWeek(s)
    }
    expect(s.cash).toBe(cash)
  })

  it('works on a site still being built (the build money is lost)', () => {
    const s = ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' })
    expect(s.sites[1].readyQuarter).toBe(1)
    const left = ok(s, { type: 'LEAVE_SITE', siteId: 'site-2' })
    expect(left.cash).toBe(5_000_000 - 35_000 - 2_000)
  })

  it("can't leave the garage, and needs cash for the penalty", () => {
    expect(err(rich(), { type: 'LEAVE_SITE', siteId: 'site-1' })).toBe(
      'error.cannot_leave_garage',
    )
    const broke = {
      ...ok(rich(), { type: 'BUILD_SITE', tier: 'small_unit' }),
      cash: 100,
    }
    expect(err(broke, { type: 'LEAVE_SITE', siteId: 'site-2' })).toBe(
      'error.no_cash',
    )
  })
})

describe('Bandwidth and power prices', () => {
  it('gives +1 Bandwidth once an own site is energized', () => {
    const s = rich()
    expect(bandwidthForQuarter(s)).toBe(3)
    s.sites.push({
      id: 'site-9',
      tier: 'own_site',
      readyQuarter: 2,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    })
    expect(bandwidthForQuarter(s)).toBe(3)
    expect(bandwidthForQuarter({ ...s, quarter: 2 })).toBe(4)
  })

  it('reads power prices by year; Texas uses its fixed option; a rate-class hike (set by its card) applies', () => {
    const garage = newGame(1).sites[0]
    expect(powerPriceUsdKwh(garage, 0)).toBe(0.12)
    expect(powerPriceUsdKwh(garage, q('2022Q1'))).toBe(0.15)
    const texas = {
      id: 'x',
      tier: 'texas_site',
      readyQuarter: 13,
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: null,
    }
    expect(powerPriceUsdKwh(texas, 13)).toBe(0.035)
    const hiked = {
      ...texas,
      tier: 'warehouse',
      readyQuarter: 1,
      flaw: 'rate_class',
    }
    // No silent hike any more: the utility_rate_hike card sets it (events.json).
    expect(powerPriceUsdKwh(hiked, 5)).toBe(0.06)
    expect(powerPriceUsdKwh({ ...hiked, rateMult: 1.3 }, 5)).toBeCloseTo(
      0.06 * 1.3,
    )
  })
})

describe('error messages', () => {
  it('turn into readable English with formatted numbers and names', () => {
    const r = applyAction({ ...newGame(1), cash: 9000 }, buyRigs(5))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(t(r.error.key, r.error.params)).toBe(
        'Not enough cash: this costs $10.0K, you have $9,000.',
      )
    }
    expect(t('error.not_for_sale', { model: 's19pro', condition: 'new' })).toBe(
      "Antminer S19 Pro (new) isn't for sale this quarter.",
    )
  })
})
