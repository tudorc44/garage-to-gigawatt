// Hosting (Act II, scope 0.2 §2.4; doc 18 §4 and §5.3): rent MW at one of your ASIC sites to
// another miner. The client pays an all-in rate per kWh its machines use (power passed through);
// you pay the site's power. Converting mining MW on the same site costs conversions.json's
// $/MW and goes live the quarter after the order. Contracts run balance.ts hosting.termQuarters
// at the rate of the year they start, then renew at the then-current rate. Ending one mid-term
// costs a quarter of fees (doc 18 §2.3); ending it as a term renews is free.
import {
  BALANCE,
  CONTENT,
  act2Quarter,
  isAct4MarketKey,
  quarterInputs,
  type PowerRegion,
  type MarketKey,
} from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { chance, substream } from '../rng.ts'
import {
  inAct2Rules,
  inAct3Rules,
  logEntry,
  type GameState,
  type HostingContract,
} from '../state.ts'
import { logQuarterLabel } from '../state.ts'
import { isShutDown, underMoratorium } from './heat.ts'
import { miningOnly } from './energyAssets.ts'
import { siteParams } from './siteSerials.ts'
import { scenarioOf } from './market.ts'
import {
  poweredKw,
  powerPriceUsdKwh,
  regionOf,
  uptime,
  usedKw,
} from './sites.ts'

const HOURS_PER_WEEK = 24 * 7

/** The quarter Act II's hosting rate is anchored to for Act III's margin (see hostingRateUsdKwh). */
const HOSTING_MARGIN_ANCHOR = '2024Q1'

/**
 * The all-in hosting rate for a quarter: tenants.json's rate for its year. The file stops at
 * 2024 ($0.060); later years keep the last rate (the scope's path ends there).
 */
