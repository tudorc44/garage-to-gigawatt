// M29.1, B10 (doc 33 §18; docs/act4-research/results.md §4b): the orbit-vs-ground cost ratios the game's data implies match
// the cost model. The model's formula (capital recovery over the true useful life at the year's cost of capital, plus
// ops), fed with the market files' launch and build prices, the best satellite generation available, the GPUs and the
// futures' true lives (orbit_truth_iv, read here as a test may), against the model's ground reference ($12.2M/MW-yr).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT, FUTURE_IDS, type FutureId } from '../../src/content/index.ts'
import { ORBIT } from '../../src/content/orbitContent.ts'

const truth = JSON.parse(
  readFileSync(new URL('../../src/content/orbit_truth_iv.json', import.meta.url), 'utf8'),
) as { futures: Record<FutureId, { useful_life_years: number }> }

const crf = (r: number, n: number) => (r * (1 + r) ** n) / ((1 + r) ** n - 1)
/** The model's cost of capital by year (results.md: 13% 2031, 12% 2033, 11% 2035). */
const WACC: Record<string, number> = { '2031': 0.13, '2033': 0.12, '2035': 0.11 }
/** The model's per-deployment expected loss by future (results.md §4b: F1 1.5%, F2 6%, else 3%). */
const LOSS: Record<FutureId, number> = { f1: 0.015, f2: 0.06, f3: 0.03, f4: 0.03 }
const GROUND = 12.2e6

/** Orbit $/MW-yr in a future's quarter n (act quarter), SSO, with the best generation available then. */
function orbitCost(f: FutureId, n: number, opts: { year: string; loss?: number; life?: number }) {
  const r = CONTENT.act4Futures[f].quarterly[n]
  const mass = r.gen35_t_mw ?? r.gen33_t_mw ?? ORBIT.satellites.generations[0].t_mw!
  const life = opts.life ?? truth.futures[f].useful_life_years
  const loss = opts.loss ?? LOSS[f]
  const kg = mass * 1000
  const capex = (kg * r.sat_build_usd_kg + kg * r.launch_usd_kg_leo + ORBIT.satellites.gpus.usd_per_mw * (1 + ORBIT.satellites.gpus.spares_share)) / (1 - loss)
  return capex * crf(WACC[opts.year], life) + ORBIT.satellites.ops_usd_mw_yr
}

describe('B10: the data’s orbit-vs-ground cost ratios match the cost model', () => {
  it('2031, every future, on the planning assumption (5-year life, 3% loss): 1.5–1.65x', () => {
    for (const f of FUTURE_IDS) {
      const ratio = orbitCost(f, 0, { year: '2031', life: 5, loss: 0.03 }) / GROUND
      expect(ratio, f).toBeGreaterThanOrEqual(1.5)
      expect(ratio, f).toBeLessThanOrEqual(1.65)
    }
  })

  it('2035: F1 0.85–1.0x; F2 1.6–1.9x; F3 and F4 1.1–1.25x (SSO)', () => {
    const at = (f: FutureId) => orbitCost(f, 19, { year: '2035' }) / GROUND
    expect(at('f1')).toBeGreaterThanOrEqual(0.85)
    expect(at('f1')).toBeLessThanOrEqual(1.0)
    expect(at('f2')).toBeGreaterThanOrEqual(1.6)
    expect(at('f2')).toBeLessThanOrEqual(1.9)
    for (const f of ['f3', 'f4'] as const) {
      expect(at(f), f).toBeGreaterThanOrEqual(1.1)
      expect(at(f), f).toBeLessThanOrEqual(1.25)
    }
  })

  it('2033 (the futures that aren’t The Wall, base inputs: 5-year life, 3% loss): 1.2–1.5x', () => {
    for (const f of ['f1', 'f3', 'f4'] as const) {
      const ratio = orbitCost(f, 11, { year: '2033', life: 5, loss: 0.03 }) / GROUND
      expect(ratio, f).toBeGreaterThanOrEqual(1.2)
      expect(ratio, f).toBeLessThanOrEqual(1.5)
    }
  })
})
