// M29.3 (doc 33 §8, IV-D14, IV-D15): Act IV's launch manifests and insurance. Bookings (window, slots, weight limits,
// the 15% deposit), the build at the end of the Plan phase, the launch at the end of its quarter (slips, the closed
// shell, the grounding, failures), insurance (young and mature rates, the capacity cap, payouts, the hard market) and the
// export clampdown's capex. Provider odds are pinned in a few tests (restored after) so each outcome is certain.
import { afterEach, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import { ORBIT, provider } from '../../src/content/orbitContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import {
  buildCostUsd,
  endQuarterLaunches,
  insuranceQuote,
  launchFailureShare,
  startOrbitalBuilds,
  startQuarterOrbitBuilds,
} from '../../src/sim/systems/orbitLaunch.ts'
import { act, orbitCompany, playQuarter } from './act4Helpers.ts'

const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}
const Q = (label: string) => CONTENT.quarters.indexOf(label)

const saved = ORBIT.launch.providers.map((p) => ({ ...p }))
afterEach(() => ORBIT.launch.providers.forEach((p, i) => Object.assign(p, saved[i])))
/** Pins a provider's odds for one test. */
const pin = (id: 'pallas' | 'northgate' | 'kestrel', slipPct: number, failure: number) =>
  Object.assign(provider(id), { slip_pct: slipPct, bump_pct_when_tight: 0, failure_pct_by_year: { '2031': failure } })

/** A 10 MW Gen 31 block in SSO with every slot filled, a licence approved and a Pallas launch booked 2 quarters out. */
function readyBlock(kind: 'shell' | 'cloud' = 'shell', future: 'f1' | 'f3' = 'f1'): GameState {
  let s = orbitCompany(future)
  s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind, mw: 10, shell: 'sso', gen: 'gen31' })
  s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 'spot' })
  s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1' })
  s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
  s.act4Orbit!.licences[0].approvedQuarter = s.quarter // (approved now, for the test)
  s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
  return s
}

