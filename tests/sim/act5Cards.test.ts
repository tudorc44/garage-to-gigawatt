// M58.3-5 (doc 43 §0.15 fixes 3-5): enrolling existing load as curtailable (every future), every events_v.json card
// wired with its reading sign, and the end-of-life card's body (neutral until the future's trigger card has played).
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, V_FUTURE_IDS, act5Row, actFirstQuarter } from '../../src/content/index.ts'
import { ACT5_CARDS, act5CardEngineId, type Act5CardEffect } from '../../src/content/act5Cards.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { playFrom, type Strategy } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { cardMoveKind, eolBodyKey, scheduleAct5Cards, triggerQuarterV } from '../../src/sim/systems/act5Cards.ts'
import { enrollableKw, flexPayments } from '../../src/sim/systems/flex.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { ACT5_MOVE_SIGN } from '../../src/sim/systems/readingScoreV.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

let fb: GameState | null = null
function firmBuilder(): GameState {
  if (!fb) {
    const p = PRESETS_V.find((x) => x.id === 'firm_builder')!
    fb = playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never })
  }
  return structuredClone(fb)
}
const first5 = actFirstQuarter(5)
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('enrol existing load as curtailable (M58.3)', () => {
  it('is offered in every future from 2036Q1, logs enrol_flexible (−1), and is paid only where the rating is set', () => {
    for (const v of V_FUTURE_IDS) {
      const s = toAct5(firmBuilder(), { vfuture: v })
      const site = s.sites.find((x) => enrollableKw(s, x) > 0)!
      const after = ok(s, { type: 'ENROL_FLEXIBLE', siteId: site.id })
      expect(after.sites.find((x) => x.id === site.id)!.flexKw).toBeGreaterThan(0)
      expect(after.act5Moves!.at(-1)!.kind).toBe('enrol_flexible')
      expect(applyAction(after, { type: 'ENROL_FLEXIBLE', siteId: site.id }).ok).toBe(false)
    }
    // V2 after its trigger pays it (flex_capacity_rating > 0); V1 never does
    const v2 = toAct5(firmBuilder(), { vfuture: 'v2' })
    const late = first5 + 12
    const rated = (s: GameState) => (act5Row(late, scenarioOf(s))?.flex_capacity_rating ?? 0) > 0
    expect(rated(v2)).toBe(true)
    const e2 = ok(v2, { type: 'ENROL_FLEXIBLE', siteId: v2.sites.find((x) => enrollableKw(v2, x) > 0)!.id })
    e2.quarter = late
    expect(flexPayments(e2).length).toBeGreaterThan(0)
    const v1 = toAct5(firmBuilder(), { vfuture: 'v1' })
    const e1 = ok(v1, { type: 'ENROL_FLEXIBLE', siteId: v1.sites.find((x) => enrollableKw(v1, x) > 0)!.id })
    e1.quarter = late
    expect(flexPayments(e1)).toEqual([])
  })
})

describe('events_v.json in play (M58.4)', () => {
  it('loads all 43 cards into Act V’s deck, with opaque ids', () => {
    const deck = CONTENT.events.cards.filter((c) => c.act === 5)
    expect(deck).toHaveLength(ACT5_CARDS.length)
    for (const c of deck) expect(c.id).toMatch(/^a5_[0-9a-f]{8}$/)
  })

  it('every signed choice logs a move of the same sign (raise_rule: the equity raise)', () => {
    for (const c of ACT5_CARDS)
      for (const ch of c.choices) {
        const sign = c.reading_sign?.[ch.label] ?? 0
        if (sign === 0) continue
        const kind = cardMoveKind(ch.effect)
        expect(kind, `${c.id} › ${ch.label}`).not.toBeNull()
        if (sign === 'raise_rule') expect(kind).toBe('equity_raise')
        else expect(ACT5_MOVE_SIGN[kind!], `${c.id} › ${ch.label}`).toBe(sign)
      }
  })

  it('schedules each future’s fixed cards in their quarter in their own future only, the shared ones in every future', () => {
    for (const v of V_FUTURE_IDS) {
      const s = toAct5(firmBuilder(), { vfuture: v })
      const fired = new Set<string>()
      for (let q = first5; q < first5 + 20; q++) {
        s.quarter = q
        scheduleAct5Cards(s)
        for (const e of s.events.queue) fired.add(e.id)
      }
      for (const c of ACT5_CARDS.filter((x) => x.role !== 'interrupt' && x.role !== 'orbit')) {
        const mine = c.future === 'all' || c.future === v
        expect(fired.has(act5CardEngineId(c.id)), `${v} › ${c.id}`).toBe(mine)
      }
    }
  })

  it('plays all four futures choosing every card’s last choice: every effect runs, the act ends, the ledger reconciles', () => {
    const last: Strategy = {
      plan: () => [],
      answer: (s) => {
        const card = CONTENT.events.byId[s.interrupt?.event ?? '']
        return card?.act === 5 ? card.choices.at(-1)!.id : undefined
      },
    }
    for (const v of V_FUTURE_IDS) {
      const run = playFrom(toAct5(firmBuilder(), { vfuture: v, act5Seed: 3 }), last, { through: 5 })
      expect(run.state.phase, v).toBe('chapter')
      expect(unreconciled(run.state)).toEqual([])
      const answered = run.log.filter((x) => x.type === 'RESOLVE_INTERRUPT').length
      expect(answered, v).toBeGreaterThanOrEqual(8)
      // the trigger card's choice (+1 or −1 where signed) is in the move log
      const trig = ACT5_CARDS.find((c) => c.future === v && c.role === 'trigger')!
      const signed = Object.values(trig.reading_sign ?? {}).some((x) => x !== 0)
      if (signed) expect((run.state.act5Moves ?? []).some((m) => m.q === triggerQuarterV(run.state)! - first5)).toBe(true)
    }
  })

  it('the cards’ effect carries the authored card whole (no future name or role tag reaches a screen through the id)', () => {
    for (const c of CONTENT.events.cards.filter((x) => x.act === 5)) {
      const e = (c.choices[0].effects as { act5_card: Act5CardEffect }).act5_card
      expect(c.id).not.toContain(e.card)
    }
  })
})

describe('the end-of-life card’s body (M58.5)', () => {
  it('is neutral until the future’s trigger card has played, then the future’s own', () => {
    for (const v of V_FUTURE_IDS) {
      const s = toAct5(firmBuilder(), { vfuture: v })
      const trig = triggerQuarterV(s)!
      s.quarter = trig
      expect(eolBodyKey(s)).toBe('ui.orbit_eol.neutral_body')
      s.quarter = trig + 1
      const own = ACT5_CARDS.find((c) => c.future === v && c.role === 'orbit')!
      expect(eolBodyKey(s)).toBe(`event.${act5CardEngineId(own.id)}.body`)
    }
  })
})
