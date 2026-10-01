// Act III's step-6 card effects (M17.5; the design thread's step-6 spec). The card engine (events.ts) hands
// each wired effect here, and asks here why a choice is greyed:
// - ppa_switch (s2_c1, s3_c2): your largest live or building project in an eligible region with no PPA switches
//   its MW to a nuclear PPA at this quarter's price, take-or-pay from next quarter;
// - ppa_site_mw (sh_2): that many MW of PPA power added to your largest site in an eligible region, energized
//   next quarter and idle until a load uses them (take-or-pay 90% from then: the stranded-PPA test); greyed below
//   200 MW energized (M17.8);
// - ppa_savings (s2_c5): one quarter of your PPAs' savings against the market (0 with none);
// - pc_cost (s2_c6): political capital spent and the Anger adjustment −8; anger_adj: the adjustment alone;
// - hire_card (sh_3): the hire through the normal path, at no Bandwidth.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, projectGone, type GameState, type Ppa, type Project } from '../state.ts'
import { getHire, isHired, salaryUsdQ } from './hires.ts'
import {
  activePpas,
  nuclearPriceUsdMwh,
  nuclearRegion,
  ppaSavingsUsd,
  quarterLabelBeyond,
} from './nuclear.ts'
import { addPc, adjustAnger } from './pcState.ts'
import { capacityKw, poweredKw, regionOf } from './sites.ts'

const regionOfSite = (state: GameState, siteId: string) => {
  const site = state.sites.find((s) => s.id === siteId)
  return site ? regionOf(site) : undefined
}

/** ppa_switch's target: the largest live or building project in an eligible region with no PPA. */
export function ppaSwitchTarget(state: GameState): Project | undefined {
  const held = new Set(activePpas(state).map((x) => x.projectId))
  return state.projects
    .filter(
      (p) =>
        (p.stage === 'live' || p.stage === 'building') &&
        !projectGone(p) &&
        p.power !== 'nuclear' &&
        !held.has(p.id) &&
        nuclearRegion(regionOfSite(state, p.siteId)),
    )
    .sort((a, b) => b.kw - a.kw || a.n - b.n)[0]
}

/** Your MW energized now, across every site. */
function energizedMw(state: GameState): number {
  return state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000
}

/** ppa_site_mw's site: your largest site in an eligible region. */
function ppaSite(state: GameState) {
  return state.sites
    .filter((s) => s.tier !== BALANCE.startSite && nuclearRegion(regionOf(s)))
    .sort((a, b) => capacityKw(b) - capacityKw(a))[0]
}

function newPpa(state: GameState, o: Pick<Ppa, 'siteId' | 'kw' | 'projectId'>): Ppa {
  const x: Ppa = {
    id: `ppa-${state.nextId++}`,
    ...o,
    priceUsdMwh: nuclearPriceUsdMwh(state)!,
    signedQuarter: state.quarter,
    fromQuarter: state.quarter + 1,
    endQuarter: state.quarter + CONTENT.act3Nuclear.termQuarters - 1,
  }
  ;(state.ppas ??= []).push(x)
  return x
}

export function ppaSwitchCard(state: GameState, weekNo: number): void {
  const p = ppaSwitchTarget(state)
  if (!p || nuclearPriceUsdMwh(state) === null) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const x = newPpa(state, { siteId: p.siteId, kw: p.kw, projectId: p.id })
  logEntry(
    state,
    'log.ppa_signed',
    { n: p.n, projectKw: x.kw, usdMwh: x.priceUsdMwh, quarter: quarterLabelBeyond(x.endQuarter) },
    weekNo,
  )
}

export function ppaSiteCard(state: GameState, mw: number, weekNo: number): void {
  const site = ppaSite(state)
  if (!site || nuclearPriceUsdMwh(state) === null) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const kw = mw * 1000
  const x = newPpa(state, { siteId: site.id, kw, projectId: null })
  site.powerAdds = [
    ...(site.powerAdds ?? []),
    { projectId: x.id, kw, source: 'nuclear', readyQuarter: state.quarter + 1, ppaId: x.id },
  ]
  logEntry(
    state,
    'log.ppa_site',
    { siteKw: kw, usdMwh: x.priceUsdMwh, quarter: quarterLabelBeyond(x.endQuarter) },
    weekNo,
  )
}

export function ppaSavingsCard(state: GameState, weekNo: number): void {
  const usd = Math.round(ppaSavingsUsd(state))
  state.cash += usd
  logEntry(state, 'log.ppa_savings', { amountUsd: usd }, weekNo)
}

export function pcCostCard(state: GameState, pc: number): void {
  addPc(state, -pc)
  adjustAnger(state, BALANCE.act3.politicalCapital.cardAngerDelta)
}

export function angerCard(state: GameState, delta: number): void {
  adjustAnger(state, delta)
}

export function hireCard(state: GameState, id: string, weekNo: number): void {
  const h = getHire(id)
  if (!h || isHired(state, id)) return
  state.staff[id] = state.quarter
  logEntry(state, 'log.hired', { hire: id, salaryUsd: salaryUsdQ(h, state.quarter) }, weekNo)
}

/** Why a card choice with a step-6 effect can't be picked now, or undefined. */
export function powerCardBlocker(
  state: GameState,
  effects: Record<string, unknown>,
): Message | undefined {
  if (effects.ppa_switch && (!ppaSwitchTarget(state) || nuclearPriceUsdMwh(state) === null))
    return { key: 'error.card_no_ppa_project' }
  if (effects.ppa_site_mw !== undefined) {
    if (!ppaSite(state) || nuclearPriceUsdMwh(state) === null)
      return { key: 'error.nuclear_region' }
    // M17.8 (DT): too big for a small company, below 200 MW energized.
    const min = BALANCE.act3.nuclear.sh2MinEnergizedMw
    if (energizedMw(state) < min)
      return { key: 'error.ppa_too_big', params: { mw: min } }
  }
  const pc = effects.pc_cost as number | undefined
  if (pc !== undefined && (state.politicalCapital ?? 0) < pc)
    return { key: 'error.pc_short', params: { needed: pc, have: state.politicalCapital ?? 0 } }
  const hire = effects.hire_card as string | undefined
  if (hire) {
    if (isHired(state, hire)) return { key: 'error.already_hired', params: { hire } }
    const h = getHire(hire)
    const needUsd = h ? salaryUsdQ(h, state.quarter) * CONTENT.hires.hireCashQuarters : 0
    if (state.cash < needUsd)
      return { key: 'error.hire_needs_cash', params: { neededUsd: needUsd, hire } }
  }
  return undefined
}
