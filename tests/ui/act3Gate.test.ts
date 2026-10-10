// M13.1: the Act III preview gate, redefined in M20.2 (the Act III public release). Act III is in every build;
// the ?scenario= forcing and the quick-start companies stay test-build only (`npm run dev`, staging). This file
// builds the game twice (production and staging modes, into temp folders) and checks: production has the Act
// III chunks but neither marker, staging has both; the main bundle stays under 500 KB. It also covers the save
// guard, the forced scenario and the quick-start entry.
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { encodeSave, decodeSave } from '../../src/platform/saves.ts'
import {
  ACT3_PREVIEW,
  FORCING_MARKER,
  forcedScenario,
  guardTestBuildSave,
} from '../../src/platform/preview.ts'
import {
  averagePrice,
  contractCalendar,
  currentMarket,
  priceChanges,
  recentMarket,
} from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { ACT4_PREVIEW_MARKER } from '../../src/ui/act4QuickStart.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import {
  PREVIEW_MARKER,
  QUICK_STARTS,
  quickStartCompany,
} from '../../src/ui/act3QuickStart.ts'

const root = new URL('../..', import.meta.url).pathname

/** Builds the game in `mode` into a temp folder; returns every emitted file's text. */
async function buildIn(mode: string): Promise<{ dir: string; text: string }> {
  const dir = mkdtempSync(join(tmpdir(), `g2g-${mode}-`))
  await build({
    root,
    mode,
    logLevel: 'silent',
    build: { outDir: dir, emptyOutDir: true },
  })
  const files = (d: string): string[] =>
    readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(d, e.name)) : [join(d, e.name)],
    )
  const text = files(dir)
    .filter((f) => /\.(js|html|css)$/.test(f))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n')
  return { dir, text }
}

describe('the gate in the builds', () => {
  let production: { dir: string; text: string }
  let staging: { dir: string; text: string }
  beforeAll(async () => {
    production = await buildIn('production')
    staging = await buildIn('staging')
  }, 120_000)
  afterAll(() => {
    for (const b of [production, staging])
      if (b) rmSync(b.dir, { recursive: true, force: true })
  })

  // M20.2 (the Act III public release): production carries Act III in its own lazy chunks, but no quick starts
  // and no scenario forcing; staging carries both.
  it('the production build (GitHub Pages) has Act III’s chunks, but no quick starts and no forcing code', () => {
    expect(production.text.length).toBeGreaterThan(100_000)
    const assets = readdirSync(join(production.dir, 'assets')).join(' ')
    expect(assets).toMatch(/Act3Entry/)
    expect(assets).toMatch(/Act3Panels/)
    expect(assets).not.toMatch(/Act3Preview/)
    expect(production.text).not.toContain(PREVIEW_MARKER)
    expect(production.text).not.toContain(FORCING_MARKER)
    // M27.6: Act IV likewise: its entry chunk ships, its quick starts don't.
    expect(assets).toMatch(/Act4Entry/)
    expect(assets).not.toMatch(/Act4Preview/)
    expect(production.text).not.toContain(ACT4_PREVIEW_MARKER)
  })

  it('the main bundle stays under the 500 KB warning in production (Act III stays out of it)', () => {
    const assets = join(production.dir, 'assets')
    const main = readdirSync(assets).filter((f) => /^index-.*\.js$/.test(f))
    expect(main.length).toBe(1)
    const main0 = readFileSync(join(assets, main[0]), 'utf8')
    expect(main0.length).toBeLessThan(500_000)
    expect(main0).not.toContain('data-start-act3')
  })

  it('the staging build has both: the quick starts (the marker) and the forcing code, with the Act III chunks', () => {
    expect(staging.text).toContain(PREVIEW_MARKER)
    expect(staging.text).toContain(FORCING_MARKER)
    expect(staging.text).toContain(ACT4_PREVIEW_MARKER)
    expect(readdirSync(join(staging.dir, 'assets')).join(' ')).toMatch(
      /Act3Panels/,
    )
  })

  it('tests run in a test build (mode "test"): the gate is on', () => {
    expect(ACT3_PREVIEW).toBe(true)
  })
})

