// Read-only views of the Act II projects for the UI (scope 0.2 §2.5; wireframes A2-04 Projects,
// A2-05 Deal builder). Re-exported by selectors.ts. No game rules here: every number comes from
// systems/projects.ts.
import { BALANCE, CONTENT } from '../content/index.ts'
import type { Message } from '../i18n/t.ts'
import { applyAction, type Action } from './actions.ts'
import {
  inActIII,
  projectGone,
  type GameState,
  type Project,
} from './state.ts'
import { convertibleKw } from './systems/hosting.ts'
import { scenarioOf } from './systems/market.ts'
import { siteMwByUse } from './systems/mwUse.ts'
import {
  annualContractUsd,
  annualRentUsd,
  availableGpus,
  contractQuarters,
  gpuContractUsdHr,
  gpuGeneration,
  newLeaseIndex,
  plannedLiveQuarter,
  buildBlocker,
  capRate,
  gpuResidualShare,
  gpuResidualUsd,
  knowHow,
  neocloudUsdHr,
  plannedBuildQuarters,
  projectCapex,
  projectedReturn,
  remainingContractUsd,
  saleValueUsd,
  sellBlocker,
  slots,
  spotUtilisation,
  tenantCard,
} from './systems/projects.ts'
import {
  capacityChargeUsdKwh,
  capacityKw,
  poweredKw,
  powerPriceUsdKwh,
  regionOf,
} from './systems/sites.ts'
import {
  nuclearPriceUsdMwh,
  ppaAdderUsdMwh,
  ppaResaleUsdMwh,
} from './systems/nuclear.ts'
import { gridQuarterRange, powerBlocker } from './systems/power.ts'
import {
  downtimeDoneQuarter,
  fits,
  gpuTier,
  midToTopUsdMw,
  shellTierRentMult,
  topBuildOpen,
} from './systems/density.ts'
import {
  refitBlocker,
  refitChoices,
  refitPlan,
  retrofitBlocker,
  retrofitPlan,
} from './systems/retrofit.ts'

const P = () => CONTENT.projects
const label = (q: number | null) =>
  q === null ? '' : (CONTENT.quarters[q] ?? '')

/**
 * A projected return net of a JV partner (M4.6): the partner funds its share of the build and takes
 * the same share of the earnings, so capex, revenue and EBITDA shrink to yours while the payback
 * and the IRR (before debt) stay as they are. Without a partner it is the whole project's.
 */
