// M11.4b: the Act II → III boundary (enterAct3, doc 27 §3 / D17). One test per item of the carried,
// dropped and computed lists, on a real game played to the end of Act II and on handmade states.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  actFirstQuarter,
  actLastQuarter,
} from '../../src/content/index.ts'
import { playGame } from '../../src/sim/replay.ts'
import { restoreSave } from '../../src/sim/save.ts'
import { toAct3, type GameState } from '../../src/sim/state.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { enterAct3 } from '../../src/sim/systems/act3Entry.ts'
import { BOTS } from '../../tools/bots.ts'
import { act2Company } from './act2Helpers.ts'

const FIRST = actFirstQuarter(3)

/** A carried project as Act II left it: M16.2 adds only its density tier at the boundary. */
const withoutTier = (p: GameState['projects'][number]) => {
  const rest = { ...p }
  delete rest.tier
  return rest
}

/** A real Act II game, played by a bot to the end of 2026Q4 (the chapter report). */
let end: GameState
beforeAll(() => {
  end = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
})

describe('the real end of Act II', () => {
  it('is 2026Q4 in the chapter phase, with projects, facilities and a head-start record to carry or drop', () => {
    expect(end.act).toBe(2)
    expect(end.phase).toBe('chapter')
    expect(CONTENT.quarters[end.quarter]).toBe('2026Q4')
    expect(end.projects.length).toBeGreaterThan(0)
    expect(end.act2Entry).not.toBeNull()
  })
})

describe('enterAct3: carried unchanged', () => {
  it('keeps the money, the company and its fleet exactly', () => {
    const s = toAct3(end)
    expect(s.cash).toBe(end.cash)
    expect(s.treasury).toEqual(end.treasury)
    expect(s.founderStake).toBe(end.founderStake)
    expect(s.raisesDone).toEqual(end.raisesDone)
    expect(s.sites).toEqual(end.sites)
    expect(s.machines).toEqual(end.machines)
    expect(s.hosting).toEqual(end.hosting)
    expect(s.staff).toEqual(end.staff)
    expect(s.seed).toBe(end.seed)
    expect(s.rng).toBe(end.rng)
  })

  it('keeps open projects (tenants, contracts, slots) and every kind of debt', () => {
    const s = toAct3(end)
    // (M16.2 adds each hall's density tier; everything else is carried as it was)
    expect(s.projects.map(withoutTier)).toEqual(end.projects)
    expect(s.facilities).toEqual(end.facilities)
    expect(s.equipmentLoan).toEqual(end.equipmentLoan)
    expect(s.constructionLoans).toEqual(end.constructionLoans)
    expect(s.cryptoLoan).toEqual(end.cryptoLoan)
    expect(debtUsd(s)).toBe(debtUsd(end))
  })

  it('keeps an outstanding bridge loan, the credit rating (no review) and the Act II history', () => {
    const bridge = {
      amountUsd: 6_500_000,
      balanceUsd: 6_500_000,
      apr: 0.14,
      takenQuarter: 23,
      dueQuarter: 45,
    }
    const s = toAct3({ ...end, bridgeLoan: bridge })
    expect(s.bridgeLoan).toEqual(bridge)
    expect(s.creditRating).toBe(end.creditRating)
    expect(s.reports).toEqual(end.reports)
    expect(s.log).toEqual(end.log)
  })

  it('keeps Heat per site, with no reset', () => {
    const heated = structuredClone(end)
    const id = heated.sites[0].id
    heated.siteHeat[id] = { ...heated.siteHeat[id], heat: 66 } as never
    expect(toAct3(heated).siteHeat).toEqual(heated.siteHeat)
    expect(toAct3(heated).siteHeat[id]).toMatchObject({ heat: 66 })
  })

  it('keeps the JV partner and backstops (they live on the projects) and AI-lab distress flags', () => {
    const s = toAct3(end)
    for (const [i, p] of end.projects.entries())
      expect(withoutTier(s.projects[i])).toEqual(p)
  })

  it('keeps the lasting effects that outlast 2026Q4, and the permanent ones', () => {
    const e = structuredClone(end)
    e.events.creditNotch = { notches: 1, until: FIRST + 2 }
    e.events.spreadAddBps = 75
    e.events.aiLabRevenueMult = 0.9
    e.events.taxPlan = { amountUsd: 1_000_000, quartersLeft: 3 }
    const s = toAct3(e)
    expect(s.events.creditNotch).toEqual({ notches: 1, until: FIRST + 2 })
    expect(s.events.spreadAddBps).toBe(75)
    expect(s.events.aiLabRevenueMult).toBe(0.9)
    expect(s.events.taxPlan).toEqual({ amountUsd: 1_000_000, quartersLeft: 3 })
  })
})

