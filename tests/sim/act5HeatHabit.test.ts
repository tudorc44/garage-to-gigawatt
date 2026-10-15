// M69.5 (doc 43 §0.26): the Act V perfect reader's one housekeeping habit: at Heat 45 or more on its hottest site it talks to the
// neighbours; if it talked there last quarter and it is still at 45 or more, it pays for noise mitigation. No other bot changes.
import { describe, expect, it } from 'vitest'
import { applyAction } from '../../src/sim/actions.ts'
import { playFrom } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { topHeat } from '../../src/sim/selectors.ts'
import { HEAT_HABIT_AT, act5Bot, complaintAnswer, heatHabit } from '../../tools/act5/bots.ts'
import { act4Company } from './act4Helpers.ts'

let end4: GameState | null = null
function start(): GameState {
  end4 ??= playFrom(act4Company('s0', 'f1'), { plan: () => [] }, { through: 4 }).state
  return toAct5(structuredClone(end4), { vfuture: 'v1' })
}
const setHeat = (s: GameState, value: number, talkedQuarter: number | null = null, mitigated = false) => {
  const id = topHeat(s).site.id
  for (const site of s.sites) s.siteHeat[site.id] = { ...(s.siteHeat[site.id] ?? { load: 0, grievance: 0, shutdownSince: null }), value: site.id === id ? value : 0, mitigated: false, outreachQuarter: null } as never
  s.siteHeat[id].outreachQuarter = talkedQuarter
  s.siteHeat[id].mitigated = mitigated
  return id
}

describe('the perfect reader\'s Heat habit (M69.5)', () => {
  it('does nothing below 45', () => {
    const s = start()
    setHeat(s, HEAT_HABIT_AT - 1)
    expect(heatHabit(s)).toEqual([])
  })

  it('talks to the neighbours at 45 or more', () => {
    const s = start()
    const id = setHeat(s, HEAT_HABIT_AT)
    expect(heatHabit(s)).toEqual([{ type: 'OUTREACH', siteId: id }])
  })

  it('pays for noise mitigation when it talked there last quarter and the site is still at 45 or more', () => {
    const s = start()
    const id = setHeat(s, 52, s.quarter - 1)
    expect(heatHabit(s)).toEqual([{ type: 'MITIGATE_NOISE', siteId: id }])
    // (a site already mitigated is talked to again instead)
    const m = start()
    const mid = setHeat(m, 52, m.quarter - 1, true)
    expect(heatHabit(m)).toEqual([{ type: 'OUTREACH', siteId: mid }])
  })

  it('acts on every site at or above 45, the hottest first (M70.2)', () => {
    const s = start()
    expect(s.sites.length).toBeGreaterThanOrEqual(2)
    const [a, b] = s.sites
    for (const site of s.sites) s.siteHeat[site.id] = { value: 0, load: 0, grievance: 0, mitigated: false, outreachQuarter: null, shutdownSince: null }
    s.siteHeat[a.id].value = 47
    s.siteHeat[b.id].value = 61
    s.siteHeat[b.id].outreachQuarter = s.quarter - 1
    for (const extra of s.sites.slice(2)) s.siteHeat[extra.id].value = 44 // (a site just under the line is left alone)
    expect(heatHabit(s)).toEqual([
      { type: 'MITIGATE_NOISE', siteId: b.id },
      { type: 'OUTREACH', siteId: a.id },
    ])
  })

  it('both actions are ones the player has (the sim accepts them)', () => {
    const s = start()
    const id = setHeat(s, 60)
    expect(applyAction(s, { type: 'OUTREACH', siteId: id }).ok).toBe(true)
    expect(applyAction(s, { type: 'MITIGATE_NOISE', siteId: id }).ok).toBe(true)
  })

  it('only the perfect bot has the habit: the others plan as before', () => {
    const s = start()
    setHeat(s, 60)
    for (const name of ['holder', 'flex', 'seller', 'locker', 'orbit', 'builder', 'balanced', 'overreactor', 'passive'] as const)
      expect(act5Bot(name).plan(s).some((a) => a.type === 'OUTREACH' || a.type === 'MITIGATE_NOISE'), name).toBe(false)
    expect(act5Bot('perfect').plan(s).some((a) => a.type === 'OUTREACH')).toBe(true)
  })
})

describe('the perfect reader answers the neighbour complaint (M71.5, doc 43 §0.28)', () => {
  const withComplaint = () => {
    const s = start()
    const id = setHeat(s, 52)
    s.cash = 5e9
    s.phase = 'live'
    s.interrupt = { id: 'neighbour_complaint', siteId: id, week: 3 } as never
    return { s, id }
  }

  it('takes the answer that leaves the Heat lowest, and never ignores while a better one is open', () => {
    const { s, id } = withComplaint()
    const answer = complaintAnswer(s)!
    expect(['pay', 'mitigate']).toContain(answer)
    const heatAfter = (choice: string) => {
      const t = structuredClone(s)
      const r = applyAction(t, { type: 'RESOLVE_INTERRUPT', choice })
      if (!r.ok) throw new Error(r.error.key)
      return r.state.siteHeat[id].value
    }
    expect(heatAfter(answer)).toBeLessThanOrEqual(heatAfter('ignore'))
    expect(heatAfter(answer)).toBeLessThanOrEqual(heatAfter(answer === 'pay' ? 'mitigate' : 'pay') + 1e-9)
  })

  it('ignores only when it cannot pay for either', () => {
    const { s } = withComplaint()
    s.cash = 0
    expect(complaintAnswer(s)).toBe('ignore')
  })

  it('has no opinion on any other interrupt', () => {
    const s = start()
    s.interrupt = { id: 'power_price_spike', week: 3 } as never
    expect(complaintAnswer(s)).toBeUndefined()
  })

  it('is the perfect bot that has it: the others still answer by default', () => {
    expect(act5Bot('perfect').answer).toBeDefined()
    expect(act5Bot('passive').answer).toBeUndefined()
  })
})
