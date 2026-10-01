// M12.2: the renewal event (doc 27 §6, D5, F-1, F-2). Offers keyed to the tenant's own rate, the walk
// roll, accept (the default) / counter / re-let, and fresh leases at the new-lease (RFP) index.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  SCENARIO_IDS,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame } from '../../src/sim/replay.ts'
import { contractCalendar, renewalsDue } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { rfpMid, renewalBand } from '../../src/sim/systems/leaseIndex.ts'
import {
  annualRentUsd,
  contractQuarters,
  newLeaseIndex,
  signTenant,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import {
  renewalOffer,
  renewalWalkChance,
} from '../../src/sim/systems/renewals.ts'
import { BOTS } from '../../tools/bots.ts'
import { act2Company } from './act2Helpers.ts'

const FIRST = actFirstQuarter(3)
const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Plays one quarter (defaults to every alert); returns the next Plan phase (or where it stopped). */
function quarter(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s.phase === 'report' ? ok(s, { type: 'NEXT_QUARTER' }) : s
}

let shellCo: GameState
let gpuCo: GameState
beforeAll(() => {
  shellCo = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
  gpuCo = playGame(1, BOTS['overleveraged'], { through: 2 }).state
}, 120_000) // two whole games to 2026Q4: slow under a full parallel run

const liveShell = (s: GameState) =>
  s.projects.find((p) => p.tenant && !p.tenant.gpu && p.stage === 'live')!
const liveGpu = (s: GameState) =>
  s.projects.find(
    (p) =>
      p.tenant?.gpu &&
      p.stage === 'live' &&
      (p.gpu === 'h100' || p.gpu === 'h200'),
  )!
const cardOfType = (type: string) =>
  CONTENT.projects.tenantCards.find((c) => c.type === type)!

/** An Act III state at `label` on `id`, with one live contract whose term ends this quarter. */
function dueAt(
  base: GameState,
  id: ScenarioId,
  label: string,
  pick: (s: GameState) => Project,
  tweak?: (p: Project) => void,
): { s: GameState; p: Project } {
  const s = toAct3(base, { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  const p = pick(s)
  // The worked examples assume a neutral hall: a mid-tier shell (× 1.00 from 2027Q3, M16.2).
  p.tier = 'mid'
  tweak?.(p)
  p.tenant!.servedQuarters = contractQuarters(p) - 1
  return { s, p }
}

describe('reproducing renewals_examples.md', () => {
  // [scenario, quarter, tenant type, band low, band high, offered term in years]
  const shells: [ScenarioId, string, string, number, number, number][] = [
    ['s0', '2028Q3', 'neocloud_sub_tenant', 0.72, 0.8, 7],
    ['s0', '2028Q4', 'hyperscaler', 0.71, 0.8, 7],
    ['s1', '2028Q2', 'neocloud_sub_tenant', 0.52, 0.6, 4],
    ['s1', '2028Q3', 'hyperscaler', 0.44, 0.6, 4],
    ['s2', '2028Q4', 'neocloud_sub_tenant', 1.0, 1.1, 11],
    ['s2', '2029Q1', 'hyperscaler', 1.0, 1.1, 11],
    ['s3', '2028Q1', 'neocloud_sub_tenant', 0.65, 0.7, 4],
    ['s3', '2028Q2', 'hyperscaler', 0.6, 0.7, 4],
  ]
  it.each(shells)(
    '%s shell at %s (%s): offer inside the band %s–%s at the type’s position; term %s years',
    (id, label, type, lo, hi, years) => {
      const { s, p } = dueAt(shellCo, id, label, liveShell, (x) => {
        x.tenant!.card = cardOfType(type).id
      })
      const band = renewalBand(s.quarter, id)!
      expect(band.lo).toBeCloseTo(lo, 2)
      expect(band.hi).toBeCloseTo(hi, 2)
      const pos = type === 'hyperscaler' ? 0 : 0.25
      const o = renewalOffer(s, p)!
      expect(o.mult).toBeCloseTo(band.lo + (band.hi - band.lo) * pos, 10)
      expect(o.mult).toBeGreaterThanOrEqual(band.lo)
      expect(o.mult).toBeLessThanOrEqual(band.hi)
      expect(o.termQuarters).toBe(years * 4)
    },
  )

  it('an AI lab sits halfway up the band', () => {
    const { s, p } = dueAt(shellCo, 's0', '2028Q3', liveShell, (x) => {
      x.tenant!.card = cardOfType('ai_lab').id
    })
    const b = renewalBand(s.quarter, 's0')!
    expect(renewalOffer(s, p)!.mult).toBeCloseTo((b.lo + b.hi) / 2, 10)
  })

  // [scenario, quarter, multiplier (clamped into the band), offered term in years]
  const gpus: [ScenarioId, string, number, number][] = [
    ['s0', '2028Q3', 0.73, 2],
    ['s1', '2028Q2', 0.52, 1], // 0.50 → clamped up to the band's 0.52
    ['s3', '2028Q1', 0.65, 1], // 0.62 → 0.65
    ['s2', '2028Q4', 1.0, 3], // 0.93 → the incumbents' floor 1.00; 2.5 years rounds half up
  ]
  it.each(gpus)(
    '%s H100 GPU contract at %s: multiplier %s (F-1: its own rate, from 2027Q1), term %s years',
    (id, label, mult, years) => {
      const { s, p } = dueAt(gpuCo, id, label, liveGpu, (x) => {
        x.tenant!.signedQuarter = FIRST - 3 // signed in Act II: base quarter 2027Q1
      })
      const o = renewalOffer(s, p)!
      expect(o.mult).toBeCloseTo(mult, 2)
      expect(o.termQuarters).toBe(years * 4)
    },
  )

  it('a GPU contract signed in Act III is keyed to its own signing quarter', () => {
    const { s, p } = dueAt(gpuCo, 's0', '2028Q3', liveGpu, (x) => {
      x.tenant!.signedQuarter = q('2028Q1')
    })
    const row = (label: string) =>
      CONTENT.act3Scenarios.s0.quarterly[q(label) - FIRST]
    const ratio =
      row('2028Q3').renewal_h100_gpu_index_vs_2025q4! /
      row('2028Q1').renewal_h100_gpu_index_vs_2025q4!
    const b = renewalBand(s.quarter, 's0')!
    expect(renewalOffer(s, p)!.mult).toBeCloseTo(
      Math.min(b.hi, Math.max(b.lo, ratio)),
      10,
    )
  })
})

describe('the walk roll', () => {
  it('uses the hyperscaler column for hyperscalers and the other one for neoclouds and AI labs', () => {
    for (const id of SCENARIO_IDS) {
      const row = CONTENT.act3Scenarios[id].quarterly[5]
      for (const type of ['hyperscaler', 'neocloud_sub_tenant', 'ai_lab']) {
        const { s, p } = dueAt(
          shellCo,
          id,
          CONTENT.quarters[FIRST + 5],
          liveShell,
          (x) => {
            x.tenant!.card = cardOfType(type).id
            delete x.tenant!.distressedQuarter
          },
        )
        expect(renewalWalkChance(s, p)).toBe(
          type === 'hyperscaler'
            ? row.tenant_walk_prob_at_renewal_hyperscaler
            : row.tenant_walk_prob_at_renewal_nonhyperscaler,
        )
      }
    }
  })

  it('a tenant in distress is twice as likely to walk, capped at 0.9', () => {
    const { s, p } = dueAt(shellCo, 's1', '2028Q2', liveShell, (x) => {
      x.tenant!.card = cardOfType('ai_lab').id
      delete x.tenant!.distressedQuarter
    })
    const base = renewalWalkChance(s, p)
    p.tenant!.distressedQuarter = s.quarter - 1
    expect(renewalWalkChance(s, p)).toBeCloseTo(Math.min(0.9, base * 2), 12)
  })
})

describe('the renewal’s timeline, the default and the choices', () => {
  /** shellCo in 2027Q1 with its first live shell lease ending this quarter (renewal open now). */
  function due2027(base: GameState, pick: (s: GameState) => Project) {
    const s0 = structuredClone(base)
    const p0 = pick(s0)
    p0.tenant!.servedQuarters = contractQuarters(p0) - 1
    delete p0.tenant!.distressedQuarter
    const s = toAct3(s0, { scenario: 's2' }) // s2: few walks
    return { s, id: p0.id }
  }

  it('opens in the Plan phase of the end quarter (listed with its offer), not before', () => {
    const early = structuredClone(shellCo)
    const p0 = liveShell(early)
    p0.tenant!.servedQuarters = contractQuarters(p0) - 2 // ends in 2027Q2
    let s = toAct3(early, { scenario: 's2' })
    expect(renewalsDue(s).some((r) => r.projectId === p0.id)).toBe(false)
    expect(contractCalendar(s).find((e) => e.id === p0.id)!.endQuarter).toBe(
      FIRST + 1,
    )
    s = quarter(s)
    expect(renewalsDue(s).some((r) => r.projectId === p0.id)).toBe(true)
  })

  it('undecided, the default (accept) applies at quarter end: rate × offer, the new term from next quarter', () => {
    const { s, id } = due2027(gpuCo, liveGpu)
    const r = s.act3Renewals!.find((x) => x.projectId === id)!
    expect(r.walked).toBe(false) // this seed's roll keeps the tenant (walks are tested below)
    const before = s.projects.find((x) => x.id === id)!.tenant!.gpu!.priceUsdHr
    const next = quarter(s)
    const t = next.projects.find((x) => x.id === id)!.tenant!
    expect(t.gpu!.priceUsdHr).toBeCloseTo(before * r.offer!.mult, 10)
    expect(t.gpu!.termQuarters).toBe(r.offer!.termQuarters)
    expect(t.servedQuarters).toBe(0)
    // settled: gone from the list (another contract, due next quarter, may have opened its own)
    expect(next.act3Renewals!.some((x) => x.projectId === id)).toBe(false)
  })

  it('a renewal signed by a distressed tenant clears its distress (a new contract)', () => {
    const s0 = structuredClone(shellCo)
    const p0 = liveShell(s0)
    p0.tenant!.servedQuarters = contractQuarters(p0) - 1
    p0.tenant!.card = cardOfType('hyperscaler').id
    p0.tenant!.distressedQuarter = 30
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = toAct3({ ...s0, seed }, { scenario: 's2' })
      const r = s.act3Renewals!.find((x) => x.projectId === p0.id)!
      if (r.walked) continue
      const t = quarter(s).projects.find((x) => x.id === p0.id)!.tenant!
      expect(t.distressedQuarter).toBeUndefined()
      return
    }
    throw new Error('every seed walked')
  })

  it('accept costs 0 Bandwidth; a shell re-let costs 1; a GPU let-go costs 0', () => {
    const { s, id } = due2027(shellCo, liveShell)
    expect(s.act3Renewals!.find((x) => x.projectId === id)!.walked).toBe(false)
    expect(ok(s, { type: 'RENEWAL_ACCEPT', projectId: id }).bandwidth).toBe(
      s.bandwidth,
    )
    expect(ok(s, { type: 'RENEWAL_RELET', projectId: id }).bandwidth).toBe(
      s.bandwidth - 1,
    )
    const g = due2027(gpuCo, liveGpu)
    expect(g.s.act3Renewals!.find((x) => x.projectId === g.id)!.walked).toBe(
      false,
    )
    expect(ok(g.s, { type: 'RENEWAL_RELET', projectId: g.id }).bandwidth).toBe(
      g.s.bandwidth,
    )
  })

  it('re-let: the MW earn nothing for 2 quarters, then the same card signs at the lapsed rent × RFP midpoint', () => {
    const { s, id } = due2027(shellCo, liveShell)
    expect(s.act3Renewals!.find((x) => x.projectId === id)!.walked).toBe(false)
    const p0 = s.projects.find((x) => x.id === id)!
    const card = tenantCard(p0.tenant!.card)!
    const lapsed = annualRentUsd(card, p0.kw) * (p0.tenant!.priceMult ?? 1)
    let t = ok(s, { type: 'RENEWAL_RELET', projectId: id })
    t = quarter(t) // 2027Q1 ends: the tenant leaves
    for (const n of [1, 2]) {
      expect(t.quarter).toBe(FIRST + n)
      expect(
        t.projects.find((x) => x.id === id)!.tenant,
        `empty in quarter +${n}`,
      ).toBeNull()
      t = quarter(t)
    }
    const p = t.projects.find((x) => x.id === id)!
    expect(t.quarter).toBe(FIRST + 3)
    expect(p.tenant!.card).toBe(card.id)
    const rent = annualRentUsd(card, p.kw) * p.tenant!.priceMult!
    // (M16.2: × the hall's tier multiple from 2027Q3; this carried shell is low tier, × 0.85)
    expect(p.tier).toBe('low')
    expect(rent).toBeCloseTo(
      lapsed * rfpMid(FIRST + 3, 's2')! * BALANCE.act3.density.shellTierRentMult.low,
      4,
    )
    const row = CONTENT.act3Scenarios.s2.quarterly[3]
    expect(contractQuarters(p)).toBe(
      Math.round(row.renewal_offer_term_years_shell!) * 4,
    )
  })

  it('a walked GPU contract goes to spot at term end', () => {
    for (const seed of Array.from({ length: 80 }, (_, i) => i + 1)) {
      const s0 = structuredClone(gpuCo)
      const p0 = liveGpu(s0)
      p0.tenant!.servedQuarters = contractQuarters(p0) - 1
      p0.tenant!.distressedQuarter = 30 // double the walk chance
      const s = toAct3({ ...s0, seed }, { scenario: 's1' })
      const r = s.act3Renewals!.find((x) => x.projectId === p0.id)!
      if (!r.walked) continue
      expect(
        renewalsDue(s).find((x) => x.projectId === p0.id)!.offer,
      ).toBeNull()
      const p = quarter(s).projects.find((x) => x.id === p0.id)!
      expect(p.tenant).toBeNull()
      expect(p.spot).toBe(true)
      return
    }
    throw new Error('no seed walked')
  })
})

describe('the counter reuses Act II’s negotiation', () => {
  it('2 Bandwidth; opening = the offer; the limit is Band high; a counter inside it signs at your ask', () => {
    const s0 = structuredClone(shellCo)
    const p0 = liveShell(s0)
    p0.tenant!.servedQuarters = contractQuarters(p0) - 1
    p0.tenant!.card = cardOfType('hyperscaler').id // offer at Band low: room to counter
    delete p0.tenant!.distressedQuarter
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const s = toAct3({ ...s0, seed }, { scenario: 's0' })
      const r = s.act3Renewals!.find((x) => x.projectId === p0.id)!
      if (r.walked) continue
      const band = renewalBand(s.quarter, 's0')!
      let t = ok(s, {
        type: 'DEAL_NEGOTIATE_START',
        projectId: p0.id,
        renewal: true,
      })
      expect(t.bandwidth).toBe(s.bandwidth - 2)
      expect(t.dealNegotiation!.opening).toBe(r.offer!.mult)
      expect(t.dealNegotiation!.limit).toBeCloseTo(band.hi, 12)
      const ask = (r.offer!.mult + band.hi) / 2
      t = ok(t, { type: 'DEAL_COUNTER', ask })
      expect(t.act3Renewals![0].counterMult).toBe(ask)
      const before =
        annualRentUsd(tenantCard(p0.tenant!.card)!, p0.kw) *
        (p0.tenant!.priceMult ?? 1)
      const after = quarter(t).projects.find((x) => x.id === p0.id)!
      const rent =
        annualRentUsd(tenantCard(after.tenant!.card)!, after.kw) *
        after.tenant!.priceMult!
      expect(rent).toBeCloseTo(before * ask, 4)
      return
    }
    throw new Error('every seed walked')
  })

  it('asking past the limit in round 3: sometimes the tenant walks (then it leaves), else a last offer', () => {
    let walked = 0
    let stayed = 0
    for (const seed of Array.from({ length: 40 }, (_, i) => i + 1)) {
      const s0 = structuredClone(shellCo)
      const p0 = liveShell(s0)
      p0.tenant!.servedQuarters = contractQuarters(p0) - 1
      p0.tenant!.card = cardOfType('hyperscaler').id
      delete p0.tenant!.distressedQuarter
      const s = toAct3({ ...s0, seed }, { scenario: 's0' })
      if (s.act3Renewals!.find((x) => x.projectId === p0.id)!.walked) continue
      let t = ok(s, {
        type: 'DEAL_NEGOTIATE_START',
        projectId: p0.id,
        renewal: true,
      })
      for (let i = 0; i < 3 && t.dealNegotiation; i++)
        t = ok(t, { type: 'DEAL_COUNTER', ask: 2 })
      const r = t.act3Renewals!.find((x) => x.projectId === p0.id)!
      if (r.walked) {
        walked++
        expect(t.dealNegotiation).toBeNull()
        const p = quarter(t).projects.find((x) => x.id === p0.id)!
        expect(p.tenant).toBeNull() // the re-let path
        expect(p.pendingRelet).toBeDefined()
      } else {
        stayed++
        expect(t.dealNegotiation!.final).toBe(true)
      }
    }
    expect(walked).toBeGreaterThan(0)
    expect(stayed).toBeGreaterThan(walked)
  })
})

describe('holdovers and the Deal builder', () => {
  it('a shell lease past its term (a holdover) opens its renewal in 2027Q1', () => {
    const s0 = structuredClone(shellCo)
    const p0 = liveShell(s0)
    p0.tenant!.servedQuarters = contractQuarters(p0) + 3
    const s = toAct3(s0, { scenario: 's3' })
    expect(s.act3Renewals!.some((r) => r.projectId === p0.id)).toBe(true)
  })

  it('in Act III a new shell tenant signs at the card price × this quarter’s RFP midpoint (F-2)', () => {
    for (const id of SCENARIO_IDS) {
      const s = toAct3(act2Company('2026Q4', 1), { scenario: id })
      s.quarter = FIRST + 6
      expect(newLeaseIndex(s)).toBe(rfpMid(FIRST + 6, id))
      const r = ok(s, {
        type: 'PROJECT_OPEN',
        siteId: 'site-2',
        kw: 5000,
        kind: 'shell',
      })
      const p = r.projects.at(-1)!
      p.offers = [
        { id: 'o1', card: cardOfType('hyperscaler').id, readyByQuarters: 4 },
      ]
      expect(signTenant(r, p.id, 'o1')).toBeUndefined()
      expect(p.tenant!.priceMult).toBeCloseTo(rfpMid(FIRST + 6, id)!, 12)
    }
  })

  it('in Act II the Deal builder is unchanged (index 1)', () => {
    const s = act2Company('2025Q2', 1)
    expect(newLeaseIndex(s)).toBe(1)
    expect(s.act3Renewals).toBeUndefined()
  })
})
