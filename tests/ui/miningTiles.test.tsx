// @vitest-environment happy-dom
// M66.4 (doc 43 §0.23 item 4): Act V's Live screen drops the mining tiles for a company with no machines and shows A5-02's
// four-column MW strip, plants and queue in their place; a company that still has miners keeps the bitcoin tiles. "Cost per
// coin" hides on a report where nothing was mined. ETH mining ended with the Merge (2022Q3): after it no chart, tile or note
// offers an ETH view, in any act. UI only: no sim state changes.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { actFirstQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { ethMiningOver, hasMiners, showsMiningTiles } from '../../src/ui/mining.ts'
import { LiveScreen } from '../../src/ui/screens/Live.tsx'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import en from '../../src/i18n/en.json' with { type: 'json' }
import goldenS1 from '../golden/act3-s1-seed-1.json' with { type: 'json' }
import { act4Company } from '../sim/act4Helpers.ts'

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
const act = () => null
const noop = () => {}
const text = en as Record<string, string>

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

const live = (s: GameState) => ({ ...structuredClone(s), phase: 'live' as const, week: 3 })
const body = (s: GameState) => render(<LiveScreen state={s} act={act} tick={noop} skip={noop} />).container.textContent ?? ''

describe('Act V Live screen (M66.4)', () => {
  it('no machines: no mining tiles, the MW strip and the plants and queue instead', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    s.machines = []
    expect(hasMiners(s)).toBe(false)
    expect(showsMiningTiles(s)).toBe(false)
    const view = render(<LiveScreen state={live(s)} act={act} tick={noop} skip={noop} />)
    const t = view.container.textContent ?? ''
    expect(t).not.toContain(text['ui.live.mined'])
    expect(t).not.toContain(text['ui.live.each_now'])
    expect(t).not.toContain('BTC this quarter')
    expect(t).not.toContain('BTC and ETH this quarter')
    expect(view.container.querySelector('[data-act5-dashboard]')).not.toBeNull()
  })

  it('with miners: the bitcoin tiles stay, the strip is not shown, and there is no ETH in the chart or the note', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v1' })
    s.machines = [
      {
        id: 'm1',
        model: 's21',
        condition: 'new',
        count: 4,
        failed: 0,
        siteId: s.sites[0].id,
        boughtQuarter: s.quarter,
      } as unknown as GameState['machines'][number],
    ]
    expect(hasMiners(s)).toBe(true)
    expect(showsMiningTiles(s)).toBe(true)
    const view = render(<LiveScreen state={live(s)} act={act} tick={noop} skip={noop} />)
    const t = view.container.textContent ?? ''
    expect(t).toContain(text['ui.live.mined'])
    expect(view.container.querySelector('[data-act5-dashboard]')).toBeNull()
    // (M75: the chart is titled by its series; at the quarter's start the empty panel opens on BTC, and there is no ETH after the Merge)
    expect(t).toContain(text['ui.live.series.btc'])
    expect(t).not.toMatch(/ETH/)
  })

  it('Act IV and earlier keep the tiles whatever the company owns', () => {
    const s4 = structuredClone(act4Finished())
    s4.act = 4
    s4.machines = []
    expect(showsMiningTiles(s4)).toBe(true)
  })
})

describe('ETH after the Merge (M66.4)', () => {
  it('ethMiningOver: false through 2022Q3, true after it', () => {
    const first2 = actFirstQuarter(2)
    expect(ethMiningOver(first2 - 1)).toBe(false)
    expect(ethMiningOver(first2)).toBe(true)
  })

  it('a 2023 Act III quarter: the Live chart is BTC only; the report has no ETH cost chart and no "cost per coin" when nothing was mined', () => {
    const s = structuredClone(goldenS1) as unknown as GameState
    s.quarter = actFirstQuarter(3)
    const l = body(live(s))
    expect(l).not.toContain('BTC and ETH')
    expect(l).not.toMatch(/ETH \$|ETH [▲▼=]/)
    // the report of a quarter that mined nothing
    const r = structuredClone(s)
    const rep = r.reports.at(-1)!
    rep.coinsMined = { BTC: 0, ETH: 0 }
    r.phase = 'report'
    const txt = render(<ReportScreen state={r} act={act} onGameOver={noop} />).container.textContent ?? ''
    expect(txt).not.toContain(text['ui.report.cost_per_coin'])
    expect(txt).not.toContain('Cost per ETH')
  })
})
