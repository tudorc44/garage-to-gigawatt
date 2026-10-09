// M32.5 (doc 33 §18): Act IV's bot archetypes for the sim-runner. Each is a Strategy (src/sim/replay.ts): its Plan-phase
// actions are tried in order on a scratch copy and only those that succeed are kept, so a bot never fails a step. The
// ground side of every archetype but Passive is the preset's own Act II/III bot (Ground Holder is nothing else).
//   ground      Ground Holder: no orbit, no Moon.
//   sprinter    Orbit Sprinter: orbital clouds in the busy shell, as big and as early as it can, little insurance.
//   diversified Orbit Diversified: orbital shells across the three shells, insured, only on take-or-pay tenants.
//   lunar       Lunar Bettor: two polar claims, prospects, power, pilots, offtake, production when allowed; one modest
//               insured block in a quiet shell.
//   balanced    Balanced: ground, measured orbit (insured shells, presold, none started after 2033), one prospect.
//   overreactor Over-reactor: Balanced, except in the future's decoy window it does the decoy's wrong stance hard.
//   passive     Passive: no actions at all.
//   perfect     The perfect reader (B8, B9): commits orbit in the quarters the future's ideal stance is +1, insures,
//               presells and cancels in the −1 quarters, rests in the 0s. Reads the hidden ideal: tools only.
import { CONTENT, actFirstQuarter, act4Row } from '../../src/content/index.ts'
import { MOON } from '../../src/content/moonContent.ts'
import { openProjectView } from '../../src/sim/projectViews.ts'
import { renewalsDue } from '../../src/sim/selectors.ts'
import type { LunarClaim } from '../../src/sim/state.ts'
import { convertibleKw } from '../../src/sim/systems/hosting.ts'
import { companyLtv, covenantLimit } from '../../src/sim/systems/covenant.ts'
import { dilutionRange, equityRaiseUsd } from '../../src/sim/systems/equity.ts'
import { debtUsd } from '../../src/sim/systems/loans.ts'
import { poweredKw } from '../../src/sim/systems/sites.ts'
import { scenarioOf } from '../../src/sim/systems/market.ts'
import { resourceShare } from '../../src/sim/systems/moon.ts'
import { signalsHiddenIv } from '../../src/content/signalsHiddenIv.ts'
import { applyAction, type Action } from '../../src/sim/actions.ts'
import type { Strategy } from '../../src/sim/replay.ts'
import type { GameState } from '../../src/sim/state.ts'
import { blockMassT, generationTMw, licenceRoom, licensedMw, usedLicenceMw } from '../../src/sim/systems/orbit.ts'
import { bookedTonnes, buildCostUsd, launchPriceUsdKg, slotsTonnes } from '../../src/sim/systems/orbitLaunch.ts'
import { idealStancesIv } from '../../src/sim/systems/readingScoreIv.ts'
import { BOTS } from '../bots.ts'

type Kind = 'shell' | 'cloud'
type ShellId = 'sso' | 'high_leo' | 'high_orbit'

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

/** The preset's ground bot's plan in Act IV (its Act II/III habits), or nothing if it can't plan here. */
function groundPlan(bot: string, state: GameState): Action[] {
  try {
    return tryAll(state, BOTS[bot]?.plan(state) ?? []).kept
  } catch {
    return []
  }
}

const q4 = (s: GameState) => s.quarter - actFirstQuarter(4)

/** The biggest block size up to `maxMw` whose mass fits the launch slots two quarters out. */
function sizeFor(s: GameState, shell: ShellId, maxMw: number): number | null {
  const tMw = generationTMw(s, 'gen33') ?? generationTMw(s, 'gen31')!
  const free = slotsTonnes(s, s.quarter + 2) - bookedTonnes(s, s.quarter + 2)
  for (const mw of [100, 50, 25, 10, 5]) if (mw <= maxMw && blockMassT(tMw, mw, shell) <= free) return mw
  return null
}

/**
 * An equity raise that brings at least `needUsd` above the cash already there (the space-equity window, when open), at
 * most 30% dilution; nothing if cash covers it.
 */
