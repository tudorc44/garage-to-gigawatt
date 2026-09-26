// Machines: buying, selling and repairing batches ("lots") of identical units.
import { CONTENT } from '../../content/index.ts'
import type { Condition, GameState, MachineLot } from '../state.ts'
import { getModel, leadTimeQuarters, sellPrice } from './market.ts'

export function repairCostPerUnit(modelId: string): number {
  return CONTENT.interrupts.byId.failure_wave?.repair_cost_usd?.[modelId] ?? 0
}

/** Adds bought units, merging into an identical lot if there is one. */
export function addMachines(
  state: GameState,
  modelId: string,
  condition: Condition,
  count: number,
  siteId: string,
): MachineLot {
  const model = getModel(modelId)!
  // Machines earn from the quarter after delivery (scope §2.4).
  const earnsFromQuarter =
    state.quarter + leadTimeQuarters(model, state.quarter, condition) + 1
  const same = state.machines.find(
    (l) =>
      l.model === modelId &&
      l.condition === condition &&
      l.siteId === siteId &&
      l.earnsFromQuarter === earnsFromQuarter,
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
): number {
  const price = sellPrice(getModel(lot.model)!, quarter)
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
  const value = saleValueUsd(lot, count, state.quarter)
  lot.failed -= Math.min(count, lot.failed)
  lot.count -= count
  if (lot.count === 0) state.machines = state.machines.filter((l) => l !== lot)
  return value
}
