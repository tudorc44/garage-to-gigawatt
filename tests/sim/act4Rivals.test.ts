// M31.5 (doc 33 §12, §11.5; B14): Act IV's rivals and the league. The five fictional rivals replace Act III's; their
// values, orbital MW and lunar sites follow the game's future and are the same in every future through 2032Q2; Orrery
// fails in F2 and F4, leaves the league, makes the news, and its blocks are auctioned for two quarters.
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT, FUTURE_IDS } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { activeRivals } from '../../src/sim/systems/rivals.ts'
import { orreryAuction, orreryFailsAt, startQuarterRivalsIv } from '../../src/sim/systems/rivalsIv.ts'
import { act, orbitCompany } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)

describe('Act IV rivals and the league (M31.5)', () => {
  it('the five fictional rivals are the league in Act IV; Act III’s have retired', () => {
    const r = activeRivals(Q('2031Q1'), 's0.f1')
    expect(r.map((x) => x.id).sort()).toEqual(['cratermark', 'jade_arc', 'northgate', 'orrery_compute', 'pallas_compute'])
    expect(r.find((x) => x.id === 'pallas_compute')!.valueUsd).toBe(60e9)
    expect(r.find((x) => x.id === 'pallas_compute')!.orbitMw).toBe(20)
  })

  it('B14: every rival number the league shows is the same in every future through 2032Q2', () => {
    for (let q = Q('2031Q1'); q <= Q('2032Q2'); q++)
      for (const f of FUTURE_IDS) expect(activeRivals(q, `s0.${f}`)).toEqual(activeRivals(q, 's0.f1'))
  })

  it('lunar sites count the scripted claims a rival has landed', () => {
    expect(activeRivals(Q('2032Q3'), 's0.f1').find((x) => x.id === 'northgate')!.lunarSites).toBe(0)
    expect(activeRivals(Q('2032Q4'), 's0.f1').find((x) => x.id === 'northgate')!.lunarSites).toBe(1)
    expect(activeRivals(Q('2033Q1'), 's0.f3').find((x) => x.id === 'northgate')!.lunarSites).toBe(1)
  })

  it('Orrery fails in F2: the news, it leaves the league, its blocks at auction for two quarters', () => {
    const s = orbitCompany('f2')
    expect(orreryFailsAt(s)).toBe(Q('2033Q3'))
    expect(orreryFailsAt(orbitCompany('f1'))).toBeNull()
    expect(activeRivals(Q('2033Q3'), 's0.f2').some((x) => x.id === 'orrery_compute')).toBe(false)
    expect(activeRivals(Q('2033Q2'), 's0.f2').some((x) => x.id === 'orrery_compute')).toBe(true)
    s.quarter = Q('2033Q3')
    startQuarterRivalsIv(s)
    expect(s.log.at(-1)!.key).toBe('log.rival.orrery_failed')
    expect(orreryAuction(s).open).toBe(true)
    const cash = s.cash
    const x = act(s, { type: 'BUY_ORRERY_BLOCKS' })
    expect(cash - x.cash).toBe(50 * 6e6)
    const b = x.act4Orbit!.blocks.at(-1)!
    expect(b).toMatchObject({ stage: 'live', mw: 50, shell: 'sso', tenant: 'spot', retireQuarter: x.quarter + 12 })
    expect(orreryAuction(x).open).toBe(false)
    const late = orbitCompany('f2')
    late.quarter = Q('2034Q1')
    const r = applyAction(late, { type: 'BUY_ORRERY_BLOCKS' })
    expect(r.ok ? null : r.error.key).toBe('error.orrery_closed')
  })
})
