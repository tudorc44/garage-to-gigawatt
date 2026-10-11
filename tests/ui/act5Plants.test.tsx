// @vitest-environment happy-dom
// M52 (doc 43 §7, §11, §14.1): Act V's plants on the Ventures page. A running plant you hold a stake in shows what
// your share earns and is worth, with its three actions (plant debt, a fund sale, an output contract); a developer's
// next unit shows with its commit button. The buttons dispatch the sim's actions.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import type { Action } from '../../src/sim/actions.ts'
import { toAct5 } from '../../src/sim/state.ts'
import { VenturesSection } from '../../src/ui/screens/Ventures.tsx'
import { QueuePanel } from '../../src/ui/screens/Act5Queue.tsx'
import { endQuarterQueue } from '../../src/sim/systems/queue.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

afterEach(cleanup)

describe('Act V plants on the Ventures page (M52)', () => {
  it('shows the Firm Builder’s running plant with its actions, and the next EGS unit; the buttons dispatch', () => {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    const end = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as 'btm' })
    const s = toAct5(end, { vfuture: 'v1' })
    const sent: Action[] = []
    const act = (a: Action) => {
      sent.push(a)
      return null
    }
    const v = render(<VenturesSection state={s} act={act as never} />)
    const panel = v.container.querySelector('[data-plants]')!
    expect(panel).not.toBeNull()
    expect(panel.querySelector('[data-plant]')).not.toBeNull()
    expect(panel.querySelector('[data-follow-on="egs"]')).not.toBeNull()
    const button = (text: RegExp) => [...panel.querySelectorAll('button')].find((b) => text.test(b.textContent ?? ''))!
    button(/Plant debt/).click()
    button(/Sell half/).click()
    button(/Contract 80%/).click()
    expect(sent.map((a) => a.type)).toEqual(['ARRANGE_PLANT_DEBT', 'SELL_PLANT_STAKE', 'CONTRACT_PLANT_OUTPUT'])
  })

  it('M53: the Projects page shows the grid queue in Act V: a position with its study bill and actions', () => {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    const s = toAct5(playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as 'btm' }), { vfuture: 'v1' })
    const site = s.sites.find((x) => x.tier !== 'garage')!
    s.projects.push({ ...structuredClone(s.projects[0]), id: 'pq', n: 99, siteId: site.id, kw: 5000, stage: 'building', tenant: null, startQuarter: s.quarter, readyQuarter: s.quarter + 12 } as never)
    ;(site.powerAdds ??= []).push({ projectId: 'pq', kw: 5000, source: 'grid', readyQuarter: s.quarter + 12 })
    endQuarterQueue(s)
    s.quarter += 1
    const sent: Action[] = []
    const v = render(<QueuePanel state={s} act={(a) => (sent.push(a), null)} />)
    const row = v.container.querySelector('[data-position="pq"]')!
    expect(row.textContent).toMatch(/Hall #99/)
    expect(row.textContent).toMatch(/upgrade bill/)
    ;[...row.querySelectorAll('button')].find((b) => /Pay the upgrades/.test(b.textContent ?? ''))!.click()
    expect(sent).toEqual([{ type: 'PAY_UPGRADE', projectId: 'pq' }])
  })
})
