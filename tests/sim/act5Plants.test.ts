// M52.2-M52.4 (doc 43 §7.1, §11 with §0.4; plants_v.json): Act V's operating plants. A venture at first power earns
// on its output (offtakes at their PPA, the developer's contracted share at the pitch, the rest merchant), pays its
// costs, and your stake is valued on its earnings (EBITDA × 4 × the plant multiple) instead of the milestone mark; your
// share of its cash is paid out after your plant debt. Plant debt (contracted or merchant terms, its covenants), fund
// sales at the infrastructure bid index and output contracts are Act V actions, each logged as a move.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { PLANTS } from '../../src/content/plantsContent.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { applyStep } from '../../src/sim/replay.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { toAct5, type GameState, type Venture } from '../../src/sim/state.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import {
  contractedShare,
  endQuarterPlants,
  isPlant,
  plantMultiple,
  plantQuarter,
  plantStakeValueUsd,
  plantValueUsd,
} from '../../src/sim/systems/plants.ts'
import { stakeMarkUsd, ventureValueUsd } from '../../src/sim/systems/ventures.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

let fb: GameState | null = null
/** The Firm Builder preset at 2035Q4 (cached; returns a copy). */
function firmBuilder2035(): GameState {
  if (!fb) {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    fb = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as 'btm' })
  }
  return structuredClone(fb)
}

/** The Firm Builder in Act V on `v`, played passively until its plant runs (or 2040Q4). */
function withPlant(v: 'v1' | 'v2' | 'v3' | 'v4' = 'v1'): { s: GameState; plant: Venture } {
  let s = toAct5(firmBuilder2035(), { vfuture: v })
  const find = () => s.ventures?.find((x) => isPlant(s, x) && x.stake > 0)
  while (!find() && s.phase === 'plan') s = oneQuarter(s)
  return { s, plant: find()! }
}

/** Plays one quarter with an empty plan (default answers), to the next Plan phase (or the end). */
function oneQuarter(start: GameState): GameState {
  let s = applyStep(start, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt ? applyStep(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) }) : applyStep(s, { type: 'ADVANCE' })
  if (s.phase === 'report') s = applyStep(s, { type: 'NEXT_QUARTER' })
  return s
}

const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('operating plants in Act V (M52.2)', () => {
  it('the Firm Builder’s plant runs in Act V and earns: output × prices, capacity where paid, less its costs', () => {
    const { s, plant } = withPlant('v1')
    expect(plant).toBeDefined()
    const q = plantQuarter(s, plant)
    expect(q.mwh).toBeGreaterThan(0)
    expect(q.ebitdaUsd).toBeCloseTo(q.energyUsd + q.capacityUsd - q.costUsd, 6)
    // EGS: 90% contracted at first power (plants_v.json), the rest merchant
    expect(contractedShare(plant, s.quarter)).toBeGreaterThanOrEqual(PLANTS.classes.egs.contracted_share_at_cod)
  })

  it('values the stake on its earnings (stake × EBITDA × 4 × the plant multiple), not the milestone mark', () => {
    const { s, plant } = withPlant('v1')
    const row = act5Row(s.quarter, scenarioOf(s))!
    const c = contractedShare(plant, s.quarter)
    expect(plantMultiple(s, plant)).toBeCloseTo(c * row.plant_mult_contracted + (1 - c) * row.plant_mult_merchant, 10)
    expect(plantStakeValueUsd(s, plant)).toBeCloseTo(plant.stake * plantValueUsd(s, plant), 4)
    const offtake = ventureValueUsd(s, plant) - plant.prepaidUsd - plantStakeValueUsd(s, plant)
    expect(offtake).toBeGreaterThanOrEqual(-1e-6)
    expect(plantStakeValueUsd(s, plant)).not.toBeCloseTo(stakeMarkUsd(plant), 0)
  })

  it('pays your share of the plant’s cash as distributions (outside EBITDA)', () => {
    const { s, plant } = withPlant('v1')
    const cash = s.cash
    const paid = endQuarterPlants(s)
    expect(paid).toBeCloseTo(Math.max(0, plant.stake * plantQuarter(s, plant).ebitdaUsd), 2)
    expect(s.cash).toBeCloseTo(cash + paid, 2)
  })

  it('nothing changes before Act V: the same venture in 2035Q4 is not a plant', () => {
    const s4 = firmBuilder2035()
    for (const v of s4.ventures ?? []) expect(isPlant(s4, v)).toBe(false)
  })
})

