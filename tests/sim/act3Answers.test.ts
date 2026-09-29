// M11.5a: the answers to the M11.4c open questions: scouting open in Act III (Q1), ASIC prices from the
// scenario weekly files (Q2), the hashprice seam rebased (Q3), the hosting rate following the region's
// power price (Q4).
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  act2Quarter,
  actFirstQuarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { playGame } from '../../src/sim/replay.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import {
  hostingRateUsdKwh,
  renewHosting,
} from '../../src/sim/systems/hosting.ts'
import {
  buyPrice,
  marketWeek,
  sellPrice,
} from '../../src/sim/systems/market.ts'
import {
  landUsdMw,
  openCategories,
  scoutAct2,
  scoutAct2Blocker,
} from '../../src/sim/systems/scouting.ts'
import { regionOf } from '../../src/sim/systems/sites.ts'
import { BOTS } from '../../tools/bots.ts'
import { act2Company } from './act2Helpers.ts'

const FIRST = actFirstQuarter(3)
const LAST = actLastQuarter(3)
const s21 = () => CONTENT.machines.find((m) => m.id === 's21')!

let end: GameState
beforeAll(() => {
  end = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
})

describe('Q1: scouting and site offers are open in Act III', () => {
  it('scouting works: every category is open, offers come with a price and a region', () => {
    const s = { ...toAct3(end, { scenario: 's2' }), bandwidth: 6 }
    expect(scoutAct2Blocker(s)).toBeUndefined()
    expect(openCategories(FIRST).map((c) => c.id)).toEqual(
      CONTENT.act2Sites.categories.map((c) => c.id),
    )
    const offers = scoutAct2(s)
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) {
      expect(o.capexUsd).toBeGreaterThan(0)
      expect(o.region).toBeDefined()
    }
    // ...and the reducer accepts it.
    const r = applyAction(
      { ...toAct3(end, { scenario: 's2' }), bandwidth: 6 },
      { type: 'SCOUT_SITES_ACT2' },
    )
    expect(r.ok).toBe(true)
  })

  it('Act II is unchanged: its categories still follow their dated windows', () => {
    expect(
      openCategories(CONTENT.quarters.indexOf('2022Q4')).map((c) => c.id),
    ).toEqual(['distressed_miner_site'])
  })

  it('energized land: Act II’s 2026 price × the scenario’s announced-AI EV/MW ÷ its 2027Q1 value', () => {
    for (const id of SCENARIO_IDS) {
      const base = landUsdMw(actLastQuarter(2), 'ercot')
      expect(landUsdMw(FIRST, 'ercot', id)).toBeCloseTo(base, 6) // 2027Q1: ratio 1
      for (let n = 0; n < 16; n++) {
        const rows = CONTENT.act3Scenarios[id].quarterly
        const ratio =
          rows[n].ev_per_mw_ai_announced_usd_m! /
          rows[0].ev_per_mw_ai_announced_usd_m!
        expect(landUsdMw(FIRST + n, 'ercot', id)).toBeCloseTo(base * ratio, 6)
      }
    }
    // Cheap in S1's bust, dear in S2.
    const at = (id: 's1' | 's2') => landUsdMw(FIRST + 8, 'ercot', id)
    expect(at('s1')).toBeLessThan(landUsdMw(FIRST, 'ercot', 's1'))
    expect(at('s2')).toBeGreaterThan(landUsdMw(FIRST, 'ercot', 's2'))
  })
})

describe('Q2: ASIC prices in Act III come from the scenario weekly files', () => {
  it('an S21 has a new and a used price in every quarter of 2027–2030 in every scenario', () => {
    const m = s21()
    for (const id of SCENARIO_IDS)
      for (let q = FIRST; q <= LAST; q++) {
        const perTh = marketWeek(q, 0, id).asic_price_usd_th_latest!
        expect(perTh).toBeGreaterThan(0)
        expect(
          buyPrice(m, q, 'new', id),
          `${id} ${CONTENT.quarters[q]} new`,
        ).toBeCloseTo(perTh * m.hashrate, 6)
        expect(buyPrice(m, q, 'used', id)).toBeGreaterThan(0)
        expect(sellPrice(m, q, id)).toBeGreaterThan(0)
      }
  })

  it('the tier mapping is the model’s own: S19 Pro on the new tier, S9 on the old, used-only S9', () => {
    const s19 = CONTENT.machines.find((m) => m.id === 's19pro')!
    const s9 = CONTENT.machines.find((m) => m.id === 's9')!
    const w = marketWeek(FIRST, 0, 's0')
    expect(buyPrice(s19, FIRST, 'new', 's0')).toBeCloseTo(
      w.asic_price_usd_th_new! * s19.hashrate,
      6,
    )
    expect(buyPrice(s9, FIRST, 'used', 's0')).toBeCloseTo(
      w.asic_price_usd_th_old! * s9.hashrate * (120 / 300),
      4,
    )
  })

  it('different scenarios price the same machine differently', () => {
    const prices = SCENARIO_IDS.map((id) =>
      buyPrice(s21(), FIRST + 8, 'new', id),
    )
    expect(new Set(prices).size).toBeGreaterThan(1)
  })

  it('Act II prices are unchanged (no scenario)', () => {
    const q = CONTENT.quarters.indexOf('2025Q1')
    expect(buyPrice(s21(), q, 'new')).toBeCloseTo(
      marketWeek(q, 0).asic_price_usd_th_latest! * s21().hashrate,
      6,
    )
  })
})

