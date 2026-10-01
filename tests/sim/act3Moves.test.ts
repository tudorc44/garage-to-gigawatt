// M14.2: the Act III move log. One entry per big move the player makes in Act III ({ q, kind }), signed by
// MOVE_SIGN; nothing for neutral or forced actions, nothing outside Act III, and no scenario information.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CONTENT,
  actFirstQuarter,
  type ScenarioId,
} from '../../src/content/index.ts'
import { act3CardEngineId } from '../../src/content/act3Cards.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import { playGame } from '../../src/sim/replay.ts'
import {
  toAct3,
  type Act3MoveKind,
  type GameState,
} from '../../src/sim/state.ts'
import {
  ACT3_MOVE_KINDS,
  MOVE_SIGN,
  cardChoiceMove,
  moveOf,
  recordAct3Move,
} from '../../src/sim/systems/act3Moves.ts'
import { openBlendOffers } from '../../src/sim/systems/blendExtend.ts'
import { rescueBeforeGameOver } from '../../src/sim/systems/rescue.ts'
import { BOTS } from '../../tools/bots.ts'

const FIRST = actFirstQuarter(3)
const q = (label: string) => CONTENT.quarters.indexOf(label)

let shellEnd: GameState
let gpuEnd: GameState
beforeAll(() => {
  shellEnd = playGame(3, BOTS['sign-then-raise'], { through: 2 }).state
  gpuEnd = playGame(1, BOTS['overleveraged'], { through: 2 }).state
}, 120_000)

const act3 = (end: GameState, id: ScenarioId = 's1', label = '2027Q3') => {
  const s = toAct3(end, { scenario: id })
  s.quarter = q(label)
  s.act3Renewals = []
  return s
}

/** The kind recorded for this action, from a before / after pair (after = a copy the test changes). */
function logged(
  before: GameState,
  a: Action,
  change: (after: GameState) => void = () => {},
): Act3MoveKind[] {
  const after = structuredClone(before)
  change(after)
  recordAct3Move(before, after, a)
  return (after.act3Moves ?? []).map((m) => m.kind)
}

describe('the kinds and their signs', () => {
  it('11 offensive (+1) and 5 defensive (−1) (M15.0 added asic_buy, retrofit, power_lock, hedge)', () => {
    expect(ACT3_MOVE_KINDS).toHaveLength(16)
    expect(ACT3_MOVE_KINDS.filter((k) => MOVE_SIGN[k] === 1)).toHaveLength(11)
    expect(ACT3_MOVE_KINDS.filter((k) => MOVE_SIGN[k] === -1).sort()).toEqual(
      ['card_shorten', 'debt_repay', 'equity_raise', 'hedge', 'sale_voluntary'],
    )
  })
})

