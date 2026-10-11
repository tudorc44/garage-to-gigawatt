// Act V's scarcity repricing (M52.1; doc 43 §0.2, §0.7 item 1, §0.9 item 2). Act V's market files keep the carried rent,
// renewal, RFP and multiple columns scarcity-neutral (identical in every future); the engine applies the future's
// `scarcity_index` where the carried systems read them:
// - rents (new leases and re-lets through the RFP index, renewal offers through the renewal bands, GPU contracts and GPU
//   renewal indices): × scarcity_index;
// - the AI (ground) multiple and spot GPU rents: × (1 + 0.5 × (scarcity_index − 1)).
// Outside Act V both factors are 1, so Acts I-IV are untouched. Not hidden: the index is a market column, read for the
// quarter asked only (the current one: no system asks for a later quarter).
import { act5Row, type MarketKey } from '../../content/index.ts'

/** The scarcity index this quarter (1 outside Act V). */
export function scarcityIndex(quarter: number, scenario: MarketKey | null | undefined): number {
  return act5Row(quarter, scenario)?.scarcity_index ?? 1
}

/** The rent factor: × scarcity_index (new leases, re-lets, renewal offers, GPU contracts). */
export const scarcityRentFactor = scarcityIndex

/** The multiple's factor (also spot GPU rents): 1 + 0.5 × (scarcity_index − 1) (doc 43 §0.7 item 1). */
export function scarcityMultipleFactor(quarter: number, scenario: MarketKey | null | undefined): number {
  return 1 + 0.5 * (scarcityIndex(quarter, scenario) - 1)
}
