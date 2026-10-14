// M57.3 (doc 43 §18 with §0.3, §0.6-§0.8): Act V's bot archetypes for the sim-runner. Each is a Strategy (src/sim/replay.ts)
// built only from the game's own Act V actions; every action is tried in order on a scratch copy and kept only if it
// succeeds, so a bot never fails a step (as Act IV's bots). No bot grows the ground book (no Act II/III habits in Act V:
// mine, reversible); every bot holds at the exit (the default), and the runner prices the sale from the same run.
//   holder   Firm Holder (§0.3): keeps every site and stake, renews short, keeps free MW, stays merchant, pays calls and
//            any position's upgrade bill.
//   flex     Flex Operator: renews short, requests new grid MW for a leased hall once a year when cash allows, takes the
//            fast lane where it's open (enrolling the load as curtailable) or pays the bill, sells 80% of plant output forward.
//   seller   Seller (§0.3, §0.7): from 2036Q1, locks every renewal and blend long, sells every plant stake to funds, sells
//            every leased site that serves no GPU cluster of its own (the whole-site sale), and the free MW of the rest.
//   locker   Locker (§0.8): keeps every site and stake, locks every renewal and blend long, contracts 80% of plant output.
//   orbit    Orbit Replacer (§18, §0.15 fix 6): the Holder's ground; every block at its design end replaced (else extended),
//            each new block carried through (tenant, capital with project debt, launch, insurance) with Act IV's orbit step,
//            and a new block opened in its shell whenever cash allows (mine: cash ≥ $500M, up to 20 MW, the newest generation);
//            it rents the ground-link units its interactive tenants need (M63.1).
//   builder  Builder (V-B6, §0.15 fix 7): the Firm Holder plus every follow-on unit offered (a 20% stake, else 10%).
//   balanced Balanced: renews short, pays calls when cash allows, contracts half of plant output, replaces blocks.
//   overreactor  Balanced, except in the future's decoy quarters it does the decoy's wrong stance hard.
//   passive  Passive: no actions at all (every card and offer at its default).
//   perfect  The perfect reader (V-B8, V-B9): the +1 moves in quarters whose ideal stance is +1, the −1 moves in the −1
//            quarters, and in the 0s it rests (calls and block replacements only, which score 0), as Act IV's perfect
//            reader does (M59.1: it used the Balanced habits there, whose short renewals and contracts are ±1 moves).
//            In V4 it also replaces and grows orbit every quarter, on cash before act quarter 12 (M64.2: those moves score 0).
//            Reads the hidden ideal: tools only.
import { CONTENT, actFirstQuarter } from '../../src/content/index.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { Strategy } from '../../src/sim/replay.ts'
import { topHeat } from '../../src/sim/selectors.ts'
import type { GameState } from '../../src/sim/state.ts'
import type { VFutureId } from '../../src/content/schemas.ts'
import { idealStancesV, scoredKindsAtV } from '../../src/sim/systems/readingScoreV.ts'
import { queueView } from '../../src/sim/systems/queue.ts'
import { isPlant } from '../../src/sim/systems/plants.ts'
import { availableGenerations } from '../../src/sim/systems/orbit.ts'
import { linkUnitsNeeded } from '../../src/sim/systems/orbitOps.ts'
import { orbitStep } from '../act4/bots.ts'
import readingRaw from '../../src/content/reading_score_v.json' with { type: 'json' }

/** Tries each action in order on a copy; returns the ones that succeeded (in order) and the state after them. */
function tryAll(state: GameState, actions: Action[]): { kept: Action[]; after: GameState } {
  let s = state
  const kept: Action[] = []
  for (const a of actions) {
    const r = applyAction(s, a)
    if (r.ok) {
      s = r.state
      kept.push(a)
    }
  }
  return { kept, after: s }
}

const q5 = (s: GameState) => s.quarter - actFirstQuarter(5)
/** Cash kept back before paying for anything optional (mine, reversible). */
const BUFFER_USD = 100e6

/** Applies a list of steps, each built on the state the previous ones left; returns every kept action. */
function chain(state: GameState, steps: ((s: GameState) => Action[])[]): Action[] {
  let s = state
  const kept: Action[] = []
  for (const step of steps) {
    const r = tryAll(s, step(s))
    s = r.after
    kept.push(...r.kept)
  }
  return kept
}

