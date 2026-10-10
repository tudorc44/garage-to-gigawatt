// Read-only views of Act IV's orbit for the UI (M29.5; doc 33 §17: A4-03 Orbit board, A4-04 Launch manifest, A4-05 the
// block's deal card, A4-08 Licences and registries, A4-02's exposure warnings). No game rules here: every number comes
// from systems/orbit*.ts. Nothing here reads the hidden reliability: a block shows its design life and its telemetry.
import { CONTENT, actLastQuarter } from '../content/index.ts'
import {
  GENERATION_IDS,
  ORBIT,
  PROVIDER_IDS,
  SHELL_IDS,
  tenantType,
  type GenerationId,
  type ProviderId,
  type ShellId,
} from '../content/orbitContent.ts'
import type { Message } from '../i18n/t.ts'
import type { Action } from './actions.ts'
import { inActIV, type GameState, type OrbitalBlock } from './state.ts'
import { companyLtv, covenantLimit } from './systems/covenant.ts'
import { CAPITAL_KINDS, blockDebt, debtApr, ownShare } from './systems/orbitCapital.ts'
import {
  annualValueUsd,
  arrangeOrbitalCapitalBlocker,
  availableGenerations,
  blockMassT,
  buildGroundStationBlocker,
  generationTMw,
  cancelOrbitalBlockBlocker,
  fastTrackLicenceBlocker,
  fileLicenceBlocker,
  setRegistryBlocker,
  signOrbitalTenantBlocker,
  licenceApprovalQuarter,
  licensedMw,
  linkUnits,
  registryChangeBandwidth,
  usedLicenceMw,
} from './systems/orbit.ts'
import {
  bookLaunchBlocker,
  bookedTonnes,
  buildCostUsd,
  buyInsuranceBlocker,
  cancelLaunchBlocker,
  blockValueUsd,
  insuranceQuote,
  insuredNow,
  launchCostUsd,
  launchDepositUsd,
  launchPriceUsdKg,
  slotsTonnes,
} from './systems/orbitLaunch.ts'
import {
  blockSaleUsd,
  linkShares,
  linkUnitsNeeded,
  sellOrbitalBlockBlocker,
  spaceMultiple,
} from './systems/orbitOps.ts'

/** Why an orbit action can't be taken now (its blocker, read-only: no copy of the state per button). */
function why(state: GameState, a: OrbitAction): Message | null {
  const m = (() => {
    switch (a.type) {
      case 'BOOK_ORBITAL_LAUNCH':
        return bookLaunchBlocker(state, a.blockId, a.provider, a.quarter)
      case 'SIGN_ORBITAL_TENANT':
        return signOrbitalTenantBlocker(state, a.blockId, a.offer)
      case 'ARRANGE_ORBITAL_CAPITAL':
        return arrangeOrbitalCapitalBlocker(state, a.blockId, a.capital)
      case 'BUY_ORBITAL_INSURANCE':
        return buyInsuranceBlocker(state, a.blockId)
      case 'SELL_ORBITAL_BLOCK':
        return sellOrbitalBlockBlocker(state, a.blockId)
      case 'CANCEL_ORBITAL_BLOCK':
        return cancelOrbitalBlockBlocker(state, a.blockId)
      case 'CANCEL_ORBITAL_LAUNCH':
        return cancelLaunchBlocker(state, a.blockId)
      case 'FILE_ORBITAL_LICENCE':
        return fileLicenceBlocker(state, a.shell)
      case 'FAST_TRACK_LICENCE':
        return fastTrackLicenceBlocker(state, a.shell)
      case 'SET_REGISTRY':
        return setRegistryBlocker(state, a.registry)
      case 'BUILD_GROUND_STATION':
        return buildGroundStationBlocker(state, a.siteId)
    }
  })()
  return m ?? null
}
type OrbitAction = Extract<
  Action,
  {
    type:
      | 'BOOK_ORBITAL_LAUNCH'
      | 'SIGN_ORBITAL_TENANT'
      | 'ARRANGE_ORBITAL_CAPITAL'
      | 'BUY_ORBITAL_INSURANCE'
      | 'SELL_ORBITAL_BLOCK'
      | 'CANCEL_ORBITAL_BLOCK'
      | 'CANCEL_ORBITAL_LAUNCH'
      | 'FILE_ORBITAL_LICENCE'
      | 'FAST_TRACK_LICENCE'
      | 'SET_REGISTRY'
      | 'BUILD_GROUND_STATION'
  }
