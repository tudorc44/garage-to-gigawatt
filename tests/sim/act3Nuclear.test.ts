// M17.2: the nuclear PPA, a third new-power source in the Power slot (Act III, from 2027Q3, in PJM, Ohio,
// Georgia and the Nordics): signed at the build start at the quarter's price for 60 quarters, energized 8
// weeks after the build starts, take-or-pay 90%; clouds pay the PPA price, shell tenants reimburse the
// market price; tenant pull; Anger −5 per region; it survives its project's end and goes with a sale.
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
  settlePpas,
} from '../../src/sim/systems/nuclear.ts'
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

describe('take-or-pay 90%', () => {
  it('used 0 (an empty shell), half and full: price × max(used, 0.9 × contracted) × 2,190 h', () => {
    const s = co('2028Q1')
    s.projects = [project({ kind: 'shell', gpu: null, tenant: null })]
    const x = ppa({}, s)
    expect(ppaQuarterNetUsd(s, x).billUsd).toBeCloseTo(120 * 9 * H, 4)
    // half: a 5 MW cloud on a 10 MW PPA
    s.projects = [project({ kw: 5_000 })]
    expect(ppaQuarterNetUsd(s, x).billUsd).toBeCloseTo(120 * 9 * H, 4)
    expect(ppaQuarterNetUsd(s, x).usedKw).toBe(5_000)
    // full: the cloud uses all 10 MW, so the bill is on 10 MW; it paid that weekly, so the net top-up is 0
    s.projects = [project({})]
    expect(ppaQuarterNetUsd(s, x).billUsd).toBeCloseTo(120 * 10 * H, 4)
    expect(ppaQuarterNetUsd(s, x).netUsd).toBe(0)
    // half again, the net: the unused 4 MW of the 90% floor
    s.projects = [project({ kw: 5_000 })]
    expect(ppaQuarterNetUsd(s, x).netUsd).toBeCloseTo(120 * 4 * H, 4)
  })

  it('a retrofitting hall uses 0 MW', () => {
    const s = co('2028Q1')
    s.projects = [project({ downtime: { kind: 'retrofit', fromQuarter: q('2028Q1'), weeks: 10, toTier: 'top' } })]
    const x = ppa({}, s)
    expect(ppaQuarterNetUsd(s, x).usedKw).toBe(0)
  })

  it('settled at the quarter end into the AI costs (EBITDA) and cash', () => {
    const s = co('2028Q1')
    s.projects = [project({ kind: 'shell', gpu: null, tenant: null })]
    ppa({}, s)
    const cash = s.cash
    settlePpas(s)
    expect(cash - s.cash).toBeCloseTo(120 * 9 * H, 2)
    expect(s.quarterStats.aiCostUsd).toBeCloseTo(120 * 9 * H, 2)
  })
})

describe('who pays: clouds pay the PPA price; shell tenants reimburse the market price', () => {
  it('a cloud’s weekly power on PPA MW costs the PPA price (× PUE)', () => {
    const s = co('2028Q1')
    s.projects = [project({})]
    const market = settleProjectsWeek(structuredClone(s)).costUsd
    ppa({ priceUsdMwh: 200 }, s)
    const withPpa = settleProjectsWeek(structuredClone(s)).costUsd
    const site = s.sites.find((x) => x.id === 'site-2')!
    const kwh = 10_000 * BALANCE.projects.cloudPue * 24 * 7
    expect(withPpa - market).toBeCloseTo(
      kwh * (0.2 - powerPriceUsdKwh(site, s.quarter, 's0')),
      2,
    )
  })

  it('a leased shell: the spread (market − PPA) × used MWh, negative when the market is cheaper', () => {
    const s = co('2028Q1')
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
  it('the project ends: it stays at take-or-pay (used 0) until a new project on the site takes it', () => {
    const s = co('2028Q1')
    s.projects = [project({ stage: 'ended' })]
    const x = ppa({}, s)
    expect(ppaQuarterNetUsd(s, x).netUsd).toBeCloseTo(120 * 9 * H, 4)
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
