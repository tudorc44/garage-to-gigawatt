// M17.2: the nuclear PPA, a third new-power source in the Power slot (Act III, from 2027Q3, in PJM, Ohio,
// Georgia and the Nordics): signed at the build start at the quarter's price for 60 quarters, energized 8
// weeks after the build starts, take-or-pay 90%; clouds pay the PPA price, shell tenants reimburse the
// market price; tenant pull; Anger −5 per region; it survives its project's end and goes with a sale.
// M17.8: loads pay the market weekly and the PPA settles the used MW at its price; unused MW are resold.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  type PowerRegion,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { ppaRows } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type Ppa, type Project } from '../../src/sim/state.ts'
import { regionAnger } from '../../src/sim/systems/anger.ts'
import {
  activePpas,
  ppaQuarterNetUsd,
  ppaResaleUsdMwh,
  ppaUsedKw,
  settlePpas,
} from '../../src/sim/systems/nuclear.ts'
import { getModel } from '../../src/sim/systems/market.ts'
import {
  act3LeaseMult,
  drawOffers,
  settleProjectsWeek,
} from '../../src/sim/systems/projects.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const H = BALANCE.act3.nuclear.hoursPerQuarter

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** An Act III company on `id` at `label` whose 20 MW site is in `region`. */
function co(label: string, region: PowerRegion = 'pjm', id: ScenarioId = 's0'): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: id })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.sites.find((x) => x.id === 'site-2')!.region = region
  return s
}

const csvPrice = (id: ScenarioId, label: string) =>
  CONTENT.act3Scenarios[id].quarterly[q(label) - q('2027Q1')].nuclear_ppa_usd_mwh!

function project(o: Partial<Project>): Project {
  return {
    id: 'project-1',
    n: 1,
    siteId: 'site-2',
    kw: 10_000,
    kind: 'cloud',
    gpu: 'h100',
    tier: 'mid',
    openedQuarter: q('2027Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: true,
    capital: 'cash',
    capexUsd: 0,
    gpuCapexUsd: 7500 * 28_000,
    gpuCount: 7500,
    startQuarter: q('2027Q1'),
    readyQuarter: q('2027Q2'),
    soldQuarter: null,
    ...o,
  }
}

function ppa(o: Partial<Ppa>, s: GameState): Ppa {
  const x: Ppa = {
    id: 'ppa-1',
    siteId: 'site-2',
    kw: 10_000,
    priceUsdMwh: 120,
    signedQuarter: s.quarter - 1,
    fromQuarter: s.quarter,
    endQuarter: s.quarter + 58,
    projectId: 'project-1',
    ...o,
  }
  s.ppas = [...(s.ppas ?? []), x]
  return x
}

const hyperscaler = CONTENT.projects.tenantCards.find((c) => c.type === 'hyperscaler')!
const lease = (): NonNullable<Project['tenant']> => ({
  card: hyperscaler.id,
  signedQuarter: q('2027Q1'),
  readyByQuarter: q('2027Q1'),
  lateQuarters: 0,
  walkRolled: true,
  prepaymentLeftUsd: 0,
  servedQuarters: 1,
  termQuarters: 40,
})

describe('availability (from 2027Q3, four regions)', () => {
  const open = (s: GameState) =>
    applyAction(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 10_000,
      kind: 'shell',
      power: 'nuclear',
    })
  it('before 2027Q3: "Available from 2027Q3."', () => {
    const r = open(co('2027Q2'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toEqual({ key: 'error.nuclear_early', params: { quarter: '2027Q3' } })
  })
  it('ERCOT and Arizona: offered only in PJM, Ohio, Georgia and the Nordics', () => {
    for (const region of ['ercot', 'arizona'] as const) {
      const r = open(co('2027Q3', region))
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.key).toBe('error.nuclear_region')
    }
    for (const region of ['pjm', 'ohio', 'georgia', 'nordics'] as const)
      expect(open(co('2027Q3', region)).ok).toBe(true)
  })
  it('outside Act III there is no PPA', () => {
    const s = act2Company('2026Q1')
    s.sites[1].region = 'pjm'
    expect(
      applyAction(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 1000, kind: 'shell', power: 'nuclear' }).ok,
    ).toBe(false)
  })
})

