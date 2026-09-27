import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  ContentError,
  actLastQuarter,
  actOfQuarter,
  parseContent,
  type RawContent,
} from '../src/content/index.ts'
import machines from '../src/content/machines.json' with { type: 'json' }
import sites from '../src/content/sites.json' with { type: 'json' }
import interrupts from '../src/content/interrupts.json' with { type: 'json' }
import market from '../src/content/market_weekly.json' with { type: 'json' }
import marketAct2 from '../src/content/market_weekly_act2.json' with { type: 'json' }
import capital from '../src/content/capital.json' with { type: 'json' }
import rivals from '../src/content/rivals.json' with { type: 'json' }
import heat from '../src/content/heat.json' with { type: 'json' }
import shocks from '../src/content/shocks.json' with { type: 'json' }
import hires from '../src/content/hires.json' with { type: 'json' }
import merge from '../src/content/merge.json' with { type: 'json' }
import events from '../src/content/events.json' with { type: 'json' }
import { MARKET_FILES, csvToRows } from '../tools/market-csv-to-json.ts'
import { marketWeek } from '../src/sim/systems/market.ts'

const raw = (): RawContent =>
  structuredClone({
    machines,
    sites,
    interrupts,
    market,
    marketAct2,
    capital,
    rivals,
    heat,
    shocks,
    hires,
    merge,
    events,
  })

