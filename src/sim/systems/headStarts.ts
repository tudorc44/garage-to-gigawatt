// The Merge head starts (Act II entry, scope 0.2 §2.10; doc 18 §2.3; merge_headstarts.json). The
// Merge choice made at the end of Act I shapes how the company starts Act II:
// - sell_gpus_keep_btc: the GPU rigs are sold (used price) → cash; mining power −10% for 4 quarters
//   (lean ops); the first AI project builds 1 quarter longer.
// - gpu_cloud: the rigs become a legacy cloud ($0.15/GPU-hr at 40%); GPU know-how 1; tenant cards
//   from 2023Q1 (others 2023Q3); the first cluster builds 1 quarter faster.
// - hosting: the GPU halls host other miners' ASICs at $0.075/kWh (4-quarter terms), converted at the
//   GPU-hall cost; those sites are shell-ready (shells −25% retrofit capex, −1 quarter).
// - hold_and_wait: the rigs stay, switched off (no ETH to mine); the sites stay energized.
import { BALANCE, CONTENT, act2Quarter } from '../../content/index.ts'
import {
  logEntry,
  type Act2Entry,
  type GameState,
  type HostingContract,
  type MachineLot,
  type Project,
} from '../state.ts'
import { removeMachines } from './machines.ts'
import { getModel } from './market.ts'
import { isShutDown } from './heat.ts'
import { powerPriceUsdKwh, uptime } from './sites.ts'

const H = BALANCE.headStarts
const firstAct2Quarter = () => CONTENT.acts[1].firstQuarter

const isGpuRig = (l: MachineLot) => getModel(l.model)?.coin === 'ETH'

/** Applies the Merge choice's head start at the act boundary (called once, as Act II begins). */
export function applyHeadStart(state: GameState): void {
  const choice = state.mergeChoice ?? CONTENT.merge.botDefault
  const entry: Act2Entry = {
    headStart: choice,
    gpuRigsSold: 0,
    gpuSaleUsd: 0,
    legacyGpuRigs: 0,
    hostedKw: 0,
    conversionUsd: 0,
    shellReadySites: [],
  }
  state.act2Entry = entry
  const rigs = state.machines.filter(isGpuRig)
  const sell = (lot: MachineLot) => {
    const count = lot.count
    const usd = removeMachines(state, lot, count)
    state.cash += usd
    entry.gpuRigsSold += count
    entry.gpuSaleUsd += usd
  }
  if (choice === 'sell_gpus_keep_btc') rigs.forEach(sell)
  if (choice === 'gpu_cloud')
    for (const lot of rigs) {
      lot.legacyCloud = true
      entry.legacyGpuRigs += lot.count
    }
  if (choice === 'hosting') convertGpuHalls(state, entry, rigs)
  const key = (
    {
      sell_gpus_keep_btc: 'log.head_start.sell_gpus_keep_btc',
      gpu_cloud: 'log.head_start.gpu_cloud',
      hosting: 'log.head_start.hosting',
    } as const
  )[choice as 'sell_gpus_keep_btc' | 'gpu_cloud' | 'hosting']
  logEntry(state, key ?? 'log.head_start.hold_and_wait', {
    count: entry.gpuRigsSold || entry.legacyGpuRigs,
    valueUsd: entry.gpuSaleUsd,
    hostedKw: entry.hostedKw,
    costUsd: entry.conversionUsd,
  })
}

/**
 * hosting: at each site but the garage, the rigs are sold and their kW converted to hosting at the
 * 2022Q4 GPU-hall cost, as far as the cash goes; live from 2022Q4 at the head start's rate for a
 * 4-quarter term. The garage's rigs are only sold.
 */
function convertGpuHalls(
  state: GameState,
  entry: Act2Entry,
  rigs: MachineLot[],
): void {
  const q = firstAct2Quarter()
  const perKw = (act2Quarter(q)?.capexUsdMw.gpuHallToHosting ?? 0) / 1000
  const bySite = new Map<string, number>()
  for (const lot of rigs) {
    const kw = lot.count * getModel(lot.model)!.power_kw
    const site = state.sites.find((s) => s.id === lot.siteId)!
    if (site.tier !== BALANCE.startSite)
      bySite.set(site.id, (bySite.get(site.id) ?? 0) + kw)
    const count = lot.count
    const usd = removeMachines(state, lot, count)
    state.cash += usd
    entry.gpuRigsSold += count
    entry.gpuSaleUsd += usd
  }
  for (const [siteId, kw] of bySite) {
    const affordable = perKw > 0 ? Math.floor(state.cash / perKw) : kw
    const hosted = Math.min(kw, Math.max(0, affordable))
    if (hosted <= 0) continue
    const costUsd = Math.round(hosted * perKw)
    state.cash -= costUsd
    const contract: HostingContract = {
      id: `host-headstart-${siteId}`,
      siteId,
      kw: hosted,
      readyQuarter: q,
      rateUsdKwh: H.hostingRateUsdKwh,
      termEndQuarter: q + BALANCE.hosting.termQuarters - 1,
    }
    state.hosting.push(contract)
    entry.hostedKw += hosted
    entry.conversionUsd += costUsd
    entry.shellReadySites.push(siteId)
  }
}

