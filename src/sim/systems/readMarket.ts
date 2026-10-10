// Read the market (interrupts.json › read_market, design thread 26 Sep 2026): once per quarter,
// in the Plan phase, a hint of where BTC and ETH go in the coming live quarter: up (above
// up_threshold), down (below down_threshold) or flat, from this Plan phase's price (week 1) to the
// quarter's last week. Each coin's read is right with probability `accuracy`; a wrong read is one
// step off (up ↔ flat or flat ↔ down), never up ↔ down. Rolls use their own stream.
import { CONTENT } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { random, substream } from '../rng.ts'
import { inAct3Rules, logEntry, type Coin, type GameState } from '../state.ts'
import { readMarketBandwidth } from './hires.ts'
import { coinPrice, quarterWeeks, scenarioOf } from './market.ts'
import type { MarketKey } from '../../content/index.ts'

export type Direction = 'up' | 'flat' | 'down'

export interface MarketRead {
  quarter: number
  reads: Record<Coin, Direction>
}

/** Where a coin really goes this quarter: Plan-phase price (week 1) to the last week. */
export function trueDirection(
  quarter: number,
  coin: Coin,
  scenario?: MarketKey | null,
): Direction {
  const weeks = quarterWeeks(quarter, scenario)!
  const change = coinPrice(weeks.at(-1)!, coin) / coinPrice(weeks[0], coin) - 1
  const r = CONTENT.readMarket
  return change > r.upThreshold
    ? 'up'
    : change < r.downThreshold
      ? 'down'
      : 'flat'
}

/** A read that is wrong by one step: up and down become flat; flat becomes up or down. */
function oneStepOff(truth: Direction, roll: number): Direction {
  if (truth !== 'flat') return 'flat'
  return roll < 0.5 ? 'up' : 'down'
}

/** Why the market can't be read now, or undefined. Checks only. */
export function readMarketBlocker(state: GameState): Message | undefined {
  // Act III reads the Signals panel instead (M11.2); this read would leak the scenario's market.
  if (inAct3Rules(state)) return { key: 'error.market_read_act3' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  if (state.marketRead?.quarter === state.quarter)
    return { key: 'error.market_read_done' }
  const bw = readMarketBandwidth(state)
  if (state.bandwidth < bw)
    return {
      key: 'error.no_bandwidth',
      params: { needed: bw, have: state.bandwidth },
    }
}

export function readMarket(state: GameState): void {
  state.bandwidth -= readMarketBandwidth(state)
  const reads = { BTC: 'flat', ETH: 'flat' } as Record<Coin, Direction>
  for (const coin of CONTENT.readMarket.assets) {
    const r = substream(state.seed, `read_market:${state.quarter}:${coin}`)
    const truth = trueDirection(state.quarter, coin, scenarioOf(state))
    const right = random(r) < CONTENT.readMarket.accuracy
    reads[coin] = right ? truth : oneStepOff(truth, random(r))
  }
  state.marketRead = { quarter: state.quarter, reads }
  logEntry(state, 'log.market_read', {
    btcRead: reads.BTC,
    ethRead: reads.ETH,
  })
}
