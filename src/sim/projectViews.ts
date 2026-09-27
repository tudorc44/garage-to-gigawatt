// Read-only views of the Act II projects for the UI (scope 0.2 §2.5; wireframes A2-04 Projects,
// A2-05 Deal builder). Re-exported by selectors.ts. No game rules here: every number comes from
// systems/projects.ts.
import { BALANCE, CONTENT } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import type { GameState, Project } from './state.ts'
import { convertibleKw } from './systems/hosting.ts'
import { siteMwByUse } from './systems/mwUse.ts'
import {
  annualRentUsd,
  availableGpus,
  buildBlocker,
  buildQuarters,
  capRate,
  knowHow,
  neocloudUsdHr,
  projectCapex,
  projectedReturn,
  remainingContractUsd,
  saleValueUsd,
  sellBlocker,
  slots,
  spotUtilisation,
  tenantCard,
} from './systems/projects.ts'
import { capacityKw, regionOf } from './systems/sites.ts'

const P = () => CONTENT.projects
const label = (q: number | null) =>
  q === null ? '' : (CONTENT.quarters[q] ?? '')

/** The kanban column a project sits in (A2-04). */
export type ProjectColumn =
  'proposed' | 'filling' | 'building' | 'live' | 'sold'
export const PROJECT_COLUMNS: ProjectColumn[] = [
  'proposed',
  'filling',
  'building',
  'live',
  'sold',
]

function columnOf(p: Project): ProjectColumn {
  if (p.stage !== 'proposed') return p.stage
  const s = slots(p)
  return s.tenant === true || s.capital ? 'filling' : 'proposed'
}

function whyNot(state: GameState, action: Action): Message | null {
  const r = applyAction(state, action)
  return r.ok ? null : r.error
}

/** One project card: where, what, its slots, its tenant, its dates and its projected return. */
export function projectCard(state: GameState, p: Project) {
  const site = state.sites.find((s) => s.id === p.siteId)!
  const card = p.tenant ? tenantCard(p.tenant.card)! : null
  const ret = projectedReturn(state, p)
  const late =
    p.tenant && p.stage !== 'live' && p.stage !== 'sold'
      ? {
          quarters: p.tenant.lateQuarters,
          damagesUsd: annualRentUsd(card!, p.kw) * P().latePenaltyShareYr,
          walkChance: P().walkChanceLate2q[card!.type],
        }
      : null
  return {
    project: p,
    column: columnOf(p),
    tier: site.tier,
    region: regionOf(site) ?? null,
    slots: slots(p),
    tenant: card
      ? {
          id: card.id,
          type: card.type,
          rating: card.rating,
          termYears: card.termYears,
          priceUsdMwYr: card.priceUsdMwYr,
          annualUsd: annualRentUsd(card, p.kw),
          readyBy: label(p.tenant!.readyByQuarter),
          yearsLeft: remainingContractUsd(p) / annualRentUsd(card, p.kw),
        }
      : null,
    late,
    /** Quarters until it goes live (building), or null. */
    toGo:
      p.stage === 'building' && p.readyQuarter !== null
        ? Math.max(0, p.readyQuarter - state.quarter)
        : null,
    ready: label(p.readyQuarter),
    buildQuarters: buildQuarters(p.kind),
    gpuCount:
      p.stage === 'proposed' ? projectCapex(state, p).gpuCount : p.gpuCount,
    utilisation: p.kind === 'shell' ? null : spotUtilisation(state),
    gpuUsdHr: p.gpu ? (neocloudUsdHr(p.gpu, state.quarter) ?? null) : null,
    irr: ret.irr,
    saleUsd:
      p.stage === 'live' && p.kind === 'shell' && p.tenant
        ? saleValueUsd(state, p)
        : null,
    sellBlocker:
      p.stage === 'live'
        ? sellBlocker(state, p.id)
        : { key: 'error.project_not_live' as const },
  }
}

export type ProjectCardView = ReturnType<typeof projectCard>

