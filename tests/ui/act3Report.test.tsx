// @vitest-environment happy-dom
// M15.5: the Act III chapter report (A3-11), rendered from fixture reveal records: the s1 golden record; s0
// with a decoy penalty; a game over before the trigger (s1 out at 2027Q3); a null score (s2 out at 2027Q2);
// no moves; 12 moves (no labels on the timeline, 12 rows in the list).
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import goldenS1 from '../golden/act3-s1-seed-1.json' with { type: 'json' }
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import type { Act3MoveKind, GameState } from '../../src/sim/state.ts'
import { buildAct3End } from '../../src/sim/systems/act3End.ts'
import { Act3Reveal } from '../../src/ui/screens/Act3Reveal.tsx'

const text = en as Record<string, string>
const FIRST = actFirstQuarter(3)

afterEach(cleanup)

/** The s1 golden end state (the chapter phase), its reveal record rebuilt from its own moves. */
function golden(): GameState {
  return structuredClone(goldenS1) as unknown as GameState
}

/** A variant: scenario, moves, and where it ended (a game over at `outQ`, else the chapter phase). */
function variant(o: {
  scenario?: 's0' | 's1' | 's2' | 's3'
  moves?: { q: number; kind: Act3MoveKind }[]
  outQ?: number
}): GameState {
  const s = golden()
  if (o.scenario) s.scenarioId = o.scenario
  if (o.moves) s.act3Moves = o.moves
  if (o.outQ !== undefined) {
    s.quarter = FIRST + o.outQ
    s.phase = 'gameover'
  }
  s.act3End = buildAct3End(s, o.outQ !== undefined)
  return s
}

function show(state: GameState) {
  const onNew = vi.fn()
  const view = render(<Act3Reveal state={state} onNew={onNew} />)
  return { ...view, onNew }
}

const ticks = (c: Element) => c.querySelectorAll('[data-tick]')
const marks = (c: Element) =>
  [...c.querySelectorAll('[data-move-mark]')].map((e) =>
    e.getAttribute('data-move-mark'),
  )

