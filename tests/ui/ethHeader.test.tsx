// @vitest-environment happy-dom
// M67.5 (doc 43 §0.24 item 5): the quarter report's header shows the ETH price only to a company that holds ETH (in its
// treasury) or mined some this quarter; any other company sees the bitcoin price alone. UI only.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { GameState } from '../../src/sim/state.ts'
import { preloadAct3Panels } from '../../src/ui/components/act3Lazy.tsx'
import { preloadAct4Panels } from '../../src/ui/components/act4Lazy.tsx'
import { holdsEth } from '../../src/ui/mining.ts'
import { ReportScreen } from '../../src/ui/screens/Report.tsx'
import goldenV4 from '../golden/act5-v4-seed-1.json' with { type: 'json' }

afterEach(cleanup)
beforeAll(async () => {
  await preloadAct3Panels()
  await preloadAct4Panels()
}, 0)
const act = () => null
const noop = () => {}

/** The act5-v4 golden's last report: a company with no ETH. */
function noEth(): GameState {
  const s = structuredClone(goldenV4) as unknown as GameState
  s.treasury.ETH = 0
  s.reports.at(-1)!.coinsMined.ETH = 0
  return s
}
const headerOf = (s: GameState) => {
  const head = render(<ReportScreen state={s} act={act} onGameOver={noop} />).container.querySelector('.report-head')!
  return head.textContent ?? ''
}

describe('the report header\'s ETH price', () => {
  it('a company with no ETH sees the bitcoin price and no ETH', () => {
    const s = noEth()
    expect(holdsEth(s, s.reports.at(-1)!)).toBe(false)
    const head = headerOf(s)
    expect(head).toContain('BTC $')
    expect(head).not.toContain('ETH')
  })

  it('a company that holds ETH in its treasury sees it', () => {
    const s = noEth()
    s.treasury.ETH = 3
    expect(holdsEth(s, s.reports.at(-1)!)).toBe(true)
    expect(headerOf(s)).toContain('ETH $')
  })

  it('a company that mined ETH this quarter sees it', () => {
    const s = noEth()
    s.reports.at(-1)!.coinsMined.ETH = 0.5
    expect(holdsEth(s, s.reports.at(-1)!)).toBe(true)
    expect(headerOf(s)).toContain('ETH $')
  })
})
