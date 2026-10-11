// M60 (doc 43 §0.16): the remaining-life rule for orbital blocks, the follow-on units' own Act V draws, the launch-slot
// reservation, the card rules (a stated Bandwidth is charged; the test hall enrols 10 MW; the player picks the stake or
// site a bid is for), and the trigger-card guard (no trigger title or body is readable before its quarter).
import { describe, expect, it, vi } from 'vitest'
vi.setConfig({ testTimeout: 0 })
import { CONTENT, V_FUTURE_IDS, actFirstQuarter } from '../../src/content/index.ts'
import { ACT5_CARDS, act5CardEngineId } from '../../src/content/act5Cards.ts'
import { PRESETS_V } from '../../src/content/presetsAct5.ts'
import { signalsHiddenV } from '../../src/content/signalsHiddenV.ts'
import { applyAction } from '../../src/sim/actions.ts'
import { unreconciled } from '../../src/sim/ledger.ts'
import { playFrom, type Strategy } from '../../src/sim/replay.ts'
import { toAct5, type GameState } from '../../src/sim/state.ts'
import { act5CardPicks, applyAct5Card, triggerQuarterV } from '../../src/sim/systems/act5Cards.ts'
import { designEndQuarter, orbitUnitMultiple } from '../../src/sim/systems/orbitEol.ts'
import { orbitRow } from '../../src/sim/systems/orbit.ts'
import { act5Bot } from '../../tools/act5/bots.ts'
import { playAct5Recipe } from '../../tools/act5/presetRun.ts'

const cache = new Map<string, GameState>()
function preset(id: 'firm_builder' | 'orbital_landlord'): GameState {
  if (!cache.has(id)) {
    const p = PRESETS_V.find((x) => x.id === id)!
    cache.set(id, playAct5Recipe({ act4_preset: p.act4_preset, act4_future: p.act4_future, act4_seed: p.act4_seed, joins: p.joins as never }))
  }
  return structuredClone(cache.get(id)!)
}
const first5 = actFirstQuarter(5)

describe('orbital blocks on remaining life (M60.1, §0.16 item 1)', () => {
  it('each block’s multiple is min(the file’s, its years of design life left); act5Entry is measured after the switch', () => {
    const s = toAct5(preset('orbital_landlord'), { vfuture: 'v4' })
    const m = orbitRow(s).space_ev_ebitda_mult
    let w = 0
    let sum = 0
    for (const b of s.act4Orbit!.blocks.filter((x) => x.stage === 'live' && (x.lastEbitdaUsd ?? 0) > 0)) {
      w += b.lastEbitdaUsd!
      sum += b.lastEbitdaUsd! * Math.min(m, Math.max(0, (designEndQuarter(b)! - s.quarter) / 4))
    }
    expect(orbitUnitMultiple(s)).toBeCloseTo(sum / w, 10)
    expect(orbitUnitMultiple(s)).toBeLessThanOrEqual(5)
    const e = s.act5Entry!
    expect(e.orbitRevaluedUsd).toBeLessThan(0)
    // Act IV's last report keeps the old multiple
    expect(s.reports.at(-1)!.orbitMultiple).toBeGreaterThan(orbitUnitMultiple(s))
  })
})

describe('follow-on units draw on Act V’s seed (M60.5, §0.16 item 6)', () => {
  it('the Builder’s SMR unit is not cancelled in every game any more', () => {
    const fates = [1, 2, 3, 4, 5, 6].map((seed) => {
      const run = playFrom(toAct5(preset('firm_builder'), { vfuture: 'v1', act5Seed: seed }), act5Bot('builder'), { through: 5 })
      return run.state.ventures!.find((v) => v.followOnOf && v.type === 'smr')?.stage ?? 'none'
    })
    expect(new Set(fates).size).toBeGreaterThan(1)
    expect(fates.some((f) => f !== 'cancelled' && f !== 'none')).toBe(true)
  })
})

