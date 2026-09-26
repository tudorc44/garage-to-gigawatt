import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { t } from '../../src/i18n/t.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { getStep, unmetRequirement } from '../../src/sim/systems/capital.ts'
import { newGame, type GameState, type Site } from '../../src/sim/state.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const raiseFF: Action = { type: 'RAISE', round: 'friends_family' }
function ok(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}
function err(s: GameState, a: Action) {
  const r = applyAction(s, a)
  if (r.ok) throw new Error('expected an error')
  return r.error.key
}

describe('friends & family raise', () => {
  it('reads its terms from capital.json', () => {
    expect(getStep('friends_family')).toMatchObject({
      amount_usd: 40_000,
      dilution: 0.1,
      window: ['2017Q1', '2018Q2'],
    })
  })

  it('costs 2 Bandwidth, adds $40K, dilutes the founder by 10%, and is logged', () => {
    const s = ok(newGame(1), raiseFF)
    expect(s.cash).toBe(50_000)
    expect(s.bandwidth).toBe(1)
    expect(s.founderStake).toBeCloseTo(0.9)
    expect(s.raisesDone).toEqual(['friends_family'])
    const entry = s.log.at(-1)!
    expect(t(entry.key, entry.params)).toBe(
      'Raised $40.0K from friends & family for 10% of the company. Your stake: 90%.',
    )
  })

  it('happens once per game', () => {
    const s = { ...ok(newGame(1), raiseFF), bandwidth: 3 }
    expect(err(s, raiseFF)).toBe('error.raise_done')
  })

  it('is only open 2017Q1–2018Q2', () => {
    expect(ok({ ...newGame(1), quarter: q('2018Q2') }, raiseFF).cash).toBe(
      50_000,
    )
    expect(err({ ...newGame(1), quarter: q('2018Q3') }, raiseFF)).toBe(
      'error.raise_window',
    )
  })

  it('needs 2 Bandwidth', () => {
    expect(err({ ...newGame(1), bandwidth: 1 }, raiseFF)).toBe(
      'error.no_bandwidth',
    )
  })

  it('later rounds are not in the game yet', () => {
    expect(err(newGame(1), { type: 'RAISE', round: 'seed' })).toBe(
      'error.round_not_available',
    )
  })

  it('the stake shows up in the quarter report', () => {
    let s = ok(ok(newGame(1), raiseFF), { type: 'END_PLAN' })
    while (s.phase === 'live') s = advance(s)
    expect(s.reports[0].founderStake).toBeCloseTo(0.9)
    expect(newGame(1).founderStake).toBe(1)
  })
})

describe('requires.min_mw = a built, powered site of that size (not machines running)', () => {
  const seed = getStep('seed')! // requires min_mw 0.1
  const site = (
    tier: string,
    readyQuarter: number,
    flaw: string | null = null,
  ): Site => ({
    id: `site-${tier}`,
    tier,
    readyQuarter,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw,
  })

  it('fails with only the garage (5 kW)', () => {
    expect(unmetRequirement(newGame(1), seed)?.key).toBe(
      'error.raise_needs_site',
    )
  })

  it('fails while the 100 kW site is still being built', () => {
    const s = newGame(1)
    s.sites.push(site('small_unit', 1))
    expect(unmetRequirement(s, seed)?.key).toBe('error.raise_needs_site')
  })

  it('passes once the 100 kW site is powered, even with no machines on it', () => {
    const s = { ...newGame(1), quarter: 1 }
    s.sites.push(site('small_unit', 1))
    expect(s.machines).toEqual([])
    expect(unmetRequirement(s, seed)).toBeUndefined()
  })

  it('uses usable capacity: a 1 MW site with an undersized transformer (×0.6) is not 1 MW', () => {
    const seriesA = getStep('series_a')! // min_mw 1
    const s = { ...newGame(1), quarter: 5 }
    s.sites.push(site('warehouse', 1, 'undersized_transformer'))
    expect(unmetRequirement(s, seriesA)?.key).toBe('error.raise_needs_site')
    s.sites[1].flaw = null
    expect(unmetRequirement(s, seriesA)).toBeUndefined()
  })
})
