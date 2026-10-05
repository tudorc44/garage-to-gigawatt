// M23.4 (B1, DT): rich tooltips on Act III's terms and stats. A term is a word on the screen with a dotted underline;
// hovering it, or focusing it with the keyboard, opens a small card with a heading and a plain-language line
// (`term.act3.<id>.title` / `.body`). The card is fixed to the viewport at the term's position, so a scrolling panel
// never clips it (M21.1's panels scroll sideways). It holds no scenario information: the leak guard's rules apply.
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { tDynamic } from '../../i18n/t.ts'

// M24.3: the Prologue's, Act I's and Act II's core terms too (`act` picks term.act<n>.<id>; Act III's are the default).
export function Term(props: {
  id: string
  act?: 0 | 1 | 2 | 3
  children: ComponentChildren
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const key = `term.act${props.act ?? 3}.${props.id}`
  const title = tDynamic(`${key}.title`, '')
  const body = tDynamic(`${key}.body`, '')
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
      onFocus={open}
      onMouseLeave={() => setAt(null)}
      onBlur={() => setAt(null)}
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
        </span>
      )}
    </span>
  )
}