>
const label = (q: number | null | undefined) => (q === null || q === undefined ? null : (CONTENT.quarters[q] ?? null))

/** The company's equity value for the exposure rule: the latest report's valuation (cash and debt included). */
export const equityUsd = (state: GameState): number => Math.max(0, state.reports.at(-1)?.valuationUsd ?? 0)

/** A block's uninsured value riding on its next launch, and its share of equity (warn above 15%, doc 33 §8.3, §13). */
export function launchExposure(state: GameState, b: OrbitalBlock) {
  if (!b.launch || !['proposed', 'building', 'awaiting_launch'].includes(b.stage)) return null
  const valueUsd = blockValueUsd(state, b)
  const coverUsd = insuredNow(state, b) ? b.insured!.coverUsd : 0
  // M34.2 (owner, 9 Oct 2026, 2a): a failed launch also costs the tenant's take-or-pay penalties while the block is
  // rebuilt (its due date doesn't move): about 3 quarters × 3% of a year's contract value ⚙. Every random loss shows
  // before commit (doc 33 §13), so the exposure counts them.
  const t = b.tenant
  const penaltiesUsd =
    t && t !== 'spot'
      ? ORBIT.tenants.rebuild_late_quarters_est *
        ORBIT.tenants.late_penalty_share_of_acv *
        annualValueUsd(b.kind, b.mw, t.price)
      : 0
  const uninsuredUsd = Math.max(0, valueUsd + penaltiesUsd - coverUsd)
  const equity = equityUsd(state)
  const share = equity > 0 ? uninsuredUsd / equity : uninsuredUsd > 0 ? 1 : 0
  // (your share of the launch bill: a lender or partner pays the rest)
  const cashAfterUsd = state.cash - (launchCostUsd(b) - b.launch.depositUsd) * ownShare(state, b, 'launch')
  // The leverage covenant after losing it (debt ÷ the valuation less the uninsured loss), against the limit.
  // (capped at 1,000% so a wiped-out valuation reads as a number)
  const ltvAfter = Math.min(10, companyLtv(state, equity - uninsuredUsd))
  const ltvLimit = covenantLimit(state)
  const overLine = share > ORBIT.insurance.exposure_warning_share_of_equity
  const cashShort = cashAfterUsd < 0
  const covenantShort = ltvAfter > ltvLimit
  return {
    valueUsd,
    coverUsd,
    penaltiesUsd,
    uninsuredUsd,
    share,
    cashAfterUsd,
    ltvAfter,
    ltvLimit,
    overLine,
    cashShort,
    covenantShort,
    /** The Plan screen warns when any of the three fails (doc 33 §8.3, §13; B12). */
    warn: overLine || cashShort || covenantShort,
  }
}

/**
 * Launch slot clarity (design thread, 9 Oct 2026): for a block of this size, shell and satellites, the booking window,
 * its mass, the most free third-party tonnes in one quarter of the window, the first quarter it fits, how many quarters
 * it doesn't, and (when it fits none) the largest listed size that fits some quarter and the earliest one. Null when
 * no quarter can be booked any more (the window has closed) or the generation isn't on sale.
 */
