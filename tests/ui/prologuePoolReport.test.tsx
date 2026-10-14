// @vitest-environment happy-dom
// M71.4 (owner's playtest): under PPS the pool panel shows the luck result and the net beside the fees (under PPLNS the net is the
// fees and there is no luck figure), and "1 unlucky week" is not "1 unlucky weeks in a row".
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { poolQuarterFigures } from '../../src/sim/prologue/views.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import type { GameState } from '../../src/sim/state.ts'
import { Ventures } from '../../src/ui/screens/prologue/Ventures.tsx'

afterEach(cleanup)

function withPool(method: 'PPLNS' | 'PPS'): GameState {
  let s = newPrologueGame(7)
  s.phase = 'plan'
  s.quarter = quarterIndex('2013Q4')!
  s.sites[0].tier = 'home_rig'
  s.siteSerials = { home_rig: 1 }
  s.cash = 1e6
  s.bandwidth = 3
  const r = applyAction(s, { type: 'P0_OPEN_POOL', method, feePct: method === 'PPS' ? 0.02 : 0.01 })
  if (!r.ok) throw new Error(r.error.key)
  s = r.state
  return s
}
const props = (state: GameState) => ({ state, act: () => null, tick: () => {}, skip: () => {}, onNew: () => {} })

describe('the pool quarter figures', () => {
  it('PPS: net = what the operator took, luck = net less the fees; PPLNS: net = fees, no luck', () => {
    expect(poolQuarterFigures({ feeUsd: 25_600, operatorUsd: -51_400 }, 'PPS')).toEqual({ feeUsd: 25_600, luckUsd: -77_000, netUsd: -51_400 })
    expect(poolQuarterFigures({ feeUsd: 25_600, operatorUsd: 25_600 }, 'PPLNS')).toEqual({ feeUsd: 25_600, luckUsd: null, netUsd: 25_600 })
    expect(poolQuarterFigures({ feeUsd: 100 }, 'PPS').luckUsd).toBeNull() // (an older save has no operator dollars)
  })
})

describe('the Ventures pool panel', () => {
  it('under PPS shows luck and net rows', () => {
    const s = withPool('PPS')
    s.prologue!.ownPool!.quarter = { feeUsd: 25_600, paidMinersUsd: 1, billsUsd: 1, ownBtc: 0, operatorBtc: 0, blocks: 0, operatorUsd: -51_400 }
    const { container } = render(<Ventures {...props(s)} />)
    expect(container.querySelector('[data-pool-luck]')!.textContent).toContain('77')
    expect(container.querySelector('[data-pool-net]')!.textContent).toContain('51')
  })

  it('under PPLNS shows the net (the fees) and no luck row', () => {
    const { container } = render(<Ventures {...props(withPool('PPLNS'))} />)
    expect(container.querySelector('[data-pool-luck]')).toBeNull()
    expect(container.querySelector('[data-pool-net]')).not.toBeNull()
  })

  it('says "1 unlucky week" for one and "3 unlucky weeks in a row" for three', () => {
    const one = withPool('PPLNS')
    one.prologue!.ownPool!.unluckyRun = 1
    expect(render(<Ventures {...props(one)} />).container.textContent).toContain('1 unlucky week')
    expect(render(<Ventures {...props(one)} />).container.textContent).not.toContain('1 unlucky weeks')
    cleanup()
    const three = withPool('PPLNS')
    three.prologue!.ownPool!.unluckyRun = 3
    expect(render(<Ventures {...props(three)} />).container.textContent).toContain('3 unlucky weeks in a row')
  })
})
