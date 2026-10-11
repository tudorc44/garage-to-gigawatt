// M54 (doc 43 §0.12, doc 49; the overnight STEP 7 (c)): the accelerator venture. The engine's draws reproduce the
// generator's calibration (P(volume within 8 years) within ±5 points over 2,000 games); the 49% stake alone may vote
// down a buyer at a gain; deposits are lost on a cancellation, refunded on a sale, credited on delivery; no UI reads the
// hidden draws; every chips card and move scores 0; Halyard Bowline is on sale only in a game whose venture ships, from
// max(volume + 1, 2036Q1). Acts I-IV's goldens stay byte-identical (golden-replay.test.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { ACCELERATOR } from '../../src/content/acceleratorContent.ts'
import events from '../../src/content/events_chips.json' with { type: 'json' }
import { applyAction } from '../../src/sim/actions.ts'
import { act4MoveKind } from '../../src/sim/systems/act4Moves.ts'
import { act5MoveKind } from '../../src/sim/systems/act5Moves.ts'
import {
  acceleratorDraws,
  acceleratorFate,
  acceleratorMarkUsd,
  acceleratorValueUsd,
  bowlineFrom,
  bowlineOnSale,
  endQuarterAccelerator,
} from '../../src/sim/systems/accelerator.ts'
import { availableGpus } from '../../src/sim/systems/projects.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { act4Company } from './act4Helpers.ts'

const start = CONTENT.quarters.indexOf('2032Q1')
const seedState = (seed: number) => ({ seed, act4Seed: seed }) as unknown as GameState

/** An Act IV company in 2032Q1's Plan phase on `seed`'s draws (act4Seed), with cash to spare. */
function at2032(seed: number): GameState {
  const s = act4Company('s0', 'f1')
  s.act4Seed = seed
  s.quarter = start
  s.phase = 'plan'
  s.cash = 2e9
  return s
}
/** A seed whose fate (by 2039Q4) is `want`. */
function seedWhere(want: (f: ReturnType<typeof acceleratorFate>) => boolean): number {
  for (let seed = 1; seed < 5000; seed++) if (want(acceleratorFate(seedState(seed), start + 32))) return seed
  throw new Error('no seed')
}
const ok = (s: GameState, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error.key)
  return r.state
}

describe('the accelerator venture (M54): calibration', () => {
  it('P(volume within 8 years of 2032Q1) is the file’s 0.30 within ±5 points over 2,000 games; the outcome shares near it', () => {
    const N = 2000
    const n = { volume: 0, cancelled: 0, acquired_gain: 0, acquired_loss: 0 }
    for (let seed = 1; seed <= N; seed++) {
      const f = acceleratorFate(seedState(seed), start + 32)
      if (f.volume) n.volume++
      else if (f.outcome) n[f.outcome]++
    }
    expect(Math.abs(n.volume / N - ACCELERATOR.targets.p_volume_within_8_years)).toBeLessThan(0.05)
    expect(Math.abs(n.cancelled / N - 0.3)).toBeLessThan(0.05)
    expect(Math.abs(n.acquired_gain / N - 0.15)).toBeLessThan(0.05)
    expect(Math.abs(n.acquired_loss / N - 0.25)).toBeLessThan(0.05)
    // the file's own check (20,000 games, the generator)
    expect(Math.abs(ACCELERATOR.calibration_check.p_volume_within_8_years - 0.3)).toBeLessThan(0.01)
  })

  it('the schedule: starts 2032Q1, phases scaled by one slip draw, respins at first silicon, volume after qualification', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const d = acceleratorDraws(seedState(seed))
      expect(d.tape).toBeGreaterThanOrEqual(start + Math.round(8 * ACCELERATOR.slip.floor))
      expect(d.sil).toBe(d.tape + 1)
      expect(d.respins.length).toBeLessThanOrEqual(2)
      expect(d.vol).toBeGreaterThanOrEqual(d.qual)
      expect(d.m).toBeLessThanOrEqual(ACCELERATOR.overrun_class.cap)
    }
  })
})

