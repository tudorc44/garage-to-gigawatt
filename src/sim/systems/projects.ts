// Projects (Act II, scope 0.2 §2.5, doc 18 §5; wireframes A2-04 / A2-05): turn free energized MW
// at one of your sites into an AI shell lease (a tenant brings its GPUs), an AI cloud (your GPUs,
// sold on the spot market) or a pilot cluster (0.5–2 MW of H100s on spot). A project has three
// slots — Power (existing MW), Tenant (a card from tenants.json, or spot), Capital (own cash) —
// then builds for a few quarters and goes live. This file: prices, know-how, offers, the slots,
// the build (start, delays, GPU allocation, going live), take-or-pay, and a live project's week.
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  type Act2Quarter,
  type GpuGeneration,
  type TenantCard,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, randomInt, substream } from '../rng.ts'
import {
  logEntry,
  projectGone,
  type GameState,
  type Project,
  type PowerSource,
  type ProjectKind,
  type TenantOffer,
} from '../state.ts'
import { gpuPriceMultNow, modifierMult } from './eventEffects.ts'
import { isShutDown, underMoratorium } from './heat.ts'
import {
  headStartBuildDelta,
  headStartKnowHow,
  shellReady,
  tenantsFrom,
} from './headStarts.ts'
import {
  drawPowerQuarters,
  expectedPowerQuarters,
  powerBlocker,
  powerCostUsd,
} from './power.ts'
import { isHired } from './hires.ts'
import { convertibleKw } from './hosting.ts'
import { flawEffect, powerPriceUsdKwh, regionOf, uptime } from './sites.ts'

const P = () => CONTENT.projects

/** A value from Act II's quarterly market; before its first value, its first value (GPU prices start 2023Q3). */
function heldBack<T>(
  quarter: number,
  pick: (q: Act2Quarter) => T | null,
): T | undefined {
  const own = act2Quarter(quarter)
  const v = own ? pick(own) : null
  if (v !== null && v !== undefined) return v
  for (const q of CONTENT.act2Market) {
    const x = pick(q)
    if (x !== null) return q.quarter > CONTENT.quarters[quarter] ? x : undefined
  }
  return undefined
}

export function gpuGeneration(id: string): GpuGeneration | undefined {
  return P().gpus.find((g) => g.id === id)
}

/** A GPU's purchase price this quarter (market_quarterly_act2; the first known price before it). */
export function gpuPriceUsd(gpu: string, quarter: number): number | undefined {
  return heldBack(quarter, (q) =>
    gpu === 'h100' || gpu === 'h200' || gpu === 'b200'
      ? q.gpuPurchaseUsd[gpu]
      : null,
  )
}

/** A GPU's neocloud rental price this quarter, $ per GPU-hour (spot projects earn this). */
export function neocloudUsdHr(
  gpu: string,
  quarter: number,
): number | undefined {
  return heldBack(quarter, (q) =>
    gpu === 'h100' || gpu === 'h200' || gpu === 'b200'
      ? q.gpuRentalUsdHr[gpu].neocloud
      : null,
  )
}

/** GPUs a full-stack project can buy this quarter (in Alpha 0.2, out, and priced). */
export function availableGpus(quarter: number): GpuGeneration[] {
  const label = CONTENT.quarters[quarter]
  return P().gpus.filter(
    (g) => g.from <= label && gpuPriceUsd(g.id, quarter) !== undefined,
  )
}

/**
 * GPU know-how 0–3 (doc 18 §5.4): 1 once a cluster (cloud or pilot) is live, 2 at two live
 * clusters, 3 at 100 MW of live full stack; at least 1 with the gpu_cloud head start's legacy cloud.
 */
export function knowHow(state: GameState): number {
  const live = state.projects.filter(
    (p) => p.stage === 'live' && p.kind !== 'shell',
  )
  const kw = live.reduce((sum, p) => sum + p.kw, 0)
  const level =
    kw >= BALANCE.projects.knowHowThreeKw
      ? 3
      : live.length >= 2
        ? 2
        : live.length >= 1
          ? 1
          : 0
  return Math.max(level, headStartKnowHow(state))
}

/** Build quarters: a shell retrofit; a cloud adds a quarter for the GPUs; a pilot its own. */
export function buildQuarters(kind: ProjectKind): number {
  if (kind === 'pilot') return P().pilot.buildQuarters
  const shell = P().retrofit.buildQuarters
  return kind === 'cloud' ? shell + P().fullStack.extraBuildQuarters : shell
}

/** This project's build quarters: its kind's, changed by the Merge head start (never under 1). */
export function projectBuildQuarters(
  state: GameState,
  p: Pick<Project, 'id' | 'kind' | 'siteId'>,
): number {
  return Math.max(1, buildQuarters(p.kind) + headStartBuildDelta(state, p))
}

/**
 * Quarters from a build start to going live, as planned now: the build, or the new power if it
 * takes longer (a grid upgrade at its queue's short end).
 */
export function plannedBuildQuarters(state: GameState, p: Project): number {
  return Math.max(
    projectBuildQuarters(state, p),
    expectedPowerQuarters(state, p),
  )
}

export function tenantCard(id: string): TenantCard | undefined {
  return P().tenantCards.find((c) => c.id === id)
}

/** A tenant's rent over a year for `kw`. */
export function annualRentUsd(card: TenantCard, kw: number): number {
  return card.priceUsdMwYr * (kw / 1000)
}

/**
 * A GPU contract's $/GPU-hr for `gpu` over `termYears`, signed in `quarter` (owner decisions on
 * the M3 questions): the H100 1-year contract price × the term factor; an H200 × 1.2; a B200 off
 * its own neocloud series. Undefined before there are prices.
 */
