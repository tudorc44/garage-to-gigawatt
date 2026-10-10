// M29 (doc 33 §7-8): Act IV's orbital blocks. M29.2: opening a block, its Tenant and Capital slots, licences and the
// registry, links. (M29.3 adds the launch manifests and insurance; M29.4 live operation.)
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import { ORBIT } from '../../src/content/orbitContent.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import {
  annualValueUsd,
  availableGenerations,
  blockMassT,
  eligibleTenants,
  licenceRoom,
  linkUnits,
  orbitBlock,
} from '../../src/sim/systems/orbit.ts'
import { act, orbitCompany } from './act4Helpers.ts'

const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? null : r.error.key
}

describe('orbital blocks, slots, licences (M29.2)', () => {
  it('a block opens in Act IV only, with Gen 31 available in 2031 and its mass from t/MW × MW × shielding', () => {
    const s = orbitCompany()
    expect(availableGenerations(s)).toEqual(['gen31'])
    expect(err(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen33' })).toBe(
      'error.orbit_gen_unavailable',
    )
    expect(err(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 7, shell: 'sso', gen: 'gen31' })).toBe('error.orbit_bad_block')
    const x = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'cloud', mw: 10, shell: 'high_leo', gen: 'gen31' })
    const b = x.act4Orbit!.blocks[0]
    expect(b).toMatchObject({ id: 'ob1', n: 1, stage: 'proposed', kind: 'cloud', mw: 10, gpuHealth: 1.2 })
    expect(b.massT).toBeCloseTo(18 * 10 * 1.1)
    expect(blockMassT(18, 10, 'high_orbit')).toBeCloseTo(18 * 10 * 1.3)
    expect(b.offers).toHaveLength(ORBIT.tenants.offers_per_block)
    expect(x.bandwidth).toBe(s.bandwidth) // 0 Bandwidth
    // Act III never has the action
    const a3 = { ...s, act: 3 as const }
    expect(err(a3, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })).toBe(
      'error.orbit_unavailable',
    )
  })

  it('tenant eligibility: EO processors take small blocks only; interactive work never flies to high orbit', () => {
    expect(eligibleTenants({ mw: 50, shell: 'sso' })).not.toContain('eo_processor')
    expect(eligibleTenants({ mw: 10, shell: 'sso' })).toContain('eo_processor')
    expect(eligibleTenants({ mw: 10, shell: 'high_orbit' })).not.toContain('inference_platform')
  })

  it('signing locks the price; a sovereign tenant prepays a share of a year, credited against its rent', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    const b = s.act4Orbit!.blocks[0]
    b.offers = [{ type: 'sovereign', price: 9e6, termQuarters: 20 }]
    const cash = s.cash
    s = act(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 0 })
    const t = orbitBlock(s, 'ob1')!.tenant
    expect(t).toMatchObject({ type: 'sovereign', price: 9e6, termQuarters: 20, dueQuarter: null })
    const prepaid = 0.2 * annualValueUsd('shell', 10, 9e6)
    expect(s.cash - cash).toBeCloseTo(prepaid)
    expect(t !== 'spot' && t!.prepaidLeftUsd).toBeCloseTo(prepaid)
    expect(err(s, { type: 'SIGN_ORBITAL_TENANT', blockId: 'ob1', offer: 'spot' })).toBe('error.orbit_slot_filled')
  })

  it('the Capital slot costs 1 Bandwidth (own cash in M29)', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 5, shell: 'sso', gen: 'gen31' })
    const bw = s.bandwidth
    s = act(s, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: 'ob1' })
    expect(s.bandwidth).toBe(bw - 1)
    expect(orbitBlock(s, 'ob1')!.capital).toBe('cash')
  })

  it('a licence: 1 BW and the fee; approval in 2 quarters (+1 neutral registry; +2 more in F2 from 2033); fast track −1 quarter for political capital', () => {
    let s = orbitCompany('f2')
    const cash = s.cash
    s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
    expect(s.cash).toBe(cash - ORBIT.licences.filing.fee_usd)
    expect(s.act4Orbit!.licences[0]).toMatchObject({ shell: 'sso', approvedQuarter: s.quarter + 2, filedMw: 200 })
    // the registry is free to set before the first filing only
    let r = orbitCompany('f2')
    const bw = r.bandwidth
    r = act(r, { type: 'SET_REGISTRY', registry: 'neutral' })
    expect(r.bandwidth).toBe(bw)
    r = act(r, { type: 'FILE_ORBITAL_LICENCE', shell: 'high_leo' })
    expect(r.act4Orbit!.licences[0].approvedQuarter).toBe(r.quarter + 3)
    const bw2 = r.bandwidth
    r = act(r, { type: 'SET_REGISTRY', registry: 'accords' })
    expect(r.bandwidth).toBe(bw2 - 1)
    // F2's regulators from 2033Q1
    const late = orbitCompany('f2')
    late.quarter = CONTENT.quarters.indexOf('2033Q1')
    const l = act(late, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
    expect(l.act4Orbit!.licences[0].approvedQuarter).toBe(late.quarter + 4)
    // fast track
    s.politicalCapital = 30
    s = act(s, { type: 'FAST_TRACK_LICENCE', shell: 'sso' })
    expect(s.act4Orbit!.licences[0].approvedQuarter).toBe(s.quarter + 1)
    expect(s.politicalCapital).toBe(30 - ORBIT.licences.filing.fast_track_pc)
    expect(err(s, { type: 'FAST_TRACK_LICENCE', shell: 'sso' })).toBe('error.orbit_no_pending_licence')
  })

  it('licence room: a block needs approved licensed MW in its shell', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    expect(licenceRoom(s, s.act4Orbit!.blocks[0])).toBe(false)
    s = act(s, { type: 'FILE_ORBITAL_LICENCE', shell: 'sso' })
    expect(licenceRoom(s, s.act4Orbit!.blocks[0])).toBe(false)
    s.quarter += 2
    expect(licenceRoom(s, s.act4Orbit!.blocks[0])).toBe(true)
  })

  it('links: rented units plus a ground station’s units from the next quarter; the station costs capex and adds Heat', () => {
    let s = orbitCompany()
    s = act(s, { type: 'RENT_LINK_UNITS', units: 3 })
    const site = s.sites[0].id
    const cash = s.cash
    s = act(s, { type: 'BUILD_GROUND_STATION', siteId: site })
    expect(s.cash).toBe(cash - 15e6)
    expect(linkUnits(s)).toBe(3)
    expect(linkUnits(s, s.quarter + 1)).toBe(7)
    expect(s.siteHeat[site].grievance).toBeGreaterThan(0)
    expect(err(s, { type: 'BUILD_GROUND_STATION', siteId: site })).toBe('error.orbit_station_exists')
  })

  it('cancelling: only before the build; Act I–III state never gains the orbit key', () => {
    let s = orbitCompany()
    expect(s.act4Orbit).toBeUndefined()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 5, shell: 'sso', gen: 'gen31' })
    s = act(s, { type: 'CANCEL_ORBITAL_BLOCK', blockId: 'ob1' })
    expect(s.act4Orbit!.blocks).toHaveLength(0)
  })
})