describe('content loads', () => {
  it('covers Act I (23 quarters, 2017Q1 → 2022Q3) then Act II (17 quarters, 2022Q4 → 2026Q4), 13 weeks each', () => {
    expect(CONTENT.quarters).toHaveLength(40)
    expect(CONTENT.acts).toEqual([
      { act: 1, firstQuarter: 0, lastQuarter: 22 },
      { act: 2, firstQuarter: 23, lastQuarter: 39 },
    ])
    expect(CONTENT.quarters[0]).toBe('2017Q1')
    expect(CONTENT.quarters[22]).toBe('2022Q3')
    expect(CONTENT.quarters[23]).toBe('2022Q4')
    expect(CONTENT.quarters.at(-1)).toBe('2026Q4')
    for (const weeks of CONTENT.market) expect(weeks).toHaveLength(13)
    expect(actOfQuarter(22)).toBe(1)
    expect(actOfQuarter(23)).toBe(2)
    expect(actLastQuarter(1)).toBe(22)
  })

  it('trims 14-week quarters: Act I drops its last week (as before), Act II keeps it (the real quarter close)', () => {
    const q = (label: string) => CONTENT.market[CONTENT.quarters.indexOf(label)]
    // Act I: 2018Q4 has 14 Mondays; the 14th (2018-12-31) is skipped, as it always was.
    expect(q('2018Q4').at(-1)!.week).toBe('2018-12-24')
    // Act II: 2024Q3 has 14; the 13th (2024-09-23) goes, the last (2024-09-30) stays.
    const q3 = q('2024Q3')
    expect(q3.at(-2)!.week).toBe('2024-09-16')
    expect(q3.at(-1)!.week).toBe('2024-09-30')
    expect(q3.map((w) => w.week)).not.toContain('2024-09-23')
  })

  it('handles Act II market columns explicitly: no ETH mining, GPU prices null (not 0) before 2023Q3', () => {
    const first = CONTENT.market[23][0]
    expect(first.week).toBe('2022-10-03')
    expect(first.eth_usd).toBeGreaterThan(0) // ETH still has a price (it values the treasury)
    expect(first.eth_rev_usd_mh_day).toBe(0)
    expect(first.eth_hashrate_THs).toBeNull()
    expect(first.gpu_h100_neocloud_usd_hr).toBeNull()
    expect(first.estimate).toBe(true)
    for (const weeks of CONTENT.market.slice(23))
      for (const w of weeks) expect(w.eth_rev_usd_mh_day).toBe(0)
    const q3_2023 = CONTENT.market[CONTENT.quarters.indexOf('2023Q3')][0]
    expect(q3_2023.gpu_h100_neocloud_usd_hr).toBeGreaterThan(0)
    // Act I weeks have no Act II columns.
    expect(CONTENT.market[0][0].asic_price_usd_th_new).toBeNull()
    expect(CONTENT.market[0][0].estimate).toBeNull()
  })

  it('joins the acts without a price jump (2022-09-26 → 2022-10-03)', () => {
    const last = CONTENT.market[22][12]
    const next = CONTENT.market[23][0]
    expect(next.btc_usd / last.btc_usd - 1).toBeLessThan(0.02)
    expect(Math.abs(next.eth_usd / last.eth_usd - 1)).toBeLessThan(0.03)
  })

  it('marketWeek refuses a week outside the data instead of returning undefined', () => {
    expect(marketWeek(39, 12).week).toBe('2026-12-28')
    expect(() => marketWeek(40, 0)).toThrow(RangeError)
    expect(() => marketWeek(0, 13)).toThrow(RangeError)
    expect(() => marketWeek(-1, 0)).toThrow(RangeError)
  })

  it('puts the Merge in week 11 of 2022Q3: a part-week of ETH revenue, then 0', () => {
    const q3 = CONTENT.market[actLastQuarter(1)]
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

  it('market_weekly.json and market_weekly_act2.json are up to date with their CSVs', () => {
    const json = {
      'market_weekly.json': market,
      'market_weekly_act2.json': marketAct2,
    }
    for (const [csvName, jsonName] of MARKET_FILES) {
      const csv = readFileSync(
        new URL(`../src/content/${csvName}`, import.meta.url),
        'utf8',
      )
      expect(csvToRows(csv)).toEqual(json[jsonName])
    }
  })

  it('src/content/market_weekly_act2.csv is the corrected copy in docs/act2-content/', () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), 'utf8')
    expect(read('../src/content/market_weekly_act2.csv')).toBe(
      read('../docs/act2-content/market_weekly.csv'),
    )
  })

  it('reads an empty CSV cell as null, never 0, and True/False as booleans', () => {
    expect(
      csvToRows('week,quarter,a,b,estimate\n2023-01-02,2023Q1,,1.5,True'),
    ).toEqual([
      {
        week: '2023-01-02',
        quarter: '2023Q1',
        a: null,
        b: 1.5,
        estimate: true,
      },
    ])
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

  it('catches a gap between the acts', () => {
    const data = raw()
    ;(data.marketAct2 as unknown[]).splice(0, 13) // drop 2022Q4
    expect(problemsFor(data)).toContain(
      'market: 2022Q3 is followed by 2023Q1, expected 2022Q4',
    )
  })

  it('catches a quarter in both acts', () => {
    const data = raw()
    const q3 = (data.market as { quarter: string }[]).filter(
      (w) => w.quarter === '2022Q3',
    )
    ;(data.marketAct2 as unknown[]).unshift(
      ...q3.map((w) => ({
        ...w,
        asic_price_usd_th_old: 1,
        asic_price_usd_th_mid: 1,
        asic_price_usd_th_new: 1,
        asic_price_usd_th_latest: 1,
        gpu_h100_hyperscaler_usd_hr: null,
        gpu_h100_neocloud_usd_hr: null,
        gpu_h100_spot_usd_hr: null,
        estimate: true,
      })),
    )
    expect(problemsFor(data).join('\n')).toMatch(
      /market_weekly_act2 › week 2022-07-04: quarter 2022Q3 appears twice/,
    )
  })

  it("catches an Act II row that doesn't match Act II's columns", () => {
    const data = raw()
    ;(data.marketAct2 as Record<string, unknown>[])[0].estimate = 'yes'
    expect(problemsFor(data)).toEqual([
      expect.stringMatching(/^market_weekly_act2 › 0\.estimate/),
    ])
  })
})
