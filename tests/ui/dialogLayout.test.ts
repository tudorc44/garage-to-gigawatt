// A dialog taller than the window scrolls; its children must not shrink. Without this rule a `.seg` switch (overflow:
// hidden) collapsed to 0 px in the New project dialog with many sites, so AI clouds and pilots could not be chosen.
// happy-dom does no layout, so this checks the stylesheet rule itself (the height was checked in a browser).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(import.meta.dirname, '../../src/ui/styles/game.css'), 'utf8')

describe('dialog layout', () => {
  it('a tall dialog scrolls and keeps its children at their own height', () => {
    const dialog = /\.dialog\s*\{([^}]*)\}/g
    const bodies = [...css.matchAll(dialog)].map((m) => m[1]).join('\n')
    expect(bodies).toMatch(/overflow:\s*auto/)
    const children = css.match(/\.dialog\s*>\s*\*\s*\{([^}]*)\}/)
    expect(children?.[1]).toMatch(/flex-shrink:\s*0/)
  })
})
