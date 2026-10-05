// Act IV's Read the market (M28.2, doc 33 §6.3, IV-D10): the same rule as Act III's (signals.ts): 1 Bandwidth reveals the
// authored sharp range of ONE chosen indicator for the current quarter, once a quarter. Signals are authored, never
// derived: this file reads only CONTENT.signalsIv (runtime fields) and must not import the market readers or the hidden
// authoring fields (tests/sim/act4Hidden.test.ts).
import { CONTENT, SIGNAL_IDS_IV, type SignalIdIv } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inActIV, logEntry, type GameState } from '../state.ts'
import { SIGNAL_READ_BANDWIDTH } from './signals.ts'

/** Why this indicator can't be read now, or undefined. Checks only. */
export function readSignalIvBlocker(state: GameState, indicator: SignalIdIv): Message | undefined {
  if (!inActIV(state) || !state.futureId) return { key: 'error.signal_unavailable' }
  if (!SIGNAL_IDS_IV.includes(indicator)) return { key: 'error.signal_unknown' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const label = CONTENT.quarters[state.quarter]
  if (state.act4SignalReads?.some((r) => r.quarter === label)) return { key: 'error.signal_read_done' }
  if (state.bandwidth < SIGNAL_READ_BANDWIDTH)
    return { key: 'error.no_bandwidth', params: { needed: SIGNAL_READ_BANDWIDTH, have: state.bandwidth } }
}

/** Pays the Bandwidth and logs the read. Call only when readSignalIvBlocker is undefined. */
export function readSignalIv(state: GameState, indicator: SignalIdIv): void {
  state.bandwidth -= SIGNAL_READ_BANDWIDTH
  ;(state.act4SignalReads ??= []).push({ quarter: CONTENT.quarters[state.quarter], indicator })
  const label = CONTENT.signalsIv[state.futureId!].find((i) => i.id === indicator)!.label
  logEntry(state, 'log.signal_read', { indicator: label })
}
