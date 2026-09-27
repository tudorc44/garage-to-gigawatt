// The valuation breakdown for the Act II balance tuning (owner, 28 Sep 2026, answer 1 step 1): a
// quarter's valuation split into its parts, and EV per MW for three kinds of MW to check against
// scope 0.2 §5's sanity bands (pure mining $0.4–1.2M/MW, announced AI $3–12M/MW, stabilized
// investment-grade-backed AI $18–27M/MW). For the sim-runner only.
import { BALANCE, CONTENT } from '../src/content/index.ts'
import {
  projectGone,
  type GameState,
  type Project,
  type QuarterReport,
} from '../src/sim/state.ts'
import { mwByUse } from '../src/sim/systems/mwUse.ts'
import {
  annualContractUsd,
  contractWeight,
  floorEligible,
  ownedShareOut,
  remainingContractUsd,
  tenantCard,
} from '../src/sim/systems/projects.ts'
import { powerPriceUsdKwh } from '../src/sim/systems/sites.ts'
import {
  aiInfraMultiple,
  valuationSplit,
} from '../src/sim/systems/valuation.ts'

export interface Breakdown {
  quarter: string
  valuation: number
  miningEv: number
  aiEv: number
  backlog: number
  construction: number
  cash: number
  treasury: number
  debt: number
  /** EV per MW (null when there are no such MW). */
  evMwMining: number | null
  evMwAnnouncedAi: number | null
  evMwStabilizedIg: number | null
}

export const BREAKDOWN_COLUMNS = [
  'valuation',
  'miningEv',
  'aiEv',
  'backlog',
  'construction',
  'cash',
  'treasury',
  'debt',
  'evMwMining',
  'evMwAnnouncedAi',
  'evMwStabilizedIg',
] as const

/** A tenant backed by investment-grade credit: rated A/AA or BBB, or backstopped. */
function igBacked(p: Project): boolean {
  if (!p.tenant) return false
  if (p.backstop) return true
  const rating = tenantCard(p.tenant.card)?.rating ?? ''
  return rating.startsWith('A') || rating.startsWith('BBB')
}

/** A live project's yearly EBITDA to the company, at its contract terms. */
function projectEbitdaYrUsd(state: GameState, p: Project): number {
  const ours = 1 - ownedShareOut(p)
  if (p.kind === 'shell') {
    if (!p.tenant) return 0
    return annualContractUsd(p) * (1 - BALANCE.projects.shellOpexShare) * ours
  }
  const site = state.sites.find((s) => s.id === p.siteId)
  const power = site
    ? p.kw *
      BALANCE.projects.cloudPue *
      8760 *
      powerPriceUsdKwh(site, state.quarter)
    : 0
  const insurance = p.gpuCapexUsd * BALANCE.projects.cloudInsuranceShareYr
  return (annualContractUsd(p) - power - insurance) * ours
}

/** The breakdown of report `r`, with the MW and projects as they stand in `state`. */
export function breakdown(state: GameState, r: QuarterReport): Breakdown {
  const q = CONTENT.quarters.indexOf(r.quarter)
  const s = valuationSplit(r, state.firstAiDealQuarter)
  const use = mwByUse(state, q)
  const miningMw = (use.mining + use.hosting) / 1000
  const perMw = (usd: number, mw: number) => (mw > 0 ? usd / mw : null)
  let announcedUsd = 0
  let announcedMw = 0
  let stableUsd = 0
  let stableMw = 0
  for (const p of state.projects) {
    if (projectGone(p) || !p.tenant) continue
    const backlog = remainingContractUsd(p) * contractWeight(p)
    if (p.stage === 'proposed' || p.stage === 'building') {
      announcedUsd += (p.stage === 'building' ? p.capexUsd : 0) + backlog
      announcedMw += p.kw / 1000
    } else if (p.stage === 'live' && igBacked(p)) {
      stableUsd +=
        Math.max(0, projectEbitdaYrUsd(state, p)) *
          (floorEligible(p)
            ? Math.max(
                aiInfraMultiple(q),
                BALANCE.finance.contractedAiMultipleFloor.multiple,
              )
            : aiInfraMultiple(q)) +
        backlog
      stableMw += p.kw / 1000
    }
  }
  return {
    quarter: r.quarter,
    valuation: r.valuationUsd,
    miningEv: s.miningEvUsd,
    aiEv: s.aiEvUsd,
    backlog: s.weightedBacklogUsd,
    construction: s.constructionUsd,
    cash: r.cash,
    treasury: s.treasuryUsd,
    debt: r.debtUsd,
    evMwMining: perMw(s.miningEvUsd, miningMw),
    evMwAnnouncedAi: perMw(announcedUsd, announcedMw),
    evMwStabilizedIg: perMw(stableUsd, stableMw),
  }
}
