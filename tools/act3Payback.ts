// Step 5's payback table (M16.6, M17.0, M17.8; tools only), shared by the sim's report and the anchor harness (C2):
// payback in years = capex per MW ÷ EBITDA per MW-year, on the game's own project earnings:
// - a shell: the retrofit-shell $/MW (top: + 0.6 × the mid→top $/MW); the mean shell card rent × the RFP midpoint ×
//   the tier multiple, less the shell opex share (mine: the mean of the tenant cards);
// - a cloud: the shell $/MW + GPUs per MW × the unit price (Rubin Ultra builds its hall to top); GPUs per MW × the
//   neocloud rent × utilisation 0.7 × 8,760 h, less power at the cloud PUE and a year's GPU insurance. Power: the
//   mean of the six regions' prices that quarter (mine), or one region's with the PJM capacity charge (M17.8).
import { BALANCE, CONTENT, quarterInputs, type PowerRegion, type ScenarioId } from '../src/content/index.ts'
import { rfpMid } from '../src/sim/systems/leaseIndex.ts'
import {
  gpuContractRateMult,
  gpuContractUsdHr,
  gpuGeneration,
  gpuPriceUsd,
  neocloudUsdHr,
} from '../src/sim/systems/projects.ts'
import { regionCapacityChargeUsdKwh } from '../src/sim/systems/sites.ts'

export const PAYBACK_UTILISATION = 0.7
/** M18.12: the contracted basis's term (the shortest the ignorer signs; mine). */
export const CONTRACT_TERM_YEARS = 2

/**
 * M18.12 (DT): a contracted cloud's payback in years at `label`: capex per MW ÷ (all GPUs billed at the contract rate
 * (take-or-pay) × 8,760 h, less power at the cloud PUE (the six regions' mean) and a year's insurance). `mult` is the
 * Act III contract-rate multiplier to price at (default: the one for a contract signed at `label`).
 */
export function contractedPaybackYears(
  id: ScenarioId,
  label: string,
  gpu: string,
  mult?: number,
): number {
  const D = BALANCE.act3.density
  const P2 = BALANCE.projects
  const q = CONTENT.quarters.indexOf(label)
  const inp = quarterInputs(q, id)!
  const perMw = gpuGeneration(gpu)!.gpusPerMw
  const price = gpuPriceUsd(gpu, q, id)
  const signed = gpuContractUsdHr(gpu, CONTRACT_TERM_YEARS, q, id)
  if (price === undefined || signed === undefined) return NaN
  const rate = mult === undefined ? signed : (signed / gpuContractRateMult(q)) * mult
  const topExtra = D.topNewBuildRetrofitShare * (inp.act3?.midToTopUsdMw ?? 0)
  const gpuUsd = perMw * price
  const capex = inp.capexUsdMw.retrofitShell + gpuUsd + (gpu === 'rubin_ultra' ? topExtra : 0)
  const powers = Object.values(inp.powerUsdKwh)
  const powerUsdKwh = powers.reduce((a, b) => a + b, 0) / powers.length
  const hoursYr = 24 * 365
  const ebitda =
    perMw * rate * hoursYr -
    1000 * P2.cloudPue * hoursYr * powerUsdKwh -
    gpuUsd * P2.cloudInsuranceShareYr
  return ebitda > 0 ? capex / ebitda : -1
}

export interface Payback {
  midShell: number
  topShell: number
  h200: number
  b200: number
  rubin: number
  rubinUltra: number
}

/** Payback in years at `label` in a scenario (−1: EBITDA ≤ 0, never; NaN: no price). */
export function paybackYears(id: ScenarioId, label: string, region?: PowerRegion): Payback {
  const D = BALANCE.act3.density
  const P2 = BALANCE.projects
  const cards = CONTENT.projects.tenantCards
  const cardRent = cards.reduce((a, c) => a + c.priceUsdMwYr, 0) / cards.length
  const q = CONTENT.quarters.indexOf(label)
  const inp = quarterInputs(q, id)!
  const shellMw = inp.capexUsdMw.retrofitShell
  const topExtra = D.topNewBuildRetrofitShare * (inp.act3?.midToTopUsdMw ?? 0)
  const rent = cardRent * (rfpMid(q, id) ?? 1)
  const shellEbitda = (mult: number) => rent * mult * (1 - P2.shellOpexShare)
  const powers = Object.values(inp.powerUsdKwh)
  const powerUsdKwh = region
    ? inp.powerUsdKwh[region] + regionCapacityChargeUsdKwh(region, q, id)
    : powers.reduce((a, b) => a + b, 0) / powers.length
  const hoursYr = 24 * 365
  const cloud = (gpu: string) => {
    const perMw = gpuGeneration(gpu)!.gpusPerMw
    const price = gpuPriceUsd(gpu, q, id)
    const hr = neocloudUsdHr(gpu, q, id)
    if (price === undefined || hr === undefined) return NaN
    const gpuUsd = perMw * price
    const capex = shellMw + gpuUsd + (gpu === 'rubin_ultra' ? topExtra : 0)
    const ebitda =
      perMw * hr * PAYBACK_UTILISATION * hoursYr -
      1000 * P2.cloudPue * hoursYr * powerUsdKwh -
      gpuUsd * P2.cloudInsuranceShareYr
    return ebitda > 0 ? capex / ebitda : -1
  }
  return {
    midShell: shellMw / shellEbitda(D.shellTierRentMult.mid),
    topShell: (shellMw + topExtra) / shellEbitda(D.shellTierRentMult.top),
    h200: cloud('h200'),
    b200: cloud('b200'),
    rubin: cloud('rubin_nvl144'),
    rubinUltra: cloud('rubin_ultra'),
  }
}
