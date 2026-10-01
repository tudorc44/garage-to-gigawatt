// M17.3: political capital (doc 27 D8): the meter (40 at entry, −2 a quarter, 0–100), the Government Affairs
// Director, lobbying (the gain lands at the quarter's end; the tariff case can backfire), the five spend cards,
// the low-capital penalties and the company-wide Anger adjustment.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT, type ScenarioId } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { moratoriumRegion, regionAnger } from '../../src/sim/systems/anger.ts'
import { hireBlocker, salaryUsdQ, getHire } from '../../src/sim/systems/hires.ts'
import { adjustAnger } from '../../src/sim/systems/pcState.ts'
import { endQuarterPolitics } from '../../src/sim/systems/politics.ts'
import { gridQuarterRange } from '../../src/sim/systems/power.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function co(label = '2027Q2', id: ScenarioId = 's0', seed = 1): GameState {
  const s = toAct3(act2Company('2026Q4', seed), { scenario: id })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.sites.find((x) => x.id === 'site-2')!.region = 'pjm'
  return s
}
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}
function fails(s: GameState, a: Action): string {
  const r = applyAction(s, a)
  if (r.ok) throw new Error(`${a.type} applied`)
  return r.error.key
}
const end = (s: GameState) => {
  endQuarterPolitics(s)
  return s.politicalCapital
}
const lobbyCost = (id: string) =>
  CONTENT.politicalCapital.lobbying.find((x) => x.id === id)!.costUsd

describe('the meter', () => {
  it('starts at 40 and falls 2 a quarter; never under 0 or over 100', () => {
    const s = co()
    expect(s.politicalCapital).toBe(40)
    expect(end(s)).toBe(38)
    s.politicalCapital = 1
    expect(end(s)).toBe(0)
    s.politicalCapital = 99
    s.act3Gov!.pending = [{ id: 'state_delegation', pc: 15, anger: 0 }]
    expect(end(s)).toBe(98) // 99 + 15 → 100, − 2
  })

  it('the Director: Act III only, $450K a quarter, +3 a quarter (net +1) and Anger adjustment −1', () => {
    const director = getHire('gov_affairs_director')!
    expect(salaryUsdQ(director, q('2028Q1'))).toBe(450_000)
    expect(hireBlocker(act2Company('2026Q1'), 'gov_affairs_director')?.key).toBe(
      'error.act3_only',
    )
    const s = ok(co(), { type: 'HIRE', hire: 'gov_affairs_director' })
    expect(end(s)).toBe(41)
    expect(s.angerAdj).toBe(-1)
    expect(s.act3Moves).toEqual([])
  })
})

describe('lobbying (1 BW, paid now, lands at the quarter end)', () => {
  it('the coalition: $250K, +8, once per act', () => {
    const s = ok(co(), { type: 'LOBBY', id: 'trade_assoc' })
    expect(co().cash - s.cash).toBe(lobbyCost('trade_assoc'))
    expect(co().bandwidth - s.bandwidth).toBe(1)
    expect(s.politicalCapital).toBe(40) // not yet
    expect(end(s)).toBe(46) // + 8 − 2
    s.quarter += 8
    s.phase = 'plan'
    expect(fails(s, { type: 'LOBBY', id: 'trade_assoc' })).toBe('error.pc_once')
  })

  it('the state delegation and the tariff case need the Director', () => {
    expect(fails(co(), { type: 'LOBBY', id: 'state_delegation' })).toBe('error.needs_director')
    expect(fails(co(), { type: 'LOBBY', id: 'tariff_intervention' })).toBe('error.needs_director')
    let s = ok(co(), { type: 'HIRE', hire: 'gov_affairs_director' })
    s = ok(s, { type: 'LOBBY', id: 'state_delegation' })
    expect(end(s)).toBe(40 + 15 + 3 - 2)
  })

  it('the community benefits agreement: $2M, +12 and Anger adjustment −8; again only after 4 quarters', () => {
    const s = ok(co(), { type: 'LOBBY', id: 'community_benefit' })
    expect(end(s)).toBe(50)
    expect(s.angerAdj).toBe(-8)
    s.quarter += 3
    expect(fails(s, { type: 'LOBBY', id: 'community_benefit' })).toBe('error.pc_cooldown')
    s.quarter += 1
    expect(applyAction(s, { type: 'LOBBY', id: 'community_benefit' }).ok).toBe(true)
  })

  it('the tariff case: +20, or −10 when it backfires (20%, seeded on its own stream: the same every replay)', () => {
    const outcome = (seed: number) => {
      let s = ok(co('2027Q2', 's0', seed), { type: 'HIRE', hire: 'gov_affairs_director' })
      s = ok(s, { type: 'LOBBY', id: 'tariff_intervention' })
      return s.act3Gov!.pending[0].pc
    }
    const seen = new Set(Array.from({ length: 30 }, (_, i) => outcome(i + 1)))
    expect([...seen].sort((a, b) => a - b)).toEqual([-10, 20])
    for (const seed of [1, 2, 3]) expect(outcome(seed)).toBe(outcome(seed))
  })

  it('short of cash or Bandwidth: greyed', () => {
    const poor = co()
    poor.cash = 100
    expect(fails(poor, { type: 'LOBBY', id: 'trade_assoc' })).toBe('error.no_cash')
    const busy = co()
    busy.bandwidth = 0
    expect(fails(busy, { type: 'LOBBY', id: 'trade_assoc' })).toBe('error.no_bandwidth')
  })
})

