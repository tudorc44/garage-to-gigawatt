// M23.4 (B1, DT): rich tooltips on terms and stats. A term is a word on the screen with a dotted underline;
// hovering it, or focusing it with the keyboard, opens a small card with a heading and a plain-language line. The card
// is fixed to the viewport at the term's position, so a scrolling panel never clips it (M21.1's panels scroll
// sideways). It holds no scenario information: the leak guard's rules apply.
// M25.1 (DT): one text per term. The card reads the glossary's own keys (content.en.json): `glossary_term.<id>` for
// the heading, `glossary_short.<id>` for the line (or `glossary.<id>` when the glossary's text is already short), and
// carries a "More in the glossary" link that opens Settings at that entry. A term kept out of the glossary (the
// chapter report's reading score: the glossary is open during play) keeps its own `term.act3.<id>` text, no link.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { hasText, t, tDynamic } from '../../i18n/t.ts'

/** The event a term card's "More in the glossary" link sends; the app opens Settings at that entry. */
export const GLOSSARY_EVENT = 'g2g:glossary'

/** Opens Settings at the glossary entry `id` (see GlossaryHost in frame.tsx). */
export function openGlossary(id: string) {
  window.dispatchEvent(new CustomEvent(GLOSSARY_EVENT, { detail: id }))
}

/** A term card's heading and line, and whether the glossary has the term. */
export function termText(id: string) {
  const inGlossary = hasText(`glossary.${id}`)
  if (!inGlossary)
    return {
      title: tDynamic(`term.act3.${id}.title`, ''),
      body: tDynamic(`term.act3.${id}.body`, ''),
      inGlossary,
    }
  return {
    title: tDynamic(`glossary_term.${id}`, id),
    body: tDynamic(`glossary_short.${id}`, tDynamic(`glossary.${id}`, '')),
    inGlossary,
  }
}

export function Term(props: { id: string; children: ComponentChildren }) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const { title, body, inGlossary } = termText(props.id)
  if (!body) return <>{props.children}</>
  const open = (e: Event) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // below the term, kept inside the window (the card is at most 280 px wide)
    setAt({
      x: Math.max(8, Math.min(r.left, window.innerWidth - 296)),
      y: r.bottom + 6,
    })
  }
  return (
    <span
      class="term"
      tabIndex={0}
      onMouseEnter={open}
      onFocus={(e) => !at && open(e)}
      onMouseLeave={() => setAt(null)}
      // focus moving onto the card's link keeps the card open
      onBlur={(e) =>
        !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) &&
        setAt(null)
      }
      data-term={props.id}
      aria-describedby={at ? `term-${props.id}` : undefined}
    >
      {props.children}
      {at && (
        <span
          class="term-card"
          role="tooltip"
          id={`term-${props.id}`}
          style={{ left: `${at.x}px`, top: `${at.y}px` }}
        >
          <strong>{title}</strong>
          <span>{body}</span>
          {inGlossary && (
            <button
              type="button"
              class="term-more"
              onClick={(e) => {
                e.stopPropagation()
                setAt(null)
                openGlossary(props.id)
              }}
            >
              {t('ui.term.more')}
            </button>
          )}
        </span>
      )}
    </span>
  )
}
