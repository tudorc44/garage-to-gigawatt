// Projects (Act II, scope 0.2 §2.5; wireframes A2-04 / A2-05): opening a project, its three slots
// (Power = existing MW, Tenant = a card or spot, Capital = own cash), costs and cancelling.
import { describe, expect, it } from 'vitest'
import { CONTENT, act2Quarter } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { siteMwByUse } from '../../src/sim/systems/mwUse.ts'
import {
  annualRentUsd,
  availableGpus,
  buildQuarters,
  gpuPriceUsd,
  knowHow,
  neocloudUsdHr,
  projectCapex,
  slots,
  tenantCard,
} from '../../src/sim/systems/projects.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** An Act II company with an empty 20 MW own site, in the Plan phase of `label`. */
export function act2Company(label: string, seed = 1): GameState {
  const s: GameState = {
    ...newGame(seed),
    act: 2,
    quarter: q(label),
    cash: 500_000_000,
    bandwidth: 6,
  }
  s.sites.push({
    id: 'site-2',
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  return s
}

export function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

describe('opening a project (1 Bandwidth, its Power slot = free energized MW)', () => {
  it('opens a shell on free MW; the kW are taken at once (idle until it builds)', () => {
    let s = act2Company('2023Q3')
    s = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    const p = s.projects[0]
    expect(p).toMatchObject({
      n: 1,
      kw: 5000,
      kind: 'shell',
      stage: 'proposed',
    })
    expect(s.bandwidth).toBe(5)
    expect(siteMwByUse(s, s.sites[1], s.quarter)).toMatchObject({ idle: 20000 })
    // No room for a second 16 MW project on the same 20 MW.
    expect(
      err(s, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 16000,
        kind: 'shell',
      }),
    ).toBe('error.no_project_room')
  })

  it('is Act II only, never the garage, and pilots are 0.5–2 MW in 0.5 MW steps from 2023Q1', () => {
    const s = act2Company('2023Q3')
    expect(
      err(
        { ...s, act: 1 },
        { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 1000, kind: 'shell' },
      ),
    ).toBe('error.act2_only')
    expect(
      err(s, { type: 'PROJECT_OPEN', siteId: 'site-1', kw: 1, kind: 'shell' }),
    ).toBe('error.project_garage')
    expect(
      err(s, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 750,
        kind: 'pilot',
      }),
    ).toBe('error.pilot_size')
    expect(
      err(s, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 2500,
        kind: 'pilot',
      }),
    ).toBe('error.pilot_size')
    expect(
      err(act2Company('2022Q4'), {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 1000,
        kind: 'pilot',
      }),
    ).toBe('error.pilot_early')
    const pilot = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1500,
      kind: 'pilot',
    })
    expect(pilot.projects[0].gpu).toBe('h100')
  })

  it('clouds pick a GPU that is out: H100 from the start, H200 from 2024Q3, B200 from 2025Q1', () => {
    expect(availableGpus(q('2023Q3')).map((g) => g.id)).toEqual(['h100'])
    expect(availableGpus(q('2024Q3')).map((g) => g.id)).toEqual([
      'h100',
      'h200',
    ])
    expect(availableGpus(q('2025Q2')).map((g) => g.id)).toEqual([
      'h100',
      'h200',
      'b200',
    ])
    expect(
      err(act2Company('2024Q1'), {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 2000,
        kind: 'cloud',
        gpu: 'b200',
      }),
    ).toBe('error.gpu_not_available')
  })
})

