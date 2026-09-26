import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import {
  addGrievance,
  heatOf,
  startQuarterHeat,
  updateHeatWeek,
} from '../../src/sim/systems/heat.ts'
import type { LotWeek } from '../../src/sim/systems/mining.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const S9_KW = CONTENT.machines.find((m) => m.id === 's9')!.power_kw
/** S9s needed to fill `mw` megawatts (rounded down). */
const s9sFor = (mw: number) => Math.floor((mw * 1000) / S9_KW)

/** A game in `label` with one extra site of `tier` (id site-2), optionally flawed. */
function withSite(
  tier: string,
  label = '2019Q1',
  flaw: string | null = null,
): GameState {
  const s = { ...newGame(1), quarter: q(label) }
  const site: Site = {
    id: 'site-2',
    tier,
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw,
  }
  s.sites.push(site)
  return s
}

/** Puts `count` machines of `model` at `siteId` and returns a week where they all run. */
function running(
  s: GameState,
  model: string,
  count: number,
  siteId = 'site-2',
): LotWeek[] {
  s.machines.push({
    id: `lot-${s.machines.length + 10}`,
    model,
    siteId,
    condition: 'new',
    count,
    failed: 0,
    earnsFromQuarter: 0,
  })
  return s.machines.map((l) => ({
    lotId: l.id,
    coin: 'BTC',
    working: l.count - l.failed,
    running: true,
    revenueUsd: 0,
    powerCostUsd: 0,
    coinsMined: 0,
  }))
}
const heat = (s: GameState, id = 'site-2') => heatOf(s, id).value

describe('Heat = base + load + grievance + era (heat.json)', () => {
  it('starts at the tier base: the garage 5 on day one', () => {
    expect(newGame(1).siteHeat['site-1'].value).toBe(5)
  })

  it('a full warehouse adds heat_load_max (25) to its base (15); idle machines add nothing', () => {
    const s = withSite('warehouse')
    const n = s9sFor(1)
    const lots = running(s, 's9', n)
    updateHeatWeek(s, lots)
    expect(heat(s)).toBeCloseTo(15 + 25 * ((n * S9_KW) / 1000), 5)
    expect(heat(s)).toBeCloseTo(40, 0)
    updateHeatWeek(
      s,
      lots.map((l) => ({ ...l, running: false })),
    )
    expect(heat(s)).toBe(15)
  })

  it('the garage counts heat_per_unit_garage per running unit instead (3 S9s = +24)', () => {
    const s = newGame(1)
    updateHeatWeek(s, running(s, 's9', 3, 'site-1'))
    expect(heat(s, 'site-1')).toBe(5 + 24)
  })

  it('noise_ordinance adds 15 to the base; hostile_council grows every increase 1.5×', () => {
    const noisy = withSite('warehouse', '2019Q1', 'noise_ordinance')
    updateHeatWeek(noisy, [])
    expect(heat(noisy)).toBe(30)

    const hostile = withSite('own_site', '2019Q1', 'hostile_council')
    const lots = running(hostile, 's9', s9sFor(20)) // a full own site
    updateHeatWeek(hostile, lots)
    expect(heat(hostile)).toBeCloseTo(20 + 25 * 1.5, 0)
    addGrievance(hostile, 'site-2', 10)
    expect(heatOf(hostile, 'site-2').grievance).toBe(15)
  })

  it('era pressure: +5 from 2021Q3 at sites of 1 MW or more', () => {
    const before = withSite('warehouse', '2021Q2')
    updateHeatWeek(before, [])
    expect(heat(before)).toBe(15)
    const after = withSite('warehouse', '2021Q3')
    updateHeatWeek(after, [])
    expect(heat(after)).toBe(20)
    const small = withSite('small_unit', '2021Q3')
    updateHeatWeek(small, [])
    expect(heat(small)).toBe(10)
  })

  it('grievance fades 5 a quarter toward 0; goodwill stops at −10 and fades back too', () => {
    const s = withSite('warehouse')
    addGrievance(s, 'site-2', 10)
    expect(heat(s)).toBe(25)
    startQuarterHeat(s)
    expect(heat(s)).toBe(20)
    startQuarterHeat(s)
    startQuarterHeat(s)
    expect(heatOf(s, 'site-2').grievance).toBe(0)
    addGrievance(s, 'site-2', -15)
    addGrievance(s, 'site-2', -15)
    expect(heatOf(s, 'site-2').grievance).toBe(-10)
    startQuarterHeat(s)
    expect(heatOf(s, 'site-2').grievance).toBe(-5)
  })

  it('never goes below 0 or above 100', () => {
    const s = withSite('small_unit')
    addGrievance(s, 'site-2', -10)
    addGrievance(s, 'site-2', 200)
    expect(heat(s)).toBe(100)
    const g = newGame(1)
    addGrievance(g, 'site-1', -10)
    expect(heat(g, 'site-1')).toBe(0)
  })

  it('is recalculated every week of a real quarter', () => {
    const s = applyAction(newGame(1), {
      type: 'BUY_MACHINES',
      model: 'gpu_gen1',
      condition: 'used',
      count: 5,
      siteId: 'site-1',
    })
    if (!s.ok) throw new Error(s.error.key)
    const g = advance({ ...s.state, quarter: q('2017Q4'), phase: 'live' })
    // 5 GPU rigs running in the garage: +1 each.
    expect(g.siteHeat['site-1'].value).toBe(10)
  })
})