function fund(s: GameState, needUsd: number): Action[] {
  const short = needUsd - s.cash
  if (short <= 0) return []
  const pre = s.reports.at(-1)?.valuationUsd ?? 0
  if (pre <= 0) return []
  const d = Math.min(0.3, Math.max(0.08, short / (pre + short)))
  return [{ type: 'RAISE_EQUITY', dilution: Math.round(d * 100) / 100 }]
}

/** The actions that open one block (if none is planning), funding its build with equity if cash is short. */
function orbitActions(
  s: GameState,
  o: { kind: Kind; shell: ShellId; contractOnly: boolean; insure: boolean; debt: boolean; maxMw: number; open: boolean },
): Action[] {
  const out: Action[] = []
  const gen = generationTMw(s, 'gen33') !== null ? 'gen33' : 'gen31'
  if (!(s.act4Orbit?.licences ?? []).some((l) => l.shell === o.shell)) out.push({ type: 'FILE_ORBITAL_LICENCE', shell: o.shell })
  const planning = (s.act4Orbit?.blocks ?? []).filter((b) => b.stage === 'proposed')
  if (o.open && planning.length === 0) {
    const mw = sizeFor(s, o.shell, o.maxMw)
    if (mw !== null) {
      const tMw = generationTMw(s, gen)!
      const probe = { massT: blockMassT(tMw, mw, o.shell), kind: o.kind, mw, shell: o.shell, capital: 'cash' } as Parameters<typeof buildCostUsd>[1]
      // the build's own share (40% with project debt) plus the launch deposit and a margin
      out.push(...fund(s, buildCostUsd(s, probe) * (o.debt ? 0.5 : 1.1) + 20e6))
      out.push({ type: 'OPEN_ORBITAL_BLOCK', kind: o.kind, mw, shell: o.shell, gen })
    }
  }
  return out
}

/** Fills the slots of planning blocks once their build and deposit are funded (after any open above has been applied). */
function fillActions(
  s: GameState,
  o: { contractOnly: boolean; insure: boolean; debt: boolean; onlyInsure?: boolean },
): Action[] {
  const out: Action[] = []
  for (const b of (s.act4Orbit?.blocks ?? []).filter((x) => x.stage === 'proposed' && !o.onlyInsure)) {
    const ownShare = o.debt ? 0.4 : 1
    const needUsd = buildCostUsd(s, b) * ownShare + 0.15 * b.massT * 1000 * launchPriceUsdKg(s, 'pallas', b.shell) + 10e6
    if (s.cash < needUsd) {
      out.push(...fund(s, needUsd))
      continue
    }
    if (b.tenant === null) {
      if (b.offers.length > 0) out.push({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 0 })
      else if (!o.contractOnly) out.push({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 'spot' })
    }
    if (b.capital === null) {
      if (o.debt) out.push({ type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: 'project_debt' })
      out.push({ type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: 'cash' })
    }
    if (!b.launch) {
      // the earliest quarter with room for it, on the dominant launcher (or Northgate if it's the only one with room)
      for (let k = 2; k <= 6; k++) {
        const q = s.quarter + k
        if (slotsTonnes(s, q) - bookedTonnes(s, q, b.id) < b.massT) continue
        out.push({ type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider: 'pallas', quarter: q })
        out.push({ type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider: 'northgate', quarter: q })
        break
      }
    }
  }
  if (o.insure)
    for (const b of s.act4Orbit?.blocks ?? []) out.push({ type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })
  return out
}

/**
 * One orbital step, with a player's discipline: file the shell's licence first and wait for its approval; open a block
 * only with licence room; fill its slots (tenant, capital, launch) only once its build and deposit are funded (raising
 * equity first when short), so no tenant's clock runs on a block that can't start.
 */
function orbitStep(
  s: GameState,
  o: { kind: Kind; shell: ShellId; contractOnly: boolean; insure: boolean; debt: boolean; maxMw: number; open: boolean },
): { kept: Action[]; after: GameState } {
  const room = licensedMw(s, o.shell) - usedLicenceMw(s, o.shell)
  if (room <= 0) {
    const licence = tryAll(s, orbitActions(s, { ...o, open: false }))
    const ins = tryAll(licence.after, o.insure ? fillActions(licence.after, { ...o, onlyInsure: true }) : [])
    return { kept: [...licence.kept, ...ins.kept], after: ins.after }
  }
  const first = tryAll(s, orbitActions(s, { ...o, maxMw: Math.min(o.maxMw, room) }))
  const second = tryAll(first.after, fillActions(first.after, o))
  return { kept: [...first.kept, ...second.kept], after: second.after }
}