// ---------- the moves ----------

/** Every open shell renewal taken long or short (a blend-and-extend offer accepted when long). */
const renewals = (term: 'long' | 'short') => (s: GameState): Action[] => [
  ...(s.act3Renewals ?? []).map((r): Action => ({ type: 'RENEWAL_TERM', projectId: r.projectId, term })),
  ...(term === 'long' ? (s.act3BlendOffers ?? []).map((b): Action => ({ type: 'BLEND_ACCEPT', projectId: b.projectId })) : []),
]

/** A venture's and the accelerator's cash calls: paid when cash allows, else diluted. */
const calls = (s: GameState): Action[] => [
  ...(s.ventures ?? [])
    .filter((v) => v.call)
    .map((v): Action => ({ type: 'VENTURE_CALL', ventureId: v.id, choice: s.cash > v.call!.dueUsd + BUFFER_USD ? 'pay' : 'dilute' })),
  ...(s.accelerator?.call ? [{ type: 'ACCEL_CALL', choice: s.cash > s.accelerator.call.dueUsd + BUFFER_USD ? 'pay' : 'dilute' } as Action] : []),
]

/** Pays every position's study bill (paying buys no speed, but an unpaid bill holds the power). */
const payUpgrades = (s: GameState): Action[] =>
  (queueView(s)?.positions ?? []).filter((p) => p.billUsd !== null && !p.billPaid && s.cash > p.billUsd + BUFFER_USD).map((p) => ({ type: 'PAY_UPGRADE', projectId: p.projectId }))

/** The fast lane on every waiting position where it's open; else its bill paid. */
const fastLane = (s: GameState): Action[] =>
  (queueView(s)?.positions ?? []).flatMap((p): Action[] =>
    p.fastBlocked === null ? [{ type: 'TAKE_FAST_LANE', projectId: p.projectId }] : [],
  )

const operatingPlants = (s: GameState) => (s.ventures ?? []).filter((v) => v.stake > 0 && isPlant(s, v))
/** Sells `share` of every operating plant's merchant output forward. */
const contractOutput = (share: number) => (s: GameState): Action[] =>
  operatingPlants(s).map((v) => ({ type: 'CONTRACT_PLANT_OUTPUT', ventureId: v.id, share }))

/** Sells every venture stake to funds (running plants and ventures before first power). */
const sellStakes = (s: GameState): Action[] =>
  (s.ventures ?? []).filter((v) => v.stake > 0).map((v) => ({ type: 'SELL_PLANT_STAKE', ventureId: v.id, share: 1 }))

/** A site serving a GPU cluster of the company's own (a live cloud) is kept; the rest are sold whole. */
const servesOwnCloud = (s: GameState, siteId: string) =>
  s.projects.some((p) => p.siteId === siteId && p.kind === 'cloud' && (p.stage === 'live' || p.stage === 'building'))
const sellSites = (s: GameState): Action[] =>
  s.sites.flatMap((site): Action[] =>
    servesOwnCloud(s, site.id) ? [{ type: 'SELL_SITE_POWER', siteId: site.id }] : [{ type: 'SELL_SITE', siteId: site.id }],
  )

/** Every live block at its design end: replaced (else extended). */
const replaceBlocks = (s: GameState): Action[] =>
  (s.act4Orbit?.blocks ?? []).flatMap((b): Action[] => [
    { type: 'ORBIT_EOL', blockId: b.id, choice: 'replace' },
    { type: 'ORBIT_EOL', blockId: b.id, choice: 'extend' },
  ])

/**
 * Requests new grid MW (a position) for a leased hall: the biggest size the site can take that cash covers, its best tenant
 * offer signed, funded from cash and started (mine, reversible: 10-40 MW, at most one a year, cash ≥ the cost + buffer).
 */
