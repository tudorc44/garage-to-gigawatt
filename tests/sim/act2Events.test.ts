// The Act II event deck (M5.8; scope 0.2 §2.12; events_act2.json): its cards and texts, the
// scripted timeline's market effects, and what the new card effects do.
import { describe, expect, it } from 'vitest'
import { CONTENT } from '../../src/content/index.ts'
import { hasText } from '../../src/i18n/t.ts'
import { applyAction } from '../../src/sim/actions.ts'
import type { GameState } from '../../src/sim/state.ts'
import { equipmentTerms } from '../../src/sim/systems/loans.ts'
import { cryptoLoanOffered } from '../../src/sim/systems/cryptoLoan.ts'
import { scheduleEvents } from '../../src/sim/systems/events.ts'
import { ratingInputs } from '../../src/sim/systems/rating.ts'
import { powerPriceUsdKwh } from '../../src/sim/systems/sites.ts'
import { aiInfraMultiple } from '../../src/sim/systems/valuation.ts'
import { act2Company, ok, pilotReady, playQuarter } from './act2Helpers.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)
const act2Cards = () => CONTENT.events.cards.filter((c) => c.act === 2)

/** A live-phase state showing Act II card `id`, ready for RESOLVE_INTERRUPT. */
function showing(s: GameState, id: string): GameState {
  return {
    ...s,
    phase: 'live',
    week: 3,
    interrupt: { id: 'event', event: id, week: 3, coin: 'BTC', changePct: 0 },
  }
}
const choose = (s: GameState, choice: string) =>
  ok(s, { type: 'RESOLVE_INTERRUPT', choice })

describe('the deck', () => {
  it('22 cards: 16 scripted, 6 random (ec03 and ec05 are played by the lifeline and the GPU alert)', () => {
    const cards = act2Cards()
    expect(cards.filter((c) => c.type === 'scripted')).toHaveLength(16)
    expect(cards.filter((c) => c.type === 'random')).toHaveLength(6)
    for (const id of ['ec03_lifeline_auction', 'ec05_gpu_allocation_queue'])
      expect(CONTENT.events.byId[id]).toBeUndefined()
    expect(CONTENT.events.byId['ec21_moratorium_hits']).toBeDefined()
  })

  it('every card has a title, a body, a news body where it needs one, and every choice a label and hint', () => {
    for (const c of act2Cards()) {
      expect(hasText(`event.${c.id}.title`), c.id).toBe(true)
      expect(hasText(`event.${c.id}.body`), c.id).toBe(true)
      if (c.news_unless)
        expect(hasText(`event.${c.id}.body_news`), c.id).toBe(true)
      for (const ch of c.choices) {
        expect(
          hasText(`event.${c.id}.choice.${ch.id}`),
          `${c.id}.${ch.id}`,
        ).toBe(true)
        expect(hasText(`event.${c.id}.hint.${ch.id}`), `${c.id}.${ch.id}`).toBe(
          true,
        )
      }
    }
  })

  it('each act plays its own deck: FTX comes in 2022Q4, no Act I card in Act II', () => {
    const s = act2Company('2022Q4')
    scheduleEvents(s)
    expect(s.events.queue.map((e) => e.id)).toContain('ec01_ftx_contagion')
    for (const e of s.events.queue)
      expect(CONTENT.events.byId[e.id].act).toBe(2)
  })
})

describe('the timeline’s market effects', () => {
  it('FTX: every rating a notch lower in 2022Q4–2023Q1', () => {
    const s = act2Company('2022Q4')
    const report = { ebitdaUsd: 1_000_000 } as GameState['reports'][number]
    expect(ratingInputs(s, report).rating).toBe('B') // B+ − 1
    expect(ratingInputs({ ...s, quarter: q('2023Q2') }, report).rating).toBe(
      'B+',
    )
  })

  it('SVB: no new debt in 2023Q2', () => {
    const s = act2Company('2023Q2')
    s.machines.push({
      id: 'lot-x',
      model: 's19pro',
      siteId: 'site-2',
      condition: 'new',
      count: 100,
      failed: 0,
      earnsFromQuarter: 0,
    })
    const r = applyAction(s, { type: 'TAKE_LOAN', amountUsd: 1000 })
    expect(r.ok || r.error.key).toBe('error.debt_frozen')
    expect(
      applyAction(
        { ...s, quarter: q('2023Q3') },
        { type: 'TAKE_LOAN', amountUsd: 1000 },
      ).ok,
    ).toBe(true)
  })

  it('DeepSeek: the AI multiple −3 in 2025Q1–Q2', () => {
    expect(
      aiInfraMultiple(q('2025Q1')) - aiInfraMultiple(q('2024Q4')),
    ).toBeCloseTo(1 - 3, 9)
  })

  it('crypto-backed loans come back from 2023Q3', () => {
    expect(cryptoLoanOffered(q('2023Q2'))).toBe(false)
    expect(cryptoLoanOffered(q('2023Q3'))).toBe(true)
  })
})