export function launchFit(
  state: GameState,
  /** `massT`: an opened block's own (fixed when opened), else worked out from size, shell and satellites */
  spec: { mw: number; shell: ShellId; gen: GenerationId; massT?: number },
  /** a block's own booking doesn't count against it */
  exceptBlockId?: string,
) {
  const [lo, hi] = ORBIT.launch.lead_quarters
  const lastQ = Math.min(state.quarter + hi, actLastQuarter(4))
  const window: { q: number; freeT: number }[] = []
  for (let q = state.quarter + lo; q <= lastQ; q++)
    window.push({ q, freeT: Math.max(0, slotsTonnes(state, q) - bookedTonnes(state, q, exceptBlockId)) })
  const tMw = generationTMw(state, spec.gen)
  if (window.length === 0 || tMw === null) return null
  const massOf = (mw: number) => blockMassT(tMw, mw, spec.shell)
  const massT = spec.massT ?? massOf(spec.mw)
  const firstFit = (m: number) => window.find((w) => w.freeT >= m) ?? null
  const most = window.reduce((a, b) => (b.freeT > a.freeT ? b : a))
  const fit = firstFit(massT)
  const smaller = [...ORBIT.satellites.sizes_mw]
    .sort((a, b) => b - a)
    .map((mw) => ({ mw, w: firstFit(massOf(mw)) }))
    .find((x) => x.w !== null)
  return {
    firstLabel: label(window[0].q)!,
    lastLabel: label(window[window.length - 1].q)!,
    massT,
    maxFreeT: most.freeT,
    maxFreeLabel: label(most.q)!,
    fitLabel: fit ? label(fit.q)! : null,
    /** Quarters of the window with too few free tonnes for this mass. */
    unfitQuarters: window.filter((w) => w.freeT < massT).length,
    /** The largest size that fits some quarter, and the earliest; null if none fits. */
    hint: smaller ? { mw: smaller.mw, label: label(smaller.w!.q)! } : null,
  }
}
export type LaunchFit = NonNullable<ReturnType<typeof launchFit>>