function requestGridMw(s: GameState): Action[] {
  if (q5(s) % 4 !== 0 && q5(s) !== 1) return []
  for (const site of s.sites.filter((x) => x.tier !== CONTENT.siteTiers[0].id)) {
    for (const mw of [40, 20, 10]) {
      const open: Action = { type: 'PROJECT_OPEN', siteId: site.id, kw: mw * 1000, kind: 'shell', power: 'grid' }
      const r = applyAction(s, open)
      if (!r.ok) continue
      const p = r.state.projects.at(-1)!
      const offer = [...p.offers].sort((a, b) => (b.priceMult ?? 1) - (a.priceMult ?? 1))[0]
      if (!offer) continue
      const done = tryAll(r.state, [
        { type: 'PROJECT_SIGN_TENANT', projectId: p.id, offerId: offer.id },
        { type: 'PROJECT_FUND_CASH', projectId: p.id },
        { type: 'PROJECT_START', projectId: p.id },
      ])
      if (done.kept.some((a) => a.type === 'PROJECT_START') && done.after.cash > BUFFER_USD) return [open, ...done.kept]
    }
  }
  return []
}

/** Every follow-on unit offered (EGS, SMR): a 20% stake, else 10%, no offtake. */
const followOns = (): Action[] =>
  (['egs', 'smr'] as const).flatMap((venture): Action[] => [
    { type: 'COMMIT_FOLLOW_ON', venture, stake: 0.2, offtake: 0, prepay: 0 },
    { type: 'COMMIT_FOLLOW_ON', venture, stake: 0.1, offtake: 0, prepay: 0 },
  ])

/** Orbit growth: carry every proposed block through, and open one more in the busiest shell when cash allows. */
function orbitGrowth(s: GameState, noEquity = false): { kept: Action[]; after: GameState } {
  const blocks = s.act4Orbit?.blocks ?? []
  const shells = blocks.filter((b) => b.stage === 'live').map((b) => b.shell)
  const shell = [...(['high_leo', 'sso', 'high_orbit'] as const)].sort((a, b) => shells.filter((x) => x === b).length - shells.filter((x) => x === a).length)[0]
  const gen = availableGenerations(s).at(-1)
  const step = orbitStep(s, { kind: 'shell', shell, contractOnly: false, insure: true, debt: true, maxMw: 20, open: s.cash >= ORBIT_OPEN_CASH_USD, gen, noEquity })
  // (M63.1: rent the ground-link units its interactive tenants need; without them those blocks earn nothing)
  const need = (step.after.act4Orbit?.blocks ?? [])
    .filter((b) => b.stage === 'live' || b.stage === 'climbing' || b.stage === 'awaiting_launch')
    .reduce((a, b) => a + linkUnitsNeeded(b), 0)
  if (need === (step.after.act4Orbit?.linksRented ?? 0)) return step
  const links = tryAll(step.after, [{ type: 'RENT_LINK_UNITS', units: Math.ceil(need) }])
  return { kept: [...step.kept, ...links.kept], after: links.after }
}
const ORBIT_OPEN_CASH_USD = 500e6

// ---------- the archetypes ----------

/** The +1 quarter (scarcity pays): renew short, pay bills, request MW. The −1 quarter: lock long, contract, sell. */
const PLUS: ((s: GameState) => Action[])[] = [calls, renewals('short'), payUpgrades, requestGridMw, payUpgrades]
const MINUS: ((s: GameState) => Action[])[] = [calls, renewals('long'), contractOutput(0.8), sellStakes, sellSites]
const BALANCED: ((s: GameState) => Action[])[] = [calls, renewals('short'), payUpgrades, contractOutput(0.5), replaceBlocks]
/** Enrols every site's running load as curtailable (1 BW each). */
const enrolAll = (s: GameState): Action[] => s.sites.map((x) => ({ type: 'ENROL_FLEXIBLE', siteId: x.id }))
/** V2's scored −1 moves after its trigger: enrol load, take the fast lane, pay the calls. */
const FLEX: ((s: GameState) => Action[])[] = [calls, fastLane, enrolAll]
/** A quarter with no stance: only what scores 0 (calls, block replacements). */
const REST: ((s: GameState) => Action[])[] = [calls, replaceBlocks]

const strategy = (plan: (s: GameState) => Action[]): Strategy => ({ plan })

/** The future's decoy quarters (act quarters) and the wrong stance in each: the opposite of the ideal, or of the next one. */
function decoyStance(v: VFutureId): Map<number, number> {
  // (M60.4: the decoy's wrong stance as the file states it; it was inferred from the ideal, which read V4's decoy as +1)
  const f = (readingRaw as unknown as { futures: Record<string, { decoy: { quarters: string[]; wrong_stance: number } }> }).futures[v]
  const first = actFirstQuarter(5)
  const m = new Map<number, number>()
  for (const label of f.decoy.quarters) m.set(CONTENT.quarters.indexOf(label) - first, f.decoy.wrong_stance)
  return m
}