describe('the launch-slot card (M60.6, §0.16 item 7)', () => {
  const slotCard = ACT5_CARDS.find((c) => c.choices.some((ch) => 'orbit_booking' in ch.effect))!
  const choice = slotCard.choices.findIndex((ch) => 'orbit_booking' in ch.effect)
  const effect = { card: slotCard.id, role: slotCard.role, choice: choice + 1, effect: slotCard.choices[choice].effect, sign: 0 as const }

  it('holds 15% of the next replacement’s launch cost, charges its Bandwidth to the next Plan, and refunds half if unused', () => {
    const s = toAct5(preset('orbital_landlord'), { vfuture: 'v4' })
    const cash = s.cash
    applyAct5Card(s, act5CardEngineId(slotCard.id), effect, 2)
    expect(s.act5LaunchReserve!.depositUsd).toBeGreaterThan(0)
    expect(cash - s.cash).toBeCloseTo(s.act5LaunchReserve!.depositUsd, 2)
    expect(s.events.bandwidthNext).toBe(-1)
    // played to the end with no replacement: half comes back
    const run = playFrom(s, { plan: () => [] }, { through: 5 })
    expect(run.state.act5LaunchReserve).toBeUndefined()
    expect(unreconciled(run.state)).toEqual([])
  })
})

describe('card rules (M60.7, §0.16 (a)-(c))', () => {
  it('“Enrol a test hall as flexible” enrols the card’s 10 MW', () => {
    const card = ACT5_CARDS.find((c) => c.choices.some((ch) => ch.effect.flex_enrol_mw === 10))!
    const i = card.choices.findIndex((ch) => ch.effect.flex_enrol_mw === 10)
    const s = toAct5(preset('firm_builder'), { vfuture: 'v2' })
    const before = s.sites.reduce((a, x) => a + (x.flexKw ?? 0), 0)
    applyAct5Card(s, act5CardEngineId(card.id), { card: card.id, role: card.role, choice: i + 1, effect: card.choices[i].effect, sign: -1 }, 2)
    expect(s.sites.reduce((a, x) => a + (x.flexKw ?? 0), 0) - before).toBe(10_000)
  })

  it('a fund’s bid sells the stake the player picked; by default the largest', () => {
    const card = ACT5_CARDS.find((c) => c.future === 'v1' && c.choices.some((ch) => (ch.effect.offer as { kind?: string })?.kind === 'fund_bid'))!
    const s = toAct5(preset('firm_builder'), { vfuture: 'v1' })
    const id = act5CardEngineId(card.id)
    s.phase = 'live'
    s.interrupt = { id: 'event', event: id, week: 1, coin: 'BTC', changePct: 0 }
    const picks = act5CardPicks(s)!
    expect(picks.kind).toBe('stake')
    expect(picks.chosen).toBe(picks.options[0].id)
    const r = applyAction(s, { type: 'ACT5_CARD_PICK', target: picks.options.at(-1)!.id })
    if (!r.ok) throw new Error(r.error.key)
    if (r.ok) expect(act5CardPicks(r.state)!.chosen).toBe(picks.options.at(-1)!.id)
    expect(applyAction(s, { type: 'ACT5_CARD_PICK', target: 'nowhere' }).ok).toBe(false)
  })
})

describe('the trigger-card guard (M60.8, §0.16 item 2)', () => {
  it('no trigger card plays, and no card shows a trigger title, before the future’s trigger quarter', () => {
    const shown: Strategy = { plan: () => [] }
    for (const v of V_FUTURE_IDS) {
      const seen: { q: number; id: string }[] = []
      let s = toAct5(preset('firm_builder'), { vfuture: v })
      // play week by week, recording each card as it opens
      const run = playFrom(s, { ...shown, answer: (st) => (seen.push({ q: st.quarter, id: st.interrupt!.event! }), undefined) }, { through: 5 })
      s = run.state
      const trig = triggerQuarterV(s)!
      const trigCard = act5CardEngineId(ACT5_CARDS.find((c) => c.future === v && c.role === 'trigger')!.id)
      const titles = V_FUTURE_IDS.map((f) => signalsHiddenV(f).trigger.title.toLowerCase())
      for (const x of seen) {
        if (x.id === trigCard) expect(x.q, v).toBeGreaterThanOrEqual(trig)
        if (x.q >= trig) continue
        const card = ACT5_CARDS.find((c) => act5CardEngineId(c.id) === x.id)
        if (!card) continue
        const text = [card.title, card.body, ...card.choices.map((c) => c.label)].join(' ').toLowerCase()
        for (const title of titles) expect(text.includes(title), `${v} ${card.id} before ${CONTENT.quarters[trig]}`).toBe(false)
      }
      expect(seen.some((x) => x.id === trigCard), v).toBe(true)
      expect(first5).toBeLessThan(trig)
    }
  })
})
