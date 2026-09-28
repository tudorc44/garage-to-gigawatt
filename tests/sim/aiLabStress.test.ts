// M7.0 (owner answers A3, A8): the 2026 AI-lab stress (distress halves payments; terminate and
// re-let), and the last resorts before an Act II game over (a forced project sale, then emergency
// equity).
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import type { GameState } from '../../src/sim/state.ts'
import {
  annualContractUsd,
  saleValueUsd,
  startQuarterProjects,
} from '../../src/sim/systems/projects.ts'
import { rescueBeforeGameOver } from '../../src/sim/systems/rescue.ts'
import { act2Company, ok } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** A live 5 MW shell leased to `card`, in `label`. */
function liveShell(card: string, label = '2026Q2'): GameState {
  let s = ok(act2Company('2023Q3'), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s.projects[0].offers = [{ id: 'o1', card, readyByQuarters: 5 }]
  s = ok(s, { type: 'PROJECT_SIGN_TENANT', projectId: 'project-1', offerId: 'o1' })
  s.projects[0].stage = 'live'
  s.projects[0].readyQuarter = s.quarter
  s.quarter = q(label)
  return s
}

describe('the 2026 AI-lab stress (A3)', () => {
  it('from 2026Q2, AI-lab contracts roll 12% a quarter; distress halves what they pay', () => {
    let hits = 0
    const n = 400
    for (let seed = 1; seed <= n; seed++) {
      const s = { ...liveShell('tc_meridian_labs'), seed }
      startQuarterProjects(s)
      if (s.projects[0].tenant?.distressedQuarter !== undefined) hits++
    }
    expect(hits / n).toBeGreaterThan(0.08)
    expect(hits / n).toBeLessThan(0.16)
    // Before 2026Q2, and for other tenants, never.
    for (let seed = 1; seed <= 100; seed++) {
      const early = { ...liveShell('tc_meridian_labs', '2026Q1'), seed }
      startQuarterProjects(early)
      expect(early.projects[0].tenant?.distressedQuarter).toBeUndefined()
      const aa = { ...liveShell('tc_north_azure_cloud'), seed }
      startQuarterProjects(aa)
      expect(aa.projects[0].tenant?.distressedQuarter).toBeUndefined()
    }
    const s = liveShell('tc_meridian_labs')
    const full = annualContractUsd(s.projects[0])
    s.projects[0].tenant!.distressedQuarter = s.quarter
    expect(annualContractUsd(s.projects[0])).toBeCloseTo(full * 0.5, 4)
  })

  it('terminate and re-let: 1 BW, no offers for 2 quarters, then offers again', () => {
    const s = liveShell('tc_meridian_labs')
    expect(() => ok(s, { type: 'PROJECT_RELET', projectId: 'project-1' })).toThrow(
      'error.not_distressed',
    )
    s.projects[0].tenant!.distressedQuarter = s.quarter
    s.phase = 'plan'
    s.bandwidth = 3
    let r = ok(s, { type: 'PROJECT_RELET', projectId: 'project-1' })
    expect(r.bandwidth).toBe(2)
    expect(r.projects[0].tenant).toBeNull()
    expect(r.projects[0].emptyUntil).toBe(s.quarter + 1)
    // The next quarter: still empty.
    r = { ...r, quarter: s.quarter + 1 }
    startQuarterProjects(r)
    expect(r.projects[0].offers).toHaveLength(0)
    // The one after: offers again.
    r = { ...r, quarter: s.quarter + 2 }
    startQuarterProjects(r)
    expect(r.projects[0].offers.length).toBeGreaterThan(0)
  })
})

describe('the last resorts before a game over (A8)', () => {
  it('sells the smallest project that cures the shortfall, at cap-rate value × 0.85', () => {
    const s = liveShell('tc_north_azure_cloud')
    const value = saleValueUsd(s, s.projects[0])
    s.cash = -value * 0.5
    expect(rescueBeforeGameOver(s)).toBe('sale')
    expect(s.projects[0].stage).toBe('sold')
    expect(s.cash).toBeCloseTo(-value * 0.5 + Math.round(value * 0.85), 0)
    expect(s.log.at(-1)!.key).toBe('log.rescue_sale')
  })

  it('no project cures it: an emergency raise at half the valuation, at most 30%', () => {
    const s = act2Company('2024Q1')
    s.reports.push({ ...s.reports.at(-1)!, valuationUsd: 100_000_000 })
    const stake = s.founderStake
    s.cash = -10_000_000
    expect(rescueBeforeGameOver(s)).toBe('equity')
    expect(s.cash).toBeGreaterThanOrEqual(0)
    // $10M at a $50M pre-money: 10 / 60 of the company.
    expect(s.founderStake).toBeCloseTo(stake * (1 - 10 / 60), 9)
    expect(s.log.at(-1)!.key).toBe('log.rescue_equity')
  })

  it('both fail (the raise would dilute more than 30%): game over stands', () => {
    const s = act2Company('2024Q1')
    s.reports.push({ ...s.reports.at(-1)!, valuationUsd: 10_000_000 })
    s.cash = -10_000_000
    expect(rescueBeforeGameOver(s)).toBeNull()
    expect(s.cash).toBe(-10_000_000)
    expect(BALANCE.finance.rescue.maxDilution).toBe(0.3)
  })
})
