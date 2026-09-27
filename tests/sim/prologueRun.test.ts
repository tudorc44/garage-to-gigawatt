// Whole prologue runs (Alpha 0.3 §5 "Playable"): a passive player and an active one reach the
// handover with no stuck state, and a prologue start plays on through Act I and Act II.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { playPrologue } from '../../src/sim/replay.ts'
import { prologueBot, type PrologueBotSettings } from '../../tools/prologueBots.ts'

const PASSIVE: PrologueBotSettings = {
  pool: false,
  sellPct: 0,
  custody: 'wallet',
  backup: false,
  buy: false,
  paybackQuarters: 0,
  reserveUsd: 0,
  preorder: null,
  conference: false,
  moveOutFrom: null,
  goxAnswer: 'accept',
  stopEvery: false,
}

const ACTIVE: PrologueBotSettings = {
  pool: true,
  sellPct: 0.5,
  custody: 'wallet',
  backup: true,
  buy: true,
  paybackQuarters: 4,
  reserveUsd: 500,
  preorder: 'preorder_summit_silicon',
  conference: true,
  moveOutFrom: '2013Q1',
  goxAnswer: 'withdraw',
  stopEvery: true,
}

describe('whole prologue runs', () => {
  it('a passive player reaches the prologue chapter report: 13 Plan phases, the rest auto-played', () => {
    const { state } = playPrologue(1, prologueBot(PASSIVE), { through: 0 })
    expect(state.phase).toBe('chapter')
    expect(state.act).toBe(0)
    const reports = state.prologue!.reports
    expect(reports).toHaveLength(32)
    expect(reports.filter((r) => !r.auto)).toHaveLength(13)
    expect(state.prologue!.cardsShown).toBeLessThanOrEqual(25)
  })

  it('an active player (every quarter planned) reaches Act I 2017Q1 with its fleet', () => {
    const { state } = playPrologue(2, prologueBot(ACTIVE), { through: 0 })
    expect(state.phase).toBe('chapter')
    const p = state.prologue!
    expect(p.livingAtHome).toBe(false)
    expect(p.preorders).toHaveLength(1)
    expect(state.machines.length).toBeGreaterThan(1)
  })

  it('prologue starts play on to 2026Q4 through Act I and Act II', () => {
    for (const seed of [3, 4]) {
      const { state } = playPrologue(seed, prologueBot(ACTIVE), { through: 2 })
      expect(['chapter', 'gameover']).toContain(state.phase)
      if (state.phase === 'chapter') {
        expect(state.act).toBe(2)
        expect(CONTENT.quarters[state.quarter]).toBe('2026Q4')
      }
      expect(state.prologueCarry!.startNetWorthUsd).toBeGreaterThan(0)
    }
  })
})
