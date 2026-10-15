// M73.2 (doc 51 v1.6 §17): the starter PC can be bought again as a Spare PC (CPU): $350 new, into the home rig only, 4 CPU PCs in
// all (the starter included); Max (N) respects the cap, the cash and the rig's room; used copies are not offered; an old save
// (the state has no new field) loads and gains the option; the bots that existed before never buy one.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { decodeSave, encodeSave } from '../../src/platform/saves.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { isDecisionQuarterFor, newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { say } from '../../src/ui/names.ts'
import { p0BuyCheck, p0MaxBuy, prologueBuyView } from '../../src/sim/prologue/views.ts'
import type { GameState } from '../../src/sim/state.ts'
import { PROLOGUE_SETTINGS } from '../../tools/prologueBots.ts'

const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}
function opening(cash = 2000): GameState {
  const s = ok(newPrologueGame(3), { type: 'START_PROLOGUE' })
  s.cash = cash
  return s
}
const withRig = (cash = 2000) => ok(opening(cash), { type: 'P0_BUILD_HOME_RIG' })
const rigId = (s: GameState) => s.sites.find((x) => x.tier === 'home_rig')!.id
const cpuPcs = (s: GameState) => s.machines.filter((l) => l.model === 'pc_cpu').reduce((n, l) => n + l.count, 0)
const spare = (_s: GameState, count: number, siteId: string): Action => ({ type: 'P0_BUY', model: 'pc_cpu', condition: 'new', count, siteId })

describe('the Spare PC (CPU)', () => {
  it('is for sale from 2009Q1 at $350, new only', () => {
    const s = withRig()
    const rows = prologueBuyView(s, rigId(s)).filter((b) => b.model.id === 'pc_cpu')
    expect(rows.map((r) => [r.condition, r.unitUsd])).toEqual([['new', 350]])
  })

  it('needs the home rig: in the bedroom the row says so, and nothing is bought', () => {
    const s = opening()
    const bedroom = s.sites[0].id
    expect(p0BuyCheck(s, 'pc_cpu', 'new', 1, bedroom)?.key).toBe('error.p0_spare_needs_rig')
    expect(p0MaxBuy(s, 'pc_cpu', 'new', bedroom)).toMatchObject({ max: 0 })
    expect(applyAction(s, spare(s, 1, bedroom)).ok).toBe(false)
  })

  it('with the rig: four spares fit, cost $1,400 and make five CPU PCs; a fifth spare is refused by the cap (doc 51 v1.7 §18)', () => {
    let s = withRig(1e6)
    const cash = s.cash
    s = ok(s, spare(s, 4, rigId(s)))
    expect(cpuPcs(s)).toBe(5)
    expect(cash - s.cash).toBeCloseTo(1400, 2)
    expect(p0BuyCheck(s, 'pc_cpu', 'new', 1, rigId(s))?.key).toBe('error.p0_spare_cap')
    expect(applyAction(s, spare(s, 1, rigId(s))).ok).toBe(false)
  })

  it('the cap counts the starter: asking for 5 spares in one go is refused, 4 is fine', () => {
    const s = withRig(1e6)
    expect(p0BuyCheck(s, 'pc_cpu', 'new', 5, rigId(s))?.key).toBe('error.p0_spare_cap')
    expect(p0BuyCheck(s, 'pc_cpu', 'new', 4, rigId(s))).toBeNull()
  })

  it('Max (N) is the cap and what the cash allows', () => {
    expect(p0MaxBuy(withRig(1e6), 'pc_cpu', 'new', rigId(withRig(1e6))).max).toBe(4)
    const poor = withRig(900) // (the rig took $300: $600 left, one spare at $350)
    expect(poor.cash).toBeCloseTo(600, 2)
    expect(p0MaxBuy(poor, 'pc_cpu', 'new', rigId(poor)).max).toBe(1)
    let s = withRig(1e6)
    s = ok(s, spare(s, 3, rigId(s)))
    expect(p0MaxBuy(s, 'pc_cpu', 'new', rigId(s)).max).toBe(1)
  })

  it('a used copy is refused (the used price is 0)', () => {
    const s = withRig()
    expect(applyAction(s, { type: 'P0_BUY', model: 'pc_cpu', condition: 'used', count: 1, siteId: rigId(s) }).ok).toBe(false)
  })

  it('is on sale in the opening only: 2009Q1 to 2010Q2, not from 2010Q3 (no tail rule, doc 51 v1.7 §18)', () => {
    for (const [q, on] of [['2009Q1', true], ['2009Q2', true], ['2009Q4', true], ['2010Q2', true], ['2010Q3', false], ['2011Q2', false]] as const) {
      const s = withRig()
      s.quarter = quarterIndex(q)!
      const check = p0BuyCheck(s, 'pc_cpu', 'new', 1, rigId(s))
      expect(check === null, q).toBe(on)
      // the buy menu agrees
      const listed = prologueBuyView(s, rigId(s)).some((r) => r.model.id === 'pc_cpu')
      expect(listed, `${q} menu`).toBe(on)
    }
  })

  it('the purchase log names a bought copy "Spare PC (CPU)" (the starter keeps its name)', () => {
    let s = withRig()
    s = ok(s, spare(s, 2, rigId(s)))
    const e = s.log.filter((l) => l.key === 'log.bought').at(-1)!
    expect(e.params).toMatchObject({ count: 2, model: 'pc_cpu_spare', condition: 'new' })
    expect(say({ key: e.key, params: e.params })).toContain('Spare PC (CPU)')
  })

  it('2009Q2 is a decision quarter', () => {
    expect(CONTENT.prologue.rules.decision_quarters).toContain('2009Q2')
    expect(isDecisionQuarterFor(opening(), quarterIndex('2009Q2')!)).toBe(true)
  })

  it('an old save loads unchanged and gains the option (the state has no new field)', () => {
    const s0 = opening()
    const r = decodeSave(encodeSave(s0))
    if (!r.ok) throw new Error(r.error.key)
    expect(r.state).toEqual(s0)
    const s = ok(r.state, { type: 'P0_BUILD_HOME_RIG' })
    expect(applyAction(s, spare(s, 3, rigId(s))).ok).toBe(true)
  })

  it('no bot that existed before buys one (only the cpu-farmer and the unit-farmer carry sparePcs)', () => {
    for (const [name, set] of Object.entries(PROLOGUE_SETTINGS)) {
      if (name === 'cpu-farmer' || name === 'unit-farmer') expect(set.sparePcs, name).toBe(4)
      else expect(set.sparePcs, name).toBeUndefined()
    }
  })
})
