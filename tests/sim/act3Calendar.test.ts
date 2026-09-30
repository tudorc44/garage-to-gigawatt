// M12.1: the contract calendar (read-only). Every signed tenant contract with the quarter its term ends
// (the last quarter served, on the engine's own clock), holdovers, and only current-quarter market data.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  actFirstQuarter,
} from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { playGame } from '../../src/sim/replay.ts'
import { contractCalendar } from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  annualRentUsd,
  contractQuarters,
  gpuContractUsdHr,
  tenantCard,
} from '../../src/sim/systems/projects.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)

/** Plays one quarter (defaults to every alert) and moves to the next Plan phase. */
function quarter(s: GameState): GameState {
  let r = applyAction(s, { type: 'END_PLAN' })
  if (!r.ok) throw new Error(r.error.key)
  s = r.state
  while (s.phase === 'live') {
    if (s.interrupt) {
      r = applyAction(s, {
        type: 'RESOLVE_INTERRUPT',
        choice: defaultChoice(s),
      })
      if (!r.ok) throw new Error(r.error.key)
      s = r.state
    } else s = advance(s)
  }
  if (s.phase !== 'report') return s
  r = applyAction(s, { type: 'NEXT_QUARTER' })
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

/**
 * Two real companies at the end of Act II: one with shell leases (sign-then-raise, seed 3) and one with
 * GPU contracts (overleveraged, seed 1). No bot ends Act II with both kinds.
 */
let shellCo: GameState
let gpuCo: GameState
const both = () => [shellCo, gpuCo]
beforeAll(() => {
  shellCo = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
  gpuCo = playGame(1, BOTS['overleveraged'], { through: 2 }).state
  expect(shellCo.projects.some((p) => p.tenant && !p.tenant.gpu)).toBe(true)
  expect(gpuCo.projects.some((p) => p.tenant?.gpu)).toBe(true)
}, 120_000) // two whole games to 2026Q4: slow under a full parallel run

describe('the calendar for an Act II company entering 2027Q1', () => {
  it('lists every signed tenant contract (no hosting), soonest end first', () => {
    for (const end of both()) {
      const s = toAct3(end, { scenario: 's0' })
      const cal = contractCalendar(s)
      const signed = s.projects.filter(
        (p) => p.tenant && !['sold', 'ended', 'foreclosed'].includes(p.stage),
      )
      expect(cal.map((e) => e.id).sort()).toEqual(
        signed.map((p) => p.id).sort(),
      )
      const ends = cal.map((e) => e.endQuarter ?? Infinity)
      expect([...ends].sort((a, b) => a - b)).toEqual(ends)
      for (const e of cal) {
        const p = s.projects.find((x) => x.id === e.id)!
        expect(e.kind).toBe(p.tenant!.gpu ? 'gpu' : 'shell')
        expect(e.termQuarters).toBe(contractQuarters(p))
        expect(e.reopenerEligible).toBe(false)
      }
    }
  })

  it('a live contract ends at: this quarter + (term − served) − 1; no clock restarts at the boundary', () => {
    for (const end of both()) {
      const s = toAct3(end, { scenario: 's1' })
      for (const e of contractCalendar(s)) {
        const p = s.projects.find((x) => x.id === e.id)!
        if (p.stage !== 'live') continue
        expect(e.endQuarter).toBe(
          s.quarter + contractQuarters(p) - p.tenant!.servedQuarters - 1,
        )
        // the same as at the end of 2026Q4, one quarter earlier on the same clock
        const before = end.projects.find((x) => x.id === e.id)!
        expect(before.tenant!.servedQuarters).toBe(p.tenant!.servedQuarters)
      }
    }
  })

  it('the engine agrees: each live GPU contract’s renewal opens exactly in its calendar end quarter', () => {
    const end = gpuCo
    let s = toAct3(end, { scenario: 's2' })
    const gpu = contractCalendar(s).filter(
      (e) =>
        e.kind === 'gpu' &&
        e.endQuarter !== null &&
        e.endQuarter < FIRST + 15 &&
        // live: its end is fixed (a building project's moves with delays, tested below)
        s.projects.find((p) => p.id === e.id)!.stage === 'live',
    )
    expect(gpu.length).toBeGreaterThan(0)
    for (const e of gpu) {
      let t = s
      // (M12.2: at its end quarter the contract comes up for renewal, instead of lapsing to spot.)
      while (t.quarter < e.endQuarter! && t.phase === 'plan') {
        const p = t.projects.find((x) => x.id === e.id)!
        expect(p.tenant, `${e.id} still contracted in its term`).not.toBeNull()
        expect(t.act3Renewals?.some((r) => r.projectId === e.id)).toBe(false)
        t = quarter(t)
      }
      if (t.phase === 'plan')
        expect(
          t.act3Renewals?.some((r) => r.projectId === e.id),
          `${e.id} renewal opens in its end quarter`,
        ).toBe(true)
    }
    s = toAct3(end, { scenario: 's2' })
    expect(s.quarter).toBe(FIRST)
  })

  it('shell leases: the contract rent and, in Act III, the new-lease reference = card rent × RFP midpoint', () => {
    for (const end of both())
      for (const id of SCENARIO_IDS) {
        const s = toAct3(end, { scenario: id })
        const row = CONTENT.act3Scenarios[id].quarterly[0]
        const mid =
          (row.rfp_new_lease_index_low! + row.rfp_new_lease_index_high!) / 2
        for (const e of contractCalendar(s).filter((x) => x.kind === 'shell')) {
          const p = s.projects.find((x) => x.id === e.id)!
          const card = tenantCard(p.tenant!.card)!
          expect(e.mw).toBe(p.kw / 1000)
          expect(e.annualRentUsd).toBeCloseTo(
            annualRentUsd(card, p.kw) * (p.tenant!.priceMult ?? 1),
            6,
          )
          expect(e.newLeaseRefUsd).toBeCloseTo(
            annualRentUsd(card, p.kw) * mid,
            6,
          )
        }
        for (const e of contractCalendar(s).filter((x) => x.kind === 'gpu')) {
          const p = s.projects.find((x) => x.id === e.id)!
          expect(e.gpus).toBe(p.tenant!.gpu!.gpus)
          expect(e.usdPerGpuHr).toBe(p.tenant!.gpu!.priceUsdHr)
          expect(e.marketUsdPerGpuHr).toBe(
            gpuContractUsdHr(p.gpu!, 1, FIRST, id),
          )
        }
      }
  })
})

describe('a contract on a project still being built', () => {
  it('ends at its planned go-live + term − 1, and moves when a delay moves the go-live', () => {
    const s = toAct3(gpuCo, { scenario: 's2' })
    const p = s.projects.find((x) => x.tenant && x.stage === 'building')!
    expect(p).toBeDefined()
    const e = contractCalendar(s).find((x) => x.id === p.id)!
    expect(e.endQuarter).toBe(p.readyQuarter! + contractQuarters(p) - 1)
    p.readyQuarter! += 1 // a construction delay
    expect(contractCalendar(s).find((x) => x.id === p.id)!.endQuarter).toBe(
      e.endQuarter! + 1,
    )
  })
})

describe('holdovers', () => {
  it('a shell lease whose term ran out before 2027Q1 is a holdover, due now, at its old rent', () => {
    const s = toAct3(shellCo, { scenario: 's3' })
    const p = s.projects.find(
      (x) => x.tenant && !x.tenant.gpu && x.stage === 'live',
    )!
    p.tenant!.servedQuarters = contractQuarters(p) + 3 // term ended 3 quarters ago
    const e = contractCalendar(s).find((x) => x.id === p.id)!
    expect(e.holdover).toBe(true)
    expect(e.endQuarter).toBe(s.quarter - 4)
    expect(e.quartersLeft).toBe(0)
    expect(e.annualRentUsd).toBeGreaterThan(0)
    // a holdover sorts first (it is the soonest due)
    expect(contractCalendar(s)[0].id).toBe(p.id)
  })

  it('a GPU contract past its term is already on spot (tenant null): not in the calendar', () => {
    const s = toAct3(gpuCo, { scenario: 's3' })
    const p = s.projects.find((x) => x.tenant?.gpu)!
    p.tenant = null
    p.spot = true
    expect(contractCalendar(s).some((e) => e.id === p.id)).toBe(false)
  })
})

describe('only current-quarter market data', () => {
  it('reads no later quarter of the scenario files (a later row throws if touched)', () => {
    for (const end of both())
      for (const id of SCENARIO_IDS) {
        const s = toAct3(end, { scenario: id })
        const sc = CONTENT.act3Scenarios[id]
        const saved = { q: [...sc.quarterly], i: [...sc.inputs] }
        const trap = <T extends object>(row: T, n: number): T =>
          new Proxy(row, {
            get() {
              throw new Error(`future quarter ${n} read`)
            },
          })
        for (let n = 1; n < 16; n++) {
          sc.quarterly[n] = trap(sc.quarterly[n], n)
          sc.inputs[n] = trap(sc.inputs[n], n)
        }
        try {
          expect(() => contractCalendar(s)).not.toThrow()
        } finally {
          sc.quarterly.splice(0, 16, ...saved.q)
          sc.inputs.splice(0, 16, ...saved.i)
        }
      }
  })

  it('shows no renewal offer: no offer, multiplier or walk field on any entry', () => {
    for (const end of both())
      for (const e of contractCalendar(toAct3(end, { scenario: 's1' })))
        expect(
          Object.keys(e).filter((k) => /offer|walk|multiplier|band/i.test(k)),
        ).toEqual([])
  })
})

describe('Act II is unchanged', () => {
  it('in Act II the calendar lists the same contracts, with no Act III reference prices', () => {
    for (const end of both()) {
      const cal = contractCalendar(end)
      expect(cal.length).toBeGreaterThan(0)
      for (const e of cal) {
        expect(e.newLeaseRefUsd).toBeNull()
        expect(e.marketUsdPerGpuHr).toBeNull()
      }
    }
  })
})
