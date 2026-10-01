// M18.3: the Act III presets are recipes (a bot and a seed played to 2026Q4); presets_act3.json records their real
// figures, and the good and lifeline ones sit in their bands. And the act3Seed salt: absent, nothing changes; set, Act
// III's own random streams move.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import file from '../../src/content/presets_act3.json' with { type: 'json' }
import { toAct3 } from '../../src/sim/state.ts'
import { act2Company } from './act2Helpers.ts'
import { fitsPreset, presetCompany, presetFigures } from '../../tools/act3Presets.ts'

describe('the presets', () => {
  for (const p of file.presets)
    it(`${p.id} "${p.label}": ${p.bot} seed ${p.seed} reaches 2026Q4 with the recorded figures`, () => {
      const s = presetCompany(p.bot, p.seed)!
      expect(s).not.toBeNull()
      const f = presetFigures(s)
      expect(f).toMatchObject({
        valuation_usd_m: p.valuation_usd_m,
        cash_usd_m: p.cash_usd_m,
        debt_usd_m: p.debt_usd_m,
        energized_mw: p.energized_mw,
        contracted_mw: p.contracted_mw,
        sites_with_power: p.sites_with_power,
        tenants: p.tenants,
        rating: p.rating,
        heat_max: p.heat,
        anger_max: p.ratepayer_anger,
      })
      if (p.id !== 'great') expect(fitsPreset(p.id as 'good' | 'lifeline', s)).toBe(true)
      // the start screen's figures come from the content loader
      const c = CONTENT.act3Presets.find((x) => x.id === p.id)!
      expect(c.valuationUsd).toBeCloseTo(p.valuation_usd_m * 1e6, 0)
      // enterAct3 sets political capital to 40 for all
      expect(toAct3(s).politicalCapital).toBe(40)
    }, 30_000)
})

describe('the act3Seed salt (M18.3)', () => {
  it('absent: the game seed keys Act III’s streams (no change); set: the wildcard draw moves', () => {
    const base = act2Company('2026Q4', 7)
    const plain = toAct3(base, { scenario: 's0' })
    expect(plain.act3Seed).toBeUndefined()
    const salted = (n: number) => toAct3(base, { scenario: 's0', act3Seed: n }).act3Wildcards
    expect(toAct3(base, { scenario: 's0', act3Seed: 7 }).act3Wildcards).toEqual(plain.act3Wildcards)
    const draws = new Set([1, 2, 3, 4, 5, 6].map((n) => JSON.stringify(salted(n))))
    expect(draws.size).toBeGreaterThan(1)
  })
})
