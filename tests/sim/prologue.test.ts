// The prologue (Alpha 0.3, Act 0): the start, the week, auto-play, the handover to Act I, and that a
// 2017 start is untouched.
import { describe, expect, it } from 'vitest'
import { CONTENT, quarterIndex } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { advance } from '../../src/sim/advance.ts'
import { prologueDefaultChoice } from '../../src/sim/prologue/events.ts'
import { newPrologueGame } from '../../src/sim/prologue/setup.ts'
import {
  prologueChapterView,
  prologueHandoverView,
} from '../../src/sim/prologue/views.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

/** One week, or the card on screen answered with its default. */
function step(s: GameState): GameState {
  return s.interrupt
    ? ok(s, { type: 'RESOLVE_INTERRUPT', choice: prologueDefaultChoice(s) })
    : advance(s)
}

/** Plays the live quarter to its report (cards take their default). */
function playLive(s: GameState): GameState {
  while (s.phase === 'live') s = step(s)
  return s
}

describe('a prologue start (scope §2.3)', () => {
  it('2009Q1, the bedroom, your PC, $2,000, 2 Bandwidth, the intro first', () => {
    const s = newPrologueGame(1)
    expect(s.act).toBe(0)
    expect(CONTENT.quarters[s.quarter]).toBe('2009Q1')
    expect(s.phase).toBe('intro')
    expect(s.cash).toBe(2000)
    expect(s.bandwidth).toBe(2)
    expect(s.sites.map((x) => x.tier)).toEqual(['bedroom'])
    expect(s.machines.map((l) => l.model)).toEqual(['pc_cpu'])
    expect(s.prologue!.livingAtHome).toBe(true)
  })

  it('a 2017 start has no prologue and is exactly as before', () => {
    const s = newGame(1)
    expect(s.act).toBe(1)
    expect(s.quarter).toBe(0)
    expect('prologue' in s).toBe(false)
    expect('prologueCarry' in s).toBe(false)
  })

  it('the CPU mines coins at $0 (solo, literal CPU-era mining) and income arrives weekly', () => {
    let s = ok(ok(newPrologueGame(1), { type: 'START_PROLOGUE' }), {
      type: 'END_PLAN',
    })
    s = playLive(s)
    expect(s.phase).toBe('report')
    expect(s.treasury.BTC).toBeGreaterThan(0)
    expect(s.cash).toBeCloseTo(2000 + 1200, 0)
    expect(s.prologue!.reports).toHaveLength(1)
    expect(s.prologue!.reports[0].quarter).toBe('2009Q1')
  })

  it('non-decision quarters auto-play; decision quarters get a Plan phase; "Stop here" plans the next', () => {
    let s = playLive(
      ok(ok(newPrologueGame(1), { type: 'START_PROLOGUE' }), {
        type: 'END_PLAN',
      }),
    )
    s = ok(s, { type: 'NEXT_QUARTER' }) // 2009Q2: auto
    expect(s.phase).toBe('live')
    s = playLive(s)
    expect(s.prologue!.reports.at(-1)!.auto).toBe(true)
    s = ok(s, { type: 'NEXT_QUARTER', stopHere: true }) // 2009Q3 planned
    expect(s.phase).toBe('plan')
    expect(CONTENT.quarters[s.quarter]).toBe('2009Q3')
  })

  it('plays to 2016Q4, then its chapter report, then Act I 2017Q1 with everything carried', () => {
    let s = ok(newPrologueGame(1), { type: 'START_PROLOGUE' })
    while (s.phase !== 'chapter') {
      if (s.phase === 'plan') s = ok(s, { type: 'END_PLAN' })
      else if (s.phase === 'live') s = step(s)
      else s = ok(s, { type: 'NEXT_QUARTER' })
    }
    expect(s.quarter).toBe(-1)
    const btc = s.treasury.BTC
    // The chapter report's numbers add up, and the handover screen previews Act I exactly.
    const c = prologueChapterView(s)
    const b = c.breakdown
    expect(b.btcUsd + b.ethUsd + b.cash + b.machinesUsd).toBeCloseTo(
      c.netWorthUsd,
      2,
    )
    expect(c.career).toHaveLength(32)
    const h = prologueHandoverView(s)
    expect('prologue' in s).toBe(true) // the preview leaves the real state alone
    const a1 = ok(s, { type: 'CONTINUE_TO_ACT_1' })
    expect(h.cash).toBe(a1.cash)
    expect(h.sites.map((x) => x.tier)).toEqual(a1.sites.map((x) => x.tier))
    expect(h.startNetWorthUsd).toBe(a1.prologueCarry!.startNetWorthUsd)
    expect(a1.act).toBe(1)
    expect(a1.quarter).toBe(0)
    expect(a1.phase).toBe('plan')
    expect(a1.treasury.BTC).toBe(btc)
    expect(a1.sites.map((x) => x.tier)).toEqual(['garage'])
    expect(a1.machines.every((l) => l.siteId === a1.sites[0].id)).toBe(true)
    expect(a1.prologueCarry!.startNetWorthUsd).toBeGreaterThan(0)
    expect('prologue' in a1).toBe(false)
    // Act I plays on from here.
    const next = ok(a1, { type: 'END_PLAN' })
    expect(next.phase).toBe('live')
  })

  it('a prologue save loads', () => {
    const s = ok(newPrologueGame(3), { type: 'START_PROLOGUE' })
    const r = restoreSave(JSON.parse(JSON.stringify(s)))
    expect(r.ok && r.state).toEqual(s)
    expect(quarterIndex('2009Q1')).toBe(s.quarter)
  })
})