/**
 * M34.4 (design thread, 9 Oct 2026, answers 2-3): how often the Ground Holder borrowed, raised, skipped, built a cloud
 * or bought a site (the runner resets and reports these).
 */
export const groundStats = { borrowed: 0, raised: 0, skipped: 0, built: 0, sites: 0 }
/** Company debt ÷ trailing four quarters' EBITDA, the cap on borrowing (designed: 4×). */
const LEVERAGE_CAP = 4
/** The founder stake an equity raise may never take the Ground Holder below (designed). */
const FOUNDER_FLOOR = 0.5

/** Company debt ÷ the last four reports' EBITDA (Infinity with none). */
function leverage(s: GameState): number {
  const e = s.reports.slice(-4).reduce((n, r) => n + r.ebitdaUsd, 0)
  const debt = debtUsd(s)
  if (debt <= 0) return 0
  return e > 0 ? debt / e : Infinity
}

/** True when the step's debt stays within the caps: ≤ 4× trailing EBITDA and inside the leverage covenant. */
function debtOk(s: GameState): boolean {
  return leverage(s) <= LEVERAGE_CAP && companyLtv(s) <= covenantLimit(s)
}

/**
 * The smallest at-the-market raise (the game's own dilution steps) that brings at least `shortUsd`, never taking the
 * founder below 50%; null if none does.
 */
function equityFor(s: GameState, shortUsd: number): Action | null {
  const [lo, hi] = dilutionRange()
  for (let d = lo; d <= hi + 1e-9; d = Math.round((d + 0.01) * 100) / 100) {
    if (s.founderStake * (1 - d) < FOUNDER_FLOOR) return null
    if (equityRaiseUsd(s, d) >= shortUsd) return { type: 'RAISE_EQUITY', dilution: d }
  }
  return null
}

/**
 * M34.1 (owner, 1b) and M34.4 (design thread, 2): a ground GPU cloud at the site with the most free MW, when a GPU
 * contract is on offer. Short of cash for its share: borrow first (project debt, then a DDTL, as the game sizes them),
 * keeping debt ≤ 4× trailing EBITDA and inside the covenant; then equity for the rest (founder ≥ 50%); else skip it.
 */
function groundCloud(s: GameState): { kept: Action[]; after: GameState } | null {
  const site = s.sites
    .filter((x) => x.tier !== CONTENT.siteTiers[0].id)
    .sort((a, b) => convertibleKw(s, b.id) - convertibleKw(s, a.id))[0]
  const v = openProjectView(s)
  const gpu = v.act3?.gpusMid.at(-1) ?? v.gpus.at(-1)
  if (!site || !gpu) return null
  const freeMw = Math.floor(convertibleKw(s, site.id) / 1000)
  let offered = false
  for (const mw of [40, 30, 20, 15, 10, 8, 5, 3, 2, 1].filter((m) => m <= freeMw)) {
    const open: Action = { type: 'PROJECT_OPEN', siteId: site.id, kw: mw * 1000, kind: 'cloud', gpu }
    const r = applyAction(s, open)
    if (!r.ok) continue
    const p = r.state.projects.at(-1)!
    // a tenant must exist: a GPU contract on offer (the best priced); none now, no cloud this quarter
    const offer = [...p.offers].filter((o) => !!o.gpu).sort((a, b) => (b.priceMult ?? 1) - (a.priceMult ?? 1))[0]
    if (!offer) return null
    offered = true
    const signed = tryAll(r.state, [{ type: 'PROJECT_SIGN_TENANT', projectId: p.id, offerId: offer.id }])
    const start = (st: GameState, extra: Action[]) =>
      tryAll(st, [...extra, { type: 'PROJECT_FUND_CASH', projectId: p.id }, { type: 'PROJECT_START', projectId: p.id }])
    const started = (t: { kept: Action[] }) => t.kept.some((a) => a.type === 'PROJECT_START')
    // 1. Cash alone.
    const cash = start(signed.after, [])
    if (started(cash)) {
      groundStats.built++
      return { kept: [open, ...signed.kept, ...cash.kept], after: cash.after }
    }
    // 2. Borrow first, within the caps.
    const debt = tryAll(signed.after, [
      { type: 'PROJECT_DEBT', projectId: p.id, debt: 'project_debt', on: true },
      { type: 'PROJECT_DEBT', projectId: p.id, debt: 'ddtl', on: true },
    ])
    const borrowed = start(debt.after, [])
    if (debt.kept.length > 0 && started(borrowed) && debtOk(borrowed.after)) {
      groundStats.borrowed++
      groundStats.built++
      return { kept: [open, ...signed.kept, ...debt.kept, ...borrowed.kept], after: borrowed.after }
    }
    // 3. Then equity for the rest (with the debt if it kept inside the caps, else without it).
    for (const base of debt.kept.length > 0 ? [debt, signed] : [signed]) {
      const probe = start(base.after, [])
      if (started(probe)) continue
      const need = projectCashNeed(base.after, p.id)
      if (need === null) continue
      const raise = equityFor(base.after, need - base.after.cash + 5e6)
      if (!raise) continue
      const funded = start(base.after, [raise])
      if (started(funded) && (base === signed || debtOk(funded.after))) {
        groundStats.raised++
        if (base !== signed) groundStats.borrowed++
        groundStats.built++
        return { kept: [open, ...signed.kept, ...(base === signed ? [] : debt.kept), ...funded.kept], after: funded.after }
      }
    }
  }
  if (offered) groundStats.skipped++
  return null
}

