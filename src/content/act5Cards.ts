// Act V's event cards (M58.4; events_v.json, doc 43 §16 with §0.15 fix 4): 8 per future and 11 shared. They run through
// the same card engine as Acts III-IV, as scripted cards in week 2 of their quarter, with Act V's own rules:
// - the id becomes opaque ("a5_…": the authored id names the future), the choices get ids c1, c2 … in file order;
// - each choice carries its authored effect whole to Act V's card system (sim/systems/act5Cards.ts, the `act5_card`
//   engine effect), which runs it through the same systems as the Plan's Act V actions, plus its reading sign;
// - a card's text is the file's own (registered under event.<engine id>.title / .body / .choice.cN by i18n/t.ts);
// - the future and the role stay inside the engine (read only by the deck filter and the window rules).
// Interrupt cards (role "interrupt") and the end-of-life cards (role "orbit") have windows; the others a fixed quarter.
import { z } from 'zod'
import raw from './events_v.json' with { type: 'json' }
import { V_FUTURE_IDS, type VFutureId } from './schemas.ts'

const sign = z.union([z.literal(-1), z.literal(0), z.literal(1), z.literal('raise_rule')])

export const act5CardSchema = z.object({
  id: z.string().min(1),
  future: z.enum([...V_FUTURE_IDS, 'all'] as [VFutureId | 'all', ...(VFutureId | 'all')[]]),
  window: z.tuple([z.string(), z.string()]),
  role: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  default: z.string().min(1),
  basis: z.string().min(1),
  choices: z.array(z.object({ label: z.string().min(1), effect: z.record(z.string(), z.unknown()) })).min(1),
  reading_sign: z.record(z.string(), sign).optional(),
})
export type Act5CardRaw = z.output<typeof act5CardSchema>

export const ACT5_CARDS: readonly Act5CardRaw[] = z.object({ event_cards: z.array(act5CardSchema).min(1) }).parse(raw).event_cards

/** Every effect key an Act V card may use (doc 47 README, "Card effects"); the loader refuses any other. */
export const ACT5_EFFECT_KEYS = [
  'cash',
  'bandwidth',
  'idle_mw',
  'flex_enrol_mw',
  'clean_credit_new_starts',
  'smr_licence_quarters',
  'plant_event',
  'venture_call',
  'position_delay_q',
  'open',
  'offer',
  'lease_lock_offer',
  'gas_wait_cut_q',
  'pc_cost',
  'own_positions_wait_q',
  'contract_output',
  'flex_study',
  'fast_lane_apply',
  'pay_upgrade',
  'withdraw_position',
  'flex_capacity_bid',
  'follow_on',
  'plant_debt_prepay_share',
  'orbit',
  'orbit_booking',
  'equity_window',
] as const

/** An opaque engine id for an authored Act V card ("a5_" + a hash), so no screen can read its future off the id. */
export function act5CardEngineId(authoredId: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < authoredId.length; i++) h = Math.imul(h ^ authoredId.charCodeAt(i), 0x01000193)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return `a5_${(h >>> 0).toString(16).padStart(8, '0')}`
}

/** What the engine carries for one Act V choice: the authored card and choice, its effect whole, its reading sign. */
export interface Act5CardEffect {
  card: string
  role: string
  choice: number
  effect: Record<string, unknown>
  sign: -1 | 0 | 1 | 'raise_rule'
}

/** The card's text, keyed as the engine's cards are (event.<engine id>.title / .body / .choice.cN). */
export function act5CardText(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of ACT5_CARDS) {
    const id = act5CardEngineId(c.id)
    out[`event.${id}.title`] = c.title
    out[`event.${id}.body`] = c.body
    c.choices.forEach((ch, i) => (out[`event.${id}.choice.c${i + 1}`] = ch.label))
  }
  return out
}
