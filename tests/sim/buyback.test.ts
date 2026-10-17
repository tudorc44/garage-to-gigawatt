// M79.3 (doc 62 v1.0 §2): buying back shares. Pricing (valuation x 1.2), the refusal odds in a boom, a downturn and neither, the stake
// moving to the founder, a round closing, one offer a quarter and the Bandwidth, the open market after an IPO (10% a year), the loan
// payments floor, and that old saves load unchanged (the new state is created on first use).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playGame } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { type GameState } from '../../src/sim/state.ts'
import { buybackClimate, loanPaymentsUsd, publicRoomPct, refusalChance, roundStakes } from '../../src/sim/systems/buyback.ts'
import { BOTS } from '../../tools/bots.ts'

const q = (l: string) => quarterIndex(l)!
const ok = (s: GameState, a: Action): GameState => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? undefined : r.error.key
}

// a finished raise-climb game (F&F, seed and Series A taken), reopened as a Plan phase in `label` with cash and Bandwidth
const finished = playGame(3, BOTS['raise-climb'], { through: 1 }).state
function planAt(label: string, over: Partial<GameState> = {}): GameState {
  return { ...structuredClone(finished), act: 1, phase: 'plan', quarter: q(label), cash: 80_000_000, bandwidth: 5, buyback: undefined, ...over } as GameState
}
const offer = (round: string, share = 1): Action => ({ type: 'BUYBACK_OFFER', round, share })

/** Quarters of Act I by market climate, from the market itself. */
const climateQuarters = (c: 'boom' | 'downturn' | 'neutral') =>
  CONTENT.quarters.map((_, i) => i).filter((i) => i >= 4 && i <= q('2022Q3') && buybackClimate(planAt('2017Q1', { quarter: i })) === c)

describe('round stakes', () => {
  it('come from the raises: F&F 6.4%, seed 16%, Series A 20% of a company the founder holds 57.6% of', () => {
    const st = roundStakes(planAt('2021Q2'))
    expect(st.friends_family).toBeCloseTo(0.064, 9)
    expect(st.seed).toBeCloseTo(0.16, 9)
    expect(st.series_a).toBeCloseTo(0.2, 9)
    expect(Object.values(st).reduce((a, b) => a + b, 0) + finished.founderStake).toBeCloseTo(1, 9)
  })
})

