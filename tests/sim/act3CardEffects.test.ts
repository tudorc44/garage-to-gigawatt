// M12.3: the step-4 card effects (the design thread's meanings, parts B and C of the M12.3 spec). Each
// card choice is played through the real card engine (RESOLVE_INTERRUPT on the card's opaque id).
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import {
  act3CardEngineId,
  type ContractTarget,
} from '../../src/content/act3Cards.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame } from '../../src/sim/replay.ts'
import { substream } from '../../src/sim/rng.ts'
import {
  toAct3,
  type GameState,
  type Project,
} from '../../src/sim/state.ts'
import {
  applyContractEffect,
  pickTargets,
  shortfallUsd,
} from '../../src/sim/systems/cardContracts.ts'
import {
  blockedEventChoices,
  eventChoices,
} from '../../src/sim/systems/events.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { rfpMid } from '../../src/sim/systems/leaseIndex.ts'
import { isEarning } from '../../src/sim/systems/mining.ts'
import {
  annualRentUsd,
  contractQuarters,
  drawOffers,
  saleValueUsd,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { resolveRenewals } from '../../src/sim/systems/renewals.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)
const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Finishes the live quarter (defaults to any alert) and moves to the next Plan phase. */
function finish(s: GameState): GameState {
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s.phase === 'report' ? ok(s, { type: 'NEXT_QUARTER' }) : s
}

/** Shows an authored card in week 2 of the live quarter and answers it with choice `c`. */
function play(s: GameState, card: string, c: string): GameState {
  s.phase = 'live'
  s.week = 2
  s.interrupt = {
    id: 'event',
    event: act3CardEngineId(card),
    week: 1,
    coin: 'BTC',
    changePct: 0,
  }
  return ok(s, { type: 'RESOLVE_INTERRUPT', choice: c })
}

let shellCo: GameState
let gpuCo: GameState
beforeAll(() => {
  shellCo = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
  gpuCo = playGame(1, BOTS['overleveraged'], { through: 2 }).state
}, 120_000)

const cardOfType = (type: string) =>
  CONTENT.projects.tenantCards.find((c) => c.type === type)!
const rentOf = (p: Project) =>
  annualRentUsd(tenantCard(p.tenant!.card)!, p.kw) * (p.tenant!.priceMult ?? 1)
const left = (p: Project) => contractQuarters(p) - p.tenant!.servedQuarters

interface Lease {
  type: string
  mw: number
  usdMwYr: number
  left: number
  distressed?: boolean
}

/**
 * An Act III company at `label` whose only contracts are `leases` (live shells cloned from a real one;
 * the real contracted projects are marked sold). Returns the new projects in order.
 */
function company(
  id: ScenarioId,
  label: string,
  leases: Lease[],
): { s: GameState; ps: Project[] } {
  const s = toAct3(shellCo, { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  s.bandwidth = 6
  const template = s.projects.find(
    (p) => p.tenant && !p.tenant.gpu && p.stage === 'live',
  )!
  for (const p of s.projects) if (p.tenant) p.stage = 'sold'
  const ps = leases.map((o, i) => {
    const card = cardOfType(o.type)
    const p: Project = {
      ...structuredClone(template),
      id: `project-${90 + i}`,
      n: 90 + i,
      kw: o.mw * 1000,
      stage: 'live',
      // a neutral hall: mid tier (× 1.00 from 2027Q3, M16.2)
      tier: 'mid',
      soldQuarter: null,
      offers: [],
      tenant: {
        card: card.id,
        signedQuarter: FIRST,
        readyByQuarter: FIRST,
        lateQuarters: 0,
        walkRolled: true,
        prepaymentLeftUsd: 0,
        servedQuarters: 4,
        priceMult: o.usdMwYr / card.priceUsdMwYr,
        termQuarters: 4 + o.left,
        ...(o.distressed ? { distressedQuarter: FIRST } : {}),
      },
    }
    delete p.backstop
    delete p.jv
    delete p.pendingRelet
    delete p.emptyUntil
    s.projects.push(p)
    return p
  })
  return { s, ps }
}
const byId = (s: GameState, p: Project) =>
  s.projects.find((x) => x.id === p.id)!

describe('C. target selection', () => {
  const pick = (s: GameState, t: ContractTarget) =>
    pickTargets(s, t).map((p) => p.n)

  it('soonest end (ties: the larger rent); largest rent', () => {
    const { s } = company('s0', '2028Q2', [
      { type: 'hyperscaler', mw: 10, usdMwYr: 1.5e6, left: 10 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6 },
      { type: 'neocloud_sub_tenant', mw: 20, usdMwYr: 2e6, left: 6 },
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 30 },
    ])
    expect(pick(s, 'soonest')).toEqual([92])
    expect(pick(s, 'largest')).toEqual([93])
  })

  it('best tenant: hyperscaler > neocloud > AI lab (ties: the larger rent)', () => {
    const { s } = company('s2', '2028Q3', [
      { type: 'ai_lab', mw: 100, usdMwYr: 2e6, left: 10 },
      { type: 'hyperscaler', mw: 10, usdMwYr: 1.5e6, left: 10 },
      { type: 'hyperscaler', mw: 20, usdMwYr: 1.5e6, left: 10 },
    ])
    expect(pick(s, 'best')).toEqual([92])
  })

  it('distressed: the distressed with the largest rent, else the largest AI lab, else the largest non-hyperscaler', () => {
    const a = company('s1', '2028Q1', [
      { type: 'hyperscaler', mw: 100, usdMwYr: 1.5e6, left: 10 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
      { type: 'neocloud_sub_tenant', mw: 5, usdMwYr: 2e6, left: 10, distressed: true },
      { type: 'ai_lab', mw: 50, usdMwYr: 2e6, left: 10 },
    ])
    expect(pick(a.s, 'distressed')).toEqual([91])
    delete a.ps[1].tenant!.distressedQuarter
    delete a.ps[2].tenant!.distressedQuarter
    expect(pick(a.s, 'distressed')).toEqual([93])
    a.ps[3].tenant!.card = cardOfType('hyperscaler').id
    a.ps[1].tenant!.card = cardOfType('hyperscaler').id
    expect(pick(a.s, 'distressed')).toEqual([92])
    a.ps[2].tenant!.card = cardOfType('hyperscaler').id
    expect(pick(a.s, 'distressed')).toEqual([]) // only hyperscalers: no fit
  })

  it('every shell lease (not GPU contracts); all uncontracted live shell MW', () => {
    const { s, ps } = company('s3', '2027Q4', [
      { type: 'hyperscaler', mw: 10, usdMwYr: 1.5e6, left: 10 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10 },
    ])
    expect(pick(s, 'all_shell')).toEqual([90, 91, 92])
    ps[2].tenant = null
    expect(pick(s, 'uncontracted')).toEqual([92])
    ps[2].pendingRelet = { card: 'x', lapsedRentUsd: 1 }
    expect(pick(s, 'uncontracted')).toEqual([]) // already in a re-let RFP
  })

  it('no contract fits: the choice changes nothing and logs it', () => {
    const { s } = company('s2', '2029Q4', [])
    const cash = s.cash
    const t = play(s, 's2_c7', 'c1')
    expect(t.cash).toBe(cash)
    expect(t.log.at(-2)!.key).toBe('log.card_no_target')
  })
})

describe('B. the contract keys', () => {
  it('rent_index (s2_c7 "Reopen with tenant for +10%"): the largest rent × 1.1 for the rest of its term', () => {
    const { s, ps } = company('s2', '2029Q4', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 20 },
    ])
    const [a, b] = [rentOf(ps[0]), rentOf(ps[1])]
    const t = play(s, 's2_c7', 'c1')
    expect(rentOf(byId(t, ps[0]))).toBeCloseTo(a * 1.1, 4)
    expect(rentOf(byId(t, ps[1]))).toBeCloseTo(b, 4)
    expect(left(byId(t, ps[0]))).toBe(20)
  })

  it('term_add_years with rent_index (s0_c3 "Renew at the offer"): the soonest-ending contract × 0.75, 2 more years', () => {
    const { s, ps } = company('s0', '2028Q2', [
      { type: 'neocloud_sub_tenant', mw: 20, usdMwYr: 2e6, left: 1 },
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
    ])
    // Its renewal is open this quarter: the card's terms replace it.
    s.act3Renewals = [
      {
        projectId: ps[0].id,
        kind: 'shell',
        openedQuarter: s.quarter,
        walked: false,
        offer: { mult: 0.76, termQuarters: 28 },
        choice: null,
      },
    ]
    const rent = rentOf(ps[0])
    const t = play(s, 's0_c3', 'c1')
    const p = byId(t, ps[0])
    expect(rentOf(p)).toBeCloseTo(rent * 0.75, 4)
    expect(left(p)).toBe(9)
    expect(t.act3Renewals).toEqual([])
    const next = finish(t)
    expect(byId(next, ps[0]).tenant).not.toBeNull()
    expect(rentOf(byId(next, ps[0]))).toBeCloseTo(rent * 0.75, 4)
  })

  it('walk_prob (s0_c3 "Counter and risk a walk"): one roll now; a walk ends the contract at quarter end, else × 0.85', () => {
    const e = { target: 'soonest' as const, rentIndex: 0.85 }
    const stay = company('s0', '2028Q2', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6 },
    ])
    const rent = rentOf(stay.ps[0])
    applyContractEffect(stay.s, { ...e, walkProb: 0 }, substream(1, 'x'), 3)
    expect(rentOf(stay.ps[0])).toBeCloseTo(rent * 0.85, 4)
    const walk = company('s0', '2028Q2', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6 },
    ])
    walk.s.phase = 'live'
    applyContractEffect(walk.s, { ...e, walkProb: 1 }, substream(1, 'x'), 3)
    expect(rentOf(walk.ps[0])).toBeCloseTo(rent, 4) // nothing else applies to a walk
    const p = byId(finish(walk.s), walk.ps[0])
    expect(p.tenant).toBeNull() // shell → the re-let path, at no Bandwidth
    expect(p.pendingRelet).toBeDefined()
    // Through the real card: its own seeded roll, one of the two outcomes.
    const real = company('s0', '2028Q2', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6 },
    ])
    const t = play(real.s, 's0_c3', 'c2')
    const walked = t.act3Renewals!.some((r) => r.cause === 'card' && r.walked)
    if (!walked) expect(rentOf(byId(t, real.ps[0]))).toBeCloseTo(rent * 0.85, 4)
  })

  it('a walked GPU contract goes to spot at quarter end', () => {
    const s = toAct3(gpuCo, { scenario: 's1' })
    s.quarter = q('2028Q1')
    s.act3Renewals = []
    s.phase = 'live'
    const p = s.projects.find((x) => x.tenant?.gpu && x.stage === 'live')!
    p.tenant!.gpu!.termQuarters = p.tenant!.servedQuarters + 20
    for (const x of s.projects) if (x !== p && x.tenant) x.stage = 'sold'
    applyContractEffect(
      s,
      { target: 'largest', walkProb: 1 },
      substream(1, 'x'),
      3,
    )
    const after = byId(finish(s), p)
    expect(after.tenant).toBeNull()
    expect(after.spot).toBe(true)
  })

  it('rfp_weeks with rent_index (s0_c3 "Re-let to a new tenant"): leaves at quarter end; a 10-week RFP (1 quarter); re-let rent × 0.9', () => {
    const { s, ps } = company('s0', '2028Q2', [
      { type: 'neocloud_sub_tenant', mw: 20, usdMwYr: 2e6, left: 3 },
    ])
    const rent = rentOf(ps[0])
    const bw = s.bandwidth
    let t = play(s, 's0_c3', 'c3')
    expect(t.bandwidth).toBe(bw) // no Bandwidth: the card chose it
    t = finish(t)
    const p = byId(t, ps[0])
    expect(p.tenant).toBeNull()
    expect(p.emptyUntil).toBe(q('2028Q3'))
    t = finish(ok(t, { type: 'END_PLAN' }))
    const re = byId(t, ps[0])
    expect(CONTENT.quarters[t.quarter]).toBe('2028Q4')
    expect(rentOf(re)).toBeCloseTo(rent * rfpMid(t.quarter, 's0')! * 0.9, 2)
  })

  it('term_years 10 with rent_index (s2_c3 "Sign a 10-yr lock with your best tenant")', () => {
    const { s, ps } = company('s2', '2028Q3', [
      { type: 'ai_lab', mw: 100, usdMwYr: 2e6, left: 6 },
      { type: 'hyperscaler', mw: 20, usdMwYr: 1.5e6, left: 6 },
    ])
    const rent = rentOf(ps[1])
    const t = play(s, 's2_c3', 'c1')
    expect(left(byId(t, ps[1]))).toBe(40)
    expect(rentOf(byId(t, ps[1]))).toBeCloseTo(rent * 1.05, 4)
    expect(left(byId(t, ps[0]))).toBe(6)
  })

  it('term "spot" (s2_c3 "Go to spot on uncontracted MW"): a rolling 1-quarter lease, × 1.35 on its first quarter only', () => {
    const { s, ps } = company('s2', '2028Q3', [
      { type: 'hyperscaler', mw: 20, usdMwYr: 1.5e6, left: 20 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 20 },
    ])
    const open = ps[1]
    open.tenant = null
    const card = cardOfType('neocloud_sub_tenant')
    open.offers = [
      { id: 'o1', card: card.id, readyByQuarters: 0 },
      { id: 'o2', card: cardOfType('hyperscaler').id, readyByQuarters: 0 },
    ]
    const best = [card, cardOfType('hyperscaler')].sort(
      (a, b) => b.priceUsdMwYr - a.priceUsdMwYr,
    )[0]
    let t = play(s, 's2_c3', 'c2')
    let p = byId(t, open)
    expect(p.tenant).toMatchObject({ card: best.id, rolling: true, termQuarters: 1 })
    expect(p.tenant!.priceMult).toBeCloseTo(rfpMid(t.quarter, 's2')! * 1.35, 12)
    t = finish(t)
    p = byId(t, open)
    expect(p.tenant!.priceMult).toBeCloseTo(rfpMid(t.quarter, 's2')!, 12)
    expect(p.tenant!.servedQuarters).toBe(0)
    expect(t.act3Renewals!.some((r) => r.projectId === open.id)).toBe(false)
  })

  it('term "1yr" (s3_c6 "Roll shorter"): the largest contract has 4 quarters left, rent unchanged', () => {
    const { s, ps } = company('s3', '2028Q4', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 30 },
    ])
    const rent = rentOf(ps[0])
    const t = play(s, 's3_c6', 'c1')
    expect(left(byId(t, ps[0]))).toBe(4)
    expect(rentOf(byId(t, ps[0]))).toBeCloseTo(rent, 4)
  })

  it('term_years −3 with rent_index (s3_c3 "Ask tenants to reopen"): every shell × 0.8, 3 years shorter, at least 4 quarters', () => {
    const { s, ps } = company('s3', '2027Q4', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10 },
    ])
    const rents = ps.map(rentOf)
    const t = play(s, 's3_c3', 'c1')
    expect(left(byId(t, ps[0]))).toBe(8)
    expect(left(byId(t, ps[1]))).toBe(4)
    ps.forEach((p, i) =>
      expect(rentOf(byId(t, p))).toBeCloseTo(rents[i] * 0.8, 4),
    )
  })

  it('term_years −2 with rent_index (s3_c4 "Trade term for price"); "Accept −30%"', () => {
    const a = company('s3', '2028Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 16 },
    ])
    const rent = rentOf(a.ps[0])
    const t = play(a.s, 's3_c4', 'c2')
    expect(left(byId(t, a.ps[0]))).toBe(8)
    expect(rentOf(byId(t, a.ps[0]))).toBeCloseTo(rent * 0.8, 4)
    const b = company('s3', '2028Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 16 },
    ])
    const u = play(b.s, 's3_c4', 'c1')
    expect(rentOf(byId(u, b.ps[0]))).toBeCloseTo(rent * 0.7, 4)
    expect(left(byId(u, b.ps[0]))).toBe(16)
  })

  it('tenant_revenue_mult (s1_c3 "Renegotiate now"): × 0.7 for this term only; a renewal starts from the old rate', () => {
    const { s, ps } = company('s1', '2028Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6, distressed: true },
      { type: 'ai_lab', mw: 50, usdMwYr: 2e6, left: 6 },
    ])
    const rent = rentOf(ps[0])
    const t = play(s, 's1_c3', 'c1')
    const p = byId(t, ps[0])
    expect(rentOf(p)).toBeCloseTo(rent * 0.7, 4)
    expect(p.tenant!.revenueMult).toBe(0.7)
    t.act3Renewals = [
      {
        projectId: p.id,
        kind: 'shell',
        openedQuarter: t.quarter,
        walked: false,
        offer: { mult: 0.8, termQuarters: 16 },
        choice: null,
      },
    ]
    resolveRenewals(t)
    expect(rentOf(p)).toBeCloseTo(rent * 0.8, 4)
    expect(p.tenant!.revenueMult).toBeUndefined()
  })

  it('tenant_walk_chance with legal_cost (s1_c3 "Hold firm on take-or-pay"): the legal cost now, one roll', () => {
    const { s, ps } = company('s1', '2028Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 6, distressed: true },
    ])
    const cash = s.cash
    const t = play(s, 's1_c3', 'c2')
    expect(cash - t.cash).toBe(500_000)
    const walked = t.act3Renewals!.some(
      (r) => r.projectId === ps[0].id && r.walked,
    )
    expect(t.log.some((e) => e.key === 'log.card_walk')).toBe(walked)
  })

  it('recovery with legal_cost (s1_c7 "Sue for the shortfall"): 0.35 × 4 quarters of the unpaid rent, paid at the end of the quarter 2 on', () => {
    const { s, ps } = company('s1', '2029Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
    ])
    const expected = Math.round(0.35 * shortfallUsd(ps[0], 4))
    expect(shortfallUsd(ps[0], 4)).toBeCloseTo(20e6 * 0.5, 0)
    const cash = s.cash
    let t = play(s, 's1_c7', 'c1')
    expect(cash - t.cash).toBe(400_000)
    expect(t.act3Payouts).toEqual([
      { quarter: q('2029Q3'), usd: expected, reason: 'recovery' },
    ])
    t = finish(t)
    t = finish(ok(t, { type: 'END_PLAN' }))
    expect(t.log.some((e) => e.key === 'log.card_payout_recovery')).toBe(false)
    t = finish(ok(t, { type: 'END_PLAN' }))
    const paid = t.log.find((e) => e.key === 'log.card_payout_recovery')!
    expect(paid.params!.amountUsd).toBe(expected)
    expect(paid.quarter).toBe(q('2029Q3'))
  })

  it('"Re-let at spot" (s1_c7): a new tenant now at the old rent × 0.5, not in distress', () => {
    const { s, ps } = company('s1', '2029Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
    ])
    const rent = rentOf(ps[0])
    const t = play(s, 's1_c7', 'c2')
    const p = byId(t, ps[0])
    expect(rentOf(p)).toBeCloseTo(rent * 0.5, 4)
    expect(p.tenant!.distressedQuarter).toBeUndefined()
    expect(left(p)).toBe(10)
  })
})

