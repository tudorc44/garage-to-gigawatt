// The Act III archetypes (M18.5; doc 28's player types, adapted to the real sim). Each wraps the preset's own bot: in
// Act III it keeps only the bot's routine upkeep (repairs, the HODL %, power-contract renewals, the bridge) and makes
// every Act III decision itself (cards, renewals, blend-and-extend, reopeners, facilities, new projects). Tools only;
// no hidden file is read (the card choices are classed by the move log's own rule, cardChoiceMove).
import { CONTENT } from '../src/content/index.ts'
import { act3CardEngineId } from '../src/content/act3Cards.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import type { Strategy } from '../src/sim/replay.ts'
import { blendOffers } from '../src/sim/selectors.ts'
import type { GameState, Project } from '../src/sim/state.ts'
import { cardChoiceMove } from '../src/sim/systems/act3Moves.ts'
import { standbyArrangeBlocker } from '../src/sim/systems/corporateDebt.ts'
import { eventChoices, getCard } from '../src/sim/systems/events.ts'
import { debtUsd } from '../src/sim/systems/loans.ts'
import { playerReopenBlocker, renewalOffer } from '../src/sim/systems/renewals.ts'
import { gpuContractUsdHr, tenantCard } from '../src/sim/systems/projects.ts'
import { scenarioOf } from '../src/sim/systems/market.ts'
import { convertibleKw } from '../src/sim/systems/hosting.ts'
import { capacityKw, poweredKw } from '../src/sim/systems/sites.ts'

export const ARCHETYPES = [
  'passive',
  'ignorer',
  'hedged',
  'builder',
  'over-reactor',
  'long-locked',
  'flexible',
] as const
export type Archetype = (typeof ARCHETYPES)[number]

const q = (label: string) => CONTENT.quarters.indexOf(label)

/** The base bot's actions an archetype keeps in Act III: upkeep, not decisions. */
const UPKEEP = new Set<Action['type']>([
  'REPAIR_MACHINES',
  'SET_HODL',
  'NEGOTIATE_START',
  'NEGOTIATE_COUNTER',
  'NEGOTIATE_ACCEPT',
  'REPAY_BRIDGE_LOAN',
])

type CardChoice = {
  id: string
  effects: Record<string, unknown>
  act3Effect?: Record<string, unknown>
}

/** The Act III card on screen: its open choices (not greyed) and its default; null for any other interrupt. */
function act3Card(s: GameState) {
  if (s.interrupt?.id !== 'event') return null
  const card = getCard(s.interrupt.event ?? '')
  if (card?.act !== 3) return null
  const open = new Set(eventChoices(s))
  return {
    def: card.default,
    choices: (card.choices as CardChoice[]).filter((c) => open.has(c.id)),
  }
}

const kindOf = (c: CardChoice) => (c.act3Effect ? cardChoiceMove(c.act3Effect) : null)
const lengthens = (c: CardChoice) => kindOf(c) === 'card_lengthen'
const shortens = (c: CardChoice) => kindOf(c) === 'card_shorten'
const drawsDebt = (c: CardChoice) => !!c.act3Effect && 'debt' in c.act3Effect
const signsPpa = (c: CardChoice) => 'ppa_switch' in c.effects || 'ppa_site_mw' in c.effects

/** An archetype's answer to an Act III card (undefined: the default). */
function cardAnswer(a: Archetype, s: GameState): string | undefined {
  const card = act3Card(s)
  if (!card) return undefined
  const cs = card.choices
  const first = (pred: (c: CardChoice) => boolean) => cs.find(pred)?.id
  switch (a) {
    case 'passive':
      return undefined
    case 'ignorer':
      // M18.9 (DT): every card's debt choice in 2027; otherwise the default
      return s.quarter <= q('2027Q4') ? first(drawsDebt) : undefined
    case 'hedged': {
      // M18.9 (DT): the default choices, but never a debt-drawing one
      const def = cs.find((c) => c.id === card.def)
      if (def && drawsDebt(def)) return first((c) => !drawsDebt(c))
      return undefined
    }
    case 'builder':
      return first(lengthens) ?? first(signsPpa)
    case 'over-reactor':
      return s.quarter >= q('2027Q2') && s.quarter <= q('2028Q2')
        ? first((c) => c.id !== card.def)
        : undefined
    case 'long-locked':
      return first(lengthens)
    case 'flexible':
      return first(shortens)
  }
}

