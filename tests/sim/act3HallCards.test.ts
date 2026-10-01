// M16.4: the step-5 card effects, each played through the real card engine (RESOLVE_INTERRUPT on the card's
// opaque id), with a target and without one (the choice is greyed with a reason, through blockedEventChoices).
import { describe, expect, it } from 'vitest'
import { CONTENT, type ScenarioId } from '../../src/content/index.ts'
import { act3CardEngineId } from '../../src/content/act3Cards.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { rackPriceUsd } from '../../src/sim/systems/cardHalls.ts'
import { blockedEventChoices } from '../../src/sim/systems/events.ts'
import {
  gpuResidualUsd,
  projectCapex,
} from '../../src/sim/systems/projects.ts'
import { convertibleKw } from '../../src/sim/systems/hosting.ts'
import { payReservationWeek } from '../../src/sim/systems/mwUse.ts'
import { capacityKw, poweredKw, regionOf } from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** An Act III company (an empty 20 MW site, $500M) on `id` at `label`, with `projects`. */
function co(id: ScenarioId, label: string, projects: Partial<Project>[] = []) {
  const s = toAct3(act2Company('2026Q4'), { scenario: id })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.projects = projects.map((o, i) => ({
    id: `project-${i + 1}`,
    n: i + 1,
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
    gpu: null,
    openedQuarter: q('2024Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: 50_000_000,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: q('2024Q2'),
    readyQuarter: q('2024Q4'),
    soldQuarter: null,
    tier: 'low',
    ...o,
  }))
  return s
}

/** Shows the card in week 2 of the live quarter. */
function show(s: GameState, card: string): GameState {
  s.phase = 'live'
  s.week = 2
  s.interrupt = {
    id: 'event',
    event: act3CardEngineId(card),
    week: 1,
    coin: 'BTC',
    changePct: 0,
  }
  return s
}
const play = (s: GameState, card: string, c: string) =>
  ok(show(s, card), { type: 'RESOLVE_INTERRUPT', choice: c })
const greyed = (s: GameState, card: string, c: string) =>
  blockedEventChoices(show(s, card)).find((b) => b.id === c)?.blocker.key

describe('retrofit (s0_c7, s3_c3 low → mid; sh_4 mid → top)', () => {
  it('s0_c7: the largest live low-tier hall (tie: lowest number), its "-1500000*mw" is the payment, no Bandwidth', () => {
    const s = co('s0', '2029Q1', [
      { kw: 5000 },
      { kw: 8000 },
      { kw: 8000 },
      { kw: 20_000, tier: 'mid' },
    ])
    const t = play(s, 's0_c7', 'c1')
    const p = t.projects.find((x) => x.downtime)!
    expect(p.n).toBe(2)
    expect(p.downtime).toMatchObject({ kind: 'retrofit', weeks: 10, toTier: 'mid' })
    expect(s.cash - t.cash).toBe(12_000_000)
    expect(t.bandwidth).toBe(s.bandwidth)
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['retrofit'])
  })

  it('s3_c3 "Retrofit to inference-friendly mid tier": no cash key, so the normal 1.5M × MW', () => {
    const s = co('s3', '2027Q4', [{ kw: 10_000 }])
    const t = play(s, 's3_c3', 'c3')
    expect(s.cash - t.cash).toBe(15_000_000)
    expect(t.projects[0].downtime!.toTier).toBe('mid')
  })

  it('sh_4 "Plan a top-tier hall": the largest live mid-tier hall, at the quarter’s mid→top $/MW', () => {
    const s = co('s2', '2028Q2', [{ kw: 10_000, tier: 'mid' }, { kw: 30_000 }])
    const perMw =
      CONTENT.act3Scenarios.s2.quarterly[5].capex_retrofit_density_mid_to_top_usd_mw!
    const t = play(s, 'sh_4', 'c1')
    expect(t.projects[0].downtime).toMatchObject({ weeks: 26, toTier: 'top' })
    expect(t.projects[1].downtime).toBeUndefined()
    expect(s.cash - t.cash).toBe(Math.round(perMw * 10))
  })

  it('no target: greyed with the reason (no low hall; a hall under a GPU contract or already in work does not count)', () => {
    expect(greyed(co('s0', '2029Q1', [{ tier: 'mid' }]), 's0_c7', 'c1')).toBe(
      'error.card_no_hall',
    )
    const busy = co('s0', '2029Q1', [{}])
    busy.projects[0].downtime = { kind: 'refit', fromQuarter: q('2029Q1'), weeks: 5 }
    expect(greyed(busy, 's0_c7', 'c1')).toBe('error.card_no_hall')
    expect(greyed(co('s2', '2028Q2', [{}]), 'sh_4', 'c1')).toBe('error.card_no_hall')
    const poor = co('s0', '2029Q1', [{}])
    poor.cash = 1_000_000
    expect(greyed(poor, 's0_c7', 'c1')).toBe('error.no_cash')
  })
})