describe('plant debt, fund sales and output contracts (M52.3-M52.4)', () => {
  it('plant debt: contracted terms at ≥ 70% contracted, 65% of the stake’s value, in cash and in the company’s debt', () => {
    const { s, plant } = withPlant('v1')
    const value = plantStakeValueUsd(s, plant)
    const debt0 = debtUsd(s)
    const after = ok(s, { type: 'ARRANGE_PLANT_DEBT', ventureId: plant.id })
    const v = after.ventures!.find((x) => x.id === plant.id)!
    expect(v.plantDebt!.kind).toBe('contracted')
    expect(v.plantDebt!.principalUsd).toBeCloseTo(PLANTS.finance.debt_contracted.max_ltv * value, 0)
    expect(after.cash).toBeCloseTo(s.cash + v.plantDebt!.principalUsd, 2)
    expect(debtUsd(after)).toBeCloseTo(debt0 + v.plantDebt!.principalUsd, 2)
    expect(after.act5Moves!.at(-1)!.kind).toBe('arrange_plant_debt')
    // a second draw is refused
    expect(applyAction(after, { type: 'ARRANGE_PLANT_DEBT', ventureId: plant.id }).ok).toBe(false)
    // the service comes out of the plant's cash before your distributions: the debt falls
    const p0 = v.plantDebt!.principalUsd
    endQuarterPlants(after)
    expect(after.ventures!.find((x) => x.id === plant.id)!.plantDebt!.principalUsd).toBeLessThan(p0)
  })

  it('the covenants: a lock-up below 1.15, a restructure (× 0.5) after 4 quarters below 1.0, the lenders take it after 8', () => {
    const { s, plant } = withPlant('v1')
    const after = ok(s, { type: 'ARRANGE_PLANT_DEBT', ventureId: plant.id })
    const v = after.ventures!.find((x) => x.id === plant.id)!
    // make the debt far too big for the plant: DSCR < 1 every quarter
    v.plantDebt!.principalUsd *= 50
    v.plantDebt!.originalUsd *= 50
    const stake = v.stake
    for (let i = 0; i < 4; i++) endQuarterPlants(after)
    expect(v.plantDebt!.lockedUp).toBe(true)
    expect(v.plantDebt!.restructured).toBe(true)
    expect(v.stake).toBeCloseTo(stake * PLANTS.finance.covenants.restructure_stake_mult, 10)
    for (let i = 0; i < 4; i++) endQuarterPlants(after)
    expect(v.stake).toBe(0)
    expect(v.plantDebt).toBeUndefined()
  })

  it('a fund sale pays share × stake value × the infra bid index, less the debt it takes; −1 in the move log', () => {
    const { s, plant } = withPlant('v3')
    const index = act5Row(s.quarter, scenarioOf(s))!.infra_bid_index
    const expected = 0.5 * plantStakeValueUsd(s, plant) * index
    const after = ok(s, { type: 'SELL_PLANT_STAKE', ventureId: plant.id, share: 0.5 })
    expect(after.cash - s.cash).toBeCloseTo(expected, 0)
    expect(after.ventures!.find((x) => x.id === plant.id)!.stake).toBeCloseTo(plant.stake * 0.5, 10)
    expect(after.act5Moves!.at(-1)!.kind).toBe('sell_plant_stake_to_fund')
  })

  it('an output contract fixes up to 80% of the merchant rest at market − 10% and raises the contracted share', () => {
    const { s, plant } = withPlant('v1')
    expect(applyAction(s, { type: 'CONTRACT_PLANT_OUTPUT', ventureId: plant.id, share: 0.9 }).ok).toBe(false)
    const before = contractedShare(plant, s.quarter)
    const after = ok(s, { type: 'CONTRACT_PLANT_OUTPUT', ventureId: plant.id, share: 0.8 })
    const v = after.ventures!.find((x) => x.id === plant.id)!
    expect(v.outputContract!.priceUsdMwh).toBeCloseTo(plantQuarter(s, plant).marketUsdMwh * 0.9, 2)
    expect(contractedShare(v, after.quarter)).toBeCloseTo(before + (1 - before) * 0.8, 10)
    expect(after.act5Moves!.at(-1)!.kind).toBe('contract_plant_output')
  })

  it('the plant actions are closed before Act V', () => {
    const s4 = firmBuilder2035()
    const v = s4.ventures![0]
    for (const a of [
      { type: 'ARRANGE_PLANT_DEBT', ventureId: v.id },
      { type: 'SELL_PLANT_STAKE', ventureId: v.id, share: 1 },
      { type: 'CONTRACT_PLANT_OUTPUT', ventureId: v.id, share: 0.5 },
    ] as const)
      expect(applyAction({ ...s4, phase: 'plan' }, a).ok).toBe(false)
  })

  it('the Act V first quarter is 2036Q1 (a sanity check on the helper)', () => {
    expect(actFirstQuarter(5)).toBe(76)
  })
})
