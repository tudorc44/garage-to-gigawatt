// M29.4 (doc 33 §6.5, §7, §8.3, §11.3, §14.2): Act IV's orbital blocks in operation. Going live (the true life starts),
// revenue (contracted, spot, links, safe mode, prepayments), lateness, telemetry, debris and the cascade, the two orbit
// alerts, the sale, the Bandwidth bonus and the books (orbital EBITDA at the space multiple).
import { describe, expect, it, vi } from 'vitest'
// (The first Act IV company plays a whole Act III: no clock decides pass or fail, as M24.1's leak guard.)
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import { ORBIT } from '../../src/content/orbitContent.ts'
import type { GameState, OrbitalBlock } from '../../src/sim/state.ts'
import { orbitBlock, orbitRow } from '../../src/sim/systems/orbit.ts'
import {
  blockRevenueUsd,
  blockSaleUsd,
  checkOrbitAlerts,
  endQuarterOrbit,
  linkShares,
  planOrbitAlerts,
  startQuarterOrbitLive,
} from '../../src/sim/systems/orbitOps.ts'
import { trueReliability } from '../../src/sim/systems/fleetReliability.ts'
import { bandwidthForQuarter } from '../../src/sim/systems/bandwidth.ts'
import { valuationSplit } from '../../src/sim/systems/valuation.ts'
import { act, orbitCompany, playQuarter } from './act4Helpers.ts'

const Q = (label: string) => CONTENT.quarters.indexOf(label)

/** An Act IV company with one block of each given shape, live from the current quarter (set up directly). */
function withLive(s: GameState, ...blocks: Partial<OrbitalBlock>[]): GameState {
  for (const p of blocks) {
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: p.kind ?? 'shell', mw: p.mw ?? 10, shell: p.shell ?? 'sso', gen: 'gen31' })
    const b = s.act4Orbit!.blocks.at(-1)!
    Object.assign(b, { stage: 'climbing', liveQuarter: s.quarter, capexSpentUsd: 250e6, tenant: 'spot' }, p)
  }
  startQuarterOrbitLive(s)
  return s
}

