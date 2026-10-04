// M13.3 / M14.4 / M15.3: the Act III reveal record and the chapter report's figures. A quick-start company is
// played to 2030Q4 by its bot on each forced scenario; the record carries numbers and ids only (the trigger,
// the decoy window, the marked moves, the withheld fates), and the text comes from en.json. The rendered
// screen is tested in act3Report.test.tsx (happy-dom).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  SCENARIO_IDS,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import {
  d15Items,
  d15Withheld,
  rivalFates,
} from '../../src/content/rivalsHidden.ts'
import { signalsHidden } from '../../src/content/signalsHidden.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { playFrom } from '../../src/sim/replay.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import {
  act3Outcome,
  buildAct3End,
} from '../../src/sim/systems/act3End.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'
import { BOTS } from '../../tools/bots.ts'

const text = en as Record<string, string>
const first = actFirstQuarter(3)
const qOf = (label: string) => CONTENT.quarters.indexOf(label) - first

const ends = new Map<ScenarioId, GameState>()
beforeAll(async () => {
  const start = await quickStartCompany('growth')
  for (const id of SCENARIO_IDS)
    ends.set(
      id,
      playFrom(toAct3(start, { scenario: id, forced: true }), BOTS['sign-then-raise'], {
        through: 3,
      }).state,
    )
}, 180_000)

describe('the reveal record, for each scenario (forced s0–s3)', () => {
  it.each(SCENARIO_IDS)(
    '%s: the scenario, the trigger {q, cardId}, the decoy window, net worth vs entry, survival, the rivals',
    (id) => {
      const s = ends.get(id)!
      const o = act3Outcome(s)
      const h = signalsHidden(id)
      expect(o.end.scenarioId).toBe(id)
      expect(o.end.scenarioName).toBe(h.scenario_name)
      expect(o.end.triggerQuarter).toBe(h.trigger.quarter)
      expect(o.end.trigger.q).toBe(qOf(h.trigger.quarter))
      // The trigger card's title is in en.json under its opaque id.
      expect(text[`event.${o.end.trigger.cardId}.title`]).toBeTruthy()
      expect(o.end.decoy.indicator).toBe(h.decoy.indicator)
      expect(o.end.decoy.fromQ).toBe(qOf(h.decoy.quarters[0]))
      expect(o.end.decoy.toQ).toBe(qOf(h.decoy.quarters.at(-1)!))
      // Net worth at the end vs the entry (the growth multiple), survival and the career title.
      expect(o.entryNetWorthUsd).toBe(s.act3Entry!.founderNetWorthUsd)
      expect(o.netWorthUsd).toBeCloseTo(
        Math.max(0, s.founderStake * s.reports.at(-1)!.valuationUsd),
        2,
      )
      if (o.growth !== null)
        expect(o.growth).toBeCloseTo(o.netWorthUsd / o.entryNetWorthUsd, 10)
      expect(o.survived).toBe(s.phase === 'chapter')
      expect(text[`ui.chapter2.title.${o.title}`]).toBeTruthy()
      expect(o.end.rivalFates).toHaveLength(rivalFates(id).length)
    },
  )

  it('the narratives are in en.json word for word (copied from the signals files)', () => {
    for (const id of SCENARIO_IDS) {
      const h = JSON.parse(
        readFileSync(
          new URL(`../../src/content/signals_${id}.json`, import.meta.url),
          'utf8',
        ),
      )
      expect(text[`act3.reveal.${id}.trigger`]).toBe(h.trigger.narrative)
      expect(text[`act3.reveal.${id}.decoy_reason`]).toBe(h.decoy.reason)
      expect(text[`act3.reveal.${id}.decoy_tell`]).toBe(h.decoy.tell)
    }
  })

  it('a game over in Act III gets the reveal too (built when shown), marked not survived', () => {
    const s = structuredClone(ends.get('s1')!)
    delete s.act3End
    s.phase = 'gameover'
    const o = act3Outcome(s)
    expect(o.survived).toBe(false)
    expect(o.title).toBe('bust')
    expect(o.end.scenarioId).toBe('s1')
  })
})

