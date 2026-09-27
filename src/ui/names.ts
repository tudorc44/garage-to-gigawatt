// Display names and icons for content ids (machines, site tiers, flaws).
import { hasText, t, tDynamic, type Message } from '../i18n/t.ts'
import type { Coin } from '../sim/state.ts'
import type { IconName } from './icons.ts'

export const machineName = (id: string) => tDynamic(`machine.${id}`, id)
export const tierName = (id: string) => tDynamic(`site.${id}`, id)
/** A site's name: its tier's, or for an Act II scouted site its type, region and size. */
export const siteName = (site: {
  tier: string
  category?: string
  region?: string
  kw?: number
}) =>
  site.category
    ? t('ui.site_name_act2', {
        category: tDynamic(
          `site_category_badge.${site.category}`,
          site.category,
        ),
        region: tDynamic(`ui.region.${site.region ?? ''}`, site.region ?? ''),
        siteKw: site.kw ?? 0,
      })
    : tierName(site.tier)
export const flawName = (id: string) => tDynamic(`flaw.${id}`, id)
export const rivalName = (id: string) => tDynamic(`rival.${id}`, id)
/** The two-letter monogram on the league table and auction tiles, e.g. "RI". */
export const rivalCode = (id: string) =>
  tDynamic(`rival_code.${id}`, id.slice(0, 2).toUpperCase())

export const machineIcon = (coin: Coin): IconName =>
  coin === 'ETH' ? 'gpu-rig' : 'asic'

const TIER_ICONS: Record<string, IconName> = {
  garage: 'garage',
  small_unit: 'small-unit',
  warehouse: 'warehouse',
  own_site: 'own-site',
  texas_site: 'texas-site',
}
export const tierIcon = (id: string): IconName => TIER_ICONS[id] ?? 'site'

/** Turns a sim message (key + raw values) into text. */
export const say = (m: Message) => t(m.key, m.params)

/** The content pack's news headlines for a quarter, e.g. news.2017Q4.0 … */
export function headlines(quarter: string): string[] {
  const out: string[] = []
  for (let i = 0; hasText(`news.${quarter}.${i}`); i++) {
    out.push(tDynamic(`news.${quarter}.${i}`, ''))
  }
  return out
}
