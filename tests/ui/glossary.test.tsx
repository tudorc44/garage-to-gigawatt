// @vitest-environment happy-dom
// M25.1 (DT): the glossary and the term cards share one text per term. A card shows the short form
// (glossary_short.<id>, or the glossary's own line when that is already short); the glossary shows the long form
// (glossary.<id>); both under the same term id, so no definition exists twice. Each card links to its glossary entry.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import en from '../../src/i18n/en.json' with { type: 'json' }
import contentText from '../../src/i18n/content.en.json' with { type: 'json' }
import { GlossaryHost } from '../../src/ui/components/saves.tsx'
import { Term, termText } from '../../src/ui/components/term.tsx'

afterEach(cleanup)

/** Every term card on a play screen, all four acts. */
const TERMS = [
  'difficulty', 'solo_pool', 'patience', 'wallet_exchange', 'selling_limit',
  'bandwidth', 'treasury', 'heat', 'valuation', 'hashprice', 'hodl',
  'rating', 'backlog', 'leverage', 'ddtl', 'mw_uses',
  'renewal_wall', 'today_rate', 'reopener', 'blend_extend', 'signals', 'density', 'political_capital', 'covenant',
  'standby', 'nuclear_ppa',
]

const text = en as Record<string, string>
const glossary = contentText as Record<string, string>

describe('one text per term (M25.1)', () => {
  it('no term card keeps a text of its own, except the chapter report’s reading score (kept out of the glossary)', () => {
    const own = Object.keys({ ...text, ...glossary }).filter((k) => k.startsWith('term.'))
    expect(own).toEqual(['term.act3.reading.title', 'term.act3.reading.body'])
    expect(glossary['glossary.reading']).toBeUndefined()
  })

  it('a short form exists only next to a longer glossary line, never as a copy of it', () => {
    for (const key of Object.keys(glossary).filter((k) => k.startsWith('glossary_short.'))) {
      const id = key.slice('glossary_short.'.length)
      expect(glossary[`glossary.${id}`], id).toBeTruthy()
      expect(glossary[key].length, id).toBeLessThan(glossary[`glossary.${id}`].length)
    }
  })

  it('the terms that had both a card and a glossary entry now have one of each form', () => {
    for (const id of ['difficulty', 'bandwidth', 'heat', 'hashprice', 'hodl']) {
      expect(termText(id).body).toBe(glossary[`glossary_short.${id}`])
      expect(termText(id).title).toBe(glossary[`glossary_term.${id}`])
    }
    for (const id of TERMS) expect(termText(id).inGlossary, id).toBe(true)
  })

  it('hashprice says it halves at each halving, on the card and in the glossary', () => {
    expect(glossary['glossary_short.hashprice']).toMatch(/halves at each halving/)
    expect(glossary['glossary.hashprice']).toMatch(/halves at each halving/)
  })
})

describe('"More in the glossary" (M25.1)', () => {
  it('the card’s link opens Settings with the glossary at that entry', () => {
    const r = render(
      <>
        <Term id="hashprice">Hashprice</Term>
        <GlossaryHost />
      </>,
    )
    expect(r.container.querySelector('[role="dialog"]')).toBeNull()
    fireEvent.mouseEnter(r.container.querySelector('[data-term="hashprice"]')!)
    fireEvent.click(r.getByText(text['ui.term.more']))
    expect(r.container.querySelector('[role="tooltip"]')).toBeNull()
    const entry = r.container.querySelector('[role="dialog"] [data-glossary="hashprice"]')!
    expect(entry.classList.contains('focus')).toBe(true)
    expect(entry.textContent).toContain(glossary['glossary.hashprice'])
    fireEvent.click(r.getByLabelText(text['ui.close']))
    expect(r.container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('the chapter report’s reading score has a card but no link', () => {
    const r = render(<Term id="reading">Reading score</Term>)
    fireEvent.mouseEnter(r.container.querySelector('[data-term="reading"]')!)
    expect(r.container.querySelector('[role="tooltip"]')!.textContent).toContain(text['term.act3.reading.body'])
    expect(r.queryByText(text['ui.term.more'])).toBeNull()
  })

  it('focus moving onto the link keeps the card open', () => {
    const r = render(<Term id="heat">Heat</Term>)
    const term = r.container.querySelector('[data-term="heat"]')!
    fireEvent.focus(term)
    const link = r.getByText(text['ui.term.more'])
    fireEvent.blur(term, { relatedTarget: link })
    expect(r.container.querySelector('[role="tooltip"]')).not.toBeNull()
    fireEvent.blur(term, { relatedTarget: null })
    expect(r.container.querySelector('[role="tooltip"]')).toBeNull()
  })
})
