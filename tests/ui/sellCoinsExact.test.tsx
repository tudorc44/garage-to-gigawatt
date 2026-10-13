// @vitest-environment happy-dom
// Fix (13 Oct 2026): the "Sell treasury coins" dialog takes an exact amount in coins beside the 25 / 50 / 75 / 100% buttons.
// A typed amount becomes the action's share (amount ÷ holding), so SELL_TREASURY { coin, pct } is unchanged; typing clears the
// percent buttons and pressing one fills the field; zero, negatives, too many decimals and more than the holding show an inline
// message and send nothing.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { SellCoinsDialog } from '../../src/ui/screens/dialogs.tsx'

afterEach(cleanup)

/** An Act I game holding 668,309 BTC (a Prologue careful-hodler's order of size). */
function holder(): GameState {
  const s = newGame(1)
  s.treasury.BTC = 668309
  s.bandwidth = 4
  return s
}

function open(state: GameState) {
  const act = vi.fn<(a: Action) => null>(() => null)
  const view = render(<SellCoinsDialog state={state} act={act} onClose={() => {}} />)
  const input = document.querySelector('[data-sell-amount]') as HTMLInputElement
  const sellButton = () => [...document.querySelectorAll('button.btn-primary')].find((b) => /^Sell for/.test(b.textContent ?? '')) as HTMLButtonElement
  const problem = () => document.querySelector('[data-sell-problem]')?.textContent ?? null
  return { act, view, input, sellButton, problem }
}

describe('Sell treasury coins: an exact amount', () => {
  it('1234.5 BTC from 668,309: the action carries pct = 1234.5 / 668309, and the line shows the typed amount', () => {
    const { act, input, sellButton, problem } = open(holder())
    fireEvent.input(input, { target: { value: '1234.5' } })
    expect(problem()).toBeNull()
    expect(document.body.textContent).toContain('Sells 1,234.5 BTC for')
    fireEvent.click(sellButton())
    expect(act).toHaveBeenCalledTimes(1)
    expect(act).toHaveBeenCalledWith({ type: 'SELL_TREASURY', coin: 'BTC', pct: 1234.5 / 668309 })
  })

  it('more than the holding: the message shows and nothing is sent', () => {
    const { act, input, sellButton, problem } = open(holder())
    fireEvent.input(input, { target: { value: '700000' } })
    expect(problem()).toBe('You hold only 668,309 BTC.')
    expect(sellButton().disabled).toBe(true)
    fireEvent.click(sellButton())
    expect(act).not.toHaveBeenCalled()
  })

  it('zero, a negative, too many decimals and a non-number each show their own message and send nothing', () => {
    const { act, input, sellButton, problem } = open(holder())
    for (const [value, message] of [
      ['0', 'The amount must be more than zero.'],
      ['-5', 'The amount must be more than zero.'],
      ['1.123456789', 'BTC goes to 8 decimal places.'],
      ['abc', 'Type an amount as a number, like 1234.5.'],
      ['', 'Type an amount as a number, like 1234.5.'],
    ] as const) {
      fireEvent.input(input, { target: { value } })
      expect(problem(), JSON.stringify(value)).toBe(message)
      fireEvent.click(sellButton())
    }
    // 8 decimals is fine for BTC
    fireEvent.input(input, { target: { value: '0.12345678' } })
    expect(problem()).toBeNull()
    expect(act).not.toHaveBeenCalled()
  })

  it('a percent button fills the field and presses; typing clears the buttons; a button sends its exact share', () => {
    const { act, input, sellButton } = open(holder())
    const button = (label: string) => [...document.querySelectorAll('.seg button')].find((b) => b.textContent === label) as HTMLButtonElement
    expect(button('25%').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button('50%'))
    expect(input.value).toBe('334154.5')
    expect(button('50%').getAttribute('aria-pressed')).toBe('true')
    fireEvent.input(input, { target: { value: '10' } })
    for (const b of [...document.querySelectorAll('.seg button')].filter((x) => /%$/.test(x.textContent ?? '')))
      expect(b.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(button('100%'))
    expect(input.value).toBe('668309')
    fireEvent.click(sellButton())
    expect(act).toHaveBeenCalledWith({ type: 'SELL_TREASURY', coin: 'BTC', pct: 1 })
  })

  it('ETH goes to 4 decimals', () => {
    const s = holder()
    s.treasury.ETH = 50
    s.treasury.BTC = 0
    const { input, problem } = open(s)
    fireEvent.input(input, { target: { value: '1.00005' } })
    expect(problem()).toBe('ETH goes to 4 decimal places.')
    fireEvent.input(input, { target: { value: '1.0005' } })
    expect(problem()).toBeNull()
  })
})