/** LTV: everything owed ÷ the last reported valuation. */
export function ltvOf(s: GameState): number {
  return debtUsd(s) / Math.max(1, s.reports.at(-1)?.valuationUsd ?? 1)
}
/** M18.9 (DT): the ignorer borrows up to this LTV. */
const IGNORER_LTV = 0.6

/** Plays `actions` on a copy; keeps the ones the game accepts. */
function runner(state: GameState) {
  let s = state
  const done: Action[] = []
  const run = (a: Action) => {
    const r = applyAction(s, a)
    if (r.ok) {
      s = r.state
      done.push(a)
    }
    return r.ok
  }
  return { run, done, get: () => s, set: (x: GameState) => (s = x) }
}

/**
 * One new project committed (opened, its tenant or spot, debt and cash, started), trying sizes down from 20 MW: on
 * free MW at the site with the most, else with new grid power at the largest site. Returns whether it started.
 */
function commitProject(
  r: ReturnType<typeof runner>,
  kind: 'shell' | 'cloud',
  opts: {
    debt: boolean
    minTermQuarters?: number
    /** M18.8 (DT): this size only, on new grid power at the largest site (the builder). */
    sizeMw?: number
    /** M18.9 (DT): a cloud must sign a GPU contract (so a DDTL funds it); otherwise nothing is committed. */
    needContract?: boolean
    /** M18.9: keep a size only if the company after its start passes this (the ignorer: LTV ≤ 60%). */
    accept?: (s: GameState) => boolean
  },
): boolean {
  const sites = r.get().sites.filter((x) => x.tier !== CONTENT.siteTiers[0].id)
  if (sites.length === 0) return false
  // free MW where there are most; else new grid power at the largest site (mine)
  const byRoom = [...sites].sort((a, b) => convertibleKw(r.get(), b.id) - convertibleKw(r.get(), a.id))[0]
  const largest = [...sites].sort((a, b) => capacityKw(b) - capacityKw(a))[0]
  const sizes = opts.sizeMw ? [opts.sizeMw] : [40, 30, 20, 15, 10, 8, 5, 3, 2, 1]
  for (const mw of sizes) {
    const room = !opts.sizeMw && convertibleKw(r.get(), byRoom.id) >= mw * 1000
    const saved = r.get()
    const n = r.done.length
    const opened = r.run({
      type: 'PROJECT_OPEN',
      siteId: room ? byRoom.id : largest.id,
      kw: mw * 1000,
      kind,
      ...(kind === 'cloud' ? { gpu: 'b200' } : {}),
      ...(room ? {} : { power: 'grid' as const }),
    })
    const p = opened ? r.get().projects.at(-1)! : undefined
    if (p) {
      const longEnough = (o: (typeof p.offers)[number]) =>
        (o.gpu ? o.gpu.termYears : tenantCard(o.card)!.termYears) * 4 >= (opts.minTermQuarters ?? 0)
      // (M18.10, DT: a cloud takes the highest-priced GPU contract, whatever the tenant type: chasing yield)
      const gpuUsdHr = (o: (typeof p.offers)[number]) =>
        (gpuContractUsdHr(p.gpu!, o.gpu!.termYears, r.get().quarter, scenarioOf(r.get())) ?? 0) *
        (o.priceMult ?? 1)
      const price = (o: (typeof p.offers)[number]) =>
        kind === 'cloud' ? gpuUsdHr(o) : tenantCard(o.card)!.priceUsdMwYr
      const best = [...p.offers]
        .filter((o) => (kind === 'cloud' ? !!o.gpu : true) && longEnough(o))
        .sort((x, y) => price(y) - price(x))[0]
      // a shell signs its best lease; a cloud its GPU contract if offered (a DDTL needs one), else spot
      if (best) r.run({ type: 'PROJECT_SIGN_TENANT', projectId: p.id, offerId: best.id })
      else if (kind === 'cloud' && !opts.needContract) r.run({ type: 'PROJECT_SPOT', projectId: p.id })
      if (opts.debt)
        for (const debt of ['project_debt', 'ddtl'] as const)
          r.run({ type: 'PROJECT_DEBT', projectId: p.id, debt, on: true })
      r.run({ type: 'PROJECT_FUND_CASH', projectId: p.id })
      if (r.run({ type: 'PROJECT_START', projectId: p.id }) && (!opts.accept || opts.accept(r.get())))
        return true
    }
    r.set(saved)
    r.done.length = n
  }
  return false
}