export function gpuContractUsdHr(
  gpu: string,
  termYears: number,
  quarter: number,
): number | undefined {
  const c = BALANCE.projects.gpuContracts
  const base =
    gpu === 'b200'
      ? heldBack(quarter, (q) => q.gpuRentalUsdHr.b200.neocloud)
      : heldBack(quarter, (q) => q.gpuRentalUsdHr.h100.contract1y)
  if (base === undefined) return undefined
  return (
    base * (gpu === 'h200' ? c.h200Mult : 1) * (c.termFactor[termYears] ?? 1)
  )
}

/** A signed tenant's contract value over a year: a shell's rent, or a cloud's GPUs × price × hours. */
export function annualContractUsd(p: Project): number {
  const t = p.tenant
  if (!t) return 0
  if (t.gpu) return t.gpu.gpus * t.gpu.priceUsdHr * 24 * 365
  return annualRentUsd(tenantCard(t.card)!, p.kw)
}

/** A signed tenant's term in quarters. */
export function contractQuarters(p: Project): number {
  const t = p.tenant
  if (!t) return 0
  return t.gpu ? t.gpu.termQuarters : tenantCard(t.card)!.termYears * 4
}

/**
 * What a project costs to build if it starts in `quarter` (conversions.json, market_quarterly):
 * the retrofit per MW, plus for clouds and pilots the GPUs (gpus per MW × the unit price; +10%
 * for a cloud at GPU know-how 0), plus any new power (a grid upgrade or on-site gas), less the
 * tenant's capex credit (capped at the retrofit).
 */
export function projectCapex(
  state: GameState,
  p: Pick<Project, 'kw' | 'kind' | 'gpu' | 'tenant'> & {
    siteId?: string
    power?: PowerSource
  },
  quarter = state.quarter,
): {
  retrofitUsd: number
  gpuUsd: number
  powerUsd: number
  creditUsd: number
  totalUsd: number
  gpuCount: number
} {
  const powerUsd = p.power ? powerCostUsd(p.power, p.kw) : 0
  const mw = p.kw / 1000
  // A shell at a shell-ready site (the hosting head start) costs less to retrofit.
  const ready =
    p.kind === 'shell' && shellReady(state, p.siteId)
      ? 1 - P().shellReady.capexDiscount
      : 1
  // An Act II site's flaw can add to the build per MW (fibre far away, poor power quality).
  const site = p.siteId ? state.sites.find((s) => s.id === p.siteId) : undefined
  const flawUsdMw = site ? (flawEffect(site, 'capex_usd_mw_delta') ?? 0) : 0
  const retrofitUsd =
    ((act2Quarter(quarter)?.capexUsdMw.retrofitShell ?? 0) * ready +
      flawUsdMw) *
    mw
  let gpuUsd = 0
  let gpuCount = 0
  if (p.kind !== 'shell' && p.gpu) {
    const gen = gpuGeneration(p.gpu)!
    gpuCount = Math.round(gen.gpusPerMw * mw)
    const mult =
      p.kind === 'cloud' && knowHow(state) === 0
        ? BALANCE.projects.knowHowZero.costMult
        : 1
    gpuUsd =
      gpuCount *
      (gpuPriceUsd(p.gpu, quarter) ?? 0) *
      mult *
      gpuPriceMultNow(state, quarter)
  }
  const card = p.tenant ? tenantCard(p.tenant.card) : undefined
  const creditUsd = Math.min(retrofitUsd, (card?.capexCreditUsdMw ?? 0) * mw)
  return {
    retrofitUsd,
    gpuUsd,
    powerUsd,
    creditUsd,
    totalUsd: retrofitUsd + gpuUsd + powerUsd - creditUsd,
    gpuCount,
  }
}

/** Whether tenant offers exist yet (doc 18 §2.3: from 2023Q3; 2023Q1 with the gpu_cloud head start). */
export function tenantsOpen(
  state: GameState,
  quarter = state.quarter,
): boolean {
  return CONTENT.quarters[quarter] >= tenantsFrom(state)
}

/**
 * Draws a project's tenant offers (2–3, +1 with the BD Lead) from the eligible cards: leases for a
 * shell; GPU contracts (a term and a ready-by buffer each) for a cloud, from the cards that offer
 * them. A pilot has none.
 */
export function drawOffers(state: GameState, p: Project): void {
  if (p.kind === 'pilot' || !tenantsOpen(state)) return
  const site = state.sites.find((s) => s.id === p.siteId)
  const level = knowHow(state)
  const contracts = BALANCE.projects.gpuContracts
  const pool = P().tenantCards.filter(
    (c) =>
      (c.needsKnowHow ?? 0) <= level &&
      (!c.regionLock || (site && c.regionLock === regionOf(site))) &&
      (p.kind === 'shell' || c.id in contracts.cards),
  )
  const r = substream(state.seed, `project_offers:${state.quarter}:${p.id}`)
  const { min, max } = BALANCE.projects.offers
  // A bid tenant RFP (cards ec12, ec24) brings more offers that quarter.
  const rfp =
    state.events.extraOffers?.quarter === state.quarter
      ? state.events.extraOffers.n
      : 0
  const n = Math.min(
    pool.length,
    randomInt(r, min, max) + (isHired(state, 'bd_lead') ? 1 : 0) + rfp,
  )
  const left = [...pool]
  p.offers = []
  for (let i = 0; i < n; i++) {
    const card = left.splice(randomInt(r, 0, left.length - 1), 1)[0]
    const id = `${p.id}-offer-${state.quarter}-${i + 1}`
    if (p.kind === 'shell') {
      p.offers.push({
        id,
        card: card.id,
        readyByQuarters: randomInt(r, card.readyBy[0], card.readyBy[1]),
      })
      continue
    }
    const profile = contracts.profiles[contracts.cards[card.id]]
    p.offers.push({
      id,
      card: card.id,
      readyByQuarters: 0,
      gpu: {
        termYears: randomInt(r, ...profile.termYears),
        bufferQuarters: randomInt(r, ...profile.bufferQuarters),
      },
    })
  }
}