describe('an offer', () => {
  it('costs the last valuation x 1.2 x the stake x the share, in cash, and 1 Bandwidth, refused or not', () => {
    // find a seed whose draw is an acceptance, and one that is a refusal (the same state otherwise)
    const results = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => applyAction(planAt('2021Q2', { seed }), offer('seed', 0.5)))
    const accepted = results.find((r) => r.ok && r.state.buyback?.last?.accepted)
    const refused = results.find((r) => r.ok && r.state.buyback?.last && !r.state.buyback.last.accepted)
    expect(accepted && refused).toBeTruthy()
    const price = finished.reports.at(-1)!.valuationUsd * 1.2 * 0.16 * 0.5
    if (accepted?.ok) {
      expect(planAt('2021Q2').cash - accepted.state.cash).toBeCloseTo(price, 1)
      expect(accepted.state.bandwidth).toBe(4)
    }
    if (refused?.ok) {
      expect(refused.state.cash).toBe(80_000_000) // a refusal costs no cash
      expect(refused.state.bandwidth).toBe(4) // but the Bandwidth
      expect(refused.state.founderStake).toBe(finished.founderStake)
    }
  })

  it('an acceptance moves the stake to the founder and the round\'s stake falls; the whole of it closes the round', () => {
    const acc = [...Array(40).keys()].map((i) => i + 1).map((seed) => applyAction(planAt('2021Q2', { seed }), offer('friends_family', 1))).find((r) => r.ok && r.state.buyback?.last?.accepted)!
    if (!acc.ok) throw new Error()
    expect(acc.state.founderStake).toBeCloseTo(finished.founderStake + 0.064, 9)
    expect(acc.state.buyback!.closed).toEqual(['friends_family'])
    expect(roundStakes(acc.state).friends_family).toBeUndefined()
    expect(roundStakes(acc.state).seed).toBeCloseTo(0.16, 9)
    expect(err({ ...acc.state, bandwidth: 5, buyback: { ...acc.state.buyback!, lastOffer: -1 } }, offer('friends_family'))).toBe('error.buyback_no_round')
    // a part of a round leaves the rest
    const part = [...Array(40).keys()].map((i) => i + 1).map((seed) => applyAction(planAt('2021Q2', { seed }), offer('series_a', 0.25))).find((r) => r.ok && r.state.buyback?.last?.accepted)!
    if (!part.ok) throw new Error()
    expect(roundStakes(part.state).series_a).toBeCloseTo(0.15, 9)
    expect(part.state.buyback!.closed).toEqual([])
    expect(part.state.founderStake).toBeCloseTo(finished.founderStake + 0.05, 9)
  })

  it('is one a quarter, and again the next', () => {
    const s = ok(planAt('2021Q2', { seed: 5 }), offer('seed', 0.1))
    expect(err(s, offer('series_a', 0.1))).toBe('error.buyback_once')
    expect(err({ ...s, quarter: s.quarter + 1 }, offer('series_a', 0.1))).toBeUndefined()
  })

  it('needs a round, a Plan phase, Act I, Bandwidth, cash and a valuation', () => {
    expect(err(planAt('2021Q2'), offer('ipo_spac'))).toBe('error.buyback_no_round')
    expect(err(planAt('2021Q2'), offer('savings'))).toBe('error.buyback_no_round')
    expect(err(planAt('2021Q2', { raisesDone: ['seed'] }), offer('series_a'))).toBe('error.buyback_no_round')
    expect(err(planAt('2021Q2', { phase: 'live' }), offer('seed'))).toBe('error.wrong_phase')
    expect(err(planAt('2021Q2', { act: 2 }), offer('seed'))).toBe('error.buyback_act1')
    expect(err(planAt('2021Q2', { bandwidth: 0 }), offer('seed'))).toBe('error.no_bandwidth')
    expect(err(planAt('2021Q2', { cash: 1000 }), offer('seed'))).toBe('error.no_cash')
    expect(err(planAt('2021Q2', { reports: [] }), offer('seed'))).toBe('error.buyback_no_value')
    expect(err(planAt('2021Q2'), offer('seed', 0))).toBe('error.bad_choice')
    expect(err(planAt('2021Q2'), offer('seed', 1.5))).toBe('error.bad_choice')
  })
})

describe('refusal odds over many draws', () => {
  const rate = (quarter: number) => {
    let refused = 0
    const n = 1500
    const base = planAt('2021Q2', { quarter })
    for (let seed = 1; seed <= n; seed++) {
      const r = applyAction({ ...base, seed }, offer('seed', 0.01))
      if (r.ok && !r.state.buyback!.last!.accepted) refused++
    }
    return refused / n
  }
  it('30% in a normal market, 50% in a boom (bitcoin up over 50% on a year ago), 10% in a downturn (down over 30%)', () => {
    const [boom, down, neutral] = [climateQuarters('boom'), climateQuarters('downturn'), climateQuarters('neutral')]
    expect(boom.length).toBeGreaterThan(0)
    expect(down.length).toBeGreaterThan(0)
    expect(neutral.length).toBeGreaterThan(0)
    expect(refusalChance(planAt('2021Q2', { quarter: boom[0] }))).toBeCloseTo(0.5, 9)
    expect(refusalChance(planAt('2021Q2', { quarter: down[0] }))).toBeCloseTo(0.1, 9)
    expect(refusalChance(planAt('2021Q2', { quarter: neutral[0] }))).toBeCloseTo(0.3, 9)
    expect(rate(boom[0])).toBeCloseTo(0.5, 1)
    expect(rate(down[0])).toBeCloseTo(0.1, 1)
    expect(rate(neutral[0])).toBeCloseTo(0.3, 1)
  }, 60_000)
  it('the draws are their own substream: the same seed and the same offer give the same answer', () => {
    const a = applyAction(planAt('2021Q2', { seed: 9 }), offer('seed', 0.2))
    const b = applyAction(planAt('2021Q2', { seed: 9 }), offer('seed', 0.2))
    expect(a).toEqual(b)
  })
})

