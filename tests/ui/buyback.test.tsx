// @vitest-environment happy-dom
// M79.3 (doc 62 v1.0): the Capital screen's buy-back panel and the Texas self-funding note. Each action has a UI entry point.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { buybackClimate } from '../../src/sim/systems/buyback.ts'
import type { Action } from '../../src/sim/actions.ts'
import { playGame } from '../../src/sim/replay.ts'
import type { GameState } from '../../src/sim/state.ts'
import { BuybackPanel } from '../../src/ui/components/BuybackPanel.tsx'
import { OffersDialog } from '../../src/ui/screens/dialogs.tsx'
import { newGame } from '../../src/sim/state.ts'
import { BOTS } from '../../tools/bots.ts'

afterEach(cleanup)
const finished = playGame(3, BOTS['raise-climb'], { through: 1 }).state
const plan = (label: string, over: Partial<GameState> = {}): GameState =>
  ({ ...structuredClone(finished), act: 1, phase: 'plan', quarter: quarterIndex(label)!, cash: 50_000_000, bandwidth: 4, buyback: undefined, ...over }) as GameState

describe('the buy-back panel', () => {
  it('lists each round with its stake and an offer button that dispatches BUYBACK_OFFER', () => {
    const sent: Action[] = []
    const { container } = render(<BuybackPanel state={plan('2021Q2')} act={(a) => (sent.push(a), null)} />)
    const rows = [...container.querySelectorAll('[data-buyback-round]')].map((r) => r.getAttribute('data-buyback-round'))
    expect(rows).toEqual(['friends_family', 'seed', 'series_a'])
    fireEvent.click(container.querySelector('[data-buyback-offer="seed"]')!)
    expect(sent).toEqual([{ type: 'BUYBACK_OFFER', round: 'seed', share: 1 }])
  })

  it('says openly which way the market leans', () => {
    const boom = render(<BuybackPanel state={plan('2021Q1')} act={() => null} />).container.querySelector('[data-buyback-climate]')
    expect(boom?.getAttribute('data-buyback-climate')).toBe('boom')
    cleanup()
    const downQ = CONTENT.quarters.findIndex((_, i) => i >= 4 && i <= 23 && buybackClimate(plan('2021Q1', { quarter: i })) === 'downturn')
    const down = render(<BuybackPanel state={plan('2021Q1', { quarter: downQ })} act={() => null} />).container.querySelector('[data-buyback-climate]')
    expect(down?.getAttribute('data-buyback-climate')).toBe('downturn')
  })

  it('after an IPO it shows the open market and BUYBACK_MARKET', () => {
    const ipo = playGame(2, BOTS['texas-ipo'], { through: 1 }).state
    const sent: Action[] = []
    const { container } = render(
      <BuybackPanel state={{ ...structuredClone(ipo), act: 1, phase: 'plan', quarter: quarterIndex('2022Q1')!, cash: 5e8, bandwidth: 4 } as GameState} act={(a) => (sent.push(a), null)} />,
    )
    expect(container.querySelector('[data-buyback-market]')).toBeTruthy()
    fireEvent.click(container.querySelector('[data-buyback-market-btn]')!)
    expect(sent[0]).toMatchObject({ type: 'BUYBACK_MARKET' })
  })

  it('is an Act I panel only', () => {
    expect(render(<BuybackPanel state={plan('2021Q2', { act: 2 })} act={() => null} />).container.querySelector('[data-buyback]')).toBeNull()
  })
})

describe('the Texas self-funding note', () => {
  const texas = (cash: number): GameState => ({
    ...newGame(1),
    quarter: quarterIndex('2020Q3')!,
    phase: 'plan',
    cash,
    bandwidth: 4,
    raisesDone: ['seed'],
    siteOffers: [{ id: 'o', tier: 'texas_site', rentUsdQ: 0, capexUsd: 40_000_000, powerPriceMult: 1, flaw: null }],
  })
  it('says what self-funding takes, and the locked text when cash is short', () => {
    const rich = render(<OffersDialog state={texas(20_000_000)} act={() => null} onClose={() => {}} />).container.querySelector('[data-self-fund]')!
    expect(rich.textContent).toContain('$3.1M')
    cleanup()
    const poor = render(<OffersDialog state={texas(5_000_000)} act={() => null} onClose={() => {}} />).container.querySelector('[data-self-fund]')!
    expect(poor.textContent).toBe("Needs Series A, or phase 1's cost plus a deposit of $3.1M in cash")
  })
})

describe('every M79 action has a UI entry point', () => {
  it('the Capital panel dispatches both buy-back actions', async () => {
    const src = (await import('../../src/ui/components/BuybackPanel.tsx?raw')).default
    for (const type of ['BUYBACK_OFFER', 'BUYBACK_MARKET']) expect(src, type).toContain(`type: '${type}'`)
  })
})
