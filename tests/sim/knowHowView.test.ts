// The GPU know-how display (M8.5): read-only views whose numbers come from the code and content.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { knowHowView } from '../../src/sim/selectors.ts'
import { dealView } from '../../src/sim/projectViews.ts'
import { newGame } from '../../src/sim/state.ts'
import { knowHow, spotUtilisation } from '../../src/sim/systems/projects.ts'
import { act2Company, ok, pilotReady } from './act2Helpers.ts'

describe('the GPU know-how view', () => {
  it('is null in Act I', () => {
    expect(knowHowView(newGame(1))).toBeNull()
  })

  it('shows the level and the rules straight from the content', () => {
    const s = act2Company('2023Q3')
    const v = knowHowView(s)!
    expect(v.level).toBe(knowHow(s))
    expect(v.max).toBe(3)
    expect(v.threeKw).toBe(BALANCE.projects.knowHowThreeKw)
    expect(v.utilisationBase).toBe(CONTENT.projects.pilot.utilisationBase)
    // +5 points at level 2, +10 at level 3 (the owner's rule), from conversions.json.
    expect(v.levels.map((l) => l.utilisationBonus)).toEqual([0, 0, 0.05, 0.1])
    // Only level 3 opens overflow cards; level 0 carries the handicap.
    expect(v.levels.map((l) => l.overflowCards > 0)).toEqual([
      false,
      false,
      false,
      true,
    ])
    expect(v.levels[0].costMult).toBe(BALANCE.projects.knowHowZero.costMult)
    expect(v.levels[0].extraWaitQuarters).toBe(
      BALANCE.projects.knowHowZero.extraWaitQuarters,
    )
  })
})

describe('the Deal builder’s utilisation', () => {
  it('shows a pilot’s and a cloud’s spot utilisation (the one the projection uses), none for a shell', () => {
    const pilot = pilotReady()
    const pv = dealView(pilot, 'project-1')!
    expect(pv.utilisation).toMatchObject({
      value: spotUtilisation(pilot),
      base: 0.7,
      knowHow: 0,
      contracted: false,
    })
    let s = ok(act2Company('2024Q2'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 2000,
      kind: 'cloud',
      gpu: 'h100',
    })
    expect(dealView(s, 'project-1')!.utilisation?.value).toBe(
      spotUtilisation(s),
    )
    s = ok(act2Company('2024Q2'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    expect(dealView(s, 'project-1')!.utilisation).toBeNull()
  })

  it('rises with know-how: +5 points at 2, +10 at 3', () => {
    const s = pilotReady()
    const base = spotUtilisation(s)
    // Two live clusters = know-how 2.
    for (const n of [1, 2])
      s.projects.push({
        ...s.projects[0],
        id: `live-${n}`,
        n: 10 + n,
        stage: 'live',
      })
    expect(knowHow(s)).toBe(2)
    expect(spotUtilisation(s)).toBeCloseTo(base + 0.05, 10)
    s.projects[1].kw = BALANCE.projects.knowHowThreeKw
    expect(knowHow(s)).toBe(3)
    expect(spotUtilisation(s)).toBeCloseTo(base + 0.1, 10)
  })
})
