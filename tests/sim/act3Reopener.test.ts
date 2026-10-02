// M12.3: the reopener clause (F-2, doc 27 §6). An Act III-signed shell lease in its third year can be
// reopened: by the tenant (automatically, when Band high < 0.90) or by the player (1 BW). The party that
// reopens pays the other half a quarter's rent, then M12.2's renewal runs at once.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BALANCE,
  CONTENT,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame } from '../../src/sim/replay.ts'
import { contractCalendar } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { renewalBand } from '../../src/sim/systems/leaseIndex.ts'
import {
  annualRentUsd,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import {
  openTenantReopeners,
  playerReopenBlocker,
} from '../../src/sim/systems/renewals.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)
const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** Plays one quarter (defaults to every alert); returns the next Plan phase. */
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
}, 120_000)

const cardOfType = (type: string) =>
  CONTENT.projects.tenantCards.find((c) => c.type === type)!
const rentOf = (p: Project) =>
  annualRentUsd(tenantCard(p.tenant!.card)!, p.kw) * (p.tenant!.priceMult ?? 1)

/**
 * An Act III state at `label` whose first live shell is a `type` lease of `mw` MW at `usdMwYr`, signed
 * (and live) in 2027Q1, `served` quarters in, with a long term left; no renewals open.
 */
