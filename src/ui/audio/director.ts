// Which sounds a change of game state calls for (docs/audio's "when" column). Pure: it compares
// the state before and after an action or a week, so the sim knows nothing about sound. Every
// sound mirrors something already on screen.
import type { GameState } from '../../sim/state.ts'
import type { SoundName } from './sounds.ts'

/** Log lines that have a sound. */
const LOG_SOUNDS: Record<string, SoundName> = {
  'log.bought': 'buy',
  'log.sold': 'sell',
  'log.treasury_sold': 'sell',
  'log.alert_sold': 'sell',
  'log.hired': 'hire',
  'log.pitch_deal': 'deal-agreed',
  'log.negotiation_deal': 'deal-agreed',
  'log.pitch_they_walked': 'walk-away',
  'log.pitch_you_walked': 'walk-away',
  'log.pitch_they_walked_lost': 'walk-away',
  'log.pitch_you_walked_lost': 'walk-away',
  'log.negotiation_they_walked': 'walk-away',
  'log.negotiation_you_walked': 'walk-away',
  'log.auction_won': 'auction-won',
  'log.auction_lost': 'auction-lost',
  'log.site_ready': 'energized',
  'log.curtail_agreed': 'curtail',
  'log.liquidated': 'liquidation',
  // M25.3: Act III's moments, with the existing sounds only (Act II's convention: its GPU failure wave reuses
  // 'failure'). Each mirrors a log line the player sees; none tells anything the screen doesn't.
  'log.renewal_signed': 'deal-agreed',
  'log.relet_signed': 'deal-agreed',
  'log.blend_signed': 'deal-agreed',
  'log.ppa_signed': 'deal-agreed',
  'log.renewal_walk': 'walk-away',
  'log.lobby_landed': 'auction-won',
  'log.lobby_backfired': 'auction-lost',
  'log.covenant_breach': 'margin-call',
  'log.covenant_forced_sale': 'liquidation',
  'log.covenant_called': 'liquidation',
}

/** The alert that just appeared, as a sound. */
function alertSound(s: GameState): SoundName {
  const a = s.interrupt!
  switch (a.id) {
    case 'price_alert':
      return a.changePct >= 0 ? 'price-up' : 'price-down'
    case 'margin_call':
      return 'margin-call'
    case 'failure_wave':
    case 'gpu_failure_wave':
      return 'failure'
    case 'neighbour_complaint':
      return 'complaint'
    default:
      return 'interrupt'
  }
}

/** Sounds for going from `before` to `after` (at most three, in order, no repeats). */
export function soundsFor(
  before: GameState | null,
  after: GameState | null,
): SoundName[] {
  if (!before || !after || before.seed !== after.seed) return []
  if (after.log.length < before.log.length) return [] // a different game was loaded
  const out: SoundName[] = []
  if (before.phase !== after.phase) {
    if (before.phase === 'plan' && after.phase === 'live')
      out.push('end-quarter')
    if (after.phase === 'report') out.push('quarter-report')
    if (after.phase === 'gameover') out.push('game-over')
    if (after.phase === 'merge') out.push('merge')
    if (after.phase === 'chapter') out.push('chapter-complete')
  }
  if (after.interrupt && !before.interrupt) out.push(alertSound(after))
  for (const e of after.log.slice(before.log.length)) {
    if (e.key === 'log.raised' && e.params?.round === 'ipo_spac')
      out.push('ipo-bell')
    const s = LOG_SOUNDS[e.key]
    if (s) out.push(s)
  }
  return [...new Set(out)].slice(0, 3)
}