describe('the save guard', () => {
  let end: GameState
  const act3 = () => toAct3(end, { scenario: 's1' })
  beforeAll(async () => {
    end = await quickStartCompany('growth')
  }, 60_000)

  it('M20.2: production loads an Act III save (play, presets, Scenario Mode) but not a forced or quick-start one', () => {
    const refused = { ok: false, error: { key: 'error.save_test_build' } }
    const r = { ok: true as const, state: act3() }
    expect(guardTestBuildSave(r, false)).toBe(r)
    const mode = { ok: true as const, state: toAct3(end, { scenario: 's1', scenarioMode: true }) }
    expect(guardTestBuildSave(mode, false)).toBe(mode)
    const forced = { ok: true as const, state: toAct3(end, { scenario: 's1', forced: true }) }
    expect(guardTestBuildSave(forced, false)).toEqual(refused)
    const quick = { ok: true as const, state: toAct3(end, { quickStart: true }) }
    expect(quick.state.act3QuickStart).toBe(true)
    expect(guardTestBuildSave(quick, false)).toEqual(refused)
    // a test build loads them all
    for (const x of [r, mode, forced, quick]) expect(guardTestBuildSave(x, true)).toBe(x)
    // An Act II save loads either way.
    const a2 = { ok: true as const, state: end }
    expect(guardTestBuildSave(a2, false)).toBe(a2)
  })

  it('the import path goes through it (a test build: the Act III save loads)', () => {
    const r = decodeSave(encodeSave(act3()))
    expect(r.ok).toBe(true)
  })
})

describe('the forced scenario (?scenario=)', () => {
  it('is ignored outside a test build; in one, only s0–s3', () => {
    expect(forcedScenario('?scenario=s2', false)).toBeNull()
    expect(forcedScenario('?scenario=s2', true)).toBe('s2')
    expect(forcedScenario('?scenario=s9', true)).toBeNull()
    expect(forcedScenario('', true)).toBeNull()
  })
})

describe('the quick start', () => {
  const ends = new Map<string, GameState>()
  beforeAll(async () => {
    for (const q of QUICK_STARTS) ends.set(q.id, await quickStartCompany(q.id))
  }, 120_000)

  it('each company plays to the end of Act II and enters Act III at 2027Q1 (the intro’s act3Entry)', () => {
    for (const q of QUICK_STARTS) {
      const end = ends.get(q.id)!
      expect(end.phase, q.id).toBe('chapter')
      expect(end.act).toBe(2)
      const s = toAct3(end)
      expect(s.act).toBe(3)
      expect(s.phase).toBe('plan')
      expect(s.quarter).toBe(actFirstQuarter(3))
      expect(s.act3Entry!.valuationUsd).toBeGreaterThan(0)
      expect(s.scenarioForced).toBeUndefined()
      const forced = toAct3(end, { scenario: 's3', forced: true })
      expect(forced.scenarioId).toBe('s3')
      expect(forced.scenarioForced).toBe(true)
    }
  })

  it('"Shell landlord" has a shell lease ending inside Act III; "GPU-heavy" has GPU contracts', () => {
    const shell = contractCalendar(toAct3(ends.get('shell')!)).filter(
      (e) => e.kind === 'shell',
    )
    const last = actFirstQuarter(3) + 15
    expect(
      shell.some((e) => e.endQuarter !== null && e.endQuarter <= last),
    ).toBe(true)
    const gpu = contractCalendar(toAct3(ends.get('gpu')!))
    expect(gpu.some((e) => e.kind === 'gpu')).toBe(true)
  })

  it('a quick-start company plays 2027Q1 → 2030Q4 with what the Plan and Report screens read each quarter', () => {
    let s = toAct3(ends.get('gpu')!, { scenario: 's1' })
    let quarters = 0
    while (s.phase !== 'chapter' && s.phase !== 'gameover') {
      // the Plan screen's market panel and top bar
      expect(recentMarket(s).length).toBeGreaterThan(0)
      expect(currentMarket(s).btc_usd).toBeGreaterThan(0)
      priceChanges(s)
      let r = applyAction(s, { type: 'END_PLAN' })
      if (!r.ok) throw new Error(r.error.key)
      s = r.state
      while (s.phase === 'live') {
        s = s.interrupt
          ? (() => {
              const x = applyAction(s, {
                type: 'RESOLVE_INTERRUPT',
                choice: defaultChoice(s),
              })
              if (!x.ok) throw new Error(x.error.key)
              return x.state
            })()
          : advance(s)
      }
      if (s.phase !== 'report') break
      // the report's cost-per-coin chart
      const qi = CONTENT.quarters.indexOf(s.reports.at(-1)!.quarter)
      expect(averagePrice(qi, 'BTC', s)).toBeGreaterThan(0)
      quarters++
      r = applyAction(s, { type: 'NEXT_QUARTER' })
      if (!r.ok) throw new Error(r.error.key)
      s = r.state
    }
    expect(s.phase === 'chapter' ? quarters : 16).toBe(16)
  }, 60_000)
})