/** The block's deal card (A4-05). */
export function blockView(state: GameState, b: OrbitalBlock) {
  const t = b.tenant
  const [lo, hi] = ORBIT.launch.lead_quarters
  const last = actLastQuarter(4)
  const bookingOptions =
    b.stage === 'proposed' && !b.launch
      ? PROVIDER_IDS.flatMap((provider) =>
          Array.from({ length: hi - lo + 1 }, (_, i) => state.quarter + lo + i)
            .filter((q) => q <= last)
            .map((quarter) => ({
              provider,
              quarter,
              label: label(quarter)!,
              priceUsdKg: launchPriceUsdKg(state, provider, b.shell),
              depositUsd: launchDepositUsd(state, b, provider),
              why: why(state, { type: 'BOOK_ORBITAL_LAUNCH', blockId: b.id, provider, quarter }),
            })),
        )
      : []
  const tele = b.telemetry.slice(-4)
  return {
    id: b.id,
    n: b.n,
    kind: b.kind,
    mw: b.mw,
    shell: b.shell,
    gen: b.gen,
    stage: b.stage,
    massT: b.massT,
    /** Launch slot clarity: how this block fits the booking window (unbooked blocks in planning only). */
    launchFit:
      b.stage === 'proposed' && !b.launch
        ? launchFit(state, { mw: b.mw, shell: b.shell, gen: b.gen, massT: b.massT }, b.id)
        : null,
    launch: b.launch
      ? { ...b.launch, label: label(b.launch.quarter), costUsd: launchCostUsd(b) }
      : null,
    bookingOptions,
    tenant:
      t === null
        ? null
        : t === 'spot'
          ? ('spot' as const)
          : {
              type: t.type,
              name: tenantType(t.type).name,
              workload: tenantType(t.type).workload,
              price: t.price,
              termQuarters: t.termQuarters,
              dueLabel: label(t.dueQuarter),
              endLabel: label(t.endQuarter),
              prepaidLeftUsd: t.prepaidLeftUsd,
              acvUsd: annualValueUsd(b.kind, b.mw, t.price),
            },
    offers: b.offers.map((o, index) => ({
      index,
      type: o.type,
      name: tenantType(o.type).name,
      workload: tenantType(o.type).workload,
      price: o.price,
      termQuarters: o.termQuarters,
      prepayShare: tenantType(o.type).prepay_share,
      acvUsd: annualValueUsd(b.kind, b.mw, o.price),
      why: why(state, { type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: index }),
    })),
    spotWhy: why(state, { type: 'SIGN_ORBITAL_TENANT', blockId: b.id, offer: 'spot' }),
    capital: b.capital,
    capitalWhy: why(state, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id }),
    // (M31.6) the Capital slot's four ways to pay, each with its terms and what blocks it now
    capitalOptions: CAPITAL_KINDS.map((kind) => ({
      kind,
      apr: kind === 'export_credit' || kind === 'project_debt' ? debtApr(state, b, kind) : null,
      ownShare: ownShare(state, { ...b, capital: kind }, 'build'),
      why: why(state, { type: 'ARRANGE_ORBITAL_CAPITAL', blockId: b.id, capital: kind }),
    })),
    debt: (() => {
      const d = blockDebt(state, b.id)
      return d ? { kind: d.kind, balanceUsd: d.balanceUsd, apr: d.apr, cureLabel: label(d.cureUntil) } : null
    })(),
    cofundShare: b.cofundShare ?? null,
    buildCostUsd: b.stage === 'proposed' ? buildCostUsd(state, b) : null,
    capexSpentUsd: b.capexSpentUsd,
    buildDoneLabel: label(b.buildDoneQuarter),
    liveLabel: label(b.liveQuarter),
    designLifeYears: ORBIT.satellites.design_life_years,
    capacity: b.capacity,
    gpuHealth: b.kind === 'cloud' ? b.gpuHealth : null,
    telemetry: tele.map((x) => ({ label: label(x.quarter)!, failurePctYr: x.failurePctYr })),
    telemetryAvgPctYr:
      b.telemetry.length > 0 ? b.telemetry.reduce((s, x) => s + x.failurePctYr, 0) / b.telemetry.length : null,
    insured: insuredNow(state, b) ? { coverUsd: b.insured!.coverUsd, untilLabel: label(b.insured!.untilQuarter) } : null,
    insuranceQuote: insuranceQuote(state, b),
    insureWhy: why(state, { type: 'BUY_ORBITAL_INSURANCE', blockId: b.id }),
    exposure: launchExposure(state, b),
    lastEbitdaUsd: b.lastEbitdaUsd ?? null,
    saleUsd: b.stage === 'live' ? blockSaleUsd(state, b) : null,
    sellWhy: why(state, { type: 'SELL_ORBITAL_BLOCK', blockId: b.id }),
    cancelWhy: why(state, { type: 'CANCEL_ORBITAL_BLOCK', blockId: b.id }),
    cancelLaunchWhy: b.launch ? why(state, { type: 'CANCEL_ORBITAL_LAUNCH', blockId: b.id }) : null,
    lostLaunches: b.lostLaunches,
    linksNeeded: linkUnitsNeeded(b),
    linkShare: b.stage === 'live' ? (linkShares(state).get(b.id) ?? 1) : null,
    licenceRoomMw: licensedMw(state, b.shell) - usedLicenceMw(state, b.shell),
  }
}
export type BlockView = ReturnType<typeof blockView>

