// M37.2-M37.4 (doc 39): the Finances views add up. By site (with the unallocated row) = by line; by business = by
// line; a year = its four quarters; an act = its quarters; the cash flow starts and ends where the cash did; the
// weekly chart has the quarter's start and its 13 weeks.
import { describe, expect, it } from 'vitest'
// (a whole Act I and II career: no clock decides pass or fail)
import { vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import {
  businessView,
  cashFlowView,
  pnlFigures,
  periodTotals,
  pnlView,
  siteView,
  type Period,
} from '../../src/sim/financeViews.ts'
import { CATEGORY_IDS, type Lines } from '../../src/sim/ledger.ts'
import { playGame } from '../../src/sim/replay.ts'
import { BOTS } from '../../tools/bots.ts'

const q = (l: string) => CONTENT.quarters.indexOf(l)
// One career through Act II with a bot that builds sites and runs AI projects.
const run = playGame(1, BOTS['texas-capital'], { through: 2 })
const s = run.state

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.01)

function sumLines(ls: Lines[]): Lines {
  const out: Lines = {}
  for (const l of ls) for (const c of CATEGORY_IDS) if (l[c]) out[c] = (out[c] ?? 0) + l[c]!
  return out
}

describe('the Finances views add up', () => {
  it('a career with several sites and AI projects reached its later quarters', () => {
    expect(s.reports.length).toBeGreaterThan(20)
    expect(s.sites.length).toBeGreaterThan(1)
    expect(siteView(s, { kind: 'career' }).rows.some((r) => r.children.some((c) => c.key.startsWith('project:')))).toBe(true)
  })

  it.each([
    { kind: 'quarter', q: q('2019Q2') },
    { kind: 'year', year: 2021 },
    { kind: 'act', act: 1 },
    { kind: 'career' },
  ] as Period[])('by site, with the unallocated row, sums to the by-line totals (%o)', (p) => {
    const v = siteView(s, p)
    const rev = v.rows.reduce((a, r) => a + r.revenue, 0) + v.unallocated.revenue
    const cost = v.rows.reduce((a, r) => a + r.directCosts, 0) + v.unallocated.directCosts
    close(rev, v.total.revenue)
    close(cost, v.total.directCosts)
    const f = pnlView(s, p).now
    close(v.total.revenue, f.revenue)
    close(v.total.contribution, f.ebitda)
  })

  it('by business sums to the by-line totals', () => {
    const p: Period = { kind: 'act', act: 2 }
    const b = businessView(s, p)
    const f = pnlView(s, p).now
    close(Object.values(b.figures).reduce((a, x) => a + x!.revenue, 0), f.revenue)
    close(Object.values(b.figures).reduce((a, x) => a + x!.net, 0), f.net)
  })

  it('a year = its four quarters; an act = its quarters', () => {
    const year = periodTotals(s, { kind: 'year', year: 2020 })
    expect(year.quarters).toHaveLength(4)
    const quarters = ['2020Q1', '2020Q2', '2020Q3', '2020Q4'].map((l) => periodTotals(s, { kind: 'quarter', q: q(l) }).lines)
    expect(pnlFigures(year.lines).net).toBeCloseTo(pnlFigures(sumLines(quarters)).net, 4)
    const act1 = periodTotals(s, { kind: 'act', act: 1 })
    expect(act1.quarters[0]).toBe(0)
    expect(act1.quarters.at(-1)).toBe(q('2022Q3'))
    const each = act1.quarters.map((x) => periodTotals(s, { kind: 'quarter', q: x }).lines)
    expect(pnlFigures(act1.lines).revenue).toBeCloseTo(pnlFigures(sumLines(each)).revenue, 4)
  })

  it('the cash flow starts and ends where the cash did, through every section', () => {
    for (const p of [{ kind: 'quarter', q: q('2023Q2') }, { kind: 'career' }] as Period[]) {
      const c = cashFlowView(s, p)
      const total = c.startCash + c.operating.total + c.investing.total + c.financing.total + c.treasury.total
      close(total, c.endCash)
    }
    close(cashFlowView(s, { kind: 'career' }).endCash, s.cash)
  })

  it('a quarter’s chart: its start and 13 end-of-week values, the low point marked; a year: one per quarter', () => {
    const c = cashFlowView(s, { kind: 'quarter', q: q('2021Q3') })
    expect(c.chart.weekly).toBe(true)
    expect(c.chart.points).toHaveLength(14)
    expect(c.chart.points[c.chart.lowIndex].usd).toBe(Math.min(...c.chart.points.map((x) => x.usd)))
    expect(cashFlowView(s, { kind: 'year', year: 2021 }).chart.points).toHaveLength(4)
  })

  it('the previous period and the biggest changes', () => {
    const v = pnlView(s, { kind: 'quarter', q: q('2021Q3') })
    expect(v.prevPeriod).toEqual({ kind: 'quarter', q: q('2021Q2') })
    expect(v.changes.length).toBeGreaterThan(0)
    expect(v.changes.length).toBeLessThanOrEqual(3)
    // (sorted by size)
    for (let i = 1; i < v.changes.length; i++)
      expect(Math.abs(v.changes[i].deltaUsd)).toBeLessThanOrEqual(Math.abs(v.changes[i - 1].deltaUsd))
    expect(pnlView(s, { kind: 'career' }).prevPeriod).toBeNull()
  })
})
