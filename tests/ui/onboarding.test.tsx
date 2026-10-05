// @vitest-environment happy-dom
// M24.2 / M24.3 (DT): onboarding across all acts. The Prologue's and Act I's tips use the same box as Act II's and
// Act III's (dismissed for good per act as "act<n>.<id>"; Settings brings them all back); Act I's tips sit only on Act
// I screens; every new tip and term text is free of the leak guard's words.
import { cleanup, fireEvent, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { readDismissedTips, resetDismissedTips } from '../../src/platform/tips.ts'
import { newGame } from '../../src/sim/state.ts'
import { Tip } from '../../src/ui/components/basics.tsx'
import { FleetPanel } from '../../src/ui/screens/Plan.tsx'
import { act2Company } from '../sim/act2Helpers.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const text = en as Record<string, string>
export const TIPS = {
  0: ['rig', 'household', 'mining', 'coins', 'machines', 'live'],
  1: ['todo', 'market', 'fleet', 'sell', 'live', 'report'],
} as const

describe('onboarding tips for the Prologue and Act I (M24.2)', () => {
  it('every tip has its text (one or two sentences)', () => {
    for (const [act, ids] of Object.entries(TIPS))
      for (const id of ids) {
        const s = text[`tooltip.act${act}.${id}`]
        expect(s, `${act}.${id}`).toBeTruthy()
        expect(s.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length).toBeLessThanOrEqual(2)
      }
  })

  it('dismissed per act ("act0.live" and "act1.live" are different tips); Settings resets all', () => {
    const a = render(<Tip id="live" act={0} />)
    fireEvent.click(a.getByText('Got it'))
    cleanup()
    const b = render(<Tip id="live" act={1} />)
    expect(b.container.querySelector('[data-tip="act1.live"]')).not.toBeNull()
    fireEvent.click(b.getByText('Got it'))
    expect(readDismissedTips()).toEqual(['act0.live', 'act1.live'])
    resetDismissedTips()
    cleanup()
    expect(render(<Tip id="live" act={0} />).container.querySelector('[data-tip]')).not.toBeNull()
  })

  it('Act I’s tips show on Act I screens only (the fleet panel is shared with Act II)', () => {
    const act1 = render(<FleetPanel state={newGame(1)} />)
    expect(act1.container.querySelector('[data-tip="act1.fleet"]')).not.toBeNull()
    cleanup()
    const act2 = render(<FleetPanel state={act2Company('2024Q1')} />)
    expect(act2.container.querySelector('[data-tip="act1.fleet"]')).toBeNull()
  })

  it('no new tip text uses a word the leak guard forbids', () => {
    const all = Object.entries(text)
      .filter(([k]) => /^tooltip\.act[01]\./.test(k))
      .map(([, v]) => v)
      .join(' ')
    expect(all).not.toMatch(/trigger|decoy|false alarm|Muddle Through|Great Repricing|Lift-Off|Efficiency Shock/i)
  })
})