/** sell_gpus_keep_btc's lean ops: mining power × this (1 otherwise, and after its 4 quarters). */
export function miningPowerMult(state: GameState): number {
  const e = state.act2Entry
  if (e?.headStart !== 'sell_gpus_keep_btc') return 1
  const q = state.quarter - firstAct2Quarter()
  return q >= 0 && q < H.leanOps.quarters ? H.leanOps.powerMult : 1
}

/** gpu_cloud with a legacy cloud: its GPU know-how floor (0 otherwise). */
export function headStartKnowHow(state: GameState): number {
  const e = state.act2Entry
  return e?.headStart === 'gpu_cloud' && e.legacyGpuRigs > 0
    ? H.gpuCloudKnowHow
    : 0
}

/** The first quarter tenant cards arrive: 2023Q3, or 2023Q1 with the gpu_cloud head start. */
export function tenantsFrom(state: GameState): string {
  return headStartKnowHow(state) > 0
    ? H.gpuCloudTenantsFrom
    : BALANCE.projects.tenantsFrom
}

/** Whether a site is shell-ready (the hosting head start converted its GPU halls). */
export function shellReady(state: GameState, siteId: string | undefined): boolean {
  return !!siteId && !!state.act2Entry?.shellReadySites.includes(siteId)
}

/**
 * How the head start changes a project's build (quarters, added to the normal build): +1 for the
 * first AI project after selling the GPUs; −1 for the first cluster with a legacy cloud; −1 for a
 * shell at a shell-ready site.
 */
export function headStartBuildDelta(
  state: GameState,
  p: Pick<Project, 'id' | 'kind' | 'siteId'>,
): number {
  const e = state.act2Entry
  if (!e) return 0
  const started = (x: Project) => x.id !== p.id && x.startQuarter !== null
  let delta = 0
  if (e.headStart === 'sell_gpus_keep_btc' && !state.projects.some(started))
    delta += H.firstProjectExtraQuarters
  if (
    headStartKnowHow(state) > 0 &&
    p.kind !== 'shell' &&
    !state.projects.some((x) => started(x) && x.kind !== 'shell')
  )
    delta += H.firstClusterQuarters
  if (p.kind === 'shell' && shellReady(state, p.siteId))
    delta -= CONTENT.projects.shellReady.quarterDiscount
  return delta
}

/**
 * One week of the legacy cloud (gpu_cloud): each rig's GPUs rented at the head start's price ×
 * utilisation, less the rigs' power at the site's price. Counted with the AI units (it's a GPU
 * cloud; mine). Cash moves here; the totals are returned.
 */
export function settleLegacyCloudWeek(state: GameState): {
  revenueUsd: number
  costUsd: number
  marginByTier: Record<string, number>
} {
  let revenueUsd = 0
  let costUsd = 0
  const marginByTier: Record<string, number> = {}
  const hours = 24 * 7
  const c = H.legacyCloud
  for (const lot of state.machines) {
    if (!lot.legacyCloud || state.quarter < lot.earnsFromQuarter) continue
    const site = state.sites.find((s) => s.id === lot.siteId)
    if (!site || isShutDown(state, site.id)) continue
    const working = lot.count - lot.failed
    const up = uptime(site)
    const rev = working * c.gpusPerRig * c.usdPerGpuHr * c.utilisation * hours * up
    const cost =
      working *
      getModel(lot.model)!.power_kw *
      hours *
      up *
      powerPriceUsdKwh(site, state.quarter)
    revenueUsd += rev
    costUsd += cost
    marginByTier[site.tier] = (marginByTier[site.tier] ?? 0) + rev - cost
  }
  state.cash += revenueUsd - costUsd
  return { revenueUsd, costUsd, marginByTier }
}
