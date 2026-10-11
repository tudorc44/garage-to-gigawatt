// The megawatts a company holds, by kind (M57.2, doc 43 §15.1's megawatt title; moved here in M62.3 so the Act V
// dashboard's MW strip can show the same split during play: nothing here reads the future or a hidden file).
import type { GameState } from '../state.ts'
import { isPlant } from './plants.ts'
import { poweredKw } from './sites.ts'

/**
 * The megawatts you ended with (doc 43 §15.1 ⚙ names the titles only; the split is mine, reversible): orbital (live
 * blocks), leased (shells with a tenant, and blocks brought home), flexible (load enrolled as curtailable), and firm:
 * the rest of your energized ground plus your share of running plants' MW. The title is the largest.
 */
export function megawattMix(state: GameState) {
  const groundMw = state.sites.reduce((a, s) => a + poweredKw(s, state.quarter), 0) / 1000
  const flexible = Math.min(groundMw, state.sites.reduce((a, s) => a + (s.flexKw ?? 0), 0) / 1000)
  const orbital = (state.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'live').reduce((a, b) => a + b.mw * b.capacity, 0)
  const landlord = Math.min(
    groundMw - flexible,
    state.projects.filter((p) => p.stage === 'live' && p.kind === 'shell' && p.tenant).reduce((a, p) => a + p.kw, 0) / 1000 +
      (state.act5Homed ?? []).reduce((a, h) => a + h.kw, 0) / 1000,
  )
  const firm =
    Math.max(0, groundMw - flexible - landlord) +
    (state.ventures ?? []).filter((v) => isPlant(state, v)).reduce((a, v) => a + v.stake * v.mw, 0)
  const mix = { firm, flexible, orbital, landlord }
  const title = (Object.entries(mix) as [keyof typeof mix, number][]).sort((a, b) => b[1] - a[1])[0]
  return { ...mix, titleId: title[1] > 0 ? title[0] : 'landlord' }
}

