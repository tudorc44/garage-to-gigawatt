// Hosting (Act II, scope 0.2 §2.4; doc 18 §4 and §5.3): rent MW at one of your ASIC sites to
// another miner. The client pays an all-in rate per kWh its machines use (power passed through);
// you pay the site's power. Converting mining MW on the same site costs conversions.json's
// $/MW and goes live the quarter after the order. Contracts run balance.ts hosting.termQuarters
// at the rate of the year they start, then renew at the then-current rate. Ending one mid-term
// costs a quarter of fees (doc 18 §2.3); ending it as a term renews is free.
import { BALANCE, CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { logEntry, type GameState, type HostingContract } from '../state.ts'
import { isShutDown, underMoratorium } from './heat.ts'
import { poweredKw, powerPriceUsdKwh, uptime, usedKw } from './sites.ts'

const HOURS_PER_WEEK = 24 * 7

/**
 * The all-in hosting rate for a quarter: tenants.json's rate for its year. The file stops at
 * 2024 ($0.060); later years keep the last rate (the scope's path ends there).
 */
export function hostingRateUsdKwh(quarter: number): number {
  const year = Number(CONTENT.quarters[quarter].slice(0, 4))
  const rates = CONTENT.hosting.rateUsdKwhByYear
  const known = Object.keys(rates)
    .map(Number)
    .filter((y) => y <= year)
  const pick =
    known.length > 0
      ? Math.max(...known)
      : Math.min(...Object.keys(rates).map(Number))
  return rates[String(pick)]
}

/** What converting `kw` to hosting costs (conversions.json › mining_to_hosting_same_site). */
export function hostingCostUsd(kw: number): number {
  return Math.round((kw / 1000) * CONTENT.hosting.conversionCapexUsdMw)
}

/** Energized kW at a site that no machine or hosting contract has taken (0 for the garage). */
export function convertibleKw(
  state: GameState,
  siteId: string,
  quarter = state.quarter,
): number {
  const site = state.sites.find((s) => s.id === siteId)
  if (!site || site.tier === BALANCE.startSite) return 0
  return Math.max(0, poweredKw(site, quarter) - usedKw(state, siteId))
}

/** Why hosting can't start at this site for `kw` right now, or undefined if it can. */
export function hostingBlocker(
  state: GameState,
  siteId: string,
  kw: number,
): Message | undefined {
  if (state.act !== 2) return { key: 'error.act2_only' }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (site.tier === BALANCE.startSite) return { key: 'error.hosting_garage' }
  if (!Number.isFinite(kw) || kw <= 0) return { key: 'error.bad_kw' }
  if (underMoratorium(state, siteId))
    return {
      key: 'error.moratorium',
      params: { tier: site.tier, at: CONTENT.heat.moratoriumAt },
    }
  const freeKw = convertibleKw(state, siteId)
  if (kw > freeKw + 1e-9)
    return {
      key: 'error.no_hosting_room',
      params: { tier: site.tier, freeKw, neededKw: kw },
    }
  const need = BALANCE.hosting.bandwidth
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  const costUsd = hostingCostUsd(kw)
  if (state.cash < costUsd)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
  return undefined
}

/** Converts `kw` of free energized MW at a site to hosting. Assumes hostingBlocker passed. */
export function startHosting(
  state: GameState,
  siteId: string,
  kw: number,
): HostingContract {
  const costUsd = hostingCostUsd(kw)
  const readyQuarter = state.quarter + 1 + CONTENT.hosting.buildQuarters
  const contract: HostingContract = {
    id: `host-${state.log.length}-${state.hosting.length + 1}`,
    siteId,
    kw,
    readyQuarter,
    rateUsdKwh: hostingRateUsdKwh(
      Math.min(readyQuarter, CONTENT.quarters.length - 1),
    ),
    termEndQuarter: readyQuarter + BALANCE.hosting.termQuarters - 1,
  }
  state.cash -= costUsd
  state.bandwidth -= BALANCE.hosting.bandwidth
  state.hosting.push(contract)
  const site = state.sites.find((s) => s.id === siteId)!
  logEntry(state, 'log.hosting_started', {
    tier: site.tier,
    hostedKw: kw,
    costUsd,
    rateCents: contract.rateUsdKwh * 100,
    quarter: CONTENT.quarters[readyQuarter] ?? '—',
  })
  return contract
}

/** A quarter of this contract's fees at its rate (the hosted machines running all quarter). */
export function quarterFeesUsd(contract: HostingContract): number {
  return (
    contract.kw * HOURS_PER_WEEK * BALANCE.weeksPerQuarter * contract.rateUsdKwh
  )
}

/**
 * What ending this contract now costs: nothing while it's still being converted or in the
 * first quarter of a renewed term (you simply don't renew); otherwise a quarter of fees.
 */
export function endHostingFeeUsd(
  state: GameState,
  contract: HostingContract,
): number {
  const termStart = contract.termEndQuarter - BALANCE.hosting.termQuarters + 1
  const converting = state.quarter < contract.readyQuarter
  const renewing =
    state.quarter === termStart && state.quarter > contract.readyQuarter
  if (converting || renewing) return 0
  return Math.round(
    quarterFeesUsd(contract) * BALANCE.hosting.earlyEndFeeQuarters,
  )
}

/** Ends a hosting contract: the MW go back to idle. Returns an error, or undefined. */
export function endHosting(
  state: GameState,
  contractId: string,
): Message | undefined {
  const contract = state.hosting.find((h) => h.id === contractId)
  if (!contract) return { key: 'error.unknown_hosting' }
  const feeUsd = endHostingFeeUsd(state, contract)
  if (state.cash < feeUsd)
    return {
      key: 'error.no_cash',
      params: { costUsd: feeUsd, cashUsd: state.cash },
    }
  state.cash -= feeUsd
  state.hosting = state.hosting.filter((h) => h.id !== contractId)
  const site = state.sites.find((s) => s.id === contract.siteId)!
  logEntry(state, 'log.hosting_ended', {
    tier: site.tier,
    hostedKw: contract.kw,
    feeUsd,
  })
  return undefined
}

/** kW of hosted machines running at a site this week (live, and the site isn't shut down). */
export function hostingRunningKw(state: GameState, siteId: string): number {
  if (isShutDown(state, siteId)) return 0
  return state.hosting
    .filter((h) => h.siteId === siteId && h.readyQuarter <= state.quarter)
    .reduce((kw, h) => kw + h.kw, 0)
}

/**
 * One week of hosting: the clients' fees come in, the sites' power goes out (both on the kWh
 * the hosted machines use, × the site's uptime). Cash changes here; the totals are returned.
 */
export function settleHostingWeek(state: GameState): {
  feesUsd: number
  powerUsd: number
  marginByTier: Record<string, number>
} {
  let feesUsd = 0
  let powerUsd = 0
  const marginByTier: Record<string, number> = {}
  for (const h of state.hosting) {
    if (h.readyQuarter > state.quarter || isShutDown(state, h.siteId)) continue
    const site = state.sites.find((s) => s.id === h.siteId)
    if (!site) continue
    const kwh = h.kw * HOURS_PER_WEEK * uptime(site)
    const fees = kwh * h.rateUsdKwh
    const power = kwh * powerPriceUsdKwh(site, state.quarter)
    feesUsd += fees
    powerUsd += power
    marginByTier[site.tier] = (marginByTier[site.tier] ?? 0) + fees - power
  }
  state.cash += feesUsd - powerUsd
  return { feesUsd, powerUsd, marginByTier }
}

/** At the start of a quarter: contracts whose term has run out renew at the current rate. */
export function renewHosting(state: GameState): void {
  for (const h of state.hosting) {
    if (h.termEndQuarter >= state.quarter) continue
    h.rateUsdKwh = hostingRateUsdKwh(state.quarter)
    h.termEndQuarter = state.quarter + BALANCE.hosting.termQuarters - 1
    const site = state.sites.find((s) => s.id === h.siteId)
    logEntry(state, 'log.hosting_renewed', {
      tier: site?.tier ?? '',
      hostedKw: h.kw,
      rateCents: h.rateUsdKwh * 100,
      quarter: CONTENT.quarters[h.termEndQuarter] ?? '—',
    })
  }
}
