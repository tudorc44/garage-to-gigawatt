// The big-tech backstop and the JV partner (M4.6; scope 0.2 §2.7, doc 18 §7.1).
import { describe, expect, it } from 'vitest'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import { debtBlocker } from '../../src/sim/systems/facilities.ts'
import {
  projectCapex,
  remainingContractUsd,
  weightedBacklogUsd,
} from '../../src/sim/systems/projects.ts'
import { backlogQuality } from '../../src/sim/systems/rating.ts'
import { act2Company, endPlan, ok, playQuarter } from './act2Helpers.ts'

/** A 5 MW shell with `card` signed in `label`, and a first report (a valuation for the warrants). */
function shellWith(card: string, label = '2025Q3'): GameState {
  let s = playQuarter(act2Company(label))
  s = ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 5000, kind: 'shell' })
  s.projects[0].offers = [{ id: 'o1', card, readyByQuarters: 5 }]
  return ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
}

describe('the big-tech backstop', () => {
  it('on a BB tenant’s lease: warrants of 3–6%, backlog weight 20%, strong backlog, bankable for project debt', () => {
    const s = shellWith('tc_meridian_labs') // BB
    expect(debtBlocker(s, s.projects[0], 'project_debt')?.key).toBe(
      'error.debt_needs_bbb',
    )
    const r = ok(s, { type: 'PROJECT_BACKSTOP', projectId: 'project-1' })
    const b = r.projects[0].backstop!
    expect(b.warrantsShare).toBeGreaterThanOrEqual(0.03)
    expect(b.warrantsShare).toBeLessThanOrEqual(0.06)
    expect(r.founderStake).toBeCloseTo(
      s.founderStake * (1 - b.warrantsShare),
      12,
    )
    expect(r.bandwidth).toBe(s.bandwidth - 2)
    expect(weightedBacklogUsd(r)).toBeCloseTo(
      remainingContractUsd(r.projects[0]) * 0.2,
      4,
    )
    expect(backlogQuality(r).quality).toBe('strong')
    expect(debtBlocker(r, r.projects[0], 'project_debt')).toBeUndefined()
  })

  it('not for an investment-grade tenant, not before 2025Q3, once per lease', () => {
    expect(() =>
      ok(shellWith('tc_north_azure_cloud'), {
        type: 'PROJECT_BACKSTOP',
        projectId: 'project-1',
      }),
    ).toThrow('error.backstop_rating')
    expect(() =>
      ok(shellWith('tc_meridian_labs', '2025Q1'), {
        type: 'PROJECT_BACKSTOP',
        projectId: 'project-1',
      }),
    ).toThrow('error.debt_early')
    const once = ok(shellWith('tc_meridian_labs'), {
      type: 'PROJECT_BACKSTOP',
      projectId: 'project-1',
    })
    expect(() =>
      ok(once, { type: 'PROJECT_BACKSTOP', projectId: 'project-1' }),
    ).toThrow('error.backstop_done')
  })
})

/** An Act II company with a 100 MW Texas site (5 phases up) and a 100 MW shell on it, AA tenant. */
function bigShell(label = '2025Q1'): GameState {
  let s = act2Company(label)
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
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

describe('the JV partner', () => {
  it('funds its share of the equity and takes that share of the backlog and earnings', () => {
    const s = bigShell()
    const whole = remainingContractUsd(s.projects[0])
    const j = ok(s, { type: 'PROJECT_JV', projectId: 'project-1', share: 0.5 })
    expect(j.bandwidth).toBe(s.bandwidth - 2)
    expect(remainingContractUsd(j.projects[0])).toBeCloseTo(whole * 0.5, 4)
    const capex = Math.round(projectCapex(j, j.projects[0]).totalUsd)
    const r = ok(j, { type: 'PROJECT_START', projectId: 'project-1' })
    expect(r.projects[0].jv!.fundedUsd).toBe(Math.round(capex * 0.5))
    expect(r.cash).toBeCloseTo(j.cash - capex + Math.round(capex * 0.5), 0)
    // Live, the company books half the rent.
    let live = r
    for (let i = 0; i < 3; i++) live = playQuarter(live)
    expect(live.projects[0].stage).toBe('live')
    const w = advance(endPlan(live))
    expect(w.quarterStats.aiRevenueUsd).toBeCloseTo(
      (1_800_000 * 100) / 52 / 2,
      2,
    )
  })

  it('only 100 MW+ projects, from 2025Q1, for 50–80%', () => {
    expect(() =>
      ok(bigShell('2024Q4'), {
        type: 'PROJECT_JV',
        projectId: 'project-1',
        share: 0.5,
      }),
    ).toThrow('error.debt_early')
    expect(() =>
      ok(bigShell(), {
        type: 'PROJECT_JV',
        projectId: 'project-1',
        share: 0.9,
      }),
    ).toThrow('error.jv_share')
    const small = ok(act2Company('2025Q1'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    expect(() =>
      ok(small, { type: 'PROJECT_JV', projectId: 'project-1', share: 0.5 }),
    ).toThrow('error.jv_size')
  })
})