describe('Q3: the hashprice seam is rebased', () => {
  const lastWeek = CONTENT.market[actLastQuarter(2)].at(-1)!

  it('every scenario opens on Act II’s last weekly hashprice, in $/PH/day and $/TH/day', () => {
    for (const id of SCENARIO_IDS) {
      const first = marketWeek(FIRST, 0, id)
      expect(first.btc_hashprice_usd_ph_day).toBe(
        lastWeek.btc_hashprice_usd_ph_day,
      )
      expect(first.btc_hashprice_usd_th_day).toBeCloseTo(
        lastWeek.btc_hashprice_usd_th_day,
        3,
      )
    }
  })

  it('the quarterly hashprice matches the weekly one (same constant)', () => {
    for (const id of SCENARIO_IDS)
      for (let n = 0; n < 16; n++) {
        const q = CONTENT.act3Scenarios[id].quarterly[n]
        const w = CONTENT.act3Scenarios[id].weeks[n].at(-1)!
        // the quarter row is the quarter-end figure to within the file's own rounding
        expect(
          Math.abs(q.btc_hashprice_usd_ph_day / w.btc_hashprice_usd_ph_day - 1),
        ).toBeLessThan(0.08)
      }
  })

  it('a pure miner’s revenue no longer jumps at the boundary (2027Q1 week 1 vs 2026Q4 week 13)', () => {
    for (const id of SCENARIO_IDS) {
      const step =
        marketWeek(FIRST, 0, id).btc_hashprice_usd_th_day /
        lastWeek.btc_hashprice_usd_th_day
      expect(Math.abs(step - 1)).toBeLessThan(0.01)
    }
  })

  it('the signals text uses one common 2026Q4 figure ($44 and $21.9) in all four files', () => {
    const texts = SCENARIO_IDS.map(
      (id) =>
        CONTENT.signals[id].find((i) => i.id === 'bitcoin_hashprice')!
          .higher_means,
    )
    expect(new Set(texts).size).toBe(1)
    expect(texts[0]).toContain('$44/PH/day pre-halving, $21.9 post-halving')
  })

  it('other seam fields: the game never reads H200 hyperscaler rent or hyperscaler capex for a price', () => {
    const files = [
      '../../src/sim/systems/projects.ts',
      '../../src/sim/systems/finance.ts',
    ]
    for (const f of files) {
      const t = readFileSync(new URL(f, import.meta.url), 'utf8')
      expect(t).not.toMatch(/h200\.hyperscaler|hyperscalerCapexUsdBnQ/)
    }
  })
})

describe('Q4: hosting reprices to the region’s power price in Act III', () => {
  const region = 'ercot'
  const anchor = CONTENT.quarters.indexOf('2024Q1')
  const margin = () => 0.06 - act2Quarter(anchor)!.powerUsdKwh[region]

  it('Act III rate = the region’s scenario power price + Act II’s margin (0.060 − its 2024Q1 price)', () => {
    for (const id of SCENARIO_IDS)
      for (let q = FIRST; q <= LAST; q++)
        expect(hostingRateUsdKwh(q, region, id)).toBeCloseTo(
          CONTENT.act3Scenarios[id].quarterly[q - FIRST].power_usd_kwh_ercot! +
            margin(),
          8,
        )
  })

  it('it moves with the scenario’s power price (2027Q1 → 2030Q4)', () => {
    const a = hostingRateUsdKwh(FIRST, region, 's0')
    const b = hostingRateUsdKwh(LAST, region, 's0')
    expect(b).not.toBe(a)
  })

  it('Act II is unchanged: the file’s rate for the year, whatever the region', () => {
    const q2026 = CONTENT.quarters.indexOf('2026Q4')
    expect(hostingRateUsdKwh(q2026)).toBe(0.06)
    expect(hostingRateUsdKwh(q2026, region)).toBe(0.06)
    expect(hostingRateUsdKwh(CONTENT.quarters.indexOf('2022Q4'))).toBe(0.085)
  })

  it('every live contract reprices at the start of each Act III quarter', () => {
    const s = toAct3(act2Company('2026Q4', 4), { scenario: 's2' })
    s.hosting.push({
      id: 'host-x',
      siteId: s.sites.find((x) => x.tier !== BALANCE.startSite)!.id,
      kw: 5000,
      readyQuarter: FIRST,
      rateUsdKwh: 0.06,
      termEndQuarter: FIRST + 20, // far from renewal
    })
    s.quarter = FIRST + 3
    renewHosting(s)
    const site = s.sites.find((x) => x.id === s.hosting[0].siteId)!
    expect(s.hosting[0].rateUsdKwh).toBeCloseTo(
      hostingRateUsdKwh(FIRST + 3, regionOf(site), 's2'),
      8,
    )
    expect(s.hosting[0].rateUsdKwh).not.toBe(0.06)
  })
})
