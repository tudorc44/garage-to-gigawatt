// @vitest-environment happy-dom
// M23.4 (B1, DT): Act III clarity polish. The renewal wall (A3-04: MW coming due per quarter from end dates only, and
// the rent due in the next 4 / 8 quarters); rich tooltips on Act III terms (a card on hover or focus); onboarding tips
// (dismissible, gone for good, back from Settings › Onboarding tips › Show them again). New text: no leak-guard words.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import en from '../../src/i18n/en.json' with { type: 'json' }
import contentText from '../../src/i18n/content.en.json' with { type: 'json' }
import { readDismissedTips } from '../../src/platform/tips.ts'
import { contractCalendar, renewalWallView } from '../../src/sim/selectors.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'
import { Tip } from '../../src/ui/components/basics.tsx'
import { SettingsDialog } from '../../src/ui/components/saves.tsx'
import { Term } from '../../src/ui/components/term.tsx'
import { ContractsSection } from '../../src/ui/screens/Act3Panels.tsx'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const content = contentText as Record<string, string>
let shell: GameState
beforeAll(async () => {
  shell = toAct3(await quickStartCompany('shell'), { scenario: 's0' })
}, 60_000)

describe('the renewal wall (A3-04)', () => {
  it('sums every contract’s MW into its end quarter (holdovers now), 16 bars, and the rent due in 4 and 8 quarters', () => {
    const v = renewalWallView(shell)!
    expect(v.bars).toHaveLength(16)
    expect(v.bars[0].label).toBe('2027Q1')
    expect(v.bars.at(-1)!.label).toBe('2030Q4')
    expect(v.bars.filter((b) => b.current).map((b) => b.label)).toEqual(['2027Q1'])
    const cal = contractCalendar(shell).filter((e) => e.endQuarter !== null && e.endQuarter <= v.bars.at(-1)!.quarter)
    const shellMw = cal.filter((e) => e.kind === 'shell').reduce((a, e) => a + (e.mw ?? 0), 0)
    expect(v.bars.reduce((a, b) => a + b.shellMw, 0)).toBeCloseTo(shellMw, 6)
    expect(v.maxMw).toBeGreaterThan(0) // this company has a lease ending inside Act III
    expect(v.due8Usd).toBeGreaterThanOrEqual(v.due4Usd)
  })

  it('renders above the contracts table: 16 columns, the note, the rent lines; null outside Act III', () => {
    const { container } = render(<ContractsSection state={shell} act={() => null} />)
    const wall = container.querySelector('[data-renewal-wall]')!
    expect(wall).not.toBeNull()
    expect(wall.querySelectorAll('[data-wall-quarter]')).toHaveLength(16)
    expect(wall.textContent).toContain(en['ui.act3.wall.note'])
    expect(wall.textContent).toContain('Rent coming due in the next 4 quarters')
    expect(renewalWallView({ ...shell, act: 2 } as GameState)).toBeNull()
  })
})

describe('rich tooltips on Act III terms', () => {
  it('hover or focus opens a card with the term’s title and line; leaving closes it', () => {
    const { container } = render(<Term id="renewal_wall">Renewal wall</Term>)
    const term = container.querySelector('[data-term="renewal_wall"]')!
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    fireEvent.mouseEnter(term)
    const card = container.querySelector('[role="tooltip"]')!
    // (M25.1: the card reads the glossary's keys)
    expect(card.textContent).toContain(content['glossary_term.renewal_wall'])
    expect(card.textContent).toContain(content['glossary.renewal_wall'])
    fireEvent.mouseLeave(term)
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    fireEvent.focus(term)
    expect(container.querySelector('[role="tooltip"]')).not.toBeNull()
  })

  it('an unknown term is plain text', () => {
    const { container } = render(<Term id="nope">x</Term>)
    expect(container.querySelector('.term')).toBeNull()
  })
})

describe('onboarding tips (Act III) and Settings › Show them again', () => {
  it('a tip shows until "Got it", then never again; Settings brings every tip back', () => {
    const first = render(<Tip id="signals" act={3} />)
    expect(first.container.textContent).toContain(en['tooltip.act3.signals'].slice(0, 30))
    fireEvent.click(first.getByText('Got it'))
    expect(first.container.querySelector('[data-tip]')).toBeNull()
    expect(readDismissedTips()).toEqual(['act3.signals'])
    cleanup()
    expect(render(<Tip id="signals" act={3} />).container.querySelector('[data-tip]')).toBeNull()
    cleanup()
    const s = render(<SettingsDialog onClose={() => {}} />)
    fireEvent.click(s.container.querySelector('[data-tips-reset]')!)
    expect(readDismissedTips()).toEqual([])
    expect(s.container.querySelector('[data-tips-reset]')!.textContent).toBe(en['ui.settings.tips_done'])
    cleanup()
    expect(render(<Tip id="signals" act={3} />).container.querySelector('[data-tip]')).not.toBeNull()
  })

  it('Act II tips keep their ids (no clash with Act III’s)', () => {
    const r = render(<Tip id="projects" />)
    fireEvent.click(r.getByText('Got it'))
    expect(readDismissedTips()).toEqual(['projects'])
  })

  it('no new Act III text uses a word the leak guard forbids during play', () => {
    // (M25.1: every term's text now lives in the glossary, which Settings shows during play: all of it is checked)
    const text = Object.entries({ ...en, ...content })
      .filter(([k]) => /^(tooltip|term)\.act3\.|^ui\.act3\.wall\.|^glossary(_short|_term)?\./.test(k))
      .map(([, v]) => v)
      .join(' ')
    expect(text.length).toBeGreaterThan(500)
    expect(text).not.toMatch(/trigger|decoy|false alarm|Muddle Through|Great Repricing|Lift-Off|Efficiency Shock/i)
  })
})