describe('gpu_resale_mult (s0_c8 "Sell some Blackwell now", × 0.97)', () => {
  const blackwell = (o: Partial<Project> = {}): Partial<Project> => ({
    kind: 'cloud',
    gpu: 'b200',
    tier: 'mid',
    gpuCount: 3750,
    gpuCapexUsd: 3750 * 36_000,
    ...o,
  })

  it('the largest live B200 cluster with no GPU contract ends as a GPU sale at the sale value × 0.97; its MW go idle', () => {
    const s = co('s0', '2029Q4', [
      blackwell({ kw: 3000 }),
      blackwell({ kw: 5000 }),
      { kind: 'cloud', gpu: 'h100', kw: 9000 },
    ])
    const value = Math.round(gpuResidualUsd(s.projects[1], s.quarter) * 0.97)
    const t = play(s, 's0_c8', 'c2')
    expect(t.projects[1].stage).toBe('ended')
    expect(t.projects[0].stage).toBe('live')
    expect(t.cash - s.cash).toBe(value)
    expect(convertibleKw(t, 'site-2')).toBe(convertibleKw(s, 'site-2') + 5000)
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['sale_voluntary'])
  })

  it('no target (no Blackwell, or only under a GPU contract): greyed', () => {
    expect(greyed(co('s0', '2029Q4', [{ kind: 'cloud', gpu: 'h100' }]), 's0_c8', 'c2')).toBe(
      'error.card_no_gpus',
    )
    const contracted = co('s0', '2029Q4', [
      blackwell({
        tenant: {
          card: 'tc_frontier_intelligence',
          signedQuarter: q('2029Q1'),
          readyByQuarter: q('2029Q1'),
          gpu: { gpus: 3750, priceUsdHr: 4, termQuarters: 12 },
          lateQuarters: 0,
          walkRolled: true,
          prepaymentLeftUsd: 0,
          servedQuarters: 2,
        },
      }),
    ])
    expect(greyed(contracted, 's0_c8', 'c2')).toBe('error.card_no_gpus')
  })
})

describe('delay_quarters < 0 (s1_c2 "Pre-order Rubin"; s2_c4 "Order turbines now")', () => {
  const building = (o: Partial<Project>): Partial<Project> => ({
    stage: 'building',
    tier: 'mid',
    startQuarter: q('2027Q3'),
    ...o,
  })

  it('s1_c2: the build with the latest ready quarter (tie: larger capex) is ready a quarter sooner for 6% of its capex', () => {
    const s = co('s1', '2027Q4', [
      building({ readyQuarter: q('2028Q3'), capexUsd: 80_000_000 }),
      building({ readyQuarter: q('2028Q4'), capexUsd: 50_000_000 }),
      building({ readyQuarter: q('2028Q4'), capexUsd: 70_000_000 }),
    ])
    const t = play(s, 's1_c2', 'c1')
    expect(t.projects.map((p) => CONTENT.quarters[p.readyQuarter!])).toEqual([
      '2028Q3',
      '2028Q4',
      '2028Q3',
    ])
    expect(s.cash - t.cash).toBe(Math.round(0.06 * 70_000_000))
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['project_accelerate'])
  })

  it('s2_c4: 15% of the target’s power cost with a Power slot, else of its shell build cost', () => {
    const withPower = co('s2', '2028Q4', [
      building({ readyQuarter: q('2029Q3'), power: 'gas', kw: 10_000 }),
    ])
    const gasUsd = CONTENT.projects.power.gas.capexUsdMw * 10
    const t = play(withPower, 's2_c4', 'c1')
    expect(withPower.cash - t.cash).toBe(Math.round(0.15 * gasUsd))
    expect(CONTENT.quarters[t.projects[0].readyQuarter!]).toBe('2029Q2')
    const shell = co('s2', '2028Q4', [
      building({ readyQuarter: q('2029Q3'), kw: 10_000 }),
    ])
    const shellUsd = projectCapex(shell, shell.projects[0], q('2027Q3')).retrofitUsd
    const u = play(shell, 's2_c4', 'c1')
    expect(shell.cash - u.cash).toBe(Math.round(0.15 * shellUsd))
  })

  it('no target: nothing building, or the only build is due next quarter already', () => {
    expect(greyed(co('s1', '2027Q4', [{}]), 's1_c2', 'c1')).toBe('error.card_no_build')
    expect(
      greyed(co('s1', '2027Q4', [building({ readyQuarter: q('2028Q1') })]), 's1_c2', 'c1'),
    ).toBe('error.card_no_build')
  })
})

