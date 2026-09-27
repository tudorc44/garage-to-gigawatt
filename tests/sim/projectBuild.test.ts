// Projects, the build (Act II, scope 0.2 §2.5 and §2.9): starting a build, going live, the weekly
// earnings, take-or-pay damages [P1], and the construction-delay and GPU-allocation alerts.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  annualRentUsd,
  gpuWaitQuarters,
  neocloudUsdHr,
  planProjectEvents,
  projectCapex,
  spotUtilisation,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { powerPriceUsdKwh, uptime } from '../../src/sim/systems/sites.ts'
import { ebitdaUsd } from '../../src/sim/systems/valuation.ts'
import { act2Company, ok } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** Ends the Plan phase; with `quiet`, no project alerts are planned (for the other tests). */
function endPlan(s: GameState, quiet = true): GameState {
  s = ok(s, { type: 'END_PLAN' })
  if (quiet) s.projectEvents = []
  return s
}

/** Plays the live quarter (default answers to alerts) and starts the next Plan phase. */
function playQuarter(s: GameState, quiet = true): GameState {
  s = endPlan(s, quiet)
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return ok(s, { type: 'NEXT_QUARTER' })
}

/** A 1 MW pilot opened and funded in `label`, ready to start. */
function pilotReady(label = '2023Q3', seed = 1): GameState {
  const s = ok(act2Company(label, seed), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 1000,
    kind: 'pilot',
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

/** A 5 MW shell with its first offer signed and funded, ready to start. */
function shellReady(label = '2023Q3'): GameState {
  let s = ok(act2Company(label), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: s.projects[0].offers[0].id,
  })
  return ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
}

describe('starting a build (1 Bandwidth, the capex paid up front)', () => {
  it('needs every slot filled first', () => {
    const s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    const r = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
    expect(r.projects[0].stage).toBe('proposed')
    // Unfunded: the Capital slot is empty.
    expect(() =>
      ok(s, { type: 'PROJECT_START', projectId: 'project-1' }),
    ).toThrow('error.project_slots')
  })

  it('pays the capex, takes 1 Bandwidth and sets the ready quarter; it then can’t be cancelled', () => {
    const s = pilotReady()
    const cost = projectCapex(s, s.projects[0])
    const r = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    const p = r.projects[0]
    expect(p.stage).toBe('building')
    expect(p.capexUsd).toBe(Math.round(cost.totalUsd))
    expect(p.gpuCount).toBe(750)
    expect(p.readyQuarter).toBe(s.quarter + 1)
    expect(r.cash).toBe(s.cash - p.capexUsd)
    expect(r.bandwidth).toBe(s.bandwidth - 1)
    expect(() =>
      ok(r, { type: 'PROJECT_CANCEL', projectId: 'project-1' }),
    ).toThrow()
  })

  it('refuses without the cash', () => {
    const s = { ...pilotReady(), cash: 1_000_000 }
    expect(() =>
      ok(s, { type: 'PROJECT_START', projectId: 'project-1' }),
    ).toThrow('error.no_cash')
  })
})

describe('going live and the weekly earnings', () => {
  it('a pilot goes live at its ready quarter and sells GPU-hours at the neocloud price', () => {
    let s = ok(pilotReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    s = playQuarter(s)
    expect(s.quarter).toBe(q('2023Q4'))
    expect(s.projects[0].stage).toBe('live')
    s = advance(endPlan(s))
    const site = s.sites[1]
    const up = uptime(site)
    const rev =
      750 * neocloudUsdHr('h100', s.quarter)! * spotUtilisation(s) * 168 * up
    const b = BALANCE.projects
    const cost =
      1000 * b.cloudPue * 168 * up * powerPriceUsdKwh(site, s.quarter) +
      (s.projects[0].gpuCapexUsd * b.cloudInsuranceShareYr) / 52
    expect(s.quarterStats.aiRevenueUsd).toBeCloseTo(rev, 4)
    expect(s.quarterStats.aiCostUsd).toBeCloseTo(cost, 4)
    // One live GPU project: know-how 1, so the pilot's base utilisation.
    expect(spotUtilisation(s)).toBe(0.7)
  })

  it('a shell earns its tenant’s rent less opex, with the prepayment set off week by week', () => {
    let s = ok(shellReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    for (let i = 0; i < 3; i++) s = playQuarter(s)
    const p = s.projects[0]
    expect(p.stage).toBe('live')
    const rentWk = annualRentUsd(tenantCard(p.tenant!.card)!, 5000) / 52
    const prepay = p.tenant!.prepaymentLeftUsd
    s = advance(endPlan(s))
    expect(s.quarterStats.aiRevenueUsd).toBeCloseTo(rentWk, 4)
    expect(s.quarterStats.aiCostUsd).toBeCloseTo(
      rentWk * BALANCE.projects.shellOpexShare,
      4,
    )
    expect(s.projects[0].tenant!.prepaymentLeftUsd).toBeCloseTo(
      Math.max(0, prepay - rentWk),
      4,
    )
  })

  it('AI revenue and costs count in EBITDA', () => {
    expect(
      ebitdaUsd({
        revenueUsd: 0,
        powerCostUsd: 0,
        rentUsd: 0,
        aiRevenueUsd: 100,
        aiCostUsd: 30,
        lateDamagesUsd: 5,
      }),
    ).toBe(65)
  })
})

describe('take-or-pay (scope §2.5 [P1])', () => {
  it('3% of the annual contract per late quarter; at 2 late the tenant rolls to walk', () => {
    let s = shellReady()
    s.projects[0].tenant!.readyByQuarter = s.quarter // due now: late at quarter end
    const card = tenantCard(s.projects[0].tenant!.card)!
    const damages = annualRentUsd(card, 5000) * 0.03
    s = playQuarter(s)
    expect(s.reports.at(-1)!.lateDamagesUsd).toBeCloseTo(damages, 4)
    expect(s.projects[0].tenant!.lateQuarters).toBe(1)
    s = playQuarter(s)
    const t = s.projects[0].tenant
    // Either it stayed (2 late, rolled) or it walked and the prepayment came back.
    if (t) expect(t).toMatchObject({ lateQuarters: 2, walkRolled: true })
    else expect(s.log.some((e) => e.key === 'log.tenant_walked')).toBe(true)
  })
})

describe('construction delays and GPU allocation (scope §2.9)', () => {
  /** A pilot under construction, in the live quarter with an alert planned for week 1. */
  function withAlert(kind: 'construction_delay' | 'gpu_allocation') {
    let s = ok(pilotReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    s = endPlan(s)
    s.projectEvents = [{ projectId: 'project-1', kind, week: 1 }]
    return advance(s)
  }

  it('a delay alert: accelerate for 10% of capex keeps the date', () => {
    const s = withAlert('construction_delay')
    expect(s.interrupt?.id).toBe('construction_delay')
    const p = s.projects[0]
    const r = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accelerate' })
    expect(r.cash).toBeCloseTo(s.cash - Math.round(p.capexUsd * 0.1), 2)
    expect(r.projects[0].readyQuarter).toBe(p.readyQuarter)
  })

  it('the default accepts the slip (+1 quarter); changing contractor costs 1 Bandwidth next quarter', () => {
    const s = withAlert('construction_delay')
    expect(defaultChoice(s)).toBe('accept_slip')
    const slip = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'accept_slip' })
    expect(slip.projects[0].readyQuarter).toBe(s.projects[0].readyQuarter! + 1)
    const c = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'change_contractor' })
    expect(c.events.bandwidthNext).toBe(s.events.bandwidthNext - 1)
  })

  it('GPU allocation: pay 8% to ship now, or wait (2 quarters at know-how 0)', () => {
    const s = withAlert('gpu_allocation')
    expect(s.interrupt?.id).toBe('gpu_allocation')
    expect(defaultChoice(s)).toBe('wait')
    expect(gpuWaitQuarters(s)).toBe(2)
    const w = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'wait' })
    expect(w.projects[0].readyQuarter).toBe(s.projects[0].readyQuarter! + 2)
    const pay = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'pay_premium' })
    expect(pay.cash).toBeCloseTo(
      s.cash - Math.round(s.projects[0].capexUsd * 0.08),
      2,
    )
  })

  it('with the alert cap full it resolves silently with its default', () => {
    let s = ok(pilotReady(), { type: 'PROJECT_START', projectId: 'project-1' })
    s = endPlan(s)
    s.interruptsThisQuarter = CONTENT.interrupts.maxPerQuarter
    s.projectEvents = [
      { projectId: 'project-1', kind: 'construction_delay', week: 1 },
    ]
    const r = advance(s)
    expect(r.interrupt).toBeNull()
    expect(r.projects[0].readyQuarter).toBe(s.projects[0].readyQuarter! + 1)
    expect(r.log.at(-1)!.key).toBe('log.project_slipped_silent')
  })

  it('the allocation queue only hits GPU projects ordered in 2023–24, about 60% of the time', () => {
    let hits = 0
    for (let seed = 1; seed <= 100; seed++) {
      const s = ok(pilotReady('2023Q3', seed), {
        type: 'PROJECT_START',
        projectId: 'project-1',
      })
      planProjectEvents(s)
      if (s.projectEvents.some((e) => e.kind === 'gpu_allocation')) hits++
    }
    expect(hits).toBeGreaterThan(45)
    expect(hits).toBeLessThan(75)
    const late = ok(pilotReady('2025Q2'), {
      type: 'PROJECT_START',
      projectId: 'project-1',
    })
    planProjectEvents(late)
    expect(late.projectEvents.some((e) => e.kind === 'gpu_allocation')).toBe(
      false,
    )
  })
})
