// @vitest-environment happy-dom
// M37.3-M37.6 (doc 39): the Finances section. The P&L shows by line, by business and by site; the cash flow ends on
// the game's cash; an old save says where full detail starts; the quarter report's block opens the section.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { playGame } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import type { GameState } from '../../src/sim/state.ts'
import { FinancesSection } from '../../src/ui/screens/Finances.tsx'
import { fmt } from '../../src/ui/format.ts'
import { BOTS } from '../../tools/bots.ts'

afterEach(cleanup)

const played = playGame(4, BOTS.cautious).state

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

describe('the Finances section', () => {
  it('the P&L by line: revenue, operating costs, EBITDA, net profit; the no-depreciation note', () => {
    const { container } = render(<FinancesSection state={played} />)
    const text = container.textContent!
    expect(text).toMatch(/(Bitcoin|Ether) mined \(value when mined\)/)
    expect(text).toContain('Total operating costs')
    expect(text).toContain('EBITDA')
    expect(text).toContain('Net profit')
    expect(text).toContain('No depreciation')
    // the last completed quarter beside the one before
    expect(text).toContain(fmt.quarter(played.reports.at(-1)!.quarter))
    expect(text).toContain(fmt.quarter(played.reports.at(-2)!.quarter))
  })

  it('by business and by site', () => {
    const { container } = render(<FinancesSection state={played} />)
    click('By business')
    expect(container.textContent).toContain('Mining')
    click('By site')
    expect(container.textContent).toContain('Not allocated to a site')
    expect(container.textContent).toContain('Garage')
  })

  it('the cash flow ends on the game’s cash, with the weekly chart', () => {
    const { container } = render(<FinancesSection state={played} />)
    click('Career')
    fireEvent.click(screen.getByRole('tab', { name: 'Cash flow' }))
    const rows = [...container.querySelectorAll('tr')].map((r) => r.textContent!)
    const end = rows.find((r) => r.startsWith('Ending cash'))!
    expect(end).toContain(fmt.money(played.cash))
    expect(container.querySelector('.fin-chart svg')).not.toBeNull()
    expect(container.textContent).toMatch(/Why cash (fell|rose) this period/)
  })

  it('an old save (from before the ledger) says where full detail starts', () => {
    // (happy-dom's import.meta.url isn't a file URL: the fixture is read from the project root)
    const r = restoreSave(JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/saves/v1-plan-2021Q2.json'), 'utf8')))
    const s = (r as { state: GameState }).state
    const { container } = render(<FinancesSection state={s} />)
    click('Year')
    expect(container.textContent).toContain('Full detail from Q2 2021')
    expect(container.textContent).toContain('Revenue (summary only)')
  })
})
