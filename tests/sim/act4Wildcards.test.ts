// M28.5 (doc 33 §6.6, IV-D11): Act IV's wildcards. 2 of 6 drawn at the boundary on their own stream, each in its window,
// independent of the future; each fires once at the start of its quarter with its news line; the Bitcoin Supercycle
// doubles mining revenue for three quarters (the others' effects come with M29/M30).
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { toAct4 } from '../../src/sim/state.ts'
import { act3Finished } from './act4Helpers.ts'

describe('Act IV wildcards (M28.5)', () => {
  it('two of the six are drawn at the boundary, each inside its window, the same for every future', () => {
    const end = act3Finished('s1')
    const a = toAct4(end, { future: 'f1' }).act4Wildcards!
    expect(a).toHaveLength(2)
    expect(new Set(a.map((d) => d.id)).size).toBe(2)
    for (const d of a) {
      const w = CONTENT.wildcardsIv.wildcards.find((x) => x.id === d.id)!
      expect(d.quarter).toBeGreaterThanOrEqual(quarterIndex(w.window[0])!)
      expect(d.quarter).toBeLessThanOrEqual(quarterIndex(w.window[1])!)
      expect(d.fired).toBe(false)
    }
    expect(toAct4(end, { future: 'f4' }).act4Wildcards).toEqual(a)
  })

  it('a drawn wildcard fires once, at the start of its quarter, with its news line; the Supercycle doubles mining revenue', () => {
    const s = toAct4(act3Finished('s0'), { future: 'f2' })
    s.act4Wildcards = [{ id: 'bitcoin_supercycle', quarter: s.quarter + 1, fired: false }]
    // play the first quarter to its report, then move to the next
    let x = s
    const step = (a: Parameters<typeof applyAction>[1]) => {
      const r = applyAction(x, a)
      if (!r.ok) throw new Error(r.error.key)
      x = r.state
    }
    step({ type: 'END_PLAN' })
    while (x.phase === 'live') {
      if (x.interrupt) step({ type: 'RESOLVE_INTERRUPT', choice: defaultChoice(x) })
      else x = advance(x)
    }
    expect(x.act4Wildcards![0].fired).toBe(false)
    step({ type: 'NEXT_QUARTER' })
    expect(x.act4Wildcards![0].fired).toBe(true)
    expect(x.log.some((e) => e.key === 'log.wildcard_iv.bitcoin_supercycle' && e.quarter === x.quarter)).toBe(true)
    const m = x.events.modifiers.at(-1)!
    expect(m).toMatchObject({ kind: 'hashrate', siteIds: null, mult: 2 })
    expect(m.to - m.from + 1).toBe(3 * 13)
  })
})
