import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CONTENT,
  ContentError,
  act2Quarter,
  actLastQuarter,
  actOfQuarter,
  parseContent,
  quarterIndex,
  type RawContent,
} from '../src/content/index.ts'
import machines from '../src/content/machines.json' with { type: 'json' }
import sites from '../src/content/sites.json' with { type: 'json' }
import interrupts from '../src/content/interrupts.json' with { type: 'json' }
import market from '../src/content/market_weekly.json' with { type: 'json' }
import marketAct2 from '../src/content/market_weekly_act2.json' with { type: 'json' }
import marketQuarterlyAct2 from '../src/content/market_quarterly_act2.json' with { type: 'json' }
import capital from '../src/content/capital.json' with { type: 'json' }
import capitalAct2 from '../src/content/capital_act2.json' with { type: 'json' }
import conversions from '../src/content/conversions.json' with { type: 'json' }
import tenants from '../src/content/tenants.json' with { type: 'json' }
import gpus from '../src/content/gpus.json' with { type: 'json' }
import gpusAct3 from '../src/content/gpus_act3.json' with { type: 'json' }
import nuclear from '../src/content/nuclear.json' with { type: 'json' }
import politicalCapital from '../src/content/political_capital.json' with { type: 'json' }
import wildcards from '../src/content/wildcards.json' with { type: 'json' }
import interruptsAct2 from '../src/content/interrupts_act2.json' with { type: 'json' }
import lenders from '../src/content/lenders.json' with { type: 'json' }
import regions from '../src/content/regions.json' with { type: 'json' }
import sitesAct2 from '../src/content/sites_act2.json' with { type: 'json' }
import hiresAct2 from '../src/content/hires_act2.json' with { type: 'json' }
import eventsAct2 from '../src/content/events_act2.json' with { type: 'json' }
import rivals from '../src/content/rivals.json' with { type: 'json' }
import rivalsAct2 from '../src/content/rivals_act2.json' with { type: 'json' }
import rivalsAct3 from '../src/content/rivals_act3.json' with { type: 'json' }
import eventsAct3 from '../src/content/events_act3.json' with { type: 'json' }
import marketPrologue from '../src/content/market_weekly_prologue.json' with { type: 'json' }
import machinesPrologue from '../src/content/machines_prologue.json' with { type: 'json' }
import prologue from '../src/content/prologue.json' with { type: 'json' }
import eventsPrologue from '../src/content/events_prologue.json' with { type: 'json' }
import heat from '../src/content/heat.json' with { type: 'json' }
import shocks from '../src/content/shocks.json' with { type: 'json' }
import hires from '../src/content/hires.json' with { type: 'json' }
import merge from '../src/content/merge.json' with { type: 'json' }
import events from '../src/content/events.json' with { type: 'json' }
import marketS0 from '../src/content/market_s0.json' with { type: 'json' }
import marketS1 from '../src/content/market_s1.json' with { type: 'json' }
import marketS2 from '../src/content/market_s2.json' with { type: 'json' }
import marketS3 from '../src/content/market_s3.json' with { type: 'json' }
import marketWeeklyS0 from '../src/content/market_weekly_s0.json' with { type: 'json' }
import marketWeeklyS1 from '../src/content/market_weekly_s1.json' with { type: 'json' }
import marketWeeklyS2 from '../src/content/market_weekly_s2.json' with { type: 'json' }
import marketWeeklyS3 from '../src/content/market_weekly_s3.json' with { type: 'json' }
import signalsS0 from '../src/content/signals_s0.json' with { type: 'json' }
import signalsS1 from '../src/content/signals_s1.json' with { type: 'json' }
import signalsS2 from '../src/content/signals_s2.json' with { type: 'json' }
import signalsS3 from '../src/content/signals_s3.json' with { type: 'json' }
import { MARKET_FILES, csvToRows } from '../tools/market-csv-to-json.ts'
import { marketWeek, previousMarketWeek } from '../src/sim/systems/market.ts'