describe('your roles (M54)', () => {
  it('a stake costs stake × $800M; a stake under 49% is dragged into a sale at a gain; the 49% may vote it down', () => {
    const seed = seedWhere((f) => f.outcome === 'acquired_gain' && f.endQuarter !== null && f.endQuarter < actFirstQuarter(5) - 1)
    const gainQ = acceleratorFate(seedState(seed), start + 32).endQuarter!
    // 30%: sold at the buyer's price
    const s = ok(at2032(seed), { type: 'ACCEL_JOIN', stake: 0.3 })
    expect(s.cash).toBe(2e9 - 0.3 * 8e8)
    for (s.quarter = start; s.quarter <= gainQ; s.quarter++) endQuarterAccelerator(s)
    expect(s.accelerator!.ended).toBe('acquired_gain')
    expect(s.accelerator!.stake).toBe(0)
    expect(s.cash).toBeGreaterThan(2e9 - 0.3 * 8e8)
    // 49%: an offer to vote on; blocking keeps the project alive (the replay skips that buy-out). (Its calls are paid:
    // the default, dilute, would take the stake under 49% and the vote with it.)
    let l = ok(at2032(seed), { type: 'ACCEL_JOIN', stake: 0.49 })
    for (l.quarter = start; l.quarter <= gainQ && !l.accelerator!.saleOffer; l.quarter++) {
      endQuarterAccelerator(l)
      if (l.accelerator!.call) {
        l.phase = 'plan'
        l = ok(l, { type: 'ACCEL_CALL', choice: 'pay' })
      }
    }
    expect(l.accelerator!.saleOffer).toBeDefined()
    l.phase = 'plan'
    l = ok(l, { type: 'ACCEL_SALE_VOTE', choice: 'block' })
    expect(l.accelerator!.blockedQuarters).toContain(gainQ)
    expect(acceleratorFate(l, gainQ + 1).outcome).not.toBe('acquired_gain')
    // a 30% stake can't vote against
    const s30 = ok(at2032(seed), { type: 'ACCEL_JOIN', stake: 0.3 })
    s30.accelerator!.saleOffer = { quarter: gainQ, priceUsd: 1 }
    expect(applyAction(s30, { type: 'ACCEL_SALE_VOTE', choice: 'block' }).ok).toBe(false)
  })

  it('a reservation (after tape-out): the deposit is lost on a cancellation, delivered at volume, refunded on a sale', () => {
    const run = (want: (f: ReturnType<typeof acceleratorFate>) => boolean) => {
      const seed = seedWhere(want)
      const d = acceleratorDraws(seedState(seed))
      const fate = acceleratorFate(seedState(seed), start + 32)
      const s = at2032(seed)
      s.quarter = d.tape // the reservation opens at tape-out
      if (fate.endQuarter !== null && fate.endQuarter < d.tape) return null
      const r = applyAction(s, { type: 'ACCEL_RESERVE', mw: 5, tier: 0 })
      if (!r.ok) return null
      const after = r.state
      const deposit = after.accelerator!.reservation!.depositUsd
      expect(after.cash).toBeCloseTo(s.cash - deposit, 2)
      // the deposit is an asset at cost while it can be credited or refunded (no stake here)
      expect(acceleratorValueUsd(after)).toBeCloseTo(deposit, 2)
      for (after.quarter = d.tape; after.quarter < start + 36 && after.accelerator!.reservation!.status === 'waiting'; after.quarter++)
        endQuarterAccelerator(after)
      return { status: after.accelerator!.reservation!.status, cash: after.cash, before: s.cash, deposit }
    }
    const cancelled = run((f) => f.outcome === 'cancelled' && (f.endQuarter ?? 0) > f.draws.tape + 1)
    if (cancelled) {
      expect(cancelled.status).toBe('lost')
    }
    const built = run((f) => f.volume)
    expect(built!.status).toBe('delivered')
    const sold = run((f) => f.outcome === 'acquired_loss' && (f.endQuarter ?? 0) > f.draws.tape + 1)
    if (sold) {
      expect(sold.status).toBe('refunded')
      expect(sold.cash).toBeCloseTo(sold.before, 2)
    }
  })

  it('before volume the stake is its mark; calls come in thirds at tape-out, first silicon and volume', () => {
    const seed = seedWhere((f) => f.volume && f.draws.m > 1.1)
    const d = acceleratorDraws(seedState(seed))
    const s = ok(at2032(seed), { type: 'ACCEL_JOIN', stake: 0.2 })
    expect(acceleratorValueUsd(s)).toBeCloseTo(acceleratorMarkUsd(s.accelerator!), 2)
    let calls = 0
    for (s.quarter = start; s.quarter < d.vol; s.quarter++) {
      endQuarterAccelerator(s)
      if (s.accelerator!.call) {
        calls++
        s.accelerator!.call = null
      }
    }
    expect(calls).toBeGreaterThanOrEqual(2)
    expect(s.accelerator!.milestones).toBeGreaterThanOrEqual(3)
  })
})

