// Act V's Read the market (M51, doc 43 §6.3): the same rule as Acts III and IV (signals.ts, signalsIv.ts): 1 Bandwidth
// reveals the authored sharp range of ONE chosen indicator for the current quarter, once a quarter. Signals are
// authored, never derived: this file reads only CONTENT.signalsV (runtime fields) and must not import the market
// readers or the hidden authoring fields (tests/sim/act5Hidden.test.ts).
import { CONTENT, SIGNAL_IDS_V, type SignalIdV } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inActV, logEntry, type GameState } from '../state.ts'
import { SIGNAL_READ_BANDWIDTH } from './signals.ts'

/** Why this indicator can't be read now, or undefined. Checks only. */
export function readSignalVBlocker(state: GameState, indicator: SignalIdV): Message | undefined {
  if (!inActV(state) || !state.vFutureId) return { key: 'error.signal_unavailable' }
  if (!SIGNAL_IDS_V.includes(indicator)) return { key: 'error.signal_unknown' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const label = CONTENT.quarters[state.quarter]
  if (state.act5SignalReads?.some((r) => r.quarter === label)) return { key: 'error.signal_read_done' }
  if (state.bandwidth < SIGNAL_READ_BANDWIDTH)
    return { key: 'error.no_bandwidth', params: { needed: SIGNAL_READ_BANDWIDTH, have: state.bandwidth } }
}

/** Pays the Bandwidth and logs the read. Call only when readSignalVBlocker is undefined. */
export function readSignalV(state: GameState, indicator: SignalIdV): void {
  state.bandwidth -= SIGNAL_READ_BANDWIDTH
  ;(state.act5SignalReads ??= []).push({ quarter: CONTENT.quarters[state.quarter], indicator })
  const label = CONTENT.signalsV[state.vFutureId!].find((i) => i.id === indicator)!.label
  logEntry(state, 'log.signal_read', { indicator: label })
}
