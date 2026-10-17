// @vitest-environment happy-dom
// M78.3 (doc 58 v1.1 §4): the Ventures tab in Acts I-II. The offer shows in 2020Q2 with a Join button per stake that dispatches
// LARKSPUR_JOIN; the tab is in the nav only behind the ventures flag; the after-the-Merge panel lists each GPU lot's choices.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { quarterIndex } from '../../src/content/index.ts'
import type { Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { addMachines } from '../../src/sim/systems/machines.ts'
import { ventures12Visible } from '../../src/sim/ventures12Views.ts'
import { Ventures12Section } from '../../src/ui/screens/Ventures12.tsx'

afterEach(cleanup)

function at(label: string, act: 1 | 2 = 1): GameState {
  const s = { ...newGame(1), act, quarter: quarterIndex(label)!, phase: 'plan' as const, cash: 50_000_000, bandwidth: 6 }
  return s
}

describe('the tab', () => {
  it('shows from the 2020Q2 offer through Act II, and not before', () => {
    expect(ventures12Visible(at('2020Q1'))).toBe(false)
    expect(ventures12Visible(at('2020Q2'))).toBe(true)
    expect(ventures12Visible(at('2022Q3'))).toBe(true)
    expect(ventures12Visible(at('2022Q4', 2))).toBe(true)
    expect(ventures12Visible({ ...at('2027Q1'), act: 3 })).toBe(false)
  })

  it('the offer: three stakes, each with a Join that dispatches LARKSPUR_JOIN', () => {
    const sent: Action[] = []
    const { container } = render(<Ventures12Section state={at('2020Q2')} act={(a) => (sent.push(a), null)} />)
    const joins = container.querySelectorAll('[data-larkspur-join]')
    expect([...joins].map((b) => b.getAttribute('data-larkspur-join'))).toEqual(['0.1', '0.2', '0.3'])
    fireEvent.click(joins[1])
    expect(sent).toEqual([{ type: 'LARKSPUR_JOIN', stake: 0.2 }])
  })

  it('after the Merge: a Gen 2 lot lists its choices and a button sets the use', () => {
    const s = at('2022Q4', 2)
    addMachines(s, 'gpu_gen2', 'new', 3, s.sites[0].id)
    const sent: Action[] = []
    const { container } = render(<Ventures12Section state={s} act={(a) => (sent.push(a), null)} />)
    const uses = [...container.querySelectorAll('[data-lot-use]')].map((b) => b.getAttribute('data-lot-use'))
    expect(uses).toEqual(['etc', 'rvn', 'erg', 'rent']) // its own coin is the one in use
    fireEvent.click(container.querySelector('[data-lot-use="rent"]')!)
    expect(sent[0]).toMatchObject({ type: 'SET_LOT_USE', use: 'rent' })
  })
})

describe('every M78 action has a UI entry point', () => {
  it('the Ventures screen dispatches each one', async () => {
    const src = (await import('../../src/ui/screens/Ventures12.tsx?raw')).default
    for (const type of ['LARKSPUR_JOIN', 'LARKSPUR_CALL', 'LARKSPUR_RESERVE', 'LARKSPUR_BUY', 'LARKSPUR_SELL', 'SET_LOT_USE']) expect(src, type).toContain(`type: '${type}'`)
  })
})

describe('selling the stake (M80.1)', () => {
  it('in the sale window the tab shows the value, the hint and Sell all / Sell half, which dispatch LARKSPUR_SELL', async () => {
    const { larkspurDraws } = await import('../../src/sim/systems/larkspur.ts')
    let seed = 1
    while (larkspurDraws({ seed }).slip !== 0 || larkspurDraws({ seed }).outcome !== 'ships') seed++
    const s = {
      ...at('2022Q2'),
      seed,
      larkspur: { stake: 0.2, stakeAtJoin: 0.2, paidUsd: 1_600_000, joinedQuarter: 14, call: null, answered: ['tape_out', 'first_units'] as ('tape_out' | 'first_units')[], memory: 'lk6' as const },
    }
    const sent: Action[] = []
    const { container } = render(<Ventures12Section state={s} act={(a) => (sent.push(a), null)} />)
    const box = container.querySelector('[data-larkspur-stake-sale]')!
    expect(box.textContent).toContain('Sell before the Merge, or hold for the ETC afterlife.')
    expect(box.textContent).toContain('$2.0M') // 20% of 1,650 units x $6,000, shown to one decimal
    expect(container.querySelector('[data-larkspur-sale-releases]')).toBeNull() // (no reservation here)
    fireEvent.click(container.querySelector('[data-larkspur-sell="half"]')!)
    fireEvent.click(container.querySelector('[data-larkspur-sell="all"]')!)
    expect(sent).toEqual([{ type: 'LARKSPUR_SELL', kind: 'half' }, { type: 'LARKSPUR_SELL', kind: 'all' }])
  })

  it('no sale panel before first units', () => {
    const s = { ...at('2021Q2'), larkspur: { stake: 0.2, stakeAtJoin: 0.2, paidUsd: 533_333, joinedQuarter: 14, call: null, answered: [] } }
    const { container } = render(<Ventures12Section state={s} act={() => null} />)
    expect(container.querySelector('[data-larkspur-stake-sale]')).toBeNull()
  })
})

describe('the sale and a reservation (M81.1)', () => {
  it('says that selling releases the units not yet bought and refunds their deposit', async () => {
    const { larkspurDraws } = await import('../../src/sim/systems/larkspur.ts')
    let seed = 1
    while (larkspurDraws({ seed }).slip !== 0 || larkspurDraws({ seed }).outcome !== 'ships') seed++
    const s = {
      ...at('2022Q1'),
      seed,
      larkspur: {
        stake: 0.2, stakeAtJoin: 0.2, paidUsd: 1_600_000, joinedQuarter: 14, call: null,
        answered: ['tape_out', 'first_units'] as ('tape_out' | 'first_units')[], memory: 'lk6' as const,
        reservation: { units: 20, depositUsd: 35_100, bought: 8 },
      },
    }
    const { container } = render(<Ventures12Section state={s} act={() => null} />)
    expect(container.querySelector('[data-larkspur-sale-releases]')?.textContent).toContain('releases the units you reserved and have not bought')
  })
})