describe('enterAct3: dropped', () => {
  it('drops the head-start record and flags, and the lifeline’s (they live in act2Entry)', () => {
    const withLifeline = structuredClone(end)
    withLifeline.act2Entry = { ...end.act2Entry!, lifeline: 'taken' }
    expect(toAct3(withLifeline).act2Entry).toBeNull()
    expect(toAct3(end).act2Entry).toBeNull()
  })

  it('turns a legacy-cloud GPU rig back into ordinary inventory', () => {
    const s0 = structuredClone(end)
    s0.machines.push({
      id: 'lot-cloud',
      model: 'gpu_gen2',
      siteId: s0.sites[0].id,
      condition: 'new',
      count: 10,
      failed: 0,
      earnsFromQuarter: 0,
      legacyCloud: true,
    })
    const s = toAct3(s0)
    const lot = s.machines.find((m) => m.id === 'lot-cloud')!
    expect(lot.legacyCloud).toBeUndefined()
    expect(lot.count).toBe(10)
  })

  it('drops Act II lasting effects that expire by 2026Q4', () => {
    const e = structuredClone(end)
    const last = actLastQuarter(2)
    e.events.creditNotch = { notches: 2, until: last }
    e.events.valuationMult = { mult: 0.8, until: last - 1 }
    e.events.ebitdaMult = { mult: 1.2, until: last }
    e.events.extraOffers = { quarter: last, n: 2 }
    e.events.gpuLockQuarter = last
    e.events.marginStress = { quarter: last, callLtv: 0.5, liquidationLtv: 0.6 }
    e.events.runHotQuarter = last
    e.events.ipoBandwidth = { bw: 2, until: last }
    e.events.modifiers = [
      { kind: 'rent', siteIds: null, mult: 0.5, from: 0, to: last * 13 + 5 },
      { kind: 'rent', siteIds: null, mult: 0.5, from: 0, to: FIRST * 13 + 5 },
    ]
    const s = toAct3(e)
    expect(s.events.creditNotch).toBeNull()
    expect(s.events.valuationMult).toBeNull()
    expect(s.events.ebitdaMult).toBeNull()
    expect(s.events.extraOffers).toBeNull()
    expect(s.events.gpuLockQuarter).toBeNull()
    expect(s.events.marginStress).toBeNull()
    expect(s.events.runHotQuarter).toBeNull()
    expect(s.events.ipoBandwidth).toBeNull()
    expect(s.events.modifiers).toHaveLength(1) // only the one that reaches 2027Q1 stays
  })

  it('drops every per-quarter planning and interrupt field', () => {
    const e = structuredClone(end)
    e.projectEvents = [{ projectId: 'x' } as never]
    e.spotShock = { week: 4 }
    e.failureWaves = [{ siteId: 'x' } as never]
    e.complaint = { siteId: 'x', week: 3 }
    e.curtailment = { week: 2, creditUsd: 5 }
    e.marketRead = { quarter: end.quarter, reads: { BTC: 'up', ETH: 'up' } }
    e.interruptsThisQuarter = 2
    e.events.queue = [{ id: 'x' } as never]
    e.events.plan = {
      quarter: end.quarter,
      priceMult: 1,
      usedDiscount: 0,
      openBuy: false,
      guaranteedAuction: false,
    }
    const s = toAct3(e)
    expect(s.projectEvents).toEqual([])
    expect(s.spotShock).toBeNull()
    expect(s.failureWaves).toEqual([])
    expect(s.complaint).toBeNull()
    expect(s.curtailment).toBeNull()
    expect(s.auction).toBeNull()
    expect(s.siteOffers).toEqual([])
    expect(s.negotiation).toBeNull()
    expect(s.pitch).toBeNull()
    expect(s.marketRead).toBeNull()
    expect(s.interrupt).toBeNull()
    expect(s.interruptsThisQuarter).toBe(0)
    expect(s.events.queue).toEqual([])
    expect(s.events.plan).toBeNull()
    expect(s.quarterStats.weeks).toEqual([])
  })

  it('starts 2027Q1 in the Plan phase, week 0, with the quarter’s Bandwidth', () => {
    const s = toAct3(end)
    expect(s.act).toBe(3)
    expect(s.phase).toBe('plan')
    expect(s.week).toBe(0)
    expect(s.quarter).toBe(FIRST)
    expect(CONTENT.quarters[s.quarter]).toBe('2027Q1')
    expect(s.bandwidth).toBeGreaterThanOrEqual(4) // Act II's rule (M11.2)
    expect(s.act3SignalReads).toEqual([])
  })
})