function yourShareOfReturn(
  ret: ReturnType<typeof projectedReturn>,
  p: Project,
) {
  const mine = 1 - (p.jv?.share ?? 0)
  const scale = (v: number | null) => (v === null ? null : v * mine)
  return {
    ...ret,
    capexUsd: ret.capexUsd * mine,
    revenueUsd: scale(ret.revenueUsd),
    ebitdaUsd: scale(ret.ebitdaUsd),
  }
}

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
  if (p.stage === 'ended' || p.stage === 'foreclosed') return 'sold'
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
    p.tenant && p.stage !== 'live' && !projectGone(p)
      ? {
          quarters: p.tenant.lateQuarters,
          damagesUsd: annualContractUsd(p) * P().latePenaltyShareYr,
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
          termYears: contractQuarters(p) / 4,
          priceUsdMwYr: card.priceUsdMwYr,
          /** A GPU contract's locked $/GPU-hr, or null for a shell lease. */
          gpuUsdHr: p.tenant!.gpu?.priceUsdHr ?? null,
          annualUsd: annualContractUsd(p),
          readyBy: label(p.tenant!.readyByQuarter),
          yearsLeft: remainingContractUsd(p) / annualContractUsd(p),
        }
      : null,
    late,
    /** Quarters until it goes live (building), or null. */
    toGo:
      p.stage === 'building' && p.readyQuarter !== null
        ? Math.max(0, p.readyQuarter - state.quarter)
        : null,
    ready: label(p.readyQuarter),
    buildQuarters: plannedBuildQuarters(state, p),
    gpuCount:
      p.stage === 'proposed' ? projectCapex(state, p).gpuCount : p.gpuCount,
    utilisation: p.kind === 'shell' ? null : spotUtilisation(state),
    gpuUsdHr: p.gpu
      ? (neocloudUsdHr(p.gpu, state.quarter, scenarioOf(state)) ?? null)
      : null,
    irr: ret.irr,
    saleUsd:
      p.stage === 'live' && p.kind === 'shell' && p.tenant
        ? saleValueUsd(state, p)
        : null,
    sellBlocker:
      p.stage === 'live'
        ? sellBlocker(state, p.id)
        : { key: 'error.project_not_live' as const },
    /** A live cloud or pilot: what its GPUs would sell for now, and why they can't (or null). */
    gpuSale:
      p.stage === 'live' && p.kind !== 'shell'
        ? {
            valueUsd: gpuResidualUsd(p, state.quarter),
            blocker: whyNot(state, {
              type: 'PROJECT_SELL_GPUS',
              projectId: p.id,
            }),
          }
        : null,
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
    count: state.projects.filter((p) => !projectGone(p)).length,
    kw: state.projects
      .filter((p) => !projectGone(p))
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
      .map((site) => {
        const region = regionOf(site) ?? null
        return {
          site,
          region,
          freeKw: convertibleKw(state, site.id),
          /** New power for a project here (M5.6): its cost, time and why it can't be had now. */
          grid: {
            usdMw: P().power.grid.capexUsdMw,
            quarters: region ? gridQuarterRange(state, region) : null,
            blocker: powerBlocker(state, site, 'grid') ?? null,
          },
          gas: {
            usdMw: P().power.gas.capexUsdMw,
            quarters: P().power.gas.buildQuarters,
            heat: P().power.gas.heatDelta,
            blocker: powerBlocker(state, site, 'gas') ?? null,
          },
          /** Act III (M17.6, A3-08): the nuclear PPA here: its price now, the grid price here now, why not. */
          nuclear: inActIII(state)
            ? {
                blocker: powerBlocker(state, site, 'nuclear') ?? null,
                priceUsdMwh: nuclearPriceUsdMwh(state),
                // (M17.8: the PJM capacity charge included, shown on its own too)
                gridUsdMwh:
                  powerPriceUsdKwh(site, state.quarter, scenarioOf(state)) * 1000,
                chargeUsdMwh:
                  capacityChargeUsdKwh(site, state.quarter, scenarioOf(state)) * 1000,
                /** M17.8 C: what unused take-or-pay power is resold at here now. */
                resaleUsdMwh: ppaResaleUsdMwh(state, site),
                /** M18.0: the region's policy adder, paid on PPA power too. */
                adderUsdMwh: ppaAdderUsdMwh(site, state.quarter),
                termYears: CONTENT.act3Nuclear.termQuarters / 4,
                takeOrPay: BALANCE.act3.nuclear.takeOrPayShare,
                from: CONTENT.act3Nuclear.unlockQuarter,
              }
            : null,
        }
      }),
    gpus: availableGpus(state.quarter, scenarioOf(state)).map((g) => g.id),
    /**
     * Act III (M16.2/M16.5): a new hall is mid tier unless built to top; the GPUs that fit each, and what the
     * top-tier build adds. Null outside Act III.
     */
    act3: inActIII(state)
      ? {
          topOpen: topBuildOpen(state),
          topFrom: BALANCE.act3.density.topNewBuildFrom,
          topExtraUsdMw:
            BALANCE.act3.density.topNewBuildRetrofitShare *
            midToTopUsdMw(state),
          topExtraQuarters: BALANCE.act3.density.topNewBuildExtraQuarters,
          gpusMid: availableGpus(state.quarter, scenarioOf(state))
            .map((g) => g.id)
            .filter((g) => fits(g, 'mid')),
          gpusTop: availableGpus(state.quarter, scenarioOf(state)).map(
            (g) => g.id,
          ),
        }
      : null,
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
  const add = site.powerAdds?.find((a) => a.projectId === p.id)
  return {
    card,
    power: {
      totalKw: capacityKw(site),
      miningKw: use.mining,
      freeKw: convertibleKw(state, site.id),
      /** New power (grid upgrade or gas): its source, cost, and when it's energized (null: not ordered yet). */
      added: add
        ? {
            source: add.source,
            costUsd: cost.powerUsd,
            readyQuarter:
              add.readyQuarter === null ? null : label(add.readyQuarter),
            expectedQuarters: plannedBuildQuarters(state, p),
          }
        : null,
    },
    offers: p.offers.map((o) => {
      // (M16.2: × the hall's tier multiple from 2027Q3, as signTenant signs it)
      const leaseIndex = newLeaseIndex(state) * shellTierRentMult(state, p)
      const c = tenantCard(o.card)!
      const gpuUsdHr = o.gpu
        ? (gpuContractUsdHr(
            p.gpu!,
            o.gpu.termYears,
            state.quarter,
            scenarioOf(state),
          ) ?? 0)
        : null
      const gpus = p.stage === 'proposed' ? cost.gpuCount : p.gpuCount
      return {
        offer: o,
        type: c.type,
        rating: c.rating,
        // Act III (M12.2, F-2): a lease signs at the card price × the new-lease (RFP) index.
        priceUsdMwYr: c.priceUsdMwYr * (o.gpu ? 1 : leaseIndex),
        /** A GPU contract offer's $/GPU-hr (locked if signed now), or null for a lease. */
        gpuUsdHr,
        annualUsd:
          gpuUsdHr === null
            ? annualRentUsd(c, p.kw) * leaseIndex
            : gpus * gpuUsdHr * 24 * 365,
        termYears: o.gpu ? o.gpu.termYears : c.termYears,
        prepaymentShare: o.gpu ? 0 : c.prepaymentShare,
        readyBy: label(
          o.gpu
            ? plannedLiveQuarter(state, p) + o.gpu.bufferQuarters
            : state.quarter + o.readyByQuarters,
        ),
        walkChance: P().walkChanceLate2q[c.type],
        capexCreditUsd: o.gpu
          ? 0
          : Math.min(c.capexCreditUsdMw * (p.kw / 1000), cost.retrofitUsd),
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
    /**
     * The spot utilisation the projection uses (M8.5), for a pilot and a cloud: the pilot's base plus its
     * know-how bonus. A cloud under a GPU contract earns the contract price whatever the utilisation.
     */
    utilisation:
      p.kind === 'shell'
        ? null
        : {
            value: spotUtilisation(state),
            base: P().pilot.utilisationBase,
            knowHow: knowHow(state),
            bonus:
              P().pilot.utilisationBonusByKnowHow[String(knowHow(state))] ?? 0,
            contracted: !!p.tenant?.gpu,
          },
    projected: yourShareOfReturn(projectedReturn(state, p), p),
    /** The JV partner's share of the project (0 without one): the return above is net of it. */
    partnerShare: p.jv?.share ?? 0,
    wholeCapexUsd: projectedReturn(state, p).capexUsd,
    projectionYears: BALANCE.projects.cloudProjectionYears,
    residualShareAtEnd: gpuResidualShare(BALANCE.projects.cloudProjectionYears),
    capRate:
      p.kind === 'shell'
        ? capRate(state.quarter, p.kw, scenarioOf(state))
        : null,
    startBlocker:
      p.stage === 'proposed' ? (buildBlocker(state, p.id) ?? null) : null,
    startBandwidth: BALANCE.projects.bandwidth.start,
    cancelBlocker: whyNot(state, { type: 'PROJECT_CANCEL', projectId: p.id }),
  }
}

// ---------- A3-07: halls and rack density (Act III, M16.5) ----------

/** The generations the fit matrix and the "fits" column name, oldest first. */
const RACK_GENS = ['h100', 'h200', 'b200', 'rubin_nvl144', 'rubin_ultra']

/** The fit matrix's rows (A3-07): H100/H200, Blackwell, Rubin, Rubin Ultra, with the tier each needs. */
const MATRIX = [
  { id: 'hopper', gens: ['h100', 'h200'] },
  { id: 'blackwell', gens: ['b200'] },
  { id: 'rubin', gens: ['rubin_nvl144'] },
  { id: 'rubin_ultra', gens: ['rubin_ultra'] },
] as const

/** Quarter by quarter, what share of its income a hall keeps over `weeks` of work starting now. */
function downtimeQuarters(state: GameState, weeks: number) {
  const W = BALANCE.weeksPerQuarter
  return Array.from({ length: Math.ceil(weeks / W) }, (_, k) => ({
    quarter: CONTENT.quarters[state.quarter + k] ?? '—',
    share: Math.min(1, Math.max(0, 1 - (weeks - W * k) / W)),
  }))
}

/**
 * The Act III "Halls and rack density" view (A3-07): one row per live, building or proposed hall with its
 * tier, what fits, both retrofit options and (clouds and pilots) the GPU changes; the fit matrix. Null
 * outside Act III.
 */
export function racksView(state: GameState) {
  if (!inActIII(state)) return null
  const G = CONTENT.act3Gpus
  const label = CONTENT.quarters[state.quarter]
  const onSale = availableGpus(state.quarter, scenarioOf(state)).map((g) => g.id)
  const fitting = (tier: 'low' | 'mid' | 'top') =>
    RACK_GENS.filter((g) => fits(g, tier))
  const rows = state.projects
    .filter((p) => !projectGone(p) && p.tier)
    .map((p) => {
      const tier = p.tier!
      const site = state.sites.find((s) => s.id === p.siteId)!
      const mw = p.kw / 1000
      const plan = retrofitPlan(state, p)
      const quarterIncomeUsd =
        p.stage === 'live' ? (projectedReturn(state, p).revenueUsd ?? 0) / 4 : 0
      const lowToMid = {
        usdMw: G.lowToMid.retrofitUsdMw,
        totalUsd: G.lowToMid.retrofitUsdMw * mw,
        weeks: G.lowToMid.weeks,
        open: tier === 'low',
      }
      const toTopUsdMw = midToTopUsdMw(state)
      const midToTop = {
        usdMw: toTopUsdMw,
        totalUsd: toTopUsdMw * mw,
        weeks: G.midToTopWeeks,
        open: tier === 'mid',
        needsMidFirst: tier === 'low',
      }
      const refits =
        p.kind === 'shell'
          ? null
          : refitChoices(state, p).map((gpu) => ({
              gpu,
              plan: refitPlan(state, p, gpu)!,
              blocker: refitBlocker(state, p.id, gpu) ?? null,
            }))
      return {
        project: p,
        site,
        mw,
        tier,
        fits: fitting(tier),
        retrofit: {
          blocker: retrofitBlocker(state, p.id) ?? null,
          to: plan?.to ?? null,
          lowToMid,
          midToTop,
          /** The hall's income while the work runs: each quarter's share and dollars (the downtime rule). */
          income: plan
            ? downtimeQuarters(state, plan.weeks).map((x) => ({
                ...x,
                usd: x.share * quarterIncomeUsd,
              }))
            : [],
          afterFits: plan ? fitting(plan.to) : [],
          leased: p.kind === 'shell' && !!p.tenant,
        },
        refit: refits && {
          choices: refits,
          saleUsd: refits[0]?.plan.saleUsd ?? Math.round(gpuResidualUsd(p, state.quarter)),
          /** Why no change can be made now (the first choice's reason, or none on sale that fits). */
          blocker: refits.some((r) => !r.blocker)
            ? null
            : (refits[0]?.blocker ?? { key: 'error.no_refit_choice' as const }),
        },
        downtime: p.downtime
          ? {
              kind: p.downtime.kind,
              until: CONTENT.quarters[downtimeDoneQuarter(p.downtime)] ?? '—',
            }
          : null,
      }
    })
  return {
    energizedMw:
      state.sites.reduce((kw, s) => kw + poweredKw(s, state.quarter), 0) / 1000,
    rows,
    tierRack: G.tierRackKw,
    matrix: MATRIX.map((m) => ({
      id: m.id,
      needs: gpuTier(m.gens[0]),
      /** Not on sale yet: the first quarter it is (Rubin Ultra: 2027Q3). */
      from: m.gens.every((g) => !onSale.includes(g))
        ? (gpuGeneration(m.gens[0])?.from ?? null)
        : null,
      fits: { low: fits(m.gens[0], 'low'), mid: fits(m.gens[0], 'mid'), top: fits(m.gens[0], 'top') },
    })),
    quarter: label,
    cashUsd: state.cash,
    bandwidth: { retrofit: BALANCE.act3.density.retrofitBw, refit: BALANCE.act3.density.refitBw },
  }
}
