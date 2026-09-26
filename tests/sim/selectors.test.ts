import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import {
  averagePrice,
  lotViews,
  machineMarket,
  priceChanges,
  recentMarket,
  siteLadder,
  whyNot,
} from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function act(state: GameState, action: Action): GameState {
  const r = applyAction(state, action)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const buyRig: Action = {
  type: 'BUY_MACHINES',
  model: 'gpu_gen1',
  condition: 'new',
  count: 1,
  siteId: 'site-1',
}

describe('selectors (read-only views for the UI)', () => {
  it('whyNot explains a blocked action without changing anything', () => {
    const s = newGame(1)
    expect(whyNot(s, buyRig)).toBeNull()
    expect(whyNot({ ...s, cash: 100 }, buyRig)?.key).toBe('error.no_cash')
  })

  it('machine market: prices, unlock dates and when a purchase starts earning', () => {
    const [gen1, gen2] = machineMarket(newGame(1))
    expect(gen1).toMatchObject({
      isOut: true,
      newPriceUsd: 2000,
      usedPriceUsd: 1500,
      earnsFromNew: '2017Q2',
    })
    expect(gen2).toMatchObject({ isOut: false, availableFrom: '2020Q4' })
  })

  it('site ladder: garage owned, small unit buildable, warehouse needs it first, Texas dated', () => {
    const rungs = siteLadder(newGame(1))
    expect(rungs.map((r) => r.status)).toEqual([
      'owned',
      'build',
      'locked',
      'locked',
      'locked',
    ])
    expect(rungs[2].needsTier).toBe('small_unit')
    expect(rungs[4].opensIn).toBe('2020Q1')
  })

  it('lot status: arriving until it earns, then running or switched off', () => {
    let s = act(newGame(1), buyRig)
    expect(lotViews(s)[0]).toMatchObject({
      status: 'arriving',
      earnsFrom: '2017Q2',
    })
    s = { ...s, quarter: q('2017Q4') }
    expect(lotViews(s)[0].status).toBe('running')
    s = { ...s, quarter: q('2022Q3'), phase: 'live', week: 13 }
    expect(lotViews(s)[0].status).toBe('switched_off') // after the Merge
  })

  it('price changes and the last 13 weeks for sparklines', () => {
    const s = newGame(1)
    expect(priceChanges(s).since).toBeNull()
    expect(recentMarket(s)).toHaveLength(1)
    const later = { ...s, quarter: 3 }
    expect(recentMarket(later)).toHaveLength(14)
    expect(priceChanges(later).since).toBe(CONTENT.market[2][12].week)
  })

  it('average quarterly price', () => {
    expect(averagePrice(q('2017Q4'), 'BTC')).toBeGreaterThan(9000)
  })
})

describe('game log', () => {
  it('records Plan decisions and live-quarter events as message keys', () => {
    let s = act(newGame(1), buyRig)
    s = act(s, { type: 'SET_HODL', pct: 0.4 })
    s = act(s, { type: 'END_PLAN' })
    expect(s.quarterStats.startCash).toBe(8000)
    expect(s.log.map((l) => l.key)).toEqual(['log.bought', 'log.hodl'])
    s = { ...s, week: 9, treasury: { BTC: 0, ETH: 10 } }
    s = advance(s) // ETH +26.5% → price alert
    s = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
    expect(s.log.at(-1)).toMatchObject({ key: 'log.alert_held', week: 10 })
    expect(s.quarterStats.weeks.at(-1)!.priceAlert).toBe(true)
  })
})