const raw = (): RawContent =>
  structuredClone({
    machines,
    sites,
    interrupts,
    market,
    marketAct2,
    marketQuarterlyAct2,
    marketPrologue,
    act3Scenarios: {
      s0: { quarterly: marketS0, weekly: marketWeeklyS0 },
      s1: { quarterly: marketS1, weekly: marketWeeklyS1 },
      s2: { quarterly: marketS2, weekly: marketWeeklyS2 },
      s3: { quarterly: marketS3, weekly: marketWeeklyS3 },
    },
    signals: { s0: signalsS0, s1: signalsS1, s2: signalsS2, s3: signalsS3 },
    machinesPrologue,
    prologue,
    eventsPrologue,
    capital,
    capitalAct2,
    conversions,
    tenants,
    gpus,
    gpusAct3,
    nuclear,
    politicalCapital,
    wildcards,
    interruptsAct2,
    lenders,
    regions,
    sitesAct2,
    hiresAct2,
    eventsAct2,
    rivals,
    rivalsAct2,
    rivalsAct3,
    eventsAct3,
    heat,
    shocks,
    hires,
    merge,
    events,
  })

describe('content loads', () => {
  it('covers Act I (23 quarters, 2017Q1 → 2022Q3) then Act II (17 quarters, 2022Q4 → 2026Q4), 13 weeks each', () => {
    // 76, not 40: Act III (M11.3) appends its 16 quarters (2027Q1–2030Q4) after 2026Q4, and Act IV (M27.3) its 20
    // (2031Q1–2035Q4) after those.
    expect(CONTENT.quarters).toHaveLength(76)
    expect(CONTENT.acts).toEqual([
      { act: 1, firstQuarter: 0, lastQuarter: 22 },
      { act: 2, firstQuarter: 23, lastQuarter: 39 },
      // The prologue (Alpha 0.3) sits at negative indices: Act I and II keep theirs.
      { act: 0, firstQuarter: -32, lastQuarter: -1 },
      // Act III (M11.3): 16 quarters appended after Act II. Act I and II keep indices 0–39.
      { act: 3, firstQuarter: 40, lastQuarter: 55 },
      // Act IV (M27.3): 20 quarters appended after Act III; every earlier index stays.
      { act: 4, firstQuarter: 56, lastQuarter: 75 },
    ])
    expect(CONTENT.quarters[56]).toBe('2031Q1')
    expect(CONTENT.quarters[75]).toBe('2035Q4')
    expect(CONTENT.quarters[0]).toBe('2017Q1')
    expect(CONTENT.quarters[22]).toBe('2022Q3')
    expect(CONTENT.quarters[23]).toBe('2022Q4')
    expect(CONTENT.quarters[39]).toBe('2026Q4')
    expect(CONTENT.quarters[40]).toBe('2027Q1')
    expect(CONTENT.quarters[41]).toBe('2027Q2')
    expect(CONTENT.quarters[55]).toBe('2030Q4')
    for (const weeks of CONTENT.market) expect(weeks).toHaveLength(13)
    expect(actOfQuarter(22)).toBe(1)
    expect(actOfQuarter(23)).toBe(2)
    expect(actLastQuarter(1)).toBe(22)
    expect(actLastQuarter(2)).toBe(39)
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
    // Quarters 40–55 are Act III (M11.3), so they no longer throw; quarter 56 (past 2030Q4)
    // and an out-of-range week still do.
    // (only through a scenario: without one an Act III week throws, tested in act3Scenario.test.ts)
    expect(marketWeek(40, 0, 's0').quarter).toBe('2027Q1')
    expect(marketWeek(55, 12, 's3').quarter).toBe('2030Q4')
    expect(() => marketWeek(56, 0)).toThrow(RangeError)
    expect(() => marketWeek(56, 0, 's0')).toThrow(RangeError)
    expect(() => marketWeek(0, 13)).toThrow(RangeError)
    expect(() => marketWeek(-33, 0)).toThrow(RangeError)
  })

  it('the prologue: 2009Q1–2016Q4 at −32 … −1, 13 weeks each, ETH from 2015Q3 with the Etherscan revenue', () => {
    expect(CONTENT.quarters[-32]).toBe('2009Q1')
    expect(CONTENT.quarters[-1]).toBe('2016Q4')
    expect(quarterIndex('2013Q1')).toBe(-16)
    expect(quarterIndex('2017Q1')).toBe(0)
    expect(actOfQuarter(-5)).toBe(0)
    expect(actOfQuarter(0)).toBe(1)
    for (let q = -32; q < 0; q++) expect(CONTENT.market[q]).toHaveLength(13)
    expect(marketWeek(-32, 0).btc_usd).toBe(0)
    expect(marketWeek(-32, 0).eth_usd).toBe(0)
    const launch = CONTENT.market[quarterIndex('2015Q3')!].find(
      (w) => w.week === '2015-07-27',
    )!
    expect(launch.eth_rev_usd_mh_day).toBeCloseTo(0.7719653 * 2.83, 9)
    // Act I's first week still has no week before it.
    expect(previousMarketWeek(0, 0)).toBeUndefined()
    expect(previousMarketWeek(-31, 0)!.quarter).toBe('2009Q1')
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

  it('the market JSON files are up to date with their CSVs', () => {
    const json: Record<string, unknown> = {
      'market_weekly.json': market,
      'market_weekly_act2.json': marketAct2,
      'market_quarterly_act2.json': marketQuarterlyAct2,
      'market_s0.json': marketS0,
      'market_s1.json': marketS1,
      'market_s2.json': marketS2,
      'market_s3.json': marketS3,
      'market_weekly_s0.json': marketWeeklyS0,
      'market_weekly_s1.json': marketWeeklyS1,
      'market_weekly_s2.json': marketWeeklyS2,
      'market_weekly_s3.json': marketWeeklyS3,
    }
    for (const [csvName, jsonName] of MARKET_FILES) {
      const csv = readFileSync(
        new URL(`../src/content/${csvName}`, import.meta.url),
        'utf8',
      )
      // (M27.3: Act IV's JSON files are read from disk rather than imported here)
      const parsed =
        json[jsonName] ??
        JSON.parse(readFileSync(new URL(`../src/content/${jsonName}`, import.meta.url), 'utf8'))
      expect(csvToRows(csv), jsonName).toEqual(parsed)
    }
  })

  it('the Act IV market files are byte-identical copies of docs/act4-content/ (M27.3)', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
    for (const f of ['f1', 'f2', 'f3', 'f4'])
      for (const name of [`market_iv_${f}.csv`, `market_weekly_iv_${f}.csv`, `signals_iv_${f}.json`])
        expect(read(`../src/content/${name}`), name).toBe(read(`../docs/act4-content/${name}`))
    // M28.3: the three hidden files
    for (const name of ['lunar_truth.json', 'orbit_truth_iv.json', 'reading_score_iv.json', 'events_iv.json', 'text_iv.en.json'])
      expect(read(`../src/content/${name}`), name).toBe(read(`../docs/act4-content/${name}`))
  })

  it('the Act II content files are the corrected copies in docs/act2-content/', () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), 'utf8')
    const copies: [string, string][] = [
      ['market_weekly_act2.csv', 'market_weekly.csv'],
      ['market_quarterly_act2.csv', 'market_quarterly.csv'],
      ['capital_act2.json', 'capital_act2.json'],
      ['conversions.json', 'conversions.json'],
      ['tenants.json', 'tenants.json'],
      ['gpus.json', 'gpus.json'],
      ['interrupts_act2.json', 'interrupts_act2.json'],
      ['lenders.json', 'lenders.json'],
      ['hires_act2.json', 'hires_act2.json'],
    ]
    for (const [game, docs] of copies)
      expect(read(`../src/content/${game}`), game).toBe(
        read(`../docs/act2-content/${docs}`),
      )
  })

  it('the Act III market files are byte-identical copies of docs/act3-content/ (M11.1)', () => {
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), 'utf8')
    for (const id of ['s0', 's1', 's2', 's3'])
      for (const name of [
        `market_${id}.csv`,
        `market_weekly_${id}.csv`,
        `signals_${id}.json`, // M11.2
      ])
        expect(read(`../src/content/${name}`), name).toBe(
          read(`../docs/act3-content/${name}`),
        )
    // M11.5b, M11.5c; M14.1 (the reading score, hidden: only systems/readingScore.ts imports it)
    for (const name of [
      'rivals_act3.json',
      'events_act3.json',
      'reading_score.json',
      'gpus_act3.json', // M16.1
      'nuclear.json', // M17.1
      'political_capital.json',
      'wildcards.json',
      'presets_act3.json', // M18.3
    ])
      expect(read(`../src/content/${name}`), name).toBe(
        read(`../docs/act3-content/${name}`),
      )
  })

  it('M17.1: no wildcard is flagged for the D15 review (wc_ai_lab_breakup cleared: a fictional lab, doc 27 §11 / D10)', () => {
    const file = JSON.parse(
      readFileSync(new URL('../src/content/wildcards.json', import.meta.url), 'utf8'),
    ) as { wildcards: { id: string; d15_review?: boolean; d15_note?: string }[] }
    expect(file.wildcards.filter((w) => w.d15_review).map((w) => w.id)).toEqual([])
    expect(file.wildcards.find((w) => w.id === 'wc_ai_lab_breakup')!.d15_note).toMatch(
      /fictional lab/,
    )
    expect(CONTENT.wildcards.map((w) => w.id)).toHaveLength(4)
    expect(CONTENT.act3Nuclear).toEqual({
      unlockQuarter: '2027Q3',
      termQuarters: 60,
      regions: ['pjm', 'ohio', 'georgia', 'nordics'],
    })
    expect(CONTENT.politicalCapital.start).toBe(40)
    expect(CONTENT.politicalCapital.decayPerQuarter).toBe(2)
    expect(CONTENT.politicalCapital.hire).toEqual({
      id: 'gov_affairs_director',
      salaryUsdQ: 450_000,
      pcPerQuarter: 3,
      angerPerQuarter: -1,
    })
  })

  it('the Act III scenarios load: 4 scenarios × 16 quarters × 13 weeks, from 2027Q1 to 2030Q4', () => {
    for (const id of ['s0', 's1', 's2', 's3'] as const) {
      const s = CONTENT.act3Scenarios[id]
      expect(s.quarterly.map((r) => r.quarter)).toEqual(
        s.weeks.map((w) => w[0].quarter),
      )
      expect(s.weeks).toHaveLength(16)
      expect(s.weeks[0][0].quarter).toBe('2027Q1')
      expect(s.weeks[15][0].quarter).toBe('2030Q4')
      for (const weeks of s.weeks) expect(weeks).toHaveLength(13)
    }
  })

  it('a scenario with a wrong id, a gap in its quarters or a broken close is refused', () => {
    const bad = raw()
    bad.act3Scenarios.s1 = structuredClone(bad.act3Scenarios.s0)
    expect(problemsFor(bad)).toContainEqual(
      expect.stringMatching(/^market_weekly_s1 › week .*scenario is s0/),
    )
    const closes = raw()
    ;(
      closes.act3Scenarios.s2.quarterly as { btc_usd_close: number }[]
    )[3].btc_usd_close += 1000
    expect(problemsFor(closes)).toEqual([
      expect.stringMatching(/^market_s2 › 2027Q4: BTC close/),
    ])
  })

  it('Act III’s timeline is the scenario files’ 16 quarters, and a scenario with different quarters is refused (M11.3)', () => {
    expect(CONTENT.quarters.slice(40, 56)).toEqual(
      CONTENT.act3Scenarios.s0.quarterly.map((r) => r.quarter),
    )
    const bad = raw()
    ;(bad.act3Scenarios.s3.quarterly as { quarter: string }[]).pop()
    ;(bad.act3Scenarios.s3.weekly as unknown[]).length -= 13
    expect(problemsFor(bad)).toContainEqual(
      expect.stringMatching(/^market_s3: quarters .* differ from market_s0's/),
    )
  })

  it('the quarterly market has no multiple columns (owner B6: capital_act2.json is the only source)', () => {
    const header = readFileSync(
      new URL('../src/content/market_quarterly_act2.csv', import.meta.url),
      'utf8',
    ).split('\n')[0]
    expect(header).not.toMatch(/ev_ebitda_mult/)
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

function problemsFor(data: RawContent): string[] {
  try {
    parseContent(data)
  } catch (e) {
    if (e instanceof ContentError) return e.problems
    throw e
  }
  throw new Error('expected parseContent to throw')
}

describe('bad content fails loudly', () => {
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

describe("Act II's quarterly market (market_quarterly_act2, scope 0.2 §2.3)", () => {
  const q = (label: string) => act2Quarter(CONTENT.quarters.indexOf(label))!

  it('has one row per Act II quarter, reached by quarter index; none in Act I or the Act III stub', () => {
    expect(CONTENT.act2Market.map((x) => x.quarter)).toEqual(
      CONTENT.quarters.slice(
        CONTENT.acts[1].firstQuarter,
        CONTENT.acts[1].lastQuarter + 1,
      ),
    )
    expect(act2Quarter(23)!.quarter).toBe('2022Q4')
    expect(act2Quarter(39)!.quarter).toBe('2026Q4')
    expect(act2Quarter(22)).toBeUndefined()
    // The Act III stub (M10) has no Act II quarterly data of its own.
    expect(act2Quarter(40)).toBeUndefined()
  })

  it('has GPU rental prices from 2023Q3 (null before, never 0)', () => {
    expect(q('2023Q2').gpuRentalUsdHr.h100.neocloud).toBeNull()
    expect(q('2023Q3').gpuRentalUsdHr.h100.neocloud).toBeGreaterThan(0)
    expect(q('2024Q4').gpuRentalUsdHr.b200.hyperscaler).toBeNull()
    expect(q('2025Q1').gpuRentalUsdHr.b200.hyperscaler).toBeGreaterThan(0)
    expect(q('2023Q3').gpuPurchaseUsd.h100).toBe(32000)
  })

  it('has rates, spreads, regional power and the AI demand index', () => {
    // M22: SOFR is FRED's quarterly average from 2022Q4 to 2026Q3 (tools/data/real-market.ts); 2026Q4 is still an estimate
    expect(q('2022Q4').sofrPct).toBe(3.62)
    // (M23.1: 2026Q4 = the last FRED observation, 2026-10-01's 3.87%, carried forward; still flagged an estimate)
    expect(q('2026Q4').sofrPct).toBe(3.87)
    expect(q('2023Q2').ddtlSpreadBps).toBeNull() // no DDTL before 2023Q3
    expect(q('2023Q3').ddtlSpreadBps).toBeGreaterThan(0)
    expect(q('2022Q4').aiDemandIndex).toBe(8)
    expect(q('2026Q3').aiDemandIndex).toBe(88)
    expect(q('2022Q4').powerUsdKwh).toEqual({
      ercot: 0.033,
      pjm: 0.045,
      ohio: 0.042,
      georgia: 0.04,
      arizona: 0.036,
      nordics: 0.03,
    })
    // PJM ends the act the most expensive, the Nordics the cheapest (doc 18 §6).
    const last = q('2026Q4').powerUsdKwh
    expect(Math.min(...Object.values(last))).toBe(last.nordics)
    expect(Math.max(...Object.values(last))).toBe(last.pjm)
  })

  it("catches a quarterly close that doesn't match the weekly file", () => {
    const data = raw()
    ;(
      data.marketQuarterlyAct2 as { btc_usd_close: number }[]
    )[0].btc_usd_close = 1
    expect(problemsFor(data).join('\n')).toMatch(
      /market_quarterly_act2 › 2022Q4: closes \(BTC 1,/,
    )
  })

  it('catches an Act II multiple series that stops short', () => {
    const data = raw()
    const m = (
      data.capitalAct2 as {
        era_multiple_ev_ebitda: { mining: Record<string, unknown> }
      }
    ).era_multiple_ev_ebitda.mining
    delete m['2026Q4']
    expect(problemsFor(data)).toContain(
      'capital_act2.json › era_multiple_ev_ebitda.mining: needs a value for 2022Q4 and 2026Q4',
    )
  })

  it('catches a missing Act II quarter', () => {
    const data = raw()
    ;(data.marketQuarterlyAct2 as unknown[]).splice(3, 1)
    expect(problemsFor(data).join('\n')).toMatch(
      /market_quarterly_act2: has .*expected Act II's/,
    )
  })
})
