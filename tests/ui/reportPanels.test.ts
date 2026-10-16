// UI fix: the League table and "What your value is made of" panels in the Act II chapter report collapsed to 24 px with their own
// scrollbar. The card (.end-card, a column with a max-height) let its children shrink, and a panel holding a table scrolls sideways
// (.panel:has(> table)), which makes it shrinkable. jsdom has no layout, so this checks the cause is gone: the card's children
// never shrink, and every chapter card carries that class. (Checked in a browser at the Act II end: both panels at full height.)
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../src/ui/styles/game.css', import.meta.url), 'utf8')

describe('chapter report panels keep their natural height', () => {
  it('the end card\'s children do not shrink', () => {
    const rule = css.match(/\.end-card > \*\s*{([^}]*)}/)
    expect(rule, 'a .end-card > * rule').not.toBeNull()
    expect(rule![1]).toMatch(/flex-shrink:\s*0/)
  })

  it('the card is still the one vertical scroll container', () => {
    const rule = css.match(/\.chapter-card\s*{([^}]*)}/)!
    expect(rule[1]).toMatch(/max-height/)
    expect(rule[1]).toMatch(/overflow-y:\s*auto/)
  })

  it('every screen that draws a chapter card draws it as an end card (so the rule covers the Prologue and Acts I-V and the game over)', () => {
    const dir = new URL('../../src/ui/screens/', import.meta.url)
    const files = [...readdirSync(dir).map((f) => `${f}`), ...readdirSync(new URL('prologue/', dir)).map((f) => `prologue/${f}`)].filter((f) => f.endsWith('.tsx'))
    let seen = 0
    for (const f of files) {
      const src = readFileSync(new URL(f, dir), 'utf8')
      for (const m of src.matchAll(/class=\{?[`"']([^`"']*chapter-card[^`"']*)/g)) {
        seen++
        expect(m[1], `${f}: ${m[1]}`).toContain('end-card')
      }
    }
    expect(seen).toBeGreaterThan(8)
  })
})
