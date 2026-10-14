// M68.2 (doc 51 v1.0 §5, §7): the Prologue expansion's content. Every file the game loads from docs/prologue-expansion-content/
// is a byte-identical copy in src/content/ (as for Acts II-III); the altcoin CSVs have their JSON and their schemas.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  marketPrologueAltsSchema,
  marketQuarterlyPrologueAltsSchema,
} from '../src/content/schemas.ts'
import weekly from '../src/content/market_weekly_prologue_alts.json' with { type: 'json' }
import quarterly from '../src/content/market_quarterly_prologue_alts.json' with { type: 'json' }
import { csvToRows } from '../tools/market-csv-to-json.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

/** The files of the pack that the game loads (the pool and club files join when those milestones build them). */
const LOADED = ['market_weekly_prologue_alts.csv', 'market_quarterly_prologue_alts.csv']

describe('the altcoin content merged into the Prologue files (M68.3)', () => {
  const json = (path: string) => JSON.parse(read(path))
  const pack = json('../docs/prologue-expansion-content/events_prologue_expansion.json').events as { id: string; type: string; week: string | null; trigger: string }[]
  const altIds = pack.filter((c) => !/^(pool|club)_/.test(c.id)).map((c) => c.id)

  it('17 altcoin cards, none of the pool or club cards', () => {
    expect(altIds.length).toBe(17)
    const docs = json('../docs/prologue-content/events_prologue.json').events as { id: string }[]
    const game = json('../src/content/events_prologue.json').cards as { id: string; type: string }[]
    for (const id of altIds) {
      expect(docs.map((c) => c.id), id).toContain(id)
      expect(game.map((c) => c.id), id).toContain(id)
    }
    expect([...docs, ...game].filter((c) => /^(pool|club)_/.test(c.id))).toEqual([])
  })

  it('the game\'s news cards are display only; scrypt_boxes_ship needs a GPU on scrypt and sells them', () => {
    const game = json('../src/content/events_prologue.json').cards as { id: string; type: string; requires?: string[]; choices: { id: string; effects: object }[] }[]
    const alt = game.filter((c) => altIds.includes(c.id))
    expect(alt.filter((c) => c.type === 'news').length).toBe(16)
    for (const c of alt.filter((x) => x.type === 'news')) expect(c.choices).toEqual([{ id: 'noted', effects: {} }])
    const box = alt.find((c) => c.id === 'scrypt_boxes_ship')!
    expect(box.type).toBe('scripted')
    expect(box.requires).toEqual(['scrypt_gpus'])
    expect(box.choices.find((c) => c.id === 'sell_gpus')!.effects).toEqual({ sell_scrypt_gpus: true })
  })

  it('every altcoin card has its text, and the seven new tooltip, glossary and chapter keys exist', () => {
    const text = json('../src/i18n/content.en.json') as Record<string, string>
    for (const id of altIds) {
      expect(text[`p0.event.${id}.title`], id).toBeTruthy()
      expect(text[`p0.event.${id}.body`], id).toBeTruthy()
    }
    const pack = json('../docs/prologue-expansion-content/text_prologue_expansion.en.json') as Record<string, string>
    const docsText = json('../docs/prologue-content/text_prologue.en.json') as Record<string, string>
    for (const k of ['tooltip.p0.coin_choice', 'tooltip.p0.alt_selling', 'glossary.scrypt', 'glossary.litecoin', 'glossary.dogecoin', 'glossary.merged_mining', 'chapter.p0.alts_sold']) {
      expect(text[k], k).toBe(pack[k])
      expect(docsText[k], k).toBe(pack[k])
    }
  })

  it('the two GPUs have a scrypt rate and nothing else does', () => {
    const m = json('../src/content/machines_prologue.json').models as { id: string; scrypt_khs?: { value: number }; available_scrypt_from?: string }[]
    const withScrypt = m.filter((x) => x.scrypt_khs)
    expect(withScrypt.map((x) => [x.id, x.scrypt_khs!.value, x.available_scrypt_from])).toEqual([
      ['gpu_gaming_2010', 400, '2011Q4'],
      ['gpu_eth_2015', 3400, '2015Q3'],
    ])
    const d = json('../docs/prologue-content/machines_prologue.json').models as { id: string; scrypt_khs?: { value: number } }[]
    expect(d.filter((x) => x.scrypt_khs).map((x) => [x.id, x.scrypt_khs!.value])).toEqual([['gpu_gaming_2010', 400], ['gpu_eth_2015', 3400]])
  })

  it('the selling limits and the handover rule are in custody.json and prologue.json, with the same numbers', () => {
    const c = json('../docs/prologue-content/custody.json')
    const g = json('../src/content/prologue.json')
    expect(c.altcoin_selling_limits.free_share_of_avg_daily_volume.value).toBe(g.altcoin_selling_limits.free_share)
    expect(c.altcoin_selling_limits.hard_cap_share_of_avg_daily_volume.value).toBe(g.altcoin_selling_limits.hard_cap_share)
    expect(c.altcoin_selling_limits.avg_daily_volume_usd.LTC['2014'].value).toBe(g.altcoin_selling_limits.avg_daily_volume_usd.LTC['2014'])
    expect(c.pools_reference_fees.length).toBe(4)
    expect(g.altcoin_handover).toMatchObject({ sell_quarter: '2016Q4', left_over_close_mult: 0.9 })
  })

  it('2014Q3 is a decision quarter in the pack\'s list, and in the game only for a player with a GPU on scrypt', () => {
    const docs = json('../docs/prologue-content/events_prologue.json').decision_quarters as { quarter?: string }[]
    expect(docs.some((d) => d.quarter === '2014Q3')).toBe(true)
    const g = json('../src/content/prologue.json')
    expect(g.decision_quarters).not.toContain('2014Q3')
    expect(g.opt_in_decision_quarters).toEqual({ '2014Q3': 'scrypt_gpus' })
  })
})

