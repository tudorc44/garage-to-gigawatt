// Act III's Read the market (M11.2, doc 27 §5 / D4): 1 Bandwidth reveals the authored sharp range of
// ONE chosen indicator for the current quarter, once a quarter. Signals are authored, never derived:
// this file reads only CONTENT.signals (runtime fields) and must not import the market readers or the
// hidden authoring fields (a test greps for both).
import { CONTENT, SIGNAL_IDS, type SignalId } from '../../content/index.ts'
import type { Message } from '../../i18n/t.ts'
import { inActIII, logEntry, type GameState } from '../state.ts'

/** What one Signals read costs: flat, whoever you have hired. */
export const SIGNAL_READ_BANDWIDTH = 1

/** Why this indicator can't be read now, or undefined. Checks only. */
export function readSignalBlocker(
  state: GameState,
  indicator: SignalId,
): Message | undefined {
  if (!inActIII(state) || !state.scenarioId)
    return { key: 'error.signal_unavailable' }
  if (!SIGNAL_IDS.includes(indicator)) return { key: 'error.signal_unknown' }
  if (state.phase !== 'plan') return { key: 'error.wrong_phase' }
  const label = CONTENT.quarters[state.quarter]
  if (state.act3SignalReads?.some((r) => r.quarter === label))
    return { key: 'error.signal_read_done' }
  if (state.bandwidth < SIGNAL_READ_BANDWIDTH)
    return {
      key: 'error.no_bandwidth',
      params: { needed: SIGNAL_READ_BANDWIDTH, have: state.bandwidth },
    }
}

/** Pays the Bandwidth and logs the read. Call only when readSignalBlocker is undefined. */
export function readSignal(state: GameState, indicator: SignalId): void {
  state.bandwidth -= SIGNAL_READ_BANDWIDTH
  ;(state.act3SignalReads ??= []).push({
    quarter: CONTENT.quarters[state.quarter],
    indicator,
  })
  const label = CONTENT.signals[state.scenarioId!].find(
    (i) => i.id === indicator,
  )!.label
  logEntry(state, 'log.signal_read', { indicator: label })
}