describe('the Tenant slot', () => {
  it('a shell draws 2–3 tenant offers from 2023Q3 (none before), each with a ready-by window', () => {
    const early = ok(act2Company('2023Q2'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    expect(early.projects[0].offers).toEqual([])
    for (let seed = 1; seed <= 10; seed++) {
      const s = ok(act2Company('2023Q3', seed), {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 5000,
        kind: 'shell',
      })
      const offers = s.projects[0].offers
      expect(offers.length).toBeGreaterThanOrEqual(2)
      expect(offers.length).toBeLessThanOrEqual(3)
      for (const o of offers) {
        const card = tenantCard(o.card)!
        expect(o.readyByQuarters).toBeGreaterThanOrEqual(card.readyBy[0])
        expect(o.readyByQuarters).toBeLessThanOrEqual(card.readyBy[1])
        // Never the know-how-3 overflow tenant, never the Nordics-only one (a Georgia site).
        expect(card.needsKnowHow).toBeUndefined()
        expect(card.regionLock).toBeUndefined()
      }
    }
  })

  it('signing sets the ready-by quarter, takes any prepayment and starts the pivot premium', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    const offer = s.projects[0].offers[0]
    const card = tenantCard(offer.card)!
    const cash = s.cash
    s = ok(s, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: 'project-1',
      offerId: offer.id,
    })
    const p = s.projects[0]
    expect(p.tenant!.readyByQuarter).toBe(s.quarter + offer.readyByQuarters)
    const prepay = Math.round(
      annualRentUsd(card, 5000) * card.termYears * card.prepaymentShare,
    )
    expect(s.cash).toBe(cash + prepay)
    expect(p.tenant!.prepaymentLeftUsd).toBe(prepay)
    expect(s.firstAiDealQuarter).toBe(s.quarter)
    expect(slots(p)).toEqual({ power: true, tenant: true, capital: false })
  })

  it('a cloud goes on spot; a pilot has no Tenant slot', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 2000,
      kind: 'cloud',
      gpu: 'h100',
    })
    expect(slots(s.projects[0]).tenant).toBe(false)
    s = ok(s, { type: 'PROJECT_SPOT', projectId: 'project-1' })
    expect(slots(s.projects[0]).tenant).toBe(true)
    s = ok(s, {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    expect(slots(s.projects[1]).tenant).toBeNull()
  })
})

describe('the Capital slot, costs and cancelling', () => {
  it('own cash fills the Capital slot', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    s = ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' })
    expect(slots(s.projects[0])).toEqual({
      power: true,
      tenant: null,
      capital: true,
    })
  })

  it('costs: retrofit per MW (+ GPUs × price; a cloud +10% at know-how 0), less the tenant capex credit', () => {
    const s = act2Company('2023Q3')
    const retrofit = act2Quarter(s.quarter)!.capexUsdMw.retrofitShell
    const shell = projectCapex(s, {
      kw: 5000,
      kind: 'shell',
      gpu: null,
      tenant: null,
    })
    expect(shell.totalUsd).toBe(retrofit * 5)
    // The pilot: 750 H100s per MW at 2023Q3's $32,000 + the retrofit (the scope's ≈ $31–33M/MW).
    const pilot = projectCapex(s, {
      kw: 1000,
      kind: 'pilot',
      gpu: 'h100',
      tenant: null,
    })
    expect(pilot.gpuCount).toBe(750)
    expect(pilot.totalUsd).toBe(retrofit + 750 * 32_000)
    expect(pilot.totalUsd).toBeGreaterThan(30_000_000)
    // A cloud at know-how 0 pays 10% more for its GPUs.
    expect(knowHow(s)).toBe(0)
    const cloud = projectCapex(s, {
      kw: 1000,
      kind: 'cloud',
      gpu: 'h100',
      tenant: null,
    })
    expect(cloud.gpuUsd).toBeCloseTo(750 * 32_000 * 1.1, 6)
    // The CoreWeave-style anchor funds up to $1.5M/MW of capex.
    const credit = projectCapex(s, {
      kw: 5000,
      kind: 'shell',
      gpu: null,
      tenant: {
        card: 'tc_realname_coreweave_style',
        signedQuarter: s.quarter,
        readyByQuarter: s.quarter + 6,
        lateQuarters: 0,
        walkRolled: false,
        prepaymentLeftUsd: 0,
        servedQuarters: 0,
      },
    })
    expect(credit.creditUsd).toBe(1_500_000 * 5)
    expect(credit.totalUsd).toBe(retrofit * 5 - 1_500_000 * 5)
  })

  it('GPU prices and rent before 2023Q3 hold the first known value (the pilot opens in 2023Q1)', () => {
    expect(gpuPriceUsd('h100', q('2023Q1'))).toBe(32_000)
    expect(neocloudUsdHr('h100', q('2023Q2'))).toBe(6.5)
    // A GPU that isn't out yet still has a held price, but can't be bought (its release date).
    expect(availableGpus(q('2024Q1')).map((g) => g.id)).not.toContain('b200')
  })

  it('build times: shell 3 quarters, cloud 4 (shell + GPUs), pilot 1', () => {
    expect(buildQuarters('shell')).toBe(3)
    expect(buildQuarters('cloud')).toBe(4)
    expect(buildQuarters('pilot')).toBe(1)
  })

  it('a proposed project can be cancelled; its MW are free again', () => {
    let s = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 20000,
      kind: 'shell',
    })
    s = ok(s, { type: 'PROJECT_CANCEL', projectId: 'project-1' })
    expect(s.projects).toEqual([])
    ok(s, { type: 'PROJECT_OPEN', siteId: 'site-2', kw: 20000, kind: 'shell' })
  })
})
