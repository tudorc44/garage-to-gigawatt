// M67.2 (doc 43 §0.24 item 1): Act V's Signals headlines reach the player through the Signals panel (headlines only, this
// quarter's only), and the leak guard covers them: before its future's trigger quarter no headline contains a future's
// name, a trigger card's title, or a decoy's name, reason or tell. Tests may read the hidden files.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { signalsHiddenV } from '../../src/content/signalsHiddenV.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { signalsPanelV } from '../../src/sim/selectors.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { act4Company } from './act4Helpers.ts'

const HIDDEN = V_FUTURE_IDS.map((v) => signalsHiddenV(v))
const NAMES = HIDDEN.flatMap((h) => [h.future_name, h.trigger.title, h.decoy.name])
const lower = (s: string) => s.toLowerCase()

describe('Act V headlines before the trigger (the leak guard)', () => {
  it.each(V_FUTURE_IDS)('%s: no headline before its trigger quarter names a future, a trigger card or a decoy, or quotes the decoy\'s reason or tell', (f) => {
    const h = signalsHiddenV(f)
    let checked = 0
    for (const ind of CONTENT.signalsV[f])
      for (const p of ind.series) {
        if (!p.headline || p.quarter >= h.trigger.quarter) continue
        checked++
        const text = lower(p.headline)
        for (const n of NAMES) expect(text, `${f} ${ind.id} ${p.quarter}: "${p.headline}" contains "${n}"`).not.toContain(lower(n))
        expect(text, `${f} ${p.quarter} quotes the decoy's reason`).not.toContain(lower(h.decoy.reason))
        expect(text, `${f} ${p.quarter} quotes the decoy's tell`).not.toContain(lower(h.decoy.tell))
        expect(text).not.toMatch(/decoy|false alarm/)
      }
    expect(checked).toBeGreaterThan(0)
  })

  it('headlines exist in the runtime content for every future (the field is kept by the schema)', () => {
    for (const f of V_FUTURE_IDS) {
      const n = CONTENT.signalsV[f].flatMap((i) => i.series).filter((p) => p.headline).length
      expect(n, f).toBeGreaterThan(10)
    }
  })
})

let end4: GameState | null = null
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

describe('the Signals panel view (signalsPanelV)', () => {
  it('shows this quarter\'s headlines only: V4 2037Q3 has the capacity filing and nothing from a later quarter', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v4' })
    s.quarter = actFirstQuarter(5) + 6
    const v = signalsPanelV(s)!
    expect(v.quarter).toBe('2037Q3')
    // (the Capacity Market's filing and the Launch Cadence's price line, in the indicators' order; none from 2037Q4 on)
    expect(v.headlines).toEqual([
      'Three utilities file for emergency capacity after a record heat wave.',
      'Third-party launch quotes fall below $250 a kilogram.',
    ])
    s.quarter = actFirstQuarter(5) + 0
    expect(signalsPanelV(s)!.headlines).toEqual([])
  })

  it('the view returns headlines and the displayed numbers only: no sharp note, role tag or hidden field', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v3' })
    s.quarter = actFirstQuarter(5) + 5
    const json = JSON.stringify(signalsPanelV(s))
    expect(json).not.toMatch(/role_tag|authoring_latent|"decoy"|"trigger"/)
  })
})
