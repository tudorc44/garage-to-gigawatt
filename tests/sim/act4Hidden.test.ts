// M28 (doc 33 §6.8, IV-D33; act4-scope.md §3): Act IV's hidden data never reaches play. The hidden view of the Signals
// (signalsHiddenIv.ts) is read only by act4End.ts (and tests/, tools/); CONTENT.signalsIv holds runtime fields only;
// no file in src/ names an authoring field outside the hidden modules.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTENT, FUTURE_IDS, SIGNAL_IDS_IV } from '../../src/content/index.ts'
import { signalsHiddenIv } from '../../src/content/signalsHiddenIv.ts'
import { TRIGGER } from '../../tools/act4/futures.ts'

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

describe('Act IV’s hidden files (M28.3, doc 33 §6.8): each read only by its own system (and act4End, tests, tools)', () => {
  const importers = (pattern: RegExp) => src.filter((f) => pattern.test(code(f))).map(rel)

  it('lunar_truth.json only by lunarGeology.ts; orbit_truth_iv.json only by fleetReliability.ts; reading_score_iv.json by no play code', () => {
    expect(importers(/lunar_truth\.json/)).toEqual(['sim/systems/lunarGeology.ts'])
    expect(importers(/orbit_truth_iv\.json/)).toEqual(['sim/systems/fleetReliability.ts'])
    // (M32 wires the Act IV reading score; until then nothing in src/ reads its file)
    expect(importers(/reading_score_iv\.json/).filter((f) => !/readingScore(Iv)?\.ts$/.test(f))).toEqual([])
  })

  it('M32.1: the Act IV reading score (readingScoreIv.ts) is read only by the reveal (act4End.ts)', () => {
    expect(importers(/readingScoreIv/)).toEqual(['sim/systems/act4End.ts'])
  })

  it('the two systems are sim-internal: no UI file and no selector imports them', () => {
    for (const f of src) {
      if (!/[\\/]ui[\\/]|selectors\.ts$|projectViews\.ts$|capitalViews\.ts$|orbitViews\.ts$|moonViews\.ts$/.test(f)) continue
      expect(code(f), f).not.toMatch(/lunarGeology|fleetReliability/)
    }
  })

  it('M29.5: the orbit views never read a block’s true end of life (the screens show the design life and telemetry)', () => {
    for (const f of src.filter((x) => /orbitViews\.ts$|[\\/]ui[\\/]/.test(x)))
      expect(code(f), f).not.toMatch(/\bretireQuarter\b|\btrueReliability\b/)
  })

  it('M30.5: the Moon views read no grade, no grade factor and no truth (only your reports and what a pilot processed)', () => {
    for (const f of src.filter((x) => /moonViews\.ts$|[\\/]ui[\\/]/.test(x)))
      expect(code(f), f).not.toMatch(/\blunarGrade\b|\bpilotGradeFactor\b|\bprospectReport\b|\btrueResourceT\b/)
  })

  it('no UI file reads the hidden draws (the future, the lunar grade)', () => {
    for (const f of src.filter((x) => /[\\/]ui[\\/]/.test(x)))
      expect(code(f), f).not.toMatch(/\blunarGrade\b|\bfutureId\b/)
  })

  it('the lunar grade is drawn at the boundary on its own substream: deterministic, weights 20 / 50 / 30', async () => {
    const { drawLunarGrade } = await import('../../src/sim/systems/lunarGeology.ts')
    const counts: Record<string, number> = { rich: 0, patchy: 0, dry: 0 }
    const N = 4000
    for (let seed = 1; seed <= N; seed++) counts[drawLunarGrade(seed)]++
    expect(Math.abs(counts.rich / N - 0.2)).toBeLessThan(0.03)
    expect(Math.abs(counts.patchy / N - 0.5)).toBeLessThan(0.03)
    expect(Math.abs(counts.dry / N - 0.3)).toBeLessThan(0.03)
    // independent of the future draw: the grade doesn't follow the future
    const { drawFuture } = await import('../../src/sim/state.ts')
    const pairs = new Set<string>()
    for (let seed = 1; seed <= 400; seed++) pairs.add(`${drawFuture(seed)}:${drawLunarGrade(seed)}`)
    expect(pairs.size).toBe(12)
  })
})

describe('Act IV’s hidden Signals fields (M28.1)', () => {
  it('signalsHiddenIv is imported by nothing in src/ but act4End.ts', () => {
    const importers = src
      .filter((f) => !/signalsHiddenIv\.ts$/.test(f) && /signalsHiddenIv/.test(code(f)))
      .map(rel)
    expect(importers.filter((f) => f !== 'sim/systems/act4End.ts')).toEqual([])
  })

  it('CONTENT.signalsIv holds runtime fields only (id, label, higher_means, series of displayed / arrow / sharp)', () => {
    for (const f of FUTURE_IDS) {
      expect(CONTENT.signalsIv[f].map((i) => i.id)).toEqual([...SIGNAL_IDS_IV])
      for (const ind of CONTENT.signalsIv[f]) {
        expect(Object.keys(ind).sort()).toEqual(['higher_means', 'id', 'label', 'series'])
        for (const p of ind.series) expect(Object.keys(p).sort()).toEqual(['arrow', 'displayed', 'quarter', 'sharp'])
      }
    }
  })

  it('the files agree with doc 33: four futures, one decoy each, triggers in 2032Q2–2033Q3 on the market’s quarters', () => {
    for (const f of FUTURE_IDS) {
      const h = signalsHiddenIv(f)
      expect(h.future).toBe(f)
      expect(h.trigger.quarter >= '2032Q2' && h.trigger.quarter <= '2033Q3', f).toBe(true)
      expect(h.trigger.quarter).toBe(CONTENT.quarters[56 + TRIGGER[f]])
      expect(h.decoy.quarters.length).toBeGreaterThanOrEqual(2)
      // the decoy indicator really spikes in its window (its latent peaks above its pre-window level)
      const ind = h.indicators.find((i) => i.id === h.decoy.indicator)!
      const firstQ = CONTENT.quarters.indexOf(h.decoy.quarters[0]) - 56
      const peakQ = CONTENT.quarters.indexOf(h.decoy.peak_quarter) - 56
      expect(ind.authoring_latent[peakQ]).toBeGreaterThan(ind.authoring_latent[firstQ - 1] + 10)
    }
  })

  it('day one reads the same in every future: every indicator shows 50 in 2031Q1–Q2, and the Signals never move before 2031Q3', () => {
    for (const f of FUTURE_IDS)
      for (const ind of CONTENT.signalsIv[f]) {
        expect(ind.series[0].displayed).toBe(50)
        expect(ind.series[1].displayed).toBe(50)
      }
  })
})
