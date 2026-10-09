// M34.2 (owner, 9 Oct 2026, 3e; doc 35 §2: every short name is a link): a sentence (an alert, a log line, a to-do row)
// with each current site's short name in it turned into a link to its card. A site that's gone stays plain text.
// (Its own file, so the basic components can use it without importing the site-name components.)
import { useContext } from 'preact/hooks'
import { SiteCardContext } from './siteCardContext.ts'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Inside a button (a to-do row) the link is a span that opens the card without running the row's action. */
export function SiteText({ text, inButton = false }: { text: string; inButton?: boolean }) {
  const card = useContext(SiteCardContext)
  if (!card || card.names.size === 0) return <>{text}</>
  // longest names first, and never the start of a longer number ("Own site 1" in "Own site 12")
  const names = [...card.names.keys()].sort((a, b) => b.length - a.length)
  const re = new RegExp(`(${names.map(escape).join('|')})(?![0-9])`, 'g')
  const parts = text.split(re)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((part, i) => {
        const id = i % 2 === 1 ? card.names.get(part) : undefined
        if (!id) return part
        const open = (e: Event) => {
          e.stopPropagation()
          e.preventDefault()
          card.open(id)
        }
        return inButton ? (
          <span
            key={i}
            class="site-name site-link"
            role="link"
            tabIndex={0}
            data-site-link={id}
            onClick={open}
            onKeyDown={(e) => e.key === 'Enter' && open(e)}
          >
            {part}
          </span>
        ) : (
          <button key={i} type="button" class="site-name site-link" data-site-link={id} onClick={open}>
            {part}
          </button>
        )
      })}
    </>
  )
}