/** Why a project can't be opened like this now, or undefined if it can. */
export function openBlocker(
  state: GameState,
  a: {
    siteId: string
    kw: number
    kind: ProjectKind
    gpu?: string
    power?: PowerSource
  },
): Message | undefined {
  if (state.act !== 2) return { key: 'error.act2_only' }
  const site = state.sites.find((s) => s.id === a.siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (site.tier === BALANCE.startSite) return { key: 'error.project_garage' }
  if (!Number.isFinite(a.kw) || a.kw <= 0) return { key: 'error.bad_kw' }
  const label = CONTENT.quarters[state.quarter]
  if (a.kind === 'pilot') {
    const pilot = P().pilot
    if (label < pilot.from)
      return { key: 'error.pilot_early', params: { quarter: pilot.from } }
    if (
      a.kw < pilot.kwMin ||
      a.kw > pilot.kwMax ||
      Math.abs(a.kw / pilot.kwStep - Math.round(a.kw / pilot.kwStep)) > 1e-9
    )
      return {
        key: 'error.pilot_size',
        params: {
          minKw: pilot.kwMin,
          maxKw: pilot.kwMax,
          stepKw: pilot.kwStep,
        },
      }
  }
  if (a.kind !== 'shell') {
    const gpu = a.kind === 'pilot' ? P().pilot.gpu : a.gpu
    if (!gpu || !availableGpus(state.quarter).some((g) => g.id === gpu))
      return { key: 'error.gpu_not_available', params: { gpu: gpu ?? '' } }
  }
  if (underMoratorium(state, a.siteId))
    return {
      key: 'error.moratorium',
      params: { tier: site.tier, at: CONTENT.heat.moratoriumAt },
    }
  if (a.power) {
    // New power (a grid upgrade or on-site gas) brings its own MW.
    if (a.power !== 'grid' && a.power !== 'gas')
      return { key: 'error.bad_choice' }
    const blocked = powerBlocker(state, site, a.power)
    if (blocked) return blocked
  } else {
    const freeKw = convertibleKw(state, a.siteId)
    if (a.kw > freeKw + 1e-9)
      return {
        key: 'error.no_project_room',
        params: { tier: site.tier, freeKw, neededKw: a.kw },
      }
  }
  const need = BALANCE.projects.bandwidth.open
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/**
 * Opens a project (assumes openBlocker passed): its Power slot is the site's free MW, or new power
 * (a grid upgrade or on-site gas) that joins the site's capacity now and is energized after it's built.
 */
export function openProject(
  state: GameState,
  a: {
    siteId: string
    kw: number
    kind: ProjectKind
    gpu?: string
    power?: PowerSource
  },
): Project {
  const n = state.projects.reduce((m, p) => Math.max(m, p.n), 0) + 1
  const p: Project = {
    id: `project-${n}`,
    n,
    siteId: a.siteId,
    kw: a.kw,
    kind: a.kind,
    gpu:
      a.kind === 'shell' ? null : a.kind === 'pilot' ? P().pilot.gpu : a.gpu!,
    openedQuarter: state.quarter,
    stage: 'proposed',
    offers: [],
    tenant: null,
    spot: false,
    capital: null,
    capexUsd: 0,
    gpuCapexUsd: 0,
    gpuCount: 0,
    startQuarter: null,
    readyQuarter: null,
    soldQuarter: null,
  }
  state.bandwidth -= BALANCE.projects.bandwidth.open
  state.projects.push(p)
  const site = state.sites.find((s) => s.id === a.siteId)!
  if (a.power) {
    p.power = a.power
    site.powerAdds = [
      ...(site.powerAdds ?? []),
      { projectId: p.id, kw: a.kw, source: a.power, readyQuarter: null },
    ]
  }
  drawOffers(state, p)
  logEntry(state, 'log.project_opened', {
    n,
    tier: site.tier,
    projectKw: a.kw,
    kind: a.kind,
  })
  return p
}

export function getProject(state: GameState, id: string): Project | undefined {
  return state.projects.find((p) => p.id === id)
}

/**
 * Signs one of a project's offers (accept: 0 Bandwidth). A shell's tenant sets its ready-by
 * quarter; any prepayment (a share of the whole contract) comes in now and is set off against
 * rent later. A cloud's GPU contract locks its $/GPU-hr now; its ready-by is the planned go-live
 * plus the offer's buffer; a cloud on spot (even live) can sign one. The first signed AI deal
 * starts the pivot premium.
 */
export function signTenant(
  state: GameState,
  projectId: string,
  offerId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind === 'pilot') return { key: 'error.project_no_tenant' }
  if (p.tenant) return { key: 'error.tenant_signed' }
  if (projectGone(p)) return { key: 'error.wrong_phase' }
  const offer = p.offers.find((o) => o.id === offerId)
  const card = offer && tenantCard(offer.card)
  if (!offer || !card) return { key: 'error.unknown_offer' }
  if (offer.gpu) return signGpuContract(state, p, offer, card)
  const contractUsd = annualRentUsd(card, p.kw) * card.termYears
  const prepaymentUsd = Math.round(contractUsd * card.prepaymentShare)
  p.tenant = {
    card: card.id,
    signedQuarter: state.quarter,
    readyByQuarter: state.quarter + offer.readyByQuarters,
    lateQuarters: 0,
    walkRolled: false,
    prepaymentLeftUsd: prepaymentUsd,
    servedQuarters: 0,
  }
  p.offers = []
  state.cash += prepaymentUsd
  if (state.firstAiDealQuarter === null)
    state.firstAiDealQuarter = state.quarter
  logEntry(state, 'log.tenant_signed', {
    n: p.n,
    tenant: card.id,
    rentUsd: annualRentUsd(card, p.kw),
    years: card.termYears,
    quarter: CONTENT.quarters[p.tenant.readyByQuarter] ?? '—',
    prepaymentUsd,
  })
  return undefined
}

/** The quarter a project is planned to go live: now if live, its ready quarter, or after a build. */
export function plannedLiveQuarter(state: GameState, p: Project): number {
  if (p.stage === 'live') return state.quarter
  if (p.stage === 'building' && p.readyQuarter !== null) return p.readyQuarter
  return state.quarter + plannedBuildQuarters(state, p)
}

function signGpuContract(
  state: GameState,
  p: Project,
  offer: TenantOffer,
  card: TenantCard,
): Message | undefined {
  const terms = offer.gpu!
  const priceUsdHr = gpuContractUsdHr(p.gpu!, terms.termYears, state.quarter)
  if (priceUsdHr === undefined) return { key: 'error.unknown_offer' }
  const gpus =
    p.stage === 'proposed' ? projectCapex(state, p).gpuCount : p.gpuCount
  p.tenant = {
    card: card.id,
    signedQuarter: state.quarter,
    readyByQuarter: plannedLiveQuarter(state, p) + terms.bufferQuarters,
    gpu: { gpus, priceUsdHr, termQuarters: terms.termYears * 4 },
    lateQuarters: 0,
    walkRolled: false,
    prepaymentLeftUsd: 0,
    servedQuarters: 0,
  }
  p.spot = false
  p.offers = []
  if (state.firstAiDealQuarter === null)
    state.firstAiDealQuarter = state.quarter
  logEntry(state, 'log.gpu_contract_signed', {
    n: p.n,
    tenant: card.id,
    count: gpus,
    gpu: p.gpu!,
    priceUsd: priceUsdHr,
    years: terms.termYears,
    quarter: CONTENT.quarters[p.tenant.readyByQuarter] ?? '—',
  })
  return undefined
}

/** A cloud project sells its capacity on the spot market (its Tenant slot). */
export function useSpot(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind !== 'cloud') return { key: 'error.project_no_spot' }
  if (p.stage !== 'proposed') return { key: 'error.wrong_phase' }
  if (p.tenant) return { key: 'error.tenant_signed' }
  p.spot = true
  return undefined
}

