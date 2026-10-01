// M17.8 A: the PJM capacity charge (DT): in Act III, at sites in PJM and Ohio, the scenario's capacity price
// change since 2027Q1 ÷ 24 ÷ 1,000 $/kWh on top of the power price (negative when it falls); PPA MW are exempt as a
// cost, and a shell tenant's reimbursement on them includes it. And the fixed-basis spread: a PPA locked in 2027Q3
// against the market (capacity charge included), with the design thread's PJM check values.
import { describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  quarterInputs,
  type PowerRegion,
  type ScenarioId,
} from '../../src/content/index.ts'
import { toAct3, type GameState, type Ppa, type Project } from '../../src/sim/state.ts'
import { lockedSpreadUsdMwh, ppaQuarterNetUsd } from '../../src/sim/systems/nuclear.ts'
import { regionPowerAdderUsdKwh } from '../../src/sim/systems/regions.ts'
import {
  capacityChargeUsdKwh,
  normalPriceUsdKwh,
  powerPriceUsdKwh,
} from '../../src/sim/systems/sites.ts'
import { act2Company } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const H = BALANCE.act3.nuclear.hoursPerQuarter
const cap = (id: ScenarioId, label: string) =>
  quarterInputs(q(label), id)!.pjmCapacityUsdMwDay!

function co(label: string, region: PowerRegion, id: ScenarioId): GameState {
  const s = toAct3(act2Company('2026Q4'), { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  s.sites.find((x) => x.id === 'site-2')!.region = region
  return s
}
const site2 = (s: GameState) => s.sites.find((x) => x.id === 'site-2')!

describe('the capacity charge', () => {
  it('PJM and Ohio: (capacity now − 2027Q1) ÷ 24 ÷ 1,000 $/kWh, added to the power price', () => {
    for (const region of ['pjm', 'ohio'] as const) {
      const s = co('2030Q3', region, 's2')
      const want = (cap('s2', '2030Q3') - cap('s2', '2027Q1')) / 24 / 1000
      expect(want).toBeGreaterThan(0.02) // S2's squeeze: about +$21/MWh
      expect(capacityChargeUsdKwh(site2(s), s.quarter, 's2')).toBeCloseTo(want, 9)
      // the price = the normal price + Act II's policy adder (it stays) + the charge
      expect(powerPriceUsdKwh(site2(s), s.quarter, 's2')).toBeCloseTo(
        normalPriceUsdKwh(site2(s), s.quarter, undefined, 's2') +
          regionPowerAdderUsdKwh(region, s.quarter) +
          want,
        9,
      )
    }
  })

  it('negative when capacity falls below 2027Q1 (S1)', () => {
    const s = co('2029Q3', 'pjm', 's1')
    expect(capacityChargeUsdKwh(site2(s), s.quarter, 's1')).toBeCloseTo(
      (cap('s1', '2029Q3') - cap('s1', '2027Q1')) / 24 / 1000,
      9,
    )
    expect(capacityChargeUsdKwh(site2(s), s.quarter, 's1')).toBeLessThan(0)
  })

  it('none in Georgia, the Nordics, ERCOT or Arizona; none outside Act III', () => {
    for (const region of ['georgia', 'nordics', 'ercot', 'arizona'] as const) {
      const s = co('2030Q3', region, 's2')
      expect(capacityChargeUsdKwh(site2(s), s.quarter, 's2')).toBe(0)
    }
    const s = co('2030Q3', 'pjm', 's2')
    expect(capacityChargeUsdKwh(site2(s), q('2026Q4'), 's2')).toBe(0)
    expect(capacityChargeUsdKwh(site2(s), s.quarter, null)).toBe(0)
  })

  it('PPA MW are exempt as a cost; a shell tenant’s reimbursement on them includes it', () => {
    const s = co('2030Q3', 'pjm', 's2')
    site2(s).soldKw = 10_000 // all the site's power is the PPA's
    const x: Ppa = {
      id: 'ppa-1',
      siteId: 'site-2',
      kw: 10_000,
      priceUsdMwh: 103,
      signedQuarter: q('2027Q3'),
      fromQuarter: q('2027Q4'),
      endQuarter: q('2027Q3') + 59,
      projectId: 'project-1',
    }
    s.ppas = [x]
    const shell: Project = {
      id: 'project-1',
      n: 1,
      siteId: 'site-2',
      kw: 10_000,
      kind: 'shell',
      gpu: null,
      tier: 'mid',
      openedQuarter: q('2027Q1'),
      stage: 'live',
      offers: [],
      tenant: {
        card: CONTENT.projects.tenantCards.find((c) => c.type === 'hyperscaler')!.id,
        signedQuarter: q('2027Q1'),
        readyByQuarter: q('2027Q1'),
        lateQuarters: 0,
        walkRolled: true,
        prepaymentLeftUsd: 0,
        servedQuarters: 1,
        termQuarters: 40,
      },
      spot: false,
      capital: 'cash',
      capexUsd: 0,
      gpuCapexUsd: 0,
      gpuCount: 0,
      startQuarter: q('2027Q1'),
      readyQuarter: q('2027Q2'),
      soldQuarter: null,
    }
    s.projects = [shell]
    const market = powerPriceUsdKwh(site2(s), s.quarter, 's2') * 1000
    const charge = capacityChargeUsdKwh(site2(s), s.quarter, 's2') * 1000
    const r = ppaQuarterNetUsd(s, x)
    // the host pays 103 × 10 MW and the tenant reimburses the market, charge included: a gain
    expect(r.netUsd).toBeCloseTo((103 - market) * 10 * H, 2)
    expect(charge).toBeGreaterThan(20) // so S2's spread comes from it
    // the cost side: what the used MW cost the host is the PPA price, whatever the charge
    expect(r.netUsd + market * 10 * H).toBeCloseTo(103 * 10 * H, 2)
  })
})

describe('the spread, fixed basis: a PPA signed in 2027Q3 against PJM’s market (capacity charge included)', () => {
  // The design thread's check values (±1 for rounding), $/MWh, as market − contract (positive: the PPA wins).
  const want: Record<ScenarioId, number[]> = {
    s0: [-12, -8, -4, 0],
    s1: [-11, -20, -24, -23],
    s2: [-9, 12, 33, 47],
    s3: [-1, -16, -19, -19],
  }
  for (const id of ['s0', 's1', 's2', 's3'] as const)
    it(`${id}: 2027Q3 / 2028Q3 / 2029Q3 / 2030Q3`, () => {
      const got = ['2027Q3', '2028Q3', '2029Q3', '2030Q3'].map(
        (l) => lockedSpreadUsdMwh(id, 'pjm', q('2027Q3'), q(l))!,
      )
      got.forEach((v, i) => expect(Math.abs(v - want[id][i])).toBeLessThanOrEqual(1))
    })
})
