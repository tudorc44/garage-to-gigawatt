// M13.3: the Act III chapter report with the scenario reveal (A3-11). No DOM in the tests (STOPPED in
// dev-notes), so this checks the reveal's figures and text for each scenario from a quick-start company
// played to 2030Q4 by its bot, the D15 withholding, and that the reveal file is the only UI file that
// reads the hidden views.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  SCENARIO_IDS,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { d15Items, rivalFates } from '../../src/content/rivalsHidden.ts'
import { signalsHidden } from '../../src/content/signalsHidden.ts'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { playFrom } from '../../src/sim/replay.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import {
  act3Outcome,
  act3RevealDetails,
} from '../../src/sim/systems/act3End.ts'
import { quickStartCompany } from '../../src/ui/act3QuickStart.ts'
import { BOTS } from '../../tools/bots.ts'

const text = en as Record<string, string>

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

describe('the chapter report with the reveal, for each scenario (forced s0–s3)', () => {
  it.each(SCENARIO_IDS)(
    '%s: the scenario, the trigger card, the false alarm, the reads, net worth vs entry, survival, the rivals',
    (id) => {
      const s = ends.get(id)!
      const o = act3Outcome(s)
      const h = signalsHidden(id)
      expect(o.end.scenarioId).toBe(id)
      expect(o.end.scenarioName).toBe(h.scenario_name)
      expect(o.end.triggerQuarter).toBe(h.trigger.quarter)
      // The trigger card's title is in en.json under its opaque id.
      expect(text[`event.${o.details.triggerCard}.title`]).toBeTruthy()
      expect(o.end.decoy.indicator).toBe(h.decoy.indicator)
      expect(o.details.decoyReason).toBe(h.decoy.reason)
      expect(o.details.decoyTell).toBe(h.decoy.tell)
      // Net worth at the end vs the entry (the growth multiple), the valuation, survival and a title.
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

describe('M14.4: the reading in the reveal', () => {
  it('the record carries the reading, the trigger index and both titles; the outcome adds the wording', () => {
    for (const id of SCENARIO_IDS) {
      const o = act3Outcome(ends.get(id)!)
      expect(o.end.triggerQ).toBeGreaterThanOrEqual(0)
      expect(text[`ui.chapter2.title.${o.title}`]).toBeTruthy()
      if (o.end.reading.score === null) {
        expect(o.readingTitle).toBeNull()
        expect(o.wording).toBeNull()
      } else {
        expect(text[`act3.reveal.title.${o.readingTitle}`]).toBeTruthy()
        const s = o.end.reading.score
        expect(o.wording).toBe(s >= 70 ? 'high' : s >= 40 ? 'mid' : 'low')
      }
    }
  })

  it('the moves timeline: quarter, timing against the trigger, and the mark (✓ match, ✗ opposite, decoy, – neutral)', () => {
    // s1: trigger 2028Q1 (q 4); the decoy window 2027Q2–Q4 (q 1–3), wrong stance +1; ideal −1 in q 1–5, +1 in q 6–10.
    const s = structuredClone(ends.get('s1')!)
    s.act3Moves = [
      { q: 2, kind: 'project_commit' }, // +1 in the decoy window: reacted to the decoy
      { q: 4, kind: 'sale_voluntary' }, // −1 in the trigger quarter: match
      { q: 7, kind: 'sale_voluntary' }, // −1 where +1 was ideal: opposite
      { q: 12, kind: 'debt_draw' }, // weight 0: neutral
    ]
    const d = act3RevealDetails(s)
    expect(d.moves.map((m) => [m.quarter, m.fromTrigger, m.mark])).toEqual([
      ['2027Q3', -2, 'decoy'],
      ['2028Q1', 0, 'match'],
      ['2028Q4', 3, 'opposite'],
      ['2030Q1', 8, 'neutral'],
    ])
    for (const m of d.moves) expect(text[`act3.moves.${m.kind}`]).toBeTruthy()
  })

  it('the reading counts up to the game-over quarter, and the career title is "bust"', () => {
    const s = structuredClone(ends.get('s2')!)
    s.phase = 'gameover'
    s.quarter = actFirstQuarter(3) + 1 // 2027Q2: s2 has no weighted quarter yet
    delete s.act3End
    const o = act3Outcome(s)
    expect(o.title).toBe('bust')
    expect(o.end.reading.score).toBeNull()
    expect(o.endQuarter).toBe('2027Q2')
  })
})

describe('D15: fates waiting for the editorial review are withheld', () => {
  it('every flagged fate is in withheldRivals for its scenario; the reveal shows "Fate withheld pending review" for it', () => {
    const items = d15Items()
    expect(items.length).toBeGreaterThan(0)
    for (const id of SCENARIO_IDS) {
      const flagged = items
        .filter((f) => f.scenario === id)
        .map((f) => f.rival)
      const s = { scenarioId: id } as GameState
      expect(act3RevealDetails(s).withheldRivals.sort()).toEqual(
        flagged.sort(),
      )
    }
    expect(text['ui.act3.reveal.withheld']).toBe('Fate withheld pending review')
    const src = readFileSync(
      new URL('../../src/ui/screens/Act3Reveal.tsx', import.meta.url),
      'utf8',
    )
    expect(src).toMatch(
      /withheldRivals\.includes\(r\.rival\)\s*\?\s*t\('ui\.act3\.reveal\.withheld'\)/,
    )
  })
})

describe('the reveal file is the only UI file that reads the hidden views', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
    })
  }
  it('only screens/Act3Reveal.tsx imports act3End (the reveal record and its details); none imports the hidden content views', () => {
    const readers = files(new URL('../../src/ui', import.meta.url).pathname)
      .filter((f) =>
        /sim\/systems\/act3End|signalsHidden|rivalsHidden/.test(
          readFileSync(f, 'utf8'),
        ),
      )
      .map((f) => f.split('/').slice(-2).join('/'))
    expect(readers).toEqual(['screens/Act3Reveal.tsx'])
    const reveal = readFileSync(
      new URL('../../src/ui/screens/Act3Reveal.tsx', import.meta.url),
      'utf8',
    )
    expect(reveal).not.toMatch(/signalsHidden|rivalsHidden/)
  })
})
