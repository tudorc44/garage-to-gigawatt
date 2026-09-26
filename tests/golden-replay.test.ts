// Golden replay: a fixed seed + a fixed strategy must always produce exactly the same
// game. End states are stored in tests/golden/. If a deliberate change to rules or
// balance changes an outcome, check the difference, then update the files with:
//   npx vitest run -u
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../src/content/index.ts'
import type { Action } from '../src/sim/actions.ts'
import { playGame, replay, type Strategy } from '../src/sim/replay.ts'
import { BOTS } from '../tools/bots.ts'
import type { GameState } from '../src/sim/state.ts'
import {
  purchaseCostUsd,
  repairCostPerUnit,
} from '../src/sim/systems/machines.ts'
import {
  buyPrice,
  marketWeek,
  revenuePerUnitDay,
} from '../src/sim/systems/market.ts'
import {
  baseCapexUsd,
  capacityKw,
  getTier,
  isReady,
  powerPriceUsdKwh,
  usedKw,
} from '../src/sim/systems/sites.ts'

const SEED = 2017

interface GrowerSettings {
  /** Cash never spent on machines, repairs or sites. */
  reserveUsd: number
  hodlPct: number
}

/**
 * A simple fixed bot: repairs broken machines, builds a small unit once it can
 * afford it, and fills free space with the most profitable machine per dollar.
 * Sells treasury on price drops, holds on rises.
 */
function grower({ reserveUsd, hodlPct }: GrowerSettings): Strategy {
  return {
    plan(s: GameState): Action[] {
      const actions: Action[] = []
      let cash = s.cash
      if (s.quarter === 0) actions.push({ type: 'SET_HODL', pct: hodlPct })

      for (const lot of s.machines) {
        const cost = lot.failed * repairCostPerUnit(lot.model)
        if (lot.failed > 0 && cash - cost >= reserveUsd) {
          actions.push({ type: 'REPAIR_MACHINES', lotId: lot.id })
          cash -= cost
        }
      }

      const smallUnit = baseCapexUsd(getTier('small_unit')!)
      if (
        !s.sites.some((x) => x.tier === 'small_unit') &&
        cash - smallUnit >= reserveUsd
      ) {
        actions.push({ type: 'BUILD_SITE', tier: 'small_unit' })
        cash -= smallUnit
      }

      const w = marketWeek(s.quarter, 0)
      for (const site of s.sites.filter((x) => isReady(x, s.quarter))) {
        const power = powerPriceUsdKwh(site, s.quarter)
        const best = CONTENT.machines
          .map((m) => {
            const price = buyPrice(m, s.quarter, 'new')
            const profit = revenuePerUnitDay(m, w) - m.power_kw * 24 * power
            return { m, price, score: price ? profit / price : -1 }
          })
          .filter((x) => x.price !== undefined && x.score > 0)
          .sort((a, b) => b.score - a.score)[0]
        if (!best) continue
        const count = Math.min(
          Math.floor((capacityKw(site) - usedKw(s, site.id)) / best.m.power_kw),
          Math.floor((cash - reserveUsd) / best.price!),
        )
        if (count < 1) continue
        actions.push({
          type: 'BUY_MACHINES',
          model: best.m.id,
          condition: 'new',
          count,
          siteId: site.id,
        })
        cash -= purchaseCostUsd(best.m.id, 'new', count, s.quarter)!
      }
      return actions
    },
    // On a drop, sell 25% of the coin that fell (if held); otherwise hold.
    answer: (s) => {
      if (s.interrupt!.id !== 'price_alert') return undefined // margin call: default
      const coin = s.interrupt!.coin
      return s.interrupt!.changePct < 0 && s.treasury[coin] > 0
        ? `sell_${coin.toLowerCase()}`
        : 'hold'
    },
  }
}

/** A fixed script of Plan-phase actions per quarter; nothing else. */
function scripted(plan: Record<string, Action[]>): Strategy {
  return { plan: (s) => plan[CONTENT.quarters[s.quarter]] ?? [] }
}

