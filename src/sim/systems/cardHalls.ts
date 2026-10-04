// Act III's step-5 card effects (M16.4; the design thread's step-5 spec). The card engine (events.ts) hands
// each wired effect here, and asks here why a choice is greyed (no target, or short of cash):
// - retrofit_hall: the largest live hall of the tier below (tie: the lowest number) is retrofitted one tier up,
//   at the card's price per MW if it names one (s0_c7's "-1500000*mw"), else the normal cost; no Bandwidth;
// - sell_gpus_at: the largest live B200 / GB200 cloud or pilot with no GPU contract sells its GPUs at the sale
//   value × the multiple (its MW go idle again);
// - accelerate_project: the building project with the latest ready quarter (tie: the larger capex) is ready a
//   quarter sooner, never before next quarter, for 6% of its capex (s1_c2) or 15% of its power (else its shell
//   build) cost (s2_c4);
// - gpu_racks: Rubin racks (1, or as many as the card's budget buys at this quarter's rack price) open a live
//   pilot at the site with the most free kW that fits;
// - new_hall: a proposed mid-tier shell of that many MW at the site with the most energized MW, bringing its
//   MW (they leave if it's cancelled), priced at the greenfield shell $/MW;
// - distressed_campus: a new idle, energized site of that many MW, no flaw, in the region of the largest site.
import {
  BALANCE,
  CONTENT,
  POWER_REGIONS,
  quarterInputs,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import {
  logEntry,
  projectGone,
  type GameState,
  type Project,
  type SiteOffer,
} from '../state.ts'
import { repayProjectFacilities } from './facilities.ts'
import { exportGpuMult } from './exportRule.ts'
import { convertibleKw } from './hosting.ts'
import { scenarioOf } from './market.ts'
import { powerCostUsd } from './power.ts'
import {
  gpuGeneration,
  gpuResidualUsd,
  openProject,
  ownedShareOut,
  projectCapex,
} from './projects.ts'
import { retrofitPlan, startRetrofit } from './retrofit.ts'
import { buyAct2Site } from './scouting.ts'
import { capacityKw, poweredKw, regionOf } from './sites.ts'

/** The card effects as act3Cards.ts writes them. */
export interface RetrofitCard {
  to: 'mid' | 'top'
  /** The card's own price per MW (it is the payment). */
  usdPerMw?: number
}
export interface AccelerateCard {
  quarters: number
  /** Cash: this share of the project's capex. */
  capexShare?: number
  /** Cash: this share of its power cost (with a Power slot), else of its shell build cost. */
  extraCostShare?: number
}
export interface RackCard {
  gpu: string
  /** The choice's cash: as many racks as it buys (charged racks × price, not this). */
  budgetUsd?: number
}
export interface CampusCard {
  mw: number
  priceUsd: number
}

const bySize = (a: Project, b: Project) => b.kw - a.kw || a.n - b.n
const live = (state: GameState) =>
  state.projects.filter((p) => p.stage === 'live' && !projectGone(p))

// ---------- retrofit ----------

/** The largest live hall a card's retrofit to `to` works on: one tier below, not in downtime, no GPU contract. */
export function retrofitCardTarget(
  state: GameState,
  e: RetrofitCard,
): Project | undefined {
  const from = e.to === 'mid' ? 'low' : 'mid'
  return live(state)
    .filter((p) => p.tier === from && !p.downtime && !p.tenant?.gpu)
    .sort(bySize)[0]
}

function retrofitCardCostUsd(
  state: GameState,
  p: Project,
  e: RetrofitCard,
): number {
  return Math.round(
    e.usdPerMw !== undefined
      ? e.usdPerMw * (p.kw / 1000)
      : retrofitPlan(state, p)!.costUsd,
  )
}

export function retrofitCard(
  state: GameState,
  e: RetrofitCard,
  weekNo: number,
): void {
  const p = retrofitCardTarget(state, e)
  if (!p) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  startRetrofit(state, p.id, {
    costUsd: retrofitCardCostUsd(state, p, e),
    free: true,
  })
}

// ---------- a GPU sale at a multiple ----------

const SALE_GENS = ['b200', 'gb200_nvl72']

/** The largest live Blackwell cloud or pilot with no GPU contract running. */
export function gpuSaleCardTarget(state: GameState): Project | undefined {
  return live(state)
    .filter(
      (p) =>
        p.kind !== 'shell' &&
        p.gpu !== null &&
        SALE_GENS.includes(p.gpu) &&
        !p.tenant?.gpu,
    )
    .sort(bySize)[0]
}

export function gpuSaleCard(
  state: GameState,
  mult: number,
  weekNo: number,
): void {
  const p = gpuSaleCardTarget(state)
  if (!p) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const valueUsd = Math.round(
    gpuResidualUsd(p, state.quarter) * (1 - ownedShareOut(p)) * mult,
  )
  state.cash += valueUsd
  p.stage = 'ended'
  p.soldQuarter = state.quarter
  repayProjectFacilities(state, p.id)
  logEntry(
    state,
    'log.gpus_sold',
    { n: p.n, count: p.gpuCount, gpu: p.gpu ?? '', valueUsd },
    weekNo,
  )
}

// ---------- speeding up a build ----------

/** The building project with the latest ready quarter (tie: the larger capex) that can still be sped up. */
export function accelerateTarget(state: GameState): Project | undefined {
  // (one already due next quarter can't be sooner: no target)
  return state.projects
    .filter(
      (p) =>
        p.stage === 'building' &&
        p.readyQuarter !== null &&
        p.readyQuarter > state.quarter + 1,
    )
    .sort(
      (a, b) => b.readyQuarter! - a.readyQuarter! || b.capexUsd - a.capexUsd,
    )[0]
}

/** What speeding it up costs: a share of its capex, or of its power (else shell build) cost. */
export function accelerateCostUsd(
  state: GameState,
  p: Project,
  e: AccelerateCard,
): number {
  if (e.capexShare !== undefined) return Math.round(e.capexShare * p.capexUsd)
  if (e.extraCostShare !== undefined) {
    const base = p.power
      ? powerCostUsd(p.power, p.kw)
      : projectCapex(state, p, p.startQuarter ?? state.quarter).retrofitUsd
    return Math.round(e.extraCostShare * base)
  }
  return 0
}

export function accelerateCard(
  state: GameState,
  e: AccelerateCard,
  weekNo: number,
): void {
  const p = accelerateTarget(state)
  if (!p) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const costUsd = accelerateCostUsd(state, p, e)
  state.cash -= costUsd
  p.readyQuarter = Math.max(state.quarter + 1, p.readyQuarter! - e.quarters)
  // Its new power keeps up (mine, reversible: the card buys the equipment sooner too).
  const add = state.sites
    .find((s) => s.id === p.siteId)
    ?.powerAdds?.find((x) => x.projectId === p.id)
  if (add?.readyQuarter != null && add.readyQuarter > p.readyQuarter)
    add.readyQuarter = p.readyQuarter
  logEntry(
    state,
    'log.card_accelerated',
    { n: p.n, quarter: CONTENT.quarters[p.readyQuarter] ?? '—', costUsd },
    weekNo,
  )
}

// ---------- Rubin racks ----------

/** This quarter's Rubin NVL144 rack price, or null before there is one. */
export function rackPriceUsd(state: GameState): number | null {
  return quarterInputs(state.quarter, scenarioOf(state))?.act3?.rubinRackUsd ?? null
}

/** The racks a card buys now, their GPUs, kW and cost; null without a price. */
export function rackPlan(
  state: GameState,
  e: RackCard,
): { racks: number; gpus: number; kw: number; costUsd: number } | null {
  const price = rackPriceUsd(state)
  if (!price) return null
  const racks =
    e.budgetUsd !== undefined ? Math.floor(Math.abs(e.budgetUsd) / price) : 1
  const gpus = BALANCE.act3.density.gpusPerRack.rubin_nvl144 * racks
  const perMw = gpuGeneration(e.gpu)!.gpusPerMw
  // (M17.4: × 1.05 while the export rule is on, unless you pre-bought)
  return {
    racks,
    gpus,
    kw: Math.ceil((gpus / perMw) * 1000),
    costUsd: racks * price * exportGpuMult(state),
  }
}

/** The site with the most free energized kW that fits `kw` (not the garage). */
function roomiest(state: GameState, kw: number) {
  return state.sites
    .filter((s) => s.tier !== BALANCE.startSite)
    .map((s) => ({ s, free: convertibleKw(state, s.id) }))
    .filter((x) => x.free >= kw - 1e-9)
    .sort((a, b) => b.free - a.free)[0]?.s
}

export function rackCard(state: GameState, e: RackCard, weekNo: number): void {
  const plan = rackPlan(state, e)
  const site = plan && plan.racks > 0 ? roomiest(state, plan.kw) : undefined
  if (!plan || !site) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const n = state.projects.reduce((m, p) => Math.max(m, p.n), 0) + 1
  state.projects.push({
    id: `project-${n}`,
    n,
    siteId: site.id,
    kw: plan.kw,
    kind: 'pilot',
    gpu: e.gpu,
    tier: 'mid',
    openedQuarter: state.quarter,
    stage: 'live',
    offers: [],
    tenant: null,
    spot: false,
    capital: 'cash',
    capexUsd: plan.costUsd,
    gpuCapexUsd: plan.costUsd,
    gpuCount: plan.gpus,
    startQuarter: state.quarter,
    readyQuarter: state.quarter,
    soldQuarter: null,
  })
  state.cash -= plan.costUsd
  logEntry(
    state,
    'log.card_racks',
    { n, count: plan.racks, gpus: plan.gpus, costUsd: plan.costUsd },
    weekNo,
  )
  // M21.3 (DT): the card fills the pilot's Power and Capital slots at once; log them like a project the player opens
  logEntry(
    state,
    'log.project_power_existing',
    { n, tier: site.tier, projectKw: plan.kw },
    weekNo,
  )
  logEntry(
    state,
    'log.project_capital_cash',
    { n, amountUsd: plan.costUsd },
    weekNo,
  )
}

// ---------- a new hall ----------

/** The site with the most energized MW (not the garage). */
function biggestEnergized(state: GameState) {
  return state.sites
    .filter((s) => s.tier !== BALANCE.startSite)
    .map((s) => ({ s, kw: poweredKw(s, state.quarter) }))
    .filter((x) => x.kw > 0)
    .sort((a, b) => b.kw - a.kw)[0]?.s
}

export function newHallSite(state: GameState) {
  return biggestEnergized(state)
}

export function newHallCard(
  state: GameState,
  mw: number,
  weekNo: number,
): void {
  const site = biggestEnergized(state)
  if (!site) {
    logEntry(state, 'log.card_no_target', {}, weekNo)
    return
  }
  const kw = mw * 1000
  // A card's hall costs no Bandwidth to open.
  const p = openProject(state, { siteId: site.id, kw, kind: 'shell' })
  state.bandwidth += BALANCE.projects.bandwidth.open
  p.greenfield = true
  p.tier = 'mid'
  site.powerAdds = [
    ...(site.powerAdds ?? []),
    { projectId: p.id, kw, source: 'grid', readyQuarter: state.quarter, card: true },
  ]
  logEntry(state, 'log.card_new_hall', { n: p.n, projectKw: kw }, weekNo)
}

// ---------- a distressed campus ----------

export function campusCard(state: GameState, e: CampusCard, weekNo: number): void {
  const largest = state.sites
    .filter((s) => s.tier !== BALANCE.startSite)
    .sort((a, b) => capacityKw(b) - capacityKw(a))[0]
  const region = (largest && regionOf(largest)) || POWER_REGIONS[0]
  const offer: SiteOffer = {
    id: `offer-${state.nextId++}`,
    tier: BALANCE.act2Scouting.siteTier,
    rentUsdQ: 0,
    capexUsd: e.priceUsd,
    powerPriceMult: 1,
    flaw: null,
    category: 'distressed_campus',
    kw: e.mw * 1000,
    region,
    readyQuarters: 0,
  }
  // Bought the way a scouted site is, but on the card: no Bandwidth.
  buyAct2Site(state, offer)
  state.bandwidth += BALANCE.bandwidth.build
  logEntry(state, 'log.card_campus', { siteKw: e.mw * 1000, region }, weekNo)
}

// ---------- why a choice is greyed ----------

/** Why a card choice with a step-5 effect can't be picked now, or undefined. */
export function hallCardBlocker(
  state: GameState,
  effects: Record<string, unknown>,
): Message | undefined {
  const cash = (costUsd: number): Message | undefined =>
    state.cash < costUsd
      ? { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
      : undefined
  const r = effects.retrofit_hall as RetrofitCard | undefined
  if (r) {
    const p = retrofitCardTarget(state, r)
    if (!p)
      return {
        key: 'error.card_no_hall',
        params: { density: r.to === 'mid' ? 'low' : 'mid' },
      }
    return cash(retrofitCardCostUsd(state, p, r))
  }
  if (effects.sell_gpus_at !== undefined && !gpuSaleCardTarget(state))
    return { key: 'error.card_no_gpus' }
  const a = effects.accelerate_project as AccelerateCard | undefined
  if (a) {
    const p = accelerateTarget(state)
    if (!p) return { key: 'error.card_no_build' }
    return cash(accelerateCostUsd(state, p, a))
  }
  const k = effects.gpu_racks as RackCard | undefined
  if (k) {
    const plan = rackPlan(state, k)
    if (!plan || plan.racks === 0)
      return { key: 'error.card_no_racks' }
    if (!roomiest(state, plan.kw))
      return { key: 'error.card_no_room', params: { neededKw: plan.kw } }
    return cash(plan.costUsd)
  }
  if (effects.new_hall_mw !== undefined && !biggestEnergized(state))
    return { key: 'error.card_no_site' }
  const c = effects.distressed_campus as CampusCard | undefined
  if (c) return cash(c.priceUsd)
  return undefined
}