/** The Orbit board (A4-03) with the licences (A4-08), the links and the launch manifest (A4-04). Null outside Act IV. */
export function orbitBoardView(state: GameState) {
  if (!inActIV(state)) return null
  const o = state.act4Orbit
  const blocks = (o?.blocks ?? []).map((b) => blockView(state, b))
  const [lo, hi] = ORBIT.launch.lead_quarters
  const manifest = Array.from({ length: hi + 1 }, (_, i) => state.quarter + i)
    .filter((q) => q <= actLastQuarter(4))
    .map((q) => ({
      quarter: q,
      label: label(q)!,
      bookable: q >= state.quarter + lo,
      slotsT: slotsTonnes(state, q),
      bookedT: bookedTonnes(state, q),
      blocks: blocks.filter((b) => b.launch?.quarter === q && b.stage !== 'climbing' && b.stage !== 'live'),
    }))
  const licences = SHELL_IDS.map((shell: ShellId) => ({
    shell,
    licensedMw: licensedMw(state, shell),
    usedMw: usedLicenceMw(state, shell),
    /** M34.1 (2c): the 2035Q2 milestone cut this shell's licence (never below the MW in use). */
    cut: (o?.licences ?? []).some((l) => l.shell === shell && l.milestoneChecked === true),
    pending: (o?.licences ?? [])
      .filter((l) => l.shell === shell && l.approvedQuarter > state.quarter)
      .map((l) => ({ approvedLabel: label(l.approvedQuarter)!, mw: l.filedMw, fastTracked: l.fastTracked === true })),
    fileWhy: why(state, { type: 'FILE_ORBITAL_LICENCE', shell }),
    fastTrackWhy: why(state, { type: 'FAST_TRACK_LICENCE', shell }),
  }))
  const needed = blocks.filter((b) => b.stage === 'live').reduce((n, b) => n + b.linksNeeded, 0)
  return {
    blocks,
    live: blocks.filter((b) => b.stage === 'live'),
    underway: blocks.filter((b) => ['proposed', 'building', 'awaiting_launch', 'climbing'].includes(b.stage)),
    gone: blocks.filter((b) => b.stage === 'retired' || b.stage === 'sold'),
    open: {
      kinds: ['shell', 'cloud'] as const,
      sizes: ORBIT.satellites.sizes_mw,
      shells: SHELL_IDS,
      generations: GENERATION_IDS.map((g) => ({ id: g, available: availableGenerations(state).includes(g) })),
    },
    manifest,
    licences,
    filing: {
      feeUsd: ORBIT.licences.filing.fee_usd,
      mw: ORBIT.licences.filing.filed_mw,
      approvalLabel: label(licenceApprovalQuarter(state))!,
      fastTrackPc: ORBIT.licences.filing.fast_track_pc,
      milestone: { dueLabel: ORBIT.licences.milestones.due, sharePct: ORBIT.licences.milestones.share_live },
    },
    registry: o?.registry ?? 'accords',
    registryOptions: ORBIT.licences.registries.map((r) => ({
      id: r.id,
      extraQuarters: r.approval_extra_quarters,
      premiumAddPct: r.sovereign_premium_add_pct / 100,
      clampdownExempt: r.clampdown_exempt,
      why: why(state, { type: 'SET_REGISTRY', registry: r.id }),
    })),
    registryChangeBw: registryChangeBandwidth(state),
    links: {
      rented: o?.linksRented ?? 0,
      units: linkUnits(state),
      unitsNext: linkUnits(state, state.quarter + 1),
      needed,
      rentUnitUsdYr: ORBIT.tenants.links.rent_unit_usd_yr,
      station: ORBIT.tenants.links.ground_station,
      stations: (o?.stations ?? []).map((s) => ({ ...s, readyLabel: label(s.readyQuarter) })),
      stationSites: state.sites.map((s) => ({
        siteId: s.id,
        site: s,
        tier: s.tier,
        why: why(state, { type: 'BUILD_GROUND_STATION', siteId: s.id }),
      })),
    },
    exposures: blocks.filter((b) => b.exposure?.warn),
    equityUsd: equityUsd(state),
    spaceMultiple: spaceMultiple(state),
    hardMarketUntil: label(o?.hardMarketUntil ?? null),
    providers: PROVIDER_IDS.map((id: ProviderId) => id),
  }
}
export type OrbitBoardView = NonNullable<ReturnType<typeof orbitBoardView>>
