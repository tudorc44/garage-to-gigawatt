// M57.1 (doc 43 §15.2, §0.2): the founder's exit and Act V's lock or roll. The exit: a bid drawn in 2040Q3 from the
// future's hidden range; sell the company (stake × valuation × bid), sell the plants and keep the platform, or hold
// (the default: × the hidden outlook factor). The hidden part of exit_v.json is read only by the exit system (and the
// reveal through it); no UI file imports it. Lock or roll: a shell renewal taken long (9 years, −1) or short (2, +1).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT } from '../../src/content/index.ts'
import exitRaw from '../../src/content/exit_v.json' with { type: 'json' }
import { applyAction } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { exitNetWorthUsd, startQuarterExit } from '../../src/sim/systems/act5Exit.ts'
import { resolveRenewals } from '../../src/sim/systems/renewals.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'
import { act4Company } from './act4Helpers.ts'

const q3 = CONTENT.quarters.indexOf('2040Q3')
let fb: GameState | null = null
function firmBuilderV(v: 'v1' | 'v3'): GameState {
  fb ??= playAct5Recipe({ act4_preset: 'fortress', act4_future: 'f2', act4_seed: 1, joins: ['egs2'] })
  const s = toAct5(structuredClone(fb), { vfuture: v })
  s.quarter = q3
  s.phase = 'plan'
  startQuarterExit(s)
  return s
}
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('the founder’s exit (M57.1)', () => {
  it('in 2040Q3 a bid factor is drawn from the future’s range; the exit is closed before', () => {
    for (const v of ['v1', 'v3'] as const) {
      const s = firmBuilderV(v)
      const [lo, hi] = exitRaw.hidden.bid_factor_range[v]
      expect(s.act5Exit!.bidFactor).toBeGreaterThanOrEqual(lo)
      expect(s.act5Exit!.bidFactor).toBeLessThanOrEqual(hi)
    }
    const early = toAct5(structuredClone(fb!), { vfuture: 'v1' })
    expect(applyAction(early, { type: 'EXIT_CHOOSE', choice: 'sell_company' }).ok).toBe(false)
  })

  it('sold: stake × valuation × the bid; held (the default): × the outlook factor', () => {
    const s = firmBuilderV('v3')
    const base = s.founderStake * s.reports.at(-1)!.valuationUsd
    expect(exitNetWorthUsd(s)).toBeCloseTo(base * exitRaw.hidden.outlook_factor.v3, 0)
    const sold = ok(s, { type: 'EXIT_CHOOSE', choice: 'sell_company' })
    expect(exitNetWorthUsd(sold)).toBeCloseTo(base * s.act5Exit!.bidFactor, 0)
  })

  it('selling the plants sells every plant stake to a fund now and keeps the platform', () => {
    const s = firmBuilderV('v1')
    const stakes = (s.ventures ?? []).filter((v) => v.stake > 0).length
    expect(stakes).toBeGreaterThan(0)
    const after = ok(s, { type: 'EXIT_CHOOSE', choice: 'sell_plants' })
    expect((after.ventures ?? []).filter((v) => v.stake > 0 && v.stage === 'operating')).toHaveLength(0)
    expect(after.act5Exit!.plantsSoldUsd).toBeGreaterThan(0)
    expect(after.cash).toBeGreaterThan(s.cash)
  })

  it('the act’s end record carries the exit (net worth after it, and its factors revealed)', () => {
    const s4 = playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
    const end = playFrom(toAct5(s4, { vfuture: 'v1' }), { plan: () => [] }, { through: 5 }).state
    const e = end.act5End!
    if (end.phase === 'chapter') {
      expect(e.exitChoice).toBe('hold')
      expect(e.outlookFactor).toBe(exitRaw.hidden.outlook_factor.v1)
      expect(e.founderNetWorthUsd).toBeCloseTo(e.preExitNetWorthUsd! * e.outlookFactor!, 0)
    }
  })
})

describe('exit_v.json’s hidden part (M57.1, doc 43 §6.8)', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : []
    })
  }
  const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const src = files(new URL('../../src', import.meta.url).pathname)

  it('is imported only by the exit system; no UI file imports the exit system or names the outlook', () => {
    expect(src.filter((f) => /exit_v\.json/.test(code(f))).map((f) => f.split('/').slice(-3).join('/'))).toEqual([
      'sim/systems/act5Exit.ts',
    ])
    // (the chapter report's reveal, Act5Reveal.tsx, shows the outlook once the act is over: M57.2)
    for (const f of src.filter((x) => /[\\/]ui[\\/]/.test(x) && !/Act5Reveal\.tsx$/.test(x))) expect(code(f), f).not.toMatch(/act5Exit\.ts|outlook|bidFactor/)
  })
})

describe('lock or roll (M57.1, doc 43 §0.2)', () => {
  it('a shell renewal locked long runs 9 years (−1); rolled short, 2 (+1)', () => {
    for (const term of ['long', 'short'] as const) {
      const s = firmBuilderV('v1')
      s.quarter = CONTENT.quarters.indexOf('2037Q1')
      const p = s.projects.find((x) => x.stage === 'live' && x.kind === 'shell' && x.tenant)!
      s.act3Renewals = [{ projectId: p.id, kind: 'shell', openedQuarter: s.quarter, walked: false, offer: { mult: 1, termQuarters: 20 }, choice: null }]
      const after = ok(s, { type: 'RENEWAL_TERM', projectId: p.id, term })
      expect(after.act5Moves!.at(-1)!.kind).toBe(term === 'long' ? 'renew_long' : 'renew_short')
      resolveRenewals(after)
      expect(after.projects.find((x) => x.id === p.id)!.tenant!.termQuarters).toBe(term === 'long' ? 36 : 8)
    }
  })
})
