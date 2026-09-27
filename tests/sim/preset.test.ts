// The standalone preset (M5.3; scope 0.2 §2.10, doc 18 §2.4): "Q4 2022: a mid-size miner".
import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { presetGame } from '../../src/sim/preset.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { poweredKw } from '../../src/sim/systems/sites.ts'
import { BOTS } from '../../tools/bots.ts'
import { ok } from './act2Helpers.ts'

describe('the preset company', () => {
  const s = presetGame(1)

  it('stands at the Merge decision at the end of 2022Q3, with a real quarter report', () => {
    expect(s.phase).toBe('merge')
    expect(s.act).toBe(1)
    expect(s.preset).toBe(true)
    expect(s.quarter).toBe(actLastQuarter(1))
    expect(s.reports.map((r) => r.quarter)).toEqual(['2022Q3'])
    expect(s.reports[0].ebitdaUsd).toBeGreaterThan(0)
  })

  it('40 MW across a 20 MW own site and one 20 MW Texas phase on fixed power, 70% full of S19s', () => {
    const own = s.sites.find((x) => x.tier === 'own_site')!
    const texas = s.sites.find((x) => x.tier === 'texas_site')!
    expect(poweredKw(own, s.quarter)).toBe(20_000)
    expect(poweredKw(texas, s.quarter)).toBe(20_000)
    expect(texas.contract?.type).toBe('fixed')
    for (const site of [own, texas]) {
      const lot = s.machines.find((l) => l.siteId === site.id)!
      expect(lot.model).toBe('s19pro')
      expect(lot.count * 3.25).toBeCloseTo(20_000 * 0.7, -1)
    }
  })

  it('$12M cash, $25M equipment debt, 45% founder stake, no IPO', () => {
    expect(s.cash).toBe(12_000_000)
    expect(s.equipmentLoan!.balanceUsd).toBe(25_000_000)
    expect(s.founderStake).toBe(0.45)
    expect(s.raisesDone).not.toContain('ipo_spac')
    expect(s.reports[0].cash).toBe(12_000_000)
    expect(s.reports[0].debtUsd).toBe(25_000_000)
  })

  it('the Merge choice goes straight to the Act II intro (no Act I chapter report), above the floor', () => {
    const intro = ok(s, { type: 'MERGE_CHOOSE', choice: 'hosting' })
    expect(intro.phase).toBe('intro')
    expect(intro.act).toBe(2)
    expect(intro.act2Entry!.headStart).toBe('hosting')
    expect(intro.act2Entry!.lifeline).toBeNull()
    const plan = ok(intro, { type: 'START_ACT_2' })
    expect(CONTENT.quarters[plan.quarter]).toBe('2022Q4')
    expect(plan.phase).toBe('plan')
  })

  it('is the same company for the same seed, and saves and loads', () => {
    expect(presetGame(1)).toEqual(s)
    const loaded = restoreSave(JSON.parse(JSON.stringify(s)))
    expect(loaded.ok && loaded.state).toEqual(s)
  })

  it('plays Act II to the end of 2026Q4 with a bot', () => {
    const end = playFrom(presetGame(2), BOTS['texas-capital'], {
      through: 2,
    }).state
    expect(['chapter', 'gameover']).toContain(end.phase)
    expect(end.act).toBe(2)
  })
})
