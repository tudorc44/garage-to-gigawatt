// M31.2 (doc 33 §11.1, §11.4, IV-D23): the orbital Capital slot. Export credit (the registry, +10% build, 80% of the
// build drawn, interest added during the build, repaid over 28 quarters once live), project debt (a take-or-pay tenant,
// 60% of capex drawn, SOFR + the tenant's spread, the insurance covenant's cure and the call), co-funding (the partner
// pays 30% and takes 30% of the revenue, with its bloc's strings); debt counts as the company's; a lost launch's
// insurance repays the lender first.
import { afterEach, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { MONEY } from '../../src/content/moneyContent.ts'
import { ORBIT, provider } from '../../src/content/orbitContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { sofr } from '../../src/sim/systems/finance.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import { blockDebt, serviceOrbitalDebt } from '../../src/sim/systems/orbitCapital.ts'
import { buildCostUsd, endQuarterLaunches, startOrbitalBuilds, startQuarterOrbitBuilds } from '../../src/sim/systems/orbitLaunch.ts'
import { blockRevenueUsd, startQuarterOrbitLive } from '../../src/sim/systems/orbitOps.ts'
import { act, orbitCompany } from './act4Helpers.ts'

const C = MONEY.capital
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}
const saved = ORBIT.launch.providers.map((p) => ({ ...p }))
afterEach(() => ORBIT.launch.providers.forEach((p, i) => Object.assign(p, saved[i])))

/** A 10 MW SSO shell block with a sovereign tenant, a licence approved and Pallas booked; the Capital slot open. */
function block(kind: 'shell' | 'cloud' = 'shell'): GameState {
  let s = orbitCompany()
  s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind, mw: 10, shell: 'sso', gen: 'gen31' })
  orbitBlock(s, 'ob1')!.offers = [{ type: 'sovereign', price: 9e6, termQuarters: 20 }]
  s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 0 })
  s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
  s.act4Orbit!.licences[0].approvedQuarter = s.quarter
  s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
  return s
}

