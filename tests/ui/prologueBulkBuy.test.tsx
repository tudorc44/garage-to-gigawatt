// @vitest-environment happy-dom
// Prologue bulk buying (owner, 10 Oct 2026): "Max (N)" then Buy sends P0_BUY with count N; a count the reducer refuses
// shows its reason and disables Buy.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { p0MaxBuy, prologueBuyView } from '../../src/sim/prologue/views.ts'
import { buyPrice, getModel } from '../../src/sim/systems/market.ts'
import type { GameState } from '../../src/sim/state.ts'
import { BuyPicker } from '../../src/ui/screens/prologue/Machines.tsx'

afterEach(cleanup)

function started(cash: number): { s: GameState; site: string; offer: ReturnType<typeof prologueBuyView>[number] } {
  // (Q3 2010, graphics cards on sale; the home rig built, since the bedroom is full with the PC)
  const r = applyAction(newPrologueGame(3), { type: 'START_PROLOGUE' })
  if (!r.ok) throw new Error(r.error.key)
  const rig = applyAction({ ...r.state, quarter: quarterIndex('2010Q3')!, cash: 1e6 }, { type: 'P0_BUILD_HOME_RIG' })
  if (!rig.ok) throw new Error(rig.error.key)
  const s = rig.state
  const site = s.sites.at(-1)!.id
  const offer = prologueBuyView(s, site).find((b) => b.blocker === null)!
  s.cash = buyPrice(getModel(offer.model.id)!, s.quarter, offer.condition)! * cash
  return { s, site, offer }
}

function picker(s: GameState, site: string, offer: ReturnType<typeof prologueBuyView>[number], onBuy: (n: number) => void) {
  const m = p0MaxBuy(s, offer.model.id, offer.condition, site)
  return render(
    <BuyPicker
      state={s}
      model={offer.model.id}
      condition={offer.condition}
      unitUsd={offer.unitUsd!}
      powerKw={offer.model.power_kw}
      max={m.max}
      blocker={m.blocker}
      siteId={site}
      onBuy={onBuy}
    />,
  )
}

describe('the prologue’s buy picker', () => {
  it('"Max (N)" then Buy sends P0_BUY with count N', () => {
    const { s, site, offer } = started(3.5)
    const n = p0MaxBuy(s, offer.model.id, offer.condition, site).max
    expect(n).toBeGreaterThan(1)
    const onBuy = vi.fn()
    picker(s, site, offer, onBuy)
    fireEvent.click(screen.getByRole('button', { name: `Max (${n})` }))
    expect(screen.getByText(new RegExp(`^${n} ×`))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }))
    expect(onBuy).toHaveBeenCalledWith(n)
  })

  it('a count the reducer refuses shows the reason and disables Buy', () => {
    const { s, site, offer } = started(2.5)
    const onBuy = vi.fn()
    const { container } = picker(s, site, offer, onBuy)
    const input = screen.getByRole('spinbutton', { name: 'How many' })
    fireEvent.input(input, { target: { value: '10' } })
    const buy = screen.getByRole('button', { name: 'Buy' }) as HTMLButtonElement
    expect(buy.disabled).toBe(true)
    expect(container.querySelector('.loss')!.textContent!.length).toBeGreaterThan(0)
  })
})
