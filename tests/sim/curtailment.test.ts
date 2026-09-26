import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import {
  curtailOffer,
  curtailmentAlertWeek,
} from '../../src/sim/systems/curtailment.ts'
import { marketWeek } from '../../src/sim/systems/market.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** Live phase of `label` with a powered Texas site holding 1,000 new S19 Pros (3.25 MW). */
function texasGame(seed: number, label = '2021Q3'): GameState {
  const s = { ...newGame(seed), quarter: q(label), phase: 'live' as const }
  s.cash = 1_000_000
  s.sites.push({
    id: 'site-9',
    tier: 'texas_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  s.machines.push({
    id: 'lot-9',
    model: 's19pro',
    siteId: 'site-9',
    condition: 'new',
    count: 1000,
    failed: 0,
    earnsFromQuarter: 0,
  })
  return s
}

/** A seed whose 2021Q3 has a grid emergency. */
function seedWithAlert(): number {
  for (let seed = 1; ; seed++) {
    if (curtailmentAlertWeek(texasGame(seed)) !== null) return seed
  }
}

/** Plays weeks until the curtailment alert (or the quarter ends). */
function toAlert(s: GameState): GameState {
  while (s.phase === 'live' && s.interrupt?.id !== 'curtailment') {
    if (s.interrupt) {
      const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
      s = r.ok ? r.state : s
      continue
    }
    s = advance(s)
  }
  return s
}

describe('grid curtailment', () => {
  it('only happens in Q3 (summer), in about 35% of them', () => {
    expect(curtailmentAlertWeek(texasGame(1, '2021Q2'))).toBeNull()
    expect(curtailmentAlertWeek(texasGame(1, '2021Q4'))).toBeNull()
    let hits = 0
    for (let seed = 1; seed <= 400; seed++) {
      const week = curtailmentAlertWeek(texasGame(seed))
      if (week === null) continue
      hits++
      expect(week).toBeGreaterThanOrEqual(2)
      expect(week).toBeLessThanOrEqual(12)
    }
    expect(hits / 400).toBeGreaterThan(0.28)
    expect(hits / 400).toBeLessThan(0.42)
  })

  it('pays max($15K per MW, 1.25 × the revenue given up) (review A8)', () => {
    const s = texasGame(1)
    const offer = curtailOffer(s, marketWeek(s.quarter, 5))
    expect(offer.mw).toBeCloseTo(3.25)
    expect(offer.forgoneUsd).toBeGreaterThan(0)
    expect(offer.creditUsd).toBeCloseTo(
      Math.max(15_000 * 3.25, 1.25 * offer.forgoneUsd),
    )
    // In 2021 an S19 fleet earns far more than $15K/MW a week, so the revenue rule sets the credit.
    expect(offer.creditUsd).toBeCloseTo(1.25 * offer.forgoneUsd)
  })

  it('pauses the quarter at the chosen week, only with Texas machines mining', () => {
    const seed = seedWithAlert()
    const s = toAlert(texasGame(seed))
    expect(s.interrupt?.id).toBe('curtailment')
    expect(s.interrupt!.week + 1).toBe(curtailmentAlertWeek(s))
    expect(s.interruptsThisQuarter).toBeGreaterThanOrEqual(1)

    const noTexas = texasGame(seed)
    noTexas.machines = []
    expect(toAlert(noTexas).phase).toBe('report')
  })

  it('curtail: next week Texas mines nothing, uses no power, and the credit is paid', () => {
    const s = toAlert(texasGame(seedWithAlert()))
    const offer = s.interrupt!.curtail!
    const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'curtail' })
    if (!r.ok) throw new Error(r.error.key)
    const before = r.state.cash
    const next = advance(r.state)
    const wk = next.quarterStats.weeks.at(-1)!
    expect(wk.revenueUsd).toBe(0)
    expect(wk.powerCostUsd).toBe(0)
    expect(next.cash).toBeCloseTo(before + offer.creditUsd, 1)
    expect(next.quarterStats.gridCreditsUsd).toBeCloseTo(offer.creditUsd)
    const e = next.log.at(-1)!
    expect(t(e.key, e.params)).toMatch(/^Texas site switched off for the grid/)
  })

  it('keep mining: the next week mines as normal, no credit', () => {
    const s = toAlert(texasGame(seedWithAlert()))
    const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'mine' })
    if (!r.ok) throw new Error(r.error.key)
    const next = advance(r.state)
    expect(next.quarterStats.weeks.at(-1)!.revenueUsd).toBeGreaterThan(0)
    expect(next.quarterStats.gridCreditsUsd).toBe(0)
  })

  it('credits count toward EBITDA in the quarter report', () => {
    let s = toAlert(texasGame(seedWithAlert()))
    const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'curtail' })
    if (!r.ok) throw new Error(r.error.key)
    s = r.state
    while (s.phase === 'live') {
      if (s.interrupt) {
        const x = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice: 'hold' })
        if (!x.ok) throw new Error(x.error.key)
        s = x.state
      } else s = advance(s)
    }
    const rep = s.reports.at(-1)!
    expect(rep.gridCreditsUsd).toBeGreaterThan(0)
    expect(rep.ebitdaUsd).toBeCloseTo(
      rep.revenueUsd + rep.gridCreditsUsd - rep.powerCostUsd - rep.rentUsd,
    )
  })

  it('the default answer is to curtail', () => {
    const s = toAlert(texasGame(seedWithAlert()))
    expect(CONTENT.interrupts.byId.curtailment.default).toBe('curtail')
    expect(s.interrupt!.id).toBe('curtailment')
  })
})