describe('the orbital Capital slot (M31.2)', () => {
  it('export credit: the Accords registry; the partner’s build costs 10% more; 80% of it is the loan; interest joins it during the build', () => {
    const s = block()
    const base = buildCostUsd(s, orbitBlock(s, 'ob1')!)
    s.act4Orbit!.registry = 'neutral'
    expect(err(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'export_credit' })).toBe('error.orbit_eca_registry')
    s.act4Orbit!.registry = 'accords'
    const x = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'export_credit' })
    const cost = buildCostUsd(x, orbitBlock(x, 'ob1')!)
    expect(cost).toBeCloseTo(base * 1.1)
    const cash = x.cash
    startOrbitalBuilds(x)
    const d = blockDebt(x, 'ob1')!
    expect(d.balanceUsd).toBeCloseTo(cost * 0.8)
    expect(cash - x.cash).toBeCloseTo(cost * 0.2)
    expect(debtUsd(x) - debtUsd(s)).toBeCloseTo(cost * 0.8)
    serviceOrbitalDebt(x)
    expect(d.balanceUsd).toBeCloseTo(cost * 0.8 * (1 + 0.05 / 4))
    // live: repaid in equal principal over 28 quarters with interest
    const b = orbitBlock(x, 'ob1')!
    b.stage = 'live'
    const bal = d.balanceUsd
    const c2 = x.cash
    serviceOrbitalDebt(x)
    expect(c2 - x.cash).toBeCloseTo((bal * 0.05) / 4 + bal / 28)
  })

  it('project debt: needs a take-or-pay tenant; 60% of build and launch; SOFR + the tenant’s spread', () => {
    let s = block()
    const spot = act(orbitCompany(), { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    const spot2 = act(spot, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 'spot' })
    expect(err(spot2, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })).toBe('error.orbit_debt_needs_tenant')
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })
    const d = blockDebt(s, 'ob1')!
    expect(d.apr).toBeCloseTo(sofr(s.quarter, scenarioOf(s)) + 0.045)
    expect(d.tenorQuarters).toBe(20)
    const cost = buildCostUsd(s, orbitBlock(s, 'ob1')!)
    startOrbitalBuilds(s)
    expect(d.balanceUsd).toBeCloseTo(cost * 0.6)
    // the launch's rest is 60% drawn too
    Object.assign(provider('pallas'), { slip_pct: 0, bump_pct_when_tight: 0, failure_pct_by_year: { '2031': 0 } })
    s.quarter += 2
    startQuarterOrbitBuilds(s)
    const before = d.balanceUsd
    const b = orbitBlock(s, 'ob1')!
    const rest = b.massT * 1000 * b.launch!.priceUsdKg - b.launch!.depositUsd
    endQuarterLaunches(s)
    expect(d.balanceUsd - before).toBeCloseTo(rest * 0.6)
  })

  it('the insurance covenant: cover under half the debt opens a 2-quarter cure; uncured, the loan is called', () => {
    let s = block()
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })
    startOrbitalBuilds(s)
    const b = orbitBlock(s, 'ob1')!
    b.stage = 'live'
    b.insured = null
    const d = blockDebt(s, 'ob1')!
    serviceOrbitalDebt(s)
    expect(d.cureUntil).toBe(s.quarter + C.project_debt.cure_quarters)
    s.quarter += 2
    const cash = s.cash
    serviceOrbitalDebt(s)
    expect(d.closed).toBe(true)
    expect(cash - s.cash).toBeGreaterThan(0)
    expect(s.log.some((e) => e.key === 'log.orbit.debt_called')).toBe(true)
  })

  it('co-funding: the partner pays 30% of capex and takes 30% of the revenue; its bloc’s strings', () => {
    let s = block()
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'co_funding' })
    expect(s.act4Moon!.alignedBloc).toBe('accords')
    const cost = buildCostUsd(s, orbitBlock(s, 'ob1')!)
    const cash = s.cash
    startOrbitalBuilds(s)
    expect(cash - s.cash).toBeCloseTo(cost * 0.7)
    const b = orbitBlock(s, 'ob1')!
    Object.assign(b, { stage: 'climbing', liveQuarter: s.quarter })
    startQuarterOrbitLive(s)
    expect(blockRevenueUsd(s, b, 1)).toBeCloseTo(((9e6 * 10) / 4) * 0.7)
    // aligned with the other bloc: no
    const other = block()
    other.act4Moon = { ...structuredClone(s.act4Moon!), alignedBloc: 'station' }
    expect(err(other, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'co_funding' })).toBe('error.moon_other_bloc')
  })

  it('a lost launch: the insurance repays the lender first; what’s left of the loan is then repaid', () => {
    let s = block('cloud')
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1', capital: 'project_debt' })
    s = act(s, { type: 'BUY_ORBITAL_INSURANCE', blockId: 'ob1' })
    startOrbitalBuilds(s)
    Object.assign(provider('pallas'), { slip_pct: 0, bump_pct_when_tight: 0, failure_pct_by_year: { '2031': 100 } })
    s.quarter += 2
    startQuarterOrbitBuilds(s)
    const d = blockDebt(s, 'ob1')!
    const cover = orbitBlock(s, 'ob1')!.insured!.coverUsd
    endQuarterLaunches(s)
    const drawn = d.limitUsd
    expect(d.balanceUsd).toBeCloseTo(Math.max(0, drawn - cover))
    expect(d.amortizing).toBe(true)
    // a rebuild borrows afresh: you still pay only your share
    s.phase = 'plan'
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
    const cost = buildCostUsd(s, orbitBlock(s, 'ob1')!)
    const cash = s.cash
    startOrbitalBuilds(s)
    expect(cash - s.cash).toBeCloseTo(cost * 0.4)
    expect(s.act4Orbit!.debts!.filter((x) => !x.closed && !x.amortizing)).toHaveLength(1)
  })
})