describe('spending (0 BW; once every 4 quarters; greyed when short or without a target)', () => {
  const building = (o: Partial<Project> = {}): Project => ({
    id: 'project-1',
    n: 1,
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
    gpu: null,
    tier: 'mid',
    openedQuarter: q('2027Q1'),
    stage: 'building',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: 50_000_000,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: q('2027Q1'),
    readyQuarter: q('2028Q1'),
    soldQuarter: null,
    ...o,
  })

  it('fast-track the permit (15): the latest build a quarter sooner; none: greyed', () => {
    const s = co()
    expect(fails(s, { type: 'PC_SPEND', id: 'pc_fast_permit' })).toBe('error.card_no_build')
    s.projects = [building()]
    const t = ok(s, { type: 'PC_SPEND', id: 'pc_fast_permit' })
    expect(t.projects[0].readyQuarter).toBe(q('2027Q4'))
    expect(t.politicalCapital).toBe(25)
    expect(fails(t, { type: 'PC_SPEND', id: 'pc_fast_permit' })).toBe('error.pc_cooldown')
  })

  it('queue exception (25): a grid upgrade a quarter sooner, and its project with it', () => {
    const s = co()
    expect(fails(s, { type: 'PC_SPEND', id: 'pc_queue_jump' })).toBe('error.pc_no_queue')
    s.projects = [building({ power: 'grid', readyQuarter: q('2028Q3') })]
    s.sites.find((x) => x.id === 'site-2')!.powerAdds = [
      { projectId: 'project-1', kw: 5000, source: 'grid', readyQuarter: q('2028Q3') },
    ]
    const t = ok(s, { type: 'PC_SPEND', id: 'pc_queue_jump' })
    expect(t.sites.find((x) => x.id === 'site-2')!.powerAdds![0].readyQuarter).toBe(q('2028Q2'))
    expect(t.projects[0].readyQuarter).toBe(q('2028Q2'))
    expect(t.politicalCapital).toBe(15)
  })

  it('call in a favour (15): Anger adjustment −10', () => {
    const t = ok(co(), { type: 'PC_SPEND', id: 'pc_anger_shield' })
    expect(t.angerAdj).toBe(-10)
  })

  it('block the moratorium (30): ends a regional moratorium (or the water pause); none: greyed', () => {
    const s = co()
    expect(fails(s, { type: 'PC_SPEND', id: 'pc_moratorium_block' })).toBe('error.pc_no_moratorium')
    s.events.regionMoratorium = { region: 'pjm', until: s.quarter + 2 }
    const t = ok(s, { type: 'PC_SPEND', id: 'pc_moratorium_block' })
    expect(t.events.regionMoratorium!.until).toBe(s.quarter - 1)
    const w = co()
    w.projects = [building({ readyQuarter: q('2028Q3') })]
    w.act3Gov!.pause = { projectId: 'project-1', quarters: 2 }
    const u = ok(w, { type: 'PC_SPEND', id: 'pc_moratorium_block' })
    expect(u.projects[0].readyQuarter).toBe(q('2028Q1'))
    expect(u.act3Gov!.pause).toBeUndefined()
  })

  it('grid-support grant (10): +$3M once per act, needs on-site gas running', () => {
    const s = co()
    expect(fails(s, { type: 'PC_SPEND', id: 'pc_grant' })).toBe('error.pc_no_gas')
    s.sites.find((x) => x.id === 'site-2')!.powerAdds = [
      { projectId: 'project-9', kw: 5000, source: 'gas', readyQuarter: s.quarter - 1 },
    ]
    const t = ok(s, { type: 'PC_SPEND', id: 'pc_grant' })
    expect(t.cash - s.cash).toBe(3_000_000)
    t.quarter += 8
    expect(fails(t, { type: 'PC_SPEND', id: 'pc_grant' })).toBe('error.pc_once')
  })

  it('short of capital: greyed with the amount; the tariff relief is not offered in step 6', () => {
    const s = co()
    s.politicalCapital = 10
    const r = applyAction(s, { type: 'PC_SPEND', id: 'pc_anger_shield' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toEqual({ key: 'error.pc_short', params: { needed: 15, have: 10 } })
    expect(fails(co(), { type: 'PC_SPEND', id: 'pc_tariff_relief' })).toBe('error.bad_choice')
  })
})

describe('low capital (under 15) and the Anger adjustment', () => {
  it('the moratorium comes at Anger 40 in your regions; grid upgrades queue a quarter longer', () => {
    const s = co()
    s.angerAdj = 0
    // a site big enough that its Anger can be set to 45 with the adjustment (±20)
    const site = s.sites.find((x) => x.id === 'site-2')!
    for (let mw = 20; regionAnger(s, 'pjm') < 30; mw += 20) site.kw = mw * 1000
    s.angerAdj = Math.max(-20, Math.min(20, 45 - regionAnger(s, 'pjm')))
    expect(regionAnger(s, 'pjm')).toBe(45)
    const range = gridQuarterRange(s, 'pjm')
    expect(moratoriumRegion(s)).toBeUndefined()
    s.politicalCapital = 14
    expect(moratoriumRegion(s)).toBe('pjm')
    expect(gridQuarterRange(s, 'pjm')).toEqual([range[0] + 1, range[1] + 1])
  })

  it('the adjustment stays within −20…+20', () => {
    const s = co()
    adjustAnger(s, -50)
    expect(s.angerAdj).toBe(BALANCE.act3.politicalCapital.angerAdj.min)
    adjustAnger(s, 100)
    expect(s.angerAdj).toBe(20)
  })
})
