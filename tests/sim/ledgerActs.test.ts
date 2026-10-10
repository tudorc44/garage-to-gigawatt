// M37.6 (doc 39): a sample quarter's category totals in each act, checked against the figures the game's own quarter
// report computes on its own (the prologue's report; Act I's revenue, power, rent, salaries; Act II's hosting fees and
// AI revenue; Acts III and IV's interest and fees). Each runs a whole act, so no clock decides pass or fail.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import type { Lines, LedgerQuarter } from '../../src/sim/ledger.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { playFrom, playGame, playPrologue } from '../../src/sim/replay.ts'
import type { GameState, QuarterReport } from '../../src/sim/state.ts'
import { BOTS } from '../../tools/bots.ts'
import { PROLOGUE_BOTS } from '../../tools/prologueBots.ts'
import { act3Finished, act4Company } from './act4Helpers.ts'

const near = (a: number, b: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(0.01)
const L = (lines: Lines, ...cats: (keyof Lines)[]) => cats.reduce((s, c) => s + (lines[c] ?? 0), 0)

function quarterOf(s: GameState, label: string): { lq: LedgerQuarter; r: QuarterReport } {
  const q = CONTENT.quarters.indexOf(label)
  const lq = s.ledger!.quarters.find((x) => x.q === q && !x.partial)!
  const r = s.reports.find((x) => x.quarter === label)!
  expect(lq, `ledger ${label}`).toBeDefined()
  expect(r, `report ${label}`).toBeDefined()
  return { lq, r }
}

describe('category totals match each act’s own quarter report', () => {
  it('the prologue: income at home, rent and power match the prologue’s report', () => {
    const s = playPrologue(2009, PROLOGUE_BOTS['careful-hodler'], { through: 0 }).state
    const reports = s.prologue!.reports.filter((r) => r.powerCostUsd > 0)
    expect(reports.length).toBeGreaterThan(4)
    for (const r of reports.slice(0, 6)) {
      const lq = s.ledger!.quarters.find((x) => x.q === quarterIndex(r.quarter))!
      near(-L(lq.lines, 'power'), r.powerCostUsd)
      near(-L(lq.lines, 'rent'), r.rentUsd)
      near(L(lq.lines, 'other_income'), r.incomeUsd)
    }
    expect(unreconciled(s)).toEqual([])
  })

  it('Act I: coins mined = the report’s revenue; power, rent, salaries and interest match', () => {
    const s = playGame(5, BOTS.cautious).state
    for (const label of ['2018Q2', '2020Q3', '2021Q4']) {
      const { lq, r } = quarterOf(s, label)
      near(L(lq.lines, 'mining_btc', 'mining_eth'), r.revenueUsd)
      near(-L(lq.lines, 'power'), r.powerCostUsd)
      near(-L(lq.lines, 'rent'), r.rentUsd)
      near(-L(lq.lines, 'salaries'), r.salariesUsd)
      near(-L(lq.lines, 'interest'), r.interestUsd)
    }
  })

  it('Act II: hosting fees and AI revenue match the report', () => {
    const s = playGame(1, BOTS['texas-capital'], { through: 2 }).state
    let checked = 0
    for (const r of s.reports.filter((x) => x.quarter >= '2023Q1' && x.quarter <= '2026Q4')) {
      const { lq } = quarterOf(s, r.quarter)
      near(L(lq.lines, 'hosting_fees'), r.hostingFeesUsd)
      near(L(lq.lines, 'ai_shell_rent', 'ai_cloud'), r.aiRevenueUsd)
      near(-L(lq.lines, 'salaries'), r.salariesUsd)
      if (r.aiRevenueUsd > 0 || r.hostingFeesUsd > 0) checked++
    }
    expect(checked).toBeGreaterThan(4)
  })

  it('Act III: interest and finance fees together match the report’s interest (the standby’s fee included)', () => {
    const s = act3Finished('s1')
    for (const r of s.reports.filter((x) => x.quarter >= '2027Q1')) {
      const { lq } = quarterOf(s, r.quarter)
      near(-L(lq.lines, 'interest', 'finance_fees'), r.interestUsd)
      near(L(lq.lines, 'ai_shell_rent', 'ai_cloud'), r.aiRevenueUsd)
    }
    expect(unreconciled(s)).toEqual([])
  })

  it('Act IV: interest, AI and orbital revenue match the report', () => {
    const s = playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
    const rep = s.reports.filter((x) => x.quarter >= '2031Q1')
    expect(rep.length).toBeGreaterThan(10)
    for (const r of rep) {
      const { lq } = quarterOf(s, r.quarter)
      near(-L(lq.lines, 'interest', 'finance_fees'), r.interestUsd)
      near(L(lq.lines, 'ai_shell_rent', 'ai_cloud'), r.aiRevenueUsd)
      near(L(lq.lines, 'orbit_revenue'), r.orbitRevenueUsd ?? 0)
    }
    expect(unreconciled(s)).toEqual([])
  })
})