describe('orbital blocks in operation (M29.4)', () => {
  it('going live: the true life counts from now (hidden), the first-year cover and the contract term start', () => {
    const s = withLive(orbitCompany('f2'), {
      insured: { coverUsd: 1e8, untilQuarter: null },
      tenant: { type: 'frontier_lab', price: 8e6, termQuarters: 12, signedQuarter: 0, dueQuarter: null, endQuarter: null, prepaidLeftUsd: 0 },
    })
    const b = orbitBlock(s, 'ob1')!
    expect(b.stage).toBe('live')
    expect(b.retireQuarter).toBe(s.quarter + trueReliability('f2').lifeYears * 4)
    expect(b.insured!.untilQuarter).toBe(s.quarter + 3)
    expect(b.tenant !== 'spot' && b.tenant!.endQuarter).toBe(s.quarter + 12)
    // at its true end it deorbits; its contract ends into spot first if shorter
    s.quarter += 12
    startQuarterOrbitLive(s)
    expect(orbitBlock(s, 'ob1')!.tenant).toBe('spot')
    s.quarter = b.retireQuarter!
    startQuarterOrbitLive(s)
    expect(orbitBlock(s, 'ob1')!.stage).toBe('retired')
  })

  it('revenue: a shell’s rent × MW a quarter; spot at 80% of the market; a cloud’s GPU-hours at its utilisation and health', () => {
    const s = withLive(
      orbitCompany(),
      { tenant: { type: 'sovereign', price: 9e6, termQuarters: 20, signedQuarter: 0, dueQuarter: null, endQuarter: null, prepaidLeftUsd: 0 } },
      {},
      { kind: 'cloud', gpuHealth: 1.2 },
    )
    const [a, b, c] = s.act4Orbit!.blocks
    const row = orbitRow(s)
    expect(blockRevenueUsd(s, a, 1)).toBeCloseTo((9e6 * 10) / 4)
    expect(blockRevenueUsd(s, b, 1)).toBeCloseTo((row.orbital_shell_rent_usd_mw_yr * 0.8 * 10) / 4)
    expect(blockRevenueUsd(s, c, 1)).toBeCloseTo((row.orbital_gpu_usd_hr * 600 * 10 * 8760 * 0.7) / 4)
    c.gpuHealth = 0.9
    c.capacity = 0.75
    expect(blockRevenueUsd(s, c, 1)).toBeCloseTo((row.orbital_gpu_usd_hr * 600 * 10 * 8760 * 0.7 * 0.9 * 0.75) / 4)
    // safe mode loses the storm's weeks
    s.act4Orbit!.safeModeQuarter = s.quarter
    expect(blockRevenueUsd(s, a, 1)).toBeCloseTo(((9e6 * 10) / 4) * (10 / 13))
  })

  it('links: an interactive tenant needs a unit per 5 MW; short of them it pays only for what reaches the ground', () => {
    const s = withLive(orbitCompany(), {
      tenant: { type: 'inference_platform', price: 9e6, termQuarters: 12, signedQuarter: 0, dueQuarter: null, endQuarter: null, prepaidLeftUsd: 0 },
    })
    expect(linkShares(s).get('ob1')).toBe(0)
    s.act4Orbit!.linksRented = 1
    expect(linkShares(s).get('ob1')).toBeCloseTo(0.5)
    s.act4Orbit!.linksRented = 3
    expect(linkShares(s).get('ob1')).toBe(1)
  })

  it('the quarter’s books: revenue less ops and link rent; a prepayment is credited before cash; telemetry and GPU wear', () => {
    const s = withLive(orbitCompany('f1'), {
      kind: 'cloud',
      gpuHealth: 1.2,
      tenant: { type: 'sovereign', price: 5, termQuarters: 20, signedQuarter: 0, dueQuarter: null, endQuarter: null, prepaidLeftUsd: 1e6 },
    })
    s.act4Orbit!.linksRented = 2
    const b = orbitBlock(s, 'ob1')!
    const rev = blockRevenueUsd(s, b, 1)
    const cash = s.cash
    endQuarterOrbit(s)
    const ops = (250_000 * 10) / 4
    const links = (2 * 800_000) / 4
    expect(s.quarterStats.orbitRevenueUsd).toBeCloseTo(rev)
    expect(s.quarterStats.orbitCostUsd).toBeCloseTo(ops + links)
    expect(s.cash).toBeCloseTo(cash + rev - 1e6 - ops - links)
    expect(b.tenant !== 'spot' && b.tenant!.prepaidLeftUsd).toBe(0)
    expect(b.telemetry).toHaveLength(1)
    expect(b.gpuHealth).toBeCloseTo(1.2 * (1 - 0.06 / 4))
  })

  it('telemetry reads the true failure rate with unbiased noise (many blocks average near the truth)', () => {
    let s = orbitCompany('f2')
    const blocks = Array.from({ length: 60 }, () => ({}))
    s = withLive(s, ...blocks)
    endQuarterOrbit(s)
    const mean = s.act4Orbit!.blocks.reduce((t, b) => t + b.telemetry[0].failurePctYr, 0) / 60
    expect(Math.abs(mean - 10)).toBeLessThan(1.5)
  })

  it('lateness: a contracted block not live by its due quarter pays 3% of the contract’s yearly value a quarter', () => {
    let s = orbitCompany()
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    orbitBlock(s, 'ob1')!.tenant = {
      type: 'frontier_lab', price: 8e6, termQuarters: 12, signedQuarter: 0, dueQuarter: s.quarter, endQuarter: null, prepaidLeftUsd: 0,
    }
    const cash = s.cash
    endQuarterOrbit(s)
    expect(cash - s.cash).toBeCloseTo(0.03 * 8e6 * 10)
    expect(s.log.at(-1)!.key).toBe('log.orbit.late')
  })

  it('the cascade: when the busy shell closes (F3, 2033Q1), its live blocks lose 40% (once); other shells are spared', () => {
    const s = orbitCompany('f3')
    s.quarter = Q('2033Q1')
    const x = withLive(s, { shell: 'sso' }, { shell: 'high_leo' })
    endQuarterOrbit(x)
    const [a, b] = x.act4Orbit!.blocks
    expect(a.capacity).toBeLessThanOrEqual(0.6 + 1e-9)
    expect(x.act4Orbit!.cascadeDone).toBe(true)
    expect(b.capacity).toBeGreaterThan(0.7)
  })

  it('the storm: planned in its quarter; climbing blocks lose 40%; safe mode is the default; riding it costs 3% capacity', () => {
    let s = withLive(orbitCompany(), {})
    s = act(s, { type: 'OPEN_ORBITAL_BLOCK', kind: 'shell', mw: 10, shell: 'sso', gen: 'gen31' })
    Object.assign(orbitBlock(s, 'ob2')!, { stage: 'climbing', liveQuarter: s.quarter + 1, capexSpentUsd: 2e8 })
    s.act4Wildcards = [{ id: 'solar_storm', quarter: s.quarter, fired: true }]
    s.phase = 'live'
    planOrbitAlerts(s)
    const storm = s.act4Orbit!.planned.find((p) => p.kind === 'orbit_storm')!
    expect(storm).toBeDefined()
    s.act4Orbit!.planned = [storm]
    s.week = storm.week
    checkOrbitAlerts(s)
    expect(s.interrupt?.id).toBe('orbit_storm')
    expect(orbitBlock(s, 'ob2')!.capacity).toBeCloseTo(0.6)
    const ride = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'ride' })
    expect(orbitBlock(ride, 'ob1')!.capacity).toBeCloseTo(0.97)
    const safe = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'safe_mode' })
    expect(safe.act4Orbit!.safeModeQuarter).toBe(s.quarter)
  })

  it('a conjunction: manoeuvring costs a quarter of the block’s life', () => {
    let s = withLive(orbitCompany(), {})
    s.phase = 'live'
    s.act4Orbit!.planned = [{ week: 0, kind: 'orbit_conjunction', blockId: 'ob1' }]
    checkOrbitAlerts(s)
    expect(s.interrupt).toMatchObject({ id: 'orbit_conjunction', orbitBlockId: 'ob1' })
    const life = orbitBlock(s, 'ob1')!.retireQuarter!
    s = act(s, { type: 'RESOLVE_INTERRUPT', choice: 'manoeuvre' })
    expect(orbitBlock(s, 'ob1')!.retireQuarter).toBe(life - 1)
  })

  it('selling a live block: its last quarter’s EBITDA × 4 × the space multiple × 0.8, for 1 Bandwidth', () => {
    let s = withLive(orbitCompany(), {})
    orbitBlock(s, 'ob1')!.lastEbitdaUsd = 20e6
    const price = blockSaleUsd(s, orbitBlock(s, 'ob1')!)
    expect(price).toBeCloseTo(20e6 * 4 * orbitRow(s).space_ev_ebitda_mult * ORBIT.satellites.sale_share_of_value)
    const cash = s.cash
    s = act(s, { type: 'SELL_ORBITAL_BLOCK', blockId: 'ob1' })
    expect(s.cash).toBeCloseTo(cash + price)
    expect(orbitBlock(s, 'ob1')!.stage).toBe('sold')
  })

  it('Bandwidth: +1 once a block has gone live (capped at 9)', () => {
    const s = orbitCompany()
    const before = bandwidthForQuarter(s)
    const x = withLive(structuredClone(s), {})
    expect(bandwidthForQuarter(x)).toBe(Math.min(9, before + 1))
  })

  it('the report: orbital EBITDA in the total and valued at the space multiple; Act III reports carry no orbit keys', () => {
    let s = withLive(orbitCompany(), {
      tenant: { type: 'sovereign', price: 9e6, termQuarters: 20, signedQuarter: 0, dueQuarter: null, endQuarter: null, prepaidLeftUsd: 0 },
    })
    s = playQuarter(s)
    const r = s.reports.at(-1)!
    expect(r.orbitRevenueUsd).toBeGreaterThan(0)
    expect(r.orbitEbitdaUsd).toBeCloseTo(r.orbitRevenueUsd! - r.orbitCostUsd!)
    const split = valuationSplit(r, s.firstAiDealQuarter ?? null, 's0.f1')
    expect(split.orbitEvUsd).toBeCloseTo(Math.max(0, r.orbitEbitdaUsd!) * 4 * r.orbitMultiple! * (r.evMult ?? 1))
    const plain = playQuarter(orbitCompany())
    expect(plain.reports.at(-1)!).not.toHaveProperty('orbitEbitdaUsd')
  })
})
