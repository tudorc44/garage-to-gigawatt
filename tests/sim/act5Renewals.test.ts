// M58.1-2 (doc 43 §0.15 fixes 1 and 2): Act V's lease renewals and the interest on cash. A shell lease renews at its
// 2035Q4 rent × scarcity_index (the gate's §0.6 path), not a GPU or band index; a lease signed inside Act V is normalised
// by the index the quarter it was signed. Walks at renewal are the base ÷ scarcity_index. From 2036Q1 a positive cash
// balance earns SOFR ÷ 4 a quarter (Act V only).
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { ledgerQuarters } from '../../src/sim/ledger.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { sofr } from '../../src/sim/systems/finance.ts'
import { walkProbAtRenewal } from '../../src/sim/systems/leaseIndex.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { renewalOffer, renewalWalkChance } from '../../src/sim/systems/renewals.ts'
import { tenantCard } from '../../src/sim/systems/projects.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

let end4: GameState | null = null
/** The Firm Builder preset at 2035Q4 (a ground landlord: its shells are leased). */
function act4Finished(): GameState {
  if (!end4) {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    end4 = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never })
  }
  return structuredClone(end4)
}
const first5 = actFirstQuarter(5)
const q = (label: string) => CONTENT.quarters.indexOf(label)

function shellLease(s: GameState) {
  const p = s.projects.find((x) => x.kind === 'shell' && x.stage === 'live' && x.tenant && !x.tenant.gpu)
  if (!p) throw new Error('no shell lease')
  return p
}

describe('Act V lease renewals (M58.1, doc 43 §0.15 fix 1)', () => {
  it('in V1 after 2037Q4 a renewal offer is ≥ the expiring rent: the 2035Q4 rent × scarcity_index', () => {
    for (const label of ['2038Q1', '2039Q2', '2040Q4']) {
      const s = toAct5(act4Finished(), { vfuture: 'v1' })
      s.quarter = q(label)
      const p = shellLease(s)
      const offer = renewalOffer(s, p)!
      const idx = act5Row(s.quarter, scenarioOf(s))!.scarcity_index
      expect(offer.mult).toBeCloseTo(idx, 10)
      expect(offer.mult).toBeGreaterThanOrEqual(1)
    }
  })

  it('in V3 after the trigger the offer falls with the index; a lease signed in Act V is normalised by its signing index', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v3' })
    s.quarter = q('2040Q2')
    const p = shellLease(s)
    const idx = act5Row(s.quarter, scenarioOf(s))!.scarcity_index
    expect(idx).toBeLessThan(1)
    expect(renewalOffer(s, p)!.mult).toBeCloseTo(idx, 10)
    p.tenant!.signedQuarter = q('2039Q1')
    const signedIdx = act5Row(q('2039Q1'), scenarioOf(s))!.scarcity_index
    expect(renewalOffer(s, p)!.mult).toBeCloseTo(idx / signedIdx, 10)
  })

  it('the walk chance is the base ÷ scarcity_index (fewer walks in V1, more in V3)', () => {
    for (const v of ['v1', 'v3'] as const) {
      const s = toAct5(act4Finished(), { vfuture: v })
      s.quarter = q('2040Q1')
      const p = shellLease(s)
      const base = walkProbAtRenewal(s.quarter, scenarioOf(s), tenantCard(p.tenant!.card)!.type)
      const idx = act5Row(s.quarter, scenarioOf(s))!.scarcity_index
      expect(renewalWalkChance(s, p)).toBeCloseTo(base / idx, 12)
    }
  })
})

describe('Act V interest on cash (M58.2, doc 43 §0.15 fix 2)', () => {
  it('each Act V quarter books cash × SOFR ÷ 4 as interest income; Act IV booked none', () => {
    const start = toAct5(act4Finished(), { vfuture: 'v2' })
    const run = playFrom(start, { plan: () => [] }, { through: 5 })
    const qs = ledgerQuarters(run.state)
    const q5 = qs.find((x) => x.q === first5)!
    expect(q5.lines.interest ?? 0).toBeGreaterThan(0)
    // the booking is the quarter-end cash before it × SOFR ÷ 4: bounded by the quarter's start and end cash
    const r = sofr(first5, scenarioOf(start)) / 4
    expect(q5.lines.interest!).toBeLessThanOrEqual(Math.max(q5.startCash, run.state.reports[run.state.reports.findIndex((x) => x.quarter === '2036Q1')].cash) * r + 1)
    const q4 = qs.find((x) => x.q === first5 - 1)
    expect(q4?.lines.interest ?? 0).toBeLessThanOrEqual(0)
  })
})
