// Two scope 0.2 §5 checks that are about one project rather than a whole game (M6.6), worked out with
// the game's own rules on a 1 MW H100 cloud with a neocloud GPU contract at a 20 MW own site:
// - the delay check: what 2 quarters of delay cost, as a share of the project's profit up to the end
//   of Act II (2026Q4): EBITDA while live + the GPUs' 2026Q4 resale value − capex − take-or-pay
//   damages (the horizon and method are mine: the scope doesn't say);
// - the contract-timing check: the Deal builder's projected IRR (5 years + residual) of such a
//   contract signed in 2024Q1 against one signed in 2025Q3 (after the June 2025 price reset).
// For the sim-runner only.
import { BALANCE, CONTENT } from '../src/content/index.ts'
import { applyAction, type Action } from '../src/sim/actions.ts'
import { newGame, type GameState } from '../src/sim/state.ts'
import {
  gpuResidualShare,
  plannedBuildQuarters,
  projectCapex,
  projectedReturn,
} from '../src/sim/systems/projects.ts'

const q = (label: string) => CONTENT.quarters.indexOf(label)

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(`${a.type}: ${r.error.key}`)
  return r.state
}

/** A rich Act II company in `label` with a 1 MW H100 cloud on a neocloud GPU contract, not started. */
function cloudDeal(label: string): GameState {
  let s: GameState = {
    ...newGame(1),
    act: 2,
    quarter: q(label),
    cash: 1e9,
    bandwidth: 8,
    nextId: 3,
  }
  s.sites.push({
    id: 'site-2',
    tier: 'own_site',
    readyQuarter: 0,
    rentUsdQ: 0,
    powerPriceMult: 1,
    flaw: null,
  })
  s = ok(s, {
    type: 'PROJECT_OPEN',
    siteId: 'site-2',
    kw: 1000,
    kind: 'cloud',
    gpu: 'h100',
  })
  const p = s.projects[0]
  const offer =
    p.offers.find(
      (o) => BALANCE.projects.gpuContracts.cards[o.card] === 'neocloud',
    ) ?? p.offers[0]
  return ok(s, {
    type: 'PROJECT_SIGN_TENANT',
    projectId: p.id,
    offerId: offer.id,
  })
}

/** The contract-timing check: projected IRRs of a 2024Q1 and a 2025Q3 contract. */
export function contractIrrs() {
  const irr = (label: string) => {
    const s = cloudDeal(label)
    return projectedReturn(s, s.projects[0]).irr
  }
  return { early: irr('2024Q1'), late: irr('2025Q3') }
}

/** The delay check: profit to 2026Q4 of a cloud started in `label`, on time and 2 quarters late. */
export function delayCost(label = '2025Q1') {
  const s = cloudDeal(label)
  const p = s.projects[0]
  const r = projectedReturn(s, p)
  const cost = projectCapex(s, p)
  const quarterEbitda = (r.ebitdaUsd ?? 0) / 4
  const g = p.tenant!.gpu!
  const annualContract = g.gpus * g.priceUsdHr * 24 * 365
  const end = q('2026Q4')
  const planned = s.quarter + plannedBuildQuarters(s, p)
  const profit = (delay: number) => {
    const live = planned + delay
    const liveQuarters = Math.max(0, end - live + 1)
    const lateQuarters = Math.max(0, live - p.tenant!.readyByQuarter)
    const damages =
      lateQuarters * annualContract * CONTENT.projects.latePenaltyShareYr
    const resale = cost.gpuUsd * gpuResidualShare((end + 1 - live) / 4)
    return liveQuarters * quarterEbitda + resale - cost.totalUsd - damages
  }
  const onTime = profit(0)
  const late = profit(2)
  return {
    onTimeUsd: onTime,
    lateUsd: late,
    lostShare: onTime > 0 ? (onTime - late) / onTime : null,
  }
}
