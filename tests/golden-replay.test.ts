// Golden replay: a fixed seed + a fixed strategy must always produce exactly the same
// game. End states are stored in tests/golden/. If a deliberate change to rules or
// balance changes an outcome, check the difference, then update the files with:
//   npx vitest run -u
import { describe, expect, it, vi } from 'vitest'
// (M32.7: the Act IV goldens play a whole Act III first: no clock decides pass or fail, as the Act IV test files)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../src/content/index.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import {
  applyStep,
  playFrom,
  playGame,
  playPrologue,
  replay,
  replayPrologue,
  type Step,
  type Strategy,
} from '../src/sim/replay.ts'
import { act3ScenarioCompany } from './sim/act3Helpers.ts'
import { act4Company } from './sim/act4Helpers.ts'
import { BOTS } from '../tools/bots.ts'
import { PROLOGUE_BOTS } from '../tools/prologueBots.ts'
import type { GameState } from '../src/sim/state.ts'
import { PRESETS_V } from '../src/content/presetsAct5.ts'
import { toAct5 } from '../src/sim/state.ts'
import { act5Bot } from '../tools/act5/bots.ts'
import { playAct5Recipe } from '../tools/act5/presetRun.ts'
import { ledgerQuarters, unreconciled } from '../src/sim/ledger.ts'
import { buyPriceNow } from '../src/sim/systems/eventEffects.ts'
import { repairCostPerUnit } from '../src/sim/systems/machines.ts'
import { marketWeek, revenuePerUnitDay } from '../src/sim/systems/market.ts'
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
            const price = buyPriceNow(s, m, 'new')
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
        cash -= buyPriceNow(s, best.m, 'new')! * count
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

/**
 * Like a player, a hand-written bot skips any planned action the game refuses (an event card
 * may have changed its cash or prices since the script was written).
 */
function skipRefused(bot: Strategy): Strategy {
  return {
    ...bot,
    plan(s: GameState): Action[] {
      const kept: Action[] = []
      let sim = s
      for (const a of bot.plan(s)) {
        const r = applyAction(sim, a)
        if (!r.ok) continue
        sim = r.state
        kept.push(a)
      }
      return kept
    },
  }
}

const handWritten = {
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
}

const bots: Record<string, Strategy> = {
  ...Object.fromEntries(
    Object.entries(handWritten).map(([k, b]) => [
      k,
      skipRefused(b as Strategy),
    ]),
  ),
  // The sim-runner's raise-climb bot: every funding round, climbs to big sites, never talks to
  // the neighbours. Covers Heat growing with load and neighbour complaints (ignored) over a
  // whole game. If the bot is retuned on purpose, update this file with the others.
  'heat-climber': BOTS['raise-climb'],
  // The sim-runner's raise-negotiate bot: negotiates every power contract renewal.
  negotiator: BOTS['raise-negotiate'],
  /** Pitches the seed and Series A (1.10×, 1.05×, accept): pitch moves replay exactly. */
  pitcher: BOTS['raise-pitch'],
  /** M77.3 (doc 58 §1.2): raise-climb that queues 4 Gen 2 rigs a quarter in 2021Q1-Q3, so the retail queue's draws replay exactly. */
  'gen2-queuer': BOTS['gen2-queuer'],
  /** M78.0b (doc 58 §10.1): the same buying at the street price: with gen2-queuer, the Act I price-table guards. */
  'gen2-street': BOTS['gen2-street'],
  /** M79.4 (doc 62 §3): texas-ipo's path without Series A and with Texas phase 1 self-funded (it never has the cash on this seed: the golden pins what the bot does without the round). */
  'texas-selffund': BOTS['texas-selffund'],
  /** M79.4 (doc 62 §3): raise-climb that buys back the Seed stake from 2021: the offer, the refusal draw and the stake moving replay exactly. */
  'buyback-founder': BOTS['buyback-founder'],
}

