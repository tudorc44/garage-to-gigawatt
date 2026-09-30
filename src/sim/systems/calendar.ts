// The contract calendar (M12.1, D16 step 4; doc 27 §6): every signed tenant contract on a project,
// carried from Act II or signed in Act III, with the quarter its term ends. Read-only: nothing here
// changes the game. M12.2's renewals and M12.3's reopener act on it.
//
// A contract's term runs from go-live, as the engine counts it (`servedQuarters` grows once a quarter
// while the project is live). Its end quarter is the last quarter served:
// - live: this quarter + (term − quarters already served) − 1;
// - signed but not live yet: its planned go-live quarter + term − 1 (null before the build starts);
// - no clock restarts at the Act II → III boundary: a carried contract keeps its own count.
// (The M12 spec also writes "signing quarter + term − 1"; that equals the last quarter served only for
// a contract signed on a live project. For one signed before its build it would cut the paid term by
// the build time, so the engine's own count wins. Mine, reversible; listed for the design thread.)
//
// Hosting is not in the calendar (it reprices every quarter in Act III). A GPU contract whose term has
// run is already on spot (Act II's rule: `tenant` is null), so it isn't either. A shell lease whose term
// ended before 2027Q1 is a holdover at its old rent; its renewal comes due in 2027Q1 (M12.2).
import { projectGone, type GameState, type Project } from '../state.ts'
import { rfpMid } from './leaseIndex.ts'
import { scenarioOf } from './market.ts'
import {
  annualRentUsd,
  contractQuarters,
  gpuContractUsdHr,
  tenantCard,
} from './projects.ts'

export type ContractKind = 'shell' | 'gpu'

export interface CalendarEntry {
  /** The contract's id: its project's (one tenant per project). */
  id: string
  projectN: number
  card: string
  tenantType: string
  kind: ContractKind
  /** Shell leases: MW leased. GPU contracts: null. */
  mw: number | null
  /** GPU contracts: GPUs under contract. Shell leases: null. */
  gpus: number | null
  /** Shell leases: the contract rent a year (before any distress haircut). */
  annualRentUsd: number | null
  /** GPU contracts: the locked $/GPU-hr. */
  usdPerGpuHr: number | null
  termQuarters: number
  /** The last quarter served (quarter index), or null when the build hasn't started. */
  endQuarter: number | null
  /** Quarters still to serve from this one (0 for a holdover), or null with no end quarter yet. */
  quartersLeft: number | null
  /** A shell lease whose term has run: still paying its old rent until it renews. */
  holdover: boolean
  /** Act III shells: the tenant card's rent × this quarter's RFP midpoint, for these MW, a year. */
  newLeaseRefUsd: number | null
  /** Act III GPU contracts: this quarter's 1-year contract $/GPU-hr for its GPU. */
  marketUsdPerGpuHr: number | null
  distressed: boolean
  /** The S3 reopener (M12.3): always false until it is built. */
  reopenerEligible: boolean
}

/** A signed contract's end quarter (the last quarter served), or null before the build starts. */
export function contractEndQuarter(
  state: GameState,
  p: Project,
): number | null {
  const t = p.tenant
  if (!t) return null
  const term = contractQuarters(p)
  if (p.stage === 'live') return state.quarter + term - t.servedQuarters - 1
  if (p.readyQuarter === null) return null
  return p.readyQuarter + term - 1
}

/** Every signed tenant contract, soonest end first (not yet scheduled last). */
export function buildCalendar(state: GameState): CalendarEntry[] {
  const scenario = scenarioOf(state)
  const mid = rfpMid(state.quarter, scenario)
  const out: CalendarEntry[] = []
  for (const p of state.projects) {
    const t = p.tenant
    if (!t || projectGone(p)) continue
    const card = tenantCard(t.card)!
    const kind: ContractKind = t.gpu ? 'gpu' : 'shell'
    const end = contractEndQuarter(state, p)
    const holdover = kind === 'shell' && end !== null && end < state.quarter
    out.push({
      id: p.id,
      projectN: p.n,
      card: t.card,
      tenantType: card.type,
      kind,
      mw: kind === 'shell' ? p.kw / 1000 : null,
      gpus: t.gpu ? t.gpu.gpus : null,
      annualRentUsd:
        kind === 'shell'
          ? annualRentUsd(card, p.kw) * (t.priceMult ?? 1)
          : null,
      usdPerGpuHr: t.gpu ? t.gpu.priceUsdHr : null,
      termQuarters: contractQuarters(p),
      endQuarter: end,
      quartersLeft: end === null ? null : Math.max(0, end - state.quarter + 1),
      holdover,
      newLeaseRefUsd:
        kind === 'shell' && mid !== null
          ? annualRentUsd(card, p.kw) * mid
          : null,
      marketUsdPerGpuHr:
        t.gpu && scenario && p.gpu
          ? (gpuContractUsdHr(p.gpu, 1, state.quarter, scenario) ?? null)
          : null,
      distressed: t.distressedQuarter !== undefined,
      reopenerEligible: false,
    })
  }
  return out.sort(
    (a, b) =>
      (a.endQuarter ?? Infinity) - (b.endQuarter ?? Infinity) ||
      a.projectN - b.projectN,
  )
}
