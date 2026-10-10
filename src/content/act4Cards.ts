// Act IV's event cards (M28.4; events_iv.json, doc 33 §16: 8 per future and the shared cards; the lunar cards come with
// M30's systems). They run through the same card engine as Act III's, as scripted cards:
// - the id becomes opaque ("a4_…": the authored id names the future, and the card view hands the id to the UI);
// - the choices get ids c1, c2 … in file order, and the default label becomes that id;
// - each effect key goes through Act III's translation (act3Cards.ts › translateEffects, EFFECT_MAP): Act IV cards use
//   only keys that are already mapped (a test checks none is deferred);
// - the role tag is not kept, and the future stays inside the engine (card.future, read only by the deck filter).
import { z } from 'zod'
import { translateEffects } from './act3Cards.ts'
import { quarterId, type EventCardRaw } from './schemas.ts'

export const act4CardSchema = z.object({
  id: z.string().min(1),
  future: z.enum(['f1', 'f2', 'f3', 'f4', 'all']),
  quarter: quarterId,
  role: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  default: z.string().min(1),
  basis: z.string().min(1),
  choices: z
    .array(
      z.object({
        label: z.string().min(1),
        effect: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1),
})
export const eventsIvFileSchema = z.object({
  event_cards: z.array(act4CardSchema).min(1),
})
export type Act4CardRaw = z.output<typeof act4CardSchema>

/** An opaque engine id for an authored Act IV card ("a4_" + a hash), so no screen can read its future off the id. */
export function act4CardEngineId(authoredId: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < authoredId.length; i++) h = Math.imul(h ^ authoredId.charCodeAt(i), 0x01000193)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return `a4_${(h >>> 0).toString(16).padStart(8, '0')}`
}

/** An authored Act IV card as an engine card (week `weekOf`), keeping its future for the deck filter. */
export function toEngineCardIv(
  c: Act4CardRaw,
  weekOf: string,
): EventCardRaw & { future: Act4CardRaw['future'] } {
  const choices = c.choices.map((ch, i) => ({
    id: `c${i + 1}`,
    effects: translateEffects(ch.effect, { card: c.id, choice: i + 1 }),
  }))
  const def = c.choices.findIndex((ch) => ch.label === c.default)
  return {
    id: act4CardEngineId(c.id),
    type: 'scripted',
    quarter: c.quarter,
    week_of: weekOf,
    default: def < 0 ? '' : `c${def + 1}`,
    choices,
    future: c.future,
  }
}
