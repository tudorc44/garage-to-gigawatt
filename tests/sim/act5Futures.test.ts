// M51 (doc 43 §19 item 3, §6): Act V's futures engine. The Signals (runtime fields only; Read the market), the hidden
// files and their guards (reading_score_v.json read only by readingScoreV.ts, which only act5End.ts imports; the hidden
// view of the Signals only by act5End.ts), the reading score with the carried rules (a build quarter's own hedges and
// debt at 0, M40.1; a raise takes the next scored move's sign or 0, M41.1 as M48 corrected the file; the low-exposure
// quiet quarter), the move log, the reveal record, and the common baseline (the Signals and the capacity ratings).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, SIGNAL_IDS_V, V_FUTURE_IDS, act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { signalsHiddenV } from '../../src/content/signalsHiddenV.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { signalsPanelV } from '../../src/sim/selectors.ts'
import { ACT5_MOVE_KINDS, toAct5, type Act5Move, type GameState } from '../../src/sim/state.ts'
import { act5MoveKind } from '../../src/sim/systems/act5Moves.ts'
import { buildAct5End } from '../../src/sim/systems/act5End.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import {
  ACT5_MOVE_SIGN,
  computeReadingV,
  moveRowIdsV,
  oracleLogsV,
  scoredSignsV,
} from '../../src/sim/systems/readingScoreV.ts'
import { act4Company } from './act4Helpers.ts'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}
const src = sourceFiles(new URL('../../src', import.meta.url).pathname)
const code = (file: string) =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
const rel = (f: string) => f.split('/').slice(-3).join('/')
const importers = (pattern: RegExp) => src.filter((f) => pattern.test(code(f))).map(rel)

let end4: GameState | null = null
/** An Act IV company at its 2035Q4 chapter report (cached; returns a copy). */
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}
const first5 = actFirstQuarter(5)
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('Act V’s hidden files (M51, doc 43 §6.8, V-D29): each read only where it may be', () => {
  it('reading_score_v.json only by readingScoreV.ts; readingScoreV only by act5End.ts', () => {
    expect(importers(/reading_score_v\.json/)).toEqual(['sim/systems/readingScoreV.ts'])
    expect(importers(/readingScoreV/)).toEqual(['sim/systems/act5End.ts'])
  })

  it('the hidden view of the Signals (signalsHiddenV) only by act5End.ts', () => {
    expect(importers(/signalsHiddenV/).filter((f) => !/signalsHiddenV\.ts$/.test(f))).toEqual(['sim/systems/act5End.ts'])
  })

  it('CONTENT.signalsV carries runtime fields only; signalsV.ts reads no market and no hidden view', () => {
    for (const v of V_FUTURE_IDS) {
      const json = JSON.stringify(CONTENT.signalsV[v])
      for (const hidden of ['role_tag', 'authoring_latent', 'future_name', 'reasoning', 'DO_NOT_EXPOSE', 'wrong_reading'])
        expect(json, `${v} ${hidden}`).not.toContain(hidden)
      expect(json).not.toContain(signalsHiddenV(v).future_name)
    }
    const sv = code(src.find((f) => /systems[\\/]signalsV\.ts$/.test(f))!)
    expect(sv).not.toMatch(/act5Row|marketWeek|quarterInputs|signalsHidden|readingScore/)
  })

  it('no UI file reads the Act V future or its reveal text, except the chapter report’s reveal (Act5Reveal.tsx)', () => {
    for (const f of src.filter((x) => /[\\/]ui[\\/]/.test(x) && !/Act5Reveal\.tsx$/.test(x))) {
      expect(code(f), f).not.toMatch(/\bvFutureId\b|a5\.reveal\.|act5End\.ts|readingScoreV|signalsHiddenV/)
    }
    // the selectors and views read the future only to pick the Signals file
    for (const f of src.filter((x) => /selectors\.ts$|Views\.ts$/.test(x)))
      expect(code(f), f).not.toMatch(/readingScoreV|signalsHiddenV|act5End/)
  })
})