/** What starting a project still needs in cash, or null if it can't tell (the build blocker's figure). */
function projectCashNeed(s: GameState, projectId: string): number | null {
  const r = applyAction(s, { type: 'PROJECT_START', projectId })
  if (r.ok) return 0
  const cost = r.error.params?.costUsd
  return typeof cost === 'number' ? cost : null
}

/**
 * M34.4 (design thread, 3): a company with no free MW buys one new site in the act, through the game's scouting, at most
 * half its energized MW, funded as a cloud is (borrowing as the game allows, then equity, founder ≥ 50%).
 */
function groundSite(s: GameState): { kept: Action[]; after: GameState } | null {
  if (boughtSiteInAct4(s)) return null
  const free = s.sites.reduce((n, x) => n + convertibleKw(s, x.id), 0)
  if (free >= 1000) return null
  const energized = s.sites.reduce((n, x) => n + poweredKw(x, s.quarter), 0)
  const scout = tryAll(s, [{ type: 'SCOUT_SITES_ACT2' }])
  const offers = scout.after.siteOffers
    .filter((o) => o.category && (o.kw ?? 0) <= energized / 2)
    .sort((a, b) => (b.kw ?? 0) - (a.kw ?? 0))
  for (const o of offers) {
    const buy = (st: GameState, extra: Action[]) => tryAll(st, [...extra, { type: 'BUILD_SITE', offerId: o.id }])
    let done = buy(scout.after, [])
    if (!done.kept.some((a) => a.type === 'BUILD_SITE')) {
      const raise = equityFor(scout.after, o.capexUsd - scout.after.cash + 5e6)
      if (!raise) continue
      done = buy(scout.after, [raise])
      if (!done.kept.some((a) => a.type === 'BUILD_SITE')) continue
      groundStats.raised++
    }
    groundStats.sites++
    return { kept: [...scout.kept, ...done.kept], after: done.after }
  }
  return scout.kept.length > 0 ? { kept: scout.kept, after: scout.after } : null
}

/** True once the company has bought a site in Act IV. */
const boughtSiteInAct4 = (s: GameState) =>
  s.sites.some((x) => x.acquiredQuarter !== undefined && x.acquiredQuarter !== null && x.acquiredQuarter >= actFirstQuarter(4))

/**
 * M34.1 (owner, 9 Oct 2026, 1b): the Ground Holder is a 2031 ground landlord, "no orbit, no Moon" (doc 33 §18), not "no
 * clouds": it takes its renewals, buys one site if it has no free MW (M34.4), and builds a ground GPU cloud wherever it
 * has free MW and a GPU contract is on offer.
 */
