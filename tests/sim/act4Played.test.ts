// M31.7: Act IV played end to end with orbit, money and the Moon, in every future. A busy strategy (a block a quarter
// on project debt or cash, insured, with licences and launches; a lunar claim, missions, power and a pilot) runs all 20
// quarters to the chapter report; every quarter's valuation is the sum of its parts (the remainder, the treasury, is the
// coins held: none here); orbital debt is part of the debt.
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { FUTURE_IDS } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { valuationSplit } from '../../src/sim/systems/valuation.ts'
import { act4Company, playQuarter } from './act4Helpers.ts'

const tryAct = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  return r.ok ? r.state : s
}

/** One Plan phase of a busy Act IV company. */
function busy(s: GameState): GameState {
  const o = s.act4Orbit
  if (!o?.blocks.some((b) => b.stage === 'proposed'))
    s = tryAct(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
  for (const b of s.act4Orbit?.blocks.filter((x) => x.stage === 'proposed') ?? []) {
    s = tryAct(s, { type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 0 })
    s = tryAct(s, { type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 'spot' })
    s = tryAct(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: 'project_debt' })
    s = tryAct(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: 'cash' })
    for (let k = 2; k <= 6 && !s.act4Orbit!.blocks.find((x) => x.id === b.id)!.launch; k++)
      s = tryAct(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider: 'pallas', quarter: s.quarter + k })
    s = tryAct(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })
  }
  for (const b of s.act4Orbit?.blocks ?? []) s = tryAct(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })
  if ((s.act4Orbit?.licences.filter((l) => l.shell === 'sso').length ?? 0) < 2)
    s = tryAct(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
  s = tryAct(s, { type: 'CLAIM_LUNAR_SITE', site: 'malapert_massif' })
  s = tryAct(s, { type: 'ACCEPT_TASK_ORDER' })
  s = tryAct(s, { type: 'SEND_LUNAR_MISSION', site: 'malapert_massif' })
  s = tryAct(s, { type: 'BUILD_LUNAR_SOLAR', site: 'malapert_massif', kwe: 200 })
  s = tryAct(s, { type: 'DECIDE_LUNAR_PILOT', site: 'malapert_massif' })
  s = tryAct(s, { type: 'SIGN_LUNAR_OFFTAKE', offer: 0 })
  return s
}

describe('Act IV played with orbit, money and the Moon (M31.7)', () => {
  it.each(FUTURE_IDS)('%s: 20 quarters to the chapter report; each valuation is the sum of its parts', (f) => {
    let s = act4Company('s0', f)
    s.cash += 3e9
    s.politicalCapital = Math.max(s.politicalCapital ?? 0, 40)
    let n = 0
    while (s.phase === 'plan') {
      s = playQuarter(busy(s))
      n++
      const r = s.reports.at(-1)!
      const split = valuationSplit(r, s.firstAiDealQuarter ?? null, scenarioOf(s))
      expect(Math.abs(split.treasuryUsd - r.treasuryValueUsd), r.quarter).toBeLessThan(1)
    }
    expect(s.phase).toBe('chapter')
    expect(n).toBe(20)
    expect(s.act4Orbit!.blocks.some((b) => b.liveQuarter !== null)).toBe(true)
    expect(s.reports.some((r) => (r.orbitEbitdaUsd ?? 0) > 0)).toBe(true)
  })
})
