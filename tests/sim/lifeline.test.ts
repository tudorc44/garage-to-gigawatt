// The distressed lifeline (M5.2; scope 0.2 §2.10, doc 18 §2.2): below 20 MW energized or $5M cash
// at the act boundary, a bankrupt miner's 20 MW site for $6.5M on a bridge loan at 14% for 8 quarters.
import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { debtStackView } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** At the Act I chapter report with one site of `tier` and `cash`. */
function chapter(tier: string, cash: number): GameState {
  const s: GameState = {
    ...newGame(1),
    quarter: actLastQuarter(1),
    phase: 'chapter',
    mergeChoice: 'hold_and_wait',
    cash,
    bandwidth: 6,
    nextId: 3, // site-2 below
  }
  s.sites.push({
    id: 'site-2',
    tier,
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  return s
}
const boundary = (s: GameState) => ok(s, { type: 'CONTINUE_TO_ACT_2' })

describe('the floor', () => {
  it('20 MW and $5M: played normally, no lifeline', () => {
    const s = boundary(chapter('own_site', 5_000_000))
    expect(s.act2Entry!.lifeline).toBeNull()
    const started = ok(s, { type: 'START_ACT_2' })
    expect(started.sites).toHaveLength(2)
    expect(started.bridgeLoan).toBeNull()
  })

  it('under 20 MW, or under $5M, is below it: the lifeline is offered', () => {
    expect(boundary(chapter('warehouse', 50_000_000)).act2Entry!.lifeline).toBe(
      'offered',
    )
    expect(boundary(chapter('own_site', 4_999_999)).act2Entry!.lifeline).toBe(
      'offered',
    )
  })
})

describe('taking it (the default)', () => {
  const taken = () =>
    ok(boundary(chapter('warehouse', 1_000_000)), { type: 'START_ACT_2' })

  it('buys a 20 MW ERCOT site, energized from 2022Q4, with a bridge that brings cash to $5M', () => {
    const s = taken()
    const site = s.sites.at(-1)!
    expect(site.tier).toBe('own_site')
    expect(regionOf(site)).toBe('ercot')
    expect(poweredKw(site, q('2022Q4'))).toBe(20_000)
    expect(s.cash).toBeCloseTo(5_000_000, 2)
    expect(s.bridgeLoan).toEqual({
      amountUsd: 10_500_000, // $6.5M site + $4M to reach $5M
      balanceUsd: 10_500_000,
      apr: 0.14,
      takenQuarter: q('2022Q4'),
      dueQuarter: q('2024Q3'),
    })
    expect(s.act2Entry!.lifeline).toBe('taken')
    expect(debtUsd(s)).toBe(10_500_000)
    expect(debtStackView(s).rows).toContainEqual(
      expect.objectContaining({ kind: 'bridge', maturity: '2024Q3' }),
    )
  })

  it('pays 14% interest weekly, and the whole principal at the end of 2024Q3', () => {
    let s = taken()
    const r = playQuarter(s).reports.at(-1)!
    expect(r.interestUsd).toBeCloseTo((10_500_000 * 0.14) / 4, -1)
    expect(r.principalUsd).toBe(0)
    s = { ...s, quarter: q('2024Q3'), cash: 50_000_000 }
    const due = playQuarter(s)
    expect(due.bridgeLoan).toBeNull()
    expect(due.reports.at(-1)!.principalUsd).toBe(10_500_000)
  })

  it('can be repaid early from the Plan phase', () => {
    const s = { ...taken(), cash: 20_000_000 }
    const r = ok(s, { type: 'REPAY_BRIDGE_LOAN' })
    expect(r.bridgeLoan).toBeNull()
    expect(r.cash).toBe(20_000_000 - 10_500_000)
  })
})

describe('passing', () => {
  it('no site, no loan', () => {
    const s = ok(boundary(chapter('warehouse', 1_000_000)), {
      type: 'START_ACT_2',
      lifeline: 'pass',
    })
    expect(s.sites).toHaveLength(2)
    expect(s.bridgeLoan).toBeNull()
    expect(s.cash).toBe(1_000_000)
    expect(s.act2Entry!.lifeline).toBe('passed')
  })
})
