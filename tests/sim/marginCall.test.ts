import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { interruptChoices } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { ltv } from '../../src/sim/systems/cryptoLoan.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'

const Q = CONTENT.quarters.indexOf('2018Q3')
const WEEK = 4
const price = CONTENT.market[Q][WEEK].eth_usd
const w = CONTENT.market[Q][WEEK]

/**
 * The live quarter just before week 5 of 2018Q3, with a crypto loan on 10 pledged ETH
 * whose balance puts LTV at `level` after the next week's tick. 20 ETH still in the
 * treasury, $50,000 cash, no machines.
 */
function withLoanAt(level: number): GameState {
  return {
    ...newGame(1),
    phase: 'live',
    quarter: Q,
    week: WEEK,
    cash: 50_000,
    treasury: { BTC: 0, ETH: 20 },
    cryptoLoan: {
      coin: 'ETH',
      collateral: 10,
      balanceUsd: level * 10 * price,
      apr: 0.09,
      takenQuarter: Q,
    },
  }
}
function ok(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const answer = (s: GameState, choice: string) =>
  ok(s, { type: 'RESOLVE_INTERRUPT', choice })

describe('margin calls (interrupts.json margin_call, capital.json game_crypto_loan)', () => {
  it('fire at 70% LTV and pause the quarter, offering what you can afford', () => {
    const s = advance(withLoanAt(0.72))
    expect(s.interrupt).toMatchObject({ id: 'margin_call', coin: 'ETH' })
    expect(s.interrupt!.ltv).toBeCloseTo(0.72)
    expect(interruptChoices(s).map((c) => c.id)).toEqual([
      'post',
      'pay_cash',
      'default',
    ])
    expect(defaultChoice(s)).toBe('post')
    expect(s.reports).toEqual([])
    expect(() => advance(s)).toThrow(/interrupt/)
  })

  it('"post" pledges more coins from the treasury to get back to 50%', () => {
    const s = answer(advance(withLoanAt(0.72)), 'post')
    expect(ltv(s, w)).toBeCloseTo(0.5)
    expect(s.cryptoLoan!.collateral).toBeCloseTo(14.4)
    expect(s.treasury.ETH).toBeCloseTo(15.6)
    expect(s.interrupt).toBeNull()
  })

  it('"pay cash" pays the loan down to 50%', () => {
    const before = advance(withLoanAt(0.72))
    const s = answer(before, 'pay_cash')
    expect(ltv(s, w)).toBeCloseTo(0.5)
    expect(before.cash - s.cash).toBeCloseTo(0.22 * 10 * price)
  })

  it('"sell machines" sells the oldest units until the gap is paid', () => {
    const start = withLoanAt(0.72)
    const withRigs = ok(
      { ...start, phase: 'plan' },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 5,
        siteId: 'site-1',
      },
    )
    const s0 = advance({
      ...withRigs,
      phase: 'live',
      cash: 0,
      treasury: { BTC: 0, ETH: 0 },
    })
    expect(interruptChoices(s0).map((c) => c.id)).toEqual([
      'sell_machines',
      'default',
    ])
    // Can't post (no coins left) or pay (no cash): the default falls back to selling machines.
    expect(defaultChoice(s0)).toBe('sell_machines')
    const s = answer(s0, 'sell_machines')
    expect(ltv(s, w)).toBeLessThanOrEqual(0.5 + 1e-9)
    expect(s.machines.reduce((n, l) => n + l.count, 0)).toBeLessThan(5)
    expect(s.log.some((e) => e.key === 'log.margin_sold_machines')).toBe(true)
  })

  it('"default": the lender keeps the coins, the debt is gone, no loans for 4 quarters', () => {
    const s = answer(advance(withLoanAt(0.72)), 'default')
    expect(s.cryptoLoan).toBeNull()
    expect(s.treasury.ETH).toBe(20)
    expect(s.loansLockedUntil).toBe(Q + 4)
    const entry = s.log.at(-1)!
    expect(t(entry.key, entry.params)).toMatch(
      /^Margin call: you defaulted\. The lender kept 10\.0000 ETH .*No loans for 4 quarters\.$/,
    )
    const plan: GameState = {
      ...s,
      phase: 'plan',
      quarter: Q + 3,
      machines: withRigsLots(),
    }
    const r1 = applyAction(plan, {
      type: 'TAKE_CRYPTO_LOAN',
      coin: 'ETH',
      amountUsd: 100,
    })
    expect(r1.ok ? '' : r1.error.key).toBe('error.loans_locked')
    const r2 = applyAction(plan, { type: 'TAKE_LOAN', amountUsd: 100 })
    expect(r2.ok ? '' : r2.error.key).toBe('error.loans_locked')
    const open = applyAction(
      { ...plan, quarter: Q + 4 },
      { type: 'TAKE_CRYPTO_LOAN', coin: 'ETH', amountUsd: 100 },
    )
    expect(open.ok).toBe(true)
  })

  it('at 80% the lender sells enough coins to repay, returns the rest, no questions asked', () => {
    const s = advance(withLoanAt(0.85))
    expect(s.interrupt).toBeNull()
    expect(s.cryptoLoan).toBeNull()
    expect(s.treasury.ETH).toBeCloseTo(20 + 10 * 0.15)
    expect(s.log.some((e) => e.key === 'log.liquidated')).toBe(true)
  })

  it('logs a warning the week LTV first reaches 65%', () => {
    const s = advance(withLoanAt(0.66))
    expect(s.interrupt).toBeNull()
    // The week before was below 65% only if the price fell; check the log either way.
    const warned = s.log.some((e) => e.key === 'log.ltv_warning')
    const prevPrice = CONTENT.market[Q][WEEK - 1].eth_usd
    expect(warned).toBe((0.66 * price) / prevPrice < 0.65)
  })
})

/** A few used rigs, only so the equipment loan has collateral to ask about. */
function withRigsLots(): GameState['machines'] {
  return [
    {
      id: 'lot-9',
      model: 'gpu_gen1',
      siteId: 'site-1',
      condition: 'used',
      count: 2,
      failed: 0,
      earnsFromQuarter: 0,
    },
  ]
}

describe('margin call fallback order', () => {
  it('with no spare coins but enough cash, the pre-selected answer is paying cash, not defaulting', () => {
    const s = advance({ ...withLoanAt(0.72), treasury: { BTC: 0, ETH: 0 } })
    expect(defaultChoice(s)).toBe('pay_cash')
  })
})