describe('card effects', () => {
  it('SVB "ride it out": a notch down for 2 quarters', () => {
    const s = choose(showing(act2Company('2023Q1'), 'ec04_svb_freeze'), 'ride')
    expect(s.events.creditNotch).toEqual({ notches: -1, until: q('2023Q2') })
  })

  it('the PJM shock: power × 1.3 at your PJM/Ohio/Georgia sites for 4 quarters, from next quarter', () => {
    const before = act2Company('2024Q4') // a Georgia own site
    const s = choose(showing(before, 'ec10_pjm_shock'), 'absorb')
    const site = s.sites[1]
    const p = (label: string) => powerPriceUsdKwh(site, q(label))
    const plain = (label: string) => powerPriceUsdKwh(before.sites[1], q(label))
    expect(p('2024Q4')).toBeCloseTo(plain('2024Q4'), 9)
    expect(p('2025Q1')).toBeCloseTo(plain('2025Q1') * 1.3, 9)
    expect(p('2025Q4')).toBeCloseTo(plain('2025Q4') * 1.3, 9)
    expect(p('2026Q1')).toBeCloseTo(plain('2026Q1'), 9)
  })

  it('DDTL widening: new equipment loans and DDTLs +2 points (lock) or +3 (wait)', () => {
    const s = { ...act2Company('2026Q3'), creditRating: 'BB' }
    const locked = choose(showing(s, 'ec22_ddtl_widening'), 'lock')
    expect(locked.events.spreadAddBps).toBe(200)
    expect(equipmentTerms(locked)!.apr - equipmentTerms(s)!.apr).toBeCloseTo(
      0.02,
      9,
    )
    expect(
      choose(showing(s, 'ec22_ddtl_widening'), 'wait').events.spreadAddBps,
    ).toBe(300)
  })

  it('the spot price shock: "lock" fixes a live spot cluster at 70% of today’s price for 4 quarters', () => {
    let s = ok(pilotReady('2025Q1'), {
      type: 'PROJECT_START',
      projectId: 'project-1',
    })
    while (s.projects[0].stage !== 'live') s = playQuarter(s)
    const locked = choose(showing(s, 'ec15_spot_price_shock'), 'lock')
    expect(locked.projects[0].spotLock!.until).toBe(s.quarter + 3)
    const stay = choose(showing(s, 'ec15_spot_price_shock'), 'stay')
    expect(stay.events.modifiers.at(-1)).toMatchObject({
      kind: 'spot',
      mult: 0.7,
    })
  })

  it('a bid RFP brings a fresh, bigger set of offers next quarter', () => {
    let s = ok(act2Company('2024Q2'), {
      type: 'PROJECT_OPEN',
      siteId: 'site-2',
      kw: 5000,
      kind: 'shell',
    })
    const before = s.projects[0].offers.length
    s = choose(showing(s, 'ec24_tenant_rfp_random'), 'bid')
    expect(s.events.extraOffers).toEqual({ quarter: s.quarter + 1, n: 1 })
    s = ok({ ...s, phase: 'report', interrupt: null }, { type: 'NEXT_QUARTER' })
    expect(s.projects[0].offers.length).toBeGreaterThanOrEqual(
      Math.min(before, 3),
    )
    expect(s.projects[0].offers[0].id).toContain(`-${s.quarter}-`)
    expect(s.bandwidth).toBe(4 - 2)
  })
})
