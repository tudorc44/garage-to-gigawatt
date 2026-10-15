// Display names and icons for content ids (machines, site tiers, flaws).
import { hasText, siteShortName, t, tDynamic, type Message } from '../i18n/t.ts'
import { fmt } from './format.ts'
import { siteFacts } from '../sim/selectors.ts'
import type { Coin, GameState, Site } from '../sim/state.ts'
import type { IconName } from './icons.ts'

/** A machine's name; a bought (new) copy of the starter PC is a "Spare PC" (M73.1, doc 51 v1.6 §17). */
export const machineName = (id: string, condition?: 'new' | 'used') =>
  tDynamic(id === 'pc_cpu' && condition === 'new' ? 'machine.pc_cpu_spare' : `machine.${id}`, id)
export const tierName = (id: string) => tDynamic(`site.${id}`, id)
/**
 * M33.1 (doc 35): a site's short name, unique in the company: its type and number ("Own site 3", "Powered shell 2"),
 * or "Garage". Used wherever a site is named (buttons, rows, table cells).
 */
export const siteName = (site: {
  tier: string
  category?: string
  serial?: number
  special?: string
}) => siteShortName(site.special ?? site.category ?? site.tier, site.serial)

/** M33.1: a site's long name, "Own site 3 · Georgia · 20 MW": dialog titles, tooltips and the site card. */
export const siteLongName = (
  site: { tier: string; category?: string; serial?: number; special?: string },
  facts: { region: string | null; energizedKw: number },
) =>
  facts.region
    ? t('site.name.long', {
        short: siteName(site),
        region: tDynamic(`ui.region.${facts.region}`, facts.region),
        mw: fmt.power(facts.energizedKw),
      })
    : t('site.name.long_no_region', {
        short: siteName(site),
        mw: fmt.power(facts.energizedKw),
      })

/** M34.2 (owner, 9 Oct 2026, 3c): a project's name, its site's short name and its label: "Own site 3 · AI 1". */
export const projectName = (
  site: { tier: string; category?: string; serial?: number; special?: string },
  n: number,
) => t('ui.projects.name', { site: siteName(site), n })

/**
 * The long name of a company site, from the game state. A Prologue room (act 0) has no region and its size comes from
 * prologue.json's household tiers, not Act I's tier table (siteFacts would throw on it: the owner's "Power options"
 * crash, 13 Oct 2026), so it keeps its short name.
 */
export const siteLong = (state: GameState, site: Site) =>
  state.act === 0 ? siteName(site) : siteLongName(site, siteFacts(state, site))
export const flawName = (id: string) =>
  hasText(`flaw.${id}`) ? tDynamic(`flaw.${id}`, id) : tDynamic(`flaw_act2.${id}`, id)
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
