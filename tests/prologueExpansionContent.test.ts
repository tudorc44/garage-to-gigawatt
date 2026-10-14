// M68.2 (doc 51 v1.0 §5, §7): the Prologue expansion's content. Every file the game loads from docs/prologue-expansion-content/
// is a byte-identical copy in src/content/ (as for Acts II-III); the altcoin CSVs have their JSON and their schemas.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  marketPrologueAltsSchema,
  marketQuarterlyPrologueAltsSchema,
  poolsPlayerFileSchema,
  clubFileSchema,
  preordersAdditionsFileSchema,
} from '../src/content/schemas.ts'
import weekly from '../src/content/market_weekly_prologue_alts.json' with { type: 'json' }
import quarterly from '../src/content/market_quarterly_prologue_alts.json' with { type: 'json' }
import { csvToRows } from '../tools/market-csv-to-json.ts'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

/** The files of the pack that the game loads (the pool and club files join when those milestones build them). */
const LOADED = ['market_weekly_prologue_alts.csv', 'market_quarterly_prologue_alts.csv', 'pools_player.json']

describe('the altcoin content merged into the Prologue files (M68.3)', () => {
  const json = (path: string) => JSON.parse(read(path))
  const pack = json('../docs/prologue-expansion-content/events_prologue_expansion.json').events as { id: string; type: string; week: string | null; trigger: string }[]
  const altIds = pack.filter((c) => !/^(pool|club)_/.test(c.id)).map((c) => c.id)

  it('17 altcoin cards (the pool and club cards are checked below)', () => {
    expect(altIds.length).toBe(17)
    const docs = json('../docs/prologue-content/events_prologue.json').events as { id: string }[]
    const game = json('../src/content/events_prologue.json').cards as { id: string; type: string }[]
    for (const id of altIds) {
      expect(docs.map((c) => c.id), id).toContain(id)
      expect(game.map((c) => c.id), id).toContain(id)
    }
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

describe('your own pool: data and cards (M69.2)', () => {
  const json = (path: string) => JSON.parse(read(path))
  const POOL_IDS = ['pool_ddos', 'pool_theft', 'pool_pps_crunch', 'pool_boycott_2014', 'pool_sale_offer']

  it('pools_player.json passes its schema and keeps the {value, grade, source} shape', () => {
    const f = poolsPlayerFileSchema.parse(json('../src/content/pools_player.json'))
    expect(f.open_action.setup_cash_usd).toEqual({ value: 300, grade: 'D', source: expect.any(String) })
    expect(f.risks_per_quarter.hot_wallet_theft_with_cold_storage.value).toBeLessThan(f.risks_per_quarter.hot_wallet_theft.value)
    expect(f.payout_methods.PPS.fee_range).toEqual([0.02, 0.1])
  })

  it('the 5 pool cards are in the docs file (pack format) and the game file (the game\'s format), each with its text', () => {
    const docs = json('../docs/prologue-content/events_prologue.json').events as { id: string }[]
    const game = json('../src/content/events_prologue.json').cards as { id: string; type: string; requires?: string[] }[]
    const text = json('../src/i18n/content.en.json') as Record<string, string>
    for (const id of POOL_IDS) {
      expect(docs.map((c) => c.id), id).toContain(id)
      const g = game.find((c) => c.id === id)!
      expect(g, id).toBeDefined()
      expect(g.requires, id).toEqual(['pool_open'])
      expect(text[`p0.event.${id}.title`], id).toBeTruthy()
      expect(text[`p0.event.${id}.body`], id).toBeTruthy()
    }
    expect(game.filter((c) => c.type === 'trigger').map((c) => c.id).sort()).toEqual(['pool_ddos', 'pool_pps_crunch', 'pool_theft'])
  })

  it('the 8 pool text keys match the pack in both text files', () => {
    const pack = json('../docs/prologue-expansion-content/text_prologue_expansion.en.json') as Record<string, string>
    const game = json('../src/i18n/content.en.json') as Record<string, string>
    const docs = json('../docs/prologue-content/text_prologue.en.json') as Record<string, string>
    for (const k of ['tooltip.p0.own_pool', 'tooltip.p0.pool_pps', 'tooltip.p0.pool_pplns', 'tooltip.p0.cold_storage', 'glossary.hot_wallet', 'glossary.ddos', 'chapter.p0.pool_sold', 'chapter.p0.pool_sold_handover']) {
      // (glossary.hot_wallet already existed with its own wording: the merge never replaces, so that text stays)
      if (k === 'glossary.hot_wallet') {
        expect(game[k], k).toBeTruthy()
        expect(docs[k], k).toBeTruthy()
        continue
      }
      expect(game[k], k).toBe(pack[k])
      expect(docs[k], k).toBe(pack[k])
    }
  })
})

describe('the mining club: data and cards (M70.3)', () => {
  const json = (path: string) => JSON.parse(read(path))
  const CLUB_IDS = ['club_form', 'club_power_bill', 'club_peak_cashout', 'club_gpu_flip', 'club_scrypt_box', 'club_cloud_contract', 'club_breakup']

  it('club.json and preorders_additions.json are identical live copies, and pass their schemas', () => {
    for (const name of ['club.json', 'preorders_additions.json'])
      expect(read(`../src/content/${name}`), name).toBe(read(`../docs/prologue-expansion-content/${name}`))
    const club = clubFileSchema.parse(json('../src/content/club.json'))
    expect(club.player_contribution_usd).toMatchObject({ min: 500, max: 5000, step: 500 })
    expect(club.friends_cash_usd.value).toBe(3000)
    expect(club.keys.jun.loss_chance_quarter.value).toBe(0.015)
    const vendors = preordersAdditionsFileSchema.parse(json('../src/content/preorders_additions.json')).vendors
    expect(vendors[0]).toMatchObject({ id: 'scrypt_box_share', share_of_unit: 0.25 })
    expect(vendors[0].price_usd.value).toBe(2499)
  })

  it('the 7 club cards are in the docs file (pack format) and the game file (the game\'s format), each with its text', () => {
    const docs = json('../docs/prologue-content/events_prologue.json').events as { id: string }[]
    const game = json('../src/content/events_prologue.json').cards as { id: string; type: string; requires?: string[]; default: string; choices: { id: string }[] }[]
    const text = json('../src/i18n/content.en.json') as Record<string, string>
    for (const id of CLUB_IDS) {
      expect(docs.map((c) => c.id), id).toContain(id)
      const g = game.find((c) => c.id === id)!
      expect(g, id).toBeDefined()
      expect(g.choices.map((c) => c.id), id).toContain(g.default)
      expect(text[`p0.event.${id}.title`], id).toBeTruthy()
      if (g.type !== 'news') for (const ch of g.choices) expect(text[`p0.event.${id}.choice.${ch.id}`], `${id}.${ch.id}`).toBeTruthy()
    }
    // every card but the offer needs club membership; the offer is a headline (display only: opt-out invariance)
    expect(game.filter((c) => CLUB_IDS.includes(c.id) && c.id !== 'club_form').every((c) => c.requires?.includes('club_member'))).toBe(true)
    expect(game.find((c) => c.id === 'club_form')).toMatchObject({ type: 'news', quarter: '2013Q1' })
  })

  it('the 3 club text keys match the pack in both text files', () => {
    const pack = json('../docs/prologue-expansion-content/text_prologue_expansion.en.json') as Record<string, string>
    const game = json('../src/i18n/content.en.json') as Record<string, string>
    const docs = json('../docs/prologue-content/text_prologue.en.json') as Record<string, string>
    for (const k of ['tooltip.p0.club', 'chapter.p0.club_buyout', 'chapter.p0.club_dissolved']) {
      expect(game[k], k).toBe(pack[k])
      expect(docs[k], k).toBe(pack[k])
    }
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

  it('Litecoin exists from the week of 24 Oct 2011 and Dogecoin from 6 Dec 2013; merged mining from 11 Sep 2014', () => {
    const firstLtc = weekly.find((r) => r.ltc_usd !== null)!
    const firstDoge = weekly.find((r) => r.doge_usd !== null)!
    expect(firstLtc.week).toBe('2011-10-24')
    expect(firstDoge.week).toBe('2013-12-02')
    // a coin has no price before it exists, and the merged-mining flag turns on the week 8 Sep 2014 (its week ends 14 Sep)
    for (const r of weekly) if (r.week < '2011-10-24') expect(r.ltc_usd).toBeNull()
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