describe('enterAct3: computed, not stored', () => {
  it('act3Entry is measured at the end of 2026Q4: valuation, founder net worth, cash, debt, MW, rating', () => {
    const s = toAct3(end)
    const last = end.reports.at(-1)!
    expect(s.act3Entry).toEqual({
      quarter: '2027Q1',
      valuationUsd: last.valuationUsd,
      founderNetWorthUsd: Math.max(0, end.founderStake * last.valuationUsd),
      cashUsd: end.cash,
      debtUsd: debtUsd(end),
      energizedMw: s.act3Entry!.energizedMw,
      contractedMw: s.act3Entry!.contractedMw,
      creditRating: end.creditRating,
    })
    expect(s.act3Entry!.energizedMw).toBeGreaterThan(0)
    expect(s.act3Entry!.contractedMw).toBeGreaterThanOrEqual(0)
    expect(s.act3Entry!.contractedMw).toBeLessThanOrEqual(
      s.act3Entry!.energizedMw,
    )
  })

  it('act3Entry holds nothing about the scenario', () => {
    for (const id of ['s0', 's1', 's2', 's3'] as const) {
      const text = JSON.stringify(toAct3(end, { scenario: id }).act3Entry)
      expect(text).not.toMatch(/scenario|s[0-3]\b|phase|signal/i)
    }
    // ...and it is the same whichever scenario is drawn: it is measured before the scenario matters.
    expect(toAct3(end, { scenario: 's0' }).act3Entry).toEqual(
      toAct3(end, { scenario: 's3' }).act3Entry,
    )
  })

  it('Ratepayer Anger is not stored: it is worked out from energized MW; M17.3 stores only the company-wide adjustment, 0 at entry', () => {
    const s = toAct3(end)
    expect(Object.keys(s).filter((k) => /anger/i.test(k))).toEqual(['angerAdj'])
    expect(s.angerAdj).toBe(0)
    expect(s.politicalCapital).toBe(40)
  })

  it('a company with no reports still gets an entry (valuation falls back to cash)', () => {
    const s = toAct3(act2Company('2026Q4', 5))
    expect(s.act3Entry!.valuationUsd).toBe(s.cash)
    expect(s.act3Entry!.debtUsd).toBe(0)
  })
})

describe('enterAct3: shape', () => {
  it('does not change the state it is given', () => {
    const before = structuredClone(end)
    toAct3(end)
    enterAct3(end, 's1')
    expect(end).toEqual(before)
  })

  it('an Act III state with an entry record survives a save and load', () => {
    const s = toAct3(end, { scenario: 's2' })
    const r = restoreSave(structuredClone(s))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state).toEqual(s)
  })
})
