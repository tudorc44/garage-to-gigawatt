// The Act III walking skeleton (M10): plumbing only, no real Act III game rules, no scenarios, no
// Signals, no renewals, no density, no nuclear, no political capital, no wildcards. Confirms the
// timeline extension (M10.3) and the inActIII/inActII/isActIIQuarter gates (M10.1) let advance()
// play 2 stub quarters with a Plan phase and a quarter report each, with no crash — using ONLY the
// stub content, and reusing Act II's own reducer and report-selector code as far as it tolerates
// act 3, exactly as the sub-step asked. This state is unreachable from play (see act3Helpers.ts).
import { describe, expect, it } from 'vitest'
import { CONTENT, actLastQuarter } from '../../src/content/index.ts'
import { advance } from '../../src/sim/advance.ts'
import { chapterReport } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import { defaultChoice } from '../../src/sim/systems/interrupts.ts'
import { ok } from './act2Helpers.ts'
import { act3StubCompany } from './act3Helpers.ts'

/** Plays one stub quarter's live weeks (default answers to anything that somehow still fires) and
 * stops at its report, without advancing to the next quarter. */
function toReport(s: GameState): GameState {
  s = ok(s, { type: 'END_PLAN' })
  while (s.phase === 'live')
    s = s.interrupt
      ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: defaultChoice(s) })
      : advance(s)
  return s
}

describe('the Act III walking skeleton (M10)', () => {
  it('starts at 2027Q1, unreachable from play (no code path but this helper sets act 3)', () => {
    const s = act3StubCompany(7)
    expect(s.act).toBe(3)
    expect(s.act3Stub).toBe(true)
    expect(CONTENT.quarters[s.quarter]).toBe('2027Q1')
  })

  it('plays both stub quarters (2027Q1, 2027Q2) with a Plan phase and a report each, no crash', () => {
    let s = act3StubCompany(7)
    for (const label of ['2027Q1', '2027Q2']) {
      s = toReport(s)
      expect(s.phase).toBe('report')
      expect(s.reports.at(-1)!.quarter).toBe(label)
      expect(s.interrupt).toBeNull() // the stub fires no business systems, no interrupts, no events
      s = ok(s, { type: 'NEXT_QUARTER' })
    }
    // After the second stub quarter's report: what really ends Act III (a chapter report, a
    // scenario-continue prompt, something else) is doc 27's decision, not wired yet (M10.1 STUB
    // list). Today it reaches 'chapter', the same fallback any non-Act-I act gets.
    expect(s.phase).toBe('chapter')
    expect(s.act).toBe(3)
    expect(s.quarter).toBe(actLastQuarter(3))
  })

  it('Act II-only report fields stay off: the existing inActII gates already do this, no new guard needed', () => {
    const s = toReport(act3StubCompany(7))
    const r = s.reports.at(-1)!
    expect(r.mwByUseKw).toBeUndefined()
    expect(r.creditRating).toBeUndefined()
  })

  it('the Act II chapter-report selector does not throw when called on a stub act-3 state', () => {
    let s = act3StubCompany(7)
    s = ok(toReport(s), { type: 'NEXT_QUARTER' })
    s = ok(toReport(s), { type: 'NEXT_QUARTER' })
    expect(() => chapterReport(s)).not.toThrow()
  })

  it('a different seed plays the same 2 stub quarters differently in nothing that matters yet (no crash either way)', () => {
    const a = ok(toReport(act3StubCompany(1)), { type: 'NEXT_QUARTER' })
    const b = ok(toReport(act3StubCompany(2)), { type: 'NEXT_QUARTER' })
    expect(a.reports.at(-1)!.quarter).toBe(b.reports.at(-1)!.quarter)
  })
})