describe('Act V’s Signals (M51, doc 43 §6.3): the panel and Read the market', () => {
  it('loads six indicators per future over Act V’s 20 quarters, identical in every future in 2036Q1–Q2 (V-B14)', () => {
    for (const v of V_FUTURE_IDS) {
      expect(CONTENT.signalsV[v].map((i) => i.id)).toEqual([...SIGNAL_IDS_V])
      for (const i of CONTENT.signalsV[v]) expect(i.series.map((p) => p.quarter)).toEqual(CONTENT.quarters.slice(first5, first5 + 20))
    }
    for (let n = 0; n < 2; n++)
      for (const v of V_FUTURE_IDS.slice(1))
        expect(CONTENT.signalsV[v].map((i) => i.series[n]), `${v} n=${n}`).toEqual(CONTENT.signalsV.v1.map((i) => i.series[n]))
    // the Signals move no earlier than 2036Q3 (doc 43 §6.1): the four futures still agree at n = 1
    const at = (n: number) => new Set(V_FUTURE_IDS.map((v) => JSON.stringify(CONTENT.signalsV[v].map((i) => i.series[n].displayed))))
    expect(at(1).size).toBe(1)
    expect(at(3).size).toBeGreaterThan(1)
  })

  it('the panel shows this quarter and the past only; a read costs 1 BW, once a quarter, and shows the sharp range', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v2' })
    const p = signalsPanelV(s)!
    expect(p.indicators).toHaveLength(6)
    expect(p.indicators.every((i) => i.history.length === 0 && i.reads.length === 0)).toBe(true)
    expect(p.blocked).toBeNull()
    const bw = s.bandwidth
    const r = ok(s, { type: 'READ_SIGNAL_V', indicator: 'grid_queue' })
    expect(r.bandwidth).toBe(bw - 1)
    const read = signalsPanelV(r)!.indicators.find((i) => i.id === 'grid_queue')!.reads
    expect(read).toEqual([{ quarter: '2036Q1', ...CONTENT.signalsV.v2[0].series[0].sharp }])
    expect(applyAction(r, { type: 'READ_SIGNAL_V', indicator: 'ai_demand' }).ok).toBe(false)
    // Act IV's read is closed in Act V, and Act V's in Act IV
    expect(applyAction(s, { type: 'READ_SIGNAL_IV', indicator: 'launch_quotes' }).ok).toBe(false)
    expect(signalsPanelV(act4Finished())).toBeNull()
  })
})

describe('the common baseline and the seam glide (doc 43 §3.3, §0.9 item 10)', () => {
  it('the capacity ratings are Act V’s own (nothing glides them): the glided market’s 2036Q1 equals the file’s', () => {
    const key = scenarioOf(toAct5(act4Finished(), { vfuture: 'v1' }))
    for (const c of ['capacity_rating_nuclear', 'capacity_rating_cc', 'capacity_rating_ct', 'flex_capacity_rating'] as const)
      expect(act5Row(first5, key)![c]).toBe(CONTENT.act5Futures.v1.quarterly[0][c])
  })
})