describe('one entry per big move (action in → entry out)', () => {
  it('project_commit: a build started; a shell lease signed', () => {
    const s = act3(shellEnd)
    expect(logged(s, { type: 'PROJECT_START', projectId: 'x' })).toEqual([
      'project_commit',
    ])
    const p = s.projects.find((x) => x.tenant && !x.tenant.gpu)!
    const before = structuredClone(s)
    before.projects.find((x) => x.id === p.id)!.tenant = null
    expect(
      logged(before, {
        type: 'PROJECT_SIGN_TENANT',
        projectId: p.id,
        offerId: 'o',
      }, (a) => {
        a.projects.find((x) => x.id === p.id)!.tenant = structuredClone(
          p.tenant,
        )
      }),
    ).toEqual(['project_commit'])
  })

  it('gpu_contract_long: a GPU contract of 2 years or more; under 2 years: nothing (DT)', () => {
    const s = act3(gpuEnd)
    const p = s.projects.find((x) => x.tenant?.gpu)!
    const before = structuredClone(s)
    before.projects.find((x) => x.id === p.id)!.tenant = null
    const sign = (quarters: number) =>
      logged(
        before,
        { type: 'PROJECT_SIGN_TENANT', projectId: p.id, offerId: 'o' },
        (a) => {
          const t = structuredClone(p.tenant!)
          t.gpu!.termQuarters = quarters
          a.projects.find((x) => x.id === p.id)!.tenant = t
        },
      )
    expect(sign(8)).toEqual(['gpu_contract_long'])
    expect(sign(12)).toEqual(['gpu_contract_long'])
    expect(sign(4)).toEqual([])
  })

  it('a tenant negotiation that ends in a signing counts; a renewal counter does not', () => {
    const s = act3(shellEnd)
    const p = s.projects.find((x) => x.tenant && !x.tenant.gpu)!
    const before = structuredClone(s)
    before.projects.find((x) => x.id === p.id)!.tenant = null
    const sign = (side: 'tenant' | 'renewal') => {
      before.dealNegotiation = { side, projectId: p.id } as never
      return logged(before, { type: 'DEAL_ACCEPT' }, (a) => {
        a.projects.find((x) => x.id === p.id)!.tenant = structuredClone(
          p.tenant,
        )
      })
    }
    expect(sign('tenant')).toEqual(['project_commit'])
    expect(sign('renewal')).toEqual([])
  })

  it('debt_draw: the equipment loan and a crypto loan', () => {
    const s = act3(shellEnd)
    expect(logged(s, { type: 'TAKE_LOAN', amountUsd: 1 })).toEqual([
      'debt_draw',
    ])
    expect(
      logged(s, { type: 'TAKE_CRYPTO_LOAN', coin: 'BTC', amountUsd: 1 }),
    ).toEqual(['debt_draw'])
  })

  it('site_buy: a new site or a phase built', () => {
    const s = act3(shellEnd)
    expect(logged(s, { type: 'BUILD_SITE', tier: 'texas' })).toEqual([
      'site_buy',
    ])
    expect(logged(s, { type: 'BUILD_PHASE', siteId: 'x' })).toEqual([
      'site_buy',
    ])
  })

  it('gpu_buy: GPU rigs bought; asic_buy: ASICs bought (M15.0, A1)', () => {
    const s = act3(shellEnd)
    const buy = (model: string) =>
      logged(s, {
        type: 'BUY_MACHINES',
        model,
        condition: 'new',
        count: 1,
        siteId: 'x',
      })
    expect(buy('gpu_gen2')).toEqual(['gpu_buy'])
    expect(buy('s21')).toEqual(['asic_buy'])
  })

  it('M15.0 (A5): a treasury sale the player chose is sale_voluntary; a backstop is hedge; a won auction is site_buy, a lost one nothing', () => {
    const s = act3(shellEnd)
    expect(logged(s, { type: 'SELL_TREASURY', coin: 'BTC', pct: 0.5 })).toEqual(['sale_voluntary'])
    expect(logged(s, { type: 'PROJECT_BACKSTOP', projectId: 'x' })).toEqual(['hedge'])
    const bid = { type: 'BID_AUCTION', bidUsd: 1, siteId: 'x' } as const
    const withLog = (key: string) => (a: GameState) => {
      a.log.push({ quarter: a.quarter, week: null, key: key as never })
    }
    expect(logged(s, bid, withLog('log.auction_won'))).toEqual(['site_buy'])
    expect(logged(s, bid, withLog('log.auction_lost'))).toEqual([])
  })

  it('M15.0 (A3): a retrofit card choice is retrofit; a nuclear PPA is power_lock', () => {
    expect(cardChoiceMove({ retrofit: 'low_to_mid' })).toBe('retrofit')
    expect(cardChoiceMove({ retrofit: 'low_to_mid', cash: '-1500000*mw' })).toBe('retrofit')
    expect(cardChoiceMove({ power_option: 'nuclear_ppa' })).toBe('power_lock')
    expect(cardChoiceMove({ power_option: 'nuclear_ppa', mw: 100 })).toBe('power_lock')
  })

  it('blend_extend: an accepted blend-and-extend offer (through the real action)', () => {
    const s = toAct3(shellEnd, { scenario: 's2' })
    s.quarter = q('2029Q1')
    s.act3Renewals = []
    const p = s.projects.find((x) => x.tenant && !x.tenant.gpu)!
    p.tenant!.servedQuarters = 8
    p.tenant!.termQuarters = 40
    openBlendOffers(s)
    const r = applyAction(s, { type: 'BLEND_ACCEPT', projectId: p.id })
    expect(r.ok).toBe(true)
    if (r.ok)
      expect(r.state.act3Moves).toEqual([
        { q: q('2029Q1') - FIRST, kind: 'blend_extend' },
      ])
  })

  it('sale_voluntary: a project or its GPUs sold; GPU rigs or ASICs sold (M15.0, A1)', () => {
    const s = act3(gpuEnd)
    expect(logged(s, { type: 'PROJECT_SELL', projectId: 'x' })).toEqual([
      'sale_voluntary',
    ])
    expect(logged(s, { type: 'PROJECT_SELL_GPUS', projectId: 'x' })).toEqual([
      'sale_voluntary',
    ])
    const withLots = structuredClone(s)
    withLots.machines.push(
      { id: 'g', model: 'gpu_gen2', siteId: 'x', condition: 'used', count: 1, failed: 0, earnsFromQuarter: 0 },
      { id: 'a', model: 's21', siteId: 'x', condition: 'used', count: 1, failed: 0, earnsFromQuarter: 0 },
    )
    expect(logged(withLots, { type: 'SELL_MACHINES', lotId: 'g', count: 1 })).toEqual(['sale_voluntary'])
    expect(logged(withLots, { type: 'SELL_MACHINES', lotId: 'a', count: 1 })).toEqual(['sale_voluntary'])
  })

  it('debt_repay: early repayments', () => {
    const s = act3(shellEnd)
    for (const type of [
      'REPAY_LOAN',
      'REPAY_CRYPTO_LOAN',
      'REPAY_CONSTRUCTION_LOAN',
      'REPAY_BRIDGE_LOAN',
    ] as const)
      expect(logged(s, { type }), type).toEqual(['debt_repay'])
  })

  it('equity_raise: a raise the player chose (the stake went down); a pitch that did not close: nothing', () => {
    const s = act3(shellEnd)
    const dilute = (a: GameState) => {
      a.founderStake = s.founderStake * 0.9
    }
    expect(logged(s, { type: 'RAISE_EQUITY', dilution: 0.1 }, dilute)).toEqual(['equity_raise'])
    expect(logged(s, { type: 'PITCH_ACCEPT' }, dilute)).toEqual(['equity_raise'])
    expect(logged(s, { type: 'PITCH_COUNTER', preMoneyUsd: 1 })).toEqual([])
  })

  it('card choices: lengthen, shorten, a voluntary sale, a distressed buy, a debt buy-back (through the real card engine)', () => {
    const cases: [string, string, Act3MoveKind | null][] = [
      ['s0_c3', 'c1', 'card_lengthen'], // rent_index 0.75, term_add_years 2
      ['s2_c3', 'c1', 'card_lengthen'], // term_years 10
      ['s2_c3', 'c2', 'card_shorten'], // term "spot"
      ['s3_c6', 'c1', 'card_shorten'], // term "1yr"
      ['s3_c4', 'c2', 'card_shorten'], // term_years −2
      ['s1_c4', 'c2', 'sale_voluntary'], // the ×0.80 sale
      ['s1_c6', 'c1', 'distressed_buy'], // the distressed 60 MW bid
      ['s1_c3', 'c3', 'debt_repay'], // buy the debt at a discount
      ['s2_c7', 'c1', null], // rent_index only: no sign
      ['s0_c5', 'c1', null], // idling: neutral
    ]
    for (const [card, choice, kind] of cases) {
      const s = act3(shellEnd)
      s.cash = 1e9
      s.facilities.push({
        id: 'facility-99', kind: 'project_debt', projectId: s.projects[0].id,
        amountUsd: 1e8, balanceUsd: 1e8, apr: 0.08, tenorQuarters: 40,
        drawnQuarter: FIRST, missedQuarters: 0, rating: 'BB',
      })
      s.phase = 'live'
      s.week = 2
      s.interrupt = { id: 'event', event: act3CardEngineId(card), week: 1, coin: 'BTC', changePct: 0 }
      const r = applyAction(s, { type: 'RESOLVE_INTERRUPT', choice })
      if (!r.ok) throw new Error(`${card}.${choice}: ${r.error.key}`)
      expect(r.state.act3Moves!.map((m) => m.kind), `${card}.${choice}`).toEqual(kind ? [kind] : [])
    }
  })

  it('a card choice with several effects: one entry, by the sign of the sum; a zero sum logs nothing', () => {
    expect(cardChoiceMove({ term_years: 10, rent_index: 1.05 })).toBe('card_lengthen')
    expect(cardChoiceMove({ term_years: -2, rent_index: 0.8 })).toBe('card_shorten')
    expect(cardChoiceMove({ debt: 1, debt_reduce: 1 })).toBeNull() // +1 −1 = 0
    expect(cardChoiceMove({ mw: 60, cash: '-180000000' }, true)).toBe('distressed_buy')
    expect(cardChoiceMove({ cash: '+ev_stabilized*0.8', mw: '-X' })).toBe('sale_voluntary')
    // the dominant sign's first effect: two +1 against one −1
    expect(cardChoiceMove({ term_years: -1, gpu_rack: 'x', capex_mw: 30 })).toBe('gpu_buy')
  })
})

