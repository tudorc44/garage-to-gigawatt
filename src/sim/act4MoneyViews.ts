// Read-only views of Act IV's money for the UI (M31.6; doc 33 §17: A4-09 the Capital screen's additions, A4-10 the
// quarter report's orbit and Moon panels). No game rules here: every number comes from the systems.
import { CONTENT } from '../content/index.ts'
import { MONEY } from '../content/moneyContent.ts'
import { inActIV, type GameState, type QuarterReport } from './state.ts'
import { equityPreMoneyUsd, spaceStoryUsd, spaceWindowOpen } from './systems/equity.ts'
import { missionOwnCostUsd } from './systems/moon.ts'
import { lunarUnitUsd, taskOrderBlocker } from './systems/moonOps.ts'
import { orbitalDebtUsd } from './systems/orbitCapital.ts'
import { hardMarket, insuredNow } from './systems/orbitLaunch.ts'
import { orbitConstructionUsd, spaceMultiple } from './systems/orbitOps.ts'

const label = (q: number | null | undefined) => (q === null || q === undefined ? null : (CONTENT.quarters[q] ?? null))

/** A4-09: the Capital screen's Act IV block. Null outside Act IV. */
export function capitalIvView(state: GameState) {
  if (!inActIV(state)) return null
  const o = state.act4Orbit
  const blocks = o?.blocks ?? []
  return {
    window: {
      open: spaceWindowOpen(state),
      multiple: spaceMultiple(state),
      minMultiple: MONEY.capital.space_equity.window_min_mult,
      storyUsd: spaceStoryUsd(state),
      preMoneyUsd: equityPreMoneyUsd(state),
      underwayUsd: orbitConstructionUsd(state),
    },
    debts: (o?.debts ?? [])
      .filter((d) => !d.closed)
      .map((d) => ({
        n: d.n,
        kind: d.kind,
        balanceUsd: d.balanceUsd,
        apr: d.apr,
        repaying: d.amortizing,
        quartersLeft: d.amortizing ? Math.max(0, d.tenorQuarters - d.paidQuarters) : d.tenorQuarters,
        cureLabel: label(d.cureUntil),
      })),
    orbitalDebtUsd: orbitalDebtUsd(state),
    cofunded: blocks.filter((b) => b.capital === 'co_funding').map((b) => ({ n: b.n, share: b.cofundShare ?? 0 })),
    insurance: {
      insured: blocks.filter((b) => insuredNow(state, b)).length,
      blocks: blocks.filter((b) => ['building', 'awaiting_launch', 'climbing', 'live'].includes(b.stage)).length,
      hardMarket: hardMarket(state),
      hardUntilLabel: label(o?.hardMarketUntil ?? null),
    },
    lunar: {
      taskOrderUsd: state.act4Moon?.taskOrderUsd ?? null,
      taskOrderWhy: taskOrderBlocker(state) ?? null,
      creditUsd: state.act4Moon?.missionCreditUsd ?? 0,
      nextMissionUsd: missionOwnCostUsd(state),
      alignedBloc: state.act4Moon?.alignedBloc ?? null,
    },
  }
}
export type CapitalIvView = NonNullable<ReturnType<typeof capitalIvView>>

/** A4-10: the quarter report's Act IV panel (orbit, Moon, the space and lunar parts of the valuation). */
export function reportIvView(state: GameState, r: QuarterReport) {
  if (r.orbitEbitdaUsd === undefined && r.lunarUsd === undefined) return null
  const q = CONTENT.quarters.indexOf(r.quarter)
  const events = state.log.filter((e) => e.quarter === q && /^log\.(orbit|moon|rival)\./.test(e.key))
  const blocks = state.act4Orbit?.blocks ?? []
  return {
    orbit:
      r.orbitEbitdaUsd === undefined
        ? null
        : {
            revenueUsd: r.orbitRevenueUsd ?? 0,
            costUsd: r.orbitCostUsd ?? 0,
            ebitdaUsd: r.orbitEbitdaUsd,
            multiple: r.orbitMultiple ?? 0,
            evUsd: Math.max(0, r.orbitEbitdaUsd) * 4 * (r.orbitMultiple ?? 0) * (r.evMult ?? 1),
            live: blocks.filter((b) => b.stage === 'live').length,
            underway: blocks.filter((b) => ['building', 'awaiting_launch', 'climbing'].includes(b.stage)).length,
          },
    moon:
      r.lunarUsd === undefined
        ? null
        : {
            revenueUsd: r.moonRevenueUsd ?? 0,
            costUsd: r.moonCostUsd ?? 0,
            ebitdaUsd: r.moonEbitdaUsd ?? 0,
            unitUsd: r.lunarUsd,
            unitNowUsd: lunarUnitUsd(state),
            waterT: (state.act4Moon?.claims ?? []).reduce((t, c) => t + (c.pilot?.processedT ?? 0), 0),
          },
    events: events.map((e) => ({ key: e.key, params: e.params ?? {} })),
  }
}
