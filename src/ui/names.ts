// Display names and icons for content ids (machines, site tiers, flaws).
import { hasText, t, tDynamic, type Message } from '../i18n/t.ts'
import type { Coin } from '../sim/state.ts'
import type { IconName } from './icons.ts'

export const machineName = (id: string) => tDynamic(`machine.${id}`, id)
export const tierName = (id: string) => tDynamic(`site.${id}`, id)
export const flawName = (id: string) => tDynamic(`flaw.${id}`, id)

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