describe('launch manifests (M29.3)', () => {
  it('a booking: 2-6 quarters ahead, 1 Bandwidth, a 15% deposit at the locked $/kg; no sovereign launcher yet', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    const book = (provider: 'pallas' | 'sovereign', quarter: number): Action => ({
      type: 'BOOK_ORBITAL_LAUNCH',
      blockId: 'ob1',
      provider,
      quarter,
    })
    expect(err(s, book('pallas', s.quarter + 1))).toBe('error.orbit_launch_window')
    expect(err(s, book('pallas', s.quarter + 7))).toBe('error.orbit_launch_window')
    expect(err(s, book('sovereign', s.quarter + 3))).toBe('error.orbit_provider_needs_partner')
    const cash = s.cash
    const bw = s.bandwidth
    const x = act(s, book('pallas', s.quarter + 3))
    const l = orbitBlock(x, 'ob1')!.launch!
    expect(l.priceUsdKg).toBe(600) // 2031Q1: $600/kg × Pallas 1.0 × SSO 1.0
    expect(l.depositUsd).toBeCloseTo(0.15 * 180_000 * 600)
    expect(x.cash).toBeCloseTo(cash - l.depositUsd)
    expect(x.bandwidth).toBe(bw - 1)
  })

  it('slots and weight: one quarter’s third-party slots cap your bookings there; Kestrel takes 250 t at most', () => {
    let s = orbitCompany()
    // 25 MW of Gen 31 in SSO is 450 t, over 2031's 400 t a quarter
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 25, shell: 'sso', gen: 'gen31' })
    expect(err(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })).toBe(
      'error.orbit_launch_no_slots',
    )
    // two 10 MW blocks (180 t each) fit one quarter; a third doesn't
    for (let i = 0; i < 3; i++) s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    const q = s.quarter + 2
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob2', provider: 'pallas', quarter: q })
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob3', provider: 'northgate', quarter: q })
    expect(err(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob4', provider: 'pallas', quarter: q })).toBe(
      'error.orbit_launch_no_slots',
    )
    expect(err(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob4', provider: 'kestrel', quarter: q + 1 })).toBeNull()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 25, shell: 'high_leo', gen: 'gen31' })
    expect(err(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob5', provider: 'kestrel', quarter: q + 2 })).toBe(
      'error.orbit_launch_too_heavy',
    )
  })

  it('the build starts at the end of the Plan phase with all three slots and licence room, paid in cash; the launch waits for it', () => {
    const s = readyBlock()
    const b = orbitBlock(s, 'ob1')!
    const cost = buildCostUsd(s, b)
    expect(cost).toBeCloseTo(180_000 * 800)
    const x = structuredClone(s)
    startOrbitalBuilds(x)
    const xb = orbitBlock(x, 'ob1')!
    expect(xb.stage).toBe('building')
    expect(x.cash).toBeCloseTo(s.cash - cost)
    expect(xb.capexSpentUsd).toBeCloseTo(cost + b.launch!.depositUsd)
    expect(xb.buildDoneQuarter).toBe(s.quarter + 2)
    // no licence room → it waits
    const y = structuredClone(s)
    y.act4Orbit!.licences = []
    startOrbitalBuilds(y)
    expect(orbitBlock(y, 'ob1')!.stage).toBe('proposed')
    // a launch booked before the build can be done moves to the build's end
    const z = structuredClone(s)
    orbitBlock(z, 'ob1')!.launch!.quarter = z.quarter + 1
    startOrbitalBuilds(z)
    expect(orbitBlock(z, 'ob1')!.launch!.quarter).toBe(z.quarter + 2)
  })

  it('played through: built, launched at its quarter’s end, live two quarters later (no slips, no failures pinned)', () => {
    pin('pallas', 0, 0)
    let s = readyBlock()
    const launchQ = orbitBlock(s, 'ob1')!.launch!.quarter
    s = playQuarter(s)
    expect(orbitBlock(s, 'ob1')!.stage).toBe('building')
    s = playQuarter(s)
    expect(s.quarter).toBe(launchQ)
    expect(orbitBlock(s, 'ob1')!.stage).toBe('awaiting_launch')
    s = playQuarter(s)
    const b = orbitBlock(s, 'ob1')!
    expect(b.stage).toBe('climbing')
    expect(b.liveQuarter).toBe(launchQ + 2)
    expect(b.capexSpentUsd).toBeCloseTo(180_000 * 800 + 180_000 * 600)
    expect(s.log.some((e) => e.key === 'log.orbit.launched')).toBe(true)
  })

  it('a provider slip moves the launch a quarter; the deposit is then refundable', () => {
    pin('pallas', 100, 0)
    const s = readyBlock()
    startOrbitalBuilds(s)
    s.quarter += 2
    startQuarterOrbitBuilds(s)
    endQuarterLaunches(s)
    const l = orbitBlock(s, 'ob1')!.launch!
    expect(l).toMatchObject({ quarter: s.quarter + 1, slips: 1 })
    expect(s.log.at(-1)).toMatchObject({ key: 'log.orbit.launch_slip', params: { slipReason: 'slipped' } })
  })

  it('a closed shell (F3’s cascade, 2033Q1) holds every SSO launch', () => {
    pin('pallas', 0, 0)
    const s = readyBlock('shell', 'f3')
    startOrbitalBuilds(s)
    s.quarter = Q('2033Q1')
    orbitBlock(s, 'ob1')!.launch!.quarter = s.quarter
    startQuarterOrbitBuilds(s)
    endQuarterLaunches(s)
    expect(s.log.at(-1)).toMatchObject({ key: 'log.orbit.launch_slip', params: { slipReason: 'closed' } })
  })

  it('the grounding slips Pallas launches in its quarter', () => {
    pin('pallas', 0, 0)
    const s = readyBlock()
    startOrbitalBuilds(s)
    s.quarter += 2
    s.act4Wildcards = [{ id: 'launch_grounding', quarter: s.quarter, fired: true }]
    startQuarterOrbitBuilds(s)
    endQuarterLaunches(s)
    expect(s.log.at(-1)).toMatchObject({ key: 'log.orbit.launch_slip', params: { slipReason: 'grounded' } })
  })

  it('a failed launch loses the block’s capex; insurance pays up to its cover; over $400M hardens the market', () => {
    pin('pallas', 0, 100)
    let s = readyBlock('cloud')
    const q = insuranceQuote(s, orbitBlock(s, 'ob1')!)!
    s = act(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: 'ob1' })
    expect(orbitBlock(s, 'ob1')!.insured).toEqual({ coverUsd: q.coverUsd, untilQuarter: null })
    startOrbitalBuilds(s)
    s.quarter += 2
    startQuarterOrbitBuilds(s)
    const before = s.cash
    const spent = orbitBlock(s, 'ob1')!.capexSpentUsd
    const rest = 180_000 * 600 * 0.85
    endQuarterLaunches(s)
    const b = orbitBlock(s, 'ob1')!
    expect(b).toMatchObject({ stage: 'proposed', launch: null, insured: null, capexSpentUsd: 0, lostLaunches: 1, gpuHealth: 1.2 })
    const loss = spent + rest
    expect(loss).toBeGreaterThan(400e6)
    expect(s.cash).toBeCloseTo(before - rest + Math.min(loss, q.coverUsd))
    expect(s.act4Orbit!.hardMarketUntil).toBe(s.quarter + 4)
    // the hard market: dearer, scarcer cover
    s = act({ ...s, phase: 'plan' }, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
    const hard = insuranceQuote(s, orbitBlock(s, 'ob1')!)!
    expect(hard.ratePct).toBeCloseTo(q.ratePct * 1.75)
  })

  it('insurance: young vehicles pay the young rate; cover is capped by the market’s capacity', () => {
    const s = readyBlock('cloud')
    const pallas = insuranceQuote(s, orbitBlock(s, 'ob1')!)!
    expect(pallas.ratePct).toBe(3) // Pallas ~1%: mature
    expect(pallas.coverUsd).toBe(350e6) // a 10 MW cloud is worth ~$650M, over 2031's $350M capacity
    expect(launchFailureShare('northgate', s.quarter)).toBeCloseTo(0.08)
    expect(launchFailureShare('northgate', Q('2032Q1'))).toBeCloseTo(0.06)
    orbitBlock(s, 'ob1')!.launch!.provider = 'northgate'
    expect(insuranceQuote(s, orbitBlock(s, 'ob1')!)!.ratePct).toBe(7.5)
  })

  it('the export clampdown makes orbital cloud capex × 1.15 on the GPUs, except under the neutral registry', () => {
    const s = readyBlock('cloud')
    const b = orbitBlock(s, 'ob1')!
    const base = buildCostUsd(s, b)
    s.act4Wildcards = [{ id: 'chip_export_clampdown', quarter: s.quarter, fired: true }]
    const gpus = 10 * 33e6 * 1.2
    expect(buildCostUsd(s, b) - base).toBeCloseTo(gpus * 0.15)
    s.act4Orbit!.registry = 'neutral'
    expect(buildCostUsd(s, b)).toBeCloseTo(base)
  })
})
