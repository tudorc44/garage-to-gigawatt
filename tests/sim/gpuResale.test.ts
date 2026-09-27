// GPU resale (owner decision on the M3 questions, M4.0b): the residual curve, selling a live
// cloud's or pilot's GPUs, and the Deal builder IRR with the year-5 residual.
import { describe, expect, it } from 'vitest'
import {
  collateralUsd,
  maxEquipmentLoanUsd,
} from '../../src/sim/systems/loans.ts'
import { projectsView } from '../../src/sim/selectors.ts'
import { siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import {
  gpuResidualShare,
  gpuResidualUsd,
  projectedReturn,
} from '../../src/sim/systems/projects.ts'
import { act2Company, ok, pilotReady, playQuarter } from './act2Helpers.ts'

describe('the residual curve', () => {
  it('loses 15% of the price a year, never below 35%', () => {
    expect(gpuResidualShare(0)).toBe(1)
    expect(gpuResidualShare(1)).toBeCloseTo(0.85, 9)
    expect(gpuResidualShare(3)).toBeCloseTo(0.55, 9) // an H100 of 2023 by 2026
    expect(gpuResidualShare(5)).toBe(0.35)
    expect(gpuResidualShare(10)).toBe(0.35)
  })
})

/** A 1 MW pilot started in 2023Q3 and played until it's live (2023Q4). */
function livePilot() {
  let s = ok(pilotReady(), { type: 'PROJECT_START', projectId: 'project-1' })
  s = playQuarter(s)
  expect(s.projects[0].stage).toBe('live')
  return s
}

describe('selling the GPUs', () => {
  it('a live pilot sells its GPUs at the residual value (1 BW); it ends and its MW are idle', () => {
    const s = livePilot()
    const p = s.projects[0]
    expect(gpuResidualUsd(p, s.quarter)).toBeCloseTo(p.gpuCapexUsd, 6) // just delivered
    const later = { ...s, quarter: s.quarter + 4 } // a year on
    expect(gpuResidualUsd(p, later.quarter)).toBeCloseTo(
      p.gpuCapexUsd * 0.85,
      6,
    )
    const r = ok(s, { type: 'PROJECT_SELL_GPUS', projectId: 'project-1' })
    expect(r.cash).toBeCloseTo(s.cash + Math.round(p.gpuCapexUsd), 2)
    expect(r.bandwidth).toBe(s.bandwidth - 1)
    expect(r.projects[0].stage).toBe('ended')
    const use = siteMwByUse(r, r.sites[1], r.quarter)
    expect(use.aiCloud).toBe(0)
    expect(use.idle).toBe(20_000)
    expect(projectsView(r).byColumn.sold).toHaveLength(1)
  })

  it('only a live cloud or pilot', () => {
    const s = ok(pilotReady(), {
      type: 'PROJECT_START',
      projectId: 'project-1',
    })
    expect(() =>
      ok(s, { type: 'PROJECT_SELL_GPUS', projectId: 'project-1' }),
    ).toThrow('error.gpus_not_live')
  })
})

describe('the equipment loan on GPUs (M4.3)', () => {
  it('a live pilot’s GPUs are collateral at their resale value: the pilot’s financing after delivery', () => {
    const s = livePilot()
    const gpus = gpuResidualUsd(s.projects[0], s.quarter)
    expect(collateralUsd(s)).toBeCloseTo(gpus, 4) // no machines
    const max = maxEquipmentLoanUsd(s)
    expect(max).toBe(Math.floor(0.5 * gpus))
    const r = ok(s, { type: 'TAKE_LOAN', amountUsd: max })
    expect(r.cash).toBe(s.cash + max)
    expect(r.equipmentLoan!.apr).toBe(0.14)
  })
})

describe('the Deal builder projection', () => {
  it('a cloud is projected on spot before a tenant is chosen, with the year-5 residual', () => {
    const s = ok(act2Company('2024Q2'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 2000,
      kind: 'cloud',
      gpu: 'h100',
    })
    const r = projectedReturn(s, s.projects[0])
    expect(r.revenueUsd).toBeGreaterThan(0)
    expect(r.irr).not.toBeNull()
  })
})