function groundCloudStep(s: GameState): { kept: Action[]; after: GameState } {
  const renewals: Action[] = renewalsDue(s)
    .filter((r) => !r.walked)
    .map((r) => ({ type: 'RENEWAL_ACCEPT', projectId: r.projectId }))
  const done = tryAll(s, renewals)
  const site = groundSite(done.after)
  const base = site ? { kept: [...done.kept, ...site.kept], after: site.after } : done
  const cloud = groundCloud(base.after)
  return cloud ? { kept: [...base.kept, ...cloud.kept], after: cloud.after } : base
}

/**
 * M34.1 (owner, 9 Oct 2026, 1d): the Lunar Bettor respects the stage gate. A pilot pays back through the lunar unit (doc 33
 * §11.3): running one lifts a site from indicated × claim to measured × pilot, so it's worth its cost only if the latest
 * prospect's upper band × that lift × the value per tonne covers the pilot and the power it still needs. Below: skip.
 */
function pilotWorthIt(s: GameState, c: LunarClaim, solarUsd: number): boolean {
  const last = c.reports.at(-1)
  if (!last) return false
  const conf = MOON.category_confidence
  const stage = MOON.stage_factor
  const lift = conf.measured * stage.pilot - conf.indicated * stage.claim
  const upsideUsd = last.highT * resourceShare(c) * act4Row(s.quarter, scenarioOf(s)).lunar_value_usd_t * lift
  return upsideUsd >= MOON.pilot.base_usd + solarUsd
}

const SITES = ['de_gerlache_ridge', 'malapert_massif', 'nobile_rim', 'haworth_rim', 'cabeus', 'amundsen_rim', 'leibnitz_beta'] as const

/** The lunar programme's step: claims (up to `sites`), missions, power, pilots with a crew, offtake, production. */
function moonActions(s: GameState, sites: number, pilots: boolean): Action[] {
  const out: Action[] = []
  const live = (s.act4Moon?.claims ?? []).filter((c) => c.status === 'claimed' || c.status === 'held')
  if (live.length < sites) {
    // the first free site that no one has landed on (claiming tries them in order; one succeeds)
    for (const site of SITES) if (!live.some((c) => c.site === site)) out.push({ type: 'CLAIM_LUNAR_SITE', site })
  }
  out.push({ type: 'ACCEPT_TASK_ORDER' })
  for (const d of s.act4Moon?.disputes ?? []) {
    out.push({ type: 'RESOLVE_LUNAR_DISPUTE', site: d.site, choice: 'hold' })
    out.push({ type: 'RESOLVE_LUNAR_DISPUTE', site: d.site, choice: 'share' })
  }
  for (const c of live) {
    const site = c.site
    if (c.status === 'claimed') {
      out.push(...fund(s, 160e6))
      out.push({ type: 'SEND_LUNAR_MISSION', site })
      continue
    }
    if (!pilots) continue
    // (M34.1, 1d: no pilot, and no power for one, below the stage gate's breakeven)
    const solarUsd = c.solar ? 0 : 300 * MOON.power.solar.hardware_usd_per_kwe
    if (!c.pilot && !pilotWorthIt(s, c, solarUsd)) continue
    if (!c.solar) {
      out.push(...fund(s, 500e6))
      out.push({ type: 'BUILD_LUNAR_SOLAR', site, kwe: 200 }, { type: 'BUILD_LUNAR_SOLAR', site, kwe: 100 })
    }
    if (!c.pilot) {
      out.push(...fund(s, 700e6))
      out.push({ type: 'DECIDE_LUNAR_PILOT', site })
    } else if (!c.pilot.maintained) out.push({ type: 'SET_LUNAR_MAINTENANCE', site, on: true })
    if (c.pilot && !c.production) out.push({ type: 'DECIDE_LUNAR_PRODUCTION', site })
  }
  if (pilots && live.some((c) => c.pilot)) {
    out.push({ type: 'SIGN_LUNAR_MEGAWATT' })
    out.push({ type: 'SIGN_LUNAR_OFFTAKE', offer: 0 })
  }
  return out
}

/** Builds a Strategy from a per-quarter plan; interrupts take their defaults. */
const strategy = (plan: (s: GameState) => Action[]): Strategy => ({ plan })

