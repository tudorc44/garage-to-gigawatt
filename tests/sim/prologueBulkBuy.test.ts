// Prologue bulk buying (owner, 10 Oct 2026): the most of a machine the reducer accepts at a site now. Cash-bound,
// power-bound, refused outright (0 with the reason); every max is a count P0_BUY really takes, and one more is refused.
import { describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { p0BuyCheck, p0MaxBuy, prologueBuyView } from '../../src/sim/prologue/views.ts'
import { buyPrice, getModel } from '../../src/sim/systems/market.ts'
import type { GameState } from '../../src/sim/state.ts'

/** A prologue in Q3 2010 (graphics cards on sale) with the home rig built (the bedroom is full with the PC). */
function started(): GameState {
  const r = applyAction(newPrologueGame(3), { type: 'START_PROLOGUE' })
  if (!r.ok) throw new Error(r.error.key)
  const s = { ...r.state, quarter: quarterIndex('2010Q3')!, cash: 1e6 }
  const rig = applyAction(s, { type: 'P0_BUILD_HOME_RIG' })
  if (!rig.ok) throw new Error(rig.error.key)
  return rig.state
}

describe('p0MaxBuy', () => {
  const s = started()
  const site = s.sites.at(-1)!.id
  const offer = prologueBuyView(s, site).find((b) => b.blocker === null)!
  const unit = buyPrice(getModel(offer.model.id)!, s.quarter, offer.condition)!

  const takes = (st: GameState, n: number) =>
    applyAction(st, { type: 'P0_BUY', model: offer.model.id, condition: offer.condition, count: n, siteId: site }).ok

  it('cash-bound: as many as the cash buys, no more', () => {
    const st = structuredClone(s)
    st.cash = unit * 2.5
    const { max } = p0MaxBuy(st, offer.model.id, offer.condition, site)
    expect(max).toBe(2)
    expect(takes(st, max)).toBe(true)
    expect(takes(st, max + 1)).toBe(false)
  })

  it('power-bound: with cash to spare, as many as the room’s free power holds', () => {
    const st = structuredClone(s)
    st.cash = 1e12
    const { max } = p0MaxBuy(st, offer.model.id, offer.condition, site)
    expect(max).toBeGreaterThanOrEqual(1)
    expect(takes(st, max)).toBe(true)
    expect(p0BuyCheck(st, offer.model.id, offer.condition, max + 1, site)?.key).toBe('error.no_capacity')
  })

  it('refused outright: 0, with the reducer’s reason', () => {
    const st = structuredClone(s)
    st.cash = 0
    const r = p0MaxBuy(st, offer.model.id, offer.condition, site)
    expect(r.max).toBe(0)
    expect(r.blocker?.key).toBe('error.no_cash')
    // and the buy menu carries the same max
    expect(prologueBuyView(st, site).find((b) => b.model.id === offer.model.id && b.condition === offer.condition)!.max).toBe(0)
  })
})
