// GPU contracts for AI clouds (owner decisions on the M3 questions, M4.0c): offers, the price
// locked at signing, take-or-pay billing on every GPU, the ready-by buffer, the fall back to spot
// after the term, and the backlog.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT } from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import type { GameState } from '../../src/sim/state.ts'
import {
  annualContractUsd,
  backlogUsd,
  gpuContractUsdHr,
  slots,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { uptime } from '../../src/sim/systems/sites.ts'
import { act2Company, endPlan, ok, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const C = BALANCE.projects.gpuContracts

/** A 2 MW H100 cloud opened in `label` (1,500 GPUs). */
function cloud(label = '2023Q3', seed = 1): GameState {
  return ok(act2Company(label, seed), {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 2000,
    kind: 'cloud',
    gpu: 'h100',
  })
}

describe('offers', () => {
  it('a cloud draws 2–3 GPU contract offers from the contract cards, each with a term and buffer', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const offers = cloud('2023Q3', seed).projects[0].offers
      expect(offers.length).toBeGreaterThanOrEqual(2)
      expect(offers.length).toBeLessThanOrEqual(3)
      for (const o of offers) {
        const profile = C.profiles[C.cards[o.card]]
        expect(profile).toBeDefined()
        expect(o.gpu!.termYears).toBeGreaterThanOrEqual(profile.termYears[0])
        expect(o.gpu!.termYears).toBeLessThanOrEqual(profile.termYears[1])
        expect(o.gpu!.bufferQuarters).toBeGreaterThanOrEqual(
          profile.bufferQuarters[0],
        )
        expect(o.gpu!.bufferQuarters).toBeLessThanOrEqual(
          profile.bufferQuarters[1],
        )
        // The overflow card needs know-how 3.
        expect(o.card).not.toBe('tc_hyperscaler_overflow')
      }
    }
  })

  it('none before 2023Q3, and none for a pilot', () => {
    expect(cloud('2023Q2').projects[0].offers).toEqual([])
    const pilot = ok(act2Company('2023Q3'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 1000,
      kind: 'pilot',
    })
    expect(pilot.projects[0].offers).toEqual([])
  })

  it('every contract card exists in tenants.json', () => {
    for (const id of Object.keys(C.cards)) expect(tenantCard(id)).toBeDefined()
  })
})

describe('the price', () => {
  it('= the H100 1-year contract × the term factor; H200 × 1.2; B200 off its neocloud series', () => {
    const at = q('2025Q2') // H100 1-year $1.90, B200 neocloud $7.00
    expect(gpuContractUsdHr('h100', 1, at)).toBeCloseTo(1.9, 9)
    expect(gpuContractUsdHr('h100', 2, at)).toBeCloseTo(1.9 * 0.85, 9)
    expect(gpuContractUsdHr('h100', 3, at)).toBeCloseTo(1.9 * 0.7, 9)
    expect(gpuContractUsdHr('h200', 1, at)).toBeCloseTo(1.9 * 1.2, 9)
    expect(gpuContractUsdHr('b200', 2, at)).toBeCloseTo(7 * 0.85, 9)
  })
})

/** The cloud with its first offer signed and funded. */
function signed(label = '2023Q3') {
  let s = cloud(label)
  const offer = s.projects[0].offers[0]
  s = ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: 'project-1',
    offerId: offer.id,
  })
  return {
    s: ok(s, { type: 'PROJECT_FUND_CASH', projectId: 'project-1' }),
    offer,
  }
}

describe('signing', () => {
  it('locks the price, fills the Tenant slot, sets ready-by = planned go-live + buffer', () => {
    const { s, offer } = signed()
    const t = s.projects[0].tenant!
    expect(t.gpu).toEqual({
      gpus: 1500,
      priceUsdHr: gpuContractUsdHr('h100', offer.gpu!.termYears, s.quarter),
      termQuarters: offer.gpu!.termYears * 4,
    })
    expect(t.readyByQuarter).toBe(s.quarter + 4 + offer.gpu!.bufferQuarters)
    expect(t.prepaymentLeftUsd).toBe(0)
    expect(slots(s.projects[0]).tenant).toBe(true)
    expect(s.firstAiDealQuarter).toBe(s.quarter)
    // The backlog is the whole contract.
    expect(backlogUsd(s)).toBeCloseTo(
      1500 * t.gpu!.priceUsdHr * 24 * 365 * offer.gpu!.termYears,
      4,
    )
    // No leaving it on spot now.
    expect(() =>
      ok(s, { type: 'PROJECT_SPOT', projectId: 'project-1' }),
    ).toThrow('error.tenant_signed')
  })
})

describe('billing, and the end of the term', () => {
  /** The signed cloud, built and live (no delays or GPU queue). */
  function liveContract() {
    let { s } = signed()
    s = ok(s, { type: 'PROJECT_START', projectId: 'project-1' })
    for (let i = 0; i < 4; i++) s = playQuarter(s)
    expect(s.projects[0].stage).toBe('live')
    return s
  }

  it('bills every contracted GPU at the locked price, whatever the utilisation', () => {
    const s = liveContract()
    const t = s.projects[0].tenant!
    const w = advance(endPlan(s))
    expect(w.quarterStats.aiRevenueUsd).toBeCloseTo(
      t.gpu!.gpus * t.gpu!.priceUsdHr * 168 * uptime(s.sites[1]),
      4,
    )
    expect(annualContractUsd(s.projects[0])).toBeCloseTo(
      t.gpu!.gpus * t.gpu!.priceUsdHr * 24 * 365,
      4,
    )
  })

  it('under contract the GPUs can’t be sold; after the term they fall back to spot', () => {
    let s = liveContract()
    expect(() =>
      ok(s, { type: 'PROJECT_SELL_GPUS', projectId: 'project-1' }),
    ).toThrow('error.gpus_contracted')
    const t = s.projects[0].tenant!
    t.servedQuarters = t.gpu!.termQuarters - 1
    s = playQuarter(s)
    expect(s.projects[0].tenant).toBeNull()
    expect(s.projects[0].spot).toBe(true)
    expect(s.log.some((e) => e.key === 'log.gpu_contract_ended')).toBe(true)
    // New offers arrive for the next contract.
    expect(s.projects[0].offers.length).toBeGreaterThan(0)
  })
})
