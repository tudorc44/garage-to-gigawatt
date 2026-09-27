// Tenant and lender negotiation (M6.0i; owner, 28 Sep 2026, M5 answer 8): 2 Bandwidth, 3 rounds from
// the card's terms, a hidden limit by tenant type (+5/8/12%) or the lender's rate − 0.75 point (floor
// SOFR + 1.5%), and a 15% walk-away when you ask past the limit in round 3.
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { debtOffer } from '../../src/sim/systems/facilities.ts'
import {
  annualContractUsd,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { act2Company, ok } from './act2Helpers.ts'

/** A 5 MW shell with its offers drawn (nothing signed), the first offer set to `card`. */
function withOffer(card: string, label = '2024Q1'): GameState {
  const s = ok(act2Company(label), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 5000,
    kind: 'shell',
  })
  s.projects[0].offers[0].card = card
  return s
}

const start = (s: GameState) =>
  ok(s, {
    type: 'DEAL_NEGOTIATE_START',
    projectId: 'project-1',
    offerId: s.projects[0].offers[0].id,
  })

describe('negotiating a tenant', () => {
  it('costs 2 Bandwidth; asking inside the hyperscaler’s +5% signs at your price', () => {
    const s0 = withOffer('tc_north_azure_cloud') // hyperscaler, AA
    const s = start(s0)
    expect(s.bandwidth).toBe(s0.bandwidth - 2)
    expect(s.dealNegotiation!.limit).toBeCloseTo(1.05, 12)
    const r = ok(s, { type: 'DEAL_COUNTER', ask: 1.04 })
    expect(r.dealNegotiation).toBeNull()
    const p = r.projects[0]
    expect(p.tenant!.priceMult).toBe(1.04)
    const card = tenantCard('tc_north_azure_cloud')!
    expect(annualContractUsd(p)).toBeCloseTo(card.priceUsdMwYr * 5 * 1.04, 4)
  })

  it('asking past the limit: they come back halfway; after 3 rounds only accept or walk is left', () => {
    let s = start(withOffer('tc_meridian_labs')) // AI lab: +12%
    s = ok(s, { type: 'DEAL_COUNTER', ask: 1.3 })
    expect(s.dealNegotiation!.offer).toBeCloseTo((1 + 1.12) / 2, 12)
    s = ok(s, { type: 'DEAL_COUNTER', ask: 1.3 })
    expect(s.dealNegotiation!.round).toBe(2)
    expect(s.dealNegotiation!.final).toBe(false)
    const third = applyAction(s, { type: 'DEAL_COUNTER', ask: 1.3 })
    expect(third.ok).toBe(true)
    if (!third.ok) return
    const n = third.state.dealNegotiation
    if (n) {
      // They stayed (85%): the last round is used up.
      expect(n.final).toBe(true)
      const signed = ok(third.state, { type: 'DEAL_ACCEPT' })
      expect(signed.projects[0].tenant!.priceMult).toBeCloseTo(n.offer, 12)
    } else {
      // They walked (15%): the offer is gone this quarter.
      expect(third.state.projects[0].offers).toHaveLength(
        s.projects[0].offers.length - 1,
      )
    }
  })

  it('a walk in round 3 happens in about 15% of tries past the limit, never before', () => {
    let walked = 0
    for (let seed = 1; seed <= 200; seed++) {
      let s = start({ ...withOffer('tc_meridian_labs'), seed })
      for (let i = 0; i < 2; i++) {
        s = ok(s, { type: 'DEAL_COUNTER', ask: 2 })
        expect(s.dealNegotiation).not.toBeNull()
      }
      s = ok(s, { type: 'DEAL_COUNTER', ask: 2 })
      if (!s.dealNegotiation) walked++
    }
    expect(walked).toBeGreaterThan(15)
    expect(walked).toBeLessThan(50)
  })

  it('walking away yourself keeps the card’s offer, but no second negotiation this quarter', () => {
    const s = ok(start(withOffer('tc_north_azure_cloud')), {
      type: 'DEAL_WALK',
    })
    expect(s.projects[0].offers[0].negotiatedQuarter).toBe(s.quarter)
    expect(
      applyAction(s, {
        type: 'DEAL_NEGOTIATE_START',
        projectId: 'project-1',
        offerId: s.projects[0].offers[0].id,
      }).ok,
    ).toBe(false)
    const signed = ok(s, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: 'project-1',
      offerId: s.projects[0].offers[0].id,
    })
    expect(signed.projects[0].tenant!.priceMult).toBeUndefined()
  })

  it('the quarter can’t end with a negotiation open', () => {
    const s = start(withOffer('tc_north_azure_cloud'))
    expect(applyAction(s, { type: 'END_PLAN' }).ok).toBe(false)
  })
})

describe('negotiating a lender', () => {
  it('project debt: its rate − 0.75 point at most, then drawn at that rate', () => {
    let s = withOffer('tc_north_azure_cloud')
    s = ok(s, {
      type: 'PROJECT_SIGN_TENANT',
      projectId: 'project-1',
      offerId: s.projects[0].offers[0].id,
    })
    const before = debtOffer(s, s.projects[0], 'project_debt').apr
    s = ok(s, {
      type: 'DEAL_NEGOTIATE_START',
      projectId: 'project-1',
      debt: 'project_debt',
    })
    expect(s.dealNegotiation!.limit).toBeCloseTo(0.0075, 12)
    s = ok(s, { type: 'DEAL_COUNTER', ask: 0.005 })
    expect(s.dealNegotiation).toBeNull()
    expect(s.projects[0].debt!.projectDebt).toBe(true)
    expect(debtOffer(s, s.projects[0], 'project_debt').apr).toBeCloseTo(
      before - 0.005,
      12,
    )
  })
})