/** The Capital slot: own cash (financing needs a signed tenant or 100% own cash; cash is 100%). */
export function fundWithCash(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage !== 'proposed') return { key: 'error.wrong_phase' }
  p.capital = 'cash'
  return undefined
}

/** A project's three slots: done, or not (the pilot has no Tenant slot). */
export function slots(p: Project): {
  power: boolean
  tenant: boolean | null
  capital: boolean
} {
  return {
    power: true,
    tenant:
      p.kind === 'pilot'
        ? null
        : p.kind === 'shell'
          ? !!p.tenant
          : p.spot || !!p.tenant,
    capital: p.capital !== null,
  }
}

/** Drops a project that hasn't started building; its MW are free again (0 Bandwidth). */
export function cancelProject(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage !== 'proposed') return { key: 'error.project_started' }
  // A signed tenant is a contract: no walking away with its prepayment and the pivot premium.
  if (p.tenant) return { key: 'error.project_signed' }
  state.projects = state.projects.filter((x) => x.id !== projectId)
  // New power it would have brought is dropped with it.
  const site = state.sites.find((s) => s.id === p.siteId)
  if (site?.powerAdds) {
    site.powerAdds = site.powerAdds.filter((x) => x.projectId !== projectId)
    if (site.powerAdds.length === 0) delete site.powerAdds
  }
  logEntry(state, 'log.project_cancelled', { n: p.n })
  return undefined
}

// ---------- the build ----------

/** The slots still empty, by name (for the "fill every slot first" message). */
function missingSlots(p: Project): string[] {
  const s = slots(p)
  return [
    ...(s.tenant === false ? ['tenant'] : []),
    ...(s.capital ? [] : ['capital']),
  ]
}

/** Why a project's build can't start now, or undefined if it can. */
export function buildBlocker(
  state: GameState,
  projectId: string,
  /** Money others put in (the debt from facilities.ts › debtPlan, a JV partner's share): the cash covers the rest. */
  debtUsd = 0,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage !== 'proposed') return { key: 'error.project_started' }
  const missing = missingSlots(p)
  if (missing.length > 0)
    return {
      key: 'error.project_slots',
      params: { missing: missing.join(', ') },
    }
  const need = BALANCE.projects.bandwidth.start
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  const costUsd = Math.round(projectCapex(state, p).totalUsd - debtUsd)
  if (state.cash < costUsd)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
  return undefined
}

/**
 * Starts the build (1 Bandwidth; assumes buildBlocker passed): the capex is paid now (doc 18
 * §5.2: "capital is drawn at the start") and the project goes live after its build quarters.
 */
export function startBuild(state: GameState, projectId: string): void {
  const p = getProject(state, projectId)!
  const cost = projectCapex(state, p)
  p.capexUsd = Math.round(cost.totalUsd)
  p.gpuCapexUsd = Math.round(cost.gpuUsd)
  p.gpuCount = cost.gpuCount
  p.readyQuarter = state.quarter + projectBuildQuarters(state, p)
  // New power is ordered now; the project goes live when both it and the build are done.
  const add = state.sites
    .find((s) => s.id === p.siteId)
    ?.powerAdds?.find((x) => x.projectId === p.id)
  if (add) {
    add.readyQuarter = state.quarter + drawPowerQuarters(state, p)
    p.readyQuarter = Math.max(p.readyQuarter, add.readyQuarter)
  }
  p.startQuarter = state.quarter
  p.stage = 'building'
  state.cash -= p.capexUsd
  state.bandwidth -= BALANCE.projects.bandwidth.start
  logEntry(state, 'log.project_started', {
    n: p.n,
    costUsd: p.capexUsd,
    quarter: CONTENT.quarters[p.readyQuarter] ?? '—',
  })
}

