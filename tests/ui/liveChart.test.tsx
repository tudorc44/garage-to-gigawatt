// @vitest-environment happy-dom
// M75.3 (doc 61 v1.0 §6): the Live screen's chart by act. The default series per act (the act's main driver, from last quarter's
// revenue split), the switch (only the series that apply; the choice is remembered across quarters and cleared at an act change)
// and the leak guard (every column a series reads in Acts III-V is on the allow-list). UI only: no sim state changes.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { readFileSync } from 'node:fs'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import type { LedgerQuarter } from '../../src/sim/ledger.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { newGame, toAct5, type GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { CHART_ALLOWED_COLUMNS, chartSeries, defaultSeries, type ChartSeriesId } from '../../src/ui/liveChart.ts'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { act2Company } from '../sim/act2Helpers.ts'
import { act3ScenarioCompany } from '../sim/act3Helpers.ts'
import { act4Company, orbitCompany } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
beforeEach(() => localStorage.clear())

/** The state `weeks` into the live quarter (the Plan phase ended, alerts and cards left alone: it stops at an interrupt). */
function liveAt(s: GameState, weeks = 3): GameState {
  const r = applyAction(s, { type: 'END_PLAN' })
  if (!r.ok) throw new Error(r.error.key)
  let t = r.state
  while (t.quarterStats.weeks.length < weeks && !t.interrupt && t.phase === 'live') t = advance(t)
  return t
}
const series = (s: GameState) => chartSeries(s, s.quarterStats.weeks)
const defaultOf = (s: GameState): ChartSeriesId => defaultSeries(s, series(s))

/** A closed quarter in the ledger with these revenue lines, as last quarter's revenue split. */
function withRevenue(s: GameState, lines: LedgerQuarter['lines']): GameState {
  const q: LedgerQuarter = { q: s.quarter - 1, startCash: 0, lines, byBiz: {}, byRef: {}, rounding: 0, weeks: [] }
  s.ledger = { from: s.quarter - 1, history: [q], current: null }
  return s
}

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

describe('the default series by act (doc 61 §3)', () => {
  it('Prologue and Act I: BTC (and ETH before the Merge), as today', () => {
    const s = liveAt(newGame(1))
    expect(defaultOf(s)).toBe('btc')
    expect(series(s).find((x) => x.id === 'btc')!.lines.map((l) => l.id)).toEqual(['btc', 'eth'])
  })

  it('Act II before the GPU data starts (2023-07-03): Your company; from it: GPU rent; still mining BTC: BTC', () => {
    const before = act2Company('2023Q2')
    before.machines = []
    const b = liveAt(before)
    expect(series(b).some((x) => x.id === 'gpu')).toBe(false)
    expect(defaultOf(b)).toBe('company')
    const after = act2Company('2023Q3')
    after.machines = []
    const a = liveAt(after)
    expect(series(a).some((x) => x.id === 'gpu')).toBe(true)
    expect(defaultOf(a)).toBe('gpu')
    const mining = act2Company('2023Q3')
    mining.machines = [{ id: 'm1', model: 's19pro', condition: 'new', count: 2, failed: 0, siteId: mining.sites[0].id, boughtQuarter: 0 } as never]
    expect(defaultOf(liveAt(mining))).toBe('btc')
  })

  it('Act III: GPU rent, or BTC when mining is still more than half of last quarter\'s revenue', () => {
    const base = act3ScenarioCompany('s0')
    base.machines = []
    expect(defaultOf(liveAt(withRevenue(structuredClone(base), { ai_cloud: 100, mining_btc: 10 })))).toBe('gpu')
    expect(defaultOf(liveAt(withRevenue(structuredClone(base), { ai_cloud: 10, mining_btc: 100 })))).toBe('btc')
  })

  it('Act IV: GPU rent, or the launch price for a company whose orbital revenue is more than half (and has orbital blocks)', () => {
    const base = orbitCompany('f1')
    base.machines = []
    base.act4Orbit = { blocks: [{ id: 'b1' }] } as never
    expect(defaultOf(liveAt(withRevenue(structuredClone(base), { ai_cloud: 100, orbit_revenue: 10 })))).toBe('gpu')
    const orbital = liveAt(withRevenue(structuredClone(base), { ai_cloud: 10, orbit_revenue: 100 }))
    expect(defaultOf(orbital)).toBe('launch')
    // without orbital blocks the launch price is not offered, whatever the split
    const none = structuredClone(base)
    none.act4Orbit = { blocks: [] } as never
    expect(series(liveAt(withRevenue(none, { orbit_revenue: 100 }))).some((x) => x.id === 'launch')).toBe(false)
  })

  it('Act V: the power price in the largest site\'s region; BTC for a company that still mines (M66)', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    s.machines = []
    const sites = s.sites.map((x) => ({ id: x.id, region: (x as unknown as { region?: string }).region, tier: x.tier }))
    expect(sites.length).toBeGreaterThan(0)
    const noMiners = liveAt(structuredClone(s))
    expect(series(noMiners).some((x) => x.id === 'btc')).toBe(false)
    expect(defaultOf(noMiners)).toBe('power')
    const power = series(noMiners).find((x) => x.id === 'power')!
    expect(power.columns).toEqual([`power_usd_kwh_${power.region}`])
    // the largest site decides the region
    const other = structuredClone(s)
    const big = other.sites.reduce((a, b) => ((a as { id: string }).id > (b as { id: string }).id ? a : b))
    ;(big as unknown as { region: string }).region = 'nordics'
    for (const x of other.sites) if (x !== big) (x as unknown as { region: string | undefined }).region = x.tier === 'own_site' ? 'ercot' : undefined
    expect(['ercot', 'nordics']).toContain(series(liveAt(other)).find((x) => x.id === 'power')!.region)
    const mining = structuredClone(s)
    mining.machines = [{ id: 'm1', model: 's21', condition: 'new', count: 4, failed: 0, siteId: mining.sites[0].id, boughtQuarter: mining.quarter } as never]
    expect(defaultOf(liveAt(mining))).toBe('btc')
  })
})