describe('the s1 golden record', () => {
  it('shows the scenario, the trigger and the false alarm; 16 ticks; the trigger rule and the decoy band where the record says', () => {
    const s = golden()
    s.act3End = buildAct3End(s)
    const e = s.act3End
    const { container } = show(s)
    const body = container.textContent ?? ''
    expect(body).toContain(e.scenarioName)
    expect(body).toContain(text[`event.${e.trigger.cardId}.title`])
    expect(body).toContain(text['act3.reveal.s1.trigger'])
    expect(body).toContain(text['act3.reveal.s1.decoy_reason'])
    expect(body).toContain(text['act3.reveal.s1.decoy_tell'])
    expect(ticks(container)).toHaveLength(16)
    expect(
      container.querySelector('[data-trigger]')!.getAttribute('data-trigger'),
    ).toBe(String(e.trigger.q))
    const band = container.querySelector('[data-decoy-from]')!
    expect(band.getAttribute('data-decoy-from')).toBe(String(e.decoy.fromQ))
    expect(band.getAttribute('data-decoy-to')).toBe(String(e.decoy.toQ))
    expect(marks(container)).toEqual(e.moves.map((m) => m.mark))
    // the reading title is the headline; its band chip is filled
    const on = container.querySelectorAll('[data-on="true"]')
    expect(on).toHaveLength(1)
    expect(on[0].getAttribute('data-band')).toBe(e.readingTitleId)
    // the rivals: the two D15 fates are withheld
    expect(
      container.querySelectorAll('[data-rival]').length,
    ).toBe(e.rivalFates.length)
    expect(body.split(text['ui.act3.reveal.withheld']).length - 1).toBe(2)
  })

  it('the "How this was scored" disclosure is collapsed by default and opens on click', () => {
    const s = golden()
    s.act3End = buildAct3End(s)
    const { container } = show(s)
    expect(container.querySelector('[data-how-scored]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /How this was scored/ }))
    const how = container.querySelector('[data-how-scored]')!
    expect(how).not.toBeNull()
    expect(how.querySelectorAll('.reveal-cell')).toHaveLength(16)
  })

  it('Continue fires its action', () => {
    const s = golden()
    s.act3End = buildAct3End(s)
    const { onNew } = show(s)
    fireEvent.click(screen.getByRole('button', { name: text['act3.reveal.continue'] }))
    expect(onNew).toHaveBeenCalledOnce()
  })
})

describe('the variants', () => {
  it('s0 with a decoy penalty: the "Base · decoy penalty" line, and the move marked as a decoy reaction', () => {
    // s0's decoy window is 2027Q3–2028Q1 (q 2–4), wrong stance −1.
    const s = variant({
      scenario: 's0',
      moves: [
        { q: 2, kind: 'sale_voluntary' },
        { q: 3, kind: 'debt_repay' },
      ],
    })
    const e = s.act3End!
    expect(e.reading.penalty).toBe(20)
    const { container } = show(s)
    const line = container.querySelector('[data-penalty]')!
    expect(line.textContent).toContain(`−${e.reading.penalty}`)
    expect(line.textContent).toContain(String(e.reading.base))
    expect(marks(container)).toEqual(['decoy', 'decoy'])
    expect(container.textContent).toContain(text['act3.reveal.decoy_reacted'])
  })

  it('no penalty line without a penalty', () => {
    const s = golden()
    s.act3End = buildAct3End(s)
    expect(s.act3End.reading.penalty).toBe(0)
    const { container } = show(s)
    expect(container.querySelector('[data-penalty]')).toBeNull()
  })

  it('a game over before the trigger (s1 out at 2027Q3): later ticks greyed, the Out marker, the trigger "(after you left)"', () => {
    const s = variant({ outQ: 2 })
    const e = s.act3End!
    const { container } = show(s)
    expect(container.textContent).toContain(
      `Out of the game · ${CONTENT.quarters[FIRST + 2].slice(4)}`,
    )
    const out = [...ticks(container)].filter(
      (t) => t.getAttribute('data-out') === 'true',
    )
    expect(out).toHaveLength(13) // q 3–15
    expect(
      container.querySelector('[data-out-marker]')!.getAttribute('data-out-marker'),
    ).toBe('2')
    expect(e.trigger.q).toBeGreaterThan(2)
    expect(container.textContent).toContain(
      text['act3.reveal.timeline_after_you_left'],
    )
  })

  it('a null score (s2 out at 2027Q2): "—" and the not-enough line, no band filled', () => {
    const s = variant({ scenario: 's2', outQ: 1, moves: [] })
    expect(s.act3End!.reading.score).toBeNull()
    const { container } = show(s)
    expect(container.querySelector('[data-score]')!.textContent).toBe('—')
    expect(container.textContent).toContain(text['act3.reveal.not_enough'])
    expect(container.querySelectorAll('[data-on="true"]')).toHaveLength(0)
  })

  it('no moves: the axis, trigger and decoy only, and "You made no big moves."', () => {
    const s = variant({ moves: [] })
    const { container } = show(s)
    expect(container.querySelectorAll('[data-move-mark]')).toHaveLength(0)
    expect(ticks(container)).toHaveLength(16)
    expect(container.querySelector('[data-trigger]')).not.toBeNull()
    expect(container.querySelector('[data-decoy-from]')).not.toBeNull()
    expect(container.textContent).toContain(text['act3.reveal.no_moves'])
  })

  it('12 moves: markers only on the timeline (no labels), 12 rows in the list', () => {
    const kinds: Act3MoveKind[] = ['project_commit', 'sale_voluntary', 'debt_draw']
    const moves = Array.from({ length: 12 }, (_, i) => ({
      q: i,
      kind: kinds[i % 3],
    }))
    const s = variant({ moves })
    const { container } = show(s)
    expect(container.querySelectorAll('[data-move-mark]')).toHaveLength(12)
    expect(container.querySelectorAll('[data-move-label]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-move-row]')).toHaveLength(12)
    expect(marks(container)).toEqual(s.act3End!.moves.map((m) => m.mark))
  })

  it('4 moves or fewer: each marker has its label on the timeline', () => {
    const s = variant({
      moves: [
        { q: 1, kind: 'sale_voluntary' },
        { q: 6, kind: 'project_commit' },
      ],
    })
    const { container } = show(s)
    expect(container.querySelectorAll('[data-move-label]')).toHaveLength(2)
  })
})
