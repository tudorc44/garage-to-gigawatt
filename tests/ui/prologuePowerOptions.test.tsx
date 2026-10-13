// @vitest-environment happy-dom
// Owner bug (13 Oct 2026): in the Prologue, "Power options" on the home rig opened nothing and the console showed
// "Cannot read properties of undefined (reading 'capacity_kw')". EnergyDialog's title used siteLong, which reads the room's
// size from Act I's tier table; the Prologue's bedroom and home rig are household tiers defined in prologue.json.
import { cleanup, render } from '@testing-library/preact'
import { afterEach, describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import { energyCardView } from '../../src/sim/energyViews.ts'
import type { GameState } from '../../src/sim/state.ts'
import { EnergyDialog } from '../../src/ui/components/energyDialog.tsx'
import { siteLong, siteName } from '../../src/ui/names.ts'

afterEach(cleanup)

/** A Prologue game in its first Plan phase with the home rig built (cash for it). */
function withHomeRig(): GameState {
  const r = applyAction(newPrologueGame(3), { type: 'START_PROLOGUE' })
  if (!r.ok) throw new Error(r.error.key)
  const rig = applyAction({ ...r.state, cash: 1e6 }, { type: 'P0_BUILD_HOME_RIG' })
  if (!rig.ok) throw new Error(rig.error.key)
  return rig.state
}

describe('Power options in the Prologue', () => {
  it('a household room has a long name (its short name) and no tier lookup crash', () => {
    const s = withHomeRig()
    for (const site of s.sites) expect(() => siteLong(s, site)).not.toThrow()
    const rig = s.sites.at(-1)!
    expect(siteLong(s, rig)).toBe(siteName(rig))
  })

  it('the Power options dialog opens on the home rig and shows its title', () => {
    const s = withHomeRig()
    const rig = s.sites.at(-1)!
    expect(energyCardView(s, rig.id)).toBeTruthy()
    const view = render(<EnergyDialog state={s} act={() => null} siteId={rig.id} onClose={() => {}} />)
    const text = view.container.ownerDocument.body.textContent ?? ''
    expect(text).toContain(siteName(rig))
    expect(text).toContain('Power options')
  })
})
