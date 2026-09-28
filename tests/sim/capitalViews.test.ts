// The Act II Capital screen's views and the Deal builder's capital rows (M4.7; wireframes A2-07, A2-05).
import { describe, expect, it } from 'vitest'
import {
  backlogView,
  dealCapitalView,
  debtStackView,
  equityView,
  ratingView,
} from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

/** A 5 MW shell with the AA tenant, project debt on, funded and started; one quarter played. */
function withDebt(): GameState {
  let s = ok(act2Company('2023Q3'), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s.projects[0].offers = [
    { id: 'o1', card: 'tc_north_azure_cloud', readyByQuarters: 5 },
  ]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: 'o1',
  })
  s = ok(s, {
    type: 'PROJECT_DEBT',
    projectId: 'project-1',
    debt: 'project_debt',
    on: true,
  })
  s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
  const cap = dealCapitalView(s, s.projects[0])
  expect(cap.projectDebt.on).toBe(true)
  expect(cap.debtUsd).toBeGreaterThan(0)
  expect(cap.ownCashUsd).toBeCloseTo(cap.capexUsd - cap.debtUsd, 4)
  s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
  return playQuarter(s)
}

describe('the Capital screen', () => {
  it('rating card, debt stack, backlog and equity from one played quarter', () => {
    const s = withDebt()
    const r = ratingView(s)!
    expect(r.rating).toBe(s.creditRating)
    expect(r.inputs.quality).toBe('strong')
    const d = debtStackView(s)
    expect(d.rows).toHaveLength(1)
    expect(d.rows[0]).toMatchObject({
      kind: 'project_debt',
      rating: 'A',
      status: 'building',
    })
    expect(d.rows[0].maturity).toBe('2039Q2') // live 2024Q2 + 15 years
    const b = backlogView(s)
    expect(b.rows[0]).toMatchObject({ rating: 'AA', weight: 0.2 })
    expect(b.countedUsd).toBeCloseTo(b.totalUsd * 0.2, 4)
    const e = equityView(s)
    expect(e.options.map((o) => o.dilution)).toEqual([0.08, 0.15, 0.2, 0.3])
    expect(e.options[0].blocker).toBeNull()
    expect(e.raisesLeft).toBe(2)
  })

  it('not rated before the first Act II quarter end', () => {
    expect(ratingView(act2Company('2023Q3'))).toBeNull()
  })
})