describe('the reading in the record', () => {
  it('the record carries the reading and both titles; the outcome adds the wording', () => {
    for (const id of SCENARIO_IDS) {
      const o = act3Outcome(ends.get(id)!)
      if (o.end.reading.score === null) {
        expect(o.readingTitle).toBeNull()
        expect(o.wording).toBeNull()
      } else {
        expect(text[`act3.reveal.title.${o.readingTitle}`]).toBeTruthy()
        const sc = o.end.reading.score
        expect(o.wording).toBe(sc >= 70 ? 'high' : sc >= 40 ? 'mid' : 'low')
      }
    }
  })

  it('each move in the record: {q, kind, sign, mark} (✓ match, ✗ opposite, decoy, – neutral)', () => {
    // s1: trigger 2028Q1 (q 4); the decoy window 2027Q2–Q4 (q 1–3), wrong stance +1; ideal −1 in q 1–5, +1 in q 6–10.
    const s = structuredClone(ends.get('s1')!)
    s.act3Moves = [
      { q: 2, kind: 'project_commit' }, // +1 in the decoy window: reacted to the decoy
      { q: 4, kind: 'sale_voluntary' }, // −1 in the trigger quarter: match
      { q: 7, kind: 'sale_voluntary' }, // −1 where +1 was ideal: opposite
      { q: 12, kind: 'debt_draw' }, // weight 0: neutral
    ]
    s.quarter = first + 15
    const e = buildAct3End(s)
    expect(e.moves).toEqual([
      { q: 2, kind: 'project_commit', sign: 1, mark: 'decoy' },
      { q: 4, kind: 'sale_voluntary', sign: -1, mark: 'match' },
      { q: 7, kind: 'sale_voluntary', sign: -1, mark: 'opposite' },
      { q: 12, kind: 'debt_draw', sign: 1, mark: 'neutral' },
    ])
    for (const m of e.moves) expect(text[`act3.moves.${m.kind}`]).toBeTruthy()
  })

  it('the reading counts up to the game-over quarter, and the career title is "bust"', () => {
    const s = structuredClone(ends.get('s2')!)
    s.phase = 'gameover'
    s.quarter = first + 1 // 2027Q2: s2 has no weighted quarter yet
    delete s.act3End
    const o = act3Outcome(s)
    expect(o.title).toBe('bust')
    expect(o.end.reading.score).toBeNull()
    expect(o.endQuarter).toBe('2027Q2')
  })
})

describe('D15: flagged fates show only once cleared (M20.1: both s1 flags cleared by the owner)', () => {
  it('the two flagged fates are cleared and shown in full; none is withheld in any scenario', () => {
    const items = d15Items()
    expect(items.length).toBe(2)
    expect(items.every((f) => !f.withheld)).toBe(true)
    for (const id of SCENARIO_IDS) {
      const e = act3Outcome(ends.get(id)!).end
      expect(e.rivalFates.filter((r) => r.withheld)).toEqual([])
    }
    expect(text['ui.act3.reveal.withheld']).toBe('Fate withheld pending review')
    expect(text['ui.act3.reveal.rivals_note']).toBe(
      'Rival fates are scenario illustrations, not predictions.',
    )
  })

  it('the guard stays: a flagged fate without d15_cleared is withheld', () => {
    expect(d15Withheld(true)).toBe(true)
    expect(d15Withheld(true, false)).toBe(true)
    expect(d15Withheld(true, true)).toBe(false)
    expect(d15Withheld(false)).toBe(false)
  })

  it('every shipped fate or card with d15_review: true also has d15_cleared: true (content check)', () => {
    type Flagged = { d15_review?: boolean; d15_cleared?: boolean }
    const rivals = JSON.parse(
      readFileSync(new URL('../../src/content/rivals_act3.json', import.meta.url), 'utf8'),
    ) as { scenarios: Record<string, Record<string, Flagged>> }
    const fates = Object.values(rivals.scenarios).flatMap((s) => Object.values(s))
    const events = JSON.parse(
      readFileSync(new URL('../../src/content/events_act3.json', import.meta.url), 'utf8'),
    ) as unknown
    const cards: Flagged[] = []
    const walk = (x: unknown) => {
      if (Array.isArray(x)) x.forEach(walk)
      else if (x && typeof x === 'object') {
        if ('d15_review' in x) cards.push(x as Flagged)
        Object.values(x).forEach(walk)
      }
    }
    walk(events)
    expect(fates.length).toBe(20)
    for (const f of [...fates, ...cards])
      if (f.d15_review) expect(f.d15_cleared).toBe(true)
  })
})

describe('the reveal file is the only UI file that reads the reveal', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
    })
  }
  it('only screens/Act3Reveal.tsx imports act3End; no UI file imports a hidden content view or the reading score', () => {
    const all = files(new URL('../../src/ui', import.meta.url).pathname)
    const readers = all
      .filter((f) => /sim\/systems\/act3End/.test(readFileSync(f, 'utf8')))
      .map((f) => f.split('/').slice(-2).join('/'))
    expect(readers).toEqual(['screens/Act3Reveal.tsx'])
    for (const f of all)
      expect(readFileSync(f, 'utf8'), f).not.toMatch(
        /signalsHidden|rivalsHidden|readingScore|reading_score/,
      )
  })
})