describe('the loan payments floor', () => {
  it('a buy-back may not take cash below the next 2 quarters of payments', () => {
    const loan = { amountUsd: 1_000_000, balanceUsd: 1_000_000, apr: 0.12, weeklyPrincipalUsd: 10_000, weeksLeft: 100, takenQuarter: q('2021Q1') }
    const s = planAt('2021Q2', { equipmentLoan: loan })
    const owed = loanPaymentsUsd(s, 2)
    expect(owed).toBeGreaterThan(260_000) // 26 weeks of principal plus interest
    const price = finished.reports.at(-1)!.valuationUsd * 1.2 * 0.064
    expect(err({ ...s, cash: price + owed - 1 }, offer('friends_family'))).toBe('error.buyback_floor')
    expect(err({ ...s, cash: price + owed + 1 }, offer('friends_family'))).toBeUndefined()
    // no loan, no floor
    expect(err({ ...planAt('2021Q2'), cash: price + 1 }, offer('friends_family'))).toBeUndefined()
  })
})

describe('after an IPO', () => {
  // texas-ipo goes public in 2021; its game ends in Act I with the IPO round on the books
  const ipo = playGame(2, BOTS['texas-ipo'], { through: 1 }).state
  const pub = (label: string, over: Partial<GameState> = {}): GameState =>
    ({ ...structuredClone(ipo), act: 1, phase: 'plan', quarter: q(label), cash: 500_000_000, bandwidth: 5, buyback: undefined, ...over }) as GameState

  it('the bot went public, so there is an IPO round to buy from', () => {
    expect(ipo.raisesDone).toContain('ipo_spac')
    expect(roundStakes(pub('2022Q1')).ipo_spac).toBeGreaterThan(0.05)
  })

  it('private offers are closed; the open market sells up to 10% of the company a calendar year at the valuation', () => {
    const s = pub('2022Q1')
    expect(err(s, offer('seed'))).toBe('error.buyback_public')
    const v = ipo.reports.at(-1)!.valuationUsd
    const a = ok(s, { type: 'BUYBACK_MARKET', pct: 0.04 })
    expect(s.cash - a.cash).toBeCloseTo(v * 0.04, 1)
    expect(a.founderStake).toBeCloseTo(ipo.founderStake + 0.04, 9)
    expect(a.bandwidth).toBe(4) // 1 Bandwidth for the quarter
    // more in the same quarter: no further Bandwidth; the year's cap holds
    const b = ok(a, { type: 'BUYBACK_MARKET', pct: 0.05 })
    expect(b.bandwidth).toBe(4)
    expect(err(b, { type: 'BUYBACK_MARKET', pct: 0.02 })).toBe('error.buyback_cap')
    expect(publicRoomPct(b)).toBeCloseTo(0.01, 9)
  })

  it('a new calendar year opens the cap again, and costs a Bandwidth again', () => {
    const full = ok(pub('2021Q4'), { type: 'BUYBACK_MARKET', pct: 0.1 })
    expect(err(full, { type: 'BUYBACK_MARKET', pct: 0.01 })).toBe('error.buyback_cap')
    const next = ok({ ...full, quarter: q('2022Q1'), bandwidth: 5 }, { type: 'BUYBACK_MARKET', pct: 0.02 })
    expect(next.bandwidth).toBe(4)
    expect(next.founderStake).toBeCloseTo(full.founderStake + 0.02, 9)
  })

  it('needs an IPO first', () => {
    expect(err(planAt('2021Q2'), { type: 'BUYBACK_MARKET', pct: 0.01 })).toBe('error.buyback_not_public')
  })
})

describe('old saves', () => {
  it.each(['v1-plan-2021Q2', 'v1-live-2020Q4', 'v1-merge-2022Q3', 'v1-ended-2022Q3'])('%s loads with no buy-back state and no deposit, and can make an offer', (name) => {
    const r = restoreSave(JSON.parse(readFileSync(new URL(`../fixtures/saves/${name}.json`, import.meta.url), 'utf8')))
    if (!r.ok) throw new Error(r.error.key)
    expect(r.state.buyback).toBeUndefined()
    expect(r.state.sites.some((x) => x.deposit)).toBe(false)
    if (name === 'v1-plan-2021Q2') {
      const s = { ...r.state, cash: 5_000_000, bandwidth: 3 }
      const st = roundStakes(s)
      expect(Object.values(st).reduce((a, b) => a + b, 0) + s.founderStake).toBeCloseTo(1, 9)
      const first = Object.keys(st)[0]
      expect(first).toBeTruthy()
      expect(err(s, offer(first, 0.1))).toBeUndefined()
    }
  })
})