describe('Halyard Bowline (M54)', () => {
  it('on sale only in a game whose venture ships, from max(volume + 1, 2036Q1), and only in Act V', () => {
    const shipped = seedWhere((f) => f.volume)
    const never = seedWhere((f) => !f.volume && f.outcome === 'cancelled')
    const base = act4Company('s0', 'f1')
    const v = (seed: number) => {
      const s = toAct5({ ...structuredClone(base), act4Seed: seed, phase: 'chapter', quarter: actFirstQuarter(5) - 1 } as GameState, { vfuture: 'v1' })
      s.act4Seed = seed
      return s
    }
    const a = v(shipped)
    const from = bowlineFrom(a)!
    expect(from).toBeGreaterThanOrEqual(actFirstQuarter(5))
    a.quarter = from
    expect(bowlineOnSale(a)).toBe(true)
    a.quarter = from - 1
    expect(from === actFirstQuarter(5) || !bowlineOnSale(a)).toBe(true)
    const b = v(never)
    b.quarter = actFirstQuarter(5) + 19
    expect(bowlineOnSale(b)).toBe(false)
    expect(availableGpus(b.quarter, scenarioOf(b), b).some((g) => g.id === 'bowline')).toBe(false)
    // never without the game's state (content-only callers can't see it)
    expect(availableGpus(b.quarter, scenarioOf(b)).some((g) => g.id === 'bowline')).toBe(false)
  })
})

describe('guards (M54)', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) return sourceFiles(p)
      return /\.(ts|tsx)$/.test(name) ? [p] : []
    })
  }
  const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('no UI file reads the hidden draws (only the view: what has happened)', () => {
    for (const f of sourceFiles(new URL('../../src/ui', import.meta.url).pathname))
      expect(code(f), f).not.toMatch(/acceleratorDraws|acceleratorFate|bowlineFrom|hazardAt|gainMult|lossMult|foundryCapped/)
  })

  it('every chips card and move scores 0 (doc 43 §0.10, §0.12)', () => {
    for (const c of events.event_cards) for (const sign of Object.values(c.reading_sign)) expect(sign).toBe(0)
    for (const a of [
      { type: 'ACCEL_JOIN', stake: 0.1 },
      { type: 'ACCEL_RESERVE', mw: 5, tier: 0 },
      { type: 'ACCEL_CALL', choice: 'pay' },
      { type: 'ACCEL_SALE_VOTE', choice: 'block' },
    ] as const) {
      expect(act4MoveKind(a)).toBeNull()
      expect(act5MoveKind(a)).toBeNull()
    }
  })

  it('the 49% rule and §0.12’s text are in the generated files', () => {
    expect(ACCELERATOR.acquisition.gain.player_can_block_with_stake_ge).toBe(0.49)
    expect(ACCELERATOR.from).toBe('2032Q1')
    const text = JSON.parse(readFileSync(new URL('../../src/content/text_chips.en.json', import.meta.url), 'utf8'))
    expect(text['epilogue.chip.shipped']).toMatch(/in 2032 shipped/)
    expect(text['chips.venture.diligence']).toMatch(/P\(volume within 8 years\) ≈ 0\.30/)
    expect(JSON.stringify(ACCELERATOR)).not.toMatch(/demand_trim/)
  })
})
