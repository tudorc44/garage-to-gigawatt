// The Power and Capital slot lines in the Act II quarter report's milestones (M8.7d): a log line when a
// project's power slot is filled (existing MW, a grid upgrade, an on-site gas plant) and when its
// capital slot is (own cash, project debt, a GPU-backed DDTL, a JV partner, a big-tech backstop;
// equity is the company's own raise and has its own line). Read-only: no rule changes.
import { describe, expect, it } from 'vitest'
import { advance } from '../../src/sim/advance.ts'
import { act2ReportView } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { act2Company, endPlan, ok } from './act2Helpers.ts'

const lastLog = (s: GameState, key: string) =>
  [...s.log].reverse().find((e) => e.key === key)

/** A 5 MW shell at site-2 with `card` signed, in `label`. */
function shellWith(card: string, label: string): GameState {
  let s = ok(act2Company(label), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s.projects[0].offers = [{ id: 'o1', card, readyByQuarters: 5 }]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  return s
}

/** A 2 MW H100 cloud with a 2-year GPU contract from `card`. */
function cloudWith(card: string): GameState {
  let s = ok(act2Company('2023Q3'), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 2000,
    kind: 'cloud',
    gpu: 'h100',
  })
  s.projects[0].offers = [
    {
      id: 'o1',
      card,
      readyByQuarters: 0,
      gpu: { termYears: 2, bufferQuarters: 1 },
    },
  ]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  return s
}

/** A 100 MW shell on a Texas site with an AA tenant (a JV partner needs 100 MW+, from 2025Q1). */
function bigShell(): GameState {
  let s = act2Company('2025Q1')
  s.cash = 5_000_000_000
  s.sites.push({
    id: 'site-3',
    tier: 'texas_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
    phases: [0, 0, 0, 0, 0],
  })
  s = ok(s, {
    type: 'PROJECT_OPEN',
    siteId: 'site-3',
    kw: 100_000,
    kind: 'shell',
  })
  s.projects[0].offers = [
    { id: 'o1', card: 'tc_north_azure_cloud', readyByQuarters: 6 },
  ]
  return ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
}

describe('the Power slot line', () => {
  const cases: [string, 'grid' | 'gas' | undefined, string][] = [
    ['the site’s existing MW', undefined, 'log.project_power_existing'],
    ['a grid upgrade', 'grid', 'log.project_power_grid'],
    ['an on-site gas plant', 'gas', 'log.project_power_gas'],
  ]
  it.each(cases)('is written when a project opens with %s', (_what, power, key) => {
    const s = ok(act2Company('2024Q1'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 3000,
      kind: 'shell',
      ...(power ? { power } : {}),
    })
    const line = lastLog(s, key)
    expect(line).toBeDefined()
    expect(line!.params).toMatchObject({ n: 1, projectKw: 3000 })
  })
})

describe('the Capital slot line', () => {
  const cases: [string, () => GameState, (s: GameState) => GameState, string][] = [
    [
      'own cash',
      () => shellWith('tc_north_azure_cloud', '2023Q3'),
      (s) => ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' }),
      'log.project_capital_cash',
    ],
    [
      'project debt',
      () => shellWith('tc_north_azure_cloud', '2023Q3'),
      (s) =>
        ok(s, {
          type: 'PROJECT_DEBT',
          projectId: 'project-1',
          debt: 'project_debt',
          on: true,
        }),
      'log.project_capital_project_debt',
    ],
    [
      'a GPU-backed DDTL',
      () => cloudWith('tc_meridian_labs'),
      (s) =>
        ok(s, {
          type: 'PROJECT_DEBT',
          projectId: 'project-1',
          debt: 'ddtl',
          on: true,
        }),
      'log.project_capital_ddtl',
    ],
    [
      'a JV partner',
      bigShell,
      (s) =>
        ok(s, { type: 'PROJECT_JV', projectId: 'project-1', share: 0.5 }),
      'log.project_capital_jv',
    ],
    [
      'a big-tech backstop',
      () => shellWith('tc_meridian_labs', '2025Q3'),
      (s) => ok(s, { type: 'PROJECT_BACKSTOP', projectId: 'project-1' }),
      'log.project_capital_backstop',
    ],
  ]
  it.each(cases)('is written when the slot is filled with %s', (_what, setup, act, key) => {
    const s = act(setup())
    const line = lastLog(s, key)
    expect(line).toBeDefined()
    expect(line!.params!.n).toBe(1)
    expect(Number(line!.params!.amountUsd)).toBeGreaterThan(0)
  })

})

/** Plays the live quarter (default answers) and stops at its report. */
function toReport(s: GameState): GameState {
  s = endPlan(s)
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('the report’s milestones list them', () => {
  it('shows the power and capital lines of the quarter, with the project’s number', () => {
    let s = ok(act2Company('2024Q1'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
    const keys = (act2ReportView(toReport(s))?.milestones ?? []).map(
      (e) => e.key,
    )
    expect(keys).toContain('log.project_power_existing')
    expect(keys).toContain('log.project_capital_cash')
  })

  it('equity is the company’s raise: its own line, also in the milestones', () => {
    // A first report gives the raise a valuation to price off.
    let s = ok(toReport(act2Company('2024Q1')), { type: 'NEXT_QUARTER' })
    s = ok(s, { type: 'RAISE_EQUITY', dilution: 0.1 })
    expect(lastLog(s, 'log.equity_raised')).toBeDefined()
    const keys = (act2ReportView(toReport(s))?.milestones ?? []).map(
      (e) => e.key,
    )
    expect(keys).toContain('log.equity_raised')
  })
})