export function hostingRateUsdKwh(
  quarter: number,
  region?: PowerRegion,
  scenario?: MarketKey | null,
): number {
  // Act III (M11.5a, DT): the all-in rate follows the region's power price in the scenario (quarterInputs)
  // plus Act II's hosting margin. Act II's margin = the file's last-year rate ($0.060, 2024's, held
  // ever since) minus the region's Act II power price in 2024Q1, the first quarter that rate applies.
  // Act II itself is unchanged.
  const act3 = CONTENT.acts.find((a) => a.act === 3)!
  // (Only with a scenario: an Act II game looking a quarter ahead across the boundary keeps the file's rate.)
  // (M27.5: and Act IV's quarters, read with an Act IV key)
  const act4 = CONTENT.acts.find((a) => a.act === 4)
  const lastQuarter =
    isAct4MarketKey(scenario) && act4 ? act4.lastQuarter : act3.lastQuarter
  if (
    region &&
    scenario &&
    quarter >= act3.firstQuarter &&
    quarter <= lastQuarter
  ) {
    const anchorQ = CONTENT.quarters.indexOf(HOSTING_MARGIN_ANCHOR)
    const margin =
      hostingRateUsdKwh(anchorQ) - act2Quarter(anchorQ)!.powerUsdKwh[region]
    return quarterInputs(quarter, scenario)!.powerUsdKwh[region] + margin
  }
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

/**
 * kW at a site that a defaulted client left behind (owner decision A1): still fitted for hosting,
 * so re-letting them costs nothing and the new client moves in at once. Capped by the free kW.
 */
export function reletKw(state: GameState, siteId: string): number {
  const site = state.sites.find((s) => s.id === siteId)
  return Math.min(site?.hostingReletKw ?? 0, convertibleKw(state, siteId))
}

/** What an order for `kw` of hosting at a site costs: re-let kW are free, the rest converts. */
export function hostingOrderCostUsd(
  state: GameState,
  siteId: string,
  kw: number,
): number {
  return hostingCostUsd(Math.max(0, kw - reletKw(state, siteId)))
}

/** Why hosting can't start at this site for `kw` right now, or undefined if it can. */
export function hostingBlocker(
  state: GameState,
  siteId: string,
  kw: number,
): Message | undefined {
  if (!inAct2Rules(state)) return { key: 'error.act2_only' }
  const site = state.sites.find((s) => s.id === siteId)
  if (!site) return { key: 'error.unknown_site' }
  if (site.tier === BALANCE.startSite) return { key: 'error.hosting_garage' }
  // M35.3 (doc 38 §4.6): a flare pad is mining only.
  if (miningOnly(site)) return { key: 'error.flare_mining_only' }
  if (!Number.isFinite(kw) || kw <= 0) return { key: 'error.bad_kw' }
  if (underMoratorium(state, siteId))
    return {
      key: 'error.moratorium',
      params: { ...siteParams(site), at: CONTENT.heat.moratoriumAt },
    }
  const freeKw = convertibleKw(state, siteId)
  if (kw > freeKw + 1e-9)
    return {
      key: 'error.no_hosting_room',
      params: { ...siteParams(site), freeKw, neededKw: kw },
    }
  const need = BALANCE.hosting.bandwidth
  if (state.bandwidth < need)
    return {
      key: 'error.no_bandwidth',
      params: { needed: need, have: state.bandwidth },
    }
  const costUsd = hostingOrderCostUsd(state, siteId, kw)
  if (state.cash < costUsd)
    return { key: 'error.no_cash', params: { costUsd, cashUsd: state.cash } }
  return undefined
}

/**
 * Starts hosting `kw` of free energized MW at a site (assumes hostingBlocker passed). kW a
 * defaulted client left are re-let first: free, live this quarter at this quarter's rate. The
 * rest is converted: conversions.json's cost, live next quarter at that quarter's rate.
 */
export function startHosting(
  state: GameState,
  siteId: string,
  kw: number,
): HostingContract[] {
  const site = state.sites.find((s) => s.id === siteId)!
  const relet = Math.min(kw, reletKw(state, siteId))
  const converted = kw - relet
  const out: HostingContract[] = []
  const add = (part: number, readyQuarter: number) => {
    const contract: HostingContract = {
      id: `host-${state.log.length}-${state.hosting.length + 1}`,
      siteId,
      kw: part,
      readyQuarter,
      rateUsdKwh: hostingRateUsdKwh(
        Math.min(readyQuarter, CONTENT.quarters.length - 1),
        regionOf(site),
        scenarioOf(state),
      ),
      termEndQuarter: readyQuarter + BALANCE.hosting.termQuarters - 1,
    }
    state.hosting.push(contract)
    out.push(contract)
    return contract
  }
  state.bandwidth -= BALANCE.hosting.bandwidth
  if (relet > 0) {
    const c = add(relet, state.quarter)
    site.hostingReletKw = (site.hostingReletKw ?? 0) - relet
    if (site.hostingReletKw <= 1e-9) delete site.hostingReletKw
    logEntry(state, 'log.hosting_relet', {
      ...siteParams(site),
      hostedKw: relet,
      rateCents: c.rateUsdKwh * 100,
    })
  }
  if (converted > 0) {
    const costUsd = hostingCostUsd(converted)
    const c = add(converted, state.quarter + 1 + CONTENT.hosting.buildQuarters)
    state.cash -= costUsd
    logEntry(state, 'log.hosting_started', {
      ...siteParams(site),
      hostedKw: converted,
      costUsd,
      rateCents: c.rateUsdKwh * 100,
      quarter: logQuarterLabel(state, c.readyQuarter),
    })
  }
  return out
}

/**
 * Winter client defaults (owner decision A1), rolled as the live quarter starts: in a winter
 * quarter (Q4, Q1) each live contract defaults with the quarter's chance, on its own random
 * stream. A default earns nothing this quarter, ends the contract and leaves its kW idle,
 * ready to re-let with no conversion cost.
 */
export function rollHostingDefaults(state: GameState): void {
  if (!inAct2Rules(state)) return
  const label = CONTENT.quarters[state.quarter]
  const rules = BALANCE.hosting.defaults
  if (!rules.winterQuarters.includes(Number(label.slice(5)))) return
  const p = rules.chanceByQuarter[label] ?? rules.chance
  for (const h of [...state.hosting]) {
    if (h.readyQuarter > state.quarter) continue
    if (!chance(substream(state.seed, `hosting_default:${label}:${h.id}`), p))
      continue
    state.hosting = state.hosting.filter((x) => x.id !== h.id)
    const site = state.sites.find((s) => s.id === h.siteId)
    if (site) site.hostingReletKw = (site.hostingReletKw ?? 0) + h.kw
    logEntry(state, 'log.hosting_default', {
      ...siteParams(site),
      hostedKw: h.kw,
      feesUsd: quarterFeesUsd(h),
    })
  }
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
    ...siteParams(site),
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
    const power =
      kwh * powerPriceUsdKwh(site, state.quarter, scenarioOf(state))
    feesUsd += fees
    powerUsd += power
    marginByTier[site.tier] = (marginByTier[site.tier] ?? 0) + fees - power
  }
  state.cash += feesUsd - powerUsd
  return { feesUsd, powerUsd, marginByTier }
}

/** At the start of a quarter: contracts whose term has run out renew at the current rate. */
export function renewHosting(state: GameState): void {
  // Act III (M11.5a, DT): every live contract reprices each quarter to the region's current rate.
  if (inAct3Rules(state))
    for (const h of state.hosting) {
      const site = state.sites.find((s) => s.id === h.siteId)
      if (site)
        h.rateUsdKwh = hostingRateUsdKwh(
          state.quarter,
          regionOf(site),
          scenarioOf(state),
        )
    }
  for (const h of state.hosting) {
    if (h.termEndQuarter >= state.quarter) continue
    const site0 = state.sites.find((s) => s.id === h.siteId)
    h.rateUsdKwh = hostingRateUsdKwh(
      state.quarter,
      site0 ? regionOf(site0) : undefined,
      scenarioOf(state),
    )
    h.termEndQuarter = state.quarter + BALANCE.hosting.termQuarters - 1
    const site = state.sites.find((s) => s.id === h.siteId)
    logEntry(state, 'log.hosting_renewed', {
      ...siteParams(site),
      hostedKw: h.kw,
      rateCents: h.rateUsdKwh * 100,
      quarter: logQuarterLabel(state, h.termEndQuarter),
    })
  }
}
