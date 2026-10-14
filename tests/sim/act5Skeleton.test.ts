// M49 (doc 43 §19 items 1 and 2; v1.2): the act-aware refactor for Act V and its walking skeleton. The timeline runs to
// 2040Q4; the Act V market files load (with Gen 2037's columns merged) and glide from each Act IV market's 2035Q4; the
// Act IV → V boundary carries the company over (the Moon becomes one holding); Act V plays its 20 quarters to a chapter
// report; saves are format 6; Gen 2037 is on sale in Act V from 2037Q1 and nowhere else. Acts I–IV are untouched (the
// goldens).
import { describe, expect, it, vi } from 'vitest'
// (An Act IV company plays all of Act III and Act IV first: no clock decides pass or fail.)
vi.setConfig({ testTimeout: 0 })
import { BALANCE, CONTENT, V_FUTURE_IDS, act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { restoreSave, SAVE_VERSION } from '../../src/sim/save.ts'
import { drawVFuture, toAct5, type GameState } from '../../src/sim/state.ts'
import { lunarHoldingUsd } from '../../src/sim/systems/act5Entry.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { availableGpus, gpuPriceUsd, newestGpu } from '../../src/sim/systems/projects.ts'
import { activeRivals } from '../../src/sim/systems/rivals.ts'
import { buildAct5Entry } from '../../src/sim/systems/act5Entry.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'
import { guardTestBuildSave } from '../../src/platform/preview.ts'
import { act4Company } from './act4Helpers.ts'

let end4: GameState | null = null
/** An Act IV company at its 2035Q4 chapter report (an empty plan through Act IV; cached; returns a copy). */
function act4Finished(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return structuredClone(end4)
}

describe('Act V content (M49): the market files and the common 2036 baseline', () => {
  it('V-B14: every market value is identical in the four futures through 2036Q4 (Gen 2037 merged in)', () => {
    const rows = V_FUTURE_IDS.map((v) => CONTENT.act5Futures[v].quarterly)
    for (let n = 0; n < 4; n++) {
      const strip = (r: Record<string, unknown>) => ({ ...r, future: null })
      for (const r of rows.slice(1)) expect(strip(r[n]), `${r[n].quarter}`).toEqual(strip(rows[0][n]))
      const weeks = V_FUTURE_IDS.map((v) => CONTENT.act5Futures[v].weeks[n])
      for (const w of weeks.slice(1)) expect(w).toEqual(weeks[0])
    }
    // and they part after the triggers
    expect(rows[0][19].scarcity_index).not.toBe(rows[2][19].scarcity_index)
  })

  it('carries Gen 2037: blank before 2037Q1, flat after launch (the engine applies scarcity), in every future', () => {
    for (const v of V_FUTURE_IDS) {
      const q = CONTENT.act5Futures[v].quarterly
      expect(q[3].gen2037_neocloud_usd_hr).toBeNull()
      expect(q[4].gen2037_neocloud_usd_hr).toBeGreaterThan(0)
      expect(q[19].gen2037_neocloud_usd_hr).toBe(q[4].gen2037_neocloud_usd_hr)
    }
    expect(CONTENT.gen2037).toEqual({ from: '2037Q1', gpusPerMw: 1150, rackKw: 600 })
  })

  it('the timeline gains 2036Q1–2040Q4 (indices 76–95) and 64 glided markets', () => {
    expect(actFirstQuarter(5)).toBe(76)
    expect(CONTENT.quarters[95]).toBe('2040Q4')
    expect(Object.keys(CONTENT.act5Markets)).toHaveLength(64)
  })
})

describe('the Act IV → V boundary (M49, doc 43 §3)', () => {
  it('enters 2036Q1 on the drawn future, carries the company, makes the Moon one holding, drops Act IV-only state', () => {
    const s4 = act4Finished()
    expect(s4.phase).toBe('chapter')
    const s5 = toAct5(s4)
    expect(s5.act).toBe(5)
    expect(s5.quarter).toBe(actFirstQuarter(5))
    expect(s5.phase).toBe('plan')
    expect(s5.vFutureId).toBe(drawVFuture(s4.seed))
    expect(s5.cash).toBe(s4.cash)
    expect(s5.sites).toEqual(s4.sites)
    expect(s5.act4End).toEqual(s4.act4End)
    expect(s5.act4Moves).toBeUndefined()
    expect(s5.act4Wildcards).toBeUndefined()
    expect(s5.act4Moon).toBeUndefined()
    // act5Entry includes the powered term (doc 43 §0.2): valuation = 2035Q4's + free MW × $300K
    const e = s5.act5Entry!
    expect(e.valuationUsd).toBeCloseTo(s4.reports.at(-1)!.valuationUsd + e.freeMw * 300_000, 2)
  })

  it('the seam glide starts from the Act IV market at 2035Q4 and reaches the common baseline by 2036Q4', () => {
    const s5 = toAct5(act4Finished(), { vfuture: 'v3' })
    const key = scenarioOf(s5)!
    expect(key).toBe('s0.f1.v3')
    const first = actFirstQuarter(5)
    const iv = CONTENT.act4Markets['s0.f1'].quarterly.at(-1)!
    expect(act5Row(first, key)!.power_usd_kwh_pjm).toBe(iv.power_usd_kwh_pjm)
    expect(act5Row(first + 3, key)!.power_usd_kwh_pjm).toBe(CONTENT.act5Futures.v3.quarterly[3].power_usd_kwh_pjm)
    // the subsidy doesn't glide (doc 43 §0.9 item 10)
    expect(BALANCE.act5.seamGlideSkip).toContain('btc_block_subsidy')
    expect(act5Row(first, key)!.btc_block_subsidy).toBe(CONTENT.act5Futures.v3.quarterly[0].btc_block_subsidy)
  })

  it('plays 2036Q1–2040Q4 to the chapter report on every future, with an end record; the holding is valued by its index', () => {
    for (const v of V_FUTURE_IDS) {
      const run = playFrom(toAct5(act4Finished(), { vfuture: v }), { plan: () => [] }, { through: 5 })
      const s = run.state
      expect(s.phase === 'chapter' || s.phase === 'gameover').toBe(true)
      if (s.phase === 'chapter') expect(CONTENT.quarters[s.quarter]).toBe('2040Q4')
      expect(s.act5End).toBeDefined()
      if (s.lunarHolding)
        expect(lunarHoldingUsd(s)).toBeCloseTo(
          s.lunarHolding.value2035Usd * act5Row(s.quarter, scenarioOf(s))!.lunar_value_index,
          2,
        )
    }
  })
})

describe('Gen 2037 (M49, doc 49 via doc 43 §0.12)', () => {
  it('is on sale in Act V from 2037Q1 as the newest generation, and never in Act IV', () => {
    const s5 = toAct5(act4Finished(), { vfuture: 'v1' })
    const key = scenarioOf(s5)
    const first = actFirstQuarter(5)
    expect(availableGpus(first + 3, key).map((g) => g.id)).not.toContain('gen2037')
    expect(availableGpus(first + 4, key).map((g) => g.id)).toContain('gen2037')
    expect(newestGpu(first + 4, key)).toBe('gen2037')
    expect(gpuPriceUsd('gen2037', first + 4, key)).toBe(CONTENT.act5Futures.v1.quarterly[4].gen2037_unit_purchase_usd)
    // an Act IV game (any quarter, its own key) never sees it
    for (let q = actFirstQuarter(4); q <= first - 1; q++)
      expect(availableGpus(q, 's0.f1').map((g) => g.id)).not.toContain('gen2037')
  })
})

describe('the Act IV future carries into Act V (M49, doc 43 §0.9 item 11)', () => {
  it("Orrery is in Act V's league only after F1 or F3 (the futures it survives)", () => {
    const has = (f: string) =>
      activeRivals(actFirstQuarter(5), `s0.${f}.v1` as `s0.f1.v1`).some((r) => r.id === 'orrery_compute')
    expect([has('f1'), has('f2'), has('f3'), has('f4')]).toEqual([true, false, true, false])
  })
})

describe('Act V presets (M49, doc 43 §3.4): real companies, values set by the sim', () => {
  it('each preset recipe replays to its stored 2035Q4 figures and carries its Act IV future into Act V', () => {
    expect(PRESETS_V.length).toBeGreaterThan(0)
    for (const p of PRESETS_V) {
      // (M50, doc 43 §0.13: a recipe may join later or buy a queue position)
      const end = playAct5Recipe({
        act4_preset: p.act4_preset,
        act4_future: p.act4_future,
        act4_seed: p.act4_seed,
        joins: p.joins as 'btm',
        ...(p.join_from ? { join_from: p.join_from } : {}),
        ...(p.queue ? { queue: true } : {}),
      })
      expect(end.phase).toBe('chapter')
      expect(end.futureId).toBe(p.act4_future)
      const e = buildAct5Entry(end, 'v1')
      expect(Math.round(e.valuationUsd / 1e5) / 10).toBe(p.valuation_usd_m)
      const s5 = toAct5(end, { preset: p.id })
      expect([s5.act, s5.act5Preset, s5.futureId]).toEqual([5, p.id, p.act4_future])
    }
  })
})

describe('Act V behind the dev flag (doc 43 §0.13)', () => {
  it('production refuses an Act V save (a test build made it); a test build loads it', () => {
    const s5 = toAct5(act4Finished(), { vfuture: 'v1' })
    expect(guardTestBuildSave({ ok: true, state: s5 }, false).ok).toBe(false)
    expect(guardTestBuildSave({ ok: true, state: s5 }, true).ok).toBe(true)
  })
})

describe('save format 6 (M49)', () => {
  it('a version-5 save (any act up to IV) migrates to 6 with nothing else changed; an Act V save round-trips', () => {
    expect(SAVE_VERSION).toBe(9)
    const json = (x: unknown) => JSON.parse(JSON.stringify(x))
    const s4 = act4Finished()
    // (the loader also fills fields older formats lacked, as it always has: compared on what the migration touches)
    const r4 = restoreSave(json({ ...s4, version: 5 }))
    expect(r4.ok).toBe(true)
    if (!r4.ok) return
    expect([r4.state.version, r4.state.act, r4.state.quarter, r4.state.cash]).toEqual([9, 4, s4.quarter, s4.cash])
    const s5 = toAct5(s4, { vfuture: 'v2' })
    const r5 = restoreSave(json(s5))
    expect(r5.ok).toBe(true)
    if (!r5.ok) return
    expect([r5.state.act, r5.state.quarter, r5.state.vFutureId]).toEqual([5, actFirstQuarter(5), 'v2'])
    expect(r5.state.act5Entry).toEqual(json(s5.act5Entry))
    expect(r5.state.lunarHolding).toEqual(s5.lunarHolding && json(s5.lunarHolding))
  })
})