/** At the start of a quarter: finished builds go live; shells and clouds without a tenant get offers. */
export function startQuarterProjects(state: GameState): void {
  for (const p of state.projects) {
    if (
      p.stage === 'building' &&
      p.readyQuarter !== null &&
      p.readyQuarter <= state.quarter
    ) {
      p.stage = 'live'
      logEntry(state, 'log.project_live', { n: p.n, kind: p.kind })
    }
    // A bid tenant RFP this quarter redraws unsigned projects' offers (with the extra ones).
    const rfp = state.events.extraOffers?.quarter === state.quarter
    if (
      p.kind !== 'pilot' &&
      !projectGone(p) &&
      !p.tenant &&
      (p.offers.length === 0 || (rfp && p.stage !== 'live'))
    )
      drawOffers(state, p)
  }
}

/**
 * At the end of a quarter (scope §2.5 [P1], tenants.json take_or_pay_terms): a signed tenant whose
 * project isn't live by its ready-by quarter gets liquidated damages (3% of the annual contract)
 * for each late quarter; at 2 quarters late it may walk (its type's chance), and any prepayment
 * not yet set off is repaid. Live projects count a quarter of their term served; a cloud's GPU
 * contract that has run its term ends and the GPUs fall back to spot. Returns the damages.
 */
export function endQuarterProjects(state: GameState): number {
  let damagesUsd = 0
  const label = CONTENT.quarters[state.quarter]
  for (const p of state.projects) {
    const t = p.tenant
    if (!t || projectGone(p)) continue
    const card = tenantCard(t.card)!
    if (p.stage === 'live') {
      t.servedQuarters++
      if (t.gpu && t.servedQuarters >= t.gpu.termQuarters) {
        logEntry(state, 'log.gpu_contract_ended', { n: p.n, tenant: card.id })
        p.tenant = null
        p.spot = true
      }
      continue
    }
    if (state.quarter < t.readyByQuarter) continue
    const usd =
      annualContractUsd(p) * P().latePenaltyShareYr * (1 - ownedShareOut(p))
    damagesUsd += usd
    t.lateQuarters++
    logEntry(state, 'log.project_late', {
      n: p.n,
      tenant: card.id,
      late: t.lateQuarters,
      damagesUsd: usd,
    })
    // A backstopped tenant doesn't walk: the guarantor stands behind the lease (M4.6, mine).
    if (t.lateQuarters >= 2 && !t.walkRolled && !p.backstop) {
      t.walkRolled = true
      const walk = P().walkChanceLate2q[card.type]
      if (chance(substream(state.seed, `tenant_walk:${label}:${p.id}`), walk))
        tenantWalks(state, p)
    }
  }
  state.cash -= damagesUsd
  return damagesUsd
}

/** A spot cluster's utilisation: the pilot's base plus its know-how bonus (conversions.json). */
export function spotUtilisation(state: GameState): number {
  const pilot = P().pilot
  return (
    pilot.utilisationBase +
    (pilot.utilisationBonusByKnowHow[String(knowHow(state))] ?? 0)
  )
}

/**
 * One week of the live projects. A shell: its tenant's rent (a 52nd of a year), less the host's
 * costs (a share of rent; the tenant pays its own power), with any prepayment set off against the
 * cash. A cloud or pilot on spot: GPUs × the neocloud price × utilisation × hours; a cloud under a
 * GPU contract: all its contracted GPUs × the locked price × hours, whatever the utilisation. Both
 * less power at the AI hall's PUE and a week of insurance on the GPUs. Cash moves here; the
 * totals are returned.
 */
export function settleProjectsWeek(
  state: GameState,
  /** Sites the grid curtailed this week (Act II): their AI halls earn and spend nothing. */
  curtailedSiteIds: string[] = [],
): {
  revenueUsd: number
  costUsd: number
  marginByTier: Record<string, number>
} {
  let revenueUsd = 0
  let costUsd = 0
  const marginByTier: Record<string, number> = {}
  const hours = 24 * 7
  const b = BALANCE.projects
  for (const p of state.projects) {
    if (p.stage !== 'live') continue
    const site = state.sites.find((s) => s.id === p.siteId)
    if (!site || isShutDown(state, site.id)) continue
    if (curtailedSiteIds.includes(site.id)) continue
    let rev: number
    let cost: number
    // An AI-lab tenant that forced a renegotiation (card ec23) pays less.
    const labMult =
      p.tenant && tenantCard(p.tenant.card)?.type === 'ai_lab'
        ? state.events.aiLabRevenueMult
        : 1
    if (p.kind === 'shell') {
      if (!p.tenant) continue
      rev = (annualRentUsd(tenantCard(p.tenant.card)!, p.kw) / 52) * labMult
      cost = rev * b.shellOpexShare
      const setOff = Math.min(p.tenant.prepaymentLeftUsd, rev)
      p.tenant.prepaymentLeftUsd -= setOff
      state.cash -= setOff
    } else {
      const up = uptime(site)
      const contract = p.tenant?.gpu
      const lock =
        p.spotLock && state.quarter <= p.spotLock.until ? p.spotLock : null
      rev = contract
        ? contract.gpus * contract.priceUsdHr * hours * up * labMult
        : lock
          ? p.gpuCount * lock.usdHr * hours * up
          : p.gpuCount *
            (neocloudUsdHr(p.gpu!, state.quarter) ?? 0) *
            modifierMult(state, 'spot', null) *
            spotUtilisation(state) *
            hours *
            up
      // A degraded cluster (card ec19) runs below its full rate.
      rev *= modifierMult(state, 'utilisation', null)
      cost =
        p.kw * b.cloudPue * hours * up * powerPriceUsdKwh(site, state.quarter) +
        (p.gpuCapexUsd * b.cloudInsuranceShareYr) / 52
    }
    // A JV partner takes its share of the project's earnings (M4.6).
    const ours = 1 - ownedShareOut(p)
    rev *= ours
    cost *= ours
    revenueUsd += rev
    costUsd += cost
    marginByTier[site.tier] = (marginByTier[site.tier] ?? 0) + rev - cost
  }
  state.cash += revenueUsd - costUsd
  return { revenueUsd, costUsd, marginByTier }
}

