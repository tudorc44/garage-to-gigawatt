// Build-side extras from the balance reviews (design thread, 27 Sep 2026):
// - phased Texas (sites.json › texas_site.phases): the site is built in 20 MW phases, each with
//   its own share of the cost and build time; phase 1 comes with the site's power contract;
// - the construction loan (capital.json › loans.construction): finance a share of each phase's
//   cost, repaid weekly like the equipment loan (one loan per phase);
// - the transformer upgrade (sites.json › flaws.undersized_transformer): pay to clear the flaw;
// - the GPU shortage cap (machines.json › gpu_cap): GPU rigs per quarter, in kW.
import { BALANCE, CONTENT, type SiteTier } from '../../content/index.ts'
import { book } from '../ledger.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { logQuarterLabel } from '../state.ts'
import { buildQuartersFor } from './hires.ts'
import { getModel } from './market.ts'
import { flawEffect, getTier, nominalKw } from './sites.ts'
import { siteParams } from './siteSerials.ts'

const W = BALANCE.weeksPerQuarter

// ---------- phased sites ----------

/** The tier's phase rules, if it's built in phases. */
export function phaseRules(tier: string) {
  return getTier(tier)?.phases
}

/** Why a phased tier can't be started (phase 1) now, or undefined if it can. */
export function phaseStartBlocker(
  state: GameState,
  tier: string,
): Message | undefined {
  const rules = phaseRules(tier)
  if (!rules) return
  if (CONTENT.quarters[state.quarter] < rules.from)
    return { key: 'error.phase_early', params: { tier, quarter: rules.from } }
  if (!state.raisesDone.includes(rules.requires_round))
    return {
      key: 'error.phase_needs_round',
      params: { tier, round: rules.requires_round },
    }
}

/** Build quarters for one phase (the Ex-Utility Exec's cut applies, as for whole sites). */
export function phaseBuildQuarters(state: GameState, tier: SiteTier): number {
  return buildQuartersFor(state, {
    ...tier,
    build_quarters: tier.phases!.build_quarters,
  })
}

/** The next phase of a phased site: its number, cost and build time. undefined if not phased. */
export function nextPhase(state: GameState, site: Site) {
  const tier = getTier(site.tier)!
  const rules = tier.phases
  if (!rules || !site.phases || site.phaseCapexUsd === undefined) return
  return {
    n: site.phases.length + 1,
    of: rules.count,
    costUsd: site.phaseCapexUsd,
    kw: rules.kw,
    quarters: phaseBuildQuarters(state, tier),
  }
}

/** Why the next phase of this site can't start now, or undefined if it can. */
export function phaseBlocker(
  state: GameState,
  siteId: string,
  financed: boolean,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  const next = nextPhase(state, site)
  if (!next) return { key: 'error.not_phased', params: { ...siteParams(site) } }
  if (next.n > next.of)
    return { key: 'error.all_phases_built', params: { ...siteParams(site) } }
  const bw = BALANCE.bandwidth.build
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  if (financed) {
    const blocked = constructionLoanBlocker(state, site)
    if (blocked) return blocked
  }
  const cashUsd =
    next.costUsd - (financed ? constructionLoanUsd(next.costUsd) : 0)
  if (cashUsd > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: cashUsd, cashUsd: state.cash },
    }
}

/** Starts the next phase (call phaseBlocker first). */
export function buildPhase(
  state: GameState,
  siteId: string,
  financed: boolean,
): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const next = nextPhase(state, site)!
  state.bandwidth -= BALANCE.bandwidth.build
  if (financed) takeConstructionLoan(state, constructionLoanUsd(next.costUsd))
  book(state, 'site_builds', -next.costUsd, { site: siteId })
  const ready = state.quarter + next.quarters
  site.phases!.push(ready)
  logEntry(state, 'log.phase_started', {
    ...siteParams(site),
    n: next.n,
    of: next.of,
    costUsd: next.costUsd,
    quarter: logQuarterLabel(state, ready),
  })
}

// ---------- the construction loan ----------

/**
 * Why a phase of this site can't be financed now, or undefined if it can. The loan is secured
 * on the site, so the site itself needs its power contract (phase 1 signs it).
 */
export function constructionLoanBlocker(
  state: GameState,
  site: Pick<Site, 'tier' | 'contract'>,
): Message | undefined {
  const terms = CONTENT.constructionLoan
  if (site.tier !== terms.tier)
    return { key: 'error.construction_loan_tier', params: { tier: terms.tier } }
  if (CONTENT.quarters[state.quarter] < terms.from)
    return {
      key: 'error.construction_loan_early',
      params: { quarter: terms.from },
    }
  if (!state.raisesDone.includes(terms.requiresRound))
    return {
      key: 'error.construction_loan_round',
      params: { round: terms.requiresRound },
    }
  if (terms.requiresContract && !site.contract)
    return {
      key: 'error.construction_loan_contract',
      params: { ...siteParams(site) },
    }
}

/** The loan a phase of `costUsd` gets: ltc of the cost, in whole dollars. */
export function constructionLoanUsd(costUsd: number): number {
  return Math.floor(CONTENT.constructionLoan.ltc * costUsd)
}

