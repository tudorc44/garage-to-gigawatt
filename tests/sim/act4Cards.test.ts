// M28.4 (doc 33 §16): Act IV's event cards run through the card engine. 8 per future and 8 shared; each future's
// cards fire only in its own future; ids are opaque; every effect is one the engine already applies; the text is in the
// text table word for word; no card text names a future or uses the leak guard's words.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTENT, FUTURE_IDS } from '../../src/content/index.ts'
import { act4CardEngineId, type Act4CardRaw } from '../../src/content/act4Cards.ts'
import { tDynamic } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { signalsHiddenIv } from '../../src/content/signalsHiddenIv.ts'
import { act4Company } from './act4Helpers.ts'

const FILE = JSON.parse(
  readFileSync(new URL('../../src/content/events_iv.json', import.meta.url), 'utf8'),
) as { event_cards: Act4CardRaw[] }

describe('Act IV event cards (M28.4)', () => {
  it('8 per future and 8 shared, each in an Act IV quarter, with an opaque id in Act IV’s deck', () => {
    for (const f of [...FUTURE_IDS, 'all'] as const)
      expect(FILE.event_cards.filter((c) => c.future === f), f).toHaveLength(8)
    const deck = CONTENT.events.cards.filter((c) => c.act === 4)
    expect(deck).toHaveLength(40)
    for (const c of deck) {
      expect(c.id).toMatch(/^a4_[0-9a-f]{8}$/)
      expect(c.quarterIndex! >= 56 && c.quarterIndex! <= 75).toBe(true)
      for (const ch of c.choices) expect(ch.effects).not.toHaveProperty('deferred')
    }
  })

  it('each future’s trigger card is the one its Signals file names, in its trigger quarter', () => {
    for (const f of FUTURE_IDS) {
      const h = signalsHiddenIv(f)
      const card = FILE.event_cards.find((c) => c.id === h.trigger.card_id)!
      expect(card.future).toBe(f)
      expect(card.quarter).toBe(h.trigger.quarter)
      expect(card.title).toBe(h.trigger.title)
    }
  })

  it('every card’s text is in the text table word for word; none names a future or uses the leak guard’s words', () => {
    for (const c of FILE.event_cards) {
      const id = act4CardEngineId(c.id)
      expect(tDynamic(`event.${id}.title`, ''), c.id).toBe(c.title)
      expect(tDynamic(`event.${id}.body`, ''), c.id).toBe(c.body)
      c.choices.forEach((ch, i) => expect(tDynamic(`event.${id}.choice.c${i + 1}`, ''), c.id).toBe(ch.label))
      const text = [c.title, c.body, ...c.choices.map((ch) => ch.label)].join(' ')
      expect(text, c.id).not.toMatch(/On Schedule|The Wall\b|Closed Shell|Cheap Ground|trigger|decoy|false alarm/i)
    }
  })

  it('a future’s cards fire only in its own future (the shared ones in every future)', () => {
    for (const f of FUTURE_IDS) {
      let s = act4Company('s0', f)
      const fired = new Set<string>()
      // schedule every Act IV quarter's cards by ending its Plan phase (the queue is planned at END_PLAN)
      for (let q = 56; q <= 75; q++) {
        s = { ...structuredClone(s), quarter: q, phase: 'plan', week: 0 }
        const r = applyAction(s, { type: 'END_PLAN' })
        if (!r.ok) throw new Error(r.error.key)
        for (const e of r.state.events.queue) fired.add(e.id)
      }
      const own = FILE.event_cards.filter((c) => c.future === f || c.future === 'all').map((c) => act4CardEngineId(c.id))
      const others = FILE.event_cards.filter((c) => c.future !== f && c.future !== 'all').map((c) => act4CardEngineId(c.id))
      for (const id of own) expect(fired.has(id), `${f} ${id}`).toBe(true)
      for (const id of others) expect(fired.has(id), `${f} ${id}`).toBe(false)
    }
  })
})
