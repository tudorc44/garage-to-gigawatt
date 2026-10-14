// The seed a new game gets from the title screen's optional seed field (moved here from app.tsx in M67.3 so a test can
// reach it): numbers are used as-is, any other text is hashed, empty picks a random seed.
import { seedFromString } from '../sim/rng.ts'

export function toSeed(text: string): number {
  if (text === '') return Math.floor(Math.random() * 1e9)
  return /^\d+$/.test(text) ? Number(text) : seedFromString(text)
}