/** Takes a construction loan (cash in). Call constructionLoanBlocker first. */
export function takeConstructionLoan(state: GameState, amountUsd: number) {
  const terms = CONTENT.constructionLoan
  book(state, 'debt_drawn', amountUsd)
  state.constructionLoans.push({
    amountUsd,
    balanceUsd: amountUsd,
    apr: terms.apr,
    weeklyPrincipalUsd: roundCents(amountUsd / (terms.tenorQuarters * W)),
    weeksLeft: terms.tenorQuarters * W,
    takenQuarter: state.quarter,
  })
  logEntry(state, 'log.construction_loan_taken', {
    amountUsd,
    aprPct: terms.apr,
    quarters: terms.tenorQuarters,
  })
}

/** What's still owed on all construction loans. */
export function constructionDebtUsd(state: GameState): number {
  return state.constructionLoans.reduce((sum, l) => sum + l.balanceUsd, 0)
}

/** Pays every construction loan off early (no penalty). */
export function repayConstructionLoan(state: GameState): Message | undefined {
  const owed = constructionDebtUsd(state)
  if (owed <= 0) return { key: 'error.no_loan' }
  if (owed > state.cash) {
    return {
      key: 'error.no_cash',
      params: { costUsd: owed, cashUsd: state.cash },
    }
  }
  book(state, 'debt_repaid', -owed)
  logEntry(state, 'log.construction_loan_repaid', { amountUsd: owed })
  state.constructionLoans = []
}

// ---------- the transformer upgrade ----------

/** Why this site's transformer can't be upgraded now, or undefined if it can. */
export function transformerBlocker(
  state: GameState,
  siteId: string,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  const u = transformerUpgrade(site)
  if (!u)
    return { key: 'error.nothing_to_upgrade', params: { ...siteParams(site) } }
  if (site.upgradeReadyQuarter !== undefined)
    return { key: 'error.upgrade_underway', params: { ...siteParams(site) } }
  if (state.bandwidth < u.bandwidth)
    return {
      key: 'error.no_bandwidth',
      params: { needed: u.bandwidth, have: state.bandwidth },
    }
  if (u.costUsd > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: u.costUsd, cashUsd: state.cash },
    }
}

/**
 * What the upgrade costs at this site (undefined if its flaw has no upgrade): a flat cost (Act I),
 * or per MW of the site (an Act II scouted site's undersized transformer).
 */
export function transformerUpgrade(site: Site) {
  const perMw = flawEffect(site, 'upgrade_cost_usd_mw')
  const costUsd =
    flawEffect(site, 'upgrade_cost_usd') ??
    (perMw === undefined ? undefined : (perMw * nominalKw(site)) / 1000)
  if (costUsd === undefined) return undefined
  return {
    costUsd,
    bandwidth: flawEffect(site, 'upgrade_bw') ?? 1,
    quarters: flawEffect(site, 'upgrade_quarters') ?? 1,
  }
}

/** Starts the upgrade: pays now, the flaw clears when the upgrade's quarter starts. */
export function upgradeTransformer(state: GameState, siteId: string): void {
  const site = state.sites.find((s) => s.id === siteId)!
  const u = transformerUpgrade(site)!
  book(state, 'site_builds', -u.costUsd, { site: siteId })
  state.bandwidth -= u.bandwidth
  site.upgradeReadyQuarter = state.quarter + u.quarters
  logEntry(state, 'log.transformer_upgrade', {
    ...siteParams(site),
    costUsd: u.costUsd,
    quarter: logQuarterLabel(state, site.upgradeReadyQuarter),
  })
}

/** At the start of a quarter: finished upgrades clear their site's flaw. */
export function finishUpgrades(state: GameState): void {
  for (const site of state.sites) {
    if (
      site.upgradeReadyQuarter === undefined ||
      site.upgradeReadyQuarter > state.quarter
    )
      continue
    site.flaw = null
    delete site.upgradeReadyQuarter
    logEntry(state, 'log.transformer_upgraded', { ...siteParams(site) })
  }
}

// ---------- the GPU shortage cap ----------

function inGpuShortage(state: GameState): boolean {
  const [from, to] = CONTENT.gpuCap.window
  const q = CONTENT.quarters[state.quarter]
  return q >= from && q <= to
}

/** kW of GPU rigs (new or used, auctions included) you can still buy this quarter; Infinity outside the shortage. */
export function gpuKwLeft(state: GameState): number {
  if (!inGpuShortage(state)) return Infinity
  const isGpu = (model: unknown) => getModel(String(model))?.coin === 'ETH'
  const bought = state.log
    .filter(
      (e) =>
        e.quarter === state.quarter &&
        (e.key === 'log.bought' || e.key === 'log.auction_won') &&
        isGpu(e.params?.model),
    )
    .reduce(
      (kw, e) =>
        kw +
        Number(e.params?.count ?? 0) *
          getModel(String(e.params?.model))!.power_kw,
      0,
    )
  return Math.max(0, CONTENT.gpuCap.kwPerQuarter - bought)
}