function leaseAt(
  id: ScenarioId,
  label: string,
  o: { type: string; mw: number; usdMwYr: number; served: number },
): { s: GameState; p: Project } {
  const s = toAct3(shellCo, { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  const p = s.projects.find(
    (x) => x.tenant && !x.tenant.gpu && x.stage === 'live',
  )!
  const card = cardOfType(o.type)
  p.kw = o.mw * 1000
  // The worked examples assume a neutral hall: a mid-tier shell (× 1.00 from 2027Q3, M16.2).
  p.tier = 'mid'
  const t = p.tenant!
  t.card = card.id
  t.priceMult = o.usdMwYr / card.priceUsdMwYr
  t.signedQuarter = FIRST
  t.servedQuarters = o.served
  t.termQuarters = 40
  delete t.distressedQuarter
  delete t.revenueMult
  s.bandwidth = 6
  return { s, p }
}

describe('M18.9 (DT): a carried Act II lease is reopened by its tenant only in a bust, and only by a weaker tenant', () => {
  const carried = (id: ScenarioId, label: string, type: string) => {
    const x = leaseAt(id, label, { type, mw: 10, usdMwYr: 2e6, served: 12 })
    x.p.tenant!.signedQuarter = FIRST - 1
    openTenantReopeners(x.s)
    return x.s.act3Renewals!.length
  }
  it('S1 2028Q3 (band high 0.60): an AI lab or a neocloud reopens; a hyperscaler never', () => {
    expect(renewalBand(q('2028Q3'), 's1')!.hi).toBeLessThan(0.75)
    expect(carried('s1', '2028Q3', 'ai_lab')).toBe(1)
    expect(carried('s1', '2028Q3', 'neocloud_sub_tenant')).toBe(1)
    expect(carried('s1', '2028Q3', 'hyperscaler')).toBe(0)
  })
  it('S0 2029Q1 (band high 0.80, under 0.90 but over 0.75): no carried lease reopens; an Act III lease still does', () => {
    expect(carried('s0', '2029Q1', 'ai_lab')).toBe(0)
    const own = leaseAt('s0', '2029Q1', { type: 'ai_lab', mw: 10, usdMwYr: 2e6, served: 8 })
    own.p.tenant!.signedQuarter = FIRST
    openTenantReopeners(own.s)
    expect(own.s.act3Renewals).toHaveLength(1)
  })
  it('the player may still reopen a carried hyperscaler lease (12 quarters served, the fee)', () => {
    const x = leaseAt('s0', '2029Q1', { type: 'hyperscaler', mw: 10, usdMwYr: 2e6, served: 12 })
    x.p.tenant!.signedQuarter = FIRST - 1
    expect(playerReopenBlocker(x.s, x.p.id)).toBeUndefined()
  })
})

// (M18.8: S3's band rebounds from 2029Q1, so the worked example moved from 2030Q1 to 2028Q3: the same band
// 0.60–0.70 and the same 3.5-year offered term; its card defaults to "Wait", unlike 2028Q4's "Roll shorter".)
describe('the tenant reopens (S3 worked example)', () => {
  it('20 MW neocloud at $2.2M/MW-yr in 2028Q3: it pays $5.5M; offer 0.625 → $27.5M/yr; term 3.5 → 4 years', () => {
    const { s, p } = leaseAt('s3', '2028Q3', {
      type: 'neocloud_sub_tenant',
      mw: 20,
      usdMwYr: 2.2e6,
      served: 12,
    })
    const band = renewalBand(s.quarter, 's3')!
    expect(band.lo).toBeCloseTo(0.6, 10)
    expect(band.hi).toBeCloseTo(0.7, 10)
    expect(rentOf(p)).toBeCloseTo(44e6, 0)
    const cash = s.cash
    openTenantReopeners(s)
    expect(s.cash - cash).toBe(5.5e6)
    const r = s.act3Renewals!.find((x) => x.projectId === p.id)!
    expect(r).toMatchObject({ cause: 'reopener', by: 'tenant', walked: false })
    expect(r.offer!.mult).toBeCloseTo(0.625, 10)
    expect(r.offer!.termQuarters).toBe(16)
    // Undecided: the default (accept) signs at quarter end; the new term starts next quarter.
    const next = quarter(s).projects.find((x) => x.id === p.id)!
    expect(rentOf(next)).toBeCloseTo(27.5e6, 0)
    expect(next.tenant!.termQuarters).toBe(16)
    expect(next.tenant!.servedQuarters).toBe(0)
  })

  it('only when Band high < 0.90, and at most once per lease in 4 quarters', () => {
    // S2 2029Q1: the band is 1.00–1.10, the market is above the lease: no tenant reopens.
    const up = leaseAt('s2', '2029Q1', {
      type: 'neocloud_sub_tenant',
      mw: 20,
      usdMwYr: 2.2e6,
      served: 8,
    })
    expect(renewalBand(up.s.quarter, 's2')!.hi).toBeGreaterThanOrEqual(
      BALANCE.act3.reopener.tenantTriggerBandHigh,
    )
    openTenantReopeners(up.s)
    expect(up.s.act3Renewals).toEqual([])
    const opts = {
      type: 'ai_lab',
      mw: 10,
      usdMwYr: 2e6,
      served: 12,
    }
    const recent = leaseAt('s3', '2028Q3', opts)
    recent.p.tenant!.reopenedQuarter = recent.s.quarter - 3
    openTenantReopeners(recent.s)
    expect(recent.s.act3Renewals).toEqual([])
    const due = leaseAt('s3', '2028Q3', opts)
    due.p.tenant!.reopenedQuarter = due.s.quarter - 4
    openTenantReopeners(due.s)
    expect(due.s.act3Renewals).toHaveLength(1)
  })

  it('refused through re-let (1 BW): the tenant leaves at quarter end, the re-let runs, the fee stays paid', () => {
    const { s, p } = leaseAt('s3', '2028Q3', {
      type: 'neocloud_sub_tenant',
      mw: 20,
      usdMwYr: 2.2e6,
      served: 12,
    })
    const cash = s.cash
    openTenantReopeners(s)
    const t = ok(s, { type: 'RENEWAL_RELET', projectId: p.id })
    expect(t.bandwidth).toBe(s.bandwidth - 1)
    expect(t.cash - cash).toBe(5.5e6)
    const next = quarter(t).projects.find((x) => x.id === p.id)!
    expect(next.tenant).toBeNull()
    expect(next.pendingRelet).toBeDefined()
  })

  it('the tenant reopener fires in play: at the start of a Plan phase, after the renewals open', () => {
    const { s, p } = leaseAt('s3', '2028Q2', {
      type: 'neocloud_sub_tenant',
      mw: 20,
      usdMwYr: 2.2e6,
      served: 11,
    })
    // 2028Q3 (band high 0.70): the lease has served 12 quarters by then.
    const t = quarter(s)
    expect(CONTENT.quarters[t.quarter]).toBe('2028Q3')
    const r = t.act3Renewals!.find((x) => x.projectId === p.id)
    expect(r).toMatchObject({ cause: 'reopener', by: 'tenant' })
  })
})

describe('the player reopens (S2 worked example)', () => {
  it('a hyperscaler lease in 2029Q1: 1 BW and half a quarter’s rent; offer 1.00×; a counter can reach 1.10×', () => {
    const { s, p } = leaseAt('s2', '2029Q1', {
      type: 'hyperscaler',
      mw: 20,
      usdMwYr: 1.5e6,
      served: 8,
    })
    expect(playerReopenBlocker(s, p.id)).toBeUndefined()
    const t = ok(s, { type: 'REOPEN_LEASE', projectId: p.id })
    expect(t.bandwidth).toBe(s.bandwidth - 1)
    expect(s.cash - t.cash).toBe(Math.round((0.5 * 30e6) / 4))
    const r = t.act3Renewals!.find((x) => x.projectId === p.id)!
    expect(r).toMatchObject({ cause: 'reopener', by: 'player' })
    expect(r.offer!.mult).toBeCloseTo(1.0, 10)
    const n = ok(t, {
      type: 'DEAL_NEGOTIATE_START',
      projectId: p.id,
      renewal: true,
    })
    expect(n.dealNegotiation!.opening).toBeCloseTo(1.0, 10)
    expect(n.dealNegotiation!.limit).toBeCloseTo(1.1, 10)
    // The player can't turn their own reopener into a re-let.
    expect(applyAction(t, { type: 'RENEWAL_RELET', projectId: p.id })).toMatchObject({
      ok: false,
      error: { key: 'error.reopener_no_relet' },
    })
  })

  it('backing out (a failed counter): the lease runs on at its old rent; the fee stays paid', () => {
    const { s, p } = leaseAt('s2', '2029Q1', {
      type: 'hyperscaler',
      mw: 20,
      usdMwYr: 1.5e6,
      served: 8,
    })
    const before = rentOf(p)
    const t = ok(s, { type: 'REOPEN_LEASE', projectId: p.id })
    // (What round 3's walk does to a renewal: dealNegotiation.ts marks it walked.)
    t.act3Renewals!.find((x) => x.projectId === p.id)!.walked = true
    const next = quarter(t)
    const after = next.projects.find((x) => x.id === p.id)!
    expect(after.tenant).not.toBeNull()
    expect(rentOf(after)).toBeCloseTo(before, 6)
    expect(after.tenant!.servedQuarters).toBe(9) // the old term runs on
    expect(next.log.some((e) => e.key === 'log.reopener_kept')).toBe(true)
  })
})

describe('eligibility', () => {
  it('M18.8: an Act II-signed lease from 12 quarters served (not before); an Act III one from 8; a GPU contract never', () => {
    const { s, p } = leaseAt('s3', '2030Q1', {
      type: 'ai_lab',
      mw: 10,
      usdMwYr: 2e6,
      served: 12,
    })
    expect(contractCalendar(s).find((e) => e.id === p.id)!.reopenerEligible).toBe(
      true,
    )
    p.tenant!.signedQuarter = FIRST - 1 // signed in Act II: eligible at 12 served (M18.8, DT)
    expect(playerReopenBlocker(s, p.id)).toBeUndefined()
    p.tenant!.servedQuarters = 11
    expect(playerReopenBlocker(s, p.id)?.key).toBe('error.reopener_not_eligible')
    openTenantReopeners(s)
    expect(s.act3Renewals).toEqual([])
    p.tenant!.servedQuarters = 12
    p.tenant!.signedQuarter = FIRST
    p.tenant!.servedQuarters = 7 // still in year 2
    expect(playerReopenBlocker(s, p.id)?.key).toBe('error.reopener_not_eligible')
    const g = toAct3(gpuCo, { scenario: 's3' })
    g.quarter = q('2030Q1')
    g.act3Renewals = []
    const gp = g.projects.find((x) => x.tenant?.gpu && x.stage === 'live')!
    gp.tenant!.signedQuarter = FIRST
    gp.tenant!.servedQuarters = 12
    gp.tenant!.gpu!.termQuarters = 40
    expect(playerReopenBlocker(g, gp.id)?.key).toBe('error.reopener_not_eligible')
    openTenantReopeners(g)
    expect(g.act3Renewals).toEqual([])
  })

  it('nothing happens outside Act III', () => {
    const s = structuredClone(shellCo)
    s.phase = 'plan' // (2026Q4, Act II)
    const p = s.projects.find((x) => x.tenant && !x.tenant.gpu)!
    p.tenant!.servedQuarters = 12
    expect(playerReopenBlocker(s, p.id)?.key).toBe('error.reopener_not_eligible')
    openTenantReopeners(s)
    expect(s.act3Renewals).toBeUndefined()
  })
})
