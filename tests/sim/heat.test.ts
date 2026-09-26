import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'
import { interruptChoices } from '../../src/sim/selectors.ts'
import {
  addGrievance,
  checkComplaint,
  heatOf,
  mitigationCostUsd,
  outreachCostUsd,
  recalcHeat,
  scheduleComplaint,
  startQuarterHeat,
  updateHeatWeek,
} from '../../src/sim/systems/heat.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
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
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}
const answer = (s: GameState, choice: string) =>
  ok(s, { type: 'RESOLVE_INTERRUPT', choice })

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

describe('neighbour complaints', () => {
  /** A live quarter with a warehouse at Heat `heat` (via grievance) and $50K cash. */
  function hot(heat: number, seed = 1, flaw: string | null = null): GameState {
    const s = { ...withSite('warehouse', '2019Q1', flaw), seed, cash: 50_000 }
    updateHeatWeek(s, [])
    // Set the grievance directly (adding it would be multiplied by a hostile council).
    heatOf(s, 'site-2').grievance = heat - heatOf(s, 'site-2').value
    recalcHeat(s, s.sites[1])
    return s
  }

  it('are rolled once a quarter for the hottest site, from Heat 30, with chance (Heat − 20)%', () => {
    const cool = hot(29)
    scheduleComplaint(cool)
    expect(cool.complaint).toBeNull()
    let scheduled = 0
    for (let seed = 1; seed <= 400; seed++) {
      const s = hot(60, seed)
      scheduleComplaint(s)
      if (s.complaint) {
        scheduled++
        expect(s.complaint.siteId).toBe('site-2')
        expect(s.complaint.week).toBeGreaterThanOrEqual(1)
        expect(s.complaint.week).toBeLessThanOrEqual(13)
      }
    }
    expect(scheduled / 400).toBeGreaterThan(0.33)
    expect(scheduled / 400).toBeLessThan(0.47)
  })

  it('pause the quarter at their week and count toward the 3 interrupts', () => {
    const s = { ...hot(60), phase: 'live' as const, week: 4 }
    s.complaint = { siteId: 'site-2', week: 6 }
    checkComplaint(s)
    expect(s.interrupt).toBeNull() // after week 5: not yet
    s.week = 5
    checkComplaint(s)
    expect(s.interrupt).toMatchObject({
      id: 'neighbour_complaint',
      siteId: 'site-2',
    })
    expect(s.interruptsThisQuarter).toBe(1)
    expect(s.complaint).toBeNull()
  })

  it('wait for next quarter when the 3 interrupts are used up, then come at a new week', () => {
    const s = { ...hot(60), phase: 'live' as const, week: 12 }
    s.interruptsThisQuarter = 3
    s.complaint = { siteId: 'site-2', week: 2 }
    checkComplaint(s)
    expect(s.interrupt).toBeNull()
    expect(s.complaint).toMatchObject({ siteId: 'site-2' })
    const next = { ...s, quarter: s.quarter + 1 }
    scheduleComplaint(next)
    expect(next.complaint?.siteId).toBe('site-2')
  })

  it('pay: −$5,000 and grievance −10; ignore: grievance +10 (×1.5 with a hostile council)', () => {
    const s = { ...hot(60), phase: 'live' as const }
    s.interrupt = {
      id: 'neighbour_complaint',
      week: 3,
      coin: 'BTC',
      changePct: 0,
      siteId: 'site-2',
    }
    expect(interruptChoices(s).map((c) => c.id)).toEqual([
      'pay',
      'mitigate',
      'ignore',
    ])
    expect(defaultChoice(s)).toBe('ignore')
    const paid = answer(s, 'pay')
    expect(paid.cash).toBe(45_000)
    expect(heat(paid)).toBeCloseTo(50)
    expect(heat(answer(s, 'ignore'))).toBeCloseTo(70)

    const hostile = {
      ...s,
      ...hot(60, 1, 'hostile_council'),
      phase: 'live' as const,
      interrupt: s.interrupt,
    }
    expect(heat(answer(hostile, 'ignore'))).toBeCloseTo(75)
  })

  it('sound walls = noise mitigation: base −10 for good, $30K per MW, then not offered again', () => {
    const s = { ...hot(60), phase: 'live' as const }
    s.interrupt = {
      id: 'neighbour_complaint',
      week: 3,
      coin: 'BTC',
      changePct: 0,
      siteId: 'site-2',
    }
    const walls = answer(s, 'mitigate')
    expect(walls.cash).toBe(20_000) // 1 MW warehouse: $30K
    expect(heat(walls)).toBeCloseTo(50)
    expect(heatOf(walls, 'site-2').mitigated).toBe(true)
    const again = { ...walls, interrupt: s.interrupt }
    expect(interruptChoices(again).map((c) => c.id)).toEqual(['pay', 'ignore'])
  })
})

describe('talking to the neighbours and noise mitigation (Plan phase)', () => {
  const plan = (): GameState => {
    const s = { ...withSite('warehouse'), cash: 2_000_000 }
    updateHeatWeek(s, [])
    return s
  }
  const outreach: Action = { type: 'OUTREACH', siteId: 'site-2' }
  const walls: Action = { type: 'MITIGATE_NOISE', siteId: 'site-2' }

  it('outreach: 1 Bandwidth, $10K per MW (min $10K, max $250K), grievance −15, down to −10 goodwill', () => {
    const s = ok(plan(), outreach)
    expect(s.bandwidth).toBe(2)
    expect(s.cash).toBe(1_990_000)
    expect(heatOf(s, 'site-2').grievance).toBe(-10)
    expect(heat(s)).toBe(5)
    expect(outreachCostUsd(s.sites[0])).toBe(10_000) // the garage: the minimum
    const texas = { ...s.sites[1], tier: 'texas_site' } // 100 MW: capped
    expect(outreachCostUsd(texas)).toBe(250_000)
  })

  it('outreach: once per site per quarter', () => {
    const s = ok(plan(), outreach)
    expect(err(s, outreach)).toBe('error.outreach_done')
    expect(ok({ ...s, quarter: s.quarter + 1 }, outreach).bandwidth).toBe(1)
  })

  it('noise mitigation: no Bandwidth, $30K per MW (max $1M), base −10, once per site', () => {
    const s = ok(plan(), walls)
    expect(s.bandwidth).toBe(3)
    expect(s.cash).toBe(1_970_000)
    expect(heat(s)).toBe(5)
    expect(err(s, walls)).toBe('error.mitigation_done')
    const texas = { ...s.sites[1], tier: 'texas_site' }
    expect(mitigationCostUsd(texas)).toBe(1_000_000)
  })
})