describe('not logged', () => {
  it('neutral actions: renewals, reads, idling, hires, keep empty, reopening, opening a project', () => {
    const s = act3(shellEnd)
    for (const a of [
      { type: 'RENEWAL_ACCEPT', projectId: 'x' },
      { type: 'RENEWAL_RELET', projectId: 'x' },
      { type: 'RENEWAL_KEEP_EMPTY', projectId: 'x' },
      { type: 'READ_SIGNAL', indicator: 'revenue_gap' },
      { type: 'RESUME_IDLE_MACHINES' },
      { type: 'HIRE', hire: 'trader' },
      { type: 'REOPEN_LEASE', projectId: 'x' },
      { type: 'PROJECT_OPEN', siteId: 'x', kw: 1000, kind: 'shell' },
      { type: 'END_PLAN' },
      { type: 'NEXT_QUARTER' },
    ] as Action[])
      expect(logged(s, a), a.type).toEqual([])
  })

  it('forced moves: the rescue sale and emergency equity add nothing', () => {
    const s = act3(shellEnd)
    s.cash = -1e6
    const before = (s.act3Moves ?? []).length
    rescueBeforeGameOver(s)
    expect((s.act3Moves ?? []).length).toBe(before)
  })

  it('nothing is logged outside Act III', () => {
    const s = structuredClone(shellEnd)
    s.phase = 'plan'
    expect(logged(s, { type: 'PROJECT_START', projectId: 'x' })).toEqual([])
    expect(moveOf(s, s, { type: 'PROJECT_START', projectId: 'x' })).toBe('project_commit')
    expect(s.act3Moves).toBeUndefined()
  })

  it('the log holds no scenario id, phase or trigger: only { q, kind }', () => {
    const s = act3(shellEnd, 's3')
    const after = structuredClone(s)
    recordAct3Move(s, after, { type: 'TAKE_LOAN', amountUsd: 1 })
    for (const m of after.act3Moves!) {
      expect(Object.keys(m).sort()).toEqual(['kind', 'q'])
      expect(m.q).toBeGreaterThanOrEqual(0)
      expect(m.q).toBeLessThanOrEqual(15)
    }
    expect(JSON.stringify(after.act3Moves)).not.toMatch(/s[0-3]\b|scenario|phase|trigger|decoy/)
  })
})
