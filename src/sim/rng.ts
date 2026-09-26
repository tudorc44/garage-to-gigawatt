// Seeded random numbers (mulberry32). The generator's whole memory is one 32-bit number
// kept in the game state, so the same seed always gives the same sequence of rolls,
// and a saved game carries on exactly where it left off.

/** Anything that holds the RNG's current position, usually the GameState. */
export interface RngHolder {
  rng: number
}

/** A float in [0, 1). Advances holder.rng. */
export function random(holder: RngHolder): number {
  let t = (holder.rng = (holder.rng + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** A whole number from min to max, both included. */
export function randomInt(holder: RngHolder, min: number, max: number): number {
  return min + Math.floor(random(holder) * (max - min + 1))
}

/** True with probability p. */
export function chance(holder: RngHolder, p: number): boolean {
  return random(holder) < p
}

/** One item picked at random. The list must not be empty. */
export function pick<T>(holder: RngHolder, items: readonly T[]): T {
  return items[randomInt(holder, 0, items.length - 1)]
}

/** Turns any text (e.g. a seed the player types) into a 32-bit seed (FNV-1a hash). */
export function seedFromString(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  }
  return h >>> 0
}
