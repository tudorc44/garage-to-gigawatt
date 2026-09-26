import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { interruptChoices, machineMarket } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { raiseBandwidth, getStep } from '../../src/sim/systems/capital.ts'
import { signContract } from '../../src/sim/systems/contracts.ts'
import { marginLevels } from '../../src/sim/systems/cryptoLoan.ts'
import { modifierMult } from '../../src/sim/systems/eventEffects.ts'
import { scheduleEvents } from '../../src/sim/systems/events.ts'
import { underMoratorium } from '../../src/sim/systems/heat.ts'
import { startNextQuarter } from '../../src/sim/systems/quarter.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

/** A live quarter with a card on screen (after week `week` index), as if it had just fired. */
function onCard(
  event: string,
  label: string,
  extra: Partial<GameState> = {},
  siteId?: string,
): GameState {
  return {
    ...newGame(1),
    phase: 'live',
    quarter: q(label),
    week: 6,
    cash: 500_000,
    ...extra,
    interrupt: {
      id: 'event',
      event,
      week: 5,
      coin: 'BTC',
      changePct: 0,
      siteId,
    },
  }
}
const choose = (s: GameState, choice: string) =>
  ok(s, { type: 'RESOLVE_INTERRUPT', choice })
const rigs = (count: number, siteId = 'site-1', model = 'gpu_gen1') => ({
  id: `lot-${count}`,
  model,
  siteId,
  condition: 'used' as const,
  count,
  failed: 0,
  earnsFromQuarter: 0,
})