const bots = {
  'steady-grower': grower({ reserveUsd: 5_000, hodlPct: 0.3 }),
  // Fills the garage, then over-expands into a small unit in the 2018 winter and goes bust.
  'early-expander': scripted({
    '2017Q1': [
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'new',
        count: 5,
        siteId: 'site-1',
      },
    ],
    '2018Q2': [
      { type: 'BUILD_SITE', tier: 'small_unit' },
      { type: 'SCOUT_SITES', tier: 'warehouse' },
    ],
  }),
  // Raises friends & family on day one, builds the small unit, and fills it with rigs.
  'ff-expander': scripted({
    '2017Q1': [
      { type: 'RAISE', round: 'friends_family' },
      { type: 'BUILD_SITE', tier: 'small_unit' },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'new',
        count: 4,
        siteId: 'site-1',
      },
    ],
    '2017Q3': [
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 3,
        siteId: 'site-2',
      },
    ],
  }),
  // The same game, but it breaks the small unit's lease in the 2018 winter (sells its rigs).
  'ff-leaver': scripted({
    '2017Q1': [
      { type: 'RAISE', round: 'friends_family' },
      { type: 'BUILD_SITE', tier: 'small_unit' },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'new',
        count: 4,
        siteId: 'site-1',
      },
    ],
    '2017Q3': [
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 3,
        siteId: 'site-2',
      },
    ],
    '2018Q2': [{ type: 'LEAVE_SITE', siteId: 'site-2' }],
  }),
  // Fills the garage, borrows against the rigs in 2017Q2, pays the loan off early in 2018Q1.
  'loan-taker': scripted({
    '2017Q1': [
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 5,
        siteId: 'site-1',
      },
    ],
    '2017Q2': [{ type: 'TAKE_LOAN', amountUsd: 3_000 }],
    '2018Q1': [{ type: 'REPAY_LOAN' }],
  }),
  // Keeps every ETH it mines, borrows against it in 2018Q1, and meets the crash's margin calls.
  'margin-caller': scripted({
    '2017Q1': [
      { type: 'SET_HODL', pct: 1 },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 5,
        siteId: 'site-1',
      },
    ],
    '2018Q1': [{ type: 'TAKE_CRYPTO_LOAN', coin: 'ETH', amountUsd: 50_000 }],
  }),
  // F&F and a small unit, then the seed round in 2017Q4 to fill the small unit with rigs.
  'seed-raiser': scripted({
    '2017Q1': [
      { type: 'RAISE', round: 'friends_family' },
      { type: 'BUILD_SITE', tier: 'small_unit' },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'new',
        count: 4,
        siteId: 'site-1',
      },
    ],
    '2017Q4': [
      { type: 'RAISE', round: 'seed' },
      {
        type: 'BUY_MACHINES',
        model: 'gpu_gen1',
        condition: 'used',
        count: 100,
        siteId: 'site-2',
      },
    ],
  }),
  // Seed round, then a warehouse from scouting; loses the 2019Q1 auction and wins 2020Q2's.
  'auction-bidder': {
    plan(s: GameState): Action[] {
      const q = CONTENT.quarters[s.quarter]
      const warehouse = s.sites.find((x) => x.tier === 'warehouse')
      const script: Record<string, Action[]> = {
        '2017Q1': [
          { type: 'RAISE', round: 'friends_family' },
          { type: 'BUILD_SITE', tier: 'small_unit' },
          {
            type: 'BUY_MACHINES',
            model: 'gpu_gen1',
            condition: 'new',
            count: 4,
            siteId: 'site-1',
          },
        ],
        '2017Q4': [
          { type: 'RAISE', round: 'seed' },
          {
            type: 'BUY_MACHINES',
            model: 'gpu_gen1',
            condition: 'used',
            count: 100,
            siteId: 'site-2',
          },
        ],
        '2018Q1': [{ type: 'SCOUT_SITES', tier: 'warehouse' }],
        '2018Q2': s.siteOffers[0]
          ? [{ type: 'BUILD_SITE', offerId: s.siteOffers[0].id }]
          : [],
      }
      if (warehouse && s.auction && (q === '2019Q1' || q === '2020Q2')) {
        const bidUsd = q === '2019Q1' ? 25_000 : 15_000
        return [{ type: 'BID_AUCTION', bidUsd, siteId: warehouse.id }]
      }
      return script[q] ?? []
    },
  },
  // The sim-runner's raise-climb bot: every funding round, climbs to big sites, never talks to
  // the neighbours. Covers Heat growing with load and neighbour complaints (ignored) over a
  // whole game. If the bot is retuned on purpose, update this file with the others.
  'heat-climber': BOTS['raise-climb'],
  // The sim-runner's raise-negotiate bot: negotiates every power contract renewal.
  negotiator: BOTS['raise-negotiate'],
  /** Pitches the seed and Series A (1.10×, 1.05×, accept): pitch moves replay exactly. */
  pitcher: BOTS['raise-pitch'],
}

describe.each(Object.entries(bots))('golden replay: %s bot', (name, bot) => {
  const run = playGame(SEED, bot)

  it('plays until the Merge or game over without errors', () => {
    expect(['ended', 'gameover']).toContain(run.state.phase)
  })

  it('same seed + same strategy → identical game', () => {
    expect(playGame(SEED, bot).state).toEqual(run.state)
  })

  it('replaying the recorded action log → identical end state', () => {
    expect(replay(SEED, run.log)).toEqual(run.state)
  })

  it('a different seed gives a different game', () => {
    expect(playGame(SEED + 1, bot).state).not.toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify(run.state, null, 2) + '\n').toMatchFileSnapshot(
      `./golden/${name}-seed-${SEED}.json`,
    )
  })
})

describe('balance anchors (scope §5)', () => {
  it('the steady grower survives to the Merge', () => {
    expect(playGame(SEED, bots['steady-grower']).state.phase).toBe('ended')
  })

  it('the F&F expander goes bust, but survives if it breaks the lease in 2018', () => {
    expect(playGame(SEED, bots['ff-expander']).state.phase).toBe('gameover')
    expect(playGame(SEED, bots['ff-leaver']).state.phase).toBe('ended')
  })

  it('over-expanding into a small unit in the 2018 winter goes bust in 2018', () => {
    const { state } = playGame(SEED, bots['early-expander'])
    expect(state.phase).toBe('gameover')
    expect(state.reports.at(-1)!.quarter.startsWith('2018')).toBe(true)
  })

  // Can't be tested yet: with only savings to spend, the 5 kW garage caps growth, so an
  // all-in bot never over-extends. Needs loans/investors (week 4) and the sim-runner.
  it('the auction bidder loses its 2019Q1 bid and wins the 2020Q2 lot', () => {
    const { state } = playGame(SEED, bots['auction-bidder'])
    const keys = state.log.map((e) => e.key)
    expect(keys).toContain('log.auction_lost')
    expect(keys).toContain('log.auction_won')
    expect(state.machines.some((l) => l.model === 's9' && l.count >= 330)).toBe(
      true,
    )
  })

  it.todo('reinvesting 100% every quarter goes bust between 2018Q2 and 2019Q2')
})
