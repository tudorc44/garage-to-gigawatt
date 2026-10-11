// M53 (doc 43 §8 with §0.4, §0.9 items 7 and 16; plants_v.json `queue`): Act V's grid queue. A grid request waiting to
// be energized is a position: the future's regional wait, a $50/kW security (a deposit, returned at energisation), a
// study a quarter later naming an upgrade bill (paying buys no speed; an unpaid bill holds energisation), withdrawal
// (free, refunds nothing, scores 0), V2's fast lane after its trigger (connect in fast_lane_q, enrolled as curtailable),
// and a site's power sold with its positions.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { BALANCE, act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { PLANTS } from '../../src/content/plantsContent.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { gridQuarterRange } from '../../src/sim/systems/power.ts'
import {
  endQuarterQueue,
  fastLaneEffectUsd,
  queueView,
  sitePowerSale,
  wholeSiteSale,
} from '../../src/sim/systems/queue.ts'
import { regionOf, usedKw } from '../../src/sim/systems/sites.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'
import { act4Company } from './act4Helpers.ts'

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}
const first5 = actFirstQuarter(5)

/** An Act V company with a hall whose grid power was ordered this quarter (as startBuild leaves it), `wait` away. */
function withRequest(v: 'v1' | 'v2' = 'v1', wait = 12): { s: GameState; projectId: string; siteId: string; kw: number } {
  const s = toAct5(act4Finished(), { vfuture: v })
  if (v === 'v2') s.quarter = first5 + 12 // after V2's trigger (the fast lane is open)
  const site = s.sites.find((x) => x.tier !== 'garage')!
  const kw = 5000
  const projectId = 'project-queue-test'
  const p0 = s.projects[0]
  s.projects.push({ ...structuredClone(p0), id: projectId, n: 999, siteId: site.id, kw, stage: 'building', tenant: null, startQuarter: s.quarter, readyQuarter: s.quarter + wait } as never)
  ;(site.powerAdds ??= []).push({ projectId, kw, source: 'grid', readyQuarter: s.quarter + wait })
  return { s, projectId, siteId: site.id, kw }
}
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('Act V’s grid queue (M53)', () => {
  it('draws the wait from the future’s regional column × 0.8-1.2', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    const site = s.sites.find((x) => x.tier !== 'garage')!
    const region = regionOf(site)!
    const q = PLANTS.queue.region_map[region] ?? 'other'
    const gw = Number(act5Row(s.quarter, scenarioOf(s))![`grid_wait_q_${q}` as 'grid_wait_q_pjm'])
    const [lo, hi] = gridQuarterRange(s, region)
    expect(lo).toBeLessThanOrEqual(Math.round(gw * 0.8) + 1)
    expect(hi).toBeGreaterThanOrEqual(Math.round(gw * 1.2) - 1)
  })

  it('a new request becomes a position at the quarter’s end: a $50/kW security now, the study next quarter', () => {
    const { s, projectId, kw } = withRequest()
    const cash = s.cash
    endQuarterQueue(s)
    expect(s.cash).toBeCloseTo(cash - 50 * kw, 2)
    const pos = queueView(s)!.positions.find((p) => p.projectId === projectId)!
    expect(pos.securityUsd).toBe(50 * kw)
    expect(pos.billUsd).toBeNull() // the study isn't in yet
    s.quarter += 1
    const after = queueView(s)!.positions.find((p) => p.projectId === projectId)!
    expect(after.billUsdKw).toBeGreaterThan(0)
    // the bill: the median × 0.6-1.4, or a 400-600 tail
    const b = after.billUsdKw!
    expect((b >= 400 && b <= 600) || b <= 150 * 1.4 + 1e-6).toBe(true)
  })

  it('paying the bill keeps the place and buys no speed (+1); an unpaid bill holds energisation', () => {
    const { s, projectId, siteId, kw } = withRequest('v1', 3)
    endQuarterQueue(s)
    s.quarter += 1
    const add = () => s.sites.find((x) => x.id === siteId)!.powerAdds!.find((a) => a.projectId === projectId)!
    const ready = add().readyQuarter!
    const paid = ok(s, { type: 'PAY_UPGRADE', projectId })
    const addP = paid.sites.find((x) => x.id === siteId)!.powerAdds!.find((a) => a.projectId === projectId)!
    expect(addP.readyQuarter).toBe(ready)
    expect(paid.cash).toBeCloseTo(s.cash - addP.position!.billUsdKw * kw, 2)
    expect(paid.act5Moves!.at(-1)!.kind).toBe('pay_network_upgrade')
    // unpaid, a quarter before energising: held a quarter
    s.quarter = ready - 1
    endQuarterQueue(s)
    expect(add().readyQuarter).toBe(ready + 1)
    // paid, at the same point: energises on time and the security comes back
    paid.quarter = ready - 1
    const cash = paid.cash
    endQuarterQueue(paid)
    expect(addP.readyQuarter).toBe(ready)
    expect(paid.cash).toBeCloseTo(cash + 50 * kw, 2)
  })

  it('withdrawing is free, refunds nothing and scores 0; the hall that waited ends', () => {
    const { s, projectId } = withRequest()
    endQuarterQueue(s)
    const cash = s.cash
    const after = ok(s, { type: 'WITHDRAW_POSITION', projectId })
    expect(after.cash).toBe(cash)
    expect(after.projects.find((p) => p.id === projectId)!.stage).toBe('ended')
    expect(after.act5Moves!.at(-1)!.kind).toBe('withdraw_position')
    expect(queueView(after)!.positions.find((p) => p.projectId === projectId)).toBeUndefined()
  })

  it('the fast lane (V2 after its trigger only): connect within fast_lane_q, the MW enrolled as curtailable (−1)', () => {
    const v1 = withRequest('v1', 20)
    endQuarterQueue(v1.s)
    expect(applyAction(v1.s, { type: 'TAKE_FAST_LANE', projectId: v1.projectId }).ok).toBe(false)
    const { s, projectId, siteId, kw } = withRequest('v2', 20)
    endQuarterQueue(s)
    const fast = Number(act5Row(s.quarter, scenarioOf(s))!.fast_lane_q)
    const after = ok(s, { type: 'TAKE_FAST_LANE', projectId })
    const site = after.sites.find((x) => x.id === siteId)!
    expect(site.powerAdds!.find((a) => a.projectId === projectId)!.readyQuarter).toBe(s.quarter + fast)
    expect(site.flexKw).toBe(kw)
    expect(after.act5Moves!.at(-1)!.kind).toBe('take_fast_lane')
    // doc 43 §0.14 item 4: 0.5% of the enrolled share's AI revenue lost, and 0.5% of its energy cost saved
    after.quarterStats.aiRevenueUsd = 1e8
    after.quarterStats.powerCostUsd = 4e7
    const used = after.sites.reduce((a, x) => a + usedKw(after, x.id), 0)
    const share = Math.min(1, kw / used)
    const fx = fastLaneEffectUsd(after)
    expect(fx.lossUsd).toBeCloseTo(0.005 * share * 1e8, 0)
    expect(fx.savingUsd).toBeCloseTo(0.005 * share * 4e7, 0)
  })

  it('selling a site’s power: free MW at the powered value, positions at the premium (with the hall’s capex): −1', () => {
    const { s, siteId } = withRequest()
    endQuarterQueue(s)
    const sale = sitePowerSale(s, s.sites.find((x) => x.id === siteId)!)
    expect(sale.positions.length).toBe(1)
    const after = ok(s, { type: 'SELL_SITE_POWER', siteId })
    expect(after.cash).toBeCloseTo(s.cash + sale.totalUsd, 2)
    expect(after.act5Moves!.at(-1)!.kind).toBe('sell_site_with_position')
    expect(queueView(after)!.positions.filter((p) => p.siteId === siteId)).toEqual([])
  })

  it('M55 (doc 43 §0.14 item 8): the whole-site sale bundles its leased halls (lease-sale value) and its power (−1)', () => {
    const fb = playAct5Recipe({ act4_preset: 'fortress', act4_future: 'f2', act4_seed: 1, joins: ['egs2'] })
    const s = toAct5(fb, { vfuture: 'v1' })
    const site = [...s.sites].sort((a, b) => wholeSiteSale(s, b).halls - wholeSiteSale(s, a).halls)[0]
    const sale = wholeSiteSale(s, site)
    expect(sale.halls).toBeGreaterThan(0)
    expect(sale.totalUsd).toBe(sale.leasesUsd + sale.powerUsd)
    const bw = s.bandwidth
    const after = ok(s, { type: 'SELL_SITE', siteId: site.id })
    // the price comes in; any project debt on the halls is repaid out of it (as PROJECT_SELL)
    expect(after.cash).toBeGreaterThan(s.cash)
    expect(after.cash).toBeLessThanOrEqual(s.cash + sale.totalUsd + 1)
    expect(after.bandwidth).toBe(bw - 2)
    expect(after.projects.filter((p) => p.siteId === site.id && p.stage === 'sold').length).toBeGreaterThanOrEqual(sale.halls)
    expect(after.act5Moves!.filter((m) => m.kind.startsWith('sell_site')).length).toBe(1)
    expect(wholeSiteSale(after, after.sites.find((x) => x.id === site.id)!).halls).toBe(0)
  })

  it('the bill draw’s settings are the content’s (doc 43 §0.4)', () => {
    expect(BALANCE.act5.queueBill.tailChance).toBe(0.2)
    expect(PLANTS.queue.security_usd_kw).toBe(50)
  })
})
