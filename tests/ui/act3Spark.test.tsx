// @vitest-environment happy-dom
// M25.3 (DT): the Signals panel's sparklines (A3-03: "sparkline of past quarters only"). Each indicator's line is the
// displayed values the player has already seen: the past Act III quarters' (signalsPanel's history) and this quarter's.
// Never a future quarter, never the scenario's market file, nothing a reveal could read from.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { CONTENT, SCENARIO_IDS } from '../../src/content/index.ts'
import { signalsPanel } from '../../src/sim/selectors.ts'
import { Act3SignalsPanel } from '../../src/ui/screens/Act3Panels.tsx'
import { act3ScenarioCompany } from '../sim/act3Helpers.ts'

afterEach(cleanup)

const atQuarter = (id: (typeof SCENARIO_IDS)[number], q: string) => {
  const s = act3ScenarioCompany(id, 1)
  s.quarter = CONTENT.quarters.indexOf(q)
  return s
}

describe('Signals sparklines (M25.3)', () => {
  it.each(SCENARIO_IDS)('%s: at 2028Q2 each line is the 6 quarters played so far, as displayed', (id) => {
    const s = atQuarter(id, '2028Q2')
    const v = signalsPanel(s)!
    const { container } = render(<Act3SignalsPanel state={s} act={() => null} />)
    const sparks = [...container.querySelectorAll('[data-spark]')]
    expect(sparks).toHaveLength(v.indicators.length)
    v.indicators.forEach((ind, i) => {
      const shown = [...ind.history.map((p) => p.displayed), ind.current!.displayed]
      expect(sparks[i].getAttribute('data-spark')).toBe(shown.join(','))
      expect(shown).toHaveLength(6) // 2027Q1 … 2028Q2
      // the file's series has later quarters; none of them is on the line
      const series = CONTENT.signals[id].find((x) => x.id === ind.id)!.series
      expect(series.length).toBeGreaterThan(6)
      expect(series.slice(0, 6).map((p) => p.displayed)).toEqual(shown)
    })
  })

  it('the first Act III quarter has nothing to join yet: no line', () => {
    const s = atQuarter('s0', '2027Q1')
    const { container } = render(<Act3SignalsPanel state={s} act={() => null} />)
    expect(container.querySelector('[data-spark]')).toBeNull()
  })

  it('the panel source reads the lines from signalsPanel only (no market file, no hidden view)', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync('src/ui/screens/Act3Panels.tsx', 'utf8')
    const spark = src.slice(src.indexOf('export function SignalSpark'), src.indexOf('/** The Signals panel'))
    expect(spark).not.toMatch(/market|CONTENT|signalsHidden|scenario/i)
    // its points: the panel view's history and current value
    expect(src).toMatch(/<SignalSpark[\s\S]{0,200}i\.history\.map\(\(p\) => p\.displayed\)[\s\S]{0,80}i\.current\.displayed/)
  })
})
