// M21.0: a JSON file that repeats a key keeps only the last one, silently. M19 did that to "ui.deal.title" (the
// Community Deal card's title overwrote the Deal builder's). The string tables are flat, so every key is one
// `"key": …` line: none may appear twice.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const TABLES = ['../src/i18n/en.json', '../src/i18n/content.en.json', '../src/content/text_iv.en.json']

describe('the string tables have no repeated keys', () => {
  for (const file of TABLES)
    it(file, () => {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8')
      const keys = [...text.matchAll(/^\s*"([^"]+)"\s*:/gm)].map((m) => m[1])
      const seen = new Set<string>()
      const repeated = keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)))
      expect(repeated).toEqual([])
      expect(keys.length).toBeGreaterThan(100)
    })
})
