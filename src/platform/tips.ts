// Onboarding tips the player has dismissed ("Got it"), kept in the browser (M6.5). Storage can be
// missing or blocked: then every tip simply shows again next time.
const KEY = 'g2g.tips.dismissed'

export function readDismissedTips(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function dismissTip(id: string): void {
  try {
    const list = readDismissedTips()
    if (!list.includes(id))
      localStorage.setItem(KEY, JSON.stringify([...list, id]))
  } catch {
    // Not saved: the tip comes back next time.
  }
}
