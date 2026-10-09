// M33.1 (design thread, doc 35): telling sites apart. Each site gets a number among the sites of its type when it's
// acquired ("Own site 3", "Powered shell 2"), kept for good: a left, sold or foreclosed site retires its number. The
// type is an Act II scouted site's category, else its tier. Presentation only: no rule reads the number.
import type { MessageParams } from '../../i18n/t.ts'
import type { GameState, Site } from '../state.ts'

/** The type a site is numbered under: its Act II category, else its tier. */
export function siteLabel(site: Pick<Site, 'tier' | 'category'>): string {
  return site.category ?? site.tier
}

/** Gives a newly acquired site the next number of its type. */
export function numberSite(state: GameState, site: Site): void {
  const label = siteLabel(site)
  const serials = (state.siteSerials ??= {})
  const n = (serials[label] ?? 0) + 1
  serials[label] = n
  site.serial = n
}

/** Adds an acquired site to the company, numbered and dated (M34.2: the quarter it was acquired). */
export function addSite(state: GameState, site: Site): void {
  numberSite(state, site)
  site.acquiredQuarter = state.quarter
  state.sites.push(site)
}

/** A site's id number ("site-12" → 12), the order sites were acquired in. */
function idOrder(site: Site): number {
  const n = Number(site.id.slice(site.id.lastIndexOf('-') + 1))
  return Number.isFinite(n) ? n : 0
}

/**
 * Saves and presets from before M33: numbers the sites that have none, per type in acquisition order, after any
 * number already given; the counter ends at the highest. Does nothing when every site is numbered.
 */
export function numberUnnumbered(state: GameState): void {
  const serials = (state.siteSerials ??= {})
  for (const site of state.sites) {
    if (site.serial === undefined) continue
    const label = siteLabel(site)
    serials[label] = Math.max(serials[label] ?? 0, site.serial)
  }
  const todo = state.sites
    .filter((s) => s.serial === undefined)
    .sort((a, b) => idOrder(a) - idOrder(b))
  for (const site of todo) numberSite(state, site)
}

/**
 * The params a log line or message needs to name a site ("Own site 3"): its tier as before, its number, and for a
 * scouted site its category (i18n/t.ts renders them as the short name). A missing site gives an empty tier.
 */
export function siteParams(
  site: Pick<Site, 'tier' | 'category' | 'serial'> | undefined,
): MessageParams {
  if (!site) return { tier: '' }
  return {
    tier: site.tier,
    ...(site.serial !== undefined ? { serial: site.serial } : {}),
    ...(site.category ? { siteLabel: site.category } : {}),
  }
}