describe('the Act V reading score (M51, doc 43 §6.7; reading_score_v.json)', () => {
  it('every logged kind has a signed row in the file, and every row but the exit and Read the market is a kind', () => {
    const rows = moveRowIdsV().filter((r) => r !== 'founder_exit' && r !== 'read_the_market')
    expect(ACT5_MOVE_KINDS.map((k) => (k === 'equity_raise' ? 'equity_raise_unfollowed' : k)).sort()).toEqual(rows.sort())
    expect(ACT5_MOVE_SIGN.buy_plant_stake).toBe(1)
    expect(ACT5_MOVE_SIGN.renew_long).toBe(-1)
    expect(ACT5_MOVE_SIGN.renew_short).toBe(1)
    expect(ACT5_MOVE_SIGN.withdraw_position).toBe(0)
    expect(ACT5_MOVE_SIGN.equity_raise).toBe(0)
  })

  it('M41 raise rule: a raise takes the sign of the next scored move at any distance, 0 if none follows', () => {
    const log: Act5Move[] = [
      { q: 1, kind: 'equity_raise' },
      { q: 2, kind: 'orbit_replace' },
      { q: 9, kind: 'sell_plant_stake_to_fund' },
      { q: 12, kind: 'equity_raise' },
      { q: 14, kind: 'request_grid_mw' },
    ]
    expect(scoredSignsV(log)).toEqual([-1, 0, -1, 0, 0])
  })

  it('M40.1 build rule: in a quarter with a firm build, its contract and plant debt count 0 (and never as decoy moves)', () => {
    const log: Act5Move[] = [
      { q: 5, kind: 'commit_new_firm_asset' },
      { q: 5, kind: 'contract_plant_output' },
      { q: 5, kind: 'arrange_plant_debt' },
      { q: 6, kind: 'contract_plant_output' },
    ]
    expect(scoredSignsV(log)).toEqual([1, 0, 0, -1])
  })

  // (a calm ideal quarter scores 0.7 when you are calm too, Act III's rule, so V3's and V4's perfect is below 100)
  it('the oracles: perfect reads highest in every future; the opposite reads low; passive between (V-B9 shape)', () => {
    const lines: string[] = []
    for (const v of V_FUTURE_IDS) {
      const o = oracleLogsV(v)
      const high = Array(20).fill(1)
      const perfect = computeReadingV(o.perfect, v, high).score!
      const passive = computeReadingV(o.passive, v, high).score!
      const opposite = computeReadingV(o.opposite, v, high).score!
      lines.push(`${v}: perfect ${perfect}, passive ${passive}, opposite ${opposite}`)
      expect(perfect).toBeGreaterThan(passive)
      expect(opposite).toBeLessThan(passive)
    }
    expect(lines).toMatchInlineSnapshot(`
      [
        "v1: perfect 100, passive 50, opposite 0",
        "v2: perfect 100, passive 50, opposite 0",
        "v3: perfect 93, passive 60, opposite 28",
        "v4: perfect 86, passive 67, opposite 46",
      ]
    `)
  })

  it('a quiet quarter with exposure under 15% of the entry value counts as a match; a scored move ends that', () => {
    const low = Array(20).fill(0.05)
    expect(computeReadingV([], 'v1', low).score).toBe(100)
    const r = computeReadingV([{ q: 3, kind: 'sell_plant_stake_to_fund' }], 'v1', low)
    expect(r.perQuarter[3].value).toBe(0)
    // a quarter with no exposure recorded never counts as low
    expect(computeReadingV([], 'v1', []).score).toBe(50)
  })

  it('the decoy window: a wrong-sign move there costs 10 points (at most 30)', () => {
    // V1's decoy (the SMR wave) is 2037Q1–Q3 (q 4–6), wrong stance −1
    const r = computeReadingV([{ q: 4, kind: 'sell_plant_stake_to_fund' }], 'v1', Array(20).fill(1))
    expect(r.penalty).toBe(10)
  })
})

describe('the move log and the reveal record (M51)', () => {
  it('maps the carried actions that already mean a move (mine, reversible)', () => {
    expect(act5MoveKind({ type: 'RAISE_EQUITY' } as never)).toBe('equity_raise')
    expect(act5MoveKind({ type: 'PROJECT_SELL', projectId: 'x' })).toBe('sell_site_free_mw')
    expect(act5MoveKind({ type: 'READ_SIGNAL_V', indicator: 'grid_queue' })).toBeNull()
  })

  it('an Act V game records its exposure each quarter, and the chapter report’s record reveals the future', () => {
    for (const v of ['v1', 'v3'] as const) {
      const s = playFrom(toAct5(act4Finished(), { vfuture: v }), { plan: () => [] }, { through: 5 }).state
      const e = s.act5End!
      const h = signalsHiddenV(v)
      expect(e.vFutureId).toBe(v)
      expect(e.futureName).toBe(h.future_name)
      expect(e.triggerQuarter).toBe(h.trigger.quarter)
      expect(e.decoy!.name).toBe(h.decoy.name)
      expect(e.reading!.perQuarter.length).toBe(s.quarter - first5 + 1)
      expect(s.act5Exposure!.length).toBe(s.quarter - first5 + 1)
      expect(e.reading!.score).toBe(
        computeReadingV(s.act5Moves ?? [], v, s.act5Exposure!, s.quarter - first5).score,
      )
      // the record is rebuilt identically from the state
      expect(buildAct5End(s, s.phase === 'gameover')).toEqual(e)
    }
  })

  it('before the end of the act the state holds no reveal: no act5End during play', () => {
    const s = toAct5(act4Finished(), { vfuture: 'v4' })
    expect(s.act5End).toBeUndefined()
    expect(s.act5Moves).toBeUndefined()
  })
})