describe('signing at the build start', () => {
  it('this quarter’s price, 60 quarters, no capex, energized next quarter, never later than the build', () => {
    const base = co('2027Q3')
    const build = (power?: 'nuclear') => {
      let s = ok(base, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 10_000,
        kind: 'cloud',
        gpu: 'h100',
        ...(power ? { power } : {}),
      })
      s = ok(s, { type: 'PROJECT_SPOT', projectId: 'project-1' })
      s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
      return ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    }
    const s = build('nuclear')
    const plain = build()
    const p = s.projects[0]
    expect(p.capexUsd).toBe(plain.projects[0].capexUsd) // no capex for the power
    expect(p.readyQuarter).toBe(plain.projects[0].readyQuarter) // no delay beyond the build
    const add = s.sites.find((x) => x.id === 'site-2')!.powerAdds![0]
    expect(add).toMatchObject({ source: 'nuclear', kw: 10_000, readyQuarter: q('2027Q4') })
    expect(s.ppas).toEqual([
      {
        id: expect.any(String),
        siteId: 'site-2',
        kw: 10_000,
        priceUsdMwh: csvPrice('s0', '2027Q3'),
        signedQuarter: q('2027Q3'),
        fromQuarter: p.readyQuarter,
        endQuarter: q('2027Q3') + 59,
        projectId: 'project-1',
      },
    ])
    expect(ppaRows(s)[0].endQuarterLabel).toBe('2042Q2')
    // it can't be cancelled: the project has started; and the move log has only the build
    expect(s.act3Moves!.map((m) => m.kind)).toEqual(['project_commit'])
  })
})

/** The 20 MW site cut to 10 MW, so all its power is the 10 MW PPA's (its loads use the PPA MW at once). */
function allPpa(s: GameState): GameState {
  s.sites.find((x) => x.id === 'site-2')!.soldKw = 10_000
  return s
}
const site2 = (s: GameState) => s.sites.find((x) => x.id === 'site-2')!
const market = (s: GameState) => powerPriceUsdKwh(site2(s), s.quarter, 's0') * 1000

