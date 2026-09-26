// Converts src/content/market_weekly.csv into market_weekly.json, which both the browser
// and Node can import. Run it after replacing the CSV: `npm run content:market`.
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('../src/content/', import.meta.url)

export function csvToRows(csv: string): Record<string, string | number>[] {
  const [header, ...lines] = csv.trim().split(/\r?\n/)
  const columns = header.split(',')
  return lines.map((line) => {
    const cells = line.split(',')
    const row: Record<string, string | number> = {}
    columns.forEach((col, i) => {
      // `week` and `quarter` stay as text; every other column is a number.
      row[col] =
        col === 'week' || col === 'quarter' ? cells[i] : Number(cells[i])
    })
    return row
  })
}

if (import.meta.main) {
  const rows = csvToRows(
    readFileSync(new URL('market_weekly.csv', dir), 'utf8'),
  )
  writeFileSync(new URL('market_weekly.json', dir), JSON.stringify(rows) + '\n')
  console.log(`Wrote ${rows.length} weeks to src/content/market_weekly.json`)
}
