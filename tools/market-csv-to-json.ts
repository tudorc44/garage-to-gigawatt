// Converts the market CSVs in src/content/ into JSON files, which both the browser and
// Node can import. Run it after replacing a CSV: `npm run content:market`.
//   market_weekly.csv      → market_weekly.json       (Act I, 2017Q1–2022Q3)
//   market_weekly_act2.csv → market_weekly_act2.json  (Act II, 2022Q4–2026Q4)
//   market_quarterly_act2.csv → market_quarterly_act2.json  (Act II: GPU prices, rates, multiples, power, AI demand)
//   docs/prologue-content/market_weekly_prologue.csv + eth_network_weekly_prologue.csv
//                          → market_weekly_prologue.json (the prologue, 2009Q1–2016Q4, ETH columns replaced)
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../src/content/', import.meta.url)

export const MARKET_FILES = [
  ['market_weekly.csv', 'market_weekly.json'],
  ['market_weekly_act2.csv', 'market_weekly_act2.json'],
  ['market_quarterly_act2.csv', 'market_quarterly_act2.json'],
] as const

type Cell = string | number | boolean | null

export function csvToRows(csv: string): Record<string, Cell>[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/)
  const columns = header.split(',')
  return lines.map((line) => {
    const cells = line.split(',')
    const row: Record<string, Cell> = {}
    columns.forEach((col, i) => {
      const cell = cells[i] ?? ''
      // `week` and `quarter` stay as text. An empty cell is "no value" (null), never 0.
      // True/False (the Act II `estimate` flag) become booleans; every other column is a number.
      if (col === 'week' || col === 'quarter') row[col] = cell
      else if (cell === '') row[col] = null
      else if (cell === 'True' || cell === 'False') row[col] = cell === 'True'
      else row[col] = Number(cell)
    })
    return row
  })
}

/** The prologue's pack (docs/prologue-content/), read as it is: the game writes a merged JSON from it. */
const prologueDir = new URL('../docs/prologue-content/', import.meta.url)

/**
 * The prologue market (Alpha 0.3 §2.1; docs/prologue-content/README.md): market_weekly_prologue.csv
 * with its ETH columns replaced from eth_network_weekly_prologue.csv (Etherscan-based):
 * eth_hashrate_THs as given, eth_rev_usd_mh_day = eth_rev_usd_mh_day_per_usd × eth_usd, plus that
 * file's blocks per day and block reward. Weeks before the ETH file's first row have no ETH (null).
 * The columns come out in Act I's order, so the game reads both acts the same way.
 */
export function prologueRows(): Record<string, Cell>[] {
  const market = csvToRows(
    readFileSync(new URL('market_weekly_prologue.csv', prologueDir), 'utf8'),
  )
  const eth = new Map(
    csvToRows(
      readFileSync(
        new URL('eth_network_weekly_prologue.csv', prologueDir),
        'utf8',
      ),
    ).map((r) => [r.week as string, r]),
  )
  return market.map((r) => {
    const e = eth.get(r.week as string)
    const ethUsd = e ? (r.eth_usd as number | null) : null
    return {
      week: r.week,
      quarter: r.quarter,
      btc_usd: r.btc_usd,
      eth_usd: ethUsd,
      btc_difficulty_T: r.btc_difficulty_T,
      btc_hashrate_EHs: r.btc_hashrate_EHs,
      btc_block_subsidy: r.btc_block_subsidy,
      btc_fee_share: r.btc_fee_share,
      btc_hashprice_usd_th_day: r.btc_hashprice_usd_th_day,
      btc_hashprice_usd_ph_day: r.btc_hashprice_usd_ph_day,
      eth_hashrate_THs: e ? e.eth_hashrate_THs : null,
      eth_blocks_day: e ? e.eth_blocks_day : null,
      eth_block_reward: e ? e.eth_block_reward : null,
      eth_rev_usd_mh_day:
        e && ethUsd !== null
          ? (e.eth_rev_usd_mh_day_per_usd as number) * ethUsd
          : null,
    }
  })
}

if (import.meta.main) {
  for (const [csvName, jsonName] of MARKET_FILES) {
    const rows = csvToRows(readFileSync(new URL(csvName, dir), 'utf8'))
    writeFileSync(new URL(jsonName, dir), JSON.stringify(rows) + '\n')
    console.log(`Wrote ${rows.length} rows to src/content/${jsonName}`)
  }
  const prologue = prologueRows()
  writeFileSync(
    new URL('market_weekly_prologue.json', dir),
    JSON.stringify(prologue) + '\n',
  )
  console.log(
    `Wrote ${prologue.length} rows to src/content/market_weekly_prologue.json (from docs/prologue-content/)`,
  )
}