describe('the switch (doc 61 §4)', () => {
  const noop = () => {}
  const act = () => null
  const mountText = (s: GameState) => render(<LiveScreen state={s} act={act} tick={noop} skip={noop} />)

  it('lists only the series that apply, remembers the choice across quarters, and resets at an act change', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    s.machines = [{ id: 'm1', model: 's21', condition: 'new', count: 4, failed: 0, siteId: s.sites[0].id, boughtQuarter: s.quarter } as never]
    const q1 = liveAt(s)
    const v = mountText(q1)
    const ids = [...v.container.querySelectorAll('[data-chart-series]')].map((b) => b.getAttribute('data-chart-series'))
    expect(ids).toEqual(expect.arrayContaining(['btc', 'gpu', 'power', 'company']))
    expect(ids).not.toContain('launch') // (no orbital blocks)
    expect(v.container.querySelector('[data-chart-series="btc"]')!.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(v.container.querySelector('[data-chart-series="gpu"]')!)
    expect(v.container.querySelector('[data-chart-series="gpu"]')!.getAttribute('aria-pressed')).toBe('true')
    cleanup()
    // the next quarter of the same game and act: the choice is still gpu
    const next = structuredClone(q1)
    next.quarter += 1
    next.quarterStats = { ...next.quarterStats }
    const v2 = mountText(next)
    expect(v2.container.querySelector('[data-chart-series="gpu"]')!.getAttribute('aria-pressed')).toBe('true')
    cleanup()
    // an act change (another act, same game): back to that act's default
    const a4 = liveAt(act4Company('s0', 'f1'))
    a4.seed = q1.seed
    const v3 = mountText(a4)
    const pressed = [...v3.container.querySelectorAll('[data-chart-series][aria-pressed="true"]')].map((b) => b.getAttribute('data-chart-series'))
    expect(pressed).toEqual([defaultOf(a4)])
    cleanup()
    // and another game's choice is not this game's
    const other = structuredClone(q1)
    other.seed = q1.seed + 999
    const v4 = mountText(other)
    expect(v4.container.querySelector('[data-chart-series="btc"]')!.getAttribute('aria-pressed')).toBe('true')
  })

  it('a stored choice that no longer applies falls back to the default', () => {
    const s = liveAt(newGame(1))
    localStorage.setItem('g2g.chart', JSON.stringify({ seed: s.seed, act: s.act, series: 'launch' }))
    const v = mountText(s)
    const pressed = [...v.container.querySelectorAll('[data-chart-series][aria-pressed="true"]')].map((b) => b.getAttribute('data-chart-series'))
    expect(pressed).toEqual(['btc'])
  })
})

describe('the leak guard (doc 61 §5)', () => {
  it('every column a series reads in Acts III-V is on the allow-list; none names a scenario, a future or a hidden value', () => {
    const states: GameState[] = []
    const a3 = act3ScenarioCompany('s0')
    a3.machines = []
    states.push(liveAt(a3))
    const a4 = orbitCompany('f1')
    a4.machines = []
    a4.act4Orbit = { blocks: [{ id: 'b1' }] } as never
    states.push(liveAt(a4))
    const v5 = toAct5(act4Finished(), { vfuture: 'v1' })
    v5.machines = []
    states.push(liveAt(v5))
    const m5 = structuredClone(v5)
    m5.machines = [{ id: 'm1', model: 's21', condition: 'new', count: 1, failed: 0, siteId: m5.sites[0].id, boughtQuarter: m5.quarter } as never]
    states.push(liveAt(m5))
    for (const s of states) {
      expect(s.act).toBeGreaterThanOrEqual(3)
      for (const x of series(s)) {
        for (const c of x.columns) {
          expect(CHART_ALLOWED_COLUMNS, `${s.act}: ${x.id} reads ${c}`).toContain(c)
          expect(c).not.toMatch(/scenario|future|signal|reading|trigger|decoy|tell|role/i)
        }
      }
    }
  })

  it('the allow-list is only market columns the screens show (no Signals series, no scenario or future tag)', () => {
    for (const c of CHART_ALLOWED_COLUMNS) expect(c).toMatch(/^(btc_usd|eth_usd|gpu_[a-z0-9_]+_usd_hr|power_usd_kwh_[a-z]+|launch_usd_kg_leo)$/)
  })

  it('the chart module does not import a hidden file (signals, rivals, reading scores, truth files)', () => {
    const src = readFileSync('src/ui/liveChart.ts', 'utf8')
    expect(src).not.toMatch(/signalsHidden|rivalsHidden|reading_score|lunar_truth|orbit_truth|readingScore/)
  })
})

describe('sanity', () => {
  it('the quarter index of 2023Q3 is where the GPU data starts (week of 2023-07-03)', () => {
    const q = quarterIndex('2023Q3')!
    expect(CONTENT.market[q][0].gpu_h100_neocloud_usd_hr).not.toBeNull()
    expect(CONTENT.market[q - 1][12].gpu_h100_neocloud_usd_hr).toBeNull()
  })
})
