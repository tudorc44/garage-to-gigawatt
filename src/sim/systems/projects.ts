// Projects (Act II, scope 0.2 §2.5, doc 18 §5; wireframes A2-04 / A2-05): turn free energized MW
// at one of your sites into an AI shell lease (a tenant brings its GPUs), an AI cloud (your GPUs,
// sold on the spot market) or a pilot cluster (0.5–2 MW of H100s on spot). A project has three
// slots — Power (existing MW), Tenant (a card from tenants.json, or spot), Capital (own cash) —
// then builds for a few quarters and goes live. This file: prices, know-how, offers, the slots.
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  type Act2Quarter,
  type GpuGeneration,
  type TenantCard,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { randomInt, substream } from '../rng.ts'
import {
  logEntry,
  type GameState,
  type Project,
  type ProjectKind,
} from '../state.ts'
import { underMoratorium } from './heat.ts'
import { isHired } from './hires.ts'
import { convertibleKw } from './hosting.ts'
import { regionOf } from './sites.ts'

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
 * clusters, 3 at 100 MW of live full stack. (The gpu_cloud Merge head start comes later.)
 */
export function knowHow(state: GameState): number {
  const live = state.projects.filter(
    (p) => p.stage === 'live' && p.kind !== 'shell',
  )
  const kw = live.reduce((sum, p) => sum + p.kw, 0)
  if (kw >= BALANCE.projects.knowHowThreeKw) return 3
  if (live.length >= 2) return 2
  return live.length >= 1 ? 1 : 0
}

/** Build quarters: a shell retrofit; a cloud adds a quarter for the GPUs; a pilot its own. */
export function buildQuarters(kind: ProjectKind): number {
  if (kind === 'pilot') return P().pilot.buildQuarters
  const shell = P().retrofit.buildQuarters
  return kind === 'cloud' ? shell + P().fullStack.extraBuildQuarters : shell
}

export function tenantCard(id: string): TenantCard | undefined {
  return P().tenantCards.find((c) => c.id === id)
}

/** A tenant's rent over a year for `kw`. */
export function annualRentUsd(card: TenantCard, kw: number): number {
  return card.priceUsdMwYr * (kw / 1000)
}

/**
 * What a project costs to build if it starts in `quarter` (conversions.json, market_quarterly):
 * the retrofit per MW, plus for clouds and pilots the GPUs (gpus per MW × the unit price; +10%
 * for a cloud at GPU know-how 0), less the tenant's capex credit (capped at the retrofit).
 */
export function projectCapex(
  state: GameState,
  p: Pick<Project, 'kw' | 'kind' | 'gpu' | 'tenant'>,
  quarter = state.quarter,
): {
  retrofitUsd: number
  gpuUsd: number
  creditUsd: number
  totalUsd: number
  gpuCount: number
} {
  const mw = p.kw / 1000
  const retrofitUsd = (act2Quarter(quarter)?.capexUsdMw.retrofitShell ?? 0) * mw
  let gpuUsd = 0
  let gpuCount = 0
  if (p.kind !== 'shell' && p.gpu) {
    const gen = gpuGeneration(p.gpu)!
    gpuCount = Math.round(gen.gpusPerMw * mw)
    const mult =
      p.kind === 'cloud' && knowHow(state) === 0
        ? BALANCE.projects.knowHowZero.costMult
        : 1
    gpuUsd = gpuCount * (gpuPriceUsd(p.gpu, quarter) ?? 0) * mult
  }
  const card = p.tenant ? tenantCard(p.tenant.card) : undefined
  const creditUsd = Math.min(retrofitUsd, (card?.capexCreditUsdMw ?? 0) * mw)
  return {
    retrofitUsd,
    gpuUsd,
    creditUsd,
    totalUsd: retrofitUsd + gpuUsd - creditUsd,
    gpuCount,
  }
}

/** Whether tenant offers exist yet (doc 18 §2.3: from 2023Q3). */
export function tenantsOpen(quarter: number): boolean {
  return CONTENT.quarters[quarter] >= BALANCE.projects.tenantsFrom
}

/** Draws a shell project's tenant offers (2–3, +1 with the BD Lead) from the eligible cards. */
export function drawOffers(state: GameState, p: Project): void {
  if (p.kind !== 'shell' || !tenantsOpen(state.quarter)) return
  const site = state.sites.find((s) => s.id === p.siteId)
  const level = knowHow(state)
  const pool = P().tenantCards.filter(
    (c) =>
      (c.needsKnowHow ?? 0) <= level &&
      (!c.regionLock || (site && c.regionLock === regionOf(site))),
  )
  const r = substream(state.seed, `project_offers:${state.quarter}:${p.id}`)
  const { min, max } = BALANCE.projects.offers
  const n = Math.min(
    pool.length,
    randomInt(r, min, max) + (isHired(state, 'bd_lead') ? 1 : 0),
  )
  const left = [...pool]
  p.offers = []
  for (let i = 0; i < n; i++) {
    const card = left.splice(randomInt(r, 0, left.length - 1), 1)[0]
    p.offers.push({
      id: `${p.id}-offer-${state.quarter}-${i + 1}`,
      card: card.id,
      readyByQuarters: randomInt(r, card.readyBy[0], card.readyBy[1]),
    })
  }
}

/** Why a project can't be opened like this now, or undefined if it can. */
export function openBlocker(
  state: GameState,
  a: { siteId: string; kw: number; kind: ProjectKind; gpu?: string },
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
  const freeKw = convertibleKw(state, a.siteId)
  if (a.kw > freeKw + 1e-9)
    return {
      key: 'error.no_project_room',
      params: { tier: site.tier, freeKw, neededKw: a.kw },
    }
  const need = BALANCE.projects.bandwidth.open
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  return undefined
}

/** Opens a project (assumes openBlocker passed): its Power slot is the site's free MW. */
export function openProject(
  state: GameState,
  a: { siteId: string; kw: number; kind: ProjectKind; gpu?: string },
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
    gpuCount: 0,
    startQuarter: null,
    readyQuarter: null,
    soldQuarter: null,
  }
  state.bandwidth -= BALANCE.projects.bandwidth.open
  state.projects.push(p)
  drawOffers(state, p)
  const site = state.sites.find((s) => s.id === a.siteId)!
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
 * Signs one of a shell project's offers (accept: 0 Bandwidth). The tenant sets its ready-by
 * quarter; any prepayment (a share of the whole contract) comes in now and is set off against
 * rent later. The first signed AI deal starts the pivot premium.
 */
export function signTenant(
  state: GameState,
  projectId: string,
  offerId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind !== 'shell') return { key: 'error.project_no_tenant' }
  if (p.tenant) return { key: 'error.tenant_signed' }
  if (p.stage === 'sold') return { key: 'error.wrong_phase' }
  const offer = p.offers.find((o) => o.id === offerId)
  const card = offer && tenantCard(offer.card)
  if (!offer || !card) return { key: 'error.unknown_offer' }
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

/** A cloud project sells its capacity on the spot market (its Tenant slot). */
export function useSpot(
  state: GameState,
  projectId: string,
): Message | undefined {
  const p = getProject(state, projectId)
  if (!p) return { key: 'error.unknown_project' }
  if (p.kind !== 'cloud') return { key: 'error.project_no_spot' }
  if (p.stage !== 'proposed') return { key: 'error.wrong_phase' }
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
      p.kind === 'pilot' ? null : p.kind === 'shell' ? !!p.tenant : p.spot,
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
  state.projects = state.projects.filter((x) => x.id !== projectId)
  logEntry(state, 'log.project_cancelled', { n: p.n })
  return undefined
}