// ---------- construction delays and GPU allocation (scope §2.9) ----------

/** Whether a quarter is in the GPU allocation window (2023–24). */
function inAllocationWindow(quarter: number): boolean {
  const label = CONTENT.quarters[quarter]
  const w = BALANCE.projects.gpuAllocation
  return label >= w.from && label <= w.to
}

/**
 * At END_PLAN: each building project rolls a construction delay (15% a quarter) at a random week;
 * a cloud or pilot that ordered its GPUs this quarter in 2023–24 rolls the allocation queue (60%),
 * checked after the first week. Each on its own random stream.
 */
export function planProjectEvents(state: GameState): void {
  const label = CONTENT.quarters[state.quarter]
  const [w0, w1] = BALANCE.projects.delayWeeks
  state.projectEvents = []
  for (const p of state.projects) {
    if (p.stage !== 'building') continue
    if (
      p.kind !== 'shell' &&
      p.startQuarter === state.quarter &&
      inAllocationWindow(state.quarter) &&
      chance(
        substream(state.seed, `gpu_allocation:${label}:${p.id}`),
        P().allocationChance,
      )
    )
      state.projectEvents.push({
        projectId: p.id,
        kind: 'gpu_allocation',
        week: BALANCE.projects.gpuAllocation.week,
      })
    const r = substream(state.seed, `construction_delay:${label}:${p.id}`)
    if (chance(r, P().delay.chance))
      state.projectEvents.push({
        projectId: p.id,
        kind: 'construction_delay',
        week: randomInt(r, w0, w1),
      })
  }
}

/**
 * How many quarters waiting for GPUs takes: one more at GPU know-how 0 (doc 18 §5.4), except for a
 * pilot, which is how you gain the know-how (owner decision on the M3 questions).
 */
export function gpuWaitQuarters(state: GameState, p: Project): number {
  const g = BALANCE.projects.gpuAllocation
  const extra =
    knowHow(state) === 0 && p.kind !== 'pilot'
      ? BALANCE.projects.knowHowZero.extraWaitQuarters
      : 0
  return g.waitQuarters + extra
}

/**
 * After a week is played: a planned delay or allocation for this week becomes an alert (counted
 * toward the 3 per quarter). With the cap full or another alert showing, it resolves silently
 * with its default (accept the slip / wait for the GPUs), logged.
 */
export function checkProjectEvents(state: GameState): void {
  const weekNo = state.week + 1
  for (const e of state.projectEvents) {
    if (e.week !== weekNo) continue
    const p = getProject(state, e.projectId)
    if (!p || p.stage !== 'building') continue
    const capFull =
      state.interruptsThisQuarter >= CONTENT.interrupts.maxPerQuarter
    if (state.interrupt || capFull) {
      if (e.kind === 'construction_delay') slip(state, p, 1, 'silent')
      else slip(state, p, gpuWaitQuarters(state, p), 'silent_wait')
      continue
    }
    state.interrupt = {
      id: e.kind,
      week: state.week,
      coin: 'BTC',
      changePct: 0,
      projectId: p.id,
    }
    state.interruptsThisQuarter++
  }
}

/** An event card slows a building project down by `quarters` (M5.8). */
export function slipProject(
  state: GameState,
  p: Project,
  quarters: number,
): void {
  slip(state, p, quarters, 'event')
}

/**
 * A signed tenant walks away (take-or-pay at 2 quarters late, or an event card): any prepayment not
 * yet set off is repaid, and the project has no tenant again.
 */
export function tenantWalks(state: GameState, p: Project): void {
  const t = p.tenant!
  state.cash -= t.prepaymentLeftUsd
  logEntry(state, 'log.tenant_walked', {
    n: p.n,
    tenant: t.card,
    refundUsd: t.prepaymentLeftUsd,
  })
  p.tenant = null
}

/** Pushes a project's ready quarter back and logs why. */
function slip(
  state: GameState,
  p: Project,
  quarters: number,
  why: 'accepted' | 'silent' | 'contractor' | 'wait' | 'silent_wait' | 'event',
): void {
  p.readyQuarter = (p.readyQuarter ?? state.quarter) + quarters
  const key = (
    {
      accepted: 'log.project_slipped',
      silent: 'log.project_slipped_silent',
      contractor: 'log.project_slipped_contractor',
      wait: 'log.project_gpu_wait',
      silent_wait: 'log.project_gpu_wait_silent',
      event: 'log.project_slipped_event',
    } as const
  )[why]
  logEntry(
    state,
    key,
    { n: p.n, quarter: CONTENT.quarters[p.readyQuarter] ?? '—' },
    state.week + 1,
  )
}

/** What paying on the alert costs: 10% of the capex to accelerate, 8% to jump the GPU queue. */
export function projectEventCostUsd(state: GameState): number {
  const active = state.interrupt
  const p = active?.projectId ? getProject(state, active.projectId) : undefined
  if (!p) return 0
  return Math.round(
    p.capexUsd *
      (active!.id === 'construction_delay'
        ? P().delay.accelerateShareOfCapex
        : BALANCE.projects.gpuAllocation.premiumShareOfCapex),
  )
}

/** The alert's choices that are possible now (paying needs the cash). */
export function projectEventChoices(state: GameState): string[] {
  const active = state.interrupt!
  const afford = projectEventCostUsd(state) <= state.cash
  if (active.id === 'construction_delay')
    return afford
      ? ['accelerate', 'accept_slip', 'change_contractor']
      : ['accept_slip', 'change_contractor']
  return afford ? ['pay_premium', 'wait'] : ['wait']
}

/** The choice when the player doesn't pick: accept the slip / wait for the GPUs. */
export function projectEventDefault(state: GameState): string {
  return state.interrupt!.id === 'construction_delay'
    ? P().delay.default
    : 'wait'
}

