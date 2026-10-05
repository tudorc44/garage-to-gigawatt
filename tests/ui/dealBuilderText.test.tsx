// @vitest-environment happy-dom
// Hotfix 2 (owner bug report, 6 Oct 2026): the Deal builder's notes join with " · " or a full stop, never run together
// ("retrofit $1.5Bfunds …"); one year reads "1 yr"; a rating note shows "B+, rising", not "(B+ (rising))". The note cells'
// wrapping (no sideways scroll) is a stylesheet rule, checked in tests/ui/dialogLayout.test.ts and in a browser.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Action } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { ProjectsSection } from '../../src/ui/screens/Projects.tsx'
import { act2Company, ok } from '../sim/act2Helpers.ts'

afterEach(cleanup)

/** The dialog's text, one table cell per line (textContent alone would run neighbouring cells together). */
function dealText(s: GameState): string {
  const act = vi.fn<(a: Action) => null>(() => null)
  render(<ProjectsSection state={s} act={act} />)
  fireEvent.click(screen.getByRole('button', { name: 'Open deal builder' }))
  const dialog = screen.getByRole('dialog')
  const cells = [...dialog.querySelectorAll('td')].map((c) => c.textContent)
  return [dialog.textContent, ...cells].join('\n')
}

/** The table cells only. */
const cellsOf = (text: string) => text.split('\n').slice(1)

/** A project of `kind` with the first offer whose card passes `pick` signed (seeds 1–40), or null. */
function signed(
  kind: 'cloud' | 'shell',
  pick: (card: string) => boolean,
): GameState | null {
  for (let seed = 1; seed <= 40; seed++) {
    const s = ok(act2Company('2023Q3', seed), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: kind === 'cloud' ? 2000 : 5000,
      kind,
      ...(kind === 'cloud' ? { gpu: 'h100' as const } : {}),
    })
    const offer = s.projects[0].offers.find((o) => pick(o.card))
    if (offer)
      return ok(s, {
        type: 'PROJECT_SIGN_TENANT',
        projectId: 'project-1',
        offerId: offer.id,
      })
  }
  return null
}

describe('the Deal builder text (hotfix 2)', () => {
  it('a cloud with a signed GPU contract: the notes join cleanly', () => {
    const s = signed('cloud', () => true)!
    const text = dealText(s)
    expect(text).toMatch(/GPUs \$[\d.]+[KMB]? \+ retrofit \$[\d.]+[KMB]?/)
    for (const cell of cellsOf(text)) expect(cell).not.toMatch(/[KMB0-9]funds/)
    expect(text).toMatch(/GPU know-how \d\. Not used while a GPU contract is signed/)
    expect(text).not.toMatch(/\b1 yrs\b/)
  })

  it('a shell tenant with a rating note: "B+, rising", no nested brackets', () => {
    const s = signed('shell', (c) => c === 'tc_realname_coreweave_style')
    expect(s).not.toBeNull()
    const text = dealText(s!)
    expect(text).toContain('(B+, rising)')
    expect(text).not.toMatch(/\([^()]*\(/)
    // This tenant funds part of the capex: the credit note stands on its own or follows another part after " · ".
    const capex = cellsOf(text).find((c) => c.includes('of the capex'))
    expect(capex).toMatch(/^(.+ · )?funds \$[\d.]+[KMB]? of the capex/)
  })
})
