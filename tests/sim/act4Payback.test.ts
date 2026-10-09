// M34.1 (the owner's answer 1a, 9 Oct 2026): orbital clouds carry their designed cost premium through to returns. An
// orbital cloud's simple payback ≈ a ground cloud's × B10's cost ratio for that future and year: about 3 years in 2031,
// 3.5 years or more in F2 by 2035. Payback = capex ÷ a year's EBITDA, as the deal builder works it out.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { ORBIT } from '../../src/content/orbitContent.ts'
import { dealView } from '../../src/sim/selectors.ts'
import type { GameState, OrbitalBlock } from '../../src/sim/state.ts'
import { annualValueUsd, offerPrice, orbitRow } from '../../src/sim/systems/orbit.ts'
import {
  buildCostUsd,
  insuranceCapacityUsd,
  launchPriceUsdKg,
} from '../../src/sim/systems/orbitLaunch.ts'
import { convertibleKw } from '../../src/sim/systems/hosting.ts'
import { act, orbitCompany } from './act4Helpers.ts'

/** B10's cost ratios (tests/sim/act4OrbitCost.test.ts): 2031 all futures 1.5–1.65×, F2 2035 1.6–1.9×. */
const B10_2031 = 1.58

/**
 * A 10 MW orbital cloud in SSO on Gen 31, launched on the dominant launcher and insured: its payback with the sovereign
 * tenant at today's price (the build, the launch and its cover; a year's contracted value less running costs and the
 * in-orbit cover).
 */
function orbitPayback(s: GameState): number {
  s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'cloud', mw: 10, shell: 'sso', gen: 'gen31' })
  const b = s.act4Orbit!.blocks.at(-1) as OrbitalBlock
  const row = orbitRow(s)
  const launchUsd = b.massT * 1000 * launchPriceUsdKg(s, 'pallas', 'sso')
  const valueUsd = buildCostUsd(s, b) + launchUsd
  const cap = insuranceCapacityUsd(s)
  const launchCoverUsd = (Math.min(valueUsd, cap) * row.insurance_rate_mature_pct) / 100
  const capexUsd = valueUsd + launchCoverUsd
  const yearlyUsd =
    annualValueUsd('cloud', 10, offerPrice(s, 'cloud', 'sovereign')) -
    ORBIT.satellites.ops_usd_mw_yr * 10 -
    (Math.min(valueUsd, cap) * row.insurance_rate_inorbit_pct) / 100
  return capexUsd / yearlyUsd
}

/** A 10 MW ground AI cloud on the newest mid-tier GPU at the site with the most free MW: the deal builder's payback. */
function groundPayback(s: GameState): number {
  const site = [...s.sites].sort((a, b) => convertibleKw(s, b.id) - convertibleKw(s, a.id))[0]
  const free = convertibleKw(s, site.id) >= 10_000
  s = act(s, {
    type: 'PROJECT_OPEN',
    siteId: site.id,
    kw: 10_000,
    kind: 'cloud',
    gpu: 'rubin_nvl144',
    ...(free ? {} : { power: 'grid' as const }),
  })
  return dealView(s, s.projects.at(-1)!.id)!.projected.paybackYears!
}

describe('orbital clouds carry their cost premium to returns (M34.1, 1a)', () => {
  it('2031: orbital payback ≈ ground payback × B10’s ratio, about 3 years', () => {
    const s = orbitCompany('f1')
    const orbit = orbitPayback(structuredClone(s))
    const ground = groundPayback(structuredClone(s))
    expect(orbit).toBeGreaterThan(2.5)
    expect(orbit).toBeLessThan(4.5)
    const ratio = orbit / (ground * B10_2031)
    expect(ratio, `orbit ${orbit.toFixed(2)} y, ground ${ground.toFixed(2)} y`).toBeGreaterThan(0.75)
    expect(ratio, `orbit ${orbit.toFixed(2)} y, ground ${ground.toFixed(2)} y`).toBeLessThan(1.35)
  })

  it('F2 by 2035: orbital payback 3.5 years or more', () => {
    const s = orbitCompany('f2')
    s.quarter = CONTENT.quarters.indexOf('2035Q2')
    expect(orbitPayback(s)).toBeGreaterThanOrEqual(3.5)
  })
})
