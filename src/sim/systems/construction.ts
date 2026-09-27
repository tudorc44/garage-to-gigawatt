// Build-side extras from the balance review (design thread, 27 Sep 2026):
// - the Texas construction loan (capital.json › loans.construction): finance a share of a Texas
//   site's build cost when you build it, repaid weekly like the equipment loan;
// - the transformer upgrade (sites.json › flaws.undersized_transformer): pay to clear the flaw;
// - the GPU shortage cap (machines.json › new_gpu_cap): new GPU rigs per quarter, in kW.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, roundCents, type GameState, type Site } from '../state.ts'
import { getModel } from './market.ts'
import { flawEffect } from './sites.ts'

const W = BALANCE.weeksPerQuarter

// ---------- the construction loan ----------

/** Why this tier's build can't be financed now, or undefined if it can. */
export function constructionLoanBlocker(
  state: GameState,
  tier: string,
): Message | undefined {
  const terms = CONTENT.constructionLoan
  if (tier !== terms.tier)
    return { key: 'error.construction_loan_tier', params: { tier: terms.tier } }
  if (CONTENT.quarters[state.quarter] < terms.from)
    return {
      key: 'error.construction_loan_early',
      params: { quarter: terms.from },
    }
  if (state.constructionLoan) return { key: 'error.construction_loan_exists' }
  if (!state.raisesDone.includes(terms.requiresRound))
    return {
      key: 'error.construction_loan_round',
      params: { round: terms.requiresRound },
    }
  if (terms.requiresContract && !state.sites.some((s) => s.contract))
    return { key: 'error.construction_loan_contract' }
}

/** The loan a build of `capexUsd` gets: ltc of the cost, in whole dollars. */
export function constructionLoanUsd(capexUsd: number): number {
  return Math.floor(CONTENT.constructionLoan.ltc * capexUsd)
}

/** Takes the construction loan (cash in). Call constructionLoanBlocker first. */
export function takeConstructionLoan(state: GameState, amountUsd: number) {
  const terms = CONTENT.constructionLoan
  state.cash += amountUsd
  state.constructionLoan = {
    amountUsd,
    balanceUsd: amountUsd,
    apr: terms.apr,
    weeklyPrincipalUsd: roundCents(amountUsd / (terms.tenorQuarters * W)),
    weeksLeft: terms.tenorQuarters * W,
    takenQuarter: state.quarter,
  }
  logEntry(state, 'log.construction_loan_taken', {
    amountUsd,
    aprPct: terms.apr,
    quarters: terms.tenorQuarters,
  })
}

/** Pays the construction loan's whole balance early (no penalty). */
export function repayConstructionLoan(state: GameState): Message | undefined {
  const loan = state.constructionLoan
  if (!loan) return { key: 'error.no_loan' }
  if (loan.balanceUsd > state.cash) {
    return {
      key: 'error.no_cash',
      params: { costUsd: loan.balanceUsd, cashUsd: state.cash },
    }
  }
  state.cash -= loan.balanceUsd
  logEntry(state, 'log.construction_loan_repaid', {
    amountUsd: loan.balanceUsd,
  })
  state.constructionLoan = null
}

// ---------- the transformer upgrade ----------

/** Why this site's transformer can't be upgraded now, or undefined if it can. */
export function transformerBlocker(
  state: GameState,
  siteId: string,
): Message | undefined {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (flawEffect(site, 'upgrade_cost_usd') === undefined)
    return { key: 'error.nothing_to_upgrade', params: { tier: site.tier } }
  if (site.upgradeReadyQuarter !== undefined)
    return { key: 'error.upgrade_underway', params: { tier: site.tier } }
  const bw = flawEffect(site, 'upgrade_bw') ?? 1
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
  const cost = flawEffect(site, 'upgrade_cost_usd')!
  if (cost > state.cash)
    return {
      key: 'error.no_cash',
      params: { costUsd: cost, cashUsd: state.cash },
    }
}

/** What the upgrade costs at this site (undefined if its flaw has no upgrade). */
export function transformerUpgrade(site: Site) {
  const costUsd = flawEffect(site, 'upgrade_cost_usd')
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
  state.cash -= u.costUsd
  state.bandwidth -= u.bandwidth
  site.upgradeReadyQuarter = state.quarter + u.quarters
  logEntry(state, 'log.transformer_upgrade', {
    tier: site.tier,
    costUsd: u.costUsd,
    quarter: CONTENT.quarters[site.upgradeReadyQuarter] ?? '—',
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
    logEntry(state, 'log.transformer_upgraded', { tier: site.tier })
  }
}

// ---------- the GPU shortage cap ----------

/** kW of new GPU rigs you can still buy this quarter (Infinity outside the shortage). */
export function newGpuKwLeft(state: GameState): number {
  const cap = CONTENT.newGpuCap
  const q = CONTENT.quarters[state.quarter]
  if (q < cap.window[0] || q > cap.window[1]) return Infinity
  const bought = state.log
    .filter(
      (e) =>
        e.quarter === state.quarter &&
        e.key === 'log.bought' &&
        e.params?.condition === 'new' &&
        getModel(String(e.params?.model))?.coin === 'ETH',
    )
    .reduce(
      (kw, e) =>
        kw +
        Number(e.params?.count ?? 0) *
          getModel(String(e.params?.model))!.power_kw,
      0,
    )
  return Math.max(0, cap.kwPerQuarter - bought)
}
