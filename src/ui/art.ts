/// <reference types="vite/client" />
// The art manifest (M43.A): every art slot the UI can show, with its files, alt text, credit line and a "test" flag.
// Replacing a slot's art = a new file in src/assets/art/ + its line here. Only Act IV's lazy chunks import this file,
// so the main bundle never carries it, and the images load lazily (the <img> asks for them when it scrolls into view).
//
// Test art shows in `npm run dev` and the staging build only; the production build (GitHub Pages) hides it.
// To show test art in production anyway, build with VITE_SHOW_TEST_ART=true (e.g. a line in .env.production);
// real art is marked test: false and shows everywhere.
import type { MessageKey } from '../i18n/t.ts'
import orbitFirstBlock1152 from '../assets/art/orbit-first-block_test-1152.webp'
import orbitFirstBlock640 from '../assets/art/orbit-first-block_test-640.webp'

export interface ArtSlot {
  /** The files, smallest first, with their pixel widths (for srcset). */
  files: { src: string; width: number }[]
  /** Width ÷ height of the original. */
  aspect: number
  alt: MessageKey
  credit: MessageKey
  test: boolean
}

export const ART = {
  orbit_first_block: {
    files: [
      { src: orbitFirstBlock640, width: 640 },
      { src: orbitFirstBlock1152, width: 1152 },
    ],
    aspect: 1152 / 768,
    alt: 'art.orbit_first_block.alt',
    credit: 'art.orbit_first_block.credit',
    test: true,
  },
} as const satisfies Record<string, ArtSlot>

export type ArtSlotId = keyof typeof ART

/** True where test art may show: dev and staging builds, or a production build made with VITE_SHOW_TEST_ART=true. */
export const SHOW_TEST_ART: boolean =
  import.meta.env.MODE !== 'production' || import.meta.env.VITE_SHOW_TEST_ART === 'true'

/** A slot's art, or null when it's test art and test art is hidden in this build. */
export function artFor(slot: ArtSlotId, showTest: boolean = SHOW_TEST_ART): ArtSlot | null {
  const a: ArtSlot = ART[slot]
  return a.test && !showTest ? null : a
}
