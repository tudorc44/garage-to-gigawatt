// M77.2 (doc 58 §1, Y-B0): Gen 2's corrected price table, no wait at street price, and the retail queue (2021Q1-Q3): $4,100 a rig, at
// most 4 a quarter, each rig delivered 1, 2 or 3 quarters later (50/35/15%) on its own substream. Old saves load and can queue.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { lotViews, machineMarket } from '../../src/sim/selectors.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { drawQueueDelivery } from '../../src/sim/systems/machines.ts'
import { getModel, leadTimeQuarters } from '../../src/sim/systems/market.ts'

const gen2 = () => getModel('gpu_gen2')!

/** An Act I Plan phase in `label` with plenty of cash and an empty garage. */
function planAt(label: string, seed = 1): GameState {
  const s = newGame(seed)
  s.quarter = quarterIndex(label)!
  s.phase = 'plan'
  s.cash = 1e7
  s.bandwidth = 6
  s.machines = []
  return s
}
const buy = (s: GameState, count: number, queue = false): ReturnType<typeof applyAction> =>
  applyAction(s, { type: 'BUY_MACHINES', model: 'gpu_gen2', condition: 'new', count, siteId: s.sites[0].id, ...(queue ? { queue: true } : {}) } as Action)
const ok = (r: ReturnType<typeof applyAction>): GameState => {
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('the price table (doc 58 §1.1)', () => {
  it('new and used prices are the corrected table', () => {
    expect(gen2().price_new).toEqual({ '2020Q4': 3600, '2021Q1': 6000, '2021Q2': 8300, '2021Q3': 6600, '2021Q4': 6600, '2022Q1': 5800, '2022Q2': 4200, '2022Q3': 2800 })
    expect(gen2().price_used).toEqual({ '2020Q4': 3000, '2021Q1': 5200, '2021Q2': 7200, '2021Q3': 5600, '2021Q4': 5600, '2022Q1': 4800, '2022Q2': 3200, '2022Q3': 1800 })
    const raw = JSON.parse(readFileSync(new URL('../../src/content/machines.json', import.meta.url), 'utf8')).models.find((m: { id: string }) => m.id === 'gpu_gen2')
    expect(raw.price_source).toContain('doc 60')
  })

  it('there is no wait at street price: no lead time in 2021Q1-Q3, and a rig bought then earns from the next quarter', () => {
    for (const q of ['2021Q1', '2021Q2', '2021Q3']) {
      expect(leadTimeQuarters(gen2(), quarterIndex(q)!, 'new')).toBe(0)
      const s = ok(buy(planAt(q), 1))
      expect(s.machines[0].earnsFromQuarter).toBe(quarterIndex(q)! + 1)
      expect(s.machines[0].queued).toBeUndefined()
    }
  })
})

describe('the retail queue (doc 58 §1.2)', () => {
  it('two rows only in 2021Q1-Q3: the market offers the queue then, never before or after', () => {
    for (const [q, open] of [['2020Q4', false], ['2021Q1', true], ['2021Q2', true], ['2021Q3', true], ['2021Q4', false], ['2022Q1', false]] as const) {
      const s = planAt(q)
      const row = machineMarket(s).find((m) => m.id === 'gpu_gen2')!
      expect(!!row.queue, q).toBe(open)
      if (open) expect(row.queue).toEqual({ priceUsd: 4100, left: 4 })
      // (the action agrees with the offer)
      expect(buy(s, 1, true).ok, `${q} action`).toBe(open)
    }
  })

  it('costs $4,100 a rig and orders on the queue are new only', () => {
    const s0 = planAt('2021Q2')
    const s = ok(buy(s0, 2, true))
    expect(s0.cash - s.cash).toBeCloseTo(8200, 2)
    expect(applyAction(s0, { type: 'BUY_MACHINES', model: 'gpu_gen2', condition: 'used', count: 1, siteId: s0.sites[0].id, queue: true } as Action).ok).toBe(false)
  })

  it('at most 4 rigs a quarter, across orders; the next quarter opens it again', () => {
    let s = ok(buy(planAt('2021Q1'), 3, true))
    expect(machineMarket(s).find((m) => m.id === 'gpu_gen2')!.queue!.left).toBe(1)
    const over = buy(s, 2, true)
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.error.key).toBe('error.gen2_queue_full')
    s = ok(buy(s, 1, true))
    expect(buy(s, 1, true).ok).toBe(false)
    expect(Object.values(s.gen2Queue!.perQuarter)).toEqual([4])
    const next = { ...s, quarter: s.quarter + 1 }
    expect(machineMarket(next).find((m) => m.id === 'gpu_gen2')!.queue!.left).toBe(4)
  })

  it('delivery is 1, 2 or 3 quarters later (the lot earns the quarter after), the lots show as on order', () => {
    const s = ok(buy(planAt('2021Q1'), 4, true))
    const q0 = s.quarter
    for (const l of s.machines) {
      expect(l.queued).toBe(true)
      const d = l.earnsFromQuarter - q0 - 1
      expect([1, 2, 3]).toContain(d)
    }
    expect(s.machines.reduce((n, l) => n + l.count, 0)).toBe(4)
    const views = lotViews(s)
    expect(views.every((v) => v.status === 'on_order')).toBe(true)
    // street rigs are not "on order"
    const street = ok(buy(planAt('2021Q2'), 1))
    expect(lotViews(street)[0].status).toBe('arriving')
  })

  it('the odds over many draws: about 50% one quarter, 35% two, 15% three (its own substream)', () => {
    const odds = gen2().retail_queue!.delivery_quarters
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    const N = 6000
    for (let seed = 1; seed <= N / 4; seed++) {
      const s = newGame(seed)
      for (let i = 0; i < 4; i++) counts[drawQueueDelivery(s, odds)]++
    }
    expect(counts[1] / N).toBeGreaterThan(0.47)
    expect(counts[1] / N).toBeLessThan(0.53)
    expect(counts[2] / N).toBeGreaterThan(0.32)
    expect(counts[2] / N).toBeLessThan(0.38)
    expect(counts[3] / N).toBeGreaterThan(0.12)
    expect(counts[3] / N).toBeLessThan(0.18)
  })

  it('the same game queues the same way (same seed, same draws), and a queue never moves the main random stream', () => {
    const a = ok(buy(planAt('2021Q1', 5), 4, true))
    const b = ok(buy(planAt('2021Q1', 5), 4, true))
    expect(a.machines.map((l) => [l.count, l.earnsFromQuarter])).toEqual(b.machines.map((l) => [l.count, l.earnsFromQuarter]))
    expect(a.rng).toBe(planAt('2021Q1', 5).rng)
  })

  it('counts against the GPU shortage cap like any rig bought that quarter', () => {
    const cap = CONTENT.gpuCap.kwPerQuarter
    const s = planAt('2021Q1')
    // (the cap reads this quarter's purchase log: fill it, and a queued rig is refused for the cap too)
    s.log.push({ quarter: s.quarter, week: null, key: 'log.bought', params: { model: 'gpu_gen2', count: Math.ceil(cap / gen2().power_kw), condition: 'new', costUsd: 0 } } as never)
    const r = buy(s, 1, true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.key).toBe('error.gpu_cap')
  })
})

describe('saves', () => {
  it('an old save (no queue state) loads as it is and can queue in 2021Q2', () => {
    const raw = JSON.parse(readFileSync(new URL('../fixtures/saves/v1-plan-2021Q2.json', import.meta.url), 'utf8'))
    const r = restoreSave(raw)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.gen2Queue).toBeUndefined()
    const s = { ...r.state, cash: 1e7 }
    const queued = ok(applyAction(s, { type: 'BUY_MACHINES', model: 'gpu_gen2', condition: 'new', count: 2, siteId: s.sites[0].id, queue: true } as Action))
    expect(queued.gen2Queue).toBeDefined()
    // a game with queued rigs survives a save round trip
    const back = restoreSave(JSON.parse(JSON.stringify(queued)))
    expect(back.ok && back.state.gen2Queue).toEqual(queued.gen2Queue)
    expect(back.ok && back.state.machines.filter((l) => l.queued).length).toBe(queued.machines.filter((l) => l.queued).length)
  })
})
