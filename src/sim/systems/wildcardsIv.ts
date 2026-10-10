// Act IV's wildcards (M28.5; doc 33 §6.6, IV-D11; wildcards_iv.json). At the Act III → IV boundary 2 of the 6 are drawn on
// their own stream (act4_wildcards), each with a quarter drawn uniformly in its window. A drawn wildcard fires once, at
// the start of its quarter, with a news line; its effect is wired in the milestone its file entry names (the Bitcoin
// Supercycle here; the solar storm, launch grounding and chip export clampdown with M29's orbit; the Flag on the Pole and
// the reactor delay with M30's Moon). They don't depend on the future, and the upcoming ones are never shown.
import { BALANCE, CONTENT, quarterIndex, type WildcardIdIv } from '../../content/index.ts'
import type { MessageKey } from '../../i18n/t.ts'
import { randomInt, substream } from '../rng.ts'
import { act4SeedOf, inActIV, logEntry, type GameState } from '../state.ts'

const W = () => CONTENT.wildcardsIv
const LOG: Record<WildcardIdIv, MessageKey> = {
  solar_storm: 'log.wildcard_iv.solar_storm',
  flag_on_the_pole: 'log.wildcard_iv.flag_on_the_pole',
  launch_grounding: 'log.wildcard_iv.launch_grounding',
  chip_export_clampdown: 'log.wildcard_iv.chip_export_clampdown',
  reactor_delay: 'log.wildcard_iv.reactor_delay',
  bitcoin_supercycle: 'log.wildcard_iv.bitcoin_supercycle',
}

/** Draws 2 of the 6 and their quarters (at the Act III → IV boundary). */
export function drawWildcardsIv(state: GameState): void {
  const r = substream(act4SeedOf(state), 'act4_wildcards')
  const left = [...W().wildcards]
  state.act4Wildcards = []
  for (let i = 0; i < W().draw && left.length > 0; i++) {
    const w = left.splice(randomInt(r, 0, left.length - 1), 1)[0]
    state.act4Wildcards.push({
      id: w.id,
      quarter: randomInt(r, quarterIndex(w.window[0])!, quarterIndex(w.window[1])!),
      fired: false,
    })
  }
}

/** At the start of an Act IV quarter: the wildcards due now fire (their news line, and the effects wired so far). */
export function fireWildcardsIv(state: GameState): void {
  if (!inActIV(state)) return
  for (const d of state.act4Wildcards ?? []) {
    if (d.fired || d.quarter !== state.quarter) continue
    d.fired = true
    const w = W().wildcards.find((x) => x.id === d.id)!
    logEntry(state, LOG[d.id])
    if (d.id === 'bitcoin_supercycle') {
      // Any leftover miners earn × the multiple for its quarters (the fleet hashrate modifier, as a card's).
      const weeks = BALANCE.weeksPerQuarter
      const from = state.quarter * weeks
      state.events.modifiers.push({
        kind: 'hashrate',
        siteIds: null,
        mult: Number(w.effect.mining_revenue_mult),
        from,
        to: from + Number(w.effect.quarters) * weeks - 1,
      })
    }
  }
}

/** Whether a drawn wildcard has fired by now (the M29/M30 systems read this for their effects). */
export function wildcardFiredIv(state: GameState, id: WildcardIdIv): boolean {
  return (state.act4Wildcards ?? []).some((d) => d.id === id && d.fired)
}
