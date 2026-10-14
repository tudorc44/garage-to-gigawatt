// @vitest-environment happy-dom
// M68.5 (doc 51 v1.0 §5, §7): the Prologue's screens for altcoins: the coin selector on each GPU lot of the Rig screen (only
// the coins open that quarter), Litecoin and Dogecoin in the coins screen with percent buttons and an exact amount, the news
// headlines in the news list, and the chapter report's altcoin line (without its later-price clause).
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newAlts } from '../../src/sim/prologue/alts.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { prologueAltsSold, prologueNews } from '../../src/sim/prologue/views.ts'
import type { GameState, MachineLot } from '../../src/sim/state.ts'
import { Chapter } from '../../src/ui/screens/prologue/End.tsx'
import { Coins } from '../../src/ui/screens/prologue/Coins.tsx'
import { Machines } from '../../src/ui/screens/prologue/Machines.tsx'
import { hasText, tDynamic } from '../../src/i18n/t.ts'

afterEach(cleanup)

function plan(quarter: string, model = 'gpu_gaming_2010'): GameState {
  const s = newPrologueGame(3)
  s.phase = 'plan'
  s.quarter = quarterIndex(quarter)!
  const lot: MachineLot = { id: 'lot-g', model, siteId: s.sites[0].id, condition: 'used', count: 4, failed: 0, earnsFromQuarter: s.quarter }
  s.machines = [lot]
  s.bandwidth = 2
  return s
}

/** A screen on a mutable game: `act` applies the action and redraws. */
function screen(initial: GameState, Screen: typeof Machines) {
  let state = initial
  const view = render(<div />)
  const draw = () => view.rerender(<Screen state={state} act={act} tick={() => {}} skip={() => {}} onNew={() => {}} />)
  const act = (a: Action) => {
    const r = applyAction(state, a)
    if (!r.ok) return r.error
    state = r.state
    draw()
    return null
  }
  draw()
  return { view, get state() { return state } }
}

const coinButtons = (c: Element) => [...c.querySelectorAll('[data-lot-coin] button')].map((b) => b.textContent)

describe('the coin selector on a GPU lot (Rig screen)', () => {
  it('2011Q3 has none; 2011Q4 offers BTC and LTC; 2013Q4 adds DOGE', () => {
    expect(coinButtons(screen(plan('2011Q3'), Machines).view.container)).toEqual([])
    cleanup()
    expect(coinButtons(screen(plan('2011Q4'), Machines).view.container)).toEqual(['BTC', 'LTC'])
    cleanup()
    expect(coinButtons(screen(plan('2013Q4'), Machines).view.container)).toEqual(['BTC', 'LTC', 'DOGE'])
  })

  it('an FPGA has no selector; the 2015 ETH rig offers ETH, LTC and DOGE', () => {
    expect(coinButtons(screen(plan('2013Q4', 'fpga_board'), Machines).view.container)).toEqual([])
    cleanup()
    expect(coinButtons(screen(plan('2015Q3', 'gpu_eth_2015'), Machines).view.container)).toEqual(['ETH', 'LTC', 'DOGE'])
  })

  it('clicking a coin points the lot at it (SET_LOT_COIN), and the pressed button follows', () => {
    const g = screen(plan('2013Q4'), Machines)
    const ltc = [...g.view.container.querySelectorAll('[data-lot-coin] button')].find((b) => b.textContent === 'LTC')!
    fireEvent.click(ltc)
    expect(g.state.machines[0].altCoin).toBe('LTC')
    const pressed = [...g.view.container.querySelectorAll('[data-lot-coin] button[aria-pressed="true"]')].map((b) => b.textContent)
    expect(pressed).toEqual(['LTC'])
    fireEvent.click([...g.view.container.querySelectorAll('[data-lot-coin] button')].find((b) => b.textContent === 'BTC')!)
    expect(g.state.machines[0].altCoin).toBeUndefined()
  })
})

describe('Litecoin and Dogecoin in the coins screen', () => {
  const holding = (): GameState => {
    const s = plan('2014Q2')
    s.prologue!.alts = newAlts()
    s.prologue!.alts.held.LTC = 1000
    return s
  }

  it('nothing shows without altcoins; with some, the panel lists them', () => {
    expect(screen(plan('2014Q2'), Coins).view.container.querySelector('[data-alt-coins]')).toBeNull()
    cleanup()
    const g = screen(holding(), Coins)
    const panel = g.view.container.querySelector('[data-alt-coins]')!
    expect(panel.textContent).toContain('1,000 LTC')
  })

  it('a percent button fills the exact amount; Sell orders exactly that amount', () => {
    const g = screen(holding(), Coins)
    const c = g.view.container
    const input = c.querySelector('[data-alt-amount]') as HTMLInputElement
    fireEvent.click([...c.querySelectorAll('[data-alt-share] button')].find((b) => b.textContent === '50%')!)
    expect(input.value).toBe('500')
    fireEvent.input(input, { target: { value: '123.5' } })
    const sell = [...c.querySelectorAll('[data-alt-coins] button')].find((b) => /^Sell for/.test(b.textContent ?? ''))!
    fireEvent.click(sell)
    expect(g.state.prologue!.alts!.queue.LTC).toBeCloseTo(123.5, 9)
  })

  it('an amount over what you hold can\'t be sold', () => {
    const g = screen(holding(), Coins)
    const c = g.view.container
    fireEvent.input(c.querySelector('[data-alt-amount]') as HTMLInputElement, { target: { value: '1001' } })
    const sell = [...c.querySelectorAll('[data-alt-coins] .form-row > button')].find((b) => b.textContent === 'Sell') as HTMLButtonElement
    expect(sell.disabled).toBe(true)
  })

  it('the keep share buttons set the keep/sell % of the coin', () => {
    const g = screen(holding(), Coins)
    fireEvent.click([...g.view.container.querySelectorAll('[data-alt-keep] button')].find((b) => b.textContent === '50%')!)
    expect(g.state.prologue!.alts!.hodl.LTC).toBe(0.5)
  })
})

describe('news and the chapter report', () => {
  it('a quarter\'s headline cards join the news list (display only: nothing is drawn or recorded)', () => {
    const s = plan('2013Q4')
    const titles = prologueNews(s).filter((k) => hasText(k)).map((k) => tDynamic(k, ''))
    expect(titles).toContain('Silver Doubles')
    expect(titles).toContain('A Joke Coin')
    expect(prologueNews(plan('2013Q3')).filter((k) => hasText(k)).map((k) => tDynamic(k, ''))).not.toContain('Silver Doubles')
  })

  it('the chapter report says what the altcoins sold for, and what they were worth on 31 December 2021', () => {
    const s = plan('2016Q4')
    s.phase = 'chapter'
    s.prologue!.alts = newAlts()
    s.prologue!.alts.handover = { LTC: { amount: 1234.5, usd: 4321 }, DOGE: { amount: 0, usd: 0 } }
    expect(prologueAltsSold(s).map((r) => r.coin)).toEqual(['LTC'])
    const { container } = render(<Chapter state={s} act={() => null} tick={() => {}} skip={() => {}} onNew={() => {}} />)
    const line = container.querySelector('[data-alts-sold]')!.textContent!
    // (1,234.5 LTC at the doc's fixed $146.41 close)
    expect(line).toBe('You sold 1,235 Litecoin in 2016 for $4,321. At December 31, 2021 those coins were worth $180.7K.')
  })
})