/** The archetypes for a preset whose ground bot is `groundBot`. */
export function act4Archetypes(groundBot: string): Record<string, Strategy> {
  const withGround = (s: GameState, more: (after: GameState) => Action[]): Action[] => {
    const g = tryAll(s, groundPlan(groundBot, s))
    const m = tryAll(g.after, more(g.after))
    return [...g.kept, ...m.kept]
  }
  const balanced = (s: GameState): Action[] => {
    const shell: ShellId = q4(s) % 2 === 0 ? 'sso' : 'high_leo'
    const orbit = orbitStep(s, { kind: 'shell', shell, contractOnly: true, insure: true, debt: false, maxMw: 10, open: q4(s) < 12 && q4(s) % 2 === 0 })
    const moon = tryAll(orbit.after, moonActions(orbit.after, 1, false))
    return [...orbit.kept, ...moon.kept]
  }
  return {
    passive: strategy(() => []),
    // (M34.1, 1b: the preset's ground habits, then ground clouds and renewals)
    ground: strategy((s) => {
      const g = tryAll(s, groundPlan(groundBot, s))
      return [...g.kept, ...groundCloudStep(g.after).kept]
    }),
    sprinter: strategy((s) =>
      withGround(s, (g) => orbitStep(g, { kind: 'cloud', shell: 'sso', contractOnly: false, insure: false, debt: true, maxMw: 50, open: true }).kept),
    ),
    diversified: strategy((s) => {
      const shells: ShellId[] = ['high_leo', 'high_orbit', 'sso']
      const shell = shells[Math.floor(q4(s) / 2) % 3]
      return withGround(s, (g) =>
        orbitStep(g, { kind: 'shell', shell, contractOnly: true, insure: true, debt: true, maxMw: 25, open: q4(s) % 2 === 0 }).kept,
      )
    }),
    lunar: strategy((s) =>
      withGround(s, (g) => {
        const moon = tryAll(g, moonActions(g, 2, true))
        const orbit = orbitStep(moon.after, { kind: 'shell', shell: 'high_leo', contractOnly: true, insure: true, debt: false, maxMw: 10, open: (moon.after.act4Orbit?.blocks.length ?? 0) === 0 })
        return [...moon.kept, ...orbit.kept]
      }),
    ),
    balanced: strategy((s) => withGround(s, balanced)),
    // (M32.6: the over-reactor and the perfect reader are Passive plus their reading moves only, so B8 and B9 compare
    // reading with doing nothing, as doc 33 §18 means)
    overreactor: strategy((g) => {
      const h = signalsHiddenIv(g.futureId!)
      const label = CONTENT.quarters[g.quarter]
      if (!h.decoy.quarters.includes(label)) return []
      // the decoy reads as the wrong future: its wrong stance, hard
      if (idealWrong(g) > 0)
        return orbitStep(g, { kind: 'cloud', shell: 'sso', contractOnly: false, insure: false, debt: true, maxMw: 50, open: true }).kept
      return exposureDown(g)
    }),
    perfect: strategy((g) => {
      const ideal = idealStancesIv(g.futureId!)[q4(g)] ?? 0
      if (ideal > 0)
        return orbitStep(g, { kind: 'shell', shell: 'high_leo', contractOnly: true, insure: true, debt: true, maxMw: 25, open: true }).kept
      if (ideal < 0) return exposureDown(g)
      return []
    }),
  }
}

/** The decoy's wrong stance for this game's future (hidden: tools only). */
function idealWrong(s: GameState): number {
  return s.futureId === 'f2' || s.futureId === 'f4' ? 1 : -1
}

/** Reducing orbital exposure: insure everything, presell what's planning, cancel bookings not yet built. */
function exposureDown(s: GameState): Action[] {
  const out: Action[] = []
  for (const b of s.act4Orbit?.blocks ?? []) {
    out.push({ type: 'BUY_ORBITAL_INSURANCE', blockId: b.id })
    if (b.stage === 'proposed') {
      if (b.tenant === null && b.offers.length > 0) out.push({ type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 0 })
      if (b.launch) out.push({ type: 'CANCEL_ORBITAL_LAUNCH', blockId: b.id })
    }
  }
  return tryAll(s, out).kept
}

export const ACT4_ARCHETYPES = ['ground', 'sprinter', 'diversified', 'lunar', 'balanced', 'overreactor', 'passive'] as const

/** (licence room is checked by the build itself; kept here for the runner's reports) */
export { licenceRoom }
