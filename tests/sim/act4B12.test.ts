// B12 (act4-scope.md §5; doc 33 §8.3, §13): no single launch failure forces a sale or breaks the covenant of a company
// that respects the Plan screen's rule (each launch's uninsured value under 15% of equity, cash for its launch bill,
// covenant room for its loss). Every future, an orbital shell and an orbital cloud, a mature and a young launcher: the
// launch is made to fail (the providers' odds pinned) and the quarter played.
import { afterEach, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { FUTURE_IDS, type FutureId } from '../../src/content/index.ts'
import { ORBIT, provider } from '../../src/content/orbitContent.ts'
import { launchExposure } from '../../src/sim/orbitViews.ts'
import type { GameState } from '../../src/sim/state.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import { act, act4Company, playQuarter } from './act4Helpers.ts'

const saved = ORBIT.launch.providers.map((p) => ({ ...p }))
afterEach(() => ORBIT.launch.providers.forEach((p, i) => Object.assign(p, saved[i])))

/** A company with a block insured and booked, played to the Plan phase of its launch quarter. */
function toLaunch(future: FutureId, kind: 'shell' | 'cloud', via: 'pallas' | 'northgate'): GameState {
  let s = act4Company('s0', future)
  // a company big enough for the rule: a 10 MW cloud's uninsured part (~$300M over 2031's $350M cover) is under 15%
  s.cash += 2.5e9
  s.bandwidth = 9
  s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind, mw: 10, shell: 'sso', gen: 'gen31' })
  s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 'spot' })
  s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1' })
  s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
  s.act4Orbit!.licences[0].approvedQuarter = s.quarter
  s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: via, quarter: s.quarter + 2 })
  s = act(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: 'ob1' })
  // no slips on the way (the outcome under test is the failure)
  Object.assign(provider(via), { slip_pct: 0, bump_pct_when_tight: 0 })
  s = playQuarter(s)
  s = playQuarter(s)
  return s
}

describe('B12: one launch failure never forces a sale for a company inside the line (M29.6)', () => {
  const cases = FUTURE_IDS.flatMap((f) =>
    (['shell', 'cloud'] as const).flatMap((kind) => (['pallas', 'northgate'] as const).map((via) => [f, kind, via] as const)),
  )
  it.each(cases)('%s, orbital %s on %s', (future, kind, via) => {
    let s = toLaunch(future, kind, via)
    const b = orbitBlock(s, 'ob1')!
    expect(b.stage).toBe('awaiting_launch')
    expect(b.launch!.quarter).toBe(s.quarter)
    // the company respects the Plan screen's rule for this launch
    const e = launchExposure(s, b)!
    expect(e.overLine || e.cashShort || e.covenantShort).toBe(false)
    const breachBefore = s.covenantBreach
    Object.assign(provider(via), { failure_pct_by_year: { '2031': 100 } })
    s = playQuarter(s)
    expect(s.phase).toBe('plan')
    const r = s.reports.at(-1)!
    expect(r.forcedSale).toBeNull()
    expect(s.log.some((x) => x.key === 'log.orbit.launch_failed')).toBe(true)
    expect(s.covenantBreach).toEqual(breachBefore)
    expect(orbitBlock(s, 'ob1')!).toMatchObject({ stage: 'proposed', lostLaunches: 1 })
  })
})