describe('gpu_rack (s1_c8 one Rubin rack; s3_c7 "Buy inventory", −$40M)', () => {
  it('s1_c8: one rack (72 GPUs, 80 kW) opens a live mid-tier Rubin pilot at the site with the most free kW; charged the rack price', () => {
    const s = co('s1', '2029Q4', [])
    const price = rackPriceUsd(s)!
    const t = play(s, 's1_c8', 'c1')
    const p = t.projects.at(-1)!
    expect(p).toMatchObject({
      kind: 'pilot',
      gpu: 'rubin_nvl144',
      gpuCount: 72,
      kw: 80,
      tier: 'mid',
      stage: 'live',
      siteId: 'site-2',
    })
    expect(s.cash - t.cash).toBe(price)
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['gpu_buy'])
  })

  it('s3_c7: as many racks as $40M buys at the quarter’s price, charged racks × price (not the $40M)', () => {
    const s = co('s3', '2029Q2', [])
    const price = rackPriceUsd(s)!
    const racks = Math.floor(40_000_000 / price)
    const t = play(s, 's3_c7', 'c1')
    const p = t.projects.at(-1)!
    expect(p.gpuCount).toBe(72 * racks)
    expect(p.kw).toBe(Math.ceil(((72 * racks) / 900) * 1000))
    expect(s.cash - t.cash).toBe(racks * price)
  })

  it('no room: greyed when no site has the free kW', () => {
    const s = co('s1', '2029Q4', [{ kw: 20_000 }])
    expect(greyed(s, 's1_c8', 'c1')).toBe('error.card_no_room')
  })
})

describe('capex_mw (s3_c5 30 MW, s3_c8 10 MW): a new hall that brings its MW', () => {
  it('a proposed mid-tier shell at the site with the most energized MW, with its MW added; greenfield $/MW', () => {
    const s = co('s3', '2028Q3', [])
    const before = poweredKw(s.sites.find((x) => x.id === 'site-2')!, s.quarter)
    const t = play(s, 's3_c5', 'c1')
    const p = t.projects.at(-1)!
    expect(p).toMatchObject({
      kind: 'shell',
      stage: 'proposed',
      tier: 'mid',
      kw: 30_000,
      greenfield: true,
      siteId: 'site-2',
    })
    const site = t.sites.find((x) => x.id === 'site-2')!
    expect(poweredKw(site, t.quarter)).toBe(before + 30_000)
    expect(t.bandwidth).toBe(s.bandwidth)
    const row = CONTENT.act3Scenarios.s3.quarterly[6]
    expect(projectCapex(t, p).retrofitUsd).toBeCloseTo(
      row.capex_greenfield_shell_usd_mw * 30,
      2,
    )
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['project_commit'])
  })

  it('its MW pay no power reservation while the hall is only proposed; from its build start they do (M17.0, DT answer 8)', () => {
    const s = co('s3', '2028Q3', [])
    const before = payReservationWeek(structuredClone(s))
    const t = play(s, 's3_c5', 'c1')
    expect(payReservationWeek(structuredClone(t))).toBeCloseTo(before, 6)
    const building = structuredClone(t)
    const p = building.projects.at(-1)!
    p.stage = 'building'
    p.startQuarter = building.quarter
    p.readyQuarter = building.quarter + 2
    expect(payReservationWeek(structuredClone(building))).toBeGreaterThan(before)
  })

  it('cancelling the proposal takes its MW away again', () => {
    const t = play(co('s3', '2030Q1', []), 's3_c8', 'c1')
    const site = () => t.sites.find((x) => x.id === 'site-2')!
    const withHall = capacityKw(site())
    t.phase = 'plan'
    const u = ok(t, { type: 'PROJECT_CANCEL', projectId: t.projects.at(-1)!.id })
    expect(capacityKw(u.sites.find((x) => x.id === 'site-2')!)).toBe(withHall - 10_000)
  })

  it('a card with its only choice closed (s3_c8, no energized site) is still answered: the default changes nothing (M16.6)', () => {
    const s = co('s3', '2030Q1', [])
    s.sites = s.sites.filter((x) => x.id !== 'site-2')
    show(s, 's3_c8')
    expect(blockedEventChoices(s)).toEqual([])
    const t = play(s, 's3_c8', 'c1')
    expect(t.projects).toEqual(s.projects)
    expect(t.log.some((e) => e.key === 'log.card_no_target')).toBe(true)
  })

  it('building it: no grid queue for its MW (they are already energized)', () => {
    const t = play(co('s3', '2028Q3', []), 's3_c5', 'c1')
    const add = t.sites.find((x) => x.id === 'site-2')!.powerAdds![0]
    expect(add).toMatchObject({ card: true, kw: 30_000, readyQuarter: q('2028Q3') })
  })
})

describe('mw (s1_c6 "Bid with cash": 60 MW, $180M)', () => {
  it('a new distressed campus: 60 MW energized and idle, no flaw, in the largest site’s region; $180M; no Bandwidth', () => {
    const s = co('s1', '2028Q3', [])
    const t = play(s, 's1_c6', 'c1')
    const site = t.sites.at(-1)!
    expect(site).toMatchObject({
      category: 'distressed_campus',
      kw: 60_000,
      flaw: null,
      readyQuarter: q('2028Q3'),
      region: regionOf(s.sites.find((x) => x.id === 'site-2')!) ?? 'ercot',
    })
    expect(poweredKw(site, t.quarter)).toBe(60_000)
    expect(convertibleKw(t, site.id)).toBe(60_000)
    expect(s.cash - t.cash).toBe(180_000_000)
    expect(t.bandwidth).toBe(s.bandwidth)
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['distressed_buy'])
  })

  it('short of cash: greyed', () => {
    const s = co('s1', '2028Q3', [])
    s.cash = 100_000_000
    expect(greyed(s, 's1_c6', 'c1')).toBe('error.no_cash')
  })
})
