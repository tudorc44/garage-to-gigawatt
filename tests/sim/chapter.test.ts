import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { playGame } from '../../src/sim/replay.ts'
import { carryOver, chapterReport, mergeView } from '../../src/sim/selectors.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { runSummaryText } from '../../src/ui/chapter.ts'
import { BOTS } from '../../tools/bots.ts'

const LAST = actLastQuarter(1)

describe('the Merge screen (merge.json)', () => {
  it('shows your GPUs and their resale value, BTC hashrate, and energized MW used vs idle', () => {
    const s: GameState = { ...newGame(1), quarter: LAST, phase: 'merge' }
    s.machines.push({
      id: 'lot-9',
      model: 'gpu_gen2',
      siteId: 'site-1',
      condition: 'used',
      count: 2,
      failed: 0,
      earnsFromQuarter: 0,
    })
    const v = mergeView(s)
    expect(v.gpus).toBe(2)
    expect(v.gpuResaleUsd).toBe(2 * 1800) // the 2022Q3 used price
    expect(v.usedKw + v.idleKw).toBeCloseTo(v.energizedKw)
    // Only a garage: the site choices carry a note; with GPUs, the GPU choices don't.
    const notes = Object.fromEntries(v.choices.map((c) => [c.id, c.note]))
    expect(notes).toEqual({
      sell_gpus_keep_btc: null,
      gpu_cloud: null,
      hosting: 'ui.merge.no_sites',
      hold_and_wait: 'ui.merge.no_sites',
    })
    expect(
      mergeView({ ...s, machines: [] }).choices.find(
        (c) => c.id === 'gpu_cloud',
      )!.note,
    ).toBe('ui.merge.no_gpus')
  })
})

describe('the chapter report', () => {
  it('scores net worth = stake × the last valuation, titled by the bands', () => {
    const { state } = playGame(2017, BOTS['raise-climb'])
    expect(state.phase).toBe('chapter')
    const c = chapterReport(state)
    const last = state.reports.at(-1)!
    expect(c.netWorthUsd).toBeCloseTo(state.founderStake * last.valuationUsd)
    const band = [...CONTENT.merge.titleBands].find(
      (b) => c.netWorthUsd >= b.min,
    )!
    expect(c.title).toBe(band.title)
    expect(c.curve).toHaveLength(23)
    expect(c.peak!.valuationUsd).toBe(
      Math.max(...state.reports.map((r) => r.valuationUsd)),
    )
    expect(c.mergeChoice?.id).toBe(CONTENT.merge.botDefault)
    expect(c.moments.rivalsReached).toHaveLength(4)
    expect(c.moments.raised.map((r) => r.round)).toContain('seed')
    const text = runSummaryText(state)
    expect(text).toContain(`Title: ${c.title}`)
    expect(text).toContain('Key moments')
  })

  it('a bust gets the "Bust" title and no Merge decision', () => {
    const { state } = playGame(2017, BOTS['ff-climb'])
    expect(state.phase).toBe('gameover')
    const c = chapterReport(state)
    expect(c.bust).toBe(true)
    expect(c.title).toBe('Bust')
    expect(c.mergeChoice).toBeNull()
    expect(runSummaryText(state)).toContain('Chapter ends early')
  })
})

describe('the Act II intro (wireframe A2-02)', () => {
  it('summarises what the company carries over into Act II, as it is', () => {
    const { state } = playGame(2017, BOTS['raise-climb'])
    const intro = applyAction(state, { type: 'CONTINUE_TO_ACT_2' })
    if (!intro.ok) throw new Error(intro.error.key)
    const s = intro.state
    const c = carryOver(s)
    expect(c.cashUsd).toBe(s.cash)
    expect(c.founderStake).toBe(s.founderStake)
    expect(c.treasury).toEqual(s.treasury)
    expect(c.sites.map((x) => x.tier)).toEqual(s.sites.map((x) => x.tier))
    expect(c.energizedKw).toBe(c.sites.reduce((kw, x) => kw + x.energizedKw, 0))
    expect(c.energizedKw).toBeGreaterThan(0)
    expect(c.asics + c.gpus).toBe(s.machines.reduce((n, l) => n + l.count, 0))
    expect(c.btcThs).toBeGreaterThan(0)
    expect(c.mergeChoice).toBe(CONTENT.merge.botDefault)
  })
})
