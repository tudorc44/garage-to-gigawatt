// The lifeline bridge's payments as the Plan and Capital screens show them (M8.7f): read-only sums that
// must equal what payBridgeWeek really pays, quarter by quarter, and the step from interest-only to
// amortising that a player has to see a quarter early.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { bridgePaymentView } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { bridgeSchedule, payBridgeWeek } from '../../src/sim/systems/lifeline.ts'
import { act2Company } from './act2Helpers.ts'

const FIRST = CONTENT.quarters.indexOf('2022Q4')
const QUARTERS = 12

function withBridge(): GameState {
  const s = act2Company('2022Q4')
  s.bridgeLoan = {
    amountUsd: 10_950_000,
    balanceUsd: 10_950_000,
    apr: 0.14,
    takenQuarter: FIRST,
    dueQuarter: FIRST + QUARTERS - 1,
  }
  s.cash = 1e9
  return s
}

describe('the bridge schedule', () => {
  it('is null without a bridge', () => {
    expect(bridgeSchedule(act2Company('2022Q4'))).toBeNull()
    expect(bridgePaymentView(act2Company('2022Q4'))).toBeNull()
  })

  it('equals what payBridgeWeek pays, every quarter, and predicts the next quarter too', () => {
    const s = withBridge()
    const io = BALANCE.lifeline.bridgeInterestOnlyQuarters
    for (let i = 0; i < QUARTERS; i++) {
      s.quarter = FIRST + i
      const view = bridgeSchedule(s)!
      let paid = 0
      const nextPredicted = view.next
      for (let w = 0; w < BALANCE.weeksPerQuarter; w++) {
        s.week = w
        if (!s.bridgeLoan) break
        const p = payBridgeWeek(s)
        paid += p.interestUsd + p.principalUsd
      }
      expect(paid).toBeCloseTo(view.now.totalUsd, 1)
      expect(view.now.phase).toBe(
        i === QUARTERS - 1 ? 'final' : i >= io ? 'amortising' : 'interest_only',
      )
      expect(view.quartersLeft).toBe(QUARTERS - i)
      if (i < QUARTERS - 1) {
        // What it said about next quarter is what it then says is due now.
        s.quarter = FIRST + i + 1
        expect(bridgeSchedule(s)!.now.totalUsd).toBeCloseTo(
          nextPredicted!.totalUsd,
          1,
        )
      } else expect(nextPredicted).toBeNull()
    }
    expect(s.bridgeLoan).toBeNull() // fully repaid by the end
  })

  it('shows the step-up a quarter early, and whether the cash covers it', () => {
    const io = BALANCE.lifeline.bridgeInterestOnlyQuarters
    const s = withBridge()
    // The last interest-only quarter: next quarter's payment is much bigger.
    s.quarter = FIRST + io - 1
    const v = bridgePaymentView(s)!
    expect(v.now.phase).toBe('interest_only')
    expect(v.next!.phase).toBe('amortising')
    expect(v.stepsUp).toBe(true)
    expect(v.next!.principalUsd).toBeCloseTo(10_950_000 / (QUARTERS - io), 0)
    expect(v.interestOnlyQuarters).toBe(io)
    expect(v.coversNext).toBe(true)
    s.cash = v.next!.totalUsd - 1
    expect(bridgePaymentView(s)!.coversNext).toBe(false)
    // Well inside the interest-only quarters nothing steps up yet.
    s.quarter = FIRST
    expect(bridgePaymentView(s)!.stepsUp).toBe(false)
  })
})