describe('the Prologue expansion pack (M68.2)', () => {
  it('the files the game loads are byte-identical copies of docs/prologue-expansion-content/', () => {
    for (const name of LOADED) expect(read(`../src/content/${name}`), name).toBe(read(`../docs/prologue-expansion-content/${name}`))
  })

  it('the CSVs use LF line endings (the generator writes them so)', () => {
    for (const name of LOADED) expect(read(`../src/content/${name}`), name).not.toContain('\r')
  })

  it('the JSON files are the CSVs converted (npm run content:market), and pass their schemas', () => {
    expect(weekly).toEqual(csvToRows(read('../src/content/market_weekly_prologue_alts.csv')))
    expect(quarterly).toEqual(csvToRows(read('../src/content/market_quarterly_prologue_alts.csv')))
    expect(marketPrologueAltsSchema.safeParse(weekly).success).toBe(true)
    expect(marketQuarterlyPrologueAltsSchema.safeParse(quarterly).success).toBe(true)
  })

  it('the series line up with the Prologue market: one row per week, one per quarter, 2009Q1 to 2016Q4', () => {
    const base = JSON.parse(read('../src/content/market_weekly_prologue.json')) as { week: string; quarter: string }[]
    expect(weekly.map((r) => r.week)).toEqual(base.map((r) => r.week))
    expect(weekly.map((r) => r.quarter)).toEqual(base.map((r) => r.quarter))
    expect(quarterly.length).toBe(32)
    expect(quarterly[0].quarter).toBe('2009Q1')
    expect(quarterly.at(-1)!.quarter).toBe('2016Q4')
    expect(quarterly.reduce((n, q) => n + q.weeks, 0)).toBe(weekly.length)
  })

  it('Litecoin exists from the week of 13 Oct 2011 and Dogecoin from 6 Dec 2013; merged mining from 11 Sep 2014', () => {
    const firstLtc = weekly.find((r) => r.ltc_usd !== null)!
    const firstDoge = weekly.find((r) => r.doge_usd !== null)!
    expect(firstLtc.week).toBe('2011-10-10')
    expect(firstDoge.week).toBe('2013-12-02')
    // a coin has no price before it exists, and the merged-mining flag turns on the week 8 Sep 2014 (its week ends 14 Sep)
    for (const r of weekly) if (r.week < '2011-10-10') expect(r.ltc_usd).toBeNull()
    for (const r of weekly) if (r.week < '2013-12-02') expect(r.doge_usd).toBeNull()
    expect(weekly.find((r) => r.doge_merged_mining === true)!.week).toBe('2014-09-08')
    expect(weekly.filter((r) => r.week < '2014-09-08').every((r) => r.doge_merged_mining !== true)).toBe(true)
  })

  it('the Litecoin reward halves on 25 Aug 2015, and Dogecoin\'s steps down on the sourced dates', () => {
    expect(weekly.find((r) => r.week === '2015-08-24')!.ltc_block_reward).toBe(50)
    expect(weekly.find((r) => r.week === '2015-08-31')!.ltc_block_reward).toBe(25)
    expect(weekly.find((r) => r.week === '2014-02-10')!.doge_block_reward_expected).toBe(500000)
    expect(weekly.find((r) => r.week === '2014-02-17')!.doge_block_reward_expected).toBe(250000)
    expect(weekly.at(-1)!.doge_block_reward_expected).toBe(10000)
  })
})
