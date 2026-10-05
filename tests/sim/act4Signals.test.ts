// M28.2 (doc 33 §6.3, IV-D10): Act IV's Signals in play. Read the market costs 1 Bandwidth, once a quarter, and reveals
// the read indicator's sharp range for that quarter only; the panel shows this quarter's value and the past, never a
// later quarter.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { act4MwColumns, signalsPanelIv } from '../../src/sim/selectors.ts'
import { act4Company } from './act4Helpers.ts'

describe('Act IV Signals in play (M28.2)', () => {
  it('the panel shows six indicators, this quarter’s value, no future quarter, no range until read', () => {
    const s = act4Company('s2', 'f3')
    const v = signalsPanelIv(s)!
    expect(v.indicators.map((i) => i.id)).toEqual(CONTENT.signalsIv.f3.map((i) => i.id))
    expect(v.quarter).toBe('2031Q1')
    for (const i of v.indicators) {
      expect(i.current!.displayed).toBe(50)
      expect(i.history).toEqual([])
      expect(i.reads).toEqual([])
    }
  })

  it('Read the market: 1 Bandwidth, the chosen indicator’s sharp range this quarter, once a quarter', () => {
    const s = act4Company('s2', 'f1')
    const r = applyAction(s, { type: 'READ_SIGNAL_IV', indicator: 'launch_quotes' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.bandwidth).toBe(s.bandwidth - 1)
    const v = signalsPanelIv(r.state)!
    const lq = v.indicators.find((i) => i.id === 'launch_quotes')!
    expect(lq.reads).toEqual([{ quarter: '2031Q1', ...CONTENT.signalsIv.f1[0].series[0].sharp }])
    expect(v.readThisQuarter).toBe('launch_quotes')
    const again = applyAction(r.state, { type: 'READ_SIGNAL_IV', indicator: 'fleet_reliability' })
    expect(again.ok).toBe(false)
    // Act I–III's Read the market and Act III's reads are refused in Act IV
    expect(applyAction(s, { type: 'READ_SIGNAL', indicator: 'revenue_gap' }).ok).toBe(false)
  })

  it('A4-02’s megawatt strip: ground MW from the sites; orbit and the Moon 0 until their systems exist', () => {
    const s = act4Company('s0', 'f2')
    const mw = act4MwColumns(s)!
    expect(mw.groundMw).toBeGreaterThan(0)
    expect(mw.orbitMw).toBe(0)
    expect(mw.moonKwe).toBe(0)
  })
})