describe('take-or-pay 90%, the unused power resold (M17.8 C)', () => {
  it('used 0 (an empty shell), half and full: bill on max(used, 0.9 × contracted); unused resold at 0.9 × energy', () => {
    const s = allPpa(co('2028Q1'))
    s.projects = [project({ kind: 'shell', gpu: null, tenant: null })]
    const x = ppa({}, s)
    const resale = ppaResaleUsdMwh(s, site2(s))
    const energy = CONTENT.act3Scenarios.s0.quarterly[q('2028Q1') - q('2027Q1')].power_usd_kwh_pjm
    expect(resale).toBeCloseTo(0.9 * energy * 1000, 6) // no capacity charge in it
    // used 0: 9 MW paid for, all resold
    let r = ppaQuarterNetUsd(s, x)
    expect(r.billUsd).toBeCloseTo(120 * 9 * H, 4)
    expect(r.unusedKw).toBeCloseTo(9_000, 6)
    expect(r.resoldUsd).toBeCloseTo(resale * 9 * H, 4)
    expect(r.netUsd).toBeCloseTo((120 - resale) * 9 * H, 4)
    // half: a 5 MW cloud on a 10 MW PPA: 4 MW resold; the 5 MW used paid the market weekly
    s.projects = [project({ kw: 5_000 })]
    r = ppaQuarterNetUsd(s, x)
    expect(r.usedKw).toBe(5_000)
    expect(r.billUsd).toBeCloseTo(120 * 9 * H, 4)
    expect(r.resoldUsd).toBeCloseTo(resale * 4 * H, 4)
    expect(r.netUsd).toBeCloseTo(120 * 9 * H - market(s) * 5 * H - resale * 4 * H, 4)
    // full: the bill on 10 MW, nothing resold; the net is the PPA price less the market already paid
    s.projects = [project({})]
    r = ppaQuarterNetUsd(s, x)
    expect(r.billUsd).toBeCloseTo(120 * 10 * H, 4)
    expect(r.resoldUsd).toBe(0)
    expect(r.netUsd).toBeCloseTo((120 - market(s)) * 10 * H, 4)
  })

  it('a hall in downtime draws only the share of the quarter it runs', () => {
    const s = allPpa(co('2028Q1'))
    s.projects = [project({ downtime: { kind: 'retrofit', fromQuarter: q('2028Q1'), weeks: 13, toTier: 'top' } })]
    const x = ppa({}, s)
    expect(ppaQuarterNetUsd(s, x).usedKw).toBe(0)
    s.projects[0].downtime!.weeks = 10
    expect(ppaQuarterNetUsd(s, x).usedKw).toBeCloseTo(10_000 * (3 / 13), 6)
  })

  it('settled at the quarter end into the AI costs (EBITDA) and cash; the resale on its own report line', () => {
    const s = allPpa(co('2028Q1'))
    s.projects = [project({ kind: 'shell', gpu: null, tenant: null })]
    ppa({}, s)
    const net = (120 - ppaResaleUsdMwh(s, site2(s))) * 9 * H
    const cash = s.cash
    settlePpas(s)
    expect(cash - s.cash).toBeCloseTo(net, 2)
    expect(s.quarterStats.aiCostUsd).toBeCloseTo(net, 2)
    const keys = s.log.slice(-2).map((e) => e.key)
    expect(keys).toEqual(['log.ppa_bill', 'log.ppa_resold'])
    expect(ppaRows(s)[0].resoldUsd).toBeCloseTo(ppaResaleUsdMwh(s, site2(s)) * 9 * H, 2)
  })
})

describe('who pays: every load pays the market weekly; the PPA settles the used MW at its price', () => {
  it('a cloud’s weekly power is at the market price, PPA or not; the quarter’s net makes the used MW cost the PPA price', () => {
    const s = allPpa(co('2028Q1'))
    s.projects = [project({})]
    const plain = settleProjectsWeek(structuredClone(s)).costUsd
    const x = ppa({ priceUsdMwh: 200 }, s)
    expect(settleProjectsWeek(structuredClone(s)).costUsd).toBeCloseTo(plain, 6)
    expect(ppaQuarterNetUsd(s, x).netUsd).toBeCloseTo((200 - market(s)) * 10 * H, 2)
  })

  it('a leased shell: the spread (market − PPA) × used MWh, negative when the market is cheaper', () => {
    const s = allPpa(co('2028Q1'))
    s.projects = [project({ kind: 'shell', gpu: null, tenant: lease() })]
    const site = s.sites.find((x) => x.id === 'site-2')!
    const market = powerPriceUsdKwh(site, s.quarter, 's0') * 1000
    const above = ppa({ priceUsdMwh: market - 20 }, s)
    expect(ppaQuarterNetUsd(s, above).netUsd).toBeCloseTo(-20 * 10 * H, 2) // a gain
    s.ppas = []
    const below = ppa({ priceUsdMwh: market + 30 }, s)
    expect(ppaQuarterNetUsd(s, below).netUsd).toBeCloseTo(30 * 10 * H, 2) // a cost
  })
})

