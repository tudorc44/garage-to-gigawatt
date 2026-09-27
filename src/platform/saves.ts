// Saves in the browser (scope §2.13): an autosave at the start of every quarter, one manual
// slot, and export/import as a text string. Storage can be missing or blocked (private windows,
// cleared site data), so every read and write is wrapped and simply reports failure.
import type { Message } from '../i18n/t.ts'
import { restoreSave } from '../sim/save.ts'
import type { GameState } from '../sim/state.ts'

export type Slot = 'autosave' | 'manual'

const KEY: Record<Slot, string> = {
  autosave: 'g2g.save.autosave',
  manual: 'g2g.save.manual',
}
/**
 * Marks an exported save string. This wrapper hasn't changed since the first build; the save
 * inside carries its own format version (GameState.version), which loading migrates.
 */
const PREFIX = 'G2G1.'

/** The game as a text string: PREFIX + base64 of the JSON (UTF-8 safe). */
export function encodeSave(state: GameState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return PREFIX + btoa(binary)
}

/** Reads a save string back into a game, or says what's wrong with it. */
export function decodeSave(
  text: string,
): { ok: true; state: GameState } | { ok: false; error: Message } {
  const trimmed = text.trim()
  if (!trimmed.startsWith(PREFIX))
    return { ok: false, error: { key: 'error.save_invalid' } }
  try {
    const binary = atob(trimmed.slice(PREFIX.length))
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return restoreSave(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return { ok: false, error: { key: 'error.save_invalid' } }
  }
}

/** Writes a slot. Returns false if the browser won't store it. */
export function writeSlot(slot: Slot, state: GameState): boolean {
  try {
    localStorage.setItem(KEY[slot], encodeSave(state))
    return true
  } catch {
    return false
  }
}

/** The game saved in a slot, or null if there's none (or it can't be read). */
export function readSlot(slot: Slot): GameState | null {
  try {
    const text = localStorage.getItem(KEY[slot])
    if (!text) return null
    const r = decodeSave(text)
    return r.ok ? r.state : null
  } catch {
    return null
  }
}
