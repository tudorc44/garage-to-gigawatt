// M56.3 (doc 43 §9.1, V-D15): orbit's replacement cycle. At a block's design end the Plan phase offers replace, extend a
// year, bring the compute home, or retire (the default at the end of the Plan); orbit moves score 0.
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { BALANCE, CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { toAct5, type GameState, type OrbitalBlock } from '../../src/sim/state.ts'
import { designEndQuarter, endQuarterHomed, refitUsd, settleEol, startQuarterOrbitEol } from '../../src/sim/systems/orbitEol.ts'
import { poweredKw, usedKw } from '../../src/sim/systems/sites.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

let base: GameState | null = null
/** The Orbital Landlord in Act V at its first live block's design end, the decision open. */
function atEol(quarterAtLeast = 0): { s: GameState; b: OrbitalBlock } {
  base ??= toAct5(playAct5Recipe({ act4_preset: 'fortress', act4_future: 'f1', act4_seed: 1, joins: [] }), { vfuture: 'v1' })
  const s = structuredClone(base)
  s.cash += 5e8
  const b = s.act4Orbit!.blocks.find((x) => x.stage === 'live')!
  const end = designEndQuarter(b)!
  s.quarter = Math.max(end, actFirstQuarter(5), quarterAtLeast)
  b.retireQuarter = s.quarter + 40 // (the hidden true life: long enough to decide)
  s.phase = 'plan'
  startQuarterOrbitEol(s)
  return { s, b: s.act4Orbit!.blocks.find((x) => x.id === b.id)! }
}
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('orbit’s replacement cycle (M56.3)', () => {
  it('a live block at its design end waits for a decision; unanswered, it retires', () => {
    const { s, b } = atEol()
    expect(b.eolPending).toBe(true)
    settleEol(s)
    expect(s.act4Orbit!.blocks.find((x) => x.id === b.id)!.stage).toBe('retired')
  })

  it('extend: once, for a year of in-orbit insurance on its capex; the design end moves a year (score 0)', () => {
    const { s, b } = atEol()
    const cost = refitUsd(s, b)
    const after = ok(s, { type: 'ORBIT_EOL', blockId: b.id, choice: 'extend' })
    const nb = after.act4Orbit!.blocks.find((x) => x.id === b.id)!
    expect(after.cash).toBeCloseTo(s.cash - cost, 2)
    expect(nb.extendedQuarters).toBe(BALANCE.act5.orbitExtend.quarters)
    expect(designEndQuarter(nb)).toBe(designEndQuarter(b)! + 4)
    expect(after.act5Moves!.at(-1)!.kind).toBe('orbit_extend')
    // a year on, it's due again, and can't be extended twice
    after.quarter = designEndQuarter(nb)!
    startQuarterOrbitEol(after)
    expect(applyAction(after, { type: 'ORBIT_EOL', blockId: b.id, choice: 'extend' }).ok).toBe(false)
  })

  it('replace: the block deorbits and a new one of its kind, size and shell opens on the newest generation', () => {
    const { s, b } = atEol(CONTENT.quarters.indexOf('2039Q1'))
    const after = ok(s, { type: 'ORBIT_EOL', blockId: b.id, choice: 'replace' })
    expect(after.act4Orbit!.blocks.find((x) => x.id === b.id)!.stage).toBe('retired')
    const nb = after.act4Orbit!.blocks.at(-1)!
    expect([nb.kind, nb.mw, nb.shell, nb.stage]).toEqual([b.kind, b.mw, b.shell, 'proposed'])
    expect(nb.gen).toBe('gen38') // flying from 2038Q4
  })

  it('bring home: a contracted shell tenant moves to a ground site with the MW free, and pays its rent there', () => {
    const { s, b } = atEol()
    // a small contracted shell block, so a site has the room
    b.kind = 'shell'
    b.mw = 1
    b.tenant = { type: 'sovereign', price: 2e6, termQuarters: 20, signedQuarter: s.quarter - 8, dueQuarter: null, endQuarter: s.quarter + 8, prepaidLeftUsd: 0 }
    const site = [...s.sites].sort((x, y) => poweredKw(y, s.quarter) - usedKw(s, y.id) - (poweredKw(x, s.quarter) - usedKw(s, x.id)))[0]
    if (poweredKw(site, s.quarter) - usedKw(s, site.id) < 1000) return // (no room on this company: covered by the blocker)
    const used = usedKw(s, site.id)
    const after = ok(s, { type: 'ORBIT_EOL', blockId: b.id, choice: 'bring_home' })
    expect(after.act5Homed).toHaveLength(1)
    expect(usedKw(after, after.act5Homed![0].siteId)).toBeGreaterThanOrEqual(used)
    const cash = after.cash
    endQuarterHomed(after)
    expect(after.cash).toBeCloseTo(cash + 2e6 / 4, 2)
    expect(after.act5Moves!.at(-1)!.kind).toBe('orbit_bring_home')
  })

  it('bring home is refused for spot blocks; nothing of this before Act V', () => {
    const { s, b } = atEol()
    b.tenant = 'spot'
    expect(applyAction(s, { type: 'ORBIT_EOL', blockId: b.id, choice: 'bring_home' }).ok).toBe(false)
    const s4 = structuredClone(s)
    s4.act = 4
    expect(applyAction(s4, { type: 'ORBIT_EOL', blockId: b.id, choice: 'retire' }).ok).toBe(false)
  })
})
