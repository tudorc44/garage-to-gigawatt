// M17.5: the step-6 card effects, each through the real card engine, with a target and without one (greyed with
// a reason): the nuclear PPA cards, sh_2's 100 MW, ppa_savings, the political-capital cost, the Anger deal and the
// hire.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT, type PowerRegion } from '../../src/content/index.ts'
import { act3CardEngineId } from '../../src/content/act3Cards.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { blockedEventChoices } from '../../src/sim/systems/events.ts'
import { payReservationWeek } from '../../src/sim/systems/mwUse.ts'
import { activePpas, ppaQuarterNetUsd } from '../../src/sim/systems/nuclear.ts'
import { powerPriceUsdKwh, poweredKw } from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const H = BALANCE.act3.nuclear.hoursPerQuarter

function co(label: string, region: PowerRegion = 'pjm', projects: Partial<Project>[] = []) {
  const s = toAct3(act2Company('2026Q4'), { scenario: 's2' })
  s.quarter = q(label)
  s.bandwidth = 6
  s.act3Renewals = []
  s.sites.find((x) => x.id === 'site-2')!.region = region
  s.projects = projects.map((o, i) => ({
    id: `project-${i + 1}`,
    n: i + 1,
    siteId: 'site-2',
    kw: 5000,
    kind: 'cloud',
    gpu: 'h100',
    tier: 'mid',
    openedQuarter: q('2027Q1'),
    stage: 'live',
    offers: [],
    tenant: null,
    spot: true,
    capital: 'cash',
    capexUsd: 50_000_000,
    gpuCapexUsd: 3750 * 28_000,
    gpuCount: 3750,
    startQuarter: q('2027Q1'),
    readyQuarter: q('2027Q2'),
    soldQuarter: null,
    ...o,
  }))
  return s
}
function show(s: GameState, card: string): GameState {
  s.phase = 'live'
  s.week = 2
  s.interrupt = { id: 'event', event: act3CardEngineId(card), week: 1, coin: 'BTC', changePct: 0 }
  return s
}
function play(s: GameState, card: string, c: string): GameState {
  const r = applyAction(show(s, card), { type: 'RESOLVE_INTERRUPT', choice: c } as Action)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
const greyed = (s: GameState, card: string, c: string) =>
  blockedEventChoices(show(s, card)).find((b) => b.id === c)?.blocker.key
const nuclear2027Q3 = CONTENT.act3Scenarios.s2.quarterly[2].nuclear_ppa_usd_mwh!

describe('power_option nuclear_ppa (s2_c1, s3_c2)', () => {
  it('your largest live or building project in an eligible region with no PPA switches to a PPA at this quarter’s price, from next quarter; logs power_lock', () => {
    const s = co('2027Q3', 'pjm', [{ kw: 5000 }, { kw: 8000, stage: 'building' }])
    const t = play(s, 's2_c1', 'c1')
    expect(activePpas(t)).toEqual([
      expect.objectContaining({
        projectId: 'project-2',
        kw: 8000,
        priceUsdMwh: nuclear2027Q3,
        signedQuarter: q('2027Q3'),
        fromQuarter: q('2027Q4'),
        endQuarter: q('2027Q3') + 59,
      }),
    ])
    expect(t.act3Moves!.map((m) => m.kind)).toEqual(['power_lock'])
  })

  it('no target: none in an eligible region (or all have a PPA): greyed', () => {
    expect(greyed(co('2027Q3', 'ercot', [{}]), 's2_c1', 'c1')).toBe('error.card_no_ppa_project')
    expect(greyed(co('2027Q3', 'pjm', []), 's3_c2', 'c1')).toBe('error.card_no_ppa_project')
  })
})

describe('sh_2 "Sign a 100MW PPA": the stranded-PPA test', () => {
  it('100 MW of PPA power at your largest eligible site, energized next quarter, idle: take-or-pay 90% from then, no reservation on them', () => {
    const s = co('2027Q3', 'ohio')
    const t = play(s, 'sh_2', 'c1')
    const x = activePpas(t)[0]
    expect(x).toMatchObject({ projectId: null, kw: 100_000, fromQuarter: q('2027Q4') })
    const site = t.sites.find((y) => y.id === 'site-2')!
    expect(poweredKw(site, q('2027Q4')) - poweredKw(site, q('2027Q3'))).toBe(100_000)
    t.quarter = q('2027Q4')
    expect(ppaQuarterNetUsd(t, x).netUsd).toBeCloseTo(x.priceUsdMwh * 90 * H, 2)
    const plain = structuredClone(s)
    plain.quarter = q('2027Q4')
    expect(payReservationWeek(structuredClone(t))).toBeCloseTo(
      payReservationWeek(plain),
      6,
    )
  })

  it('a new project on that site uses the PPA', () => {
    let t = play(co('2027Q3', 'ohio'), 'sh_2', 'c1')
    t.phase = 'plan'
    t.quarter = q('2027Q4')
    const r = applyAction(t, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 30_000, kind: 'shell' })
    if (!r.ok) throw new Error(r.error.key)
    t = r.state
    expect(activePpas(t)[0].projectId).toBe(t.projects.at(-1)!.id)
  })

  it('no eligible site: greyed', () => {
    expect(greyed(co('2027Q3', 'arizona'), 'sh_2', 'c1')).toBe('error.nuclear_region')
  })
})

describe('ppa_savings (s2_c5 "Bank the margin")', () => {
  it('one quarter of max(0, market − PPA) × used MW × 2,190 h, over your PPAs; $0 with none', () => {
    const none = co('2029Q1')
    expect(play(none, 's2_c5', 'c1').cash).toBe(none.cash)
    const s = co('2029Q1', 'pjm', [{ kw: 10_000 }])
    const site = s.sites.find((y) => y.id === 'site-2')!
    const market = powerPriceUsdKwh(site, s.quarter, 's2') * 1000
    s.ppas = [
      {
        id: 'ppa-1',
        siteId: 'site-2',
        kw: 10_000,
        priceUsdMwh: market - 25,
        signedQuarter: q('2027Q3'),
        fromQuarter: q('2027Q4'),
        endQuarter: q('2027Q3') + 59,
        projectId: 'project-1',
      },
    ]
    const t = play(s, 's2_c5', 'c1')
    expect(t.cash - s.cash).toBeCloseTo(Math.round(25 * 10 * H), 0)
  })
})

describe('political capital and Anger on cards (s2_c6), the hire (sh_3)', () => {
  it('s2_c6 "Spend political capital": −30 PC and Anger adjustment −8; greyed when short', () => {
    const s = co('2029Q2')
    const t = play(s, 's2_c6', 'c1')
    expect(t.politicalCapital).toBe(10)
    expect(t.angerAdj).toBe(-8)
    const poor = co('2029Q2')
    poor.politicalCapital = 29
    expect(greyed(poor, 's2_c6', 'c1')).toBe('error.pc_short')
  })

  it('s2_c6 "Community benefits deal": −$2M and Anger adjustment −8', () => {
    const s = co('2029Q2')
    const t = play(s, 's2_c6', 'c2')
    expect(s.cash - t.cash).toBe(2_000_000)
    expect(t.angerAdj).toBe(-8)
  })

  it('sh_3 "Hire": the Director through the normal path at 0 BW; greyed once hired', () => {
    const s = co('2027Q2')
    const t = play(s, 'sh_3', 'c1')
    expect(t.staff.gov_affairs_director).toBe(q('2027Q2'))
    expect(t.bandwidth).toBe(s.bandwidth)
    expect(greyed(t, 'sh_3', 'c1')).toBe('error.already_hired')
  })
})