describe('B. the other step-4 keys', () => {
  it('tenant_slots (s1_c1 "Diversify the pipeline"): 1 BW next quarter; +1 shell offer in every draw for 4 quarters', () => {
    const { s, ps } = company('s1', '2027Q2', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10 },
    ])
    const t = play(s, 's1_c1', 'c1')
    expect(t.events.bandwidthNext).toBe(-1)
    expect(t.events.extraShellOffers).toEqual({
      from: q('2027Q3'),
      until: q('2028Q2'),
      n: 1,
    })
    const draw = (quarter: number, extra: boolean) => {
      const u = structuredClone(t)
      u.quarter = quarter
      if (!extra) delete u.events.extraShellOffers
      const p = byId(u, ps[0])
      p.tenant = null
      drawOffers(u, p)
      return p.offers.length
    }
    const cap = CONTENT.projects.tenantCards.length
    for (const quarter of [q('2027Q3'), q('2028Q2')])
      expect(draw(quarter, true)).toBe(Math.min(cap, draw(quarter, false) + 1))
    expect(draw(q('2028Q3'), true)).toBe(draw(q('2028Q3'), false))
  })

  it('idle_mw (s0_c5 "Idle the old rigs"): the old-tier ASICs switch off until you turn them back on', () => {
    const { s } = company('s0', '2028Q3', [])
    const site = s.sites.find((x) => x.tier !== BALANCE.startSite)!
    s.machines.push(
      {
        id: 'lot-s9',
        model: 's9',
        siteId: site.id,
        condition: 'used',
        count: 100,
        failed: 0,
        earnsFromQuarter: 0,
      },
      {
        id: 'lot-s21',
        model: 's21',
        siteId: site.id,
        condition: 'new',
        count: 10,
        failed: 0,
        earnsFromQuarter: 0,
      },
    )
    // X = every S9 the company has (the company carries some from Act I, plus these 100).
    const x =
      s.machines
        .filter((l) => l.model === 's9')
        .reduce((n, l) => n + l.count, 0) * 1.32
    let t = play(s, 's0_c5', 'c1')
    const s9 = t.machines.find((l) => l.id === 'lot-s9')!
    expect(s9.idle).toBe(true)
    expect(isEarning(t, s9)).toBe(false)
    for (const l of t.machines) expect(!!l.idle).toBe(l.model === 's9')
    const log = t.log.find((e) => e.key === 'log.card_idle')!
    expect(log.params!.mw).toBeCloseTo(x / 1000, 10)
    t = finish(t)
    expect(t.machines.find((l) => l.id === 'lot-s9')!.idle).toBe(true) // stays off
    t = ok(t, { type: 'RESUME_IDLE_MACHINES' })
    expect(t.machines.find((l) => l.id === 'lot-s9')!.idle).toBeUndefined()
    expect(applyAction(t, { type: 'RESUME_IDLE_MACHINES' })).toMatchObject({
      ok: false,
      error: { key: 'error.nothing_idle' },
    })
  })

  it('mining_revenue_mult (s0_c5 "Run through it"): mining revenue × 0.9 for 4 quarters', () => {
    const { s } = company('s0', '2028Q3', [])
    const t = play(s, 's0_c5', 'c2')
    const m = t.events.modifiers.at(-1)!
    expect(m).toMatchObject({ kind: 'hashrate', siteIds: null, mult: 0.9 })
    expect(m.to - m.from + 1).toBe(52)
  })

  it('cash "+revenue_this_quarter*0.02" (s0_c6 "Bank it"): 2% of the quarter’s total revenue, paid at its end', () => {
    const { s } = company('s0', '2028Q4', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
    ])
    const t = finish(play(s, 's0_c6', 'c1'))
    const report = t.reports.at(-1)!
    const paid = t.log.find((e) => e.key === 'log.card_payout_revenue_share')!
    const total =
      report.revenueUsd + report.hostingFeesUsd + report.aiRevenueUsd
    expect(total).toBeGreaterThan(0)
    expect(paid.params!.amountUsd).toBe(Math.round(0.02 * total))
  })

  it('cash "+backstop_amount" (s1_c5 "Collect and continue"): the backstopped distressed rent over 4 quarters, now', () => {
    const { s, ps } = company('s1', '2028Q3', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
      { type: 'ai_lab', mw: 20, usdMwYr: 2e6, left: 10, distressed: true },
    ])
    ps[0].backstop = { leaseShare: 0.5, warrantsShare: 0.01, quarter: FIRST }
    const cash = s.cash
    const t = play(s, 's1_c5', 'c1')
    expect(t.cash - cash).toBe(Math.round(20e6 * 0.5)) // only the backstopped one
    const none = company('s1', '2028Q3', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
    ])
    const c0 = none.s.cash
    expect(play(none.s, 's1_c5', 'c1').cash).toBe(c0)
  })

  it('cash "+ev_stabilized*0.8" with mw "-X" (s1_c4 "Sell a stabilised site"): the smallest live contracted shell at × 0.80', () => {
    const { s, ps } = company('s1', '2028Q2', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
      { type: 'hyperscaler', mw: 10, usdMwYr: 1.5e6, left: 20 },
    ])
    const price = Math.round(saleValueUsd(s, ps[1]) * 0.8)
    const cash = s.cash
    const t = play(s, 's1_c4', 'c2')
    expect(byId(t, ps[1]).stage).toBe('sold')
    expect(byId(t, ps[0]).stage).toBe('live')
    expect(t.cash - cash).toBe(price)
  })

  it('debt_reduce (s1_c3 "Buy the debt at a discount"): $20M buys $30M off the largest balance; disabled without the cash', () => {
    const { s, ps } = company('s1', '2028Q1', [
      { type: 'ai_lab', mw: 10, usdMwYr: 2e6, left: 10, distressed: true },
    ])
    s.facilities = [
      {
        id: 'facility-90',
        kind: 'project_debt',
        projectId: ps[0].id,
        amountUsd: 80e6,
        balanceUsd: 50e6,
        apr: 0.08,
        tenorQuarters: 40,
        drawnQuarter: FIRST,
        missedQuarters: 0,
        rating: 'BB',
      },
      {
        id: 'facility-91',
        kind: 'ddtl',
        projectId: ps[0].id,
        amountUsd: 20e6,
        balanceUsd: 10e6,
        apr: 0.1,
        tenorQuarters: 12,
        drawnQuarter: FIRST,
        missedQuarters: 0,
        rating: 'BB',
      },
    ]
    s.cash = 25e6
    const t = play(structuredClone(s), 's1_c3', 'c3')
    expect(t.cash).toBe(5e6)
    expect(t.facilities.find((f) => f.id === 'facility-90')!.balanceUsd).toBe(
      20e6,
    )
    // Short of the $20M: the choice is disabled, with its reason.
    const poor = structuredClone(s)
    poor.cash = 19e6
    poor.phase = 'live'
    poor.interrupt = {
      id: 'event',
      event: act3CardEngineId('s1_c3'),
      week: 1,
      coin: 'BTC',
      changePct: 0,
    }
    expect(eventChoices(poor)).toEqual(['c1', 'c2'])
    expect(blockedEventChoices(poor)).toEqual([
      {
        id: 'c3',
        blocker: {
          key: 'error.no_cash',
          params: { costUsd: 20e6, cashUsd: 19e6 },
        },
      },
    ])
    expect(
      applyAction(poor, { type: 'RESOLVE_INTERRUPT', choice: 'c3' }),
    ).toMatchObject({ ok: false })
  })

  it('debt_maturity_years (s2_c8 "Extend duration"): the largest project debt runs 3 more years, re-spread', () => {
    const { s, ps } = company('s2', '2030Q2', [
      { type: 'hyperscaler', mw: 50, usdMwYr: 1.5e6, left: 20 },
    ])
    s.facilities = [
      {
        id: 'facility-90',
        kind: 'project_debt',
        projectId: ps[0].id,
        amountUsd: 80e6,
        balanceUsd: 40e6,
        apr: 0.07,
        tenorQuarters: 40,
        drawnQuarter: FIRST,
        missedQuarters: 0,
        rating: 'A',
      },
    ]
    const t = play(s, 's2_c8', 'c1')
    const f = t.facilities[0]
    // 20 quarters were left at $2M a quarter; now 32 quarters of $1.25M.
    expect(f.tenorQuarters).toBe(32)
    expect(f.amountUsd / f.tenorQuarters).toBeCloseTo(1.25e6, 6)
    expect(f.balanceUsd).toBe(40e6)
  })

  it('reveals (s3_c1 "Read the paper"): a free read of efficiency_index this quarter; the choice’s 1 BW is its cost', () => {
    const { s } = company('s3', '2027Q2', [])
    const reads = s.act3SignalReads!.length
    const t = play(s, 's3_c1', 'c1')
    expect(t.act3SignalReads!.slice(reads)).toEqual([
      { quarter: '2027Q2', indicator: 'efficiency_index' },
    ])
    expect(t.events.bandwidthNext).toBe(-1)
    expect(t.bandwidth).toBe(s.bandwidth)
  })

  it('a deferred choice stays a no-op, logged with its owning step (s0_c4 "Extend a small facility now": step 7)', () => {
    const { s } = company('s0', '2028Q2', [])
    const cash = s.cash
    const t = play(s, 's0_c4', 'c1')
    expect(t.cash).toBe(cash)
    expect(t.events.spreadAddBps).toBe(s.events.spreadAddBps)
    const log = t.log.find((e) => e.key === 'log.event_effects_deferred')!
    expect(log.params).toEqual({ effects: 'debt, debt_spread_bps', steps: 'step 7' })
  })
})
