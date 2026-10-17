// M82.2 (doc 62 §6): the own site has no funding gate. A company without Series A (or any round) can scout and build it the moment its
// cash covers the cost; the only thing that blocks it is cash. Texas is then scouted from there (it needs the tier before it).
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'
import { getTier } from '../../src/sim/systems/sites.ts'

const q = (l: string) => quarterIndex(l)!
const err = (s: GameState, a: Action) => {
  const r = applyAction(s, a)
  return r.ok ? undefined : r.error.key
}
/** A company with the warehouse (the tier below the own site) and no funding round, in a Plan phase. */
function warehouseCo(label: string, cash: number): GameState {
  const s = newGame(1)
  s.sites.push({ id: 'site-2', tier: 'warehouse', readyQuarter: 0, rentUsdQ: 30_000, powerPriceMult: 1, flaw: null })
  return { ...s, nextId: 3, quarter: q(label), phase: 'plan', cash, bandwidth: 4, raisesDone: [] }
}

describe('the own site without a funding round', () => {
  it('has no round in its tier or in the ladder: only Texas and its loan name Series A', () => {
    expect(getTier('own_site')!.phases).toBeUndefined()
    expect(CONTENT.siteTiers.filter((t) => t.phases?.requires_round).map((t) => t.id)).toEqual(['texas_site'])
    expect(CONTENT.constructionLoan.requiresRound).toBe('series_a')
  })

  it('scouts and builds with cash alone, in any quarter, with no round taken', () => {
    for (const label of ['2019Q1', '2020Q3', '2022Q1']) {
      const s = warehouseCo(label, 50_000_000)
      const scouted = applyAction(s, { type: 'SCOUT_SITES', tier: 'own_site' })
      expect(scouted.ok, label).toBe(true)
      if (!scouted.ok) continue
      const offer = scouted.state.siteOffers.find((o) => o.tier === 'own_site')!
      const built = applyAction(scouted.state, { type: 'BUILD_SITE', offerId: offer.id })
      expect(built.ok, label).toBe(true)
      if (built.ok) expect(built.state.sites.some((x) => x.tier === 'own_site')).toBe(true)
    }
  })

  it('without the cash the only answer is no cash (nothing else blocks it)', () => {
    const scouted = applyAction(warehouseCo('2020Q3', 700_000), { type: 'SCOUT_SITES', tier: 'own_site' })
    if (!scouted.ok) throw new Error(scouted.error.key)
    const offer = scouted.state.siteOffers.find((o) => o.tier === 'own_site')!
    expect(offer.capexUsd).toBeGreaterThan(5_000_000)
    expect(err(scouted.state, { type: 'BUILD_SITE', offerId: offer.id })).toBe('error.no_cash')
    expect(err({ ...scouted.state, cash: offer.capexUsd }, { type: 'BUILD_SITE', offerId: offer.id })).toBeUndefined()
  })

  it('Texas can be scouted only from the tier below it', () => {
    expect(err(warehouseCo('2020Q3', 50_000_000), { type: 'SCOUT_SITES', tier: 'texas_site' })).toBe('error.cannot_scout')
    const own = warehouseCo('2020Q3', 50_000_000)
    own.sites.push({ id: 'site-3', tier: 'own_site', readyQuarter: 0, rentUsdQ: 0, powerPriceMult: 1, flaw: null })
    expect(err(own, { type: 'SCOUT_SITES', tier: 'texas_site' })).toBeUndefined()
  })
})
