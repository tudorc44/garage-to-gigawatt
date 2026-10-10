// M37.1 (doc 39): the ledger. Every change to the company's cash goes through book() (a grep guard), each quarter
// reconciles (start cash + its labelled lines + rounding = end cash), mined coins are revenue when mined and cash only
// when sold, and an old save starts its ledger at load with its past quarters partial.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { buyPriceNow } from '../../src/sim/systems/eventEffects.ts'
import { capacityKw } from '../../src/sim/systems/sites.ts'
import {
  accrue,
  book,
  bookSplit,
  cashTotal,
  roundCash,
  unreconciled,
} from '../../src/sim/ledger.ts'
import { playGame, type Strategy } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { newGame, type GameState } from '../../src/sim/state.ts'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
  })
}

describe('the ledger is the only writer of the cash (M37.1)', () => {
  it('no file in src/sim but ledger.ts assigns state.cash', () => {
    const offenders: string[] = []
    for (const f of files(new URL('../../src/sim', import.meta.url).pathname)) {
      if (f.endsWith('/ledger.ts')) continue
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\b(s|state)\.cash\s*([-+*/]?=)(?!=)/.test(line)) offenders.push(`${f}:${i + 1}: ${line.trim()}`)
        })
    }
    expect(offenders).toEqual([])
  })
})

describe('book, bookSplit, accrue and roundCash', () => {
  it('book moves the cash and labels it, by business and by ref', () => {
    const s = newGame(1)
    const start = s.cash
    book(s, 'machines', -1000, { site: 'site-1' })
    book(s, 'equity_raised', 5000)
    expect(s.cash).toBe(start + 4000)
    const q = s.ledger!.quarters[0]
    expect(q.startCash).toBe(start)
    expect(q.lines).toEqual({ machines: -1000, equity_raised: 5000 })
    expect(q.byBiz.mining).toEqual({ machines: -1000 })
    expect(q.byBiz.corporate).toEqual({ equity_raised: 5000 })
    expect(q.byRef['site:site-1']).toEqual({ machines: -1000 })
  })

  it('bookSplit moves the cash by the total in one step; accrue labels without moving cash', () => {
    const s = newGame(1)
    const start = s.cash
    bookSplit(s, 70, [
      ['coins_sold', 100],
      ['power', -30, { site: 'site-1' }],
    ])
    accrue(s, 'mining_btc', 250, { site: 'site-1' })
    expect(s.cash).toBe(start + 70)
    const q = s.ledger!.quarters[0]
    expect(q.lines.mining_btc).toBe(250)
    // mined coins aren't cash: the cash lines are the sale and the power
    expect(cashTotal(q.lines)).toBe(70)
  })

  it('roundCash keeps the rounding, so the quarter still reconciles', () => {
    const s = newGame(1)
    book(s, 'power', -0.004)
    roundCash(s)
    expect(unreconciled(s)).toEqual([])
    expect(s.ledger!.quarters[0].rounding).toBeCloseTo(0.004)
  })

  it('a change outside the ledger shows as untagged', () => {
    const s = newGame(1)
    book(s, 'power', -10)
    s.cash += 5 // (a test may; the sim may not: the grep guard above)
    expect(unreconciled(s)).toEqual([{ q: s.quarter, untaggedUsd: 5 }])
  })
})

describe('coins kept versus sold (doc 39 §M37.6)', () => {
  /** Buys one BTC machine into the garage in 2017Q1, keeps `hodl` of every coin mined, and plays on. */
  function heldQuarter(hodl: number): GameState {
    const keep: Strategy = {
      plan(s) {
        if (s.quarter !== 0) return []
        const site = s.sites[0]
        const m = CONTENT.machines.find((x) => {
          const price = buyPriceNow(s, x, 'new')
          return x.coin === 'BTC' && price !== undefined && price < s.cash && x.power_kw <= capacityKw(site)
        })!
        return [
          { type: 'SET_HODL', pct: hodl },
          { type: 'BUY_MACHINES', model: m.id, condition: 'new', count: 1, siteId: site.id },
        ]
      },
    }
    return playGame(7, keep).state
  }
  const Q2 = CONTENT.quarters.indexOf('2017Q2')

  it('a mined-and-held quarter shows the coins as revenue in the P&L, and no cash comes in for them', () => {
    const s = heldQuarter(1)
    const q = s.ledger!.quarters.find((x) => x.q === Q2)!
    expect(q.lines.mining_btc ?? 0).toBeGreaterThan(0)
    expect(q.lines.coins_sold ?? 0).toBe(0)
    expect(s.treasury.BTC).toBeGreaterThan(0)
    expect(unreconciled(s)).toEqual([])
  })

  it('sold as mined: the same revenue, and the cash comes in as coins sold', () => {
    const held = heldQuarter(1).ledger!.quarters.find((x) => x.q === Q2)!
    const sold = heldQuarter(0).ledger!.quarters.find((x) => x.q === Q2)!
    expect(sold.lines.mining_btc).toBeCloseTo(held.lines.mining_btc!, 6)
    expect(sold.lines.coins_sold).toBeCloseTo(sold.lines.mining_btc!, 6)
  })
})

describe('a whole game reconciles, quarter by quarter', () => {
  it('the do-nothing career to the Merge: every quarter, start + lines = end', () => {
    const idle: Strategy = { plan: () => [] }
    const run = playGame(3, idle)
    expect(run.state.ledger!.quarters.length).toBeGreaterThan(20)
    expect(unreconciled(run.state)).toEqual([])
    // the weekly cash: 13 values a played quarter
    expect(run.state.ledger!.quarters[1].weeks).toHaveLength(13)
  })
})

describe('old saves (doc 39 §M37.1): the ledger starts at load', () => {
  const load = (name: string) =>
    restoreSave(JSON.parse(readFileSync(new URL(`../fixtures/saves/${name}.json`, import.meta.url), 'utf8')))

  it('past quarters are partial (revenue, power, rent, EBITDA); full detail from the quarter it was loaded in', () => {
    const r = load('v1-plan-2021Q2')
    expect(r.ok).toBe(true)
    const s = (r as { state: GameState }).state
    expect(s.ledger!.from).toBe(CONTENT.quarters.indexOf('2021Q2'))
    expect(s.ledger!.quarters.length).toBe(s.reports.length)
    expect(s.ledger!.quarters.every((q) => q.partial !== undefined)).toBe(true)
    expect(s.ledger!.quarters[0].partial!.revenueUsd).toBe(s.reports[0].revenueUsd)
  })

  it('a save loaded mid-quarter has full detail from the next one', () => {
    const r = load('v1-live-2020Q4')
    const s = (r as { state: GameState }).state
    expect(s.ledger!.from).toBe(CONTENT.quarters.indexOf('2020Q4') + 1)
  })
})
