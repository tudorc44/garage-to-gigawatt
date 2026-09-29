// Act boundary 1b: Act I's content files end in 2022Q3. From 2022Q4 on, every Act I value the
// sim looks up (prices, power paths, multiples, rivals, salaries, loan terms) holds its 2022Q3
// value, until Act II content replaces it. No new numbers are made up.
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  act1ValueQuarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { playGame } from '../../src/sim/replay.ts'
import { newGame, type Site } from '../../src/sim/state.ts'
import { salaryUsdQ } from '../../src/sim/systems/hires.ts'
import { equipmentTerms } from '../../src/sim/systems/loans.ts'
import {
  buyPrice,
  getModel,
  leadTimeQuarters,
  sellPrice,
} from '../../src/sim/systems/market.ts'
import { getRival, rivalSnapshot } from '../../src/sim/systems/rivals.ts'
import { normalPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { eraMultiple } from '../../src/sim/systems/valuation.ts'
import { BOTS } from '../../tools/bots.ts'

const Q3_2022 = actLastQuarter(1) // 22
const Q4_2022 = Q3_2022 + 1
// Act II's own last quarter (39), not "the last index CONTENT.quarters has": since M10 the array
// also holds 2 Act III stub quarters after 2026Q4, which this file's "Act I holds through Act II"
// checks are not about.
const Q4_2026 = actLastQuarter(2)

describe('Act I values hold their 2022Q3 value from 2022Q4 on', () => {
  it('reads Act I content at the quarter itself in Act I, at 2022Q3 after it', () => {
    expect(act1ValueQuarter(5)).toBe(CONTENT.quarters[5])
    expect(act1ValueQuarter(Q3_2022)).toBe('2022Q3')
    expect(act1ValueQuarter(Q4_2022)).toBe('2022Q3')
    expect(act1ValueQuarter(Q4_2026)).toBe('2022Q3')
  })

  it('GPU rig prices and every lead time hold; ASIC prices follow the Act II tiers (owner B7, M3.3)', () => {
    for (const m of CONTENT.machines) {
      expect(sellPrice(m, Q4_2022)).toBeGreaterThan(0)
      for (const q of [Q4_2022, Q4_2026])
        expect(leadTimeQuarters(m, q, 'new')).toBe(
          leadTimeQuarters(m, Q3_2022, 'new'),
        )
      if (m.act2_price) continue // ASICs: tests/sim/asicPrices.test.ts
      for (const q of [Q4_2022, Q4_2026]) {
        expect(buyPrice(m, q, 'used')).toBe(buyPrice(m, Q3_2022, 'used'))
        expect(buyPrice(m, q, 'new')).toBe(buyPrice(m, Q3_2022, 'new'))
      }
      // Selling: GPU rigs follow the Act II GPU resale curve (−15% a year from 2022Q4, owner
      // 28 Sep 2026); other machines hold.
      expect(sellPrice(m, Q4_2022)).toBe(sellPrice(m, Q3_2022))
      expect(sellPrice(m, Q4_2026)).toBeCloseTo(
        sellPrice(m, Q3_2022) * (m.coin === 'ETH' ? 0.4 : 1),
        6,
      )
    }
    // The S9's retail sale ended in 2020Q1, and stays ended.
    expect(buyPrice(getModel('s9')!, Q4_2022, 'new')).toBeUndefined()
  })

  it('power prices: replaced by the region series (owner B3, M3.1); only the garage holds 2022', () => {
    for (const tier of CONTENT.siteTiers) {
      const site = { tier: tier.id, powerPriceMult: 1 } as Site
      expect(normalPriceUsdKwh(site, Q4_2022)).toBeGreaterThan(0)
      if (tier.id === 'garage')
        expect(normalPriceUsdKwh(site, Q4_2026)).toBe(
          normalPriceUsdKwh(site, Q3_2022),
        )
      else
        expect(normalPriceUsdKwh(site, Q4_2026)).not.toBe(
          normalPriceUsdKwh(site, Q3_2022),
        )
    }
  })

  it('the era multiple: replaced by Act II content (capital_act2.json, M2.2), no longer held', () => {
    // Act II's mining multiple starts where Act I's ended (4×), so there's no jump at the boundary.
    expect(eraMultiple(Q4_2022)).toBe(CONTENT.eraMultiple['2022Q3'])
    expect(eraMultiple(Q4_2026)).toBe(5)
  })

  it("rivals keep their 2022Q3 numbers (rivals.json), so they don't drop out of the table", () => {
    for (const r of CONTENT.rivals) {
      expect(rivalSnapshot(r, Q4_2026)).toEqual(rivalSnapshot(r, Q3_2022))
    }
    expect(rivalSnapshot(getRival('riot')!, Q4_2022)).not.toBeNull()
  })

  it('salaries: Act I’s 2022 value to 2022Q3, then hires_act2.json’s from 2022Q4 (M5.7)', () => {
    const ops = CONTENT.hires.list.find((h) => h.id === 'ops_manager')!
    expect(salaryUsdQ(ops, Q3_2022)).toBe((130_000 * 1.08) / 4)
    expect(salaryUsdQ(ops, Q4_2022)).toBe(120_000 / 4)
    expect(salaryUsdQ(ops, Q4_2026)).toBe(185_000 / 4) // held after the 2026Q3 anchor
    const exUtility = CONTENT.hires.list.find((h) => h.id === 'ex_utility')!
    expect(salaryUsdQ(exUtility, Q4_2022)).toBe(180_000 / 4) // the file's ex_utility_exec
  })

  it('equipment loans: closed in 2022Q3 (the 2022 era ended 2022Q2), always offered in Act II (scope 0.2 §2.7, M4.1)', () => {
    const at = (quarter: number) => equipmentTerms({ ...newGame(1), quarter })
    expect(at(Q3_2022)).toBeUndefined()
    expect(at(Q4_2022)).toBeDefined()
    expect(at(Q4_2026)).toBeDefined()
  })
})

describe('the Act I systems keep running through Act II', () => {
  it('plays a raise-climb game through the act boundary to the end of 2026Q4 without errors', () => {
    // playGame throws if the bot sends an action the game refuses. (Seed 2 since M4.0a, when seed 1's
    // raise-climb went bust in 2025 with its idle S9s.)
    const s = playGame(2, BOTS['raise-climb'], { through: 2 }).state
    expect(s.phase).toBe('chapter')
    expect(s.act).toBe(2)
    expect(s.quarter).toBe(Q4_2026)
    const act2Reports = s.reports.filter(
      (r) => CONTENT.quarters.indexOf(r.quarter) >= Q4_2022,
    )
    expect(act2Reports.map((r) => r.quarter)).toEqual(
      CONTENT.quarters.slice(Q4_2022, Q4_2026 + 1),
    )
    for (const r of act2Reports) {
      expect(Number.isFinite(r.valuationUsd)).toBe(true)
      expect(Number.isFinite(r.cash)).toBe(true)
      expect(r.coinsMined.ETH).toBe(0) // no ETH mining after the Merge
    }
    // BTC mining carries on (the S19s keep hashing at the new hashprice).
    expect(act2Reports.some((r) => r.revenueUsd > 0)).toBe(true)
  })
})
