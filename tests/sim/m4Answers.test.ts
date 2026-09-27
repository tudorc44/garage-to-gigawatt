// The owner's answers to the M3 questions that change existing rules (M4.0a): the H200 rent, the
// reservation on switched-off machines' MW (reverted by the M4 answers, M5.0b), and live AI halls
// at half of mining's Heat load.
import { describe, expect, it } from 'vitest'
import { BALANCE, CONTENT, act2Quarter } from '../../src/content/index.ts'
import type { GameState, MachineLot } from '../../src/sim/state.ts'
import { loadHeat } from '../../src/sim/systems/heat.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { act2Company, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

describe('H200 rent = H100 × 1.20 (market file fix)', () => {
  it('holds for both rental columns in every quarter with an H200 price', () => {
    for (const m of CONTENT.act2Market) {
      const h200 = m.gpuRentalUsdHr.h200
      if (h200.neocloud === null) continue
      expect(h200.neocloud).toBeCloseTo(
        m.gpuRentalUsdHr.h100.neocloud! * 1.2,
        6,
      )
      expect(h200.hyperscaler).toBeCloseTo(
        m.gpuRentalUsdHr.h100.hyperscaler! * 1.2,
        6,
      )
    }
  })
})

/** The own site with one batch of `model` on it, earning since the start. */
function withLot(model: string, count: number, label = '2023Q3'): GameState {
  const s = act2Company(label)
  const lot: MachineLot = {
    id: 'lot-x',
    model,
    siteId: 'site-2',
    condition: 'new',
    count,
    failed: 0,
    earnsFromQuarter: 0,
  }
  s.machines.push(lot)
  return s
}

describe('switched-off machines pay no power reservation (the M4.0a rule, reverted in M5.0b)', () => {
  const full = (s: GameState) =>
    20_000 *
    BALANCE.powerReservation.hoursPerQuarter *
    powerPriceUsdKwh(s.sites[1], s.quarter) *
    BALANCE.powerReservation.share
  const kw = (model: string) =>
    2000 * CONTENT.machines.find((m) => m.id === model)!.power_kw

  it('S9s switched off all quarter: only the MW they leave empty are reserved', () => {
    const s = withLot('s9', 2000)
    const r = playQuarter(s).reports.at(-1)!
    expect(r.reservationUsd).toBeCloseTo(full(s) * (1 - kw('s9') / 20_000), 0)
  })

  it('machines that ran pay none on their kW either', () => {
    const s = withLot('s19pro', 2000)
    const r = playQuarter(s).reports.at(-1)!
    expect(r.reservationUsd).toBeCloseTo(
      full(s) * (1 - kw('s19pro') / 20_000),
      0,
    )
  })

  it('not in Act I', () => {
    expect(act2Quarter(q('2022Q3'))).toBeUndefined()
  })
})

describe('AI halls add half of mining’s Heat load (owner, M3 answers)', () => {
  it('a live 10 MW AI hall loads the site like 5 MW of hosted miners', () => {
    const ai = act2Company('2024Q2')
    ai.projects.push({
      id: 'project-1',
      n: 1,
      siteId: 'site-2',
      kw: 10_000,
      kind: 'shell',
      gpu: null,
      openedQuarter: 0,
      stage: 'live',
      offers: [],
      tenant: null,
      spot: false,
      capital: 'cash',
      capexUsd: 0,
      gpuCapexUsd: 0,
      gpuCount: 0,
      startQuarter: 0,
      readyQuarter: 0,
      soldQuarter: null,
    })
    const hosted = act2Company('2024Q2')
    hosted.hosting.push({
      id: 'hosting-1',
      siteId: 'site-2',
      kw: 5_000,
      readyQuarter: 0,
      rateUsdKwh: 0.06,
      termEndQuarter: 99,
    })
    expect(loadHeat(ai, ai.sites[1], [])).toBeCloseTo(
      loadHeat(hosted, hosted.sites[1], []),
      9,
    )
    expect(loadHeat(ai, ai.sites[1], [])).toBeGreaterThan(0)
  })
})
