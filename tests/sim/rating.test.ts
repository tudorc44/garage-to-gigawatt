// The credit rating (M4.4; scope 0.2 §2.2 [P4], doc 18 §7.2): debt/EBITDA × backlog quality from
// lenders.json's matrix, the runway notch, the CCC− to BBB range, set at each Act II quarter end.
import { describe, expect, it } from 'vitest'
import type { QuarterReport } from '../../src/sim/state.ts'
import {
  backlogQuality,
  leverageBand,
  notch,
  ratingInputs,
} from '../../src/sim/systems/rating.ts'
import { act2Company, ok, playQuarter } from './act2Helpers.ts'

const report = (r: Partial<QuarterReport>) =>
  ({
    ebitdaUsd: 0,
    interestUsd: 0,
    principalUsd: 0,
    ...r,
  }) as QuarterReport

describe('the inputs', () => {
  it('leverage bands: < 2×, 2–4×, 4–6×, > 6×; no debt is < 2×, debt and no EBITDA > 6×', () => {
    expect(leverageBand(0, 0)).toBe('lt2')
    expect(leverageBand(10, 10)).toBe('lt2')
    expect(leverageBand(30, 10)).toBe('from2to4')
    expect(leverageBand(50, 10)).toBe('from4to6')
    expect(leverageBand(70, 10)).toBe('gt6')
    expect(leverageBand(10, -5)).toBe('gt6')
  })

  it('notches stay within CCC− to BBB', () => {
    expect(notch('B+', -1)).toBe('B')
    expect(notch('CCC-', -1)).toBe('CCC-')
    expect(notch('BBB', 1)).toBe('BBB')
  })

  it('backlog quality by the IG share of the remaining contracts; none is weak', () => {
    const s = act2Company('2023Q3')
    expect(backlogQuality(s).quality).toBe('weak')
    let a = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    a.projects[0].offers = [
      { id: 'o1', card: 'tc_north_azure_cloud', readyByQuarters: 5 },
    ]
    a = ok(a, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: 'project-1',
      offerId: 'o1',
    })
    expect(backlogQuality(a)).toEqual({ quality: 'strong', strongShare: 1 })
  })
})

describe('the rating', () => {
  it('no debt and no backlog: B+ (the matrix’s < 2× weak cell)', () => {
    const s = act2Company('2023Q3')
    expect(ratingInputs(s, report({ ebitdaUsd: 1e6 })).rating).toBe('B+')
  })

  it('a short runway lowers it one notch', () => {
    const s = { ...act2Company('2023Q3'), cash: 1_000_000 }
    // Burning $1M a quarter with $1M of cash: 1 quarter of runway.
    const r = ratingInputs(s, report({ ebitdaUsd: -1_000_000 }))
    expect(r.shortRunway).toBe(true)
    expect(r.rating).toBe('B')
  })

  it('is set at each Act II quarter end, on the state and the report', () => {
    const s = playQuarter(act2Company('2023Q3'))
    expect(s.creditRating).not.toBeNull()
    expect(s.reports.at(-1)!.creditRating).toBe(s.creditRating)
  })
})