export function resolveProjectEvent(
  state: GameState,
  choiceId: string,
): Message | undefined {
  const active = state.interrupt!
  if (!projectEventChoices(state).includes(choiceId))
    return { key: 'error.bad_choice' }
  const p = getProject(state, active.projectId!)!
  const costUsd = projectEventCostUsd(state)
  const weekNo = active.week + 1
  switch (choiceId) {
    case 'accelerate':
    case 'pay_premium':
      state.cash -= costUsd
      p.capexUsd += costUsd
      logEntry(state, 'log.project_paid', { n: p.n, costUsd }, weekNo)
      break
    case 'accept_slip':
      slip(state, p, 1, 'accepted')
      break
    case 'wait':
      slip(state, p, gpuWaitQuarters(state, p), 'wait')
      break
    case 'change_contractor': {
      state.events.bandwidthNext += P().delay.contractorBandwidthNext
      const label = CONTENT.quarters[state.quarter]
      const saved = chance(
        substream(state.seed, `contractor:${label}:${p.id}`),
        P().delay.contractorNoSlipChance,
      )
      if (saved)
        logEntry(state, 'log.project_contractor_saved', { n: p.n }, weekNo)
      else slip(state, p, 1, 'contractor')
      break
    }
  }
  state.interrupt = null
  return undefined
}

// ---------- the projected return (the deal builder, A2-05) ----------

/**
 * A project's projected return at today's prices, before debt: its capex (what starting now would
 * cost, or what was paid), a year's revenue and EBITDA once live, the payback in years and the IRR
 * of paying the capex now, earning nothing while it builds, then the EBITDA each quarter over the
 * tenant's term. A cloud or pilot runs cloudProjectionYears (under its GPU contract for the
 * contract's term, then on spot; on spot also before a tenant is chosen) and then sells its GPUs
 * at the residual value. The revenue and EBITDA shown are the first year's. A shell with no tenant
 * has no revenue to project (null figures).
 */
export function projectedReturn(state: GameState, p: Project) {
  const capexUsd =
    p.stage === 'proposed' ? projectCapex(state, p).totalUsd : p.capexUsd
  const hoursYr = 24 * 365
  const b = BALANCE.projects
  let revenueUsd: number | null = null
  let ebitdaUsd: number | null = null
  /** EBITDA for each quarter once live. */
  let quarters: number[] = []
  let residualUsd = 0
  if (p.kind === 'shell') {
    if (p.tenant) {
      const card = tenantCard(p.tenant.card)!
      revenueUsd = annualRentUsd(card, p.kw)
      ebitdaUsd = revenueUsd * (1 - b.shellOpexShare)
      quarters = Array<number>(card.termYears * 4).fill(ebitdaUsd / 4)
    }
  } else {
    const site = state.sites.find((s) => s.id === p.siteId)!
    const gpus =
      p.stage === 'proposed' ? projectCapex(state, p).gpuCount : p.gpuCount
    const gpuUsd =
      p.stage === 'proposed' ? projectCapex(state, p).gpuUsd : p.gpuCapexUsd
    const up = uptime(site)
    const costUsd =
      p.kw * b.cloudPue * hoursYr * up * powerPriceUsdKwh(site, state.quarter) +
      gpuUsd * b.cloudInsuranceShareYr
    const spotRevenueUsd =
      gpus *
      (neocloudUsdHr(p.gpu!, state.quarter) ?? 0) *
      spotUtilisation(state) *
      hoursYr *
      up
    const contract = p.tenant?.gpu
    const contractRevenueUsd = contract
      ? contract.gpus * contract.priceUsdHr * hoursYr * up
      : 0
    const contractLeft = contract
      ? Math.max(0, contract.termQuarters - p.tenant!.servedQuarters)
      : 0
    quarters = Array.from(
      { length: b.cloudProjectionYears * 4 },
      (_, i) =>
        ((i < contractLeft ? contractRevenueUsd : spotRevenueUsd) - costUsd) /
        4,
    )
    revenueUsd = contractLeft > 0 ? contractRevenueUsd : spotRevenueUsd
    ebitdaUsd = revenueUsd - costUsd
    residualUsd = gpuUsd * gpuResidualShare(b.cloudProjectionYears)
  }
  if (ebitdaUsd === null)
    return { capexUsd, revenueUsd, ebitdaUsd, paybackYears: null, irr: null }
  const wait =
    p.stage === 'live'
      ? 0
      : p.stage === 'building'
        ? Math.max(0, (p.readyQuarter ?? state.quarter) - state.quarter)
        : plannedBuildQuarters(state, p)
  const flows = [-capexUsd, ...Array<number>(wait).fill(0), ...quarters]
  flows[flows.length - 1] += residualUsd
  return {
    capexUsd,
    revenueUsd,
    ebitdaUsd,
    paybackYears: ebitdaUsd > 0 ? capexUsd / ebitdaUsd : null,
    irr: annualIrr(flows),
  }
}

/** The yearly IRR of quarterly cash flows (bisection), or null if it doesn't pay back. */
export function annualIrr(flows: number[]): number | null {
  const npv = (r: number) =>
    flows.reduce((sum, f, i) => sum + f / Math.pow(1 + r, i), 0)
  if (npv(0) <= 0) return null
  let lo = 0
  let hi = 10
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid
    else hi = mid
  }
  return Math.pow(1 + lo, 4) - 1
}

// ---------- GPU resale (owner decision on the M3 questions) ----------

/** What share of their purchase price GPUs are worth `years` after delivery (linear, floored). */
export function gpuResidualShare(years: number): number {
  const r = BALANCE.projects.gpuResidual
  return Math.max(r.floor, 1 - r.declinePerYear * Math.max(0, years))
}

/** What a live cloud's or pilot's GPUs would sell for in `quarter` (delivered when it went live). */
export function gpuResidualUsd(p: Project, quarter: number): number {
  if (p.kind === 'shell' || p.stage !== 'live' || p.readyQuarter === null)
    return 0
  return p.gpuCapexUsd * gpuResidualShare((quarter - p.readyQuarter) / 4)
}

