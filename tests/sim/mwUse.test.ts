// MW by use (scope 0.2 §2.2 and §2.4, wireframes A2-03 / A2-06): every kW at a site is in exactly
// one use, and the uses add up to the site's capacity.
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import {
  newGame,
  type GameState,
  type MachineLot,
  type Site,
} from '../../src/sim/state.ts'
import { MW_USES, mwByUse, siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import { usedKw } from '../../src/sim/systems/sites.ts'

const Q = 24 // 2023Q1

const site = (id: string, tier: string, readyQuarter = 0): Site => ({
  id,
  tier,
  readyQuarter,
  rentUsdQ: 0,
  powerPriceMult: 1,
  flaw: null,
})
const lot = (siteId: string, model: string, count: number): MachineLot => ({
  id: `lot-${siteId}-${model}`,
  model,
  siteId,
  condition: 'used',
  count,
  failed: 0,
  earnsFromQuarter: 0,
})
const total = (u: Record<string, number>) =>
  MW_USES.reduce((kw, use) => kw + u[use], 0)

describe('MW by use', () => {
  it('a new game: the 5 kW garage sits idle', () => {
    const s = newGame(1)
    expect(siteMwByUse(s, s.sites[0], 0)).toEqual({
      mining: 0,
      hosting: 0,
      aiShell: 0,
      aiCloud: 0,
      building: 0,
      idle: 5,
    })
  })

  it('splits a warehouse between mining, hosting (live and converting) and idle', () => {
    const s: GameState = { ...newGame(1), quarter: Q }
    s.sites.push(site('site-2', 'warehouse'))
    s.machines.push(lot('site-2', 's19pro', 100)) // 325 kW
    s.hosting.push(
      {
        id: 'h-1',
        siteId: 'site-2',
        kw: 200,
        readyQuarter: Q, // live
        rateUsdKwh: 0.075,
        termEndQuarter: Q + 3,
      },
      {
        id: 'h-2',
        siteId: 'site-2',
        kw: 100,
        readyQuarter: Q + 1, // being converted
        rateUsdKwh: 0.075,
        termEndQuarter: Q + 4,
      },
    )
    const u = siteMwByUse(s, s.sites[1], Q)
    expect(u.mining).toBe(325)
    expect(u.hosting).toBe(200)
    expect(u.building).toBe(100)
    expect(u.idle).toBe(375)
    expect(total(u)).toBe(1000)
    // Taken for placing machines: machines + all hosting.
    expect(usedKw(s, 'site-2')).toBe(625)
    // Next quarter the conversion is live.
    expect(siteMwByUse(s, s.sites[1], Q + 1).hosting).toBe(300)
  })

  it('a site still being built is all "building"', () => {
    const s: GameState = { ...newGame(1), quarter: Q }
    s.sites.push(site('site-2', 'small_unit', Q + 1))
    const u = siteMwByUse(s, s.sites[1], Q)
    expect(u.building).toBe(100)
    expect(total(u)).toBe(100)
  })

  it('a phased Texas site: unpowered phases are building; machines only mine on powered kW', () => {
    const s: GameState = { ...newGame(1), quarter: Q }
    s.sites.push({ ...site('site-2', 'texas_site'), phases: [Q, Q + 2] })
    s.machines.push(lot('site-2', 's19pro', 8000)) // 26 MW placed, 20 MW powered
    const u = siteMwByUse(s, s.sites[1], Q)
    expect(u.mining).toBe(20000)
    expect(u.building).toBe(20000)
    expect(u.idle).toBe(0)
    expect(total(u)).toBe(40000)
  })

  it('adds up across sites', () => {
    const s: GameState = { ...newGame(1), quarter: Q }
    s.sites.push(site('site-2', 'small_unit'))
    s.machines.push(lot('site-1', 's9', 2), lot('site-2', 's9', 10))
    const u = mwByUse(s, Q)
    expect(u.mining).toBeCloseTo(2.64 + 13.2)
    expect(total(u)).toBeCloseTo(105)
  })

  it('hosting counts as taken: you can’t buy machines into hosted MW', () => {
    const s: GameState = { ...newGame(1), quarter: Q, cash: 1e9 }
    s.sites.push(site('site-2', 'small_unit'))
    s.hosting.push({
      id: 'h-1',
      siteId: 'site-2',
      kw: 99,
      readyQuarter: Q,
      rateUsdKwh: 0.075,
      termEndQuarter: Q + 3,
    })
    const r = applyAction(s, {
      type: 'BUY_MACHINES',
      model: 's9',
      condition: 'used',
      count: 1,
      siteId: 'site-2',
    })
    expect(!r.ok && r.error.key).toBe('error.no_capacity')
  })
})
