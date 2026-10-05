// M31.3 (doc 33 §11.1, §11.5): the space-equity window (open at a 12× space multiple; blocks under way priced on the
// story), lunar funding (agency task orders, the Accords bloc's strings; never debt), and the fire sale before the
// emergency raise (an orbital block × 0.4, a lunar site × 0.2 or × 0.5 to a bloc).
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { equityPreMoneyUsd, spaceStoryUsd, spaceWindowOpen } from '../../src/sim/systems/equity.ts'
import { act4FireSale, fireSaleCandidates } from '../../src/sim/systems/fireSale.ts'
import { claimOf, missionCostUsd, missionOwnCostUsd } from '../../src/sim/systems/moon.ts'
import { siteValueUsd, startQuarterMoonOps } from '../../src/sim/systems/moonOps.ts'
import { orbitRow } from '../../src/sim/systems/orbit.ts'
import { orbitConstructionUsd } from '../../src/sim/systems/orbitOps.ts'
import { rescueBeforeGameOver } from '../../src/sim/systems/rescue.ts'
import { act, orbitCompany } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

describe('the space-equity window (M31.3)', () => {
  it('open at a 12× space multiple or more; shut below (F3 after its cascade)', () => {
    const s = orbitCompany('f3')
    expect(spaceWindowOpen(s)).toBe(true)
    s.quarter = Q('2033Q1')
    expect(orbitRow(s).space_ev_ebitda_mult).toBeLessThan(12)
    expect(err(s, { type: 'RAISE_EQUITY', dilution: 0.1 })).toBe('error.space_window_shut')
  })

  it('blocks under way are priced at capex × (space multiple ÷ 20) in the raise', () => {
    let s = orbitCompany('f1')
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    Object.assign(s.act4Orbit!.blocks[0], { stage: 'building', capexSpentUsd: 2e8 })
    expect(orbitConstructionUsd(s)).toBe(2e8)
    expect(spaceStoryUsd(s)).toBeCloseTo(2e8 * (orbitRow(s).space_ev_ebitda_mult / 20 - 1))
    const plain = structuredClone(s)
    plain.act4Orbit!.blocks = []
    expect(equityPreMoneyUsd(s) - equityPreMoneyUsd(plain)).toBeCloseTo(spaceStoryUsd(s))
  })
})

describe('lunar funding: agency task orders (M31.3)', () => {
  /** A company with a claim, the task order on offer. */
  function offered(): GameState {
    let s = orbitCompany('f1')
    s.politicalCapital = 60
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
    for (let q = s.quarter; !s.act4Moon!.taskOrderUsd; q++) {
      s.quarter = q
      startQuarterMoonOps(s)
    }
    return s
  }

  it('offered with a claim; accepting it pays part of the next mission and aligns you with the Accords bloc', () => {
    let s = offered()
    const usd = s.act4Moon!.taskOrderUsd!
    expect(usd).toBeGreaterThanOrEqual(5e7 * 0.99)
    expect(usd).toBeLessThanOrEqual(0.6 * missionCostUsd(s) + 1)
    s = act(s, { type: 'ACCEPT_TASK_ORDER' })
    expect(s.act4Moon!.alignedBloc).toBe('accords')
    expect(missionOwnCostUsd(s)).toBeCloseTo(missionCostUsd(s) - usd)
    const cash = s.cash
    s = act(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })
    expect(cash - s.cash).toBeCloseTo(missionCostUsd(s) - usd)
    expect(s.act4Moon!.missionCreditUsd).toBeCloseTo(0)
  })

  it('a company aligned with the Station partnership is never offered one', () => {
    const s = act(orbitCompany('f1'), { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' } as Action)
    s.act4Moon!.alignedBloc = 'station'
    for (let q = s.quarter; q < s.quarter + 12; q++) {
      startQuarterMoonOps({ ...s, quarter: q })
      expect(s.act4Moon!.taskOrderUsd ?? null).toBeNull()
    }
  })
})

describe('fire sales before the emergency raise (M31.3)', () => {
  it('short of cash, the smallest asset that cures it is sold: a live block × 0.4 on the space multiple', () => {
    let s = orbitCompany('f1')
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    Object.assign(s.act4Orbit!.blocks[0], { stage: 'live', lastEbitdaUsd: 2e7, tenant: 'spot' })
    const price = 2e7 * 4 * orbitRow(s).space_ev_ebitda_mult * 0.4
    expect(fireSaleCandidates(s)[0].priceUsd).toBeCloseTo(price)
    s.cash = -1e8
    expect(rescueBeforeGameOver(s)).toBe('sale')
    expect(s.act4Orbit!.blocks[0].stage).toBe('sold')
    expect(s.cash).toBeCloseTo(-1e8 + price)
  })

  it('a lunar site sells at × 0.2, or × 0.5 to a bloc that wants it', () => {
    let s = orbitCompany('f1')
    s.politicalCapital = 60
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })
    s = act(s, { type: 'CLAIM_LUNAR_SITE', site: 'nobile_rim' })
    for (const site of ['cabeus', 'nobile_rim'] as const) Object.assign(claimOf(s, site)!, { status: 'held', landedQuarter: s.quarter })
    const c = fireSaleCandidates(s)
    expect(c.find((x) => x.id === 'cabeus')!.priceUsd).toBeCloseTo(siteValueUsd(s, claimOf(s, 'cabeus')!) * 0.2)
    expect(c.find((x) => x.id === 'nobile_rim')!.priceUsd).toBeCloseTo(siteValueUsd(s, claimOf(s, 'nobile_rim')!) * 0.5)
    expect(act4FireSale(s, 1e12)).toBe(false)
  })
})
