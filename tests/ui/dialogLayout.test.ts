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

  it("the Deal builder's note cells wrap, so its tables never widen the dialog (hotfix 2)", () => {
    const notes = css.match(/\.deal-panel\s+td\.num-s\s*\{([^}]*)\}/)
    expect(notes?.[1]).toMatch(/white-space:\s*normal/)
  })

  it('the Plan dashboard keeps usable columns under tall panels; the main area scrolls, Start quarter stays pinned', () => {
    expect(css.match(/\.main:has\(> \.dash\)\s*\{([^}]*)\}/)?.[1]).toMatch(/overflow-y:\s*auto/)
    expect(css.match(/\.main > \.dash\s*\{([^}]*)\}/)?.[1]).toMatch(/min-height:\s*\d+px/)
    expect(css.match(/\.main:has\(> \.dash\) > \.foot\s*\{([^}]*)\}/)?.[1]).toMatch(/position:\s*sticky/)
  })

  it('the fleet dialog lets its batch name and working count wrap (found by the hotfix 2 sweep)', () => {
    const fleet = css.match(
      /\.fleet-table td:first-child,\s*\.fleet-table td:nth-child\(3\)\s*\{([^}]*)\}/,
    )
    expect(fleet?.[1]).toMatch(/white-space:\s*normal/)
  })
})
