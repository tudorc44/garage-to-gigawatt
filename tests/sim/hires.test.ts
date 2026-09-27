import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { interruptChoices } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import {
  buildQuartersFor,
  failureMult,
  getHire,
  pitchShift,
  powerNegotiationShift,
  salaryUsdQ,
} from '../../src/sim/systems/hires.ts'
import { getTier } from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
const rich = (label = '2019Q1'): GameState => ({
  ...newGame(1),
  quarter: q(label),
  cash: 1_000_000,
})
const hire = (id: string): Action => ({ type: 'HIRE', hire: id })
const fire = (id: string): Action => ({ type: 'FIRE', hire: id })

describe('hires (hires.json)', () => {
  it('salaries: yearly ÷ 4, straight line 2017 → 2021, then +8% in 2022', () => {
    const ops = getHire('ops_manager')!
    expect(salaryUsdQ(ops, q('2017Q1'))).toBe(22_500)
    expect(salaryUsdQ(ops, q('2019Q3'))).toBe(27_500)
    expect(salaryUsdQ(ops, q('2021Q2'))).toBe(32_500)
    expect(salaryUsdQ(ops, q('2022Q1'))).toBeCloseTo(35_100)
  })

  it('hiring costs 1 Bandwidth and needs a quarter of salary in cash; one of each', () => {
    const s = ok(rich(), hire('ops_manager'))
    expect(s.bandwidth).toBe(2)
    expect(s.staff).toEqual({ ops_manager: q('2019Q1') })
    expect(s.cash).toBe(1_000_000) // no signing cost
    expect(err(s, hire('ops_manager'))).toBe('error.already_hired')
    expect(err({ ...rich(), cash: 20_000 }, hire('ops_manager'))).toBe(
      'error.hire_needs_cash',
    )
    expect(err({ ...rich(), bandwidth: 0 }, hire('ops_manager'))).toBe(
      'error.no_bandwidth',
    )
    expect(err({ ...rich(), phase: 'live' }, hire('ops_manager'))).toBe(
      'error.wrong_phase',
    )
  })

  it('salaries are paid weekly and count in EBITDA', () => {
    let s = ok(rich(), hire('ops_manager'))
    s = ok(s, { type: 'END_PLAN' })
    while (s.phase === 'live') {
      if (s.interrupt) s = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      else s = advance(s)
    }
    const r = s.reports.at(-1)!
    expect(r.salariesUsd).toBeCloseTo(27_500, 0)
    expect(r.ebitdaUsd).toBeCloseTo(
      r.revenueUsd - r.powerCostUsd - r.rentUsd - r.salariesUsd,
      0,
    )
    expect(r.cash).toBeCloseTo(1_000_000 - 27_500 - r.rentUsd, 0)
  })

  it("letting go costs a quarter's salary, no Bandwidth; no rehiring the same quarter", () => {
    let s = ok(rich(), hire('trader'))
    s = ok(s, fire('trader'))
    expect(s.staff).toEqual({})
    expect(s.cash).toBe(1_000_000 - salaryUsdQ(getHire('trader')!, s.quarter))
    expect(s.bandwidth).toBe(2)
    expect(err(s, hire('trader'))).toBe('error.rehire_same_quarter')
    expect(ok({ ...s, quarter: s.quarter + 1 }, hire('trader')).staff).toEqual({
      trader: s.quarter + 1,
    })
    expect(err(rich(), fire('trader'))).toBe('error.not_hired')
  })

  it('Chief of Staff: +1 Bandwidth from the next quarter, capped at 6', () => {
    const s = ok(rich(), hire('chief_of_staff'))
    expect(bandwidthForQuarter(s)).toBe(3)
    expect(bandwidthForQuarter({ ...s, quarter: s.quarter + 1 })).toBe(4)
  })

  it('Ops Manager halves failure chances', () => {
    expect(failureMult(rich())).toBe(1)
    expect(failureMult(ok(rich(), hire('ops_manager')))).toBe(0.5)
  })

  it('BD Lead: one more scouting offer, flaws shown, investors ~5% higher', () => {
    const scout = (s: GameState) =>
      ok(s, { type: 'SCOUT_SITES', tier: 'warehouse' }).siteOffers.length
    const base = { ...rich(), sites: [...rich().sites] }
    base.sites.push({
      id: 'site-2',
      tier: 'small_unit',
      readyQuarter: 0,
      rentUsdQ: 6000,
      powerPriceMult: 1,
      flaw: null,
    })
    const bd = ok(base, hire('bd_lead'))
    // Same seed and random stream: exactly one more offer.
    expect(scout({ ...bd, bandwidth: 3 })).toBe(scout(base) + 1)
    expect(pitchShift(base)).toBe(0)
    expect(pitchShift(bd)).toBe(0.05)
    const p = ok(
      {
        ...bd,
        quarter: q('2018Q2'),
        reports: [{ revenueUsd: 1_000 } as GameState['reports'][number]],
      },
      {
        type: 'PITCH_START',
        round: 'seed',
      },
    ).pitch!
    expect(p.shift).toBe(0.05)
    expect(p.limitUsd).toBeGreaterThanOrEqual(6_000_000 * 0.95 * 1.05)
  })

  it('Ex-Utility Exec: builds a quarter faster but never under 1; utilities give 5% more ground', () => {
    const s = ok(rich(), hire('ex_utility'))
    const bq = (id: string, st: GameState) => buildQuartersFor(st, getTier(id)!)
    expect(
      ['small_unit', 'warehouse', 'own_site', 'texas_site'].map((x) =>
        bq(x, rich()),
      ),
    ).toEqual([1, 1, 2, 3])
    expect(
      ['small_unit', 'warehouse', 'own_site', 'texas_site'].map((x) =>
        bq(x, s),
      ),
    ).toEqual([1, 1, 1, 2])
    expect(powerNegotiationShift(rich())).toBe(0)
    expect(powerNegotiationShift(s)).toBe(0.05)
  })

  it('Trader: an LTV warning pauses the quarter (not counted); repay or carry on', () => {
    // Find a week in 2018 where ETH fell at least 5%, and set LTV just under 65% the week before.
    let Q = -1
    let W = -1
    for (let qi = q('2018Q1'); qi <= q('2018Q4') && Q < 0; qi++) {
      for (let wi = 1; wi < 13; wi++) {
        const m = CONTENT.market[qi]
        if (m[wi].eth_usd < m[wi - 1].eth_usd * 0.95) {
          Q = qi
          W = wi
          break
        }
      }
    }
    const prev = CONTENT.market[Q][W - 1].eth_usd
    const setup = (staff: Record<string, number>): GameState => ({
      ...newGame(1),
      phase: 'live',
      quarter: Q,
      week: W,
      cash: 500_000,
      staff,
      cryptoLoan: {
        coin: 'ETH',
        collateral: 10,
        balanceUsd: 0.64 * 10 * prev,
        apr: 0.09,
        takenQuarter: Q,
      },
    })
    expect(advance(setup({})).interrupt).toBeNull() // just the log line
    const s = advance(setup({ trader: 0 }))
    expect(s.interrupt).toMatchObject({ id: 'margin_warning', coin: 'ETH' })
    expect(s.interruptsThisQuarter).toBe(0)
    expect(interruptChoices(s).map((c) => c.id)).toEqual(['repay', 'ok'])
    const repaid = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'repay' })
    expect(repaid.cryptoLoan).toBeNull()
    expect(repaid.interrupt).toBeNull()
    const carried = ok(s, { type: 'RESOLVE_INTERRUPT', choice: 'ok' })
    expect(carried.cryptoLoan).not.toBeNull()
  })
})
