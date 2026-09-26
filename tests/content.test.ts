import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  ContentError,
  parseContent,
  type RawContent,
} from '../src/content/index.ts'
import machines from '../src/content/machines.json' with { type: 'json' }
import sites from '../src/content/sites.json' with { type: 'json' }
import interrupts from '../src/content/interrupts.json' with { type: 'json' }
import market from '../src/content/market_weekly.json' with { type: 'json' }
import capital from '../src/content/capital.json' with { type: 'json' }
import rivals from '../src/content/rivals.json' with { type: 'json' }
import heat from '../src/content/heat.json' with { type: 'json' }
import shocks from '../src/content/shocks.json' with { type: 'json' }
import hires from '../src/content/hires.json' with { type: 'json' }
import merge from '../src/content/merge.json' with { type: 'json' }
import events from '../src/content/events.json' with { type: 'json' }
import { csvToRows } from '../tools/market-csv-to-json.ts'

const raw = (): RawContent =>
  structuredClone({
    machines,
    sites,
    interrupts,
    market,
    capital,
    rivals,
    heat,
    shocks,
    hires,
    merge,
    events,
  })

describe('content loads', () => {
  it('covers Act I: 23 quarters of 13 weeks, 2017Q1 → 2022Q3', () => {
    expect(CONTENT.quarters).toHaveLength(23)
    expect(CONTENT.quarters[0]).toBe('2017Q1')
    expect(CONTENT.quarters.at(-1)).toBe('2022Q3')
    for (const weeks of CONTENT.market) expect(weeks).toHaveLength(13)
  })

  it('puts the Merge in week 11 of 2022Q3: a part-week of ETH revenue, then 0', () => {
    const q3 = CONTENT.market.at(-1)!
    expect(q3[10].week).toBe('2022-09-12') // the Merge was Thu 15 Sep 2022
    expect(q3[10].eth_rev_usd_mh_day).toBeGreaterThan(0)
    expect(q3[10].eth_rev_usd_mh_day).toBeLessThan(q3[9].eth_rev_usd_mh_day)
    expect(q3[11].eth_rev_usd_mh_day).toBe(0)
    expect(q3[12].eth_rev_usd_mh_day).toBe(0)
  })

  it('applies review amendments A1 and A2 (unlock dates)', () => {
    const m = (id: string) => CONTENT.machines.find((x) => x.id === id)!
    expect(m('gpu_gen2').available_from).toBe('2020Q4')
    expect(m('s19pro').available_from).toBe('2020Q2')
    expect(m('s9').retail_new_ends).toBe('2020Q1')
    const texas = CONTENT.siteTiers.find((t) => t.id === 'texas_site')!
    expect(texas.available_from).toBe('2020Q1')
    expect(texas.build_quarters).toBe(3)
  })

  it('matches balance anchor A4: a garage Gen 1 rig makes ~$7–8/day in Q4 2017 and loses money in Q4 2018', () => {
    const rig = CONTENT.machines.find((x) => x.id === 'gpu_gen1')!
    const garage = CONTENT.siteTiers.find((t) => t.id === 'garage')!
    const dailyProfit = (q: string) => {
      const weeks = CONTENT.market[CONTENT.quarters.indexOf(q)]
      const avgRev =
        weeks.reduce((s, w) => s + w.eth_rev_usd_mh_day, 0) / weeks.length
      return (
        rig.hashrate * avgRev -
        rig.power_kw * 24 * garage.power_path![q.slice(0, 4)]
      )
    }
    expect(dailyProfit('2017Q4')).toBeGreaterThan(7)
    expect(dailyProfit('2017Q4')).toBeLessThan(8.5)
    expect(dailyProfit('2018Q4')).toBeLessThan(0)
  })

  it('has the 4 scripted rivals of scope §2.9', () => {
    expect(CONTENT.rivals.map((r) => r.id)).toEqual([
      'riot',
      'marathon',
      'core',
      'bitfarms',
    ])
  })

  it('market_weekly.json is up to date with market_weekly.csv', () => {
    const csv = readFileSync(
      new URL('../src/content/market_weekly.csv', import.meta.url),
      'utf8',
    )
    expect(csvToRows(csv)).toEqual(market)
  })
})

describe('bad content fails loudly', () => {
  function problemsFor(data: RawContent): string[] {
    try {
      parseContent(data)
    } catch (e) {
      if (e instanceof ContentError) return e.problems
      throw e
    }
    throw new Error('expected parseContent to throw')
  }

  it('names the file and field of a wrong type', () => {
    const data = raw()
    ;(data.machines as typeof machines).models[0].power_kw = 'lots' as never
    expect(problemsFor(data)).toEqual([
      expect.stringMatching(/^machines\.json › models\.0\.power_kw/),
    ])
  })

  it('catches a missing machine price', () => {
    const data = raw()
    delete (
      data.machines as { models: { price_used: Record<string, number> }[] }
    ).models[2].price_used['2019Q3']
    expect(problemsFor(data)).toContain(
      'machines.json › s9: no price_used for 2019Q3',
    )
  })

  it('catches a site flaw that does not exist', () => {
    const data = raw()
    ;(data.sites as typeof sites).tiers[1].possible_flaws.push(
      'ghosts' as never,
    )
    expect(problemsFor(data)).toContain(
      'sites.json › small_unit: unknown flaw "ghosts"',
    )
  })

  it('catches a rival value for a quarter outside Act I', () => {
    const data = raw()
    ;(data.rivals as { rivals: { mw: Record<string, number> }[] }).rivals[0].mw[
      '2023Q1'
    ] = 500
    expect(problemsFor(data)).toContain(
      'rivals.json › riot.mw: 2023Q1 is outside Act I',
    )
  })

  it('catches a gap in the market weeks', () => {
    const data = raw()
    ;(data.market as unknown[]).splice(26, 13)
    expect(problemsFor(data).join('\n')).toMatch(/2017Q2 is followed by/)
  })
})