/** Why a project's GPUs can't be sold now, or undefined if they can. */
export function sellGpusBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind === 'shell' || p.stage !== 'live')
    return { key: 'error.gpus_not_live' }
  if (p.tenant?.gpu) return { key: 'error.gpus_contracted' }
  const need = BALANCE.projects.gpuResidual.sellBandwidth
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/**
 * Sells a live cloud's or pilot's GPUs at their residual value (1 Bandwidth; assumes
 * sellGpusBlocker passed): the project ends and its MW are idle again.
 */
export function sellGpus(state: GameState, projectId: string): void {
  const p = getProject(state, projectId)!
  const valueUsd = Math.round(
    gpuResidualUsd(p, state.quarter) * (1 - ownedShareOut(p)),
  )
  state.cash += valueUsd
  state.bandwidth -= BALANCE.projects.gpuResidual.sellBandwidth
  p.stage = 'ended'
  p.soldQuarter = state.quarter
  logEntry(state, 'log.gpus_sold', {
    n: p.n,
    count: p.gpuCount,
    gpu: p.gpu ?? '',
    valueUsd,
  })
}

// ---------- valuation parts and selling (scope 0.2 §2.5, §2.8; doc 18 §7.3, §8) ----------

/**
 * A tenant contract's revenue still to come, to the company: its value a year × the years left of
 * its term, less a JV partner's share.
 */
export function remainingContractUsd(p: Project): number {
  if (!p.tenant || projectGone(p)) return 0
  const quartersLeft = Math.max(
    0,
    contractQuarters(p) - p.tenant.servedQuarters,
  )
  return ((annualContractUsd(p) * quartersLeft) / 4) * (1 - ownedShareOut(p))
}

/** The share of a project a JV partner owns (M4.6), 0 without one. */
export function ownedShareOut(p: Project): number {
  return p.jv?.share ?? 0
}

/** The backlog weight by tenant credit (doc 18 §8): A/AA, BBB, or below (AI labs, B/BB). */
export function backlogWeight(rating: string): number {
  const w = P().backlogWeights
  if (rating.startsWith('A')) return w.a
  if (rating.startsWith('BBB')) return w.bbb
  return w.below
}

/** The backlog on the top bar and dashboard: remaining contracted revenue, unweighted. */
export function backlogUsd(state: GameState): number {
  return state.projects.reduce((sum, p) => sum + remainingContractUsd(p), 0)
}

/** A signed contract's backlog weight: its tenant's credit, or the backstop's (0 with no tenant). */
export function contractWeight(p: Project): number {
  if (!p.tenant) return 0
  return p.backstop
    ? BALANCE.finance.backstopBacklogWeight
    : backlogWeight(tenantCard(p.tenant.card)!.rating)
}

/** The backlog as the valuation counts it: each contract × its tenant's weight (spot counts 0). */
export function weightedBacklogUsd(state: GameState): number {
  return state.projects.reduce(
    (sum, p) => sum + remainingContractUsd(p) * contractWeight(p),
    0,
  )
}

/** Projects under construction count at the capex spent so far (owner decision, 27 Sep 2026). */
export function constructionValueUsd(state: GameState): number {
  return state.projects
    .filter((p) => p.stage === 'building')
    .reduce((sum, p) => sum + p.capexUsd, 0)
}

/** The pivot premium applies from the quarter the first AI deal is signed. */
export function pivotActive(state: GameState): boolean {
  return (
    state.firstAiDealQuarter !== null &&
    state.quarter >= state.firstAiDealQuarter
  )
}

/**
 * The cap rate (a fraction) for a stabilized shell in a quarter (capital_act2.json): its own
 * quarter's value (2026Q3, the 2026Q4 aftershock), else its year's, else the next one given
 * (2022 → 2023's, 2026Q1–Q2 → 2026Q3's). 100 MW and up use the hyperscale rates.
 */
export function capRate(quarter: number, kw: number): number {
  const rates =
    kw >= BALANCE.projects.hyperscaleKw
      ? P().capRates.hyperscale
      : P().capRates.shell
  const label = CONTENT.quarters[quarter]
  const year = label.slice(0, 4)
  const keys = Object.keys(rates).sort()
  const key =
    keys.find((k) => k === label || k === `${label}_aftershock`) ??
    keys.find((k) => k === year) ??
    keys.find((k) => k.slice(0, 4) >= year) ??
    keys.at(-1)!
  return rates[key] / 100
}

/** What a buyer pays for a live shell: its net operating income / the cap rate, less the prepayment it takes on. */
export function saleValueUsd(state: GameState, p: Project): number {
  if (!p.tenant) return 0
  const noi =
    annualRentUsd(tenantCard(p.tenant.card)!, p.kw) *
    (1 - BALANCE.projects.shellOpexShare)
  return (
    (noi / capRate(state.quarter, p.kw)) * (1 - ownedShareOut(p)) -
    p.tenant.prepaymentLeftUsd
  )
}

/** Why a project can't be sold now, or undefined if it can. */
export function sellBlocker(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.stage !== 'live' || p.kind !== 'shell' || !p.tenant)
    return { key: 'error.project_not_live' }
  const need = BALANCE.projects.bandwidth.sell
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/** Sells a live shell (2 Bandwidth; assumes sellBlocker passed): its MW leave the site with it. */
export function sellProject(state: GameState, projectId: string): void {
  const p = getProject(state, projectId)!
  const priceUsd = Math.round(saleValueUsd(state, p))
  const site = state.sites.find((s) => s.id === p.siteId)!
  site.soldKw = (site.soldKw ?? 0) + p.kw
  state.cash += priceUsd
  state.bandwidth -= BALANCE.projects.bandwidth.sell
  p.stage = 'sold'
  p.soldQuarter = state.quarter
  logEntry(state, 'log.project_sold', { n: p.n, priceUsd })
}
