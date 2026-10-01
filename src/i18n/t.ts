// t('key', params): looks up player-facing text and fills in {placeholders}.
// Two string tables: en.json (game and UI text) and content.en.json (the content
// pack's tooltips, glossary and news, copied from docs/act1-content/text.en.json).
// Number params are formatted by name with fmt (src/ui/format.ts):
//   …Usd → money, …Pct → percent, …Delta → ▲/▼ percent change, …Kw → power.
// String params named model / tier / condition / flaw (and the others in ID_PARAMS) are content
// ids and get translated.
import en from './en.json' with { type: 'json' }
import contentText from './content.en.json' with { type: 'json' }
import { fmt } from '../ui/format.ts'

export type MessageKey = keyof typeof en
export type MessageParams = Record<string, string | number>

/** A message the sim hands to the UI: a key plus raw values, never finished English. */
export interface Message {
  key: MessageKey
  params?: MessageParams
}

const table: Record<string, string> = { ...contentText, ...en }

/** String params that hold content ids get translated through these key prefixes. */
const ID_PARAMS: Record<string, string> = {
  model: 'machine.',
  tier: 'site.',
  condition: 'condition.',
  flaw: 'flaw.',
  round: 'round.',
  rival: 'rival.',
  contract: 'contract.',
  hire: 'hire.',
  mergeChoice: 'merge_choice.',
  eventTitle: 'event.',
  eventChoice: 'event.',
  btcRead: 'read.',
  ethRead: 'read.',
  tenant: 'tenant.',
  kind: 'project_kind.',
  gpu: 'gpu.',
  density: 'density.',
  lobby: 'pc.lobby.',
  pcCard: 'pc.spend.',
  debt: 'debt_kind.',
  category: 'site_category.',
  region: 'ui.region.',
  flawAct2: 'flaw_act2.',
  side: 'deal_side.',
  vendor: 'p0.vendor.',
  item: 'p0.vanity.',
  p0Card: 'p0.event.',
  p0Choice: 'p0.event.',
}

function fill(text: string, params: MessageParams): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) return `{${name}}`
    if (typeof value === 'string') {
      const prefix = ID_PARAMS[name]
      return prefix ? (table[prefix + value] ?? value) : value
    }
    if (name.endsWith('Usd')) return fmt.money(value)
    if (name.endsWith('Pct')) return fmt.pct(value)
    if (name.endsWith('Delta')) return fmt.delta(value, 'pct', { dp: 1 })
    if (name.endsWith('Kw')) return fmt.power(value)
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  })
}

export function t(key: MessageKey, params: MessageParams = {}): string {
  return fill(table[key] ?? key, params)
}

/** For keys built at runtime, e.g. `machine.${id}` or `news.2017Q4.0`. */
export function tDynamic(
  key: string,
  fallback: string,
  params: MessageParams = {},
): string {
  const text = table[key]
  return text === undefined ? fallback : fill(text, params)
}

/** True if a runtime-built key exists (e.g. to list a quarter's news items). */
export function hasText(key: string): boolean {
  return key in table
}

/** The content pack's glossary, as [term id, explanation] pairs (glossary.<term> keys). */
export function glossaryTerms(): [string, string][] {
  return Object.entries(table)
    .filter(([k]) => k.startsWith('glossary.'))
    .map(([k, v]) => [k.slice('glossary.'.length), v])
}