/** The Projects page (A2-04): every project by column, and the MW they hold. */
export function projectsView(state: GameState) {
  const cards = state.projects.map((p) => projectCard(state, p))
  return {
    cards,
    byColumn: Object.fromEntries(
      PROJECT_COLUMNS.map((c) => [c, cards.filter((x) => x.column === c)]),
    ) as Record<ProjectColumn, ProjectCardView[]>,
    count: state.projects.filter((p) => p.stage !== 'sold').length,
    kw: state.projects
      .filter((p) => p.stage !== 'sold')
      .reduce((sum, p) => sum + p.kw, 0),
    knowHow: knowHow(state),
    openBandwidth: BALANCE.projects.bandwidth.open,
  }
}

/**
 * Opening a project: the sites with free energized MW, the kinds and GPUs on offer now, and the
 * pilot's sizes. The dialog dry-runs PROJECT_OPEN for the reason a choice isn't allowed.
 */
export function openProjectView(state: GameState) {
  const pilot = P().pilot
  const sizes: number[] = []
  for (let kw = pilot.kwMin; kw <= pilot.kwMax + 1e-9; kw += pilot.kwStep)
    sizes.push(kw)
  return {
    sites: state.sites
      .filter((s) => s.tier !== BALANCE.startSite)
      .map((site) => ({
        site,
        region: regionOf(site) ?? null,
        freeKw: convertibleKw(state, site.id),
      })),
    gpus: availableGpus(state.quarter).map((g) => g.id),
    pilotFrom: pilot.from,
    pilotOpen: CONTENT.quarters[state.quarter] >= pilot.from,
    pilotSizes: sizes,
    bandwidth: BALANCE.projects.bandwidth.open,
    /** The id the next project gets (the dialog opens its deal builder). */
    nextId: `project-${state.projects.reduce((m, p) => Math.max(m, p.n), 0) + 1}`,
  }
}

/**
 * The deal builder (A2-05) for one project: the Power slot (the site's MW), the Tenant slot (offers
 * with their terms, or spot), the Capital slot (own cash) and the projected return, with what
 * starting the build would cost and why it can't start yet.
 */
export function dealView(state: GameState, projectId: string) {
  const p = state.projects.find((x) => x.id === projectId)
  if (!p) return null
  const site = state.sites.find((s) => s.id === p.siteId)!
  const use = siteMwByUse(state, site, state.quarter)
  const card = projectCard(state, p)
  const cost = projectCapex(state, p)
  return {
    card,
    power: {
      totalKw: capacityKw(site),
      miningKw: use.mining,
      freeKw: convertibleKw(state, site.id),
    },
    offers: p.offers.map((o) => {
      const c = tenantCard(o.card)!
      return {
        offer: o,
        type: c.type,
        rating: c.rating,
        priceUsdMwYr: c.priceUsdMwYr,
        annualUsd: annualRentUsd(c, p.kw),
        termYears: c.termYears,
        prepaymentShare: c.prepaymentShare,
        readyBy: label(state.quarter + o.readyByQuarters),
        walkChance: P().walkChanceLate2q[c.type],
        capexCreditUsd: Math.min(
          c.capexCreditUsdMw * (p.kw / 1000),
          cost.retrofitUsd,
        ),
        blocker: whyNot(state, {
          type: 'PROJECT_SIGN_TENANT',
          projectId: p.id,
          offerId: o.id,
        }),
      }
    }),
    spot:
      p.kind === 'cloud'
        ? {
            usdHr: card.gpuUsdHr,
            utilisation: spotUtilisation(state),
            blocker: whyNot(state, { type: 'PROJECT_SPOT', projectId: p.id }),
          }
        : null,
    capital: {
      cashUsd: state.cash,
      blocker: whyNot(state, { type: 'PROJECT_FUND_CASH', projectId: p.id }),
    },
    cost,
    projected: projectedReturn(state, p),
    projectionYears: BALANCE.projects.cloudProjectionYears,
    capRate: p.kind === 'shell' ? capRate(state.quarter, p.kw) : null,
    startBlocker:
      p.stage === 'proposed' ? (buildBlocker(state, p.id) ?? null) : null,
    startBandwidth: BALANCE.projects.bandwidth.start,
    cancelBlocker: whyNot(state, { type: 'PROJECT_CANCEL', projectId: p.id }),
  }
}
