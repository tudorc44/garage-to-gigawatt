// The Act II quarter report's additions (scope 0.2 §2.14 item 9): MW by use, backlog, rating and
// the project milestones.
import { describe, expect, it } from 'vitest'
import { advance } from '../../src/sim/advance.ts'
import { act2ReportView } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { act2Company, endPlan, ok, pilotReady } from './act2Helpers.ts'

/** Plays the live quarter and stops at its report. */
function toReport(s: GameState): GameState {
  s = endPlan(s)
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('the Act II quarter report', () => {
  it('has no Act II view in Act I', () => {
    expect(act2ReportView(newGame(1))).toBeNull()
  })

  it('records kW by use, and lists the quarter’s project milestones', () => {
    let s = ok(pilotReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    s = toReport(s)
    const view = act2ReportView(s)!
    expect(view).not.toBeNull()
    expect(view.use.building).toBe(1000)
    expect(view.prevUse).toBeNull()
    expect(view.milestones.map((e) => e.key)).toContain('log.project_started')
    expect(view.rating).toBe(s.reports.at(-1)!.creditRating ?? null)
  })

  it('keeps the rating’s reasons and last quarter’s figures for the before → after view', () => {
    let s = toReport(act2Company('2023Q3'))
    const first = act2ReportView(s)!
    expect(first.prevUse).toBeNull()
    expect(first.ratingWhy).not.toBeNull()
    expect(['lt2', 'from2to4', 'from4to6', 'gt6']).toContain(
      first.ratingWhy!.band,
    )
    s = ok(s, { type: 'NEXT_QUARTER' })
    s = ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 1000, kind: 'pilot' })
    s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    s = toReport(s)
    const second = act2ReportView(s)!
    expect(second.prevUse).toEqual(first.use)
    expect(second.use.building).toBe(1000)
    expect(second.prevBacklogUsd).toBe(first.backlogUsd)
    expect(second.tenants).toEqual([])
  })

  it('lists tenants signed this quarter apart from project milestones', () => {
    let s = ok(act2Company('2025Q3'), {
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
    const view = act2ReportView(toReport(s))!
    expect(view.tenants.map((e) => e.key)).toEqual(['log.tenant_signed'])
    expect(view.milestones.map((e) => e.key)).toContain('log.tenant_signed')
  })

  it('a quarter with no projects has no milestones', () => {
    const view = act2ReportView(toReport(act2Company('2023Q3')))!
    expect(view.milestones).toEqual([])
    expect(view.use.building).toBe(0)
  })
})
