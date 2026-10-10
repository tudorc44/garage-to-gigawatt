// Act IV's rivals (M31.5; doc 33 §12, IV-D21). Act III's five retire at the boundary; the league ranks you against five
// fictional companies by valuation, with their orbital MW and lunar sites (rivals_iv.json, one path per future, the same
// in every future through 2032Q2). Orrery Compute fails in two futures: its live blocks go to auction for two quarters
// (the vulture buyer's opportunity, doc 33 §11.5).
import { CONTENT, actLastQuarter } from '../../content/index.ts'
import { MONEY, type Act4RivalId } from '../../content/moneyContent.ts'
import { MOON } from '../../content/moonContent.ts'
import type { FutureId } from '../../content/schemas.ts'
import type { Message } from '../../i18n/t.ts'
import { inActIV, logEntry, type GameState, type OrbitalBlock } from '../state.ts'
import { blockMassT, generationTMw, orbitOf } from './orbit.ts'
import type { RivalSnapshot } from './rivals.ts'

const first = () => CONTENT.acts.find((a) => a.act === 4)!.firstQuarter
const Q = (label: string) => CONTENT.quarters.indexOf(label)
const A = MONEY.orreryAuction

/** The rivals in the league at the end of an Act IV quarter, in a future (a failed one has left it). */
export function act4Rivals(future: FutureId, quarter: number): RivalSnapshot[] {
  const i = quarter - first()
  if (i < 0 || i > actLastQuarter(4) - first()) return []
  return MONEY.rivals
    .map((r) => {
      const p = r.futures[future]
      return {
        id: r.id,
        hashrateEhs: null,
        mw: null,
        valueUsd: p.value[i],
        btcHeld: null,
        orbitMw: p.orbitMw[i],
        lunarSites: MOON.claims[future].filter((c) => c.claimant === r.id && Q(c.lands) <= quarter).length,
      }
    })
    .filter((r) => r.valueUsd !== null)
}

/** The quarter Orrery fails in this game's future, or null. */
export function orreryFailsAt(state: GameState): number | null {
  if (!state.futureId) return null
  const at = MONEY.rivals.find((r) => r.id === 'orrery_compute')!.futures[state.futureId].failsAt
  return at === null ? null : first() + at
}

/** At the start of an Act IV quarter: the news of Orrery's failure, in its quarter. */
export function startQuarterRivalsIv(state: GameState): void {
  if (!inActIV(state)) return
  if (orreryFailsAt(state) === state.quarter) logEntry(state, 'log.rival.orrery_failed', { mw: A.mw })
}

/** Orrery's auction: open for two quarters from its failure, until you buy. */
export function orreryAuction(state: GameState) {
  const at = orreryFailsAt(state)
  const open = at !== null && state.quarter >= at && state.quarter < at + A.open_quarters && !state.act4Orbit?.orreryBought
  return { open, mw: A.mw, priceUsd: A.mw * A.price_usd_per_mw, lifeLeftQuarters: A.life_left_quarters }
}

export function buyOrreryBlocker(state: GameState): Message | undefined {
  if (!inActIV(state)) return { key: 'error.orbit_unavailable' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const a = orreryAuction(state)
  if (!a.open) return { key: 'error.orrery_closed' }
  if (state.bandwidth < A.bandwidth) return { key: 'error.no_bandwidth', params: { needed: A.bandwidth, have: state.bandwidth } }
  if (state.cash < a.priceUsd) return { key: 'error.no_cash', params: { costUsd: a.priceUsd, cashUsd: state.cash } }
}

/** Buys Orrery's live blocks: one live block in your fleet, on spot, with the life its satellites have left. */
export function buyOrrery(state: GameState): void {
  const a = orreryAuction(state)
  state.bandwidth -= A.bandwidth
  state.cash -= a.priceUsd
  const orbit = orbitOf(state)
  const n = orbit.nextN++
  const block: OrbitalBlock = {
    id: `ob${n}`,
    n,
    kind: 'shell',
    mw: A.mw,
    shell: A.shell,
    gen: A.gen,
    stage: 'live',
    openedQuarter: state.quarter,
    massT: blockMassT(generationTMw(state, A.gen) ?? 18, A.mw, A.shell),
    launch: null,
    tenant: 'spot',
    offers: [],
    capital: 'cash',
    buildDoneQuarter: null,
    liveQuarter: state.quarter,
    retireQuarter: state.quarter + A.life_left_quarters,
    capacity: 1,
    gpuHealth: 1,
    insured: null,
    capexSpentUsd: a.priceUsd,
    telemetry: [],
    lostLaunches: 0,
  }
  orbit.blocks.push(block)
  orbit.orreryBought = true
  logEntry(state, 'log.rival.orrery_bought', { n, mw: A.mw, priceUsd: a.priceUsd })
}

export type { Act4RivalId }