export const ACT5_ARCHETYPES = ['holder', 'flex', 'seller', 'locker', 'orbit', 'builder', 'balanced', 'overreactor', 'passive', 'perfect'] as const
export type Act5Archetype = (typeof ACT5_ARCHETYPES)[number]

export function act5Bot(name: Act5Archetype): Strategy {
  switch (name) {
    case 'holder':
      return strategy((s) => chain(s, [calls, renewals('short'), payUpgrades]))
    case 'flex':
      return strategy((s) => chain(s, [calls, renewals('short'), fastLane, payUpgrades, contractOutput(0.8), requestGridMw, fastLane]))
    case 'seller':
      return strategy((s) => chain(s, MINUS))
    case 'locker':
      return strategy((s) => chain(s, [calls, renewals('long'), contractOutput(0.8)]))
    case 'orbit':
      return strategy((s) => {
        const kept = chain(s, [replaceBlocks, calls, renewals('short'), payUpgrades])
        const after = tryAll(s, kept).after
        return [...kept, ...orbitGrowth(after).kept]
      })
    case 'builder':
      return strategy((s) => chain(s, [calls, renewals('short'), payUpgrades, followOns]))
    case 'balanced':
      return strategy((s) => chain(s, BALANCED))
    case 'overreactor':
      return strategy((s) => {
        const wrong = s.vFutureId ? decoyStance(s.vFutureId).get(q5(s)) : undefined
        return chain(s, wrong === 1 ? PLUS : wrong === -1 ? MINUS : BALANCED)
      })
    case 'passive':
      return strategy(() => [])
    case 'perfect':
      return withHeatHabit(strategy((s) => {
        const ideal = s.vFutureId ? idealStancesV(s.vFutureId)[q5(s)] : 0
        // (M60.4: where only flexibility is scored, V2 after its trigger, the −1 moves are enrolling and the fast lane)
        if (ideal === -1 && s.vFutureId && scoredKindsAtV(s.vFutureId, q5(s))) return chain(s, FLEX)
        const plan = chain(s, ideal === 1 ? PLUS : ideal === -1 ? MINUS : REST)
        // (M64.2, doc 43 §0.20 item 2: V4's perfect reader replaces and grows orbit as the Orbit Replacer does, every quarter;
        // those moves score 0. In its calm quarters (act quarters 0-11) it runs on cash: a raise there would take the -1 of
        // the first sale and score as a -1 move in a 0 quarter. Its short renewals and upgrade bills (+1) are not copied.)
        if (s.vFutureId !== 'v4') return plan
        const after = tryAll(s, plan).after
        const replaced = tryAll(after, replaceBlocks(after))
        const growth = orbitGrowth(replaced.after, q5(s) < 12)
        return [...plan, ...replaced.kept, ...growth.kept]
      }))
  }
}

/** The Heat level at which the perfect reader starts answering its neighbours (M69.5, doc 43 §0.26 ⚙). */
export const HEAT_HABIT_AT = 45

/**
 * M69.5 (doc 43 §0.26): the perfect reader's one housekeeping habit, the player's own tools. When its hottest site's Heat is at
 * or above 45 it talks to the neighbours there; if it talked there last quarter and the site is still at or above 45, it pays for
 * noise mitigation (once a site). Sent after the plan's other moves, so it never takes Bandwidth from the reading.
 */
export function heatHabit(s: GameState): Action[] {
  const top = topHeat(s)
  if (!top || top.heat < HEAT_HABIT_AT) return []
  const rec = s.siteHeat[top.site.id]
  const talkedLastQuarter = rec?.outreachQuarter === s.quarter - 1
  if (talkedLastQuarter && !rec.mitigated) return [{ type: 'MITIGATE_NOISE', siteId: top.site.id }]
  return [{ type: 'OUTREACH', siteId: top.site.id }]
}

function withHeatHabit(base: Strategy): Strategy {
  return {
    ...base,
    plan: (s) => {
      const plan = base.plan(s)
      const after = tryAll(s, plan).after
      return [...plan, ...tryAll(after, heatHabit(after)).kept]
    },
  }
}