describe('tenant pull and Anger', () => {
  it('a shell on PPA power draws one more offer; a hyperscaler lease there × 1.03', () => {
    const s = co('2028Q1')
    const shell = project({ kind: 'shell', gpu: null, stage: 'proposed', id: 'project-1' })
    s.projects = [shell]
    drawOffers(s, shell)
    const plain = shell.offers.length
    shell.power = 'nuclear'
    drawOffers(s, shell)
    expect(shell.offers.length).toBe(plain + 1)
    expect(act3LeaseMult(s, shell, hyperscaler)).toBe(1.03)
    const lab = CONTENT.projects.tenantCards.find((c) => c.type === 'ai_lab')!
    expect(act3LeaseMult(s, shell, lab)).toBe(1)
  })

  it('Ratepayer Anger −5 in a region with a PPA, once however many', () => {
    const s = co('2028Q1')
    s.angerAdj = 0
    const before = regionAnger(s, 'pjm')
    ppa({ id: 'ppa-1' }, s)
    ppa({ id: 'ppa-2', projectId: null }, s)
    expect(regionAnger(s, 'pjm')).toBe(Math.max(0, before - 5))
    expect(regionAnger(s, 'ohio')).toBe(regionAnger(co('2028Q1'), 'ohio'))
  })
})

describe('a PPA outlives its project', () => {
  it('the project ends: it stays at take-or-pay (used 0, resold) until a new project on the site takes it', () => {
    const s = co('2028Q1')
    s.projects = [project({ stage: 'ended' })]
    const x = ppa({}, s)
    expect(ppaQuarterNetUsd(s, x).netUsd).toBeCloseTo(
      (120 - ppaResaleUsdMwh(s, site2(s))) * 9 * H,
      4,
    )
    const t = ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 8_000, kind: 'shell' })
    expect(activePpas(t)[0].projectId).toBe(t.projects.at(-1)!.id)
  })

  it('the project is sold: the PPA goes with it', () => {
    const s = co('2028Q1')
    s.projects = [project({ stage: 'sold' })]
    ppa({}, s)
    expect(activePpas(s)).toEqual([])
    settlePpas(s)
    expect(s.ppas).toEqual([])
  })
})

describe('mining on PPA MW (M17.8 E): every load uses the site’s other power first, the PPA MW last', () => {
  /** site-2 (20 MW of grid) with a stranded 10 MW PPA on top (sh_2's shape), and `kw` of earning S9s. */
  function mining(kw: number): { s: GameState; x: Ppa } {
    const s = co('2028Q1')
    const site = site2(s)
    const x = ppa({ id: 'ppa-9', projectId: null }, s)
    site.powerAdds = [
      { projectId: x.id, kw: 10_000, source: 'nuclear', readyQuarter: q('2027Q4'), ppaId: x.id },
    ]
    const perUnit = getModel('s9')!.power_kw
    s.machines = [
      {
        id: 'lot-9',
        model: 's9',
        siteId: 'site-2',
        condition: 'new',
        count: Math.round(kw / perUnit),
        failed: 0,
        earnsFromQuarter: 0,
      },
    ]
    return { s, x }
  }

  it('used PPA MW = min(contracted, max(0, drawn − the site’s non-PPA MW))', () => {
    const perUnit = getModel('s9')!.power_kw
    const drawn = (kw: number) => Math.round(kw / perUnit) * perUnit
    // 15 MW of miners on 20 MW of grid: the PPA stays idle
    expect(ppaUsedKw(mining(15_000).s, mining(15_000).x)).toBe(0)
    // 25 MW: 5 MW spill onto the PPA
    let m = mining(25_000)
    expect(ppaUsedKw(m.s, m.x)).toBeCloseTo(drawn(25_000) - 20_000, 6)
    // 40 MW: capped at the 10 MW contracted
    m = mining(40_000)
    expect(ppaUsedKw(m.s, m.x)).toBe(10_000)
    // switched-off miners draw nothing
    m.s.machines[0].idle = true
    expect(ppaUsedKw(m.s, m.x)).toBe(0)
  })

  it('mining on those MW pays the PPA price: the market paid weekly is refunded on them', () => {
    const { s, x } = mining(40_000)
    expect(ppaQuarterNetUsd(s, x).netUsd).toBeCloseTo((120 - market(s)) * 10 * H, 2)
  })
})
