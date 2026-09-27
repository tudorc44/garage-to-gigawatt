// Converts the weekly market CSVs in src/content/ into JSON files, which both the browser and
// Node can import. Run it after replacing a CSV: `npm run content:market`.
//   market_weekly.csv      → market_weekly.json       (Act I, 2017Q1–2022Q3)
//   market_weekly_act2.csv → market_weekly_act2.json  (Act II, 2022Q4–2026Q4)
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../src/content/', import.meta.url)

export const MARKET_FILES = [
  ['market_weekly.csv', 'market_weekly.json'],
  ['market_weekly_act2.csv', 'market_weekly_act2.json'],
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

if (import.meta.main) {
  for (const [csvName, jsonName] of MARKET_FILES) {
    const rows = csvToRows(readFileSync(new URL(csvName, dir), 'utf8'))
    writeFileSync(new URL(jsonName, dir), JSON.stringify(rows) + '\n')
    console.log(`Wrote ${rows.length} weeks to src/content/${jsonName}`)
  }
}
