// M12.4: blend-and-extend offers (the design thread's proposal, approved by the owner 30 Sep 2026). From
// 2028Q1, in a shell lease's anniversary quarter, a tenant with more than 8 quarters left offers to
// extend by the offered shell term at one blended rent: current × (R + E × Band mid) / (R + E).
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playFrom, playGame } from '../../src/sim/replay.ts'
import { blendOffers } from '../../src/sim/selectors.ts'
import { toAct3, type GameState, type Project } from '../../src/sim/state.ts'
import { openBlendOffers } from '../../src/sim/systems/blendExtend.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  offeredTermYears,
  renewalBand,
} from '../../src/sim/systems/leaseIndex.ts'
import {
  annualRentUsd,
  contractQuarters,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)
const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

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

const rentOf = (p: Project) =>
  annualRentUsd(tenantCard(p.tenant!.card)!, p.kw) * (p.tenant!.priceMult ?? 1)
const left = (p: Project) => contractQuarters(p) - p.tenant!.servedQuarters

/** An Act III state at `label` whose only lease is a live shell `served` quarters in with `quartersLeft` to go. */
function leaseAt(
  id: ScenarioId,
  label: string,
  served: number,
  quartersLeft: number,
): { s: GameState; p: Project } {
  const s = toAct3(shellCo, { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  const p = s.projects.find(
    (x) => x.tenant && !x.tenant.gpu && x.stage === 'live',
  )!
  for (const x of s.projects) if (x !== p && x.tenant) x.stage = 'sold'
  const t = p.tenant!
  t.servedQuarters = served
  t.termQuarters = served + quartersLeft
  delete t.distressedQuarter
  return { s, p }
}

describe('the offer', () => {
  it('S2 2029Q1 (Band 1.00–1.10, E = 11 years), 5 years left: a small raise for 16 years', () => {
    const { s, p } = leaseAt('s2', '2029Q1', 8, 20)
    const band = renewalBand(s.quarter, 's2')!
    const e = offeredTermYears(s.quarter, 's2', 'shell')!
    expect([band.lo, band.hi, e]).toEqual([1.0, 1.1, 11])
    const rent = rentOf(p)
    openBlendOffers(s)
    const [o] = blendOffers(s)
    expect(o.mult).toBeCloseTo((5 + 11 * 1.05) / 16, 12) // 1.034375
    expect(o.extendYears).toBe(11)
    expect(o.blendedRentUsd).toBeCloseTo(rent * o.mult, 4)
    const t = ok(s, { type: 'BLEND_ACCEPT', projectId: p.id })
    const after = t.projects.find((x) => x.id === p.id)!
    expect(rentOf(after)).toBeCloseTo(rent * 1.034375, 4)
    expect(left(after)).toBe(20 + 44)
    expect(t.bandwidth).toBe(s.bandwidth) // 0 Bandwidth
    expect(t.act3BlendOffers).toEqual([])
    expect(applyAction(t, { type: 'BLEND_ACCEPT', projectId: p.id })).toMatchObject({
      ok: false,
      error: { key: 'error.no_blend_offer' },
    })
  })

  it('S1 2028Q3 (Band 0.44–0.60): accepting locks in a cut', () => {
    const { s, p } = leaseAt('s1', '2028Q3', 4, 20)
    const band = renewalBand(s.quarter, 's1')!
    const e = offeredTermYears(s.quarter, 's1', 'shell')!
    openBlendOffers(s)
    const mid = (band.lo + band.hi) / 2
    expect(blendOffers(s)[0].mult).toBeCloseTo((5 + e * mid) / (5 + e), 12)
    expect(blendOffers(s)[0].mult).toBeLessThan(1)
    const rent = rentOf(p)
    const t = ok(s, { type: 'BLEND_ACCEPT', projectId: p.id })
    expect(rentOf(t.projects.find((x) => x.id === p.id)!)).toBeLessThan(rent)
  })

  it('ignored (the default): nothing changes, and the offer lapses', () => {
    const { s, p } = leaseAt('s2', '2029Q1', 8, 20)
    openBlendOffers(s)
    expect(s.act3BlendOffers).toHaveLength(1)
    const rent = rentOf(p)
    const t = quarter(s)
    const after = t.projects.find((x) => x.id === p.id)!
    expect(rentOf(after)).toBeCloseTo(rent, 6)
    expect(left(after)).toBe(19)
    expect(t.act3BlendOffers).toEqual([]) // 2029Q2 isn't its anniversary
    expect(applyAction(t, { type: 'BLEND_ACCEPT', projectId: p.id })).toMatchObject({
      ok: false,
    })
  })
})

describe('who gets one', () => {
  const offered = (s: GameState) => {
    openBlendOffers(s)
    return (s.act3BlendOffers ?? []).length
  }

  it('from 2028Q1, only in the anniversary quarter, only with more than 8 quarters left', () => {
    expect(offered(leaseAt('s0', '2027Q4', 8, 20).s)).toBe(0)
    expect(offered(leaseAt('s0', '2028Q1', 8, 20).s)).toBe(1)
    expect(offered(leaseAt('s0', '2028Q1', 9, 20).s)).toBe(0)
    expect(offered(leaseAt('s0', '2028Q1', 0, 20).s)).toBe(0)
    expect(offered(leaseAt('s0', '2028Q1', 12, 8).s)).toBe(0)
    expect(offered(leaseAt('s0', '2028Q1', 12, 9).s)).toBe(1)
  })

  it('once a year: the next offer comes 4 quarters later, in play', () => {
    let { s } = leaseAt('s0', '2028Q1', 7, 21)
    const quarters: string[] = []
    for (let i = 0; i < 6; i++) {
      s = quarter(s)
      const label = CONTENT.quarters[s.quarter]
      if ((s.act3BlendOffers ?? []).length > 0) quarters.push(label)
      // M18.8: this carried Act II lease is reopenable from 12 quarters served (2029Q2); a tenant reopener opens a
      // renewal, which takes the place of that quarter's blend-and-extend offer
      else if (s.log.some((e) => e.key === 'log.reopener_tenant' && CONTENT.quarters[e.quarter] === label))
        quarters.push(`${label} reopened`)
    }
    expect(quarters[0]).toBe('2028Q2')
    expect(['2029Q2', '2029Q2 reopened']).toContain(quarters[1])
    expect(quarters).toHaveLength(2)
  })

  it('never a GPU contract, a lease with a renewal open, or outside Act III', () => {
    const g = toAct3(gpuCo, { scenario: 's2' })
    g.quarter = q('2029Q1')
    g.act3Renewals = []
    for (const p of g.projects)
      if (p.tenant?.gpu) {
        p.tenant.servedQuarters = 8
        p.tenant.gpu.termQuarters = 40
      } else if (p.tenant) p.stage = 'sold'
    expect(offered(g)).toBe(0)
    const { s, p } = leaseAt('s2', '2029Q1', 8, 20)
    s.act3Renewals = [
      {
        projectId: p.id,
        kind: 'shell',
        openedQuarter: s.quarter,
        walked: false,
        offer: { mult: 1, termQuarters: 44 },
        choice: null,
        cause: 'reopener',
        by: 'tenant',
      },
    ]
    expect(offered(s)).toBe(0)
    const a2 = structuredClone(shellCo)
    for (const p2 of a2.projects)
      if (p2.tenant && !p2.tenant.gpu) {
        p2.tenant.servedQuarters = 8
        p2.tenant.termQuarters = 40
      }
    expect(offered(a2)).toBe(0)
    expect(a2.act3BlendOffers).toBeUndefined()
  })

  it('bots ignore it: a whole Act III played by a bot gets offers and never accepts', () => {
    const start = toAct3(shellCo, { scenario: 's2' })
    expect(start.quarter).toBe(FIRST)
    const end = playFrom(start, BOTS['sign-then-raise'], { through: 3 }).state
    const n = (key: string) => end.log.filter((e) => e.key === key).length
    expect(n('log.blend_offer')).toBeGreaterThan(0)
    expect(n('log.blend_signed')).toBe(0)
  }, 60_000)
})