/** An archetype played on top of the preset's own bot. `signOnly`: answer just this card's PPA choice (C3). */
export function archetype(base: Strategy, a: Archetype, opts: { signOnly?: string } = {}): Strategy {
  return {
    ...base,
    answer(s) {
      if (s.act !== 3) return base.answer?.(s)
      // C3: sign just this card's PPA choice (matched by its engine id)
      const card = act3Card(s)
      if (opts.signOnly && card && s.interrupt?.event === act3CardEngineId(opts.signOnly))
        return card.choices.find(signsPpa)?.id
      return cardAnswer(a, s)
    },
    plan(state) {
      if (state.act !== 3) return base.plan(state)
      const r = runner(state)
      for (const x of base.plan(state)) if (UPKEEP.has(x.type)) r.run(x)
      const s = () => r.get()
      const quarter = s().quarter
      const committedBy = (s().act3Moves ?? []).some((m) => m.kind === 'project_commit')
      switch (a) {
        case 'ignorer':
          // M18.9 (DT): each 2027 quarter with LTV under 60%, one new B200 cloud (a 2+ year GPU contract and its DDTL,
          // new grid power at the largest site without spare MW), the largest that keeps LTV at 60% or under
          if (quarter <= q('2027Q4') && ltvOf(s()) < IGNORER_LTV)
            commitProject(r, 'cloud', {
              debt: true,
              minTermQuarters: 8,
              needContract: true,
              accept: (x) => ltvOf(x) <= IGNORER_LTV,
            })
          break
        case 'hedged': {
          // M18.9 (DT): the standby in 2027Q1 and at each expiry; LTV ≤ 40% (repays when above); default cards
          if (!standbyArrangeBlocker(s())) r.run({ type: 'STANDBY_ARRANGE' })
          const ltv = () => ltvOf(s())
          for (const f of [...s().facilities].filter((x) => x.kind === 'corporate' || x.kind === 'standby'))
            if (ltv() > 0.4) r.run({ type: 'REPAY_COMPANY_FACILITY', facilityId: f.id })
          if (ltv() > 0.4 && s().equipmentLoan) r.run({ type: 'REPAY_LOAN' })
          break
        }
        case 'builder':
          // M18.8 (DT): one shell of max(5 MW, 50% of its energized MW) on new grid power at its largest site, a 2+ year
          // lease, project debt where the tenant qualifies
          if (quarter >= q('2027Q2') && quarter <= q('2027Q4') && !committedBy) {
            const energizedMw =
              s().sites.reduce((kw, x) => kw + poweredKw(x, quarter), 0) / 1000
            commitProject(r, 'shell', {
              debt: true,
              minTermQuarters: 8,
              sizeMw: Math.max(5, Math.round(0.5 * energizedMw)),
            })
          }
          break
        case 'long-locked':
          for (const o of blendOffers(s())) r.run({ type: 'BLEND_ACCEPT', projectId: o.projectId })
          break
        case 'flexible':
          // M18.10 (DT): reopens a lease only when the new rent would be higher than the current one
          for (const p of s().projects as Project[])
            if (!playerReopenBlocker(s(), p.id) && (renewalOffer(s(), p)?.mult ?? 0) > 1)
              r.run({ type: 'REOPEN_LEASE', projectId: p.id })
          break
      }
      return r.done
    },
  }
}
