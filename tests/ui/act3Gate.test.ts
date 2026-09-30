// M13.1: the Act III preview gate. Act III is a test-build feature: on in `npm run dev` and the staging
// build, absent from the production build (GitHub Pages). This file builds the game twice (production and
// staging modes, into temp folders) and checks the preview's marker is only in the staging build; it also
// covers the save guard, the forced scenario and the quick-start entry.
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

  it('the production build (GitHub Pages) has no Act III preview: no marker, no preview chunk, no bots', () => {
    expect(production.text.length).toBeGreaterThan(100_000)
    expect(production.text).not.toContain(PREVIEW_MARKER)
    expect(readdirSync(join(production.dir, 'assets')).join(' ')).not.toMatch(
      /Act3Preview|bots-/,
    )
  })

  it('the staging build has it (the check can see the marker)', () => {
    expect(staging.text).toContain(PREVIEW_MARKER)
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

  it('an Act III save is rejected outside a test build, accepted in one', () => {
    const r = { ok: true as const, state: act3() }
    expect(guardTestBuildSave(r, false)).toEqual({
      ok: false,
      error: { key: 'error.save_test_build' },
    })
    expect(guardTestBuildSave(r, true)).toBe(r)
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
      expect(averagePrice(qi, 'BTC', s.scenarioId)).toBeGreaterThan(0)
      quarters++
      r = applyAction(s, { type: 'NEXT_QUARTER' })
      if (!r.ok) throw new Error(r.error.key)
      s = r.state
    }
    expect(s.phase === 'chapter' ? quarters : 16).toBe(16)
  }, 60_000)
})