describe.each(Object.entries(bots))('golden replay: %s bot', (name, bot) => {
  const run = playGame(SEED, bot)

  it('plays through the Merge to the Act I chapter report, or game over, without errors', () => {
    expect(['chapter', 'gameover']).toContain(run.state.phase)
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
    // The save-format number isn't game state: format 3 (the prologue's act 0, Alpha 0.3) changed
    // nothing in an Act I game, so the stored goldens (format 2) are compared as they are.
    await expect(
      JSON.stringify({ ...run.state, version: 2 }, null, 2) + '\n',
    ).toMatchFileSnapshot(`./golden/${name}-seed-${SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * M78.5 (doc 58 v1.1 §2): the two Larkspur backers on a seed where the 20% stake is affordable and Larkspur ships (seed 22: 20 reserved
 * units bought in the first volume quarter): the draws, calls, reservation, machines and memory walls replay exactly.
 */
const LARK_SEED = 22
describe.each(['larkspur-backer', 'larkspur-backer-5gb'] as const)('golden replay: %s', (name) => {
  const run = playGame(LARK_SEED, BOTS[name])

  it('backs Larkspur, buys its reserved block and plays to the Act I chapter report', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.larkspur?.reservation?.bought).toBeGreaterThan(0)
    expect(run.state.larkspur?.memory).toBe(name === 'larkspur-backer' ? 'lk6' : 'lk5')
    expect(run.state.machines.some((l) => l.model === run.state.larkspur!.memory)).toBe(true)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playGame(LARK_SEED, BOTS[name]).state).toEqual(run.state)
    expect(replay(LARK_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify({ ...run.state, version: 2 }, null, 2) + '\n').toMatchFileSnapshot(`./golden/${name}-seed-${LARK_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/** M78.5 (doc 58 v1.1 §3): Gen 2 rigs on the best alternative coin, and rented out, played through Act II to 2026Q4. */
const PM_SEED = 3
describe.each(['post-merge-miner', 'post-merge-renter'] as const)('golden replay: %s (Act I and Act II)', (name) => {
  const run = playGame(PM_SEED, BOTS[name], { through: 2 })

  it('plays to the end of Act II without errors', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.act).toBe(2)
    // (the Gen 2 lots were pointed away from Ethereum; rented, they earned dollars directly, as other mining income. On an alternative coin
    // at Act II power prices a lot loses money and switches itself off, so the miner's books stay empty: doc 58 Y-B4)
    expect(run.state.machines.some((l) => l.use === (name === 'post-merge-miner' ? 'rvn' : 'rent'))).toBe(true)
    if (name === 'post-merge-renter') expect(ledgerQuarters(run.state).some((l) => (l.lines.mining_other ?? 0) > 0)).toBe(true)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playGame(PM_SEED, BOTS[name], { through: 2 }).state).toEqual(run.state)
    expect(replay(PM_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify({ ...run.state, version: 2 }, null, 2) + '\n').toMatchFileSnapshot(`./golden/${name}-seed-${PM_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/** Prologue starts (Alpha 0.3): the Act 0 golden and the Act 0 → I golden. */
const PROLOGUE_SEED = 2009
describe.each([
  ['prologue-careful-hodler', 0],
  ['prologue-to-act1', 1],
] as const)('golden replay: %s', (name, through) => {
  const bot = PROLOGUE_BOTS['careful-hodler']
  const run = playPrologue(PROLOGUE_SEED, bot, { through })

  it('plays to its chapter report (or game over) without errors', () => {
    expect(['chapter', 'gameover']).toContain(run.state.phase)
    expect(run.state.act).toBe(through)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through }).state).toEqual(
      run.state,
    )
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // The save-format number isn't game state: M10's Act III stub format (4) changes nothing in a
    // prologue or Act I game, so the stored goldens (format 3) are compared as they are.
    await expect(
      JSON.stringify({ ...run.state, version: 3 }, null, 2) + '\n',
    ).toMatchFileSnapshot(`./golden/${name}-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * The Prologue's altcoins (M68.6, doc 51 v1.0): one golden, one seed, the scrypt-switcher bot (every GPU on Litecoin from
 * 2013Q2, then the best scrypt coin each quarter, sold at the 2014Q3 card; the coins sold over 2016Q4). The earlier
 * Prologue goldens above stay as they were: a game that never touches an altcoin is unchanged.
 */
describe('golden replay: prologue-alts', () => {
  const bot = PROLOGUE_BOTS['scrypt-switcher']
  const run = playPrologue(PROLOGUE_SEED, bot, { through: 0 })

  it('plays to its chapter report with altcoins mined and sold', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.prologue!.alts!.mined.LTC).toBeGreaterThan(0)
    // (M71.2: on the real prices the switcher, which decides in its Plan phases, finds Litecoin the better coin each time, so this seed mines no Dogecoin; reported in dev-notes)
    expect(run.state.prologue!.alts!.mined.DOGE).toBeGreaterThanOrEqual(0)
    expect(run.state.prologue!.alts!.handover).toBeDefined()
    expect(run.state.prologue!.alts!.held).toEqual({ LTC: 0, DOGE: 0 })
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through: 0 }).state).toEqual(run.state)
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // (format 8, the Prologue's own pool, M69.3, changes nothing in a game without a pool: compared at format 7, as above)
    await expect(JSON.stringify({ ...run.state, version: 7 }, null, 2) + '\n').toMatchFileSnapshot(`./golden/prologue-alts-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * The Prologue's own pool (M69.6, doc 51 v1.1): one golden, one seed, the pool-operator bot (opens in 2011Q2 at 1% PPLNS, cold
 * storage, sold at the handover). The earlier Prologue goldens stay as they were: a game that never opens a pool is unchanged.
 */
describe('golden replay: prologue-pool', () => {
  const bot = PROLOGUE_BOTS['pool-operator']
  const run = playPrologue(PROLOGUE_SEED, bot, { through: 0 })

  it('plays to its chapter report with a pool opened, run and sold at the handover', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.prologue!.ownPool).toBeUndefined()
    expect(run.state.prologue!.poolEnded).toMatchObject({ kind: 'handover' })
    expect(run.state.prologue!.reports.filter((r) => r.pool).length).toBeGreaterThan(20)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through: 0 }).state).toEqual(run.state)
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // (format 9, the Prologue's mining club, M70.4, changes nothing in a game without the club: compared at format 8, as above)
    await expect(JSON.stringify({ ...run.state, version: 8 }, null, 2) + '\n').toMatchFileSnapshot(`./golden/prologue-pool-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * Act III (M11.3): one golden per scenario. Each plays a fixed seed through all 16 quarters
 * (2027Q1–2030Q4) with a "do nothing" plan, from an Act II company with a working S21 fleet (so the
 * scenario's own market decides the numbers), and snapshots the end state. It replaces M10's
 * two-quarter `act3-stub-golden`. Unreachable from play (see tests/sim/act3Helpers.ts).
 */
const ACT3_SEED = 1
describe.each(['s0', 's1', 's2', 's3'] as const)(
  'golden replay: act3-%s (2027Q1 → the chapter phase)',
  (scenario) => {
    const doNothingInPlan: Strategy = { plan: () => [] }
    const start = () => act3ScenarioCompany(scenario, ACT3_SEED)
    const run = playFrom(start(), doNothingInPlan, { through: 3 })

    it('plays all 16 quarters to the chapter phase without errors', () => {
      expect(run.state.phase).toBe('chapter')
      expect(run.state.act).toBe(3)
      expect(run.state.scenarioId).toBe(scenario)
      expect(run.state.reports).toHaveLength(16)
      expect(run.state.reports[0].quarter).toBe('2027Q1')
      expect(run.state.reports.at(-1)!.quarter).toBe('2030Q4')
      expect(run.state.act3End?.scenarioId).toBe(scenario)
    })

    it('same seed + the same (empty) strategy → identical game; replaying the log → identical end state', () => {
      expect(playFrom(start(), doNothingInPlan, { through: 3 }).state).toEqual(
        run.state,
      )
      expect(run.log.reduce(applyStep, start())).toEqual(run.state)
    })

    it('matches the stored golden end state', async () => {
      // The save-format number isn't game state: format 5 (Act IV, M27.2) changes nothing in an Act III game, so the
      // stored goldens (format 4) are compared as they are.
      await expect(
        JSON.stringify({ ...run.state, version: 4 }, null, 2) + '\n',
      ).toMatchFileSnapshot(
        `./golden/act3-${scenario}-seed-${ACT3_SEED}.json`,
      )
    })

    it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
      expect(unreconciled(run.state)).toEqual([])
    })
  },
)

/**
 * Act IV (M32.7): one golden per future. The Act III company of `act4Company` (s0, seed 1) enters Act IV on each future
 * and plays all 20 quarters with a fixed busy strategy that exercises the act's systems: an equity raise when cash is
 * short, a 10 MW orbital shell in high LEO a quarter (licence, the first offer or spot, project debt or cash, the earliest launch
 * with room, insurance), a lunar claim with its mission, power, pilot, crew and offtake. Each step is tried in order and
 * kept only if it succeeds, so the strategy never fails a step.
 */
const ACT4_SEED = 1
const busyAct4: Strategy = {
  plan(state) {
    const kept: Step[] = []
    let s = state
    const tryStep = (a: Step) => {
      if (a.type === 'ADVANCE') return
      const r = applyAction(s, a)
      if (r.ok) {
        s = r.state
        kept.push(a)
      }
    }
    if (s.cash < 500e6) tryStep({ type: 'RAISE_EQUITY', dilution: 0.3 })
    // (the quiet high-LEO shell: in F3 a busy-shell strategy like this one goes bust in the cascade)
    tryStep({ type: 'FILE_ORBITAL_LICENCE', shell: 'high_leo' })
    if (!s.act4Orbit?.blocks.some((b) => b.stage === 'proposed'))
      tryStep({ type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'high_leo', gen: 'gen31' })
    for (const b of s.act4Orbit?.blocks.filter((x) => x.stage === 'proposed') ?? []) {
      tryStep({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 0 })
      tryStep({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 'spot' })
      tryStep({ type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: 'project_debt' })
      tryStep({ type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id })
      for (let k = 2; k <= 6; k++) tryStep({ type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider: 'pallas', quarter: s.quarter + k })
      tryStep({ type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })
    }
    tryStep({ type: 'CLAIM_LUNAR_SITE', site: 'cabeus' })
    tryStep({ type: 'SEND_LUNAR_MISSION', site: 'cabeus' })
    tryStep({ type: 'BUILD_LUNAR_SOLAR', site: 'cabeus', kwe: 100 })
    tryStep({ type: 'DECIDE_LUNAR_PILOT', site: 'cabeus' })
    tryStep({ type: 'SET_LUNAR_MAINTENANCE', site: 'cabeus', on: true })
    tryStep({ type: 'SIGN_LUNAR_OFFTAKE', offer: 0 })
    return kept as Action[]
  },
}
describe.each(['f1', 'f2', 'f3', 'f4'] as const)('golden replay: act4-%s (2031Q1 → the chapter phase)', (future) => {
  const start = () => act4Company('s0', future, ACT4_SEED)
  const run = playFrom(start(), busyAct4, { through: 4 })

  it('plays to its end with orbit and the Moon in play: the chapter phase, or (F3) a game over after the cascade', () => {
    // (F3: a block a quarter overspends once the space-equity window shuts after the cascade: a fire sale, a covenant
    // breach, then a game over with its reveal. M36.6: F2 too, since its space multiple × 0.60 from its 2033Q1 trigger
    // (11.3× → 6.4×) does the same to a block a quarter. F1 and F4 reach 2035Q4.)
    const bust = future === 'f3' || future === 'f2'
    expect(run.state.phase).toBe(bust ? 'gameover' : 'chapter')
    expect(run.state.act).toBe(4)
    expect(run.state.futureId).toBe(future)
    if (!bust) expect(run.state.reports.at(-1)!.quarter).toBe('2035Q4')
    expect(run.state.act4Orbit!.blocks.length).toBeGreaterThan(0)
    expect(run.state.act4Moon!.claims.length).toBeGreaterThan(0)
    expect(run.state.act4End?.futureId).toBe(future)
  })

  it('same seed + the same strategy → identical game; replaying the log → identical end state', () => {
    expect(playFrom(start(), busyAct4, { through: 4 }).state).toEqual(run.state)
    expect(run.log.reduce(applyStep, start())).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // The save-format number isn't game state: format 6 (Act V, M49) changes nothing in an Act IV game, so the stored
    // goldens (format 5) are compared as they are.
    await expect(JSON.stringify({ ...run.state, version: 5 }, null, 2) + '\n').toMatchFileSnapshot(
      `./golden/act4-${future}-seed-${ACT4_SEED}.json`,
    )
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * M36 (doc 38 §4-5): two goldens for the energy options and ventures, on F2 and F4 (the grid futures far apart). The
 * same Act III company enters Act IV and plays all 20 quarters with an energy strategy: on-site solar with a 4-hour
 * battery at its own site, Texas demand response where it can, and a stake in each venture (EGS after diligence, an SMR
 * and the solar+battery control with offtakes to its own site, fusion with a reservation); a cash call is paid when cash
 * allows, else diluted. Each step is tried in order and kept only if it succeeds.
 */
const energyAct4: Strategy = {
  plan(state) {
    const kept: Step[] = []
    let s = state
    const tryStep = (a: Action) => {
      const r = applyAction(s, a)
      if (r.ok) {
        s = r.state
        kept.push(a)
      }
    }
    if (s.cash < 300e6) tryStep({ type: 'RAISE_EQUITY', dilution: 0.3 })
    tryStep({ type: 'ENERGY_BUILD', siteId: 'site-2', kind: 'btm_solar', size: 10 })
    tryStep({ type: 'ENERGY_BUILD', siteId: 'site-2', kind: 'bess', size: 10, hours: 4 })
    for (const site of s.sites) tryStep({ type: 'TEXAS_SET', siteId: site.id, enrolled: true })
    tryStep({ type: 'VENTURE_DILIGENCE', venture: 'egs' })
    tryStep({ type: 'VENTURE_JOIN', venture: 'egs', stake: 0.1, offtake: 0, prepay: 0 })
    tryStep({ type: 'VENTURE_JOIN', venture: 'smr', stake: 0.1, offtake: 0.25, prepay: 1, siteId: 'site-2' })
    tryStep({ type: 'VENTURE_JOIN', venture: 'fusion', stake: 0.1, offtake: 1, prepay: 0 })
    tryStep({ type: 'VENTURE_JOIN', venture: 'control', stake: 0.2, offtake: 0.5, prepay: 0, siteId: 'site-2' })
    for (const v of s.ventures ?? [])
      if (v.call) tryStep({ type: 'VENTURE_CALL', ventureId: v.id, choice: s.cash > v.call.dueUsd + 200e6 ? 'pay' : 'dilute' })
    return kept as Action[]
  },
}
describe.each(['f2', 'f4'] as const)('golden replay: act4-energy-%s (2031Q1 → the chapter phase)', (future) => {
  const start = () => act4Company('s0', future, ACT4_SEED)
  const run = playFrom(start(), energyAct4, { through: 4 })

  it('plays to its end with energy assets and ventures in play', () => {
    expect(run.state.act).toBe(4)
    expect(run.state.reports.at(-1)!.quarter).toBe('2035Q4')
    expect(run.state.sites.find((x) => x.id === 'site-2')!.energy!.length).toBeGreaterThanOrEqual(2)
    expect(run.state.ventures!.map((v) => v.type).sort()).toEqual(['control', 'egs', 'fusion', 'smr'])
  })

  it('same seed + the same strategy → identical game; replaying the log → identical end state', () => {
    expect(playFrom(start(), energyAct4, { through: 4 }).state).toEqual(run.state)
    expect(run.log.reduce(applyStep, start())).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // (format 6, Act V, changes nothing in an Act IV game: compared at format 5, as above)
    await expect(JSON.stringify({ ...run.state, version: 5 }, null, 2) + '\n').toMatchFileSnapshot(
      `./golden/act4-energy-${future}-seed-${ACT4_SEED}.json`,
    )
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * Act V (M57.3, doc 43 §18): one golden per future. The Firm Builder preset (its recipe played from 2017, as "Start at
 * Act V") enters Act V on each future with act5Seed 1 and plays all 20 quarters with the perfect reader (tools/act5/bots.ts):
 * it switches between the +1 moves (renew short, request grid MW, pay bills) and the −1 moves (lock long, contract
 * output, sell stakes and sites) by the future's ideal stance, so it exercises the act's systems in every future.
 */
const ACT5_SEED = 1
let firmBuilder: GameState | null = null
function firmBuilderStart(): GameState {
  if (!firmBuilder) {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    firmBuilder = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never })
  }
  return structuredClone(firmBuilder)
}
describe.each(['v1', 'v2', 'v3', 'v4'] as const)('golden replay: act5-%s (2036Q1 → the chapter phase)', (vfuture) => {
  const start = () => toAct5(firmBuilderStart(), { vfuture, act5Seed: ACT5_SEED, preset: 'firm_builder' })
  const run = playFrom(start(), act5Bot('perfect'), { through: 5 })

  it('plays to 2040Q4 with the act’s record', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.act).toBe(5)
    expect(run.state.vFutureId).toBe(vfuture)
    expect(run.state.reports.at(-1)!.quarter).toBe('2040Q4')
    expect(run.state.act5End?.vFutureId).toBe(vfuture)
    expect((run.state.act5Moves ?? []).length).toBeGreaterThan(0)
  })

  it('same seed + the same strategy → identical game; replaying the log → identical end state', () => {
    expect(playFrom(start(), act5Bot('perfect'), { through: 5 }).state).toEqual(run.state)
    expect(run.log.reduce(applyStep, start())).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    // (format 7, the Prologue's altcoins, M68.4, changes nothing in an Act V game: compared at format 6, as above)
    await expect(JSON.stringify({ ...run.state, version: 6 }, null, 2) + '\n').toMatchFileSnapshot(`./golden/act5-${vfuture}-seed-${ACT5_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

describe('balance anchors (scope §5)', () => {
  it('the steady grower survives to the Merge', () => {
    expect(playGame(SEED, bots['steady-grower']).state.phase).toBe('chapter')
  })

  it('the F&F expander goes bust, but survives if it breaks the lease in 2018', () => {
    expect(playGame(SEED, bots['ff-expander']).state.phase).toBe('gameover')
    expect(playGame(SEED, bots['ff-leaver']).state.phase).toBe('chapter')
  })

  it('over-expanding into a small unit in the 2018 winter goes bust in 2018', () => {
    const { state } = playGame(SEED, bots['early-expander'])
    expect(state.phase).toBe('gameover')
    expect(state.reports.at(-1)!.quarter.startsWith('2018')).toBe(true)
  })

  it('the auction bidder loses its 2019Q1 bid and wins the 2020Q2 lot', () => {
    const { state } = playGame(SEED, bots['auction-bidder'])
    const keys = state.log.map((e) => e.key)
    expect(keys).toContain('log.auction_lost')
    expect(keys).toContain('log.auction_won')
    expect(state.machines.some((l) => l.model === 's9' && l.count >= 330)).toBe(
      true,
    )
  })

  // "Reinvesting 100%" = take the F&F money and build the small unit (design thread B1): the
  // sim-runner's ff-climb bot. Target: 80%+ of runs bust, in 2018Q2–2019Q2.
  it('reinvesting 100% every quarter goes bust between 2018Q2 and 2019Q2', () => {
    const quarters = Array.from(
      { length: 20 },
      (_, i) => playGame(i + 1, BOTS['ff-climb']).state,
    )
      .filter((s) => s.phase === 'gameover')
      .map((s) => s.reports.at(-1)!.quarter)
    expect(quarters.length).toBeGreaterThanOrEqual(16)
    for (const q of quarters) {
      expect(q >= '2018Q2' && q <= '2019Q2').toBe(true)
    }
  })

  // The seed round is the lesson "raise before the winter" (design thread B2): reinvesting with
  // the seed money hurts in 2018–19 (cash below half the seed) but doesn't go bust.
  it('the seed cushions the crash: cash dips below half the seed in 2018–19, no bust', () => {
    const seedUsd = CONTENT.ladder.seed.amount_usd
    for (let seed = 1; seed <= 5; seed++) {
      const { state } = playGame(seed, BOTS['raise-climb'])
      expect(state.phase).toBe('chapter')
      const floor = Math.min(
        ...state.reports
          .filter((r) => r.quarter >= '2018Q1' && r.quarter <= '2019Q4')
          .map((r) => r.cash),
      )
      expect(floor).toBeLessThan(seedUsd * 0.5)
    }
  })
})

/**
 * The Prologue's mining club (M70.6, doc 51 v1.2 §4): one golden, one seed, the club-trusting bot (joins in 2013Q1 with $2,000,
 * Jun holds the keys, takes the scrypt box and the cloud contract, buys the friends out at the handover). The earlier Prologue
 * goldens stay as they were: a game that never joins the club is unchanged.
 */
describe('golden replay: prologue-club', () => {
  const bot = PROLOGUE_BOTS['club-trusting']
  const run = playPrologue(PROLOGUE_SEED, bot, { through: 0 })

  it('plays to its chapter report with the club joined and ended', () => {
    expect(run.state.phase).toBe('chapter')
    expect(run.state.prologue!.club).toBeUndefined()
    expect(run.state.prologue!.clubEnded).toBeDefined()
    expect(run.state.prologue!.reports.filter((r) => r.club).length).toBeGreaterThan(4)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through: 0 }).state).toEqual(run.state)
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify(run.state, null, 2) + '\n').toMatchFileSnapshot(`./golden/prologue-club-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * The CPU farmer (M73.2, doc 51 v1.6 §17): one golden, one seed, the cpu-farmer bot (the careful hodler that builds the home rig and
 * buys 3 Spare PCs in 2009Q1). The earlier Prologue goldens stay as they were: no earlier bot buys a Spare PC.
 */
describe('golden replay: prologue-cpu-farmer', () => {
  const bot = PROLOGUE_BOTS['cpu-farmer']
  const run = playPrologue(PROLOGUE_SEED, bot, { through: 0 })

  it('plays to its chapter report with five CPU PCs mining from 2009Q1', () => {
    expect(run.state.phase).toBe('chapter')
    const bought = run.state.log.filter((e) => e.key === 'log.bought' && e.params?.model === 'pc_cpu_spare')
    expect(bought.length).toBe(1)
    expect(bought[0].params).toMatchObject({ count: 4, condition: 'new' })
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through: 0 }).state).toEqual(run.state)
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify(run.state, null, 2) + '\n').toMatchFileSnapshot(`./golden/prologue-cpu-farmer-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})

/**
 * The unit farmer (M74.3, doc 51 v1.7 §18): one golden, one seed, the unit-farmer bot (the cpu-farmer that moves out and leases the
 * small unit in 2011Q3, then fills it with gaming GPUs).
 */
describe('golden replay: prologue-unit-farmer', () => {
  const bot = PROLOGUE_BOTS['unit-farmer']
  const run = playPrologue(PROLOGUE_SEED, bot, { through: 0 })

  it('plays to its chapter report with the small unit leased in 2011Q3 and full of gaming GPUs', () => {
    expect(run.state.phase).toBe('chapter')
    const unit = run.state.log.find((e) => e.key === 'log.p0_small_unit')!
    expect(CONTENT.quarters[unit.quarter]).toBe('2011Q3')
    expect(run.state.log.filter((e) => e.key === 'log.bought' && e.params?.model === 'gpu_gaming_2010').length).toBeGreaterThan(3)
  })

  it('same seed + same strategy → identical game; replaying the log → identical end state', () => {
    expect(playPrologue(PROLOGUE_SEED, bot, { through: 0 }).state).toEqual(run.state)
    expect(replayPrologue(PROLOGUE_SEED, run.log)).toEqual(run.state)
  })

  it('matches the stored golden end state', async () => {
    await expect(JSON.stringify(run.state, null, 2) + '\n').toMatchFileSnapshot(`./golden/prologue-unit-farmer-seed-${PROLOGUE_SEED}.json`)
  })

  it('M37 reconciliation: every quarter, start cash + its labelled lines = end cash (untagged 0)', () => {
    expect(unreconciled(run.state)).toEqual([])
  })
})
