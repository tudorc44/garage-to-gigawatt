// Machines: buying, selling and repairing batches ("lots") of identical units.
import { CONTENT, type MarketKey } from '../../content/index.ts'
import { ENERGY } from '../../content/energyContent.ts'
import type { Condition, GameState, MachineLot } from '../state.ts'
import { random, substream } from '../rng.ts'
import { getModel, leadTimeQuarters, scenarioOf, sellPrice } from './market.ts'

export function repairCostPerUnit(modelId: string): number {
  return CONTENT.interrupts.byId.failure_wave?.repair_cost_usd?.[modelId] ?? 0
}

/** "Fix all" (M6.1): every broken unit across your lots, and the sum of their normal repair costs. */
export function repairAllCost(state: GameState): {
  units: number
  costUsd: number
} {
  let units = 0
  let costUsd = 0
  for (const lot of state.machines) {
    units += lot.failed
    costUsd += lot.failed * repairCostPerUnit(lot.model)
  }
  return { units, costUsd }
}

/**
 * One rig's delivery from the Gen 2 retail queue (doc 58 §1.2): 1, 2 or 3 quarters by the model's odds, on the queue's own
 * substream `gen2_queue` (one draw per rig, counted in the state), so no other random draw in any game moves.
 */
export function drawQueueDelivery(state: GameState, odds: Record<string, number>): number {
  const gq = (state.gen2Queue ??= { orders: 0, perQuarter: {} })
  const u = random(substream(state.seed, `gen2_queue:${gq.orders++}`))
  let acc = 0
  const keys = Object.keys(odds).map(Number).sort((x, y) => x - y)
  for (const k of keys) {
    acc += odds[String(k)]
    if (u < acc) return k
  }
  return keys.at(-1) ?? 1
}

/** Adds bought units, merging into an identical lot if there is one. */
export function addMachines(
  state: GameState,
  modelId: string,
  condition: Condition,
  count: number,
  siteId: string,
  /** M77.1: a rig from the retail queue arriving this many quarters from now (instead of the model's lead time). */
  queuedDelivery?: number,
): MachineLot {
  const model = getModel(modelId)!
  // Machines earn from the quarter after delivery (scope §2.4). M35.3: shipping to Iceland adds a quarter.
  const site = state.sites.find((s) => s.id === siteId)
  const shipping = site?.special ? (ENERGY.specialKinds[site.special].delivery_extra_quarters ?? 0) : 0
  const earnsFromQuarter =
    state.quarter + (queuedDelivery ?? leadTimeQuarters(model, state.quarter, condition)) + 1 + shipping
  const same = state.machines.find(
    (l) =>
      l.model === modelId &&
      l.condition === condition &&
      l.siteId === siteId &&
      l.earnsFromQuarter === earnsFromQuarter &&
      // (M68.4: a new unit never joins a lot that mines an altcoin: the coin is the lot's choice)
      !l.altCoin &&
      // (M77.1: queued rigs and street-bought rigs stay in lots of their own)
      !!l.queued === (queuedDelivery !== undefined),
  )
  if (same) {
    same.count += count
    return same
  }
  const lot: MachineLot = {
    id: `lot-${state.nextId++}`,
    model: modelId,
    siteId,
    condition,
    count,
    failed: 0,
    earnsFromQuarter,
    ...(queuedDelivery !== undefined ? { queued: true } : {}),
  }
  state.machines.push(lot)
  return lot
}

/**
 * What selling `count` units of a lot brings in. Broken units go first and fetch
 * the used price minus their repair cost.
 */
export function saleValueUsd(
  lot: MachineLot,
  count: number,
  quarter: number,
  scenario?: MarketKey | null,
): number {
  const price = sellPrice(getModel(lot.model)!, quarter, scenario)
  const broken = Math.min(count, lot.failed)
  const brokenPrice = Math.max(0, price - repairCostPerUnit(lot.model))
  return broken * brokenPrice + (count - broken) * price
}

/** Removes `count` units (broken ones first) and returns the cash they fetch. */
export function removeMachines(
  state: GameState,
  lot: MachineLot,
  count: number,
): number {
  const value = saleValueUsd(lot, count, state.quarter, scenarioOf(state))
  lot.failed -= Math.min(count, lot.failed)
  lot.count -= count
  if (lot.count === 0) state.machines = state.machines.filter((l) => l !== lot)
  return value
}
