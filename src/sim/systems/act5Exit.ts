// The founder's exit (M57.1; doc 43 §15.2, V-D20; exit_v.json). In the Plan phase of 2040Q3 or 2040Q4 the player chooses:
// sell the company at a strategic buyer's bid (valuation × a bid factor, drawn once in 2040Q3 from the future's range on
// `substream(act5Seed, "act5_exit_bid")`; only the bid is shown), sell the plant stakes to funds and keep the platform,
// or hold (the default). Net worth at the end: sold, founder stake × the 2040Q4 valuation × the bid factor; otherwise
// × the future's post-2040 outlook factor (V1 1.15, V2 1.00, V3 0.85, V4 0.95), which no screen reads before the
// reveal. HIDDEN: this file is the exit system, one of the two readers of exit_v.json's hidden part (with act5End.ts,
// through it); no UI file imports it (a grep test). The exit isn't scored in the reading (the money judges it).
import { z } from 'zod'
import raw from '../../content/exit_v.json' with { type: 'json' }
import { CONTENT, V_FUTURE_IDS } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { substream, uniform } from '../rng.ts'
import { act5SeedOf, inActV, logEntry, type GameState } from '../state.ts'
import { fundBidUsd, isPlant, sellPlantStake } from './plants.ts'
import { stakeMarkUsd } from './ventures.ts'

const range = z.tuple([z.number().positive(), z.number().positive()])
const FILE = z
  .object({
    window: z.tuple([z.string(), z.string()]),
    default: z.enum(['sell_company', 'sell_plants', 'hold']),
    hidden: z.object({
      bid_factor_range: z.object(Object.fromEntries(V_FUTURE_IDS.map((v) => [v, range])) as Record<(typeof V_FUTURE_IDS)[number], typeof range>),
      outlook_factor: z.object(
        Object.fromEntries(V_FUTURE_IDS.map((v) => [v, z.number().positive()])) as Record<(typeof V_FUTURE_IDS)[number], z.ZodNumber>,
      ),
    }),
  })
  .parse(raw)

export type ExitChoice = 'sell_company' | 'sell_plants' | 'hold'
const windowQ = () => FILE.window.map((l) => CONTENT.quarters.indexOf(l)) as [number, number]

/** At the start of an Act V quarter: in 2040Q3, the buyer's bid factor is drawn (once). */
export function startQuarterExit(state: GameState): void {
  if (!inActV(state) || state.act5Exit || state.quarter !== windowQ()[0] || !state.vFutureId) return
  const [lo, hi] = FILE.hidden.bid_factor_range[state.vFutureId]
  const bidFactor = uniform(substream(act5SeedOf(state), 'act5_exit_bid'), lo, hi)
  state.act5Exit = { bidFactor, drawnQuarter: state.quarter }
  logEntry(state, 'log.exit.bid', { bidUsd: Math.max(0, (state.reports.at(-1)?.valuationUsd ?? 0) * bidFactor) })
}

/** Why this exit choice can't be made now, or undefined. */
export function exitBlocker(state: GameState, choice: string): Message | undefined {
  if (!inActV(state) || !state.act5Exit) return { key: 'error.exit_closed' }
  const [a, b] = windowQ()
  if (state.quarter < a || state.quarter > b) return { key: 'error.exit_closed' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (state.act5Exit.choice && state.act5Exit.choice !== 'hold') return { key: 'error.exit_chosen' }
  if (choice !== 'sell_company' && choice !== 'sell_plants' && choice !== 'hold') return { key: 'error.bad_choice' }
}

/** Makes the choice; selling the plants sells every plant stake to a fund now (no Bandwidth: the exit's own deal). */
export function chooseExit(state: GameState, choice: ExitChoice): void {
  const x = state.act5Exit!
  x.choice = choice
  if (choice === 'sell_plants') {
    let total = 0
    for (const v of state.ventures ?? []) {
      if (v.stake <= 0 || v.stage === 'cancelled' || v.stage === 'folded') continue
      if (!isPlant(state, v) && v.stage !== 'licensing' && v.stage !== 'construction' && v.stage !== 'grid_wait') continue
      const before = state.cash
      state.bandwidth += 1 // (the fund sale's Bandwidth is the exit's)
      sellPlantStake(state, v.id, 1, stakeMarkUsd(v))
      total += state.cash - before
    }
    x.plantsSoldUsd = total
  }
  logEntry(state, choice === 'sell_company' ? 'log.exit.sell_company' : choice === 'sell_plants' ? 'log.exit.sell_plants' : 'log.exit.hold')
}

/** The bid the buyer offers now (valuation × the drawn factor), for the exit screen; null outside the window. */
export function exitBidUsd(state: GameState): number | null {
  if (!state.act5Exit) return null
  return Math.max(0, (state.reports.at(-1)?.valuationUsd ?? 0) * state.act5Exit.bidFactor)
}

/** The exit screen's public view: open now, the bid, the plants' fund value, the choice made. */
export function exitView(state: GameState) {
  if (!inActV(state) || !state.act5Exit) return null
  const plantsUsd = (state.ventures ?? [])
    .filter((v) => v.stake > 0 && isPlant(state, v))
    .reduce((a, v) => a + fundBidUsd(state, v, 1, 0), 0)
  return {
    open: !exitBlocker(state, 'hold'),
    bidUsd: exitBidUsd(state)!,
    founderShareUsd: Math.max(0, exitBidUsd(state)! * state.founderStake),
    plantsUsd,
    choice: state.act5Exit.choice ?? null,
  }
}

/** The chosen exit (the default, hold, when none was made). */
export const exitChoiceOf = (state: GameState): ExitChoice => state.act5Exit?.choice ?? FILE.default

/**
 * Founder net worth after the exit, at the end of Act V: sold, the stake × the valuation × the bid factor; otherwise
 * × the future's outlook factor. (A game over has no exit: the stake × the last valuation, at least 0.)
 */
export function exitNetWorthUsd(state: GameState, gameOver = false): number {
  const valuation = state.reports.at(-1)?.valuationUsd ?? state.cash
  const base = Math.max(0, state.founderStake * valuation)
  if (gameOver || !state.vFutureId) return base
  const choice = exitChoiceOf(state)
  const factor = choice === 'sell_company' && state.act5Exit ? state.act5Exit.bidFactor : FILE.hidden.outlook_factor[state.vFutureId]
  return base * factor
}

/** The reveal's figures (act5End only): the outlook factor and the bid factor. */
export function exitReveal(state: GameState): { outlookFactor: number; bidFactor: number | null } {
  return {
    outlookFactor: state.vFutureId ? FILE.hidden.outlook_factor[state.vFutureId] : 1,
    bidFactor: state.act5Exit?.bidFactor ?? null,
  }
}
