// M31.4 (doc 33 §14.3, IV-D27): Act IV's four hires. Act IV only; each one's effect where it applies: launch prices and
// bumps, insurance premiums and capacity, orbital failures and telemetry noise, landings, pilot build time, Bandwidth.
import { afterEach, describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { MONEY } from '../../src/content/moneyContent.ts'
import { ORBIT, provider } from '../../src/content/orbitContent.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { hireViews } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { TELEMETRY, trueReliability } from '../../src/sim/systems/fleetReliability.ts'
import { getHire, salaryUsdQ } from '../../src/sim/systems/hires.ts'
import { landingChance } from '../../src/sim/systems/moon.ts'
import { pilotQuarters } from '../../src/sim/systems/moonOps.ts'
import { orbitBlock } from '../../src/sim/systems/orbit.ts'
import {
  endQuarterLaunches,
  insuranceCapacityUsd,
  insuranceQuote,
  launchPriceUsdKg,
  startOrbitalBuilds,
  startQuarterOrbitBuilds,
} from '../../src/sim/systems/orbitLaunch.ts'
import { endQuarterOrbit, startQuarterOrbitLive } from '../../src/sim/systems/orbitOps.ts'
import { act, act3Finished, orbitCompany } from './act4Helpers.ts'

const saved = ORBIT.launch.providers.map((p) => ({ ...p }))
afterEach(() => ORBIT.launch.providers.forEach((p, i) => Object.assign(p, saved[i])))
const hired = (s: GameState, id: string): GameState => {
  s.staff[id] = s.quarter - 1
  return s
}

describe('Act IV hires (M31.4)', () => {
  it('Act IV only; a quarter of the yearly salary', () => {
    const a3 = act3Finished('s0')
    a3.phase = 'plan'
    expect(hireViews(a3).some((h) => h.id === 'space_ops_chief')).toBe(false)
    const r = applyAction(a3, { type: 'HIRE', hire: 'space_ops_chief' })
    expect(r.ok ? null : r.error.key).toBe('error.act4_only')
    const s = orbitCompany()
    expect(hireViews(s).filter((h) => MONEY.hires.some((x) => x.id === h.id))).toHaveLength(4)
    expect(salaryUsdQ(getHire('space_ops_chief')!, s.quarter)).toBe(380000 / 4)
    act(s, { type: 'HIRE', hire: 'space_ops_chief' })
  })

  it('Launch Procurement Lead: launches 10% cheaper and never bumped', () => {
    const s = orbitCompany()
    const base = launchPriceUsdKg(s, 'pallas', 'sso')
    expect(launchPriceUsdKg(hired(s, 'launch_procurement_lead'), 'pallas', 'sso')).toBeCloseTo(base * 0.9)
    // a sure bump (2031 is tight), unless the Lead is on staff
    const run = (lead: boolean) => {
      let x = orbitCompany()
      if (lead) hired(x, 'launch_procurement_lead')
      Object.assign(provider('pallas'), { slip_pct: 0, bump_pct_when_tight: 100, failure_pct_by_year: { '2031': 0 } })
      x = act(x, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 5, shell: 'sso', gen: 'gen31' })
      x = act(x, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 'spot' })
      x = act(x, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1' })
      x = act(x, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
      x.act4Orbit!.licences[0].approvedQuarter = x.quarter
      x = act(x, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: x.quarter + 2 })
      startOrbitalBuilds(x)
      x.quarter += 2
      startQuarterOrbitBuilds(x)
      endQuarterLaunches(x)
      return orbitBlock(x, 'ob1')!.stage
    }
    expect(run(false)).toBe('awaiting_launch')
    expect(run(true)).toBe('climbing')
  })

  it('Chief Risk Officer: premiums 20% lower, 25% more capacity', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 5, shell: 'sso', gen: 'gen31' })
    s = act(s, { type: 'BOOK_ORBITAL_LAUNCH', blockId: 'ob1', provider: 'pallas', quarter: s.quarter + 2 })
    const q = insuranceQuote(s, orbitBlock(s, 'ob1')!)!
    const cap = insuranceCapacityUsd(s)
    hired(s, 'chief_risk_officer')
    expect(insuranceQuote(s, orbitBlock(s, 'ob1')!)!.ratePct).toBeCloseTo(q.ratePct * 0.8)
    expect(insuranceCapacityUsd(s)).toBeCloseTo(cap * 1.25)
  })

  it('Space Operations Chief: GPU wear 25% lower; the telemetry’s noise halved (the hidden file agrees)', () => {
    expect(TELEMETRY.spaceOpsNoiseMult).toBe(MONEY.hires.find((h) => h.id === 'space_ops_chief')!.effect.telemetry_noise_mult)
    const wear = (chief: boolean) => {
      let s = orbitCompany('f2')
      if (chief) hired(s, 'space_ops_chief')
      s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'cloud', mw: 10, shell: 'high_orbit', gen: 'gen31' })
      Object.assign(orbitBlock(s, 'ob1')!, { stage: 'climbing', liveQuarter: s.quarter, tenant: 'spot', capexSpentUsd: 1e8 })
      startQuarterOrbitLive(s)
      endQuarterOrbit(s)
      return orbitBlock(s, 'ob1')!.gpuHealth
    }
    const f = trueReliability('f2').failureShareYr
    expect(wear(false)).toBeCloseTo(1.2 * (1 - f / 4))
    expect(wear(true)).toBeCloseTo(1.2 * (1 - (f * 0.75) / 4))
  })

  it('Lunar Programme Director: +10 points on landings, pilots a quarter faster, +1 Bandwidth from next quarter', () => {
    const s = orbitCompany()
    const base = landingChance(s)
    const bw = bandwidthForQuarter(s)
    const p = pilotQuarters(s)
    hired(s, 'lunar_programme_director')
    expect(landingChance(s)).toBeCloseTo(base + 0.1)
    expect(pilotQuarters(s)).toBe(p - 1)
    expect(bandwidthForQuarter(s)).toBe(Math.min(9, bw + 1))
  })
})