describe('event cards (events.json)', () => {
  it('has 9 scripted + 10 random cards; Uri is the existing alert with the card text', () => {
    const cards = CONTENT.events.cards
    expect(cards.filter((c) => c.type === 'scripted')).toHaveLength(9)
    expect(cards.filter((c) => c.type === 'random')).toHaveLength(10)
    expect(CONTENT.events.byId.uri_2021).toBeUndefined()
    expect(CONTENT.events.byId.winter_bottom_2018.default).toBe('keep_running')
    expect(CONTENT.events.byId.farm_fire.default).toBe('patch')
  })

  it('a scripted card comes in its week and does not count toward the 3 interrupts', () => {
    let s = ok({ ...newGame(1), quarter: q('2017Q2') }, { type: 'END_PLAN' })
    const card = CONTENT.events.byId.gpu_shortage_2017
    while (!s.interrupt || s.interrupt.id !== 'event') {
      if (s.interrupt) s = choose(s, interruptChoices(s)[0].id)
      else s = advance(s)
    }
    expect(s.interrupt.event).toBe('gpu_shortage_2017')
    expect(s.interrupt.week).toBe(card.weekIndex)
    expect(s.interruptsThisQuarter).toBe(0)
  })

  it('a card whose `requires` fails is skipped (the halving needs S9s)', () => {
    const s = { ...newGame(1), quarter: q('2020Q2') }
    scheduleEvents(s)
    expect(s.events.queue.map((e) => e.id)).not.toContain('halving_2020')
    const withS9 = {
      ...newGame(1),
      quarter: q('2020Q2'),
      machines: [rigs(5, 'site-1', 's9')],
    }
    scheduleEvents(withS9)
    expect(withS9.events.queue.map((e) => e.id)).toContain('halving_2020')
  })

  it('random cards: at most one a quarter, from 2017Q3, each at most once per game', () => {
    let fired = 0
    for (let seed = 1; seed <= 200; seed++) {
      const s = { ...newGame(seed), quarter: q('2019Q3'), machines: [rigs(40)] }
      scheduleEvents(s)
      const random = s.events.queue.filter((e) => e.random)
      expect(random.length).toBeLessThanOrEqual(1)
      fired += random.length
      const early = {
        ...newGame(seed),
        quarter: q('2017Q2'),
        machines: [rigs(40)],
      }
      scheduleEvents(early)
      expect(early.events.queue.some((e) => e.random)).toBe(false)
    }
    expect(fired / 200).toBeGreaterThan(0.25)
    expect(fired / 200).toBeLessThan(0.45)
    const seen = { ...newGame(3), quarter: q('2019Q3'), machines: [rigs(40)] }
    seen.events.fired = CONTENT.events.cards.map((c) => c.id)
    scheduleEvents(seen)
    expect(seen.events.queue.some((e) => e.random)).toBe(false)
  })

  it('a random card is dropped when the 3 interrupts are used up (and never fires twice)', () => {
    const s: GameState = {
      ...newGame(1),
      phase: 'live',
      quarter: q('2019Q3'),
      week: 4,
      interruptsThisQuarter: 3,
    }
    s.events.queue = [{ id: 'friend_wants_money', week: 5, random: true }]
    const after = advance(s)
    expect(after.interrupt).toBeNull()
    expect(after.events.fired).toEqual([])
  })

  it('gpu_shortage "wait": no new GPU rigs next quarter; used ones are fine', () => {
    const s = choose(onCard('gpu_shortage_2017', '2017Q2'), 'wait')
    const next: GameState = {
      ...s,
      phase: 'plan',
      quarter: s.quarter + 1,
      interrupt: null,
    }
    const buy = (condition: 'new' | 'used'): Action => ({
      type: 'BUY_MACHINES',
      model: 'gpu_gen1',
      condition,
      count: 1,
      siteId: 'site-1',
    })
    const r = applyAction(next, buy('new'))
    expect(!r.ok && r.error.key).toBe('error.gpus_sold_out')
    expect(applyAction(next, buy('used')).ok).toBe(true)
    const markup = choose(onCard('gpu_shortage_2017', '2017Q2'), 'markup')
    expect(markup.machines.reduce((n, l) => n + l.count, 0)).toBe(1)
  })

  it('btc_peak "buy more": next Plan phase machines cost 10% more and it opens on Buy', () => {
    const s = choose(onCard('btc_peak_2017', '2017Q4'), 'buy_more')
    const plain = { ...newGame(1), quarter: q('2018Q1') }
    const next: GameState = {
      ...s,
      phase: 'plan',
      quarter: q('2018Q1'),
      interrupt: null,
    }
    const price = (st: GameState) =>
      machineMarket(st).find((m) => m.id === 's9')!.newPriceUsd!
    expect(price(next)).toBeCloseTo(price(plain) * 1.1)
    expect(next.events.plan?.openBuy).toBe(true)
  })

  it('winter_bottom "mothball": machines off and rent ×0.3 until the end of next quarter', () => {
    const s = choose(onCard('winter_bottom_2018', '2018Q4'), 'mothball')
    const inQ1 = { ...s, quarter: q('2019Q1'), week: 12 }
    const inQ2 = { ...s, quarter: q('2019Q2'), week: 0 }
    expect(modifierMult(inQ1, 'hashrate', 'site-1')).toBe(0)
    expect(modifierMult(inQ1, 'rent', 'site-1')).toBeCloseTo(0.3)
    expect(modifierMult(inQ2, 'hashrate', 'site-1')).toBe(1)
  })

  it('farm_fire "rebuild": the larger of $20K or 5% of the fleet; that site at 85% for 13 weeks', () => {
    const s = choose(
      onCard('farm_fire', '2019Q3', { machines: [rigs(40)] }, 'site-1'),
      'rebuild',
    )
    expect(s.cash).toBe(500_000 - 20_000)
    expect(modifierMult({ ...s, week: 12 }, 'hashrate', 'site-1')).toBeCloseTo(
      0.85,
    )
  })

  it('rig_theft takes a quarter of the units at that site (1 to 4), without payment', () => {
    const s = choose(
      onCard('rig_theft', '2018Q1', { machines: [rigs(8)] }, 'site-1'),
      'loss',
    )
    expect(s.machines[0].count).toBe(6)
    expect(s.cash).toBe(500_000)
    const big = choose(
      onCard('rig_theft', '2018Q1', { machines: [rigs(40)] }, 'site-1'),
      'loss',
    )
    expect(big.machines[0].count).toBe(36)
  })

  it('tax_surprise: 20% of the last 4 quarters of EBITDA, or 6% now + 6% × 3 quarters', () => {
    const reports = [10_000, 20_000, -5_000, 15_000].map(
      (e) => ({ ebitdaUsd: e }) as GameState['reports'][number],
    )
    const paid = choose(onCard('tax_surprise', '2019Q2', { reports }), 'pay')
    expect(paid.cash).toBe(500_000 - 8_000)
    let plan = choose(onCard('tax_surprise', '2019Q2', { reports }), 'plan')
    expect(plan.cash).toBe(500_000 - 2_400)
    plan = { ...plan, phase: 'report' }
    for (let i = 0; i < 4; i++) startNextQuarter(plan)
    expect(plan.cash).toBe(500_000 - 2_400 * 4)
    expect(plan.events.taxPlan).toBeNull()
  })

  it('utility_rate_hike: power ×1.3 (or ×1.1 and −2 Bandwidth) until the next renewal', () => {
    const site = {
      id: 'site-2',
      tier: 'warehouse',
      readyQuarter: q('2018Q2'),
      rentUsdQ: 0,
      powerPriceMult: 1,
      flaw: 'rate_class',
    }
    const base = { sites: [...newGame(1).sites, site] }
    const accepted = choose(
      onCard('utility_rate_hike', '2019Q2', base, 'site-2'),
      'accept',
    )
    const s2 = accepted.sites[1]
    expect(powerPriceUsdKwh(s2, accepted.quarter)).toBeCloseTo(0.055 * 1.3)
    signContract(accepted, s2, 'fixed', 0.05, 4)
    expect(s2.rateMult).toBeUndefined()
    const fought = choose(
      onCard('utility_rate_hike', '2019Q2', base, 'site-2'),
      'fight',
    )
    expect(fought.sites[1].rateMult).toBe(1.1)
    const next = { ...fought, phase: 'report' as const }
    startNextQuarter(next)
    expect(next.bandwidth).toBe(bandwidthForQuarter(next) - 2)
  })

  it('moratorium "lawyer up": 40% chance the moratorium lifts for 4 quarters', () => {
    let won = 0
    for (let seed = 1; seed <= 100; seed++) {
      const s = choose(
        { ...onCard('moratorium', '2021Q3', {}, 'site-1'), seed },
        'lawyer',
      )
      if (s.events.moratoriumWaiver['site-1'] !== undefined) {
        won++
        s.siteHeat['site-1'].value = 80
        expect(underMoratorium(s, 'site-1')).toBe(false)
        expect(
          underMoratorium({ ...s, quarter: s.quarter + 4 }, 'site-1'),
        ).toBe(true)
      }
    }
    expect(won).toBeGreaterThan(25)
    expect(won).toBeLessThan(55)
  })

  it('luna "ride it out": margin calls at 60% and liquidation at 70% for the rest of the quarter', () => {
    const s = choose(onCard('luna_celsius_2022', '2022Q2'), 'ride')
    expect(marginLevels(s)).toEqual({ marginCallLtv: 0.6, liquidationLtv: 0.7 })
    expect(marginLevels({ ...s, quarter: s.quarter + 1 }).marginCallLtv).toBe(
      0.7,
    )
    // "Repay from the treasury" only shows with a crypto loan.
    expect(
      interruptChoices(onCard('luna_celsius_2022', '2022Q2')).map((c) => c.id),
    ).not.toContain('repay')
  })

  it('spac_mania "roadshow": the IPO costs 2 Bandwidth for the rest of 2021', () => {
    const s = choose(onCard('spac_mania_2021', '2021Q1'), 'roadshow')
    const ipo = getStep('ipo_spac')!
    expect(raiseBandwidth(ipo, s)).toBe(2)
    expect(raiseBandwidth(ipo, { ...s, quarter: q('2022Q1') })).toBe(3)
  })

  it('friend_wants_money "buy back": $15K for +2 points of stake', () => {
    const s = choose(
      onCard('friend_wants_money', '2018Q2', { founderStake: 0.9 }),
      'buy_back',
    )
    expect(s.cash).toBe(485_000)
    expect(s.founderStake).toBeCloseTo(0.92)
  })
})
